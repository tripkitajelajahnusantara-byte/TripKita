package services

import (
	"fmt"
	"time"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type PackageService interface {
	CreatePackage(providerID uint, req *models.CreatePackageRequest) (*models.Package, error)
	GetAllPackages(providerID uint) ([]models.Package, error)
	GetAllPublic() ([]models.Package, error)
	GetPublicProviderProfile(id uint) (*models.PublicProviderProfile, error)
	GetPackageByID(id uint, providerID uint) (*models.Package, error)
	UpdatePackage(id uint, providerID uint, req *models.UpdatePackageRequest) (*models.Package, error)
	DeletePackage(id uint, providerID uint) error
}

type packageService struct {
	repo         repositories.PackageRepository
	providerRepo repositories.ProviderRepository
}

func NewPackageService(repo repositories.PackageRepository, providerRepo repositories.ProviderRepository) PackageService {
	return &packageService{repo: repo, providerRepo: providerRepo}
}

func (s *packageService) CreatePackage(providerID uint, req *models.CreatePackageRequest) (*models.Package, error) {
	if req.Price <= 0 {
		return nil, fmt.Errorf("harga paket harus lebih besar dari 0")
	}
	if req.Price > 1_000_000_000_000 || req.QuotaMax > 10_000 {
		return nil, fmt.Errorf("harga atau kuota paket melebihi batas yang diizinkan")
	}
	if req.QuotaMax <= 0 {
		return nil, fmt.Errorf("kuota maksimal harus lebih besar dari 0")
	}
	if req.QuotaMin <= 0 {
		req.QuotaMin = 1
	}
	if req.QuotaMax < req.QuotaMin {
		return nil, fmt.Errorf("kuota maksimal (%d) tidak boleh lebih kecil dari kuota minimal (%d)", req.QuotaMax, req.QuotaMin)
	}
	if req.MaxGuests > 0 && req.MinGuests > req.MaxGuests {
		return nil, fmt.Errorf("jumlah tamu minimal tidak boleh melebihi jumlah tamu maksimal")
	}
	if req.MaxAge > 0 && req.MinAge > req.MaxAge {
		return nil, fmt.Errorf("usia minimal tidak boleh melebihi usia maksimal")
	}
	if err := validatePackageDates(req.StartDate, req.EndDate); err != nil {
		return nil, err
	}

	pkg := &models.Package{
		ProviderID:         providerID,
		Name:               req.Name,
		Destination:        req.Destination,
		MeetingPoint:       req.MeetingPoint,
		Category:           req.Category,
		TripType:           req.TripType,
		Price:              req.Price,
		QuotaMin:           req.QuotaMin,
		QuotaUsed:          0,
		QuotaMax:           req.QuotaMax,
		StartDate:          req.StartDate,
		EndDate:            req.EndDate,
		Schedule:           req.Schedule,
		Duration:           req.Duration,
		MinGuests:          req.MinGuests,
		MaxGuests:          req.MaxGuests,
		MinAge:             req.MinAge,
		MaxAge:             req.MaxAge,
		Status:             req.Status,
		Rating:             0.0,
		Description:        req.Description,
		IncludedFacilities: req.IncludedFacilities,
		ExcludedFacilities: req.ExcludedFacilities,
		Itinerary:          req.Itinerary,
		Image:              req.Image,
		Images:             req.Images,
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

func (s *packageService) GetPublicProviderProfile(id uint) (*models.PublicProviderProfile, error) {
	return s.providerRepo.FindPublicByID(id)
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
	if req.MeetingPoint != "" {
		pkg.MeetingPoint = req.MeetingPoint
	}
	if req.Category != "" {
		pkg.Category = req.Category
	}
	if req.TripType != "" {
		pkg.TripType = req.TripType
	}
	if req.Price < 0 || req.QuotaMin < 0 || req.QuotaMax < 0 || req.Duration < 0 || req.MinGuests < 0 || req.MaxGuests < 0 || req.MinAge < 0 || req.MaxAge < 0 {
		return nil, fmt.Errorf("nilai harga, kuota, durasi, jumlah tamu, dan usia tidak boleh negatif")
	}
	if req.Price > 1_000_000_000_000 || req.QuotaMax > 10_000 {
		return nil, fmt.Errorf("harga atau kuota paket melebihi batas yang diizinkan")
	}
	if req.Status != "" && req.Status != "Aktif" && req.Status != "Draft" && req.Status != "Nonaktif" {
		return nil, fmt.Errorf("status paket tidak valid")
	}
	if req.Price > 0 {
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
	if err := validatePackageDates(pkg.StartDate, pkg.EndDate); err != nil {
		return nil, err
	}
	if req.Schedule != "" {
		pkg.Schedule = req.Schedule
	}
	if req.Duration != 0 {
		pkg.Duration = req.Duration
	}
	if req.MinGuests != 0 {
		pkg.MinGuests = req.MinGuests
	}
	if req.MaxGuests != 0 {
		pkg.MaxGuests = req.MaxGuests
	}
	if req.MinAge != 0 {
		pkg.MinAge = req.MinAge
	}
	if req.MaxAge != 0 {
		pkg.MaxAge = req.MaxAge
	}
	if pkg.MaxGuests > 0 && pkg.MinGuests > pkg.MaxGuests {
		return nil, fmt.Errorf("jumlah tamu minimal tidak boleh melebihi jumlah tamu maksimal")
	}
	if pkg.MaxAge > 0 && pkg.MinAge > pkg.MaxAge {
		return nil, fmt.Errorf("usia minimal tidak boleh melebihi usia maksimal")
	}
	if req.Status != "" {
		pkg.Status = req.Status
	}
	if req.Description != "" {
		pkg.Description = req.Description
	}
	if req.IncludedFacilities != "" {
		pkg.IncludedFacilities = req.IncludedFacilities
	}
	if req.ExcludedFacilities != "" {
		pkg.ExcludedFacilities = req.ExcludedFacilities
	}
	if req.Itinerary != "" {
		pkg.Itinerary = req.Itinerary
	}
	if req.Image != "" {
		pkg.Image = req.Image
	}
	if req.Images != "" {
		pkg.Images = req.Images
	}

	err = s.repo.Update(pkg)
	if err != nil {
		return nil, err
	}

	return pkg, nil
}

func validatePackageDates(startDate, endDate string) error {
	var start, end time.Time
	var err error
	if startDate != "" {
		start, err = time.Parse("2006-01-02", startDate)
		if err != nil {
			return fmt.Errorf("tanggal mulai paket harus berformat YYYY-MM-DD")
		}
	}
	if endDate != "" {
		end, err = time.Parse("2006-01-02", endDate)
		if err != nil {
			return fmt.Errorf("tanggal selesai paket harus berformat YYYY-MM-DD")
		}
	}
	if !start.IsZero() && !end.IsZero() && end.Before(start) {
		return fmt.Errorf("tanggal selesai paket tidak boleh sebelum tanggal mulai")
	}
	return nil
}

func (s *packageService) DeletePackage(id uint, providerID uint) error {
	pkg, err := s.repo.FindByIDAndProvider(id, providerID)
	if err != nil {
		return err
	}
	return s.repo.Delete(pkg)
}
