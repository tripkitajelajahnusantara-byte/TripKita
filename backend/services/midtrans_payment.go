package services

import (
	"fmt"
	"log"
	"strings"
	"time"

	"tripkita-provider/database"
	"tripkita-provider/models"
)

// midtransMinPaymentWindow mencegah tagihan baru yang kedaluwarsa sebelum
// customer sempat menyelesaikan pembayaran.
const midtransMinPaymentWindow = 5 * time.Minute

// StartMidtransPayment mengembalikan booking dengan PaymentURL Snap yang dapat
// dibayar. Order yang masih berjalan dipakai ulang agar satu booking tidak
// pernah memiliki dua tagihan aktif sekaligus. changeMethod menghentikan order
// pending lebih dulu karena Snap mengunci metode bayar per order_id.
func (s *bookingService) StartMidtransPayment(bookingID uint, changeMethod bool) (*models.Booking, error) {
	if s.midtrans == nil {
		return nil, &BookingInputError{Message: "pembayaran online belum diaktifkan"}
	}
	var booking models.Booking
	if err := database.DB.Preload("Package").First(&booking, bookingID).Error; err != nil {
		return nil, err
	}
	if !booking.UsesMidtrans() {
		return nil, &BookingInputError{Message: "pesanan ini memakai transfer bank manual"}
	}
	if booking.Status != models.StatusPendingPayment {
		return nil, &BookingInputError{Message: "booking tidak sedang menunggu pembayaran"}
	}
	expiresAt := models.PaymentDeadline(&booking)
	if end := paymentAcceptanceEnd(&booking); end.Before(expiresAt) {
		expiresAt = end
	}
	if time.Until(expiresAt) < midtransMinPaymentWindow {
		return nil, &BookingInputError{Message: "batas waktu pembayaran sudah habis; silakan buat pesanan baru"}
	}

	previousOrderID := booking.XenditInvoiceID
	if previousOrderID != "" && booking.PaymentURL != "" {
		st, err := s.midtrans.GetTransactionStatus(previousOrderID)
		if err != nil {
			log.Printf("[Midtrans] cek status %s gagal: %v", previousOrderID, err)
			return nil, &BookingGatewayError{Message: "status pembayaran belum dapat diperiksa, coba lagi"}
		}
		if changeMethod && st != nil && !st.IsPaid() && !st.IsFailed() {
			if st, err = s.expireMidtransOrder(previousOrderID); err != nil {
				return nil, &BookingGatewayError{Message: "metode pembayaran belum dapat diganti, coba lagi"}
			}
		}
		switch {
		case st != nil && st.IsPaid():
			// Notifikasi terlewat: catat pembayarannya sekarang.
			if err := s.applyMidtransPayment(st); err != nil {
				return nil, err
			}
			if err := database.DB.First(&booking, booking.ID).Error; err != nil {
				return nil, err
			}
			return &booking, nil
		case st == nil || !st.IsFailed():
			return &booking, nil
		}
	}

	orderID := fmt.Sprintf("%s-%d", booking.BookingCode, time.Now().UnixMilli())
	paymentURL, err := s.midtrans.CreateTransaction(&booking, booking.Package.Name, orderID, expiresAt)
	if err != nil {
		log.Printf("[Midtrans] gagal membuat tagihan booking %s: %v", booking.BookingCode, err)
		return nil, &BookingGatewayError{Message: "halaman pembayaran belum dapat dibuat, coba lagi"}
	}
	// Compare-and-swap: permintaan paralel yang kalah memakai sesi pemenang;
	// tagihan miliknya tidak pernah ditampilkan lalu kedaluwarsa sendiri.
	res := database.DB.Model(&models.Booking{}).
		Where("id = ? AND status = ? AND COALESCE(xendit_invoice_id, '') = ?", booking.ID, models.StatusPendingPayment, previousOrderID).
		Updates(map[string]interface{}{"xendit_invoice_id": orderID, "payment_url": paymentURL})
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		if err := database.DB.First(&booking, booking.ID).Error; err != nil {
			return nil, err
		}
		if booking.Status != models.StatusPendingPayment || booking.PaymentURL == "" {
			return nil, &BookingInputError{Message: "status pembayaran berubah; muat ulang halaman"}
		}
		return &booking, nil
	}
	booking.XenditInvoiceID, booking.PaymentURL = orderID, paymentURL
	return &booking, nil
}

// expireMidtransOrder mengembalikan status order setelah dihentikan: gagal
// (siap diganti order baru) atau lunas bila pembayaran masuk sebelum expire.
func (s *bookingService) expireMidtransOrder(orderID string) (*MidtransTransactionStatus, error) {
	if err := s.midtrans.ExpireTransaction(orderID); err != nil {
		// Tetap dibaca ulang: penolakan bisa berarti order baru saja lunas.
		log.Printf("[Midtrans] expire %s gagal: %v", orderID, err)
	}
	st, err := s.midtrans.GetTransactionStatus(orderID)
	if err == nil && (st == nil || (!st.IsPaid() && !st.IsFailed())) {
		err = fmt.Errorf("order masih dapat dibayar (status %+v)", st)
	}
	if err != nil {
		log.Printf("[Midtrans] order %s belum dapat dihentikan: %v", orderID, err)
		return nil, err
	}
	return st, nil
}

// stopMidtransPayment memastikan tagihan booking tidak dapat dibayar lagi
// sebelum booking dibatalkan. Pembayaran yang terlanjur masuk dicatat dan
// pembatalan dihentikan, agar uang customer tidak masuk tanpa pesanan.
func (s *bookingService) stopMidtransPayment(booking *models.Booking) error {
	orderID := booking.XenditInvoiceID
	if s.midtrans == nil || !booking.UsesMidtrans() || orderID == "" || booking.PaymentURL == "" {
		return nil
	}
	st, err := s.midtrans.GetTransactionStatus(orderID)
	if err == nil && st != nil && !st.IsPaid() && !st.IsFailed() {
		st, err = s.expireMidtransOrder(orderID)
	}
	if err != nil {
		log.Printf("[Midtrans] tagihan %s belum dapat dihentikan untuk pembatalan: %v", orderID, err)
		return &BookingGatewayError{Message: "pesanan belum dapat dibatalkan karena status pembayaran belum dapat dipastikan, coba lagi"}
	}
	if st != nil && st.IsPaid() {
		if err := s.applyMidtransPayment(st); err != nil {
			return err
		}
		return &BookingInputError{Message: "pembayaran pesanan ini sudah kami terima, jadi pesanan belum dibatalkan; muat ulang untuk melihat status terbaru"}
	}
	return nil
}

// HandleMidtransNotification memproses HTTP notification Midtrans. Isinya
// hanya pemicu: status dan nominal selalu diambil ulang dari API status.
func (s *bookingService) HandleMidtransNotification(n *MidtransNotification) error {
	if s.midtrans == nil {
		return &BookingInputError{Message: "pembayaran Midtrans tidak aktif"}
	}
	if n.OrderID == "" || !s.midtrans.VerifyNotificationSignature(n) {
		return &BookingInputError{Message: "signature notifikasi Midtrans tidak valid"}
	}
	st, err := s.midtrans.GetTransactionStatus(n.OrderID)
	if err != nil {
		return err
	}
	if st == nil || !st.IsPaid() {
		// Pending, gagal, atau kedaluwarsa tidak mengubah booking: batas bayar
		// booking tetap diatur aplikasi dan customer boleh mencoba lagi.
		return nil
	}
	return s.applyMidtransPayment(st)
}

func (s *bookingService) applyMidtransPayment(st *MidtransTransactionStatus) error {
	amount, err := st.Amount()
	if err != nil {
		return err
	}
	method := models.PaymentMethodMidtrans
	if st.PaymentType != "" {
		method += " " + st.PaymentType
	}
	return s.UpdateStatusByWebhook(st.OrderID, midtransBookingCode(st.OrderID), models.StatusPaid, method, amount, st.Currency)
}

// midtransBookingCode membuang akhiran "-<unix milli>" dari order_id sehingga
// order lama yang sudah diganti tetap menemukan booking-nya.
func midtransBookingCode(orderID string) string {
	if i := strings.LastIndex(orderID, "-"); i > 0 {
		return orderID[:i]
	}
	return orderID
}
