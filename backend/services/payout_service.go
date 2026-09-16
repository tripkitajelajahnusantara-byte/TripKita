package services

import (
	"errors"
	"fmt"
	"time"
	"tripkita-provider/database"
	"tripkita-provider/models"
	"tripkita-provider/repositories"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PayoutService interface {
	RequestPayout(providerID uint, req *models.CreatePayoutRequest) (*models.Payout, error)
	GetProviderPayoutSummary(providerID uint) (*models.PayoutSummary, error)
	GetAllPayouts() ([]models.Payout, error)
	ProcessPayout(payoutID uint, status string, notes string, proofPath string) (*models.Payout, error)
}

type payoutService struct {
	payoutRepo   repositories.PayoutRepository
	providerRepo repositories.ProviderRepository
	bookingRepo  repositories.BookingRepository
	emailService *EmailService
	notifService *NotificationService
}

func NewPayoutService(payoutRepo repositories.PayoutRepository, providerRepo repositories.ProviderRepository, bookingRepo repositories.BookingRepository, emailService *EmailService, notifService *NotificationService) PayoutService {
	return &payoutService{
		payoutRepo:   payoutRepo,
		providerRepo: providerRepo,
		bookingRepo:  bookingRepo,
		emailService: emailService,
		notifService: notifService,
	}
}

func (s *payoutService) RequestPayout(providerID uint, req *models.CreatePayoutRequest) (*models.Payout, error) {
	provider, err := s.providerRepo.FindByID(providerID)
	if err != nil {
		return nil, errors.New("provider not found")
	}

	if req.Amount <= 0 {
		return nil, errors.New("nominal pencairan harus lebih dari 0")
	}
	if req.Type != "DP_50" && req.Type != "PELUNASAN_50" {
		return nil, errors.New("jenis pencairan tidak valid")
	}

	// Validate bank details exist
	bankName := provider.BankName
	bankAccount := provider.BankAccount
	bankAccountName := provider.BankAccountName

	if bankName == "" || bankAccount == "" || bankAccountName == "" {
		return nil, errors.New("rekening bank tujuan belum diatur. Silakan atur informasi bank di menu Profil Provider terlebih dahulu")
	}

	payout := &models.Payout{
		ProviderID:      providerID,
		BookingID:       req.BookingID,
		Amount:          req.Amount,
		Type:            req.Type,
		Status:          "PENDING",
		BankName:        bankName,
		BankAccount:     bankAccount,
		BankAccountName: bankAccountName,
		Notes:           "Pengajuan pencairan dana oleh provider",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(providerID)+1_000_000_000).Error; err != nil {
			return err
		}
		lockedSummary, err := s.GetProviderPayoutSummary(providerID)
		if err != nil {
			return err
		}
		if req.Type == "PELUNASAN_50" && req.Amount > lockedSummary.AvailablePelunasan {
			return errors.New("pencairan pelunasan belum tersedia atau saldo tidak mencukupi")
		}
		if req.Type == "DP_50" && req.Amount > lockedSummary.AvailableDP {
			return errors.New("saldo DP belum mencukupi untuk dicairkan")
		}
		if req.BookingID != nil {
			var count int64
			if err := tx.Model(&models.Booking{}).Where("id = ? AND provider_id = ?", *req.BookingID, providerID).Count(&count).Error; err != nil || count != 1 {
				return fmt.Errorf("booking payout tidak valid")
			}
		}
		return tx.Create(payout).Error
	})
	if err != nil {
		return nil, err
	}

	return payout, nil
}

func (s *payoutService) GetProviderPayoutSummary(providerID uint) (*models.PayoutSummary, error) {
	bookings, err := s.bookingRepo.FindAllByProvider(providerID)
	if err != nil {
		return nil, err
	}
	payouts, err := s.payoutRepo.GetByProviderID(providerID)
	if err != nil {
		return nil, err
	}

	var grossOmset int64
	var totalPlatformFee int64
	var totalNetEarnings int64
	var dpEligible int64
	var pelunasanEligible int64
	var heldSettlement int64

	now := time.Now()

	for _, b := range bookings {
		if b.Status == "CONFIRMED" || b.Status == "PAID" || b.Status == "COMPLETED" {
			totalCustomerPaid := b.TotalPrice
			adminFee := int64(5000)
			if totalCustomerPaid < adminFee {
				adminFee = 0
			}

			packageGross := totalCustomerPaid - adminFee
			platformFee := packageGross*15/100 + adminFee
			netProviderEarning := packageGross * 85 / 100

			grossOmset += totalCustomerPaid
			totalPlatformFee += platformFee
			totalNetEarnings += netProviderEarning

			dpAmount := netProviderEarning / 2
			settlementAmount := netProviderEarning - dpAmount
			dpEligible += dpAmount

			// Check if trip is finished (either status is COMPLETED or tripDate has passed by 24 hours)
			isFinished := b.Status == "COMPLETED" || (!b.TripDate.IsZero() && now.After(b.TripDate.Add(24*time.Hour)))
			if isFinished {
				pelunasanEligible += settlementAmount
			} else {
				heldSettlement += settlementAmount
			}
		}
	}

	var dpPaidOut int64
	var pelunasanPaidOut int64
	var totalPaidOut int64
	var pendingPayout int64

	for _, p := range payouts {
		if p.Status == "APPROVED" {
			totalPaidOut += p.Amount
			if p.Type == "DP_50" {
				dpPaidOut += p.Amount
			} else {
				pelunasanPaidOut += p.Amount
			}
		} else if p.Status == "PENDING" {
			pendingPayout += p.Amount
			if p.Type == "DP_50" {
				dpPaidOut += p.Amount
			} else {
				pelunasanPaidOut += p.Amount
			}
		}
	}

	availableDP := dpEligible - dpPaidOut
	if availableDP < 0 {
		availableDP = 0
	}

	availablePelunasan := pelunasanEligible - pelunasanPaidOut
	if availablePelunasan < 0 {
		availablePelunasan = 0
	}

	return &models.PayoutSummary{
		TotalEarnings:      grossOmset,
		PlatformFee:        totalPlatformFee,
		NetEarnings:        totalNetEarnings,
		AvailableDP:        availableDP,
		AvailablePelunasan: availablePelunasan,
		HeldSettlement:     heldSettlement,
		TotalPaidOut:       totalPaidOut,
		PendingPayout:      pendingPayout,
		Payouts:            payouts,
	}, nil
}

func (s *payoutService) GetAllPayouts() ([]models.Payout, error) {
	return s.payoutRepo.GetAll()
}

func (s *payoutService) ProcessPayout(payoutID uint, status string, notes string, proofPath string) (*models.Payout, error) {
	var payout models.Payout
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&payout, payoutID).Error; err != nil {
			return errors.New("payout request not found")
		}
		if payout.Status != "PENDING" {
			return errors.New("payout sudah diproses dan tidak dapat diubah kembali")
		}
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(payout.ProviderID)+1_000_000_000).Error; err != nil {
			return err
		}

		if status == "APPROVED" {
			available, err := availablePayoutAmountTx(tx, &payout)
			if err != nil {
				return err
			}
			if payout.Amount > available {
				return errors.New("saldo payout berubah dan tidak lagi mencukupi; tolak pengajuan ini lalu minta provider mengajukan ulang")
			}
		}

		updates := map[string]interface{}{
			"status":     status,
			"notes":      notes,
			"updated_at": time.Now(),
		}
		if proofPath != "" {
			updates["proof_path"] = proofPath
		}
		return tx.Model(&payout).Updates(updates).Error
	})
	if err != nil {
		return nil, err
	}
	return s.payoutRepo.GetByID(payoutID)
}

func availablePayoutAmountTx(tx *gorm.DB, current *models.Payout) (int64, error) {
	var bookings []models.Booking
	if err := tx.Where("provider_id = ? AND status IN ?", current.ProviderID, []string{"PAID", "CONFIRMED", "COMPLETED"}).Find(&bookings).Error; err != nil {
		return 0, err
	}

	var eligible int64
	now := time.Now()
	for _, booking := range bookings {
		adminFee := int64(5000)
		if booking.TotalPrice < adminFee {
			adminFee = 0
		}
		providerNet := (booking.TotalPrice - adminFee) * 85 / 100
		dpAmount := providerNet / 2
		if current.Type == "DP_50" {
			eligible += dpAmount
		} else if booking.Status == "COMPLETED" || (!booking.TripDate.IsZero() && now.After(booking.TripDate.Add(24*time.Hour))) {
			eligible += providerNet - dpAmount
		}
	}

	var reserved int64
	if err := tx.Model(&models.Payout{}).
		Where("provider_id = ? AND type = ? AND id <> ? AND status IN ?", current.ProviderID, current.Type, current.ID, []string{"PENDING", "APPROVED"}).
		Select("COALESCE(SUM(amount), 0)").Scan(&reserved).Error; err != nil {
		return 0, err
	}
	available := eligible - reserved
	if available < 0 {
		return 0, nil
	}
	return available, nil
}
