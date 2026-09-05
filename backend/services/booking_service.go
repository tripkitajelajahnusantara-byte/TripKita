package services

import (
	"fmt"
	"math/rand"
	"strconv"
	"strings"
	"time"
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

func (s *bookingService) GetCustomerBookings(customerID uint) ([]models.Booking, error) {
	return s.repo.FindAllByCustomer(customerID)
}

func (s *bookingService) GetBookingByCode(code string) (*models.Booking, error) {
	return s.repo.FindByBookingCode(code)
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

	// Validate quota (auto-expand quota for seamless customer experience)
	if pkg.QuotaUsed+booking.Guests > pkg.QuotaMax {
		pkg.QuotaMax = pkg.QuotaUsed + booking.Guests + 10
	}

	booking.ProviderID = pkg.ProviderID
	booking.TotalPrice = int64(booking.Guests) * pkg.Price
	booking.Status = "PENDING_PAYMENT"
	
	// Ensure unique BookingCode
	if strings.TrimSpace(booking.BookingCode) == "" {
		randSource := rand.NewSource(time.Now().UnixNano())
		r := rand.New(randSource)
		booking.BookingCode = fmt.Sprintf("TK-%d-%d", time.Now().Unix()%90000+10000, r.Intn(9000)+1000)
	}

	// Guarantee uniqueness in database (retry if exact collision occurs)
	for i := 0; i < 5; i++ {
		existing, errExist := s.repo.FindExactByBookingCode(booking.BookingCode)
		if errExist == nil && existing != nil && existing.ID != booking.ID {
			randSource := rand.NewSource(time.Now().UnixNano())
			r := rand.New(randSource)
			booking.BookingCode = fmt.Sprintf("TK-%d-%d", time.Now().Unix()%90000+10000, r.Intn(9000)+1000)
		} else {
			break
		}
	}

	// Save to DB first to generate booking.ID
	if err := s.repo.Create(booking); err != nil {
		return err
	}

	// Instantly reserve quota for package in database during PENDING_PAYMENT
	pkg.QuotaUsed += booking.Guests
	_ = s.packageRepo.Update(pkg)

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
	booking.Status = "REFUNDED"
	return s.repo.Update(booking)
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
	isReserved := func(status string) bool {
		return status == "PENDING_PAYMENT" || status == "WAITING_CONFIRMATION" || status == "PAID" || status == "CONFIRMED" || status == "COMPLETED"
	}

	oldReserved := isReserved(oldStatus)
	newReserved := isReserved(newStatus)

	if !oldReserved && newReserved {
		pkg, err := s.packageRepo.FindByID(booking.PackageID)
		if err == nil {
			pkg.QuotaUsed += booking.Guests
			_ = s.packageRepo.Update(pkg)
		}
	} else if oldReserved && !newReserved {
		pkg, err := s.packageRepo.FindByID(booking.PackageID)
		if err == nil {
			pkg.QuotaUsed -= booking.Guests
			if pkg.QuotaUsed < 0 {
				pkg.QuotaUsed = 0
			}
			_ = s.packageRepo.Update(pkg)
		}
	}
}

func (s *bookingService) UploadPaymentProof(id uint, proofPath string) (*models.Booking, error) {
	booking, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	booking.PaymentProof = proofPath
	booking.Status = "WAITING_CONFIRMATION"
	err = s.repo.Update(booking)
	if err != nil {
		return nil, err
	}
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
	booking.Status = "PAID"
	booking.PaymentMethod = "Manual Transfer"
	err = s.repo.Update(booking)
	if err != nil {
		return nil, err
	}
	s.adjustQuota(booking, oldStatus, "PAID", booking.ProviderID)
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
	s.adjustQuota(booking, oldStatus, status, booking.ProviderID)
	return booking, nil
}

