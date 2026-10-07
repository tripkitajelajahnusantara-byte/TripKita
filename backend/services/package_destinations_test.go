package services

import (
	"errors"
	"reflect"
	"strings"
	"testing"

	"tripkita-provider/models"
)

func TestNormalizePackageDestinations(t *testing.T) {
	got, err := normalizePackageDestinations([]string{"  Pulau   Padar ", "Pink Beach", "pulau padar", "Pulau Komodo"})
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"Pulau Padar", "Pink Beach", "Pulau Komodo"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("destinasi harus dirapikan, unik, dan urut rute: got %q want %q", got, want)
	}

	if got, err := normalizePackageDestinations(nil); err != nil || len(got) != 0 {
		t.Fatalf("daftar kosong harus diterima: %q, %v", got, err)
	}

	tooMany := make([]string, maxPackageDestinations+1)
	for i := range tooMany {
		tooMany[i] = "Tempat " + strings.Repeat("x", i+1)
	}
	for name, input := range map[string][]string{
		"empty":     {"Pulau Padar", "   "},
		"too short": {"A"},
		"too long":  {strings.Repeat("a", maxPackageDestinationRunes+1)},
		"too many":  tooMany,
	} {
		t.Run(name, func(t *testing.T) {
			var validation *PackageValidationError
			if _, err := normalizePackageDestinations(input); !errors.As(err, &validation) {
				t.Fatalf("input tidak valid harus ditolak sebagai validasi, got %v", err)
			}
		})
	}
}

func TestCreatePackageStoresDestinations(t *testing.T) {
	repo := &packageMemoryRepo{}
	s := &packageService{repo: repo}
	p := validActivePackage()
	pkg, err := s.CreatePackage(7, &models.CreatePackageRequest{
		Name: p.Name, Destination: "Nusa Tenggara Timur", Destinations: []string{" Pulau Padar", "Pink Beach ", "PINK BEACH"},
		Category: p.Category, TripType: p.TripType, Description: p.Description,
		Price: p.Price, Duration: p.Duration, QuotaMin: 1, QuotaMax: 10,
		StartDate: p.StartDate, EndDate: p.EndDate, MinGuests: 1, Status: "Draft",
	})
	want := []string{"Pulau Padar", "Pink Beach"}
	if err != nil || !reflect.DeepEqual(pkg.Destinations, want) || !reflect.DeepEqual(repo.saved.Destinations, want) {
		t.Fatalf("destinasi tidak tersimpan rapi: pkg=%+v err=%v", pkg, err)
	}
}

func TestUpdatePackageDestinations(t *testing.T) {
	existing := []string{"Pulau Padar", "Pink Beach"}
	for _, tc := range []struct {
		name    string
		request *[]string
		want    []string
	}{
		{name: "omitted keeps existing", request: nil, want: existing},
		{name: "replaced in new order", request: &[]string{"Pink Beach", "Pulau Komodo"}, want: []string{"Pink Beach", "Pulau Komodo"}},
		{name: "empty list clears", request: &[]string{}, want: []string{}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := validActivePackage()
			p.ID, p.ProviderID, p.Destinations = 3, 7, existing
			repo := &packageMemoryRepo{source: *p}
			s := &packageService{repo: repo}
			pkg, err := s.UpdatePackage(3, 7, &models.UpdatePackageRequest{Destinations: tc.request})
			if err != nil || !reflect.DeepEqual(pkg.Destinations, tc.want) || !reflect.DeepEqual(repo.saved.Destinations, tc.want) {
				t.Fatalf("destinasi tidak sesuai: pkg=%q err=%v", pkg.Destinations, err)
			}
		})
	}

	p := validActivePackage()
	p.ID, p.ProviderID, p.Destinations = 3, 7, existing
	repo := &packageMemoryRepo{source: *p}
	s := &packageService{repo: repo}
	var validation *PackageValidationError
	if _, err := s.UpdatePackage(3, 7, &models.UpdatePackageRequest{Destinations: &[]string{" "}}); !errors.As(err, &validation) || repo.saved != nil {
		t.Fatalf("destinasi kosong tidak boleh tersimpan: saved=%+v err=%v", repo.saved, err)
	}
}
