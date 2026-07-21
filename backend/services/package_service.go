package services

import (
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type PackageService interface {
	CreatePackage(providerID uint, req *models.CreatePackageRequest) (*models.Package, error)
	GetAllPackages(providerID uint) ([]models.Package, error)
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
	pkg := &models.Package{
		ProviderID:  providerID,
		Name:        req.Name,
		Destination: req.Destination,
		Price:       req.Price,
		QuotaUsed:   0,
		QuotaMax:    req.QuotaMax,
		Schedule:    req.Schedule,
		Status:      req.Status,
		Rating:      5.0, // Default rating for new package
	}

	err := s.repo.Create(pkg)
	if err != nil {
		return nil, err
	}

	return pkg, nil
}

func (s *packageService) GetAllPackages(providerID uint) ([]models.Package, error) {
	return s.repo.FindAllByProvider(providerID)
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
	if req.Price != 0 {
		pkg.Price = req.Price
	}
	if req.QuotaMax != 0 {
		pkg.QuotaMax = req.QuotaMax
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
