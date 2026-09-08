package repositories

import (
	"gorm.io/gorm"
	"tripkita-provider/models"
)

type ReviewRepository interface {
	Create(review *models.Review) error
	FindByBookingID(bookingID uint) (*models.Review, error)
	FindByPackageID(packageID uint) ([]models.Review, error)
	GetAverageRating(packageID uint) (float64, error)
}

type reviewRepository struct {
	db *gorm.DB
}

func NewReviewRepository(db *gorm.DB) ReviewRepository {
	return &reviewRepository{db: db}
}

func (r *reviewRepository) Create(review *models.Review) error {
	return r.db.Create(review).Error
}

func (r *reviewRepository) FindByBookingID(bookingID uint) (*models.Review, error) {
	var review models.Review
	err := r.db.Where("booking_id = ?", bookingID).First(&review).Error
	if err != nil {
		return nil, err
	}
	return &review, nil
}

func (r *reviewRepository) FindByPackageID(packageID uint) ([]models.Review, error) {
	var reviews []models.Review
	err := r.db.Where("package_id = ?", packageID).Order("created_at desc").Find(&reviews).Error
	return reviews, err
}

func (r *reviewRepository) GetAverageRating(packageID uint) (float64, error) {
	var avgRating float64
	err := r.db.Model(&models.Review{}).Where("package_id = ?", packageID).Select("COALESCE(AVG(rating), 0)").Scan(&avgRating).Error
	return avgRating, err
}
