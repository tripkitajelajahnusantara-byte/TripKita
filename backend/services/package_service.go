package services

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type PackageService interface {
	CreatePackage(providerID uint, req *models.CreatePackageRequest) (*models.Package, error)
	DuplicatePackage(id uint, providerID uint) (*models.Package, error)
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

// quotaMinimumForTripType memastikan ambang minimum keberangkatan hanya
// dimiliki Open Trip. Paket lain tetap memiliki kapasitas (quota_max), tetapi
// batas minimal pesanannya diatur terpisah melalui min_guests.
func quotaMinimumForTripType(tripType string, requested int) int {
	if !models.IsOpenTrip(tripType) {
		return 0
	}
	return requested
}

func NewPackageService(repo repositories.PackageRepository, providerRepo repositories.ProviderRepository, dateRepo repositories.PackageDateRepository) PackageService {
	return &packageService{repo: repo, providerRepo: providerRepo, dateRepo: dateRepo}
}

func validatePackagePhotos(image, images string) error {
	refs := append(strings.Split(images, ","), image)
	if len(strings.Split(images, ",")) > 20 {
		return packageValidationErrorf("foto paket maksimal 20")
	}
	for _, ref := range refs {
		if !packagePhotoRefIsValid(ref) {
			return packageValidationErrorf("foto paket harus diunggah melalui formulir foto paket")
		}
	}
	return nil
}

func (s *packageService) CreatePackage(providerID uint, req *models.CreatePackageRequest) (*models.Package, error) {
	if err := validatePackageItinerary(req.Itinerary); err != nil {
		return nil, err
	}
	if err := validatePackagePhotos(req.Image, req.Images); err != nil {
		return nil, err
	}
	req.QuotaMin = quotaMinimumForTripType(req.TripType, req.QuotaMin)
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
	if models.IsOpenTrip(req.TripType) && req.QuotaMin > 0 && req.QuotaMax < req.QuotaMin {
		return nil, packageValidationErrorf("kuota maksimal (%d) tidak boleh lebih kecil dari kuota minimal (%d)", req.QuotaMax, req.QuotaMin)
	}
	if req.MaxAge > 0 && req.MinAge > req.MaxAge {
		return nil, packageValidationErrorf("usia minimal tidak boleh melebihi usia maksimal")
	}
	if err := validatePackageDates(req.StartDate, req.EndDate); err != nil {
		return nil, err
	}

	pkg := &models.Package{
		PickupMode:         req.PickupMode,
		PickupArea:         req.PickupArea,
		PickupNotes:        req.PickupNotes,
		PickupPoints:       req.PickupPoints,
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
	if err := validatePackagePickup(pkg); err != nil {
		return nil, err
	}
	// Draft Open Trip boleh disimpan tanpa jadwal agar provider dapat
	// melengkapinya nanti. Paket yang langsung aktif tetap harus punya
	// sedikitnya satu tanggal keberangkatan.
	if req.DepartureDates != nil && (len(req.DepartureDates) > 0 || req.Status == "Aktif") {
		if err := configureOpenTripDates(pkg, req.DepartureDates, nil, time.Now()); err != nil {
			return nil, err
		}
	}
	pkg.NormalizeBookingLimits()
	if err := validateBookingLimits(pkg); err != nil {
		return nil, err
	}
	if pkg.Status == "Aktif" {
		if err := validateActivePackage(pkg); err != nil {
			return nil, err
		}
	}

	if !models.IsOpenTrip(pkg.TripType) {
		dates := req.AvailableDates
		if len(dates) == 0 {
			return nil, packageValidationErrorf("pilih tanggal availability sebelum menyimpan paket")
		}
		if err := validateOfferedDates(pkg, dates); err != nil {
			return nil, err
		}
		pkg.AvailableDates = dates
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
	today := time.Now().In(models.BookingLocation).Format("2006-01-02")
	packages, err := s.repo.FindAllPublic(today)
	if err != nil {
		return nil, err
	}
	// Pertahanan kedua untuk implementasi repository lain dan data legacy:
	// respons publik tidak pernah membawa paket tanpa tanggal akhir valid atau
	// paket yang seluruh periodenya sudah lewat.
	packages = filterCurrentPublicPackages(packages, today)
	return s.attachDates(packages)
}

func filterCurrentPublicPackages(packages []models.Package, today string) []models.Package {
	visible := make([]models.Package, 0, len(packages))
	for _, pkg := range packages {
		endDate := strings.TrimSpace(pkg.EndDate)
		if pkg.Status != "Aktif" || len(endDate) != len("2006-01-02") || endDate < today {
			continue
		}
		if _, err := time.Parse("2006-01-02", endDate); err != nil {
			continue
		}
		// Keep the package visible as long as it has an upcoming departure.
		if models.IsOpenTrip(pkg.TripType) {
			upcoming := false
			for _, day := range pkg.OpenTripDates() {
				if _, err := time.Parse("2006-01-02", day); err == nil && day >= today {
					upcoming = true
					break
				}
			}
			if !upcoming {
				continue
			}
		}
		visible = append(visible, pkg)
	}
	return visible
}

// attachDates loads calendar and departure availability in batches.
func (s *packageService) attachDates(packages []models.Package) ([]models.Package, error) {
	if s.repo != nil {
		if err := s.repo.LoadDepartureAvailability(packages); err != nil {
			return nil, err
		}
	}
	for i := range packages {
		packages[i].QuotaMin = quotaMinimumForTripType(packages[i].TripType, packages[i].QuotaMin)
		packages[i].NormalizeBookingLimits()
	}
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
// tidak boleh di masa lalu, dan tidak boleh lebih jauh dari tiga bulan ke depan.
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
		if date < pkg.StartDate || date > pkg.EndDate {
			return nil, packageValidationErrorf("tanggal %s berada di luar periode paket", date)
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
	pkg, err := s.repo.FindByIDAndProvider(id, providerID)
	if err != nil {
		return nil, err
	}
	pkg.QuotaMin = quotaMinimumForTripType(pkg.TripType, pkg.QuotaMin)
	packages, err := s.attachDates([]models.Package{*pkg})
	if err != nil {
		return nil, err
	}
	if s.dateRepo != nil && !models.IsOpenTrip(pkg.TripType) {
		rows, err := s.dateRepo.ListByPackage(pkg.ID)
		if err != nil {
			return nil, err
		}
		for _, row := range rows {
			if row.Origin == models.PackageDateOriginProvider {
				packages[0].ConfiguredDates = append(packages[0].ConfiguredDates, row.Date)
			}
		}
	}
	return &packages[0], nil
}

func (s *packageService) UpdatePackage(id uint, providerID uint, req *models.UpdatePackageRequest) (*models.Package, error) {
	if err := validatePackageItinerary(req.Itinerary); err != nil {
		return nil, err
	}
	pkg, err := s.repo.FindByIDAndProvider(id, providerID)
	if err != nil {
		return nil, err
	}
	previousStart, previousEnd, previousType := pkg.StartDate, pkg.EndDate, pkg.TripType
	previousDepartures := pkg.OpenTripDates()
	if req.PickupMode != nil {
		pkg.PickupMode = *req.PickupMode
	}
	if req.PickupArea != nil {
		pkg.PickupArea = *req.PickupArea
	}
	if req.PickupNotes != nil {
		pkg.PickupNotes = *req.PickupNotes
	}
	if req.PickupPoints != nil {
		pkg.PickupPoints = *req.PickupPoints
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
	if req.Category != nil {
		pkg.Category = strings.TrimSpace(*req.Category)
	}
	if req.TripType != nil {
		pkg.TripType = strings.TrimSpace(*req.TripType)
	}
	if (req.Price != nil && *req.Price < 0) ||
		(req.QuotaMin != nil && models.IsOpenTrip(pkg.TripType) && *req.QuotaMin < 0) ||
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
	if req.QuotaMin != nil && models.IsOpenTrip(pkg.TripType) {
		pkg.QuotaMin = *req.QuotaMin
	}
	pkg.QuotaMin = quotaMinimumForTripType(pkg.TripType, pkg.QuotaMin)
	if req.QuotaMax != nil {
		pkg.QuotaMax = *req.QuotaMax
	}
	if models.IsOpenTrip(pkg.TripType) && pkg.QuotaMax < pkg.QuotaMin && pkg.QuotaMax > 0 {
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
	targetStatus := pkg.Status
	if req.Status != nil {
		targetStatus = *req.Status
	}
	if req.DepartureDates != nil {
		if len(*req.DepartureDates) == 0 && models.IsOpenTrip(pkg.TripType) {
			if targetStatus == "Aktif" {
				return nil, packageValidationErrorf("pilih minimal satu tanggal keberangkatan Open Trip sebelum paket diaktifkan")
			}
			pkg.DepartureDates = nil
		} else if err := configureOpenTripDates(pkg, *req.DepartureDates, previousDepartures, time.Now()); err != nil {
			return nil, err
		}
	} else if !models.IsOpenTrip(pkg.TripType) {
		pkg.DepartureDates = nil
	} else if len(pkg.DepartureDates) > 0 {
		if err := configureOpenTripDates(pkg, pkg.DepartureDates, previousDepartures, time.Now()); err != nil {
			return nil, err
		}
	}
	if req.MinGuests != nil {
		pkg.MinGuests = *req.MinGuests
	}
	if req.MaxGuests != nil {
		pkg.MaxGuests = *req.MaxGuests
	}
	pkg.NormalizeBookingLimits()
	if req.MinAge != nil {
		pkg.MinAge = *req.MinAge
	}
	if req.MaxAge != nil {
		pkg.MaxAge = *req.MaxAge
	}
	if err := validateBookingLimits(pkg); err != nil {
		return nil, err
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
	if err := validatePackagePhotos(req.Image, req.Images); err != nil {
		return nil, err
	}
	if req.Image != "" {
		pkg.Image = req.Image
	}
	if req.Images != "" {
		pkg.Images = req.Images
	}
	if err := validatePackagePickup(pkg); err != nil {
		return nil, err
	}
	if pkg.Status == "Aktif" {
		if err := validateActivePackage(pkg); err != nil {
			return nil, err
		}
	}

	if !models.IsOpenTrip(pkg.TripType) && (req.AvailableDates != nil || previousStart != pkg.StartDate || previousEnd != pkg.EndDate || previousType != pkg.TripType) {
		dates := []string{}
		if req.AvailableDates != nil {
			dates = *req.AvailableDates
		} else {
			return nil, packageValidationErrorf("sertakan tanggal availability saat mengubah periode atau tipe paket")
		}
		if err := validateOfferedDates(pkg, dates); err != nil {
			return nil, err
		}
		pkg.AvailableDates = append([]string{}, dates...)
	}

	err = s.repo.Update(pkg)
	if err != nil {
		var conflict *repositories.AvailabilityConflictError
		if errors.As(err, &conflict) {
			return nil, packageValidationErrorf("%s", conflict.Message)
		}
		return nil, err
	}

	return pkg, nil
}

func validateBookingLimits(pkg *models.Package) error {
	if pkg.MinGuests < 1 || pkg.MaxGuests < pkg.MinGuests || pkg.MaxGuests > pkg.QuotaMax {
		return packageValidationErrorf("batas peserta per booking harus minimal 1, maksimum tidak boleh di bawah minimum atau melebihi kuota maksimal")
	}
	return nil
}

func validateActivePackage(pkg *models.Package) error {
	if strings.TrimSpace(pkg.Name) == "" || strings.TrimSpace(pkg.Destination) == "" ||
		strings.TrimSpace(pkg.Category) == "" ||
		strings.TrimSpace(pkg.TripType) == "" || strings.TrimSpace(pkg.Description) == "" {
		return packageValidationErrorf("nama, destinasi, kategori, tipe trip, dan deskripsi wajib diisi sebelum paket diaktifkan")
	}
	if err := validatePackagePickup(pkg); err != nil {
		return err
	}
	if pkg.Price <= 0 {
		return packageValidationErrorf("harga paket aktif harus lebih besar dari 0")
	}
	if pkg.Duration <= 0 {
		return packageValidationErrorf("durasi paket aktif minimal 1 hari")
	}
	if pkg.QuotaMax <= 0 {
		return packageValidationErrorf("kuota maksimal paket aktif harus minimal 1 peserta")
	}
	if models.IsOpenTrip(pkg.TripType) && (pkg.QuotaMin <= 0 || pkg.QuotaMax < pkg.QuotaMin) {
		return packageValidationErrorf("kuota minimal Open Trip harus valid, minimal 1 peserta, dan tidak melebihi kuota maksimal")
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
	if models.IsOpenTrip(pkg.TripType) && len(pkg.OpenTripDates()) == 0 {
		return packageValidationErrorf("pilih minimal satu tanggal keberangkatan Open Trip sebelum paket diaktifkan")
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

// A submitted date list is authoritative; an empty list closes all dates.
func validateOfferedDates(pkg *models.Package, dates []string) error {
	today, latest := models.AvailabilityWindow(time.Now())
	if pkg.EndDate > latest {
		return packageValidationErrorf("periode paket maksimal tiga bulan ke depan (sampai %s)", latest)
	}
	start, startErr := time.Parse("2006-01-02", pkg.StartDate)
	end, endErr := time.Parse("2006-01-02", pkg.EndDate)
	if startErr != nil || endErr != nil || start.AddDate(0, 0, normalizedTripDuration(pkg.Duration)-1).After(end) {
		return packageValidationErrorf("rentang tanggal harus cukup untuk seluruh durasi perjalanan")
	}
	if len(dates) > models.MaxAvailabilityDates {
		return packageValidationErrorf("terlalu banyak tanggal")
	}
	for _, day := range dates {
		if _, err := time.Parse("2006-01-02", day); err != nil || day < today || day > latest || day < pkg.StartDate || day > pkg.EndDate {
			return packageValidationErrorf("tanggal %s di luar periode paket atau batas tiga bulan", day)
		}
	}
	return nil
}
