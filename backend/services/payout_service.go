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
		bankName = "Bank OCBC / BCA"
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
	for _, b := range bookings {
		if b.Status == "CONFIRMED" || b.Status == "PAID" || b.Status == "COMPLETED" {
			totalEarnings += float64(b.TotalPrice)
		}
	}

	var totalPaidOut float64 = 0
	var pendingPayout float64 = 0

	for _, p := range payouts {
		if p.Status == "APPROVED" {
			totalPaidOut += p.Amount
		} else if p.Status == "PENDING" {
			pendingPayout += p.Amount
		}
	}

	platformFee := totalEarnings * 0.14
	netEarnings := totalEarnings * 0.86

	// Available DP is 50% of provider net earnings (86%) minus already requested/paid DP
	availableDP := (netEarnings * 0.5) - totalPaidOut - pendingPayout
	if availableDP < 0 {
		availableDP = 0
	}

	// Held settlement is remaining 50% of provider net earnings
	heldSettlement := (netEarnings * 0.5)

	return &models.PayoutSummary{
		TotalEarnings:  totalEarnings,
		PlatformFee:    platformFee,
		NetEarnings:    netEarnings,
		AvailableDP:    availableDP,
		HeldSettlement: heldSettlement,
		TotalPaidOut:   totalPaidOut,
		PendingPayout:  pendingPayout,
		Payouts:        payouts,
	}, nil
}

func (s *payoutService) GetAllPayouts() ([]models.Payout, error) {
	return s.payoutRepo.GetAll()
}

func (s *payoutService) ProcessPayout(payoutID uint, status string, notes string, proofPath string) (*models.Payout, error) {
	return s.payoutRepo.UpdateStatus(payoutID, status, notes, proofPath)
}
