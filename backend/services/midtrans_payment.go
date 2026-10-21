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
// pernah memiliki dua tagihan aktif sekaligus.
func (s *bookingService) StartMidtransPayment(bookingID uint) (*models.Booking, error) {
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
