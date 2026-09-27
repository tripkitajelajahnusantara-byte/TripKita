package services

import (
	"fmt"
	"sort"
	"strings"
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
	ListPackageDates(packageID uint, providerID uint) ([]models.PackageDate, error)
	SetPackageDates(packageID uint, providerID uint, dates []string) ([]models.PackageDate, error)
}

type packageService struct {
	repo         repositories.PackageRepository
	providerRepo repositories.ProviderRepository
	dateRepo     repositories.PackageDateRepository
}

// PackageValidationError membedakan input paket yang tidak valid dari
// gangguan database, agar controller mengembalikan 400 dan UI tidak menerima
// pesan internal server untuk kesalahan formulir.
type PackageValidationError struct{ Message string }

func (e *PackageValidationError) Error() string { return e.Message }

func packageValidationErrorf(format string, args ...interface{}) error {
	return &PackageValidationError{Message: fmt.Sprintf(format, args...)}
}

func NewPackageService(repo repositories.PackageRepository, providerRepo repositories.ProviderRepository, dateRepo repositories.PackageDateRepository) PackageService {
	return &packageService{repo: repo, providerRepo: providerRepo, dateRepo: dateRepo}
}

func (s *packageService) CreatePackage(providerID uint, req *models.CreatePackageRequest) (*models.Package, error) {
	if err := validateMeetingPointCoordinates(req.MeetingPointLat, req.MeetingPointLng, req.Status == "Aktif"); err != nil {
		return nil, err
	}
	if req.Price < 0 || req.QuotaMin < 0 || req.QuotaMax < 0 || req.Duration < 0 || req.MinGuests < 0 || req.MaxGuests < 0 || req.MinAge < 0 || req.MaxAge < 0 {
		return nil, packageValidationErrorf("harga, kuota, durasi, jumlah peserta, dan umur tidak boleh bernilai negatif")
	}
	if req.Price <= 0 {
		return nil, packageValidationErrorf("harga paket harus lebih besar dari 0")
	}
	if req.Price > 1_000_000_000_000 || req.QuotaMax > 10_000 {
		return nil, packageValidationErrorf("harga atau kuota paket melebihi batas yang diizinkan")
	}
	if req.QuotaMax <= 0 {
		return nil, packageValidationErrorf("kuota maksimal harus lebih besar dari 0")
	}
	if req.QuotaMin <= 0 {
		req.QuotaMin = 1
	}
	if req.QuotaMax < req.QuotaMin {
		return nil, packageValidationErrorf("kuota maksimal (%d) tidak boleh lebih kecil dari kuota minimal (%d)", req.QuotaMax, req.QuotaMin)
	}
	if req.MaxGuests > 0 && req.MinGuests > req.MaxGuests {
		return nil, packageValidationErrorf("jumlah tamu minimal tidak boleh melebihi jumlah tamu maksimal")
	}
	if req.MaxAge > 0 && req.MinAge > req.MaxAge {
		return nil, packageValidationErrorf("usia minimal tidak boleh melebihi usia maksimal")
	}
	if err := validatePackageDates(req.StartDate, req.EndDate); err != nil {
		return nil, err
	}

	pkg := &models.Package{
		ProviderID:         providerID,
		Name:               req.Name,
		Destination:        req.Destination,
		MeetingPoint:       req.MeetingPoint,
		MeetingPointLat:    req.MeetingPointLat,
		MeetingPointLng:    req.MeetingPointLng,
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
	if pkg.Status == "Aktif" {
		if err := validateActivePackage(pkg); err != nil {
			return nil, err
		}
	}

	if err := s.repo.Create(pkg); err != nil {
		return nil, err
	}

	return pkg, nil
}

func (s *packageService) GetAllPackages(providerID uint) ([]models.Package, error) {
	packages, err := s.repo.FindAllByProvider(providerID)
	if err != nil {
		return nil, err
	}
	return s.attachDates(packages)
}

func (s *packageService) GetAllPublic() ([]models.Package, error) {
	packages, err := s.repo.FindAllPublic()
	if err != nil {
		return nil, err
	}
	return s.attachDates(packages)
}

// attachDates melengkapi daftar paket dengan tanggal keberangkatannya dalam satu
// query, bukan satu query per paket.
func (s *packageService) attachDates(packages []models.Package) ([]models.Package, error) {
	if s.dateRepo == nil || len(packages) == 0 {
		return packages, nil
	}

	ids := make([]uint, 0, len(packages))
	for _, pkg := range packages {
		if !models.IsOpenTrip(pkg.TripType) {
			ids = append(ids, pkg.ID)
		}
	}
	if len(ids) == 0 {
		return packages, nil
	}

	today, _ := models.AvailabilityWindow(time.Now())
	open, booked, err := s.dateRepo.DatesFor(ids, today)
	if err != nil {
		return nil, err
	}
	for i := range packages {
		packages[i].AvailableDates = open[packages[i].ID]
		packages[i].BookedDates = booked[packages[i].ID]
	}
	return packages, nil
}

// ListPackageDates mengembalikan seluruh tanggal paket beserta statusnya untuk
// mitra pemiliknya.
func (s *packageService) ListPackageDates(packageID uint, providerID uint) ([]models.PackageDate, error) {
	pkg, err := s.repo.FindByIDAndProvider(packageID, providerID)
	if err != nil || pkg == nil {
		return nil, fmt.Errorf("paket tidak ditemukan")
	}
	return s.dateRepo.ListByPackage(packageID)
}

// SetPackageDates mengganti daftar tanggal yang dibuka mitra.
//
// Aturan yang ditegakkan di sini: hanya untuk paket selain Open Trip, tanggal
// tidak boleh di masa lalu, dan tidak boleh lebih jauh dari enam bulan ke depan.
func (s *packageService) SetPackageDates(packageID uint, providerID uint, dates []string) ([]models.PackageDate, error) {
	pkg, err := s.repo.FindByIDAndProvider(packageID, providerID)
	if err != nil || pkg == nil {
		return nil, fmt.Errorf("paket tidak ditemukan")
	}
	if models.IsOpenTrip(pkg.TripType) {
		return nil, fmt.Errorf("Open Trip berangkat bersama pada jadwal yang sudah ditetapkan, sehingga tanggalnya tidak dipilih per pelanggan")
	}
	if len(dates) > models.MaxAvailabilityDates {
		return nil, fmt.Errorf("jumlah tanggal melebihi batas %d", models.MaxAvailabilityDates)
	}

	earliest, latest := models.AvailabilityWindow(time.Now())
	unique := make(map[string]struct{}, len(dates))
	cleaned := make([]string, 0, len(dates))
	for _, raw := range dates {
		date := strings.TrimSpace(raw)
		if _, err := time.Parse("2006-01-02", date); err != nil {
			return nil, fmt.Errorf("tanggal %q tidak valid; gunakan format YYYY-MM-DD", raw)
		}
		if date < earliest {
			return nil, fmt.Errorf("tanggal %s sudah lewat dan tidak dapat dibuka", date)
		}
		if date > latest {
			return nil, fmt.Errorf("tanggal %s melebihi batas %d bulan ke depan (maksimal %s)", date, models.AvailabilityHorizonMonths, latest)
		}
		if _, seen := unique[date]; seen {
			continue
		}
		unique[date] = struct{}{}
		cleaned = append(cleaned, date)
	}
	sort.Strings(cleaned)

	if err := s.dateRepo.ReplaceProviderDates(packageID, cleaned); err != nil {
		return nil, err
	}
	return s.dateRepo.ListByPackage(packageID)
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

	if req.Name != nil {
		pkg.Name = strings.TrimSpace(*req.Name)
	}
	if req.Destination != nil {
		pkg.Destination = strings.TrimSpace(*req.Destination)
	}
	if req.MeetingPoint != nil {
		pkg.MeetingPoint = strings.TrimSpace(*req.MeetingPoint)
	}
	if req.MeetingPointLat != nil {
		pkg.MeetingPointLat = req.MeetingPointLat
	}
	if req.MeetingPointLng != nil {
		pkg.MeetingPointLng = req.MeetingPointLng
	}
	if err := validateMeetingPointCoordinates(pkg.MeetingPointLat, pkg.MeetingPointLng, false); err != nil {
		return nil, err
	}
	if req.Category != nil {
		pkg.Category = strings.TrimSpace(*req.Category)
	}
	if req.TripType != nil {
		pkg.TripType = strings.TrimSpace(*req.TripType)
	}
	if (req.Price != nil && *req.Price < 0) || (req.QuotaMin != nil && *req.QuotaMin < 0) ||
		(req.QuotaMax != nil && *req.QuotaMax < 0) || (req.Duration != nil && *req.Duration < 0) ||
		(req.MinGuests != nil && *req.MinGuests < 0) || (req.MaxGuests != nil && *req.MaxGuests < 0) ||
		(req.MinAge != nil && *req.MinAge < 0) || (req.MaxAge != nil && *req.MaxAge < 0) {
		return nil, packageValidationErrorf("harga, kuota, durasi, jumlah peserta, dan umur tidak boleh bernilai negatif")
	}
	if (req.Price != nil && *req.Price > 1_000_000_000_000) || (req.QuotaMax != nil && *req.QuotaMax > 10_000) {
		return nil, packageValidationErrorf("harga atau kuota paket melebihi batas yang diizinkan")
	}
	if req.Status != nil && *req.Status != "Aktif" && *req.Status != "Draft" && *req.Status != "Nonaktif" {
		return nil, packageValidationErrorf("status paket tidak valid")
	}
	if req.Price != nil {
		pkg.Price = *req.Price
	}
	if req.QuotaMin != nil {
		pkg.QuotaMin = *req.QuotaMin
	}
	if req.QuotaMax != nil {
		pkg.QuotaMax = *req.QuotaMax
	}
	if pkg.QuotaMax < pkg.QuotaMin && pkg.QuotaMax > 0 {
		return nil, packageValidationErrorf("kuota maksimal (%d) tidak boleh lebih kecil dari kuota minimal (%d)", pkg.QuotaMax, pkg.QuotaMin)
	}
	if req.StartDate != nil {
		pkg.StartDate = strings.TrimSpace(*req.StartDate)
	}
	if req.EndDate != nil {
		pkg.EndDate = strings.TrimSpace(*req.EndDate)
	}
	if err := validatePackageDates(pkg.StartDate, pkg.EndDate); err != nil {
		return nil, err
	}
	if req.Schedule != nil {
		pkg.Schedule = strings.TrimSpace(*req.Schedule)
	}
	if req.Duration != nil {
		pkg.Duration = *req.Duration
	}
	if req.MinGuests != nil {
		pkg.MinGuests = *req.MinGuests
	}
	if req.MaxGuests != nil {
		pkg.MaxGuests = *req.MaxGuests
	}
	if req.MinAge != nil {
		pkg.MinAge = *req.MinAge
	}
	if req.MaxAge != nil {
		pkg.MaxAge = *req.MaxAge
	}
	if pkg.MaxGuests > 0 && pkg.MinGuests > pkg.MaxGuests {
		return nil, packageValidationErrorf("jumlah tamu minimal tidak boleh melebihi jumlah tamu maksimal")
	}
	if pkg.MaxAge > 0 && pkg.MinAge > pkg.MaxAge {
		return nil, packageValidationErrorf("usia minimal tidak boleh melebihi usia maksimal")
	}
	if req.Status != nil {
		pkg.Status = *req.Status
	}
	if req.Description != nil {
		pkg.Description = strings.TrimSpace(*req.Description)
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
	if pkg.Status == "Aktif" {
		if err := validateActivePackage(pkg); err != nil {
			return nil, err
		}
	}

	err = s.repo.Update(pkg)
	if err != nil {
		return nil, err
	}

	return pkg, nil
}

func validateActivePackage(pkg *models.Package) error {
	if strings.TrimSpace(pkg.Name) == "" || strings.TrimSpace(pkg.Destination) == "" ||
		strings.TrimSpace(pkg.MeetingPoint) == "" || strings.TrimSpace(pkg.Category) == "" ||
		strings.TrimSpace(pkg.TripType) == "" || strings.TrimSpace(pkg.Description) == "" {
		return packageValidationErrorf("nama, destinasi, titik kumpul, kategori, tipe trip, dan deskripsi wajib diisi sebelum paket diaktifkan")
	}
	if err := validateMeetingPointCoordinates(pkg.MeetingPointLat, pkg.MeetingPointLng, true); err != nil {
		return err
	}
	if pkg.Price <= 0 {
		return packageValidationErrorf("harga paket aktif harus lebih besar dari 0")
	}
	if pkg.Duration <= 0 {
		return packageValidationErrorf("durasi paket aktif minimal 1 hari")
	}
	if pkg.QuotaMin <= 0 || pkg.QuotaMax <= 0 || pkg.QuotaMax < pkg.QuotaMin {
		return packageValidationErrorf("kuota paket aktif harus valid dan minimal 1 peserta")
	}
	if pkg.MinGuests <= 0 || pkg.MaxGuests <= 0 || pkg.MinGuests > pkg.MaxGuests || pkg.MaxGuests > pkg.QuotaMax {
		return packageValidationErrorf("batas peserta per booking tidak valid")
	}
	if pkg.MinAge < 0 || pkg.MaxAge < 0 || (pkg.MaxAge > 0 && pkg.MinAge > pkg.MaxAge) {
		return packageValidationErrorf("batas umur tidak valid")
	}
	if pkg.StartDate == "" || pkg.EndDate == "" {
		return packageValidationErrorf("tanggal mulai dan tanggal selesai wajib diisi sebelum paket diaktifkan")
	}
	return validatePackageDates(pkg.StartDate, pkg.EndDate)
}

func validateMeetingPointCoordinates(latitude, longitude *float64, required bool) error {
	if latitude == nil && longitude == nil {
		if required {
			return packageValidationErrorf("pin titik kumpul wajib dipilih pada peta sebelum paket diaktifkan")
		}
		return nil
	}
	if latitude == nil || longitude == nil {
		return packageValidationErrorf("latitude dan longitude titik kumpul wajib dikirim berpasangan")
	}
	if *latitude < -90 || *latitude > 90 {
		return packageValidationErrorf("latitude titik kumpul harus berada antara -90 dan 90")
	}
	if *longitude < -180 || *longitude > 180 {
		return packageValidationErrorf("longitude titik kumpul harus berada antara -180 dan 180")
	}
	return nil
}

func validatePackageDates(startDate, endDate string) error {
	var start, end time.Time
	var err error
	if startDate != "" {
		start, err = time.Parse("2006-01-02", startDate)
		if err != nil {
			return packageValidationErrorf("tanggal mulai paket harus berformat YYYY-MM-DD")
		}
	}
	if endDate != "" {
		end, err = time.Parse("2006-01-02", endDate)
		if err != nil {
			return packageValidationErrorf("tanggal selesai paket harus berformat YYYY-MM-DD")
		}
	}
	if !start.IsZero() && !end.IsZero() && end.Before(start) {
		return packageValidationErrorf("tanggal selesai paket tidak boleh sebelum tanggal mulai")
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
