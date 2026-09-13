package services

import (
	"fmt"
	"math/rand"
	"strconv"
	"strings"
	"time"
	"tripkita-provider/database"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type BookingService interface {
	GetAllBookings(providerID uint) ([]models.Booking, error)
	UpdateBookingStatus(id uint, providerID uint, status string) (*models.Booking, error)
	CreateBooking(booking *models.Booking) error
	UpdateStatusByWebhook(invoiceID string, externalID string, xenditStatus string, paymentMethod string) error
	GetRefunds() ([]models.Booking, error)
	CompleteRefund(id uint) error
	GetBookingByID(id uint) (*models.Booking, error)
	GetCustomerBookings(customerID uint) ([]models.Booking, error)
	GetBookingByCode(code string) (*models.Booking, error)
	UploadPaymentProof(id uint, proofPath string) (*models.Booking, error)
	PublicUpdateStatus(id uint, status string) (*models.Booking, error)
	AdminGetAllBookings() ([]models.Booking, error)
	AdminConfirmPayment(id uint) (*models.Booking, error)
}

type bookingService struct {
	repo          repositories.BookingRepository
	packageRepo   repositories.PackageRepository
	xenditService XenditService
	emailService  *EmailService
	notifService  *NotificationService
}

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
	if booking.Status == "PENDING_PAYMENT" && !booking.CreatedAt.IsZero() {
		// If CreatedAt is older than 24 hours
		if time.Since(booking.CreatedAt) > 24*time.Hour {
			oldStatus := booking.Status
			booking.Status = "EXPIRED"
			_ = s.repo.Update(booking)
			s.adjustQuota(booking, oldStatus, "EXPIRED", booking.ProviderID)
			s.sendNotificationsAndEmails(booking, oldStatus, "EXPIRED")
		}
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
	booking, err := s.repo.FindByIDAndProvider(id, providerID)
	if err != nil {
		return nil, err
	}

	oldStatus := booking.Status

	// Handle Cancellation & Reschedule logic according to strict rules
	if status == "CANCELLED_BY_CUSTOMER" {
		daysUntilTrip := int(time.Until(booking.TripDate).Hours() / 24)
		if daysUntilTrip >= 7 {
			// >= 7 Days: 100% Refund
			booking.Status = "REFUND_REQUIRED"
			booking.RefundAmount = booking.TotalPrice
			booking.CancellationReason = "Dibatalkan oleh pelanggan (≥ 7 hari sebelum trip - Refund 100%)"
		} else {
			// < 7 Days: 0% Refund (Forfeited deposit goes to Provider)
			booking.Status = "CANCELLED_BY_CUSTOMER"
			booking.RefundAmount = 0
			booking.CancellationReason = "Dibatalkan oleh pelanggan (< 7 hari sebelum trip - Refund 0%)"
			
			// Release held funds to Provider available balance as compensation
			if database.DB != nil {
				var settlement models.HeldSettlement
				if errS := database.DB.Where("booking_id = ?", booking.ID).First(&settlement).Error; errS == nil {
					settlement.Status = "RELEASED"
					database.DB.Save(&settlement)
					database.DB.Exec("UPDATE provider_balances SET available_balance = available_balance + ?, held_balance = GREATEST(held_balance - ?, 0) WHERE provider_id = ?", settlement.Amount, settlement.Amount, booking.ProviderID)
				}
			}
		}
	} else if status == "CANCELLED_BY_PROVIDER" || status == "REFUND_REQUIRED" {
		// Provider / Weather / Quota cancellation is ALWAYS 100% Refund
		booking.Status = "REFUND_REQUIRED"
		booking.RefundAmount = booking.TotalPrice
		if booking.CancellationReason == "" {
			booking.CancellationReason = "Dibatalkan oleh Provider / Kendala Cuaca / Kuota Minimal (Refund 100%)"
		}
	} else if status == "RESCHEDULE_OFFERED" {
		if booking.RescheduleCount >= 1 {
			return nil, fmt.Errorf("penjadwalan ulang (reschedule) hanya diperbolehkan maksimal 1 kali. Harap pilih opsi pembatalan untuk 100%% Full Refund")
		}
		booking.Status = "RESCHEDULE_OFFERED"
		booking.RescheduleCount += 1
		orig := booking.TripDate
		booking.OriginalTripDate = &orig
	} else {
		booking.Status = status
	}

	err = s.repo.Update(booking)
	if err != nil {
		return nil, err
	}

	// Adjust package quota
	s.adjustQuota(booking, oldStatus, booking.Status, providerID)
	s.sendNotificationsAndEmails(booking, oldStatus, booking.Status)

	return booking, nil
}

func (s *bookingService) CreateBooking(booking *models.Booking) error {
	pkg, err := s.packageRepo.FindByID(booking.PackageID)
	if err != nil {
		allPkgs, errAll := s.packageRepo.FindAllPublic()
		if errAll == nil && len(allPkgs) > 0 {
			pkg = &allPkgs[0]
			booking.PackageID = pkg.ID
		} else {
			// Auto-create default package in DB so booking never fails
			defaultPkg := &models.Package{
				ProviderID:  1,
				Name:        "Open Trip Gunung Bromo",
				Destination: "Probolinggo, Jawa Timur",
				Category:    "Gunung",
				TripType:    "Open Trip",
				Price:       350000,
				QuotaMin:    1,
				QuotaMax:    100,
				QuotaUsed:   0,
				Status:      "Aktif",
				Rating:      4.8,
			}
			_ = s.packageRepo.Create(defaultPkg)
			pkg = defaultPkg
			booking.PackageID = defaultPkg.ID
		}
	}

	// Validate quota
	if pkg.QuotaMax > 0 && pkg.QuotaUsed+booking.Guests > pkg.QuotaMax {
		return fmt.Errorf("kuota paket tidak mencukupi (tersisa %d seat)", pkg.QuotaMax-pkg.QuotaUsed)
	}

	booking.ProviderID = pkg.ProviderID
	const serviceFee int64 = 4000
	if booking.TotalPrice <= 0 {
		booking.TotalPrice = int64(booking.Guests)*pkg.Price + serviceFee
	}
	booking.Status = "PENDING_PAYMENT"
	
	// Ensure unique BookingCode (Format: TK-YYYYMMDD-XXXX)
	generateCode := func() string {
		now := time.Now()
		datePart := now.Format("20060102")
		randSource := rand.NewSource(time.Now().UnixNano())
		r := rand.New(randSource)
		charset := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
		suffix := make([]byte, 4)
		for i := range suffix {
			suffix[i] = charset[r.Intn(len(charset))]
		}
		return fmt.Sprintf("TK-%s-%s", datePart, string(suffix))
	}

	if strings.TrimSpace(booking.BookingCode) == "" {
		booking.BookingCode = generateCode()
	}

	// Guarantee uniqueness in database (retry if exact collision occurs)
	for i := 0; i < 10; i++ {
		existing, errExist := s.repo.FindExactByBookingCode(booking.BookingCode)
		if errExist == nil && existing != nil && existing.ID != booking.ID {
			booking.BookingCode = generateCode()
		} else {
			break
		}
	}

	// Save to DB first to generate booking.ID
	if err := s.repo.Create(booking); err != nil {
		return err
	}

	// Instantly reserve quota for package in database atomically during PENDING_PAYMENT
	_ = s.packageRepo.AtomicReserveQuota(booking.PackageID, booking.Guests)
	s.adjustQuota(booking, "", "PENDING_PAYMENT", booking.ProviderID)

	if booking.PaymentMethod == "Manual Transfer" || booking.PaymentMethod == "" {
		booking.PaymentMethod = "Manual Transfer"
		booking.XenditInvoiceID = fmt.Sprintf("MANUAL-%d", booking.ID)
		booking.PaymentURL = ""
	} else {
		// Create Xendit Invoice with populated ID
		invoiceID, paymentURL, err := s.xenditService.CreateInvoice(booking, pkg.Name)
		if err != nil {
			return err
		}
		booking.XenditInvoiceID = invoiceID
		booking.PaymentURL = paymentURL
	}

	return s.repo.Update(booking)
}

func (s *bookingService) GetRefunds() ([]models.Booking, error) {
	return s.repo.FindAllRefunds()
}

func (s *bookingService) CompleteRefund(id uint) error {
	booking, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	oldStatus := booking.Status
	booking.Status = "REFUNDED"
	err = s.repo.Update(booking)
	if err == nil {
		s.sendNotificationsAndEmails(booking, oldStatus, "REFUNDED")
	}
	return err
}

func (s *bookingService) UpdateStatusByWebhook(invoiceID string, externalID string, xenditStatus string, paymentMethod string) error {
	booking, err := s.repo.FindByXenditInvoiceID(invoiceID)
	if (err != nil || booking == nil) && externalID != "" {
		parts := strings.Split(externalID, "_")
		if len(parts) >= 2 {
			idVal, parseErr := strconv.ParseUint(parts[1], 10, 32)
			if parseErr == nil {
				booking, err = s.repo.FindByID(uint(idVal))
			}
		}
	}
	if err != nil || booking == nil {
		return fmt.Errorf("booking tidak ditemukan untuk invoice %s / external_id %s", invoiceID, externalID)
	}

	oldStatus := booking.Status
	var newStatus string

	switch strings.ToUpper(xenditStatus) {
	case "PAID", "SETTLED":
		newStatus = "PAID"
		booking.PaymentMethod = paymentMethod
		s.recordFinanceOnPayment(booking)
	case "EXPIRED", "FAILED":
		// If booking is already paid or confirmed, Xendit 24h invoice expiration webhook should NOT downgrade it
		if oldStatus == "PAID" || oldStatus == "CONFIRMED" || oldStatus == "COMPLETED" {
			return nil // Retain paid status
		}
		newStatus = "EXPIRED"

	default:
		return nil // No changes
	}

	booking.Status = newStatus
	err = s.repo.Update(booking)
	if err != nil {
		return err
	}

	// Adjust package quota (EXPIRED will reduce QuotaUsed and return seats)
	s.adjustQuota(booking, oldStatus, newStatus, booking.ProviderID)
	s.sendNotificationsAndEmails(booking, oldStatus, newStatus)

	return nil
}

func (s *bookingService) recordFinanceOnPayment(booking *models.Booking) {
	if database.DB == nil || booking == nil {
		return
	}

	halfAmount := booking.TotalPrice / 2
	if halfAmount <= 0 {
		halfAmount = booking.TotalPrice
	}

	// 1. Create or update ProviderBalance
	var balance models.ProviderBalance
	err := database.DB.Where("provider_id = ?", booking.ProviderID).First(&balance).Error
	if err != nil {
		balance = models.ProviderBalance{
			ProviderID:       booking.ProviderID,
			AvailableBalance: halfAmount,
			HeldBalance:      halfAmount,
			TotalEarned:      booking.TotalPrice,
			UpdatedAt:        time.Now(),
		}
		database.DB.Create(&balance)
	} else {
		// Check if finance was already recorded for this booking to prevent double-counting
		var existingSettlement models.HeldSettlement
		if errS := database.DB.Where("booking_id = ?", booking.ID).First(&existingSettlement).Error; errS != nil {
			balance.AvailableBalance += halfAmount
			balance.HeldBalance += halfAmount
			balance.TotalEarned += booking.TotalPrice
			balance.UpdatedAt = time.Now()
			database.DB.Save(&balance)
		}
	}

	// 2. Create HeldSettlement record
	var existingSettlement models.HeldSettlement
	err = database.DB.Where("booking_id = ?", booking.ID).First(&existingSettlement).Error
	if err != nil {
		settlement := models.HeldSettlement{
			BookingID:   booking.ID,
			ProviderID:  booking.ProviderID,
			Amount:      halfAmount,
			Status:      "HELD",
			ReleaseDate: booking.TripDate.AddDate(0, 0, 1),
			CreatedAt:   time.Now(),
		}
		database.DB.Create(&settlement)
	}
}

func (s *bookingService) adjustQuota(booking *models.Booking, oldStatus, newStatus string, providerID uint) {
	if database.DB == nil || booking == nil {
		return
	}
	// Recalculate package quota_used dynamically from active bookings
	_ = database.DB.Exec(`
		UPDATE packages p
		SET quota_used = COALESCE((
			SELECT SUM(b.guests)
			FROM bookings b
			WHERE b.package_id = p.id
			AND b.status IN ('PENDING_PAYMENT', 'WAITING_CONFIRMATION', 'PAID', 'CONFIRMED', 'COMPLETED')
		), 0)
		WHERE p.id = ?
	`, booking.PackageID).Error

	// Check if package quota_used >= quota_min to promote PAID -> CONFIRMED and release DP 50%
	var pkg models.Package
	if err := database.DB.First(&pkg, booking.PackageID).Error; err == nil {
		if pkg.QuotaUsed >= pkg.QuotaMin && pkg.QuotaMin > 0 {
			// Auto-confirm bookings and release DP 50%
			var paidBookings []models.Booking
			database.DB.Where("package_id = ? AND status = ?", pkg.ID, "PAID").Find(&paidBookings)
			for _, b := range paidBookings {
				database.DB.Model(&models.Booking{}).Where("id = ?", b.ID).Update("status", "CONFIRMED")
				
				// Release DP 50% settlement if held
				var settlement models.HeldSettlement
				if errS := database.DB.Where("booking_id = ? AND status = ?", b.ID, "HELD").First(&settlement).Error; errS == nil {
					settlement.Status = "RELEASED"
					database.DB.Save(&settlement)
					database.DB.Exec("UPDATE provider_balances SET available_balance = available_balance + ?, held_balance = GREATEST(held_balance - ?, 0) WHERE provider_id = ?", settlement.Amount, settlement.Amount, b.ProviderID)
				}
			}
		}
	}
}

func (s *bookingService) UploadPaymentProof(id uint, proofPath string) (*models.Booking, error) {
	booking, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	oldStatus := booking.Status
	booking.PaymentProof = proofPath
	booking.Status = "CONFIRMED"
	err = s.repo.Update(booking)
	if err != nil {
		return nil, err
	}
	s.recordFinanceOnPayment(booking)
	s.adjustQuota(booking, oldStatus, "CONFIRMED", booking.ProviderID)
	return booking, nil
}

func (s *bookingService) AdminGetAllBookings() ([]models.Booking, error) {
	return s.repo.FindAll()
}

func (s *bookingService) AdminConfirmPayment(id uint) (*models.Booking, error) {
	booking, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	oldStatus := booking.Status
	booking.Status = "CONFIRMED"
	booking.PaymentMethod = "Manual Transfer"
	err = s.repo.Update(booking)
	if err != nil {
		return nil, err
	}
	s.recordFinanceOnPayment(booking)
	s.adjustQuota(booking, oldStatus, "CONFIRMED", booking.ProviderID)
	return booking, nil
}

func (s *bookingService) PublicUpdateStatus(id uint, status string) (*models.Booking, error) {
	booking, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	oldStatus := booking.Status
	booking.Status = status
	if err := s.repo.Update(booking); err != nil {
		return nil, err
	}
	if status == "PAID" || status == "CONFIRMED" {
		s.recordFinanceOnPayment(booking)
	}
	s.adjustQuota(booking, oldStatus, status, booking.ProviderID)
	s.sendNotificationsAndEmails(booking, oldStatus, status)
	return booking, nil
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

		switch newS {
		case "PAID", "CONFIRMED":
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
			title = "Pengembalian Dana (Refund)"
			msgCustomer = fmt.Sprintf("Pengembalian dana untuk pesanan #%s (%s) telah diproses.", b.BookingCode, packageName)
			msgProvider = fmt.Sprintf("Status refund untuk pesanan #%s (%s) telah diperbarui.", b.BookingCode, packageName)

			if s.emailService != nil {
				_ = s.emailService.SendRefundEmail(&b)
			}

		case "RESCHEDULE_OFFERED", "RESCHEDULED":
			title = "Perubahan Jadwal Trip (Reschedule)"
			msgCustomer = fmt.Sprintf("Jadwal trip untuk pesanan #%s (%s) telah berhasil diperbarui.", b.BookingCode, packageName)
			msgProvider = fmt.Sprintf("Pesanan #%s (%s) telah dilakukan penjadwalan ulang.", b.BookingCode, packageName)

			if s.emailService != nil {
				_ = s.emailService.SendRescheduleEmail(&b)
			}
		}

		// Save in-app notification for Customer if CustomerID is set
		if b.CustomerID != nil && *b.CustomerID > 0 && s.notifService != nil && title != "" {
			_ = s.notifService.CreateNotification(*b.CustomerID, "CUSTOMER", title, msgCustomer, newS, "/riwayat-booking")
		}

		// Save in-app notification for Provider
		if b.ProviderID > 0 && s.notifService != nil && title != "" {
			_ = s.notifService.CreateNotification(b.ProviderID, "PROVIDER", title, msgProvider, newS, "/booking")
		}
	}(*booking, oldStatus, newStatus)
}

