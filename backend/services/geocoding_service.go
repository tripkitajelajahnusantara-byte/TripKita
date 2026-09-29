package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
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

type GeocodingResult struct {
	DisplayName string  `json:"displayName"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
}

type GeocodingService interface {
	Search(ctx context.Context, address string) (*GeocodingResult, error)
}

type geocodingAPIService struct {
	baseURL   string
	userAgent string
	client    *http.Client

	mu          sync.Mutex
	lastRequest time.Time
	cache       map[string]GeocodingResult
}

type nominatimResult struct {
	DisplayName string `json:"display_name"`
	Latitude    string `json:"lat"`
	Longitude   string `json:"lon"`
}

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
		baseURL:   baseURL,
		userAgent: fmt.Sprintf("TemenTrip/1.0 (+%s)", appURL),
		client:    &http.Client{Timeout: 10 * time.Second},
		cache:     make(map[string]GeocodingResult),
	}
}

func (s *geocodingAPIService) Search(ctx context.Context, address string) (*GeocodingResult, error) {
	address = strings.Join(strings.Fields(address), " ")
	if len(address) < 3 || len(address) > 300 {
		return nil, ErrInvalidGeocodingAddress
	}
	cacheKey := strings.ToLower(address)

	// Nominatim publik membatasi aplikasi pada satu request per detik. Mutex ini
	// sekaligus mencegah dua request cache-miss berjalan bersamaan.
	s.mu.Lock()
	defer s.mu.Unlock()
	if cached, ok := s.cache[cacheKey]; ok {
		copy := cached
		return &copy, nil
	}
	if wait := time.Until(s.lastRequest.Add(time.Second)); wait > 0 {
		timer := time.NewTimer(wait)
		defer timer.Stop()
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-timer.C:
		}
	}

	endpoint, err := url.Parse(s.baseURL + "/search")
	if err != nil {
		return nil, fmt.Errorf("URL geocoder tidak valid: %w", err)
	}
	query := endpoint.Query()
	query.Set("q", address)
	query.Set("format", "jsonv2")
	query.Set("limit", "1")
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
	if len(payload) == 0 {
		return nil, ErrGeocodingResultNotFound
	}
	latitude, latErr := strconv.ParseFloat(payload[0].Latitude, 64)
	longitude, lngErr := strconv.ParseFloat(payload[0].Longitude, 64)
	if latErr != nil || lngErr != nil || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 {
		return nil, errors.New("koordinat hasil pencarian tidak valid")
	}
	result := GeocodingResult{
		DisplayName: strings.TrimSpace(payload[0].DisplayName),
		Latitude:    latitude,
		Longitude:   longitude,
	}
	if result.DisplayName == "" {
		result.DisplayName = address
	}
	if len(s.cache) >= 500 {
		clear(s.cache)
	}
	s.cache[cacheKey] = result
	return &result, nil
}
