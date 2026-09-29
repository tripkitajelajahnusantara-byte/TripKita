package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGeocodingSearchMapsAndCachesResult(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if r.URL.Path != "/search" || r.URL.Query().Get("q") != "Alun Alun Bandung, Jawa Barat" {
			t.Fatalf("request geocoding tidak sesuai: %s", r.URL.String())
		}
		if r.URL.Query().Get("countrycodes") != "id" || r.URL.Query().Get("limit") != "1" {
			t.Fatalf("parameter pembatas pencarian tidak sesuai: %v", r.URL.Query())
		}
		if r.Header.Get("User-Agent") != "TemenTrip-Test/1.0" {
			t.Fatalf("User-Agent tidak mengidentifikasi aplikasi: %q", r.Header.Get("User-Agent"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"display_name":"Alun-Alun Bandung, Jawa Barat, Indonesia","lat":"-6.9218","lon":"107.6071"}]`))
	}))
	defer server.Close()

	service := &geocodingAPIService{
		baseURL:   server.URL,
		userAgent: "TemenTrip-Test/1.0",
		client:    server.Client(),
		cache:     make(map[string]GeocodingResult),
	}
	for i := 0; i < 2; i++ {
		result, err := service.Search(context.Background(), "  Alun Alun Bandung,   Jawa Barat ")
		if err != nil {
			t.Fatalf("Search() error: %v", err)
		}
		if result.DisplayName != "Alun-Alun Bandung, Jawa Barat, Indonesia" || result.Latitude != -6.9218 || result.Longitude != 107.6071 {
			t.Fatalf("hasil geocoding salah: %+v", result)
		}
	}
	if requests != 1 {
		t.Fatalf("hasil yang sama harus berasal dari cache, requests=%d", requests)
	}
}

func TestGeocodingSearchRejectsInvalidAndMissingAddress(t *testing.T) {
	service := &geocodingAPIService{cache: make(map[string]GeocodingResult)}
	if _, err := service.Search(context.Background(), "x"); err != ErrInvalidGeocodingAddress {
		t.Fatalf("alamat terlalu pendek harus ditolak, got %v", err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[]`))
	}))
	defer server.Close()
	service = &geocodingAPIService{
		baseURL:   server.URL,
		userAgent: "TemenTrip-Test/1.0",
		client:    server.Client(),
		cache:     make(map[string]GeocodingResult),
	}
	if _, err := service.Search(context.Background(), "Alamat yang tidak ada"); err != ErrGeocodingResultNotFound {
		t.Fatalf("hasil kosong harus menjadi ErrGeocodingResultNotFound, got %v", err)
	}
}
