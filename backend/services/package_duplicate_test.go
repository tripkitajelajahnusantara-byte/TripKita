package services

import (
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"

	"gorm.io/gorm"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type duplicateDateRepo struct {
	repositories.PackageDateRepository
	rows []models.PackageDate
	err  error
}

func (r *duplicateDateRepo) ListByPackage(id uint) ([]models.PackageDate, error) {
	return r.rows, r.err
}

func TestDuplicateCopiesDefinitionWithoutCopyingBookingState(t *testing.T) {
	source := validActivePackage()
	source.ID, source.ProviderID, source.QuotaUsed, source.Rating = 3, 7, 8, 4.9
	source.Schedule = "Jumat sampai Minggu"
	source.Itinerary = `[{"day":1,"activities":[{"time":"07:00","title":"Berangkat"}]}]`
	source.IncludedFacilities, source.ExcludedFacilities = "Transport\nMakan", "Pengeluaran pribadi"
	source.Image, source.Images = "https://example.com/one.jpg", "https://example.com/one.jpg,https://example.com/two.jpg"
	source.CreatedAt, source.UpdatedAt = time.Now().Add(-time.Hour), time.Now()
	source.AvailableDates, source.BookedDates, source.ConfiguredDates = []string{"2026-10-01"}, []string{"2026-10-02"}, []string{"2026-10-01"}
	repo := &packageMemoryRepo{source: *source}
	s := &packageService{repo: repo}
	copy, err := s.DuplicatePackage(3, 7)
	if err != nil {
		t.Fatal(err)
	}
	if copy.ID == source.ID || repo.saved.ID != 0 || copy.Status != "Draft" || copy.QuotaUsed != 0 || copy.Rating != 0 || !copy.CreatedAt.IsZero() || !copy.UpdatedAt.IsZero() || copy.DeletedAt.Valid {
		t.Fatalf("source lifecycle copied: %+v", copy)
	}
	if len(copy.BookedDates) != 0 || len(copy.AvailableDates) != 0 || len(copy.ConfiguredDates) != 0 {
		t.Fatal("Open Trip inherited calendar state")
	}
	// All definition fields, including photos, pin, itinerary, ages and prices,
	// survive; only the documented identity/booking fields differ.
	expected := *source
	expected.ID, expected.Name, expected.Status = copy.ID, source.Name+" (Salinan)", "Draft"
	expected.QuotaUsed, expected.Rating, expected.MaxGuests = 0, 0, source.QuotaMax
	expected.CreatedAt, expected.UpdatedAt = time.Time{}, time.Time{}
	expected.AvailableDates, expected.BookedDates, expected.ConfiguredDates = nil, nil, nil
	if !reflect.DeepEqual(*copy, expected) || !reflect.DeepEqual(repo.source, *source) {
		t.Fatalf("definition changed or original mutated: %+v", copy)
	}
}

func TestDuplicateOnlyCopiesConfiguredDatesInCurrentWindow(t *testing.T) {
	now := time.Now().In(models.BookingLocation)
	today, latest := models.AvailabilityWindow(now)
	tomorrow := now.AddDate(0, 0, 1).Format("2006-01-02")
	source := models.Package{ID: 3, ProviderID: 7, TripType: "Private Trip", StartDate: today, EndDate: latest, QuotaMax: 10}
	bookingID := uint(9)
	dates := &duplicateDateRepo{rows: []models.PackageDate{
		{Date: today, Origin: models.PackageDateOriginProvider, Status: models.PackageDateOpen},
		{Date: tomorrow, Origin: models.PackageDateOriginProvider, Status: models.PackageDateBooked, BookingID: &bookingID},
		{Date: now.AddDate(0, 0, -1).Format("2006-01-02"), Origin: models.PackageDateOriginProvider},
		{Date: now.AddDate(1, 0, 0).Format("2006-01-02"), Origin: models.PackageDateOriginProvider},
		{Date: today, Origin: models.PackageDateOriginAuto},
	}}
	repo := &packageMemoryRepo{source: source}
	s := &packageService{repo: repo, dateRepo: dates}
	copy, err := s.DuplicatePackage(3, 7)
	if err != nil || !reflect.DeepEqual(copy.AvailableDates, []string{today, tomorrow}) || len(copy.BookedDates) != 0 {
		t.Fatalf("unexpected dates on duplicate: %+v, %v", copy, err)
	}
}

func TestDuplicateRejectsOtherProvidersAndMissingPackages(t *testing.T) {
	for _, ids := range [][2]uint{{3, 99}, {99, 7}} {
		repo := &packageMemoryRepo{source: models.Package{ID: 3, ProviderID: 7}}
		s := &packageService{repo: repo}
		if _, err := s.DuplicatePackage(ids[0], ids[1]); !errors.Is(err, gorm.ErrRecordNotFound) || repo.saved != nil {
			t.Fatalf("unauthorized duplicate: %v", err)
		}
	}
}

func TestDuplicatePropagatesReadAndWriteFailures(t *testing.T) {
	failure := errors.New("database unavailable")
	for _, readFailure := range []bool{false, true} {
		repo := &packageMemoryRepo{source: models.Package{ID: 3, ProviderID: 7, TripType: "Private Trip"}}
		dates := &duplicateDateRepo{}
		if readFailure {
			dates.err = failure
		} else {
			repo.saveErr = failure
		}
		s := &packageService{repo: repo, dateRepo: dates}
		if _, err := s.DuplicatePackage(3, 7); !errors.Is(err, failure) || repo.saved != nil {
			t.Fatalf("failed duplication reported success: %v", err)
		}
	}
}

func TestDuplicateLongUnicodeNameCanBeSaved(t *testing.T) {
	repo := &packageMemoryRepo{source: models.Package{ID: 3, ProviderID: 7, TripType: "Open Trip", Name: strings.Repeat("界", 255)}}
	s := &packageService{repo: repo}
	copy, err := s.DuplicatePackage(3, 7)
	if err != nil || len([]rune(copy.Name)) != 255 || !strings.HasSuffix(copy.Name, " (Salinan)") {
		t.Fatalf("invalid copied name: %+v, %v", copy, err)
	}
}
