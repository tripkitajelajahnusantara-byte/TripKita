package services

import (
	crand "crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"tripkita-provider/database"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type BookingService interface {
	GetAllBookings(providerID uint) ([]models.Booking, error)
	UpdateBookingStatus(id uint, providerID uint, status string) (*models.Booking, error)
	ProviderReschedule(id uint, providerID uint, newDate string) (*models.Booking, error)
	CreateBooking(booking *models.Booking) error
	CancelBookingByCustomer(id uint, customerID uint) (*models.Booking, error)
	UpdateStatusByWebhook(invoiceID string, externalID string, xenditStatus string, paymentMethod string, amount int64, currency string) error
	GetRefunds() ([]models.Booking, error)
	CompleteRefund(bookingID uint, adminID uint, req *models.CompleteRefundRequest) (*models.RefundRecord, error)
	GetRefundRecords(bookingIDs []uint) (map[uint]models.RefundRecord, error)
	GetBookingByID(id uint) (*models.Booking, error)
	GetCustomerBookings(customerID uint) ([]models.Booking, error)
	GetBookingByCode(code string) (*models.Booking, error)
	AdminGetAllBookings() ([]models.Booking, error)
}

type bookingService struct {
	repo          repositories.BookingRepository
	packageRepo   repositories.PackageRepository
	xenditService XenditService
	emailService  *EmailService
	notifService  *NotificationService
}

type BookingInputError struct{ Message string }

func (e *BookingInputError) Error() string { return e.Message }

type BookingGatewayError struct{ Message string }

func (e *BookingGatewayError) Error() string { return e.Message }

func NewBookingService(repo repositories.BookingRepository, packageRepo repositories.PackageRepository, xenditService XenditService, emailService *EmailService, notifService *NotificationService) BookingService {
	return &bookingService{
		repo:          repo,
		packageRepo:   packageRepo,
		xenditService: xenditService,
		emailService:  emailService,
		notifService:  notifService,
	}
}

func (s *bookingService) checkAutoExpire(booking *models.Booking) {
	if booking == nil || database.DB == nil {
		return
	}
	if booking.Status != "PENDING_PAYMENT" || booking.CreatedAt.IsZero() || time.Since(booking.CreatedAt) <= 24*time.Hour {
		return
	}

	var expired models.Booking
	changed := false
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&expired, booking.ID).Error; err != nil {
			return err
		}
		if expired.Status != "PENDING_PAYMENT" || expired.CreatedAt.IsZero() || time.Since(expired.CreatedAt) <= 24*time.Hour {
			return nil
		}
		expired.Status = "EXPIRED"
		if err := tx.Save(&expired).Error; err != nil {
			return err
		}
		changed = true
		return recalculatePackageQuotaTx(tx, expired.PackageID)
	})
	if err != nil {
		log.Printf("gagal mengakhiri booking %d: %v", booking.ID, err)
		return
	}
	if changed {
		*booking = expired
		s.sendNotificationsAndEmails(&expired, "PENDING_PAYMENT", "EXPIRED")
	}
}

func (s *bookingService) GetAllBookings(providerID uint) ([]models.Booking, error) {
	bookings, err := s.repo.FindAllByProvider(providerID)
	if err == nil {
		for i := range bookings {
			s.checkAutoExpire(&bookings[i])
		}
	}
	return bookings, err
}

func (s *bookingService) GetBookingByID(id uint) (*models.Booking, error) {
	booking, err := s.repo.FindByID(id)
	if err == nil && booking != nil {
		s.checkAutoExpire(booking)
	}
	return booking, err
}

func (s *bookingService) GetCustomerBookings(customerID uint) ([]models.Booking, error) {
	bookings, err := s.repo.FindAllByCustomer(customerID)
	if err == nil {
		for i := range bookings {
			s.checkAutoExpire(&bookings[i])
		}
	}
	return bookings, err
}

func (s *bookingService) GetBookingByCode(code string) (*models.Booking, error) {
	booking, err := s.repo.FindByBookingCode(code)
	if err == nil && booking != nil {
		s.checkAutoExpire(booking)
	}
	return booking, err
}

func (s *bookingService) UpdateBookingStatus(id uint, providerID uint, status string) (*models.Booking, error) {
	var booking models.Booking
	var oldStatus string
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND provider_id = ?", id, providerID).First(&booking).Error; err != nil {
			return err
		}
		oldStatus = booking.Status
		if err := validateProviderStatusTransition(oldStatus, status, booking.TripEndDate, time.Now()); err != nil {
			return err
		}

		switch status {
		case "CANCELLED_BY_CUSTOMER":
			if oldStatus == "PENDING_PAYMENT" {
				booking.Status = "CANCELLED_BY_CUSTOMER"
				booking.RefundAmount = 0
				booking.CancellationReason = "Dibatalkan oleh pelanggan sebelum pembayaran"
			} else if time.Until(booking.TripDate) >= 7*24*time.Hour {
				booking.Status = "REFUND_REQUIRED"
				booking.RefundAmount = booking.TotalPrice
				booking.CancellationReason = "Dibatalkan oleh pelanggan (minimal 7 hari sebelum trip - refund 100%)"
				if err := reverseProviderFinanceTx(tx, &booking); err != nil {
					return err
				}
			} else {
				booking.Status = "CANCELLED_BY_CUSTOMER"
				booking.RefundAmount = 0
				booking.CancellationReason = "Dibatalkan oleh pelanggan (kurang dari 7 hari sebelum trip - refund 0%)"
				if err := releaseHeldSettlementTx(tx, &booking); err != nil {
					return err
				}
			}
		case "CANCELLED_BY_PROVIDER":
			if oldStatus == "PENDING_PAYMENT" {
				booking.Status = "CANCELLED_BY_PROVIDER"
				booking.RefundAmount = 0
			} else {
				booking.Status = "REFUND_REQUIRED"
				booking.RefundAmount = booking.TotalPrice
				if err := reverseProviderFinanceTx(tx, &booking); err != nil {
					return err
				}
			}
			booking.CancellationReason = "Dibatalkan oleh provider (refund 100% untuk pembayaran yang telah diterima)"
		case "RESCHEDULE_OFFERED":
			if booking.RescheduleCount >= 1 {
				return fmt.Errorf("penjadwalan ulang hanya diperbolehkan maksimal 1 kali")
			}
			booking.Status = "RESCHEDULE_OFFERED"
		case models.StatusCompleted:
			if err := releaseHeldSettlementTx(tx, &booking); err != nil {
				return err
			}
			booking.Status = models.StatusCompleted
		default:
			booking.Status = status
		}

		if err := tx.Save(&booking).Error; err != nil {
			return err
		}
		return recalculatePackageQuotaTx(tx, booking.PackageID)
	})
	if err != nil {
		return nil, err
	}
	s.sendNotificationsAndEmails(&booking, oldStatus, booking.Status)
	return &booking, nil
}

func releaseHeldSettlementTx(tx *gorm.DB, booking *models.Booking) error {
	if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(booking.ProviderID)+1_000_000_000).Error; err != nil {
		return err
	}
	var settlement models.HeldSettlement
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("booking_id = ? AND status = ?", booking.ID, "HELD").First(&settlement).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	} else if err != nil {
		return err
	}
	settlement.Status = "RELEASED"
	if err := tx.Save(&settlement).Error; err != nil {
		return err
	}
	return tx.Model(&models.ProviderBalance{}).Where("provider_id = ?", booking.ProviderID).Updates(map[string]interface{}{
		"available_balance": gorm.Expr("available_balance + ?", settlement.Amount),
		"held_balance":      gorm.Expr("GREATEST(held_balance - ?, 0)", settlement.Amount),
		"updated_at":        time.Now(),
	}).Error
}

func reverseProviderFinanceTx(tx *gorm.DB, booking *models.Booking) error {
	if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(booking.ProviderID)+1_000_000_000).Error; err != nil {
		return err
	}
	var settlement models.HeldSettlement
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("booking_id = ?", booking.ID).First(&settlement).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	} else if err != nil {
		return err
	}
	if settlement.Status == "CANCELLED" {
		return nil
	}
	const serviceFee int64 = 5000
	packageGross := booking.TotalPrice - serviceFee
	if packageGross < 0 {
		packageGross = 0
	}
	providerNet := packageGross * 85 / 100
	heldReduction := int64(0)
	availableReduction := providerNet
	if settlement.Status == "HELD" {
		heldReduction = settlement.Amount
		availableReduction = providerNet - settlement.Amount
	}
	settlement.Status = "CANCELLED"
	if err := tx.Save(&settlement).Error; err != nil {
		return err
	}
	return tx.Model(&models.ProviderBalance{}).Where("provider_id = ?", booking.ProviderID).Updates(map[string]interface{}{
		"available_balance": gorm.Expr("GREATEST(available_balance - ?, 0)", availableReduction),
		"held_balance":      gorm.Expr("GREATEST(held_balance - ?, 0)", heldReduction),
		"total_earned":      gorm.Expr("GREATEST(total_earned - ?, 0)", providerNet),
		"updated_at":        time.Now(),
	}).Error
}

func validateProviderStatusTransition(current, next string, tripEndDate time.Time, now time.Time) error {
	switch next {
	case "CONFIRMED":
		if current != "PAID" {
			return fmt.Errorf("booking hanya dapat dikonfirmasi setelah pembayaran terverifikasi")
		}
	case "CANCELLED_BY_PROVIDER":
		// RESCHEDULE_OFFERED ikut diizinkan: tawaran jadwal pengganti yang
		// ditolak pelanggan atau tidak dijawab sampai tanggal berangkat harus
		// dapat dialihkan ke proses pengembalian dana.
		if current != "PENDING_PAYMENT" && current != "PAID" && current != "CONFIRMED" && current != models.StatusRescheduleOffered {
			return fmt.Errorf("booking dengan status %s tidak dapat dibatalkan", current)
		}
	case "CANCELLED_BY_CUSTOMER":
		if current != "PENDING_PAYMENT" && current != "PAID" && current != "CONFIRMED" {
			return fmt.Errorf("booking dengan status %s tidak dapat dibatalkan", current)
		}
	case "RESCHEDULE_OFFERED":
		if current != "PAID" && current != "CONFIRMED" {
			return fmt.Errorf("hanya booking terbayar yang dapat dijadwalkan ulang")
		}
	case models.StatusCompleted:
		if current != models.StatusPaid && current != models.StatusConfirmed {
			return fmt.Errorf("booking dengan status %s tidak dapat diselesaikan", current)
		}
		if tripEndDate.IsZero() {
			return fmt.Errorf("tanggal selesai perjalanan belum tersedia")
		}
		if now.Before(tripEndDate) {
			return fmt.Errorf("booking baru dapat diselesaikan setelah perjalanan berakhir pada %s", tripEndDate.Format(time.RFC3339))
		}
	default:
		return fmt.Errorf("perubahan status tidak diizinkan")
	}
	return nil
}

func (s *bookingService) CancelBookingByCustomer(id uint, customerID uint) (*models.Booking, error) {
	var booking models.Booking
	if err := database.DB.Where("id = ? AND customer_id = ?", id, customerID).First(&booking).Error; err != nil {
		return nil, fmt.Errorf("booking tidak ditemukan")
	}
	if booking.Status != "PENDING_PAYMENT" && booking.Status != "PAID" && booking.Status != "CONFIRMED" {
		return nil, fmt.Errorf("booking dengan status %s tidak dapat dibatalkan", booking.Status)
	}
	return s.UpdateBookingStatus(booking.ID, booking.ProviderID, "CANCELLED_BY_CUSTOMER")
}

func (s *bookingService) ProviderReschedule(id uint, providerID uint, newDate string) (*models.Booking, error) {
	parsedDate, err := time.Parse("2006-01-02", newDate)
	if err != nil {
		return nil, fmt.Errorf("format tanggal tidak valid")
	}
	if !parsedDate.After(time.Now()) {
		return nil, fmt.Errorf("tanggal pengganti harus berada di masa mendatang")
	}

	var booking models.Booking
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Package").Where("id = ? AND provider_id = ?", id, providerID).First(&booking).Error; err != nil {
			return fmt.Errorf("booking tidak ditemukan")
		}
		if booking.Status != "RESCHEDULE_OFFERED" || booking.RescheduleCount >= 1 {
			return fmt.Errorf("booking tidak berada pada proses penjadwalan ulang")
		}
		// Tawaran yang berasal dari peninjauan kuota H-3 wajib melewati
		// persetujuan pelanggan. Tanpa penjagaan ini, jalur lama dapat memaksa
		// tanggal baru menjadi CONFIRMED tanpa pelanggan pernah menyetujuinya.
		if booking.TripDepartureID != nil {
			return fmt.Errorf("penjadwalan ulang keberangkatan open trip menunggu jawaban pelanggan dan tidak dapat diubah dari sini")
		}
		newTripDay := parsedDate.Format("2006-01-02")
		if booking.Package.StartDate != "" && newTripDay < booking.Package.StartDate {
			return fmt.Errorf("tanggal pengganti berada sebelum periode paket")
		}
		if booking.Package.EndDate != "" && newTripDay > booking.Package.EndDate {
			return fmt.Errorf("tanggal pengganti berada setelah periode paket")
		}
		original := booking.TripDate
		tripDuration := booking.TripEndDate.Sub(booking.TripDate)
		if tripDuration <= 0 {
			tripDuration = time.Duration(normalizedTripDuration(booking.Package.Duration)) * 24 * time.Hour
		}
		parsedDate = time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), original.Hour(), original.Minute(), original.Second(), original.Nanosecond(), original.Location())
		booking.OriginalTripDate = &original
		booking.RescheduleDate = &parsedDate
		booking.TripDate = parsedDate
		booking.TripEndDate = parsedDate.Add(tripDuration)
		booking.RescheduleCount++
		booking.Status = "CONFIRMED"
		if err := tx.Save(&booking).Error; err != nil {
			return err
		}
		return tx.Model(&models.HeldSettlement{}).
			Where("booking_id = ? AND status = ?", booking.ID, "HELD").
			Update("release_date", booking.TripEndDate).Error
	})
	if err != nil {
		return nil, err
	}

	// Notifikasi
	if booking.CustomerID != nil {
		s.notifService.CreateNotification(
			*booking.CustomerID,
			"CUSTOMER",
			"Booking Di-reschedule",
			fmt.Sprintf("Jadwal trip Anda untuk %s telah diubah menjadi %s oleh Provider", booking.BookingCode, parsedDate.Format("02 Jan 2006")),
			"INFO",
			fmt.Sprintf("/riwayat-booking/%d", booking.ID),
		)
	}

	return &booking, nil
}

func (s *bookingService) CreateBooking(booking *models.Booking) error {
	if database.DB == nil {
		return fmt.Errorf("database belum tersedia")
	}
	if booking.TripDate.Before(time.Now().Add(-5 * time.Minute)) {
		return &BookingInputError{Message: "tanggal perjalanan harus berada di masa mendatang"}
	}

	var pkg models.Package
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&pkg, booking.PackageID).Error; err != nil {
			return &BookingInputError{Message: "paket tidak ditemukan"}
		}
		var activeProvider models.Provider
		if err := tx.Select("id").Where("id = ? AND role = ? AND status = ? AND is_verified = ?", pkg.ProviderID, "PROVIDER", "APPROVED", true).First(&activeProvider).Error; err != nil {
			return &BookingInputError{Message: "provider paket sedang tidak tersedia"}
		}
		if pkg.Status != "Aktif" {
			return &BookingInputError{Message: "paket sedang tidak aktif"}
		}
		if pkg.Price <= 0 {
			return &BookingInputError{Message: "harga paket tidak valid"}
		}
		if booking.Guests <= 0 || (pkg.MinGuests > 0 && booking.Guests < pkg.MinGuests) || (pkg.MaxGuests > 0 && booking.Guests > pkg.MaxGuests) {
			return &BookingInputError{Message: "jumlah peserta tidak valid"}
		}
		tripDay := booking.TripDate.Format("2006-01-02")
		if pkg.StartDate != "" && tripDay < pkg.StartDate {
			return &BookingInputError{Message: "tanggal perjalanan berada sebelum periode paket"}
		}
		if pkg.EndDate != "" && tripDay > pkg.EndDate {
			return &BookingInputError{Message: "tanggal perjalanan berada setelah periode paket"}
		}
		if pkg.QuotaMax > 0 && pkg.QuotaUsed+booking.Guests > pkg.QuotaMax {
			return &BookingInputError{Message: fmt.Sprintf("kuota paket tidak mencukupi (tersisa %d seat)", pkg.QuotaMax-pkg.QuotaUsed)}
		}
		if err := ensureExclusiveDateTx(tx, &pkg, booking.TripDate, calculateTripEnd(booking.TripDate, pkg.Duration), 0); err != nil {
			return err
		}
		addOnTotal, err := calculateAddOnTotal(pkg.Name, booking.SelectedAddOnIDs)
		if err != nil {
			return &BookingInputError{Message: err.Error()}
		}

		booking.ProviderID = pkg.ProviderID
		booking.TripEndDate = calculateTripEnd(booking.TripDate, pkg.Duration)
		const serviceFee int64 = 5000
		booking.TotalPrice = int64(booking.Guests)*pkg.Price + addOnTotal + serviceFee
		booking.Status = "PENDING_PAYMENT"
		booking.PaymentMethod = "Xendit Invoice"
		booking.BookingCode = ""

		for i := 0; i < 10; i++ {
			code, err := generateBookingCode()
			if err != nil {
				return err
			}
			var count int64
			if err := tx.Model(&models.Booking{}).Where("LOWER(booking_code) = LOWER(?)", code).Count(&count).Error; err != nil {
				return err
			}
			if count == 0 {
				booking.BookingCode = code
				break
			}
		}
		if booking.BookingCode == "" {
			return fmt.Errorf("gagal membuat kode booking unik")
		}
		if err := tx.Create(booking).Error; err != nil {
			return err
		}
		return recalculatePackageQuotaTx(tx, pkg.ID)
	})
	if err != nil {
		return err
	}

	invoiceID, paymentURL, err := s.xenditService.CreateInvoice(booking, pkg.Name)
	if err != nil {
		_ = database.DB.Transaction(func(tx *gorm.DB) error {
			if updateErr := tx.Model(&models.Booking{}).Where("id = ? AND status = ?", booking.ID, "PENDING_PAYMENT").Update("status", "PAYMENT_INIT_FAILED").Error; updateErr != nil {
				return updateErr
			}
			return tx.Model(&models.Package{}).Where("id = ?", booking.PackageID).UpdateColumn("quota_used", gorm.Expr("GREATEST(quota_used - ?, 0)", booking.Guests)).Error
		})
		return &BookingGatewayError{Message: "gagal membuat invoice pembayaran"}
	}
	booking.XenditInvoiceID = invoiceID
	booking.PaymentURL = paymentURL
	result := database.DB.Model(&models.Booking{}).
		Where("id = ? AND status = ?", booking.ID, "PENDING_PAYMENT").
		Updates(map[string]interface{}{"xendit_invoice_id": invoiceID, "payment_url": paymentURL, "updated_at": time.Now()})
	if result.Error != nil {
		return fmt.Errorf("invoice dibuat tetapi gagal disimpan; hubungi administrator dengan booking ID %d", booking.ID)
	}
	if result.RowsAffected != 1 {
		return fmt.Errorf("status booking berubah sebelum invoice tersimpan")
	}
	return nil
}

func normalizedTripDuration(duration int) int {
	if duration < 1 {
		return 1
	}
	return duration
}

// calculateTripEnd menganggap duration sebagai jumlah hari kalender perjalanan.
// Booking satu hari berakhir pada jam yang sama di hari berikutnya; booking
// lima hari berakhir pada jam yang sama lima hari kalender kemudian.
func calculateTripEnd(start time.Time, duration int) time.Time {
	return start.AddDate(0, 0, normalizedTripDuration(duration))
}

func tripHasEnded(booking models.Booking, now time.Time) bool {
	return booking.Status == models.StatusCompleted || (!booking.TripEndDate.IsZero() && !now.Before(booking.TripEndDate))
}

func generateBookingCode() (string, error) {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	suffix := make([]byte, 8)
	for i := range suffix {
		value, err := crand.Int(crand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		suffix[i] = charset[value.Int64()]
	}
	return fmt.Sprintf("TK-%s-%s", time.Now().Format("20060102"), string(suffix)), nil
}

func calculateAddOnTotal(packageName string, selected []string) (int64, error) {
	_ = packageName
	if len(selected) > 0 {
		return 0, fmt.Errorf("layanan tambahan belum tersedia")
	}
	return 0, nil
}

func (s *bookingService) GetRefunds() ([]models.Booking, error) {
	return s.repo.FindAllRefunds()
}

// CompleteRefund mencatat bahwa dana benar-benar sudah dikembalikan ke pelanggan.
//
// Penyelesaian refund menuntut nominal, metode, referensi transfer, dan identitas
// admin yang memprosesnya. Sebelumnya fungsi ini hanya membalik status booking,
// sehingga booking dapat ditandai REFUNDED tanpa ada dana yang berpindah dan
// tanpa jejak yang dapat diaudit.
func (s *bookingService) CompleteRefund(bookingID uint, adminID uint, req *models.CompleteRefundRequest) (*models.RefundRecord, error) {
	var booking models.Booking
	var record models.RefundRecord

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var admin models.Provider
		if err := tx.Select("id", "email").First(&admin, adminID).Error; err != nil {
			return fmt.Errorf("akun admin pemroses tidak ditemukan")
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&booking, bookingID).Error; err != nil {
			return err
		}
		if booking.Status != models.StatusRefundRequired {
			return &BookingInputError{Message: "hanya refund yang masih menunggu proses yang dapat diselesaikan"}
		}
		if req.Amount > booking.RefundAmount {
			return &BookingInputError{Message: fmt.Sprintf("nominal refund melebihi hak pelanggan sebesar %d", booking.RefundAmount)}
		}

		record = models.RefundRecord{
			BookingID:        booking.ID,
			EntitledAmount:   booking.RefundAmount,
			Amount:           req.Amount,
			Method:           req.Method,
			Reference:        strings.TrimSpace(req.Reference),
			Notes:            strings.TrimSpace(req.Notes),
			ProcessedByID:    admin.ID,
			ProcessedByEmail: admin.Email,
			ProcessedAt:      time.Now(),
		}
		// Unique index pada booking_id menolak pencatatan ganda meski dua admin
		// menekan tombol bersamaan.
		if err := tx.Create(&record).Error; err != nil {
			return fmt.Errorf("refund untuk booking ini sudah pernah dicatat: %w", err)
		}

		result := tx.Model(&models.Booking{}).
			Where("id = ? AND status = ?", bookingID, models.StatusRefundRequired).
			Updates(map[string]interface{}{
				"status":     models.StatusRefunded,
				"updated_at": time.Now(),
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return fmt.Errorf("refund sudah diproses atau status telah berubah")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	log.Printf("[Refund] Booking %d selesai: nominal=%d metode=%s admin=%d", bookingID, req.Amount, req.Method, adminID)

	booking.Status = models.StatusRefunded
	s.sendNotificationsAndEmails(&booking, models.StatusRefundRequired, models.StatusRefunded)
	return &record, nil
}

// GetRefundRecords mengembalikan catatan refund untuk sekumpulan booking,
// dipetakan berdasarkan booking id.
func (s *bookingService) GetRefundRecords(bookingIDs []uint) (map[uint]models.RefundRecord, error) {
	records := make(map[uint]models.RefundRecord)
	if len(bookingIDs) == 0 {
		return records, nil
	}
	var rows []models.RefundRecord
	if err := database.DB.Where("booking_id IN ?", bookingIDs).Find(&rows).Error; err != nil {
		return nil, err
	}
	for _, row := range rows {
		records[row.BookingID] = row
	}
	return records, nil
}

func (s *bookingService) UpdateStatusByWebhook(invoiceID string, externalID string, xenditStatus string, paymentMethod string, amount int64, currency string) error {
	var booking models.Booking
	var oldStatus, newStatus string
	changed := false
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		query := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Package")
		findErr := query.Where("xendit_invoice_id = ?", invoiceID).First(&booking).Error
		if findErr != nil && externalID != "" {
			parts := strings.Split(externalID, "_")
			if len(parts) == 3 && parts[0] == "booking" {
				if idVal, parseErr := strconv.ParseUint(parts[1], 10, 32); parseErr == nil {
					findErr = query.Where("id = ? AND xendit_invoice_id = ''", uint(idVal)).First(&booking).Error
				}
			}
		}
		if findErr != nil {
			return fmt.Errorf("booking webhook tidak ditemukan")
		}

		oldStatus = booking.Status
		switch strings.ToUpper(xenditStatus) {
		case "PAID", "SETTLED":
			if amount != booking.TotalPrice || (currency != "" && strings.ToUpper(currency) != "IDR") {
				return fmt.Errorf("nominal atau mata uang callback tidak sesuai dengan booking")
			}
			if oldStatus == "PAID" || oldStatus == "CONFIRMED" || oldStatus == "COMPLETED" {
				return nil
			}
			if oldStatus != "PENDING_PAYMENT" {
				return fmt.Errorf("status booking %s tidak dapat menerima pembayaran", oldStatus)
			}
			newStatus = "PAID"
			booking.PaymentMethod = paymentMethod
			if err := recordFinanceOnPaymentTx(tx, &booking); err != nil {
				return err
			}
		case "EXPIRED", "FAILED":
			if oldStatus != "PENDING_PAYMENT" {
				return nil
			}
			newStatus = "EXPIRED"
		default:
			return nil
		}

		booking.Status = newStatus
		if err := tx.Save(&booking).Error; err != nil {
			return err
		}
		changed = true
		return recalculatePackageQuotaTx(tx, booking.PackageID)
	})
	if err != nil {
		log.Printf("[Xendit Webhook] gagal memproses event: %v", err)
		return err
	}
	if changed {
		s.sendNotificationsAndEmails(&booking, oldStatus, newStatus)
	}
	return nil
}

func recordFinanceOnPaymentTx(tx *gorm.DB, booking *models.Booking) error {
	if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(booking.ProviderID)+1_000_000_000).Error; err != nil {
		return err
	}
	// Serialize all financial mutations for the same booking, including before
	// the unique settlement index has been deployed.
	if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(booking.ID)).Error; err != nil {
		return err
	}
	var existing models.HeldSettlement
	if err := tx.Where("booking_id = ?", booking.ID).First(&existing).Error; err == nil {
		return nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	const serviceFee int64 = 5000
	packageGross := booking.TotalPrice - serviceFee
	if packageGross < 0 {
		packageGross = 0
	}
	providerNet := packageGross * 85 / 100
	availableAmount := providerNet / 2
	heldAmount := providerNet - availableAmount

	settlement := models.HeldSettlement{
		BookingID: booking.ID, ProviderID: booking.ProviderID, Amount: heldAmount,
		Status: "HELD", ReleaseDate: booking.TripEndDate, CreatedAt: time.Now(),
	}
	if err := tx.Create(&settlement).Error; err != nil {
		return err
	}

	var balance models.ProviderBalance
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("provider_id = ?", booking.ProviderID).First(&balance).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		balance = models.ProviderBalance{ProviderID: booking.ProviderID}
	} else if err != nil {
		return err
	}
	balance.AvailableBalance += availableAmount
	balance.HeldBalance += heldAmount
	balance.TotalEarned += providerNet
	balance.UpdatedAt = time.Now()
	return tx.Save(&balance).Error
}

// RecalculatePackageAvailability menghitung ulang kuota terpakai sekaligus
// menyelaraskan status tanggal paket dari tabel bookings. Diekspor agar job
// latar belakang memakai rumus yang sama, bukan salinannya sendiri.
func RecalculatePackageAvailability(tx *gorm.DB, packageID uint) error {
	return recalculatePackageQuotaTx(tx, packageID)
}

func recalculatePackageQuotaTx(tx *gorm.DB, packageID uint) error {
	if err := tx.Exec(`
		UPDATE packages p
		SET quota_used = COALESCE((
			SELECT SUM(b.guests) FROM bookings b
			WHERE b.package_id = p.id
			AND b.status IN ('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'COMPLETED')
		), 0)
		WHERE p.id = ?
	`, packageID).Error; err != nil {
		return err
	}
	return syncPackageDatesTx(tx, packageID)
}

func (s *bookingService) adjustQuota(booking *models.Booking, oldStatus, newStatus string, providerID uint) {
	if database.DB == nil || booking == nil {
		return
	}
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		return recalculatePackageQuotaTx(tx, booking.PackageID)
	}); err != nil {
		log.Printf("gagal menghitung ulang kuota paket %d: %v", booking.PackageID, err)
	}
}

func (s *bookingService) AdminGetAllBookings() ([]models.Booking, error) {
	return s.repo.FindAll()
}

func (s *bookingService) sendNotificationsAndEmails(booking *models.Booking, oldStatus, newStatus string) {
	if booking == nil {
		return
	}

	go func(b models.Booking, oldS, newS string) {
		var pkg *models.Package
		if s.packageRepo != nil {
			pkg, _ = s.packageRepo.FindByID(b.PackageID)
		}

		packageName := "Paket Wisata"
		if pkg != nil && pkg.Name != "" {
			packageName = pkg.Name
		} else if b.Package.Name != "" {
			packageName = b.Package.Name
		}

		var title, msgCustomer, msgProvider string
		notifType := NotifTypeGeneral

		switch newS {
		case "PAID", "CONFIRMED":
			notifType = NotifTypePayment
			title = "Pembayaran Berhasil"
			msgCustomer = fmt.Sprintf("Pembayaran pesanan #%s (%s) telah berhasil dikonfirmasi. E-Voucher PDF telah dikirim ke email Anda.", b.BookingCode, packageName)
			msgProvider = fmt.Sprintf("Pesanan baru #%s (%s) telah lunas sebesar Rp %s.", b.BookingCode, packageName, formatIDRNumber(b.TotalPrice))

			if s.emailService != nil {
				_ = s.emailService.SendPaymentSuccessEmail(&b, pkg)
			}

		case "EXPIRED":
			title = "Waktu Pembayaran Berakhir"
			msgCustomer = fmt.Sprintf("Masa berlaku pembayaran pesanan #%s (%s) telah kadaluwarsa.", b.BookingCode, packageName)
			msgProvider = fmt.Sprintf("Pesanan #%s (%s) telah kadaluwarsa karena batas waktu pembayaran habis.", b.BookingCode, packageName)

			if s.emailService != nil {
				_ = s.emailService.SendExpiredEmail(&b)
			}

		case "DIBATALKAN", "CANCELLED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_PROVIDER":
			title = "Pesanan Dibatalkan"
			msgCustomer = fmt.Sprintf("Pesanan #%s (%s) telah dibatalkan.", b.BookingCode, packageName)
			msgProvider = fmt.Sprintf("Pesanan #%s (%s) telah dibatalkan.", b.BookingCode, packageName)

			if s.emailService != nil {
				_ = s.emailService.SendCancelledEmail(&b)
			}

		case "REFUND_REQUIRED", "REFUNDED":
			notifType = NotifTypeRefund
			title = "Pengembalian Dana (Refund)"
			msgCustomer = fmt.Sprintf("Pengembalian dana untuk pesanan #%s (%s) telah diproses.", b.BookingCode, packageName)
			msgProvider = fmt.Sprintf("Status refund untuk pesanan #%s (%s) telah diperbarui.", b.BookingCode, packageName)

			if s.emailService != nil {
				_ = s.emailService.SendRefundEmail(&b)
			}

		case "RESCHEDULE_OFFERED", "RESCHEDULED":
			notifType = NotifTypeReschedule
			title = "Perubahan Jadwal Trip (Reschedule)"
			msgCustomer = fmt.Sprintf("Jadwal trip untuk pesanan #%s (%s) telah berhasil diperbarui.", b.BookingCode, packageName)
			msgProvider = fmt.Sprintf("Pesanan #%s (%s) telah dilakukan penjadwalan ulang.", b.BookingCode, packageName)

			if s.emailService != nil {
				_ = s.emailService.SendRescheduleEmail(&b)
			}
		}

		// Save in-app notification for Customer if CustomerID is set
		if b.CustomerID != nil && *b.CustomerID > 0 && s.notifService != nil && title != "" {
			_ = s.notifService.CreateNotification(*b.CustomerID, "CUSTOMER", title, msgCustomer, notifType, "/riwayat-booking")
		}

		// Save in-app notification for Provider
		if b.ProviderID > 0 && s.notifService != nil && title != "" {
			_ = s.notifService.CreateNotification(b.ProviderID, "PROVIDER", title, msgProvider, notifType, "/booking")
		}

		// Refund menunggu tindakan manual admin, jadi harus muncul di lonceng
		// notifikasi admin, bukan hanya di daftar "Administrasi Refund".
		if newS == models.StatusRefundRequired && s.notifService != nil {
			_ = s.notifService.NotifyAdmins(
				"Refund Menunggu Diproses",
				fmt.Sprintf("Pesanan #%s (%s) membutuhkan pengembalian dana ke pelanggan.", b.BookingCode, packageName),
				NotifTypeRefund,
				"/admin/refunds",
			)
		}
	}(*booking, oldStatus, newStatus)
}

// activeBookingStatuses adalah status yang benar-benar menahan kursi maupun
// tanggal. Sama persis dengan status yang dihitung recalculatePackageQuotaTx.
var activeBookingStatuses = []string{
	models.StatusPendingPayment,
	models.StatusPaid,
	models.StatusConfirmed,
	models.StatusCompleted,
}

// ensureExclusiveDateTx menegakkan aturan "satu tanggal satu pesanan" untuk
// paket selain Open Trip.
//
// Open Trip berangkat bersama-sama sehingga satu tanggal memang dibagi banyak
// pemesan dan dikendalikan kuota. Tipe lain bersifat eksklusif: begitu seorang
// pelanggan memilih tanggal, tanggal itu tidak boleh lagi dipilih orang lain.
//
// Pemeriksaan ini aman dari balapan karena pemanggilnya sudah memegang lock
// baris paket (SELECT ... FOR UPDATE), sehingga pemesanan pada satu paket
// diproses berurutan.
func ensureExclusiveDateTx(tx *gorm.DB, pkg *models.Package, tripStart time.Time, tripEnd time.Time, excludeBookingID uint) error {
	if models.IsOpenTrip(pkg.TripType) {
		return nil
	}

	startDay := tripStart.Format("2006-01-02")
	endDay := tripEnd.Format("2006-01-02")
	if endDay < startDay {
		endDay = startDay
	}

	// Dua pesanan bentrok bila rentang menginapnya beririsan, bukan hanya bila
	// tanggal berangkatnya sama. Paket 4D3N menahan pemandu dan armada selama
	// empat hari, sehingga hari kedua pun tidak boleh dijual ke pemesan lain.
	var conflicting int64
	query := tx.Model(&models.Booking{}).
		Where(`package_id = ? AND status IN ?
		       AND to_char(trip_date, 'YYYY-MM-DD') <= ?
		       AND to_char(GREATEST(trip_end_date, trip_date), 'YYYY-MM-DD') >= ?`,
			pkg.ID, activeBookingStatuses, endDay, startDay)
	if excludeBookingID > 0 {
		query = query.Where("id <> ?", excludeBookingID)
	}
	if err := query.Count(&conflicting).Error; err != nil {
		return err
	}
	if conflicting > 0 {
		return &BookingInputError{Message: "tanggal tersebut sudah dipesan pelanggan lain; silakan pilih tanggal lain yang masih tersedia"}
	}

	// Bila mitra sudah mengatur tanggal yang dibuka, tanggal berangkat wajib
	// berada di dalamnya. Hari-hari berikutnya mengikuti durasi paket dan tidak
	// perlu ikut dibuka satu per satu. Paket lama yang belum pernah diatur tetap
	// memakai rentang periode paket supaya tidak mendadak berhenti menerima
	// pesanan.
	var declared int64
	if err := tx.Model(&models.PackageDate{}).
		Where("package_id = ? AND origin = ?", pkg.ID, models.PackageDateOriginProvider).
		Count(&declared).Error; err != nil {
		return err
	}
	if declared == 0 {
		return nil
	}

	var offered int64
	if err := tx.Model(&models.PackageDate{}).
		Where("package_id = ? AND date = ? AND origin = ?", pkg.ID, startDay, models.PackageDateOriginProvider).
		Count(&offered).Error; err != nil {
		return err
	}
	if offered == 0 {
		return &BookingInputError{Message: "tanggal tersebut tidak dibuka oleh penyelenggara; silakan pilih salah satu tanggal yang tersedia"}
	}
	return nil
}

// occupiedDays menjabarkan seluruh hari yang ditahan satu pesanan, dari tanggal
// berangkat sampai tanggal selesai.
func occupiedDays(tripStart time.Time, tripEnd time.Time) []string {
	day := time.Date(tripStart.Year(), tripStart.Month(), tripStart.Day(), 0, 0, 0, 0, tripStart.Location())
	last := day
	if tripEnd.After(tripStart) {
		last = time.Date(tripEnd.Year(), tripEnd.Month(), tripEnd.Day(), 0, 0, 0, 0, tripEnd.Location())
	}

	days := make([]string, 0, 8)
	for !day.After(last) && len(days) < 366 {
		days = append(days, day.Format("2006-01-02"))
		day = day.AddDate(0, 0, 1)
	}
	return days
}

// syncPackageDatesTx menyelaraskan status tanggal dengan pesanan yang aktif.
//
// Statusnya adalah turunan dari tabel bookings, sama seperti quota_used, supaya
// tidak ada dua sumber kebenaran yang bisa menyimpang. Fungsi ini dipanggil dari
// recalculatePackageQuotaTx sehingga setiap perubahan status pesanan ikut
// memperbarui kalender pelanggan tanpa perlu diingat satu per satu.
func syncPackageDatesTx(tx *gorm.DB, packageID uint) error {
	var pkg models.Package
	if err := tx.Select("id", "trip_type").First(&pkg, packageID).Error; err != nil {
		return err
	}
	// Open Trip tidak mengunci tanggal; kursinya dikendalikan kuota.
	if models.IsOpenTrip(pkg.TripType) {
		return nil
	}

	var active []models.Booking
	if err := tx.Select("id", "trip_date", "trip_end_date").
		Where("package_id = ? AND status IN ?", packageID, activeBookingStatuses).
		Order("id asc").
		Find(&active).Error; err != nil {
		return err
	}

	taken := make(map[string]uint, len(active)*2)
	for _, booking := range active {
		for _, day := range occupiedDays(booking.TripDate, booking.TripEndDate) {
			if _, exists := taken[day]; !exists {
				taken[day] = booking.ID
			}
		}
	}

	var rows []models.PackageDate
	if err := tx.Where("package_id = ?", packageID).Find(&rows).Error; err != nil {
		return err
	}

	now := time.Now()
	seen := make(map[string]struct{}, len(rows))
	for _, row := range rows {
		seen[row.Date] = struct{}{}
		bookingID, isTaken := taken[row.Date]

		if isTaken {
			if row.Status == models.PackageDateBooked && row.BookingID != nil && *row.BookingID == bookingID {
				continue
			}
			if err := tx.Model(&models.PackageDate{}).Where("id = ?", row.ID).
				Updates(map[string]interface{}{
					"status":     models.PackageDateBooked,
					"booking_id": bookingID,
					"updated_at": now,
				}).Error; err != nil {
				return err
			}
			continue
		}

		// Tanggal sudah bebas kembali.
		if row.Origin == models.PackageDateOriginAuto {
			if err := tx.Delete(&models.PackageDate{}, row.ID).Error; err != nil {
				return err
			}
			continue
		}
		if row.Status != models.PackageDateOpen || row.BookingID != nil {
			if err := tx.Model(&models.PackageDate{}).Where("id = ?", row.ID).
				Updates(map[string]interface{}{
					"status":     models.PackageDateOpen,
					"booking_id": nil,
					"updated_at": now,
				}).Error; err != nil {
				return err
			}
		}
	}

	// Tanggal terpakai yang belum punya baris: dicatat sebagai baris bayangan
	// supaya kalender pelanggan tetap menandainya penuh, termasuk pada paket
	// lama yang mitranya belum pernah mengatur tanggal.
	for day, bookingID := range taken {
		if _, exists := seen[day]; exists {
			continue
		}
		id := bookingID
		if err := tx.Create(&models.PackageDate{
			PackageID: packageID,
			Date:      day,
			Status:    models.PackageDateBooked,
			Origin:    models.PackageDateOriginAuto,
			BookingID: &id,
		}).Error; err != nil {
			return err
		}
	}
	return nil
}
