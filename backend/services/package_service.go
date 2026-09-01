package services

import (
	"fmt"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type PackageService interface {
	CreatePackage(providerID uint, req *models.CreatePackageRequest) (*models.Package, error)
	GetAllPackages(providerID uint) ([]models.Package, error)
	GetAllPublic() ([]models.Package, error)
	GetPackageByID(id uint, providerID uint) (*models.Package, error)
	UpdatePackage(id uint, providerID uint, req *models.UpdatePackageRequest) (*models.Package, error)
	DeletePackage(id uint, providerID uint) error
}

type packageService struct {
	repo repositories.PackageRepository
}

func NewPackageService(repo repositories.PackageRepository) PackageService {
	return &packageService{repo: repo}
}

func (s *packageService) CreatePackage(providerID uint, req *models.CreatePackageRequest) (*models.Package, error) {
	if req.QuotaMax <= 0 {
		return nil, fmt.Errorf("kuota maksimal harus lebih besar dari 0")
	}
	if req.QuotaMin <= 0 {
		req.QuotaMin = 1
	}
	if req.QuotaMax < req.QuotaMin {
		return nil, fmt.Errorf("kuota maksimal (%d) tidak boleh lebih kecil dari kuota minimal (%d)", req.QuotaMax, req.QuotaMin)
	}

	pkg := &models.Package{
		ProviderID:  providerID,
		Name:        req.Name,
		Destination: req.Destination,
		Category:    req.Category,
		TripType:    req.TripType,
		Price:       req.Price,
		QuotaMin:    req.QuotaMin,
		QuotaUsed:   0,
		QuotaMax:    req.QuotaMax,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Schedule:    req.Schedule,
		Status:      req.Status,
		Rating:      5.0,
	}

	if err := s.repo.Create(pkg); err != nil {
		return nil, err
	}

	return pkg, nil
}

func (s *packageService) GetAllPackages(providerID uint) ([]models.Package, error) {
	return s.repo.FindAllByProvider(providerID)
}

func (s *packageService) GetAllPublic() ([]models.Package, error) {
	return s.repo.FindAllPublic()
}

func (s *packageService) GetPackageByID(id uint, providerID uint) (*models.Package, error) {
	return s.repo.FindByIDAndProvider(id, providerID)
}

func (s *packageService) UpdatePackage(id uint, providerID uint, req *models.UpdatePackageRequest) (*models.Package, error) {
	pkg, err := s.repo.FindByIDAndProvider(id, providerID)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		pkg.Name = req.Name
	}
	if req.Destination != "" {
		pkg.Destination = req.Destination
	}
	if req.Category != "" {
		pkg.Category = req.Category
	}
	if req.TripType != "" {
		pkg.TripType = req.TripType
	}
	if req.Price != 0 {
		pkg.Price = req.Price
	}
	if req.QuotaMin != 0 {
		pkg.QuotaMin = req.QuotaMin
	}
	if req.QuotaMax != 0 {
		pkg.QuotaMax = req.QuotaMax
	}
	if pkg.QuotaMin <= 0 {
		pkg.QuotaMin = 1
	}
	if pkg.QuotaMax < pkg.QuotaMin && pkg.QuotaMax > 0 {
		return nil, fmt.Errorf("kuota maksimal (%d) tidak boleh lebih kecil dari kuota minimal (%d)", pkg.QuotaMax, pkg.QuotaMin)
	}
	if req.StartDate != "" {
		pkg.StartDate = req.StartDate
	}
	if req.EndDate != "" {
		pkg.EndDate = req.EndDate
	}
	if req.Schedule != "" {
		pkg.Schedule = req.Schedule
	}
	if req.Status != "" {
		pkg.Status = req.Status
	}

	err = s.repo.Update(pkg)
	if err != nil {
		return nil, err
	}

	return pkg, nil
}

func (s *packageService) DeletePackage(id uint, providerID uint) error {
	pkg, err := s.repo.FindByIDAndProvider(id, providerID)
	if err != nil {
		return err
	}
	return s.repo.Delete(pkg)
}
