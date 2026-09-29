package services

import (
	"encoding/json"
	"strings"
	"testing"

	"tripkita-provider/models"
)

func validActivePackage() *models.Package {
	lat, lng := -6.175392, 106.827153
	return &models.Package{
		Name: "Paket Uji", Destination: "Bali", MeetingPoint: "Bandara",
		MeetingPointLat: &lat, MeetingPointLng: &lng,
		Category: "Pantai", TripType: "Open Trip", Description: "Deskripsi paket",
		Price: 100000, Duration: 2, QuotaMin: 1, QuotaMax: 10,
		MinGuests: 1, MaxGuests: 5, MinAge: 0, MaxAge: 70,
		StartDate: "2026-10-01", EndDate: "2026-10-02", Status: "Aktif",
	}
}

func TestValidateActivePackageRejectsPKG02Values(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*models.Package)
		want   string
	}{
		{"empty category", func(p *models.Package) { p.Category = "" }, "wajib diisi"},
		{"missing pin", func(p *models.Package) { p.MeetingPointLat, p.MeetingPointLng = nil, nil }, "pin titik kumpul"},
		{"invalid latitude", func(p *models.Package) { invalid := 91.0; p.MeetingPointLat = &invalid }, "latitude"},
		{"zero price", func(p *models.Package) { p.Price = 0 }, "harga"},
		{"zero duration", func(p *models.Package) { p.Duration = 0 }, "durasi"},
		{"zero quota", func(p *models.Package) { p.QuotaMax = 0 }, "kuota"},
		{"negative age", func(p *models.Package) { p.MinAge = -1 }, "umur"},
		{"reversed dates", func(p *models.Package) { p.EndDate = "2026-09-30" }, "tanggal selesai"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			pkg := validActivePackage()
			tc.mutate(pkg)
			err := validateActivePackage(pkg)
			if err == nil || !strings.Contains(strings.ToLower(err.Error()), tc.want) {
				t.Fatalf("nilai invalid harus ditolak dengan pesan %q, got %v", tc.want, err)
			}
		})
	}
}

func TestValidateActivePackageAcceptsValidValues(t *testing.T) {
	if err := validateActivePackage(validActivePackage()); err != nil {
		t.Fatalf("paket valid ditolak: %v", err)
	}
}

func TestQuotaMinimumOnlyAppliesToOpenTrip(t *testing.T) {
	if got := quotaMinimumForTripType("Private Trip", 8); got != 0 {
		t.Fatalf("kuota minimum non-Open-Trip harus dinolkan, got %d", got)
	}
	if got := quotaMinimumForTripType(" open   trip ", 8); got != 8 {
		t.Fatalf("kuota minimum Open Trip harus dipertahankan, got %d", got)
	}

	nonOpenTrip := validActivePackage()
	nonOpenTrip.TripType = "Private Trip"
	nonOpenTrip.QuotaMin = 0
	if err := validateActivePackage(nonOpenTrip); err != nil {
		t.Fatalf("paket non-Open-Trip tanpa kuota minimum harus valid: %v", err)
	}

	openTrip := validActivePackage()
	openTrip.QuotaMin = 0
	if err := validateActivePackage(openTrip); err == nil || !strings.Contains(err.Error(), "kuota minimal Open Trip") {
		t.Fatalf("Open Trip tanpa kuota minimum harus ditolak, got %v", err)
	}
}

func TestUpdatePackageRequestDistinguishesZeroFromOmitted(t *testing.T) {
	var withZero models.UpdatePackageRequest
	if err := json.Unmarshal([]byte(`{"price":0,"duration":0,"category":""}`), &withZero); err != nil {
		t.Fatal(err)
	}
	if withZero.Price == nil || *withZero.Price != 0 || withZero.Duration == nil || *withZero.Duration != 0 || withZero.Category == nil {
		t.Fatal("nilai nol/kosong yang dikirim harus tetap terdeteksi sebagai field update")
	}

	var omitted models.UpdatePackageRequest
	if err := json.Unmarshal([]byte(`{"status":"Aktif"}`), &omitted); err != nil {
		t.Fatal(err)
	}
	if omitted.Price != nil || omitted.Duration != nil || omitted.Category != nil {
		t.Fatal("field yang tidak dikirim harus tetap nil agar update status tidak menimpa data")
	}
}
