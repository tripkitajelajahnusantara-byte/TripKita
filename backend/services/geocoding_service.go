package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"tripkita-provider/config"
)

var (
	ErrInvalidGeocodingAddress = errors.New("alamat pencarian tidak valid")
	ErrGeocodingResultNotFound = errors.New("alamat tidak ditemukan")
)

const (
	// Satu pencarian boleh melonggarkan alamat beberapa kali, tetapi tetap
	// dibatasi karena Nominatim publik hanya mengizinkan satu request per detik.
	maxGeocodingAttempts = 5
	geocodingResultLimit = 5
	geocodingTimeout     = 20 * time.Second
	// Place rank Nominatim: 26-27 jalan, di bawahnya kelurahan hingga provinsi,
	// di atasnya gedung/toko/rumah.
	maxApproximatePlaceRank = 27
)

type GeocodingResult struct {
	DisplayName string  `json:"displayName"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	// BoundingBox berurutan [selatan, utara, barat, timur] agar peta dapat
	// menampilkan seluruh wilayah hasil (kota, jalan, atau gedung).
	BoundingBox *[4]float64 `json:"boundingBox,omitempty"`
}

// GeocodingSearchResult tetap menyertakan field hasil pertama di tingkat atas
// agar klien lama yang hanya membaca displayName/latitude/longitude tetap jalan.
type GeocodingSearchResult struct {
	GeocodingResult
	Results []GeocodingResult `json:"results"`
	// Approximate bernilai true bila alamat lengkap tidak ditemukan dan hasil
	// berasal dari pencarian yang dilonggarkan, misalnya jalan atau kotanya saja.
	Approximate  bool   `json:"approximate"`
	MatchedQuery string `json:"matchedQuery"`
}

type GeocodingService interface {
	Search(ctx context.Context, address string) (*GeocodingSearchResult, error)
}

type geocodingAPIService struct {
	baseURL     string
	userAgent   string
	client      *http.Client
	minInterval time.Duration

	// requestMu menjalankan request ke geocoder satu per satu dengan jarak
	// minimal minInterval sesuai kebijakan penggunaan Nominatim publik.
	requestMu   sync.Mutex
	lastRequest time.Time

	cacheMu sync.Mutex
	// Hasil kosong juga disimpan agar alamat yang tidak ditemukan tidak
	// memicu rangkaian request pelonggaran berulang kali.
	cache map[string]GeocodingSearchResult
}

type nominatimResult struct {
	DisplayName string   `json:"display_name"`
	Latitude    string   `json:"lat"`
	Longitude   string   `json:"lon"`
	BoundingBox []string `json:"boundingbox"`
	PlaceRank   int      `json:"place_rank"`
}

type geocodingCandidate struct {
	query       string
	approximate bool
}

var (
	geocodingAbbreviations = []struct {
		pattern     *regexp.Regexp
		replacement string
	}{
		{regexp.MustCompile(`(?i)\b(?:jl|jln)\b\.?\s*`), "Jalan "},
		{regexp.MustCompile(`(?i)\bgg\b\.?\s*`), "Gang "},
		{regexp.MustCompile(`(?i)\bkec\b\.?\s*`), "Kecamatan "},
		{regexp.MustCompile(`(?i)\bkab\b\.?\s*`), "Kabupaten "},
	}
	// Nomor rumah, RT/RW, dan kode pos jarang tercatat di OpenStreetMap
	// Indonesia, sedangkan Nominatim mewajibkan setiap kata cocok. Awalan
	// kelurahan/desa/provinsi juga tidak menjadi bagian nama wilayah di OSM.
	geocodingHouseNumber   = regexp.MustCompile(`(?i)\b(?:no|nomor|nmr|rt|rw|km)\b\.?\s*\d[\w/.\-]*`)
	geocodingNumberWord    = regexp.MustCompile(`^\d[\d/.\-]*[a-zA-Z]?\.?$`)
	geocodingRegionPrefix  = regexp.MustCompile(`(?i)\b(?:kelurahan|kel|desa|ds|provinsi|prov)\b\.?\s*`)
	geocodingSpaceComma    = regexp.MustCompile(`\s*,[\s,]*`)
	geocodingStreetWords   = map[string]bool{"jalan": true, "gang": true}
	geocodingDanglingWords = map[string]bool{
		// Kata-kata ini biasanya penutup nama wilayah (mis. "Sulawesi Tengah")
		// sehingga bila tersisa di awal pencarian, hasilnya wilayah lain.
		"utara": true, "selatan": true, "barat": true, "timur": true, "tengah": true,
		"tenggara": true, "daya": true, "laut": true, "raya": true, "baru": true,
		"lama": true, "jaya": true, "indah": true, "permai": true, "besar": true,
		"kecil": true, "atas": true, "bawah": true, "dalam": true, "luar": true,
		"muka": true, "hilir": true, "hulu": true,
	}
)

func NewGeocodingService(cfg *config.Config) GeocodingService {
	baseURL := strings.TrimRight(strings.TrimSpace(cfg.GeocodingAPIBaseURL), "/")
	if baseURL == "" {
		baseURL = "https://nominatim.openstreetmap.org"
	}
	appURL := strings.TrimSpace(cfg.FrontendURL)
	if appURL == "" {
		appURL = "https://tementrip.id"
	}
	return &geocodingAPIService{
		baseURL:     baseURL,
		userAgent:   fmt.Sprintf("TemenTrip/1.0 (+%s)", appURL),
		client:      &http.Client{Timeout: 10 * time.Second},
		minInterval: time.Second,
		cache:       make(map[string]GeocodingSearchResult),
	}
}

func (s *geocodingAPIService) Search(ctx context.Context, address string) (*GeocodingSearchResult, error) {
	address = strings.Join(strings.Fields(address), " ")
	if len(address) < 3 || len(address) > 300 {
		return nil, ErrInvalidGeocodingAddress
	}
	cacheKey := strings.ToLower(address)
	if cached, ok := s.cached(cacheKey); ok {
		if len(cached.Results) == 0 {
			return nil, ErrGeocodingResultNotFound
		}
		return cached, nil
	}

	ctx, cancel := context.WithTimeout(ctx, geocodingTimeout)
	defer cancel()
	for _, candidate := range geocodingCandidates(address) {
		results, err := s.query(ctx, candidate.query, candidate.approximate)
		if err != nil {
			return nil, err
		}
		if len(results) == 0 {
			continue
		}
		result := GeocodingSearchResult{
			GeocodingResult: results[0],
			Results:         results,
			Approximate:     candidate.approximate,
			MatchedQuery:    candidate.query,
		}
		s.store(cacheKey, result)
		return &result, nil
	}
	s.store(cacheKey, GeocodingSearchResult{})
	return nil, ErrGeocodingResultNotFound
}

// geocodingCandidates menyusun alamat dari yang paling spesifik hingga yang
// paling longgar. Bagian terdepan biasanya nama tempat/cabang yang belum ada
// di OSM, sedangkan bagian belakang berisi jalan, kota, dan provinsi. Karena
// yang dibuang selalu bagian depan, hasil longgar tetap berada di wilayah
// yang disebut pengguna.
func geocodingCandidates(address string) []geocodingCandidate {
	var candidates []geocodingCandidate
	seen := map[string]bool{}
	add := func(query string, approximate bool) {
		query = tidyGeocodingQuery(query)
		key := strings.ToLower(query)
		if len(query) < 3 || seen[key] {
			return
		}
		if first := strings.Trim(strings.Fields(key)[0], ","); approximate && (geocodingDanglingWords[first] || geocodingNumberWord.MatchString(first)) {
			return
		}
		seen[key] = true
		candidates = append(candidates, geocodingCandidate{query: query, approximate: approximate})
	}

	add(address, false)
	cleaned := cleanGeocodingAddress(address)
	add(cleaned, false)

	var segments []string
	for _, segment := range strings.Split(cleaned, ",") {
		if segment = strings.TrimSpace(segment); segment != "" {
			segments = append(segments, segment)
		}
	}
	if len(segments) > 1 {
		rest := strings.Join(segments[1:], ", ")
		words := strings.Fields(segments[0])
		for i := 1; i < len(words); i++ {
			add(strings.Join(words[i:], " ")+", "+rest, true)
		}
		for i := 1; i < len(segments); i++ {
			add(strings.Join(segments[i:], ", "), true)
		}
	} else {
		words := strings.Fields(cleaned)
		for i := 1; i < len(words); i++ {
			add(strings.Join(words[i:], " "), true)
		}
	}

	// Bila kandidat melebihi batas, pertahankan yang paling longgar (biasanya
	// kota atau provinsi) supaya peta tetap bisa diarahkan ke wilayahnya.
	if len(candidates) > maxGeocodingAttempts {
		candidates = append(candidates[:maxGeocodingAttempts-1], candidates[len(candidates)-1])
	}
	return candidates
}

func cleanGeocodingAddress(address string) string {
	for _, abbreviation := range geocodingAbbreviations {
		address = abbreviation.pattern.ReplaceAllString(address, abbreviation.replacement)
	}
	address = geocodingHouseNumber.ReplaceAllString(address, " ")
	address = geocodingRegionPrefix.ReplaceAllString(address, " ")
	segments := strings.Split(address, ",")
	for i, segment := range segments {
		words := strings.Fields(segment)
		kept := make([]string, 0, len(words))
		for j, word := range words {
			// Angka lepas biasanya nomor cabang/rumah atau kode pos, kecuali
			// tepat setelah "Jalan"/"Gang" (mis. Jalan 17 Agustus).
			if geocodingNumberWord.MatchString(word) && (j == 0 || !geocodingStreetWords[strings.ToLower(words[j-1])]) {
				continue
			}
			kept = append(kept, word)
		}
		segments[i] = strings.Join(kept, " ")
	}
	return tidyGeocodingQuery(strings.Join(segments, ", "))
}

func tidyGeocodingQuery(query string) string {
	query = geocodingSpaceComma.ReplaceAllString(query, ", ")
	query = strings.Join(strings.Fields(query), " ")
	return strings.Trim(query, ", ")
}

// query dengan areasOnly hanya mengembalikan jalan dan wilayah. Potongan nama
// tempat (mis. "City" dari "Margo City") dapat cocok dengan tempat lain yang
// tidak berhubungan, sehingga hasil longgar tidak boleh berupa tempat spesifik.
func (s *geocodingAPIService) query(ctx context.Context, address string, areasOnly bool) ([]GeocodingResult, error) {
	endpoint, err := url.Parse(s.baseURL + "/search")
	if err != nil {
		return nil, fmt.Errorf("URL geocoder tidak valid: %w", err)
	}
	query := endpoint.Query()
	query.Set("q", address)
	query.Set("format", "jsonv2")
	query.Set("limit", strconv.Itoa(geocodingResultLimit))
	query.Set("countrycodes", "id")
	query.Set("addressdetails", "1")
	query.Set("accept-language", "id")
	endpoint.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", s.userAgent)
	req.Header.Set("Accept", "application/json")

	s.requestMu.Lock()
	defer s.requestMu.Unlock()
	if wait := time.Until(s.lastRequest.Add(s.minInterval)); wait > 0 {
		timer := time.NewTimer(wait)
		defer timer.Stop()
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-timer.C:
		}
	}
	s.lastRequest = time.Now()
	response, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("layanan pencarian alamat tidak dapat dihubungi: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("layanan pencarian alamat merespons %d", response.StatusCode)
	}

	var payload []nominatimResult
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&payload); err != nil {
		return nil, fmt.Errorf("respons pencarian alamat tidak valid: %w", err)
	}
	results := make([]GeocodingResult, 0, len(payload))
	valid := 0
	for _, item := range payload {
		latitude, latErr := strconv.ParseFloat(item.Latitude, 64)
		longitude, lngErr := strconv.ParseFloat(item.Longitude, 64)
		if latErr != nil || lngErr != nil || !validGeocodingPoint(latitude, longitude) {
			continue
		}
		valid++
		if areasOnly && item.PlaceRank > maxApproximatePlaceRank {
			continue
		}
		result := GeocodingResult{
			DisplayName: strings.TrimSpace(item.DisplayName),
			Latitude:    latitude,
			Longitude:   longitude,
			BoundingBox: parseGeocodingBoundingBox(item.BoundingBox),
		}
		if result.DisplayName == "" {
			result.DisplayName = address
		}
		results = append(results, result)
	}
	if len(payload) > 0 && valid == 0 {
		return nil, errors.New("koordinat hasil pencarian tidak valid")
	}
	return results, nil
}

func parseGeocodingBoundingBox(raw []string) *[4]float64 {
	if len(raw) != 4 {
		return nil
	}
	var box [4]float64
	for i, value := range raw {
		parsed, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return nil
		}
		box[i] = parsed
	}
	if !validGeocodingPoint(box[0], box[2]) || !validGeocodingPoint(box[1], box[3]) || box[0] > box[1] || box[2] > box[3] {
		return nil
	}
	return &box
}

func validGeocodingPoint(latitude, longitude float64) bool {
	return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

func (s *geocodingAPIService) cached(key string) (*GeocodingSearchResult, bool) {
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()
	cached, ok := s.cache[key]
	if !ok {
		return nil, false
	}
	cached.Results = slices.Clone(cached.Results)
	return &cached, true
}

func (s *geocodingAPIService) store(key string, result GeocodingSearchResult) {
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()
	if len(s.cache) >= 500 {
		clear(s.cache)
	}
	result.Results = slices.Clone(result.Results)
	s.cache[key] = result
}
