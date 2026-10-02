package repositories

import (
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"tripkita-provider/models"
)

type PackageRepository interface {
	Create(pkg *models.Package) error
	FindAllByProvider(providerID uint) ([]models.Package, error)
	FindAllPublic(today string) ([]models.Package, error)
	FindByIDAndProvider(id uint, providerID uint) (*models.Package, error)
	FindByID(id uint) (*models.Package, error)
	Update(pkg *models.Package) error
	Delete(pkg *models.Package) error
	CountByProvider(providerID uint) (int64, error)
	CountActiveByProvider(providerID uint) (int64, error)
	AtomicReserveQuota(packageID uint, guests int) error
}

type packageRepository struct {
	db *gorm.DB
}

func NewPackageRepository(db *gorm.DB) PackageRepository {
	return &packageRepository{db: db}
}

func (r *packageRepository) Create(pkg *models.Package) error {
	return r.withActiveProvider(pkg.ProviderID, func(tx *gorm.DB) error {
		if err := tx.Create(pkg).Error; err != nil {
			return err
		}
		if !models.IsOpenTrip(pkg.TripType) && pkg.AvailableDates != nil {
			return replaceProviderDatesTx(tx, pkg.ID, pkg.AvailableDates)
		}
		return nil
	})
}

// Shares the provider row lock with deactivation. An in-flight package write
// cannot re-publish a package after the administrator has disabled its owner.
func (r *packageRepository) withActiveProvider(id uint, write func(*gorm.DB) error) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var provider models.Provider
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&provider, id).Error; err != nil {
			return err
		}
		if provider.Role != "PROVIDER" || provider.Status != "APPROVED" || !provider.IsVerified || provider.DeletedAt != nil {
			return fmt.Errorf("provider tidak aktif; paket tidak dapat dibuat atau diubah")
		}
		return write(tx)
	})
}

func (r *packageRepository) FindAllByProvider(providerID uint) ([]models.Package, error) {
	var packages []models.Package
	err := r.db.Where("provider_id = ?", providerID).Order("id desc").Find(&packages).Error
	return packages, err
}

func (r *packageRepository) FindAllPublic(today string) ([]models.Package, error) {
	var packages []models.Package
	err := r.db.
		Joins("JOIN providers ON providers.id = packages.provider_id").
		Where(`packages.status = ?
			AND packages.end_date >= ?
			AND providers.role = ?
			AND providers.status = ?
			AND providers.deleted_at IS NULL
			AND providers.is_verified = ?`, "Aktif", today, "PROVIDER", "APPROVED", true).
		Order("packages.id desc").
		Find(&packages).Error
	return packages, err
}

func (r *packageRepository) FindByIDAndProvider(id uint, providerID uint) (*models.Package, error) {
	var pkg models.Package
	err := r.db.Where("id = ? AND provider_id = ?", id, providerID).First(&pkg).Error
	if err != nil {
		return nil, err
	}
	return &pkg, nil
}

func (r *packageRepository) FindByID(id uint) (*models.Package, error) {
	var pkg models.Package
	err := r.db.Where("id = ?", id).First(&pkg).Error
	if err != nil {
		return nil, err
	}
	return &pkg, nil
}

func (r *packageRepository) Update(pkg *models.Package) error {
	return r.withActiveProvider(pkg.ProviderID, func(tx *gorm.DB) error {
		var current models.Package
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, pkg.ID).Error; err != nil {
			return err
		}
		// Checkout may have changed the quota since the edit form was read.
		pkg.QuotaUsed = current.QuotaUsed
		if !models.IsOpenTrip(current.TripType) && (current.Duration != pkg.Duration || current.TripType != pkg.TripType) {
			var booked int64
			if err := tx.Model(&models.PackageDate{}).Where("package_id = ? AND status = ?", pkg.ID, models.PackageDateBooked).Count(&booked).Error; err != nil {
				return err
			}
			if booked > 0 {
				return &AvailabilityConflictError{Message: "tipe dan durasi tidak dapat diubah saat masih ada tanggal yang terkunci pesanan"}
			}
		}
		if !models.IsOpenTrip(pkg.TripType) && pkg.AvailableDates != nil {
			if err := replaceProviderDatesTx(tx, pkg.ID, pkg.AvailableDates); err != nil {
				return err
			}
		}
		return tx.Save(pkg).Error
	})
}

func (r *packageRepository) Delete(pkg *models.Package) error {
	return r.db.Delete(pkg).Error
}

func (r *packageRepository) CountByProvider(providerID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Package{}).Where("provider_id = ?", providerID).Count(&count).Error
	return count, err
}

func (r *packageRepository) CountActiveByProvider(providerID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Package{}).Where("provider_id = ? AND status = ?", providerID, "Aktif").Count(&count).Error
	return count, err
}

func (r *packageRepository) AtomicReserveQuota(packageID uint, guests int) error {
	var pkg models.Package
	if err := r.db.First(&pkg, packageID).Error; err != nil {
		return err
	}

	if pkg.QuotaUsed+guests > pkg.QuotaMax && pkg.QuotaMax > 0 {
		return fmt.Errorf("kuota paket tidak mencukupi (sisa kuota: %d seat)", pkg.QuotaMax-pkg.QuotaUsed)
	}

	res := r.db.Model(&models.Package{}).
		Where("id = ?", packageID).
		UpdateColumn("quota_used", gorm.Expr("quota_used + ?", guests))

	return res.Error
}
