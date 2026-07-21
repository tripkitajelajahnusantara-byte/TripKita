package repositories

import (
	"gorm.io/gorm"

	"tripkita-provider/models"
)

type ProviderRepository interface {
	Create(provider *models.Provider) error
	FindByEmail(email string) (*models.Provider, error)
	FindByID(id uint) (*models.Provider, error)
	Update(provider *models.Provider) error
	FindAllProviders() ([]models.Provider, error)
	Delete(id uint) error
	GetStatusHistory(providerID uint) ([]models.ProviderStatusHistory, error)
	CreateStatusHistory(history *models.ProviderStatusHistory) error
}

type providerRepository struct {
	db *gorm.DB
}

func NewProviderRepository(db *gorm.DB) ProviderRepository {
	return &providerRepository{db: db}
}

func (r *providerRepository) Create(provider *models.Provider) error {
	return r.db.Create(provider).Error
}

func (r *providerRepository) FindByEmail(email string) (*models.Provider, error) {
	var provider models.Provider
	err := r.db.Where("email = ?", email).First(&provider).Error
	if err != nil {
		return nil, err
	}
	return &provider, nil
}

func (r *providerRepository) FindByID(id uint) (*models.Provider, error) {
	var provider models.Provider
	err := r.db.First(&provider, id).Error
	if err != nil {
		return nil, err
	}
	return &provider, nil
}

func (r *providerRepository) Update(provider *models.Provider) error {
	return r.db.Save(provider).Error
}

func (r *providerRepository) FindAllProviders() ([]models.Provider, error) {
	var providers []models.Provider
	err := r.db.Where("role = ?", "PROVIDER").Order("created_at desc").Find(&providers).Error
	if err != nil {
		return nil, err
	}
	return providers, nil
}

func (r *providerRepository) Delete(id uint) error {
	// Let's delete provider in a transaction to clean packages and bookings
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Delete packages (which deletes packages associated with provider)
		if err := tx.Where("provider_id = ?", id).Delete(&models.Package{}).Error; err != nil {
			return err
		}
		// Delete bookings
		if err := tx.Where("provider_id = ?", id).Delete(&models.Booking{}).Error; err != nil {
			return err
		}
		// Delete status history
		if err := tx.Where("provider_id = ?", id).Delete(&models.ProviderStatusHistory{}).Error; err != nil {
			return err
		}
		// Delete provider
		if err := tx.Delete(&models.Provider{}, id).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *providerRepository) GetStatusHistory(providerID uint) ([]models.ProviderStatusHistory, error) {
	var history []models.ProviderStatusHistory
	err := r.db.Where("provider_id = ?", providerID).Order("created_at desc").Find(&history).Error
	if err != nil {
		return nil, err
	}
	return history, nil
}

func (r *providerRepository) CreateStatusHistory(history *models.ProviderStatusHistory) error {
	return r.db.Create(history).Error
}
