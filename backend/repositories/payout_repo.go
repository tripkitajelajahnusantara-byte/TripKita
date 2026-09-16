package repositories

import (
	"errors"
	"gorm.io/gorm"
	"tripkita-provider/models"
)

type PayoutRepository interface {
	Create(payout *models.Payout) error
	GetByProviderID(providerID uint) ([]models.Payout, error)
	GetAll() ([]models.Payout, error)
	GetByID(id uint) (*models.Payout, error)
}

type payoutRepository struct {
	db *gorm.DB
}

func NewPayoutRepository(db *gorm.DB) PayoutRepository {
	return &payoutRepository{db: db}
}

func (r *payoutRepository) Create(payout *models.Payout) error {
	return r.db.Create(payout).Error
}

func (r *payoutRepository) GetByProviderID(providerID uint) ([]models.Payout, error) {
	var payouts []models.Payout
	err := r.db.Where("provider_id = ?", providerID).Order("id desc").Find(&payouts).Error
	return payouts, err
}

func (r *payoutRepository) GetAll() ([]models.Payout, error) {
	var payouts []models.Payout
	err := r.db.Preload("Provider").Order("id desc").Find(&payouts).Error
	return payouts, err
}

func (r *payoutRepository) GetByID(id uint) (*models.Payout, error) {
	var payout models.Payout
	err := r.db.Preload("Provider").First(&payout, id).Error
	if err != nil {
		return nil, errors.New("payout request not found")
	}
	return &payout, nil
}
