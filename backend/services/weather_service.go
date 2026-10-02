package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"tripkita-provider/config"
)

var ErrWeatherServiceDisabled = errors.New("Weather API belum dikonfigurasi")

// WeatherForecast adalah snapshot ringkas yang aman ditampilkan sebagai bahan
// pertimbangan. IsAdverse hanya menonjolkan potensi risiko; sistem tidak pernah
// mengubah booking berdasarkan nilai ini tanpa keputusan provider.
type WeatherForecast struct {
	Location     string
	Condition    string
	MinTempC     float64
	MaxTempC     float64
	RainChance   int
	PrecipMM     float64
	MaxWindKPH   float64
	IsAdverse    bool
	Advisory     string
	ForecastedAt time.Time
}

type WeatherService interface {
	Forecast(ctx context.Context, location string, date time.Time) (*WeatherForecast, error)
}

type weatherAPIService struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

func NewWeatherService(cfg *config.Config) WeatherService {
	return &weatherAPIService{
		apiKey:  strings.TrimSpace(cfg.WeatherAPIKey),
		baseURL: strings.TrimRight(cfg.WeatherAPIBaseURL, "/"),
		client:  &http.Client{Timeout: 12 * time.Second},
	}
}

type weatherAPIResponse struct {
	Location struct {
		Name    string `json:"name"`
		Region  string `json:"region"`
		Country string `json:"country"`
	} `json:"location"`
	Forecast struct {
		ForecastDay []struct {
			Date string `json:"date"`
			Day  struct {
				MinTempC          float64 `json:"mintemp_c"`
				MaxTempC          float64 `json:"maxtemp_c"`
				MaxWindKPH        float64 `json:"maxwind_kph"`
				TotalPrecipMM     float64 `json:"totalprecip_mm"`
				DailyWillItRain   int     `json:"daily_will_it_rain"`
				DailyChanceOfRain int     `json:"daily_chance_of_rain"`
				Condition         struct {
					Text string `json:"text"`
					Code int    `json:"code"`
				} `json:"condition"`
			} `json:"day"`
		} `json:"forecastday"`
	} `json:"forecast"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (s *weatherAPIService) Forecast(ctx context.Context, location string, date time.Time) (*WeatherForecast, error) {
	if s.apiKey == "" {
		return nil, ErrWeatherServiceDisabled
	}
	location = strings.TrimSpace(location)
	if location == "" {
		return nil, errors.New("lokasi trip belum tersedia")
	}

	endpoint, err := url.Parse(s.baseURL + "/forecast.json")
	if err != nil {
		return nil, fmt.Errorf("Weather API URL tidak valid: %w", err)
	}
	query := endpoint.Query()
	query.Set("key", s.apiKey)
	queryLocation := location
	if !strings.Contains(strings.ToLower(location), "indonesia") {
		queryLocation += ", Indonesia"
	}
	query.Set("q", queryLocation)
	query.Set("dt", date.Format("2006-01-02"))
	query.Set("days", "1")
	query.Set("aqi", "no")
	query.Set("alerts", "no")
	query.Set("lang", "id")
	endpoint.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Weather API tidak dapat dihubungi: %w", err)
	}
	defer resp.Body.Close()

	var payload weatherAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("respons Weather API tidak valid: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		message := http.StatusText(resp.StatusCode)
		if payload.Error != nil && strings.TrimSpace(payload.Error.Message) != "" {
			message = payload.Error.Message
		}
		return nil, fmt.Errorf("Weather API merespons %d: %s", resp.StatusCode, message)
	}
	if len(payload.Forecast.ForecastDay) == 0 {
		return nil, errors.New("Weather API tidak mengembalikan prakiraan untuk tanggal trip")
	}

	day := payload.Forecast.ForecastDay[0].Day
	condition := strings.TrimSpace(day.Condition.Text)
	isAdverse := adverseWeather(day.DailyWillItRain, day.DailyChanceOfRain, day.TotalPrecipMM, day.MaxWindKPH, condition)
	advisory := "Prakiraan tidak menunjukkan indikator cuaca buruk utama. Tetap pantau pembaruan resmi menjelang keberangkatan."
	if isAdverse {
		advisory = "Terdapat kemungkinan cuaca kurang mendukung. Tinjau kondisi lapangan dan pilih tetap berangkat, reschedule, atau batalkan trip."
	}

	parts := make([]string, 0, 3)
	for _, part := range []string{payload.Location.Name, payload.Location.Region, payload.Location.Country} {
		if strings.TrimSpace(part) != "" {
			parts = append(parts, strings.TrimSpace(part))
		}
	}
	return &WeatherForecast{
		Location:     strings.Join(parts, ", "),
		Condition:    condition,
		MinTempC:     day.MinTempC,
		MaxTempC:     day.MaxTempC,
		RainChance:   day.DailyChanceOfRain,
		PrecipMM:     day.TotalPrecipMM,
		MaxWindKPH:   day.MaxWindKPH,
		IsAdverse:    isAdverse,
		Advisory:     advisory,
		ForecastedAt: time.Now().UTC(),
	}, nil
}

func adverseWeather(willRain, rainChance int, precipMM, maxWindKPH float64, condition string) bool {
	text := strings.ToLower(condition)
	keywords := []string{"badai", "petir", "hujan lebat", "hujan deras", "torrential", "thunder", "storm", "blizzard", "hail"}
	for _, keyword := range keywords {
		if strings.Contains(text, keyword) {
			return true
		}
	}
	return (willRain == 1 && rainChance >= 60) || rainChance >= 70 || precipMM >= 10 || maxWindKPH >= 40
}
