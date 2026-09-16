package repositories

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"tripkita-provider/models"
)

type ProviderRepository interface {
	Create(provider *models.Provider) error
	FindByEmail(email string) (*models.Provider, error)
	FindByID(id uint) (*models.Provider, error)
	FindPublicByID(id uint) (*models.PublicProviderProfile, error)
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
	err := r.db.Where("LOWER(email) = LOWER(?)", email).First(&provider).Error
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

func (r *providerRepository) FindPublicByID(id uint) (*models.PublicProviderProfile, error) {
	var profile models.PublicProviderProfile
	err := r.db.Table("providers AS p").
		Select(`p.id, p.business_name, p.business_category, p.operational_province,
			p.operational_city, p.description, p.is_verified, p.created_at,
			COALESCE((
				SELECT AVG(r.rating) FROM reviews r
				JOIN packages pkg ON pkg.id = r.package_id
				WHERE pkg.provider_id = p.id
			), 0) AS rating,
			COALESCE((
				SELECT SUM(b.guests) FROM bookings b
				WHERE b.provider_id = p.id AND b.status = 'COMPLETED'
			), 0) AS total_travelers`).
		Where("p.id = ? AND p.role = ? AND p.status = ? AND p.is_verified = ?", id, "PROVIDER", "APPROVED", true).
		Take(&profile).Error
	if err != nil {
		return nil, err
	}
	return &profile, nil
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
	// Financial and booking records are audit data and must never be cascaded away.
	// The legacy DELETE endpoint therefore performs a reversible deactivation.
	return r.db.Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&models.Provider{}).Where("id = ? AND role = ?", id, "PROVIDER").Updates(map[string]interface{}{
			"status":             "REJECTED",
			"is_verified":        false,
			"verification_notes": "Akun dinonaktifkan oleh administrator",
			"updated_at":         time.Now(),
		})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return errors.New("provider not found")
		}
		if err := tx.Model(&models.Package{}).Where("provider_id = ?", id).Updates(map[string]interface{}{
			"status":     "Nonaktif",
			"updated_at": time.Now(),
		}).Error; err != nil {
			return err
		}
		return tx.Create(&models.ProviderStatusHistory{
			ProviderID: id,
			Status:     "REJECTED",
			Notes:      "Akun dinonaktifkan oleh administrator; data transaksi dipertahankan untuk audit.",
			CreatedAt:  time.Now(),
		}).Error
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
