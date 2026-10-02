package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
)

func newTestGeocodingService(url string, client *http.Client) *geocodingAPIService {
	return &geocodingAPIService{
		baseURL:   url,
		userAgent: "TemenTrip-Test/1.0",
		client:    client,
		cache:     make(map[string]GeocodingSearchResult),
	}
}

func TestGeocodingSearchMapsAndCachesResult(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if r.URL.Path != "/search" || r.URL.Query().Get("q") != "Alun Alun Bandung, Jawa Barat" {
			t.Fatalf("request geocoding tidak sesuai: %s", r.URL.String())
		}
		if r.URL.Query().Get("countrycodes") != "id" || r.URL.Query().Get("limit") != "5" {
			t.Fatalf("parameter pembatas pencarian tidak sesuai: %v", r.URL.Query())
		}
		if r.Header.Get("User-Agent") != "TemenTrip-Test/1.0" {
			t.Fatalf("User-Agent tidak mengidentifikasi aplikasi: %q", r.Header.Get("User-Agent"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"display_name":"Alun-Alun Bandung, Jawa Barat, Indonesia","lat":"-6.9218","lon":"107.6071","boundingbox":["-6.9225","-6.9210","107.6065","107.6078"]},{"display_name":"Alun-Alun lain","lat":"x","lon":"107"}]`))
	}))
	defer server.Close()

	service := newTestGeocodingService(server.URL, server.Client())
	for i := 0; i < 2; i++ {
		result, err := service.Search(context.Background(), "  Alun Alun Bandung,   Jawa Barat ")
		if err != nil {
			t.Fatalf("Search() error: %v", err)
		}
		if result.DisplayName != "Alun-Alun Bandung, Jawa Barat, Indonesia" || result.Latitude != -6.9218 || result.Longitude != 107.6071 {
			t.Fatalf("hasil geocoding salah: %+v", result)
		}
		if result.Approximate || len(result.Results) != 1 || *result.BoundingBox != [4]float64{-6.9225, -6.9210, 107.6065, 107.6078} {
			t.Fatalf("hasil tepat harus tanpa perkiraan dan membawa bounding box: %+v", result)
		}
	}
	if requests != 1 {
		t.Fatalf("hasil yang sama harus berasal dari cache, requests=%d", requests)
	}
}

func TestGeocodingSearchFallsBackToRegionWhenPlaceIsMissing(t *testing.T) {
	const (
		street = `{"display_name":"Jalan Veteran, Tanamodindi, Palu, Sulawesi Tengah, Indonesia","lat":"-0.8988","lon":"119.8953","place_rank":26}`
		shop   = `{"display_name":"Alfamidi, Jalan Sis Aljufri, Palu","lat":"-0.9035","lon":"119.8580","place_rank":30}`
		road   = `{"display_name":"Jalan Margonda, Depok, Jawa Barat, Indonesia","lat":"-6.3730","lon":"106.8346","place_rank":26}`
	)
	tests := []struct {
		address   string
		responses map[string]string
		matched   string
		latitude  float64
		queries   []string
	}{
		{
			address:   "ALFAMIDI VETERAN 2 PALU",
			responses: map[string]string{"VETERAN PALU": "[" + shop + "," + street + "]"},
			matched:   "VETERAN PALU",
			latitude:  -0.8988,
			queries:   []string{"ALFAMIDI VETERAN 2 PALU", "ALFAMIDI VETERAN PALU", "VETERAN PALU"},
		},
		{
			// Potongan nama tempat yang hanya cocok dengan tempat lain dilewati.
			address:   "Margo City, Jalan Margonda, Depok",
			responses: map[string]string{"City, Jalan Margonda, Depok": "[" + shop + "]", "Jalan Margonda, Depok": "[" + road + "]"},
			matched:   "Jalan Margonda, Depok",
			latitude:  -6.3730,
			queries:   []string{"Margo City, Jalan Margonda, Depok", "City, Jalan Margonda, Depok", "Jalan Margonda, Depok"},
		},
	}
	for _, tt := range tests {
		var queries []string
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			q := r.URL.Query().Get("q")
			queries = append(queries, q)
			w.Header().Set("Content-Type", "application/json")
			if response, ok := tt.responses[q]; ok {
				_, _ = w.Write([]byte(response))
				return
			}
			_, _ = w.Write([]byte(`[]`))
		}))

		result, err := newTestGeocodingService(server.URL, server.Client()).Search(context.Background(), tt.address)
		server.Close()
		if err != nil {
			t.Fatalf("Search(%q) error: %v", tt.address, err)
		}
		if !result.Approximate || result.MatchedQuery != tt.matched || result.Latitude != tt.latitude || len(result.Results) != 1 {
			t.Fatalf("alamat %q harus diarahkan ke perkiraan wilayahnya: %+v", tt.address, result)
		}
		if !reflect.DeepEqual(queries, tt.queries) {
			t.Fatalf("urutan pelonggaran %q salah: got %q want %q", tt.address, queries, tt.queries)
		}
	}
}

func TestGeocodingCandidatesLoosenFromTheFront(t *testing.T) {
	type candidate = geocodingCandidate
	tests := map[string][]candidate{
		"ALFAMIDI VETERAN 2 PALU": {
			{"ALFAMIDI VETERAN 2 PALU", false}, {"ALFAMIDI VETERAN PALU", false},
			{"VETERAN PALU", true}, {"PALU", true},
		},
		"Jl. Veteran No. 2, Kel. Tanamodindi, Palu 94234": {
			{"Jl. Veteran No. 2, Kel. Tanamodindi, Palu 94234", false}, {"Jalan Veteran, Tanamodindi, Palu", false},
			{"Veteran, Tanamodindi, Palu", true}, {"Tanamodindi, Palu", true}, {"Palu", true},
		},
		"Taman Kota Luwuk Sulawesi Tengah": {
			{"Taman Kota Luwuk Sulawesi Tengah", false}, {"Kota Luwuk Sulawesi Tengah", true},
			{"Luwuk Sulawesi Tengah", true}, {"Sulawesi Tengah", true},
		},
		// Kandidat berlebih dipangkas, tetapi wilayah paling longgar tetap dicoba.
		"Alfamidi Jl 17 Agustus Kota Palu": {
			{"Alfamidi Jl 17 Agustus Kota Palu", false}, {"Alfamidi Jalan 17 Agustus Kota Palu", false},
			{"Jalan 17 Agustus Kota Palu", true}, {"Agustus Kota Palu", true}, {"Palu", true},
		},
	}
	for address, want := range tests {
		if got := geocodingCandidates(address); !reflect.DeepEqual(got, want) {
			t.Errorf("geocodingCandidates(%q)\n got %v\nwant %v", address, got, want)
		}
	}
}

func TestGeocodingSearchRejectsInvalidAndCachesMissingAddress(t *testing.T) {
	service := newTestGeocodingService("", nil)
	if _, err := service.Search(context.Background(), "x"); err != ErrInvalidGeocodingAddress {
		t.Fatalf("alamat terlalu pendek harus ditolak, got %v", err)
	}

	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests++
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[]`))
	}))
	defer server.Close()
	service = newTestGeocodingService(server.URL, server.Client())
	for i := 0; i < 2; i++ {
		if _, err := service.Search(context.Background(), "Alamat yang tidak ada"); err != ErrGeocodingResultNotFound {
			t.Fatalf("hasil kosong harus menjadi ErrGeocodingResultNotFound, got %v", err)
		}
	}
	if requests == 0 || requests > maxGeocodingAttempts {
		t.Fatalf("pelonggaran harus dibatasi dan hasil kosong di-cache, requests=%d", requests)
	}
}
