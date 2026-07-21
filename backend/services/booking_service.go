package services

import (
	"fmt"
	"math/rand"
	"time"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type BookingService interface {
	GetAllBookings(providerID uint) ([]models.Booking, error)
	UpdateBookingStatus(id uint, providerID uint, status string) (*models.Booking, error)
	CreateBooking(booking *models.Booking) error
	UpdateStatusByWebhook(invoiceID string, xenditStatus string, paymentMethod string) error
	GetRefunds() ([]models.Booking, error)
	CompleteRefund(id uint) error
	GetBookingByID(id uint) (*models.Booking, error)
}

type bookingService struct {
	repo          repositories.BookingRepository
	packageRepo   repositories.PackageRepository
	xenditService XenditService
}

func NewBookingService(repo repositories.BookingRepository, packageRepo repositories.PackageRepository, xenditService XenditService) BookingService {
	return &bookingService{
		repo:          repo,
		packageRepo:   packageRepo,
		xenditService: xenditService,
	}
}

func (s *bookingService) GetAllBookings(providerID uint) ([]models.Booking, error) {
	return s.repo.FindAllByProvider(providerID)
}

func (s *bookingService) GetBookingByID(id uint) (*models.Booking, error) {
	return s.repo.FindByID(id)
}

func (s *bookingService) UpdateBookingStatus(id uint, providerID uint, status string) (*models.Booking, error) {
	booking, err := s.repo.FindByIDAndProvider(id, providerID)
	if err != nil {
		return nil, err
	}

	oldStatus := booking.Status
	booking.Status = status

	// If customer or provider cancels a paid/confirmed booking, it moves to REFUND_REQUIRED
	if (status == "CANCELLED_BY_CUSTOMER" || status == "CANCELLED_BY_PROVIDER" || status == "REFUND_REQUIRED") && 
		(oldStatus == "PAID" || oldStatus == "CONFIRMED" || oldStatus == "COMPLETED") {
		booking.Status = "REFUND_REQUIRED"
	}

	err = s.repo.Update(booking)
	if err != nil {
		return nil, err
	}

	// Adjust package quota
	s.adjustQuota(booking, oldStatus, booking.Status, providerID)

	return booking, nil
}

func (s *bookingService) CreateBooking(booking *models.Booking) error {
	pkg, err := s.packageRepo.FindByID(booking.PackageID)
	if err != nil {
		return fmt.Errorf("paket tidak ditemukan")
	}

	// Validate quota
	if pkg.QuotaUsed+booking.Guests > pkg.QuotaMax {
		return fmt.Errorf("kuota paket tidak mencukupi")
	}

	booking.ProviderID = pkg.ProviderID
	booking.TotalPrice = int64(booking.Guests) * pkg.Price
	booking.Status = "PENDING_PAYMENT"
	
	// Create BookingCode
	randSource := rand.NewSource(time.Now().UnixNano())
	r := rand.New(randSource)
	booking.BookingCode = fmt.Sprintf("TK-%d-%d", time.Now().Unix()%100000, r.Intn(10000))

	// Create Xendit Invoice
	invoiceID, paymentURL, err := s.xenditService.CreateInvoice(booking, pkg.Name)
	if err != nil {
		return err
	}

	booking.XenditInvoiceID = invoiceID
	booking.PaymentURL = paymentURL

	return s.repo.Create(booking)
}

func (s *bookingService) GetRefunds() ([]models.Booking, error) {
	return s.repo.FindAllRefunds()
}

func (s *bookingService) CompleteRefund(id uint) error {
	booking, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	booking.Status = "REFUNDED"
	return s.repo.Update(booking)
}

func (s *bookingService) UpdateStatusByWebhook(invoiceID string, xenditStatus string, paymentMethod string) error {
	booking, err := s.repo.FindByXenditInvoiceID(invoiceID)
	if err != nil {
		return err
	}

	oldStatus := booking.Status
	var newStatus string

	switch xenditStatus {
	case "PAID":
		newStatus = "PAID"
		booking.PaymentMethod = paymentMethod
	case "EXPIRED", "FAILED":
		if oldStatus == "PAID" || oldStatus == "CONFIRMED" || oldStatus == "COMPLETED" {
			newStatus = "REFUND_REQUIRED"
		} else {
			newStatus = "CANCELLED_BY_CUSTOMER"
		}
	default:
		return nil // No changes
	}

	booking.Status = newStatus
	err = s.repo.Update(booking)
	if err != nil {
		return err
	}

	// Adjust package quota
	s.adjustQuota(booking, oldStatus, newStatus, booking.ProviderID)

	return nil
}

func (s *bookingService) adjustQuota(booking *models.Booking, oldStatus, newStatus string, providerID uint) {
	isActive := func(status string) bool {
		return status == "PAID" || status == "CONFIRMED" || status == "COMPLETED"
	}

	oldActive := isActive(oldStatus)
	newActive := isActive(newStatus)

	if !oldActive && newActive {
		pkg, err := s.packageRepo.FindByIDAndProvider(booking.PackageID, providerID)
		if err == nil {
			pkg.QuotaUsed += booking.Guests
			_ = s.packageRepo.Update(pkg)
		}
	} else if oldActive && !newActive {
		pkg, err := s.packageRepo.FindByIDAndProvider(booking.PackageID, providerID)
		if err == nil {
			pkg.QuotaUsed -= booking.Guests
			if pkg.QuotaUsed < 0 {
				pkg.QuotaUsed = 0
			}
			_ = s.packageRepo.Update(pkg)
		}
	}
}
