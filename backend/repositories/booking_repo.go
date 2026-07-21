package repositories

import (
	"gorm.io/gorm"

	"tripkita-provider/models"
)

type BookingRepository interface {
	Create(booking *models.Booking) error
	FindAllByProvider(providerID uint) ([]models.Booking, error)
	FindByIDAndProvider(id uint, providerID uint) (*models.Booking, error)
	FindByID(id uint) (*models.Booking, error)
	FindByXenditInvoiceID(invoiceID string) (*models.Booking, error)
	FindAllRefunds() ([]models.Booking, error)
	Update(booking *models.Booking) error
	CountByProvider(providerID uint) (int64, error)
	CountByStatusAndProvider(status string, providerID uint) (int64, error)
	SumRevenueByProvider(providerID uint) (int64, error)
}

type bookingRepository struct {
	db *gorm.DB
}

func NewBookingRepository(db *gorm.DB) BookingRepository {
	return &bookingRepository{db: db}
}

func (r *bookingRepository) Create(booking *models.Booking) error {
	return r.db.Create(booking).Error
}

func (r *bookingRepository) FindAllByProvider(providerID uint) ([]models.Booking, error) {
	var bookings []models.Booking
	err := r.db.Preload("Package", func(db *gorm.DB) *gorm.DB { return db.Unscoped() }).Where("provider_id = ?", providerID).Order("id desc").Find(&bookings).Error
	return bookings, err
}

func (r *bookingRepository) FindByIDAndProvider(id uint, providerID uint) (*models.Booking, error) {
	var booking models.Booking
	err := r.db.Preload("Package", func(db *gorm.DB) *gorm.DB { return db.Unscoped() }).Where("id = ? AND provider_id = ?", id, providerID).First(&booking).Error
	if err != nil {
		return nil, err
	}
	return &booking, nil
}

func (r *bookingRepository) FindByID(id uint) (*models.Booking, error) {
	var booking models.Booking
	err := r.db.Preload("Package", func(db *gorm.DB) *gorm.DB { return db.Unscoped() }).Where("id = ?", id).First(&booking).Error
	if err != nil {
		return nil, err
	}
	return &booking, nil
}

func (r *bookingRepository) FindByXenditInvoiceID(invoiceID string) (*models.Booking, error) {
	var booking models.Booking
	err := r.db.Preload("Package", func(db *gorm.DB) *gorm.DB { return db.Unscoped() }).Where("xendit_invoice_id = ?", invoiceID).First(&booking).Error
	if err != nil {
		return nil, err
	}
	return &booking, nil
}

func (r *bookingRepository) FindAllRefunds() ([]models.Booking, error) {
	var bookings []models.Booking
	err := r.db.Preload("Package", func(db *gorm.DB) *gorm.DB { return db.Unscoped() }).Where("status = ? OR status = ?", "REFUND_REQUIRED", "REFUNDED").Order("updated_at desc").Find(&bookings).Error
	return bookings, err
}

func (r *bookingRepository) Update(booking *models.Booking) error {
	return r.db.Save(booking).Error
}

func (r *bookingRepository) CountByProvider(providerID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Booking{}).Where("provider_id = ?", providerID).Count(&count).Error
	return count, err
}

func (r *bookingRepository) CountByStatusAndProvider(status string, providerID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Booking{}).Where("provider_id = ? AND status = ?", providerID, status).Count(&count).Error
	return count, err
}

func (r *bookingRepository) SumRevenueByProvider(providerID uint) (int64, error) {
	var total int64
	// Sum of TotalPrice for paid or completed bookings
	err := r.db.Model(&models.Booking{}).
		Where("provider_id = ? AND (status = ? OR status = ? OR status = ?)", providerID, "PAID", "CONFIRMED", "COMPLETED").
		Select("COALESCE(SUM(total_price), 0)").
		Scan(&total).Error
	return total, err
}
