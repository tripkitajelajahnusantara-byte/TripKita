package repositories

import (
	"errors"

	"gorm.io/gorm"

	"tripkita-provider/models"
)

type TripPlanRepository interface {
	ListByCustomer(customerID uint) ([]models.TripPlan, error)
	FindOwned(id, customerID uint) (*models.TripPlan, error)
	CountByCustomer(customerID uint) (int64, error)
	Create(plan *models.TripPlan) error
	Update(plan *models.TripPlan) error
	DeleteOwned(id, customerID uint) error
}

type tripPlanRepository struct{ db *gorm.DB }

func NewTripPlanRepository(db *gorm.DB) TripPlanRepository {
	return &tripPlanRepository{db: db}
}

func (r *tripPlanRepository) ListByCustomer(customerID uint) ([]models.TripPlan, error) {
	var plans []models.TripPlan
	err := r.db.Where("customer_id = ?", customerID).Order("updated_at DESC").Find(&plans).Error
	return plans, err
}

func (r *tripPlanRepository) FindOwned(id, customerID uint) (*models.TripPlan, error) {
	var plan models.TripPlan
	if err := r.db.Where("id = ? AND customer_id = ?", id, customerID).First(&plan).Error; err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *tripPlanRepository) CountByCustomer(customerID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.TripPlan{}).Where("customer_id = ?", customerID).Count(&count).Error
	return count, err
}

func (r *tripPlanRepository) Create(plan *models.TripPlan) error { return r.db.Create(plan).Error }

func (r *tripPlanRepository) Update(plan *models.TripPlan) error { return r.db.Save(plan).Error }

func (r *tripPlanRepository) DeleteOwned(id, customerID uint) error {
	result := r.db.Where("id = ? AND customer_id = ?", id, customerID).Delete(&models.TripPlan{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return errors.New("rencana trip tidak ditemukan")
	}
	return nil
}
