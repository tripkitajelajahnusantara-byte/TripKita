package services

import (
	"errors"
	"testing"

	"gorm.io/gorm"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type packageMemoryRepo struct {
	repositories.PackageRepository
	source  models.Package
	saved   *models.Package
	saveErr error
}

func (r *packageMemoryRepo) FindByIDAndProvider(id, providerID uint) (*models.Package, error) {
	if id != r.source.ID || providerID != r.source.ProviderID {
		return nil, gorm.ErrRecordNotFound
	}
	copy := r.source
	return &copy, nil
}

func (r *packageMemoryRepo) Create(pkg *models.Package) error {
	if r.saveErr != nil {
		return r.saveErr
	}
	copy := *pkg
	r.saved = &copy
	pkg.ID = r.source.ID + 1
	return nil
}

func (r *packageMemoryRepo) Update(pkg *models.Package) error {
	if r.saveErr != nil {
		return r.saveErr
	}
	copy := *pkg
	r.saved = &copy
	return nil
}

func TestCreatePackageBookingMaximumFollowsQuota(t *testing.T) {
	for _, status := range []string{"Draft", "Aktif"} {
		for _, staleMax := range []int{0, 10, 50} {
			repo := &packageMemoryRepo{}
			s := &packageService{repo: repo}
			p := validActivePackage()
			pkg, err := s.CreatePackage(7, &models.CreatePackageRequest{
				Name: p.Name, Destination: p.Destination, MeetingPoint: p.MeetingPoint,
				MeetingPointLat: p.MeetingPointLat, MeetingPointLng: p.MeetingPointLng,
				Category: p.Category, TripType: p.TripType, Description: p.Description,
				Price: p.Price, Duration: p.Duration, QuotaMin: 7, QuotaMax: 35,
				StartDate: p.StartDate, EndDate: p.EndDate, MinGuests: 1, MaxGuests: staleMax, Status: status,
			})
			if err != nil || pkg.MaxGuests != 35 || repo.saved.MaxGuests != 35 {
				t.Fatalf("%s, max %d: pkg=%+v err=%v", status, staleMax, pkg, err)
			}
		}
	}
}

func TestUpdatePackageBookingLimits(t *testing.T) {
	for _, tc := range []struct {
		name             string
		minimum, maximum int
		request          models.UpdatePackageRequest
		wantMin, wantMax int
		wantError        bool
	}{
		{name: "quota raised", minimum: 1, maximum: 10, request: models.UpdatePackageRequest{QuotaMax: intPtr(35)}, wantMin: 1, wantMax: 35},
		{name: "quota lowered", minimum: 1, maximum: 10, request: models.UpdatePackageRequest{QuotaMax: intPtr(7)}, wantMin: 1, wantMax: 7},
		{name: "minimum unchecked", minimum: 3, maximum: 5, request: models.UpdatePackageRequest{MinGuests: intPtr(1)}, wantMin: 1, wantMax: 10},
		{name: "custom limits retained", minimum: 3, maximum: 5, request: models.UpdatePackageRequest{QuotaMax: intPtr(35)}, wantMin: 3, wantMax: 5},
		{name: "custom max exceeds quota", minimum: 3, maximum: 8, request: models.UpdatePackageRequest{QuotaMax: intPtr(7)}, wantError: true},
		{name: "max below minimum", minimum: 3, maximum: 5, request: models.UpdatePackageRequest{MaxGuests: intPtr(2)}, wantError: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := validActivePackage()
			p.ID, p.ProviderID, p.MinGuests, p.MaxGuests = 3, 7, tc.minimum, tc.maximum
			repo := &packageMemoryRepo{source: *p}
			s := &packageService{repo: repo}
			pkg, err := s.UpdatePackage(3, 7, &tc.request)
			if tc.wantError {
				var validation *PackageValidationError
				if !errors.As(err, &validation) || repo.saved != nil {
					t.Fatalf("invalid limits persisted: %+v, %v", repo.saved, err)
				}
				return
			}
			if err != nil || pkg.MinGuests != tc.wantMin || pkg.MaxGuests != tc.wantMax || repo.saved.MaxGuests != tc.wantMax {
				t.Fatalf("limits not persisted: %+v, %v", pkg, err)
			}
		})
	}
}

func intPtr(value int) *int { return &value }

func TestLegacyPackagesExposeConsistentBookingLimits(t *testing.T) {
	s := &packageService{}
	packages, err := s.attachDates([]models.Package{
		{MinGuests: 0, MaxGuests: 10, QuotaMax: 35},
		{MinGuests: 1, MaxGuests: 5, QuotaMax: 35},
		{MinGuests: 3, MaxGuests: 5, QuotaMax: 35},
	})
	if err != nil || packages[0].MinGuests != 1 || packages[0].MaxGuests != 35 || packages[1].MaxGuests != 35 || packages[2].MaxGuests != 5 {
		t.Fatalf("incorrect legacy limits: %+v %v", packages, err)
	}
}
