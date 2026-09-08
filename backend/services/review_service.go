package services

import (
	"errors"

	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type ReviewService interface {
	CreateReview(customerID uint, req *models.CreateReviewRequest) (*models.Review, error)
	GetReviewByBookingID(bookingID uint) (*models.Review, error)
	GetReviewsByPackageID(packageID uint) ([]models.Review, error)
}

type reviewService struct {
	reviewRepo  repositories.ReviewRepository
	bookingRepo repositories.BookingRepository
	packageRepo repositories.PackageRepository
}

func NewReviewService(reviewRepo repositories.ReviewRepository, bookingRepo repositories.BookingRepository, packageRepo repositories.PackageRepository) ReviewService {
	return &reviewService{
		reviewRepo:  reviewRepo,
		bookingRepo: bookingRepo,
		packageRepo: packageRepo,
	}
}

func (s *reviewService) CreateReview(customerID uint, req *models.CreateReviewRequest) (*models.Review, error) {
	booking, err := s.bookingRepo.FindByID(req.BookingID)
	if err != nil || booking == nil {
		return nil, errors.New("booking tidak ditemukan")
	}

	// Validate ownership
	if booking.CustomerID != nil && *booking.CustomerID != customerID {
		return nil, errors.New("anda tidak memiliki akses ke pesanan ini")
	}

	// Check if already reviewed
	existing, _ := s.reviewRepo.FindByBookingID(req.BookingID)
	if existing != nil {
		return nil, errors.New("ulasan untuk pesanan ini sudah pernah dikirim")
	}

	review := &models.Review{
		BookingID:  req.BookingID,
		CustomerID: customerID,
		PackageID:  booking.PackageID,
		Rating:     req.Rating,
		Comment:    req.Comment,
	}

	if err := s.reviewRepo.Create(review); err != nil {
		return nil, err
	}

	// Update average rating of the package
	if avgRating, errAvg := s.reviewRepo.GetAverageRating(booking.PackageID); errAvg == nil {
		if pkg, errPkg := s.packageRepo.FindByID(booking.PackageID); errPkg == nil {
			pkg.Rating = avgRating
			_ = s.packageRepo.Update(pkg)
		}
	}

	return review, nil
}

func (s *reviewService) GetReviewByBookingID(bookingID uint) (*models.Review, error) {
	return s.reviewRepo.FindByBookingID(bookingID)
}

func (s *reviewService) GetReviewsByPackageID(packageID uint) ([]models.Review, error) {
	return s.reviewRepo.FindByPackageID(packageID)
}
