package repositories

import (
	"gorm.io/gorm"

	"tripkita-provider/models"
)

type PackageRepository interface {
	Create(pkg *models.Package) error
	FindAllByProvider(providerID uint) ([]models.Package, error)
	FindAllPublic() ([]models.Package, error)
	FindByIDAndProvider(id uint, providerID uint) (*models.Package, error)
	FindByID(id uint) (*models.Package, error)
	Update(pkg *models.Package) error
	Delete(pkg *models.Package) error
	CountByProvider(providerID uint) (int64, error)
	CountActiveByProvider(providerID uint) (int64, error)
}

type packageRepository struct {
	db *gorm.DB
}

func NewPackageRepository(db *gorm.DB) PackageRepository {
	return &packageRepository{db: db}
}

func (r *packageRepository) Create(pkg *models.Package) error {
	return r.db.Create(pkg).Error
}

func (r *packageRepository) FindAllByProvider(providerID uint) ([]models.Package, error) {
	var packages []models.Package
	err := r.db.Where("provider_id = ?", providerID).Order("id desc").Find(&packages).Error
	return packages, err
}

func (r *packageRepository) FindAllPublic() ([]models.Package, error) {
	var packages []models.Package
	err := r.db.Where("status = ?", "Aktif").Order("id desc").Find(&packages).Error
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
	return r.db.Save(pkg).Error
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
