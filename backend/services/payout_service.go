package services

import (
	"errors"
	"time"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
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
}

func NewPayoutService(payoutRepo repositories.PayoutRepository, providerRepo repositories.ProviderRepository, bookingRepo repositories.BookingRepository) PayoutService {
	return &payoutService{
		payoutRepo:   payoutRepo,
		providerRepo: providerRepo,
		bookingRepo:  bookingRepo,
	}
}

func (s *payoutService) RequestPayout(providerID uint, req *models.CreatePayoutRequest) (*models.Payout, error) {
	provider, err := s.providerRepo.FindByID(providerID)
	if err != nil {
		return nil, errors.New("provider not found")
	}

	// Validate bank details exist
	bankName := provider.BankName
	bankAccount := provider.BankAccount
	bankAccountName := provider.BankAccountName

	if bankName == "" || bankAccount == "" {
		// Fallback to defaults if empty
		bankName = "Bank BCA"
		bankAccount = "1234567890"
		bankAccountName = provider.PicName
	}

	if req.Amount <= 0 {
		return nil, errors.New("nominal pencairan harus lebih dari 0")
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

	err = s.payoutRepo.Create(payout)
	if err != nil {
		return nil, err
	}

	return payout, nil
}

func (s *payoutService) GetProviderPayoutSummary(providerID uint) (*models.PayoutSummary, error) {
	bookings, _ := s.bookingRepo.FindAllByProvider(providerID)
	payouts, _ := s.payoutRepo.GetByProviderID(providerID)

	var totalEarnings float64 = 0
	var dpEligible float64 = 0
	var pelunasanEligible float64 = 0
	var heldSettlement float64 = 0

	now := time.Now()

	for _, b := range bookings {
		if b.Status == "CONFIRMED" || b.Status == "PAID" || b.Status == "COMPLETED" {
			grossPackagePrice := float64(b.TotalPrice)
			totalEarnings += grossPackagePrice

			halfAmount := grossPackagePrice * 0.5
			dpEligible += halfAmount

			// Check if trip is finished (either status is COMPLETED or tripDate has passed/arrived)
			isFinished := b.Status == "COMPLETED" || (!b.TripDate.IsZero() && (now.After(b.TripDate) || now.Equal(b.TripDate)))
			if isFinished {
				pelunasanEligible += halfAmount
			} else {
				heldSettlement += halfAmount
			}
		}
	}

	var dpPaidOut float64 = 0
	var pelunasanPaidOut float64 = 0
	var totalPaidOut float64 = 0
	var pendingPayout float64 = 0

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

	netEarnings := totalEarnings // 100% net package revenue for provider
	platformFee := 0.0           // Customer service fee (Rp 4.000) is paid by customer and excluded from provider

	availableDP := dpEligible - dpPaidOut
	if availableDP < 0 {
		availableDP = 0
	}

	availablePelunasan := pelunasanEligible - pelunasanPaidOut
	if availablePelunasan < 0 {
		availablePelunasan = 0
	}

	return &models.PayoutSummary{
		TotalEarnings:      totalEarnings,
		PlatformFee:        platformFee,
		NetEarnings:        netEarnings,
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
	return s.payoutRepo.UpdateStatus(payoutID, status, notes, proofPath)
}
