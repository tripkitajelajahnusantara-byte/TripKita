package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestWeatherAPIForecastMapsAdverseWeather(t *testing.T) {
	tripDate := time.Now().AddDate(0, 0, 3)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/forecast.json" {
			t.Fatalf("path=%q, ingin /forecast.json", r.URL.Path)
		}
		query := r.URL.Query()
		if query.Get("key") != "test-key" || query.Get("q") != "Bogor, Jawa Barat, Indonesia" {
			t.Fatalf("query Weather API tidak sesuai: %v", query)
		}
		if query.Get("dt") != tripDate.Format("2006-01-02") {
			t.Fatalf("dt=%q", query.Get("dt"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
          "location":{"name":"Bogor","region":"Jawa Barat","country":"Indonesia"},
          "forecast":{"forecastday":[{"date":"2026-09-30","day":{
            "mintemp_c":21.4,"maxtemp_c":27.8,"maxwind_kph":43.2,
            "totalprecip_mm":18.5,"daily_will_it_rain":1,"daily_chance_of_rain":85,
            "condition":{"text":"Hujan lebat disertai petir","code":1276}
          }}]}
        }`))
	}))
	defer server.Close()

	service := &weatherAPIService{
		apiKey:  "test-key",
		baseURL: server.URL,
		client:  server.Client(),
	}
	forecast, err := service.Forecast(context.Background(), "Bogor, Jawa Barat", tripDate)
	if err != nil {
		t.Fatalf("Forecast() error: %v", err)
	}
	if !forecast.IsAdverse {
		t.Fatal("hujan lebat, peluang 85%, dan angin 43.2 km/jam harus ditandai kurang mendukung")
	}
	if forecast.Location != "Bogor, Jawa Barat, Indonesia" || forecast.RainChance != 85 {
		t.Fatalf("snapshot salah: %+v", forecast)
	}
}

func TestAdverseWeatherThresholds(t *testing.T) {
	tests := []struct {
		name       string
		willRain   int
		rainChance int
		precipMM   float64
		windKPH    float64
		condition  string
		want       bool
	}{
		{"cerah", 0, 15, 0.2, 12, "Cerah berawan", false},
		{"peluang hujan tinggi", 1, 65, 4, 18, "Hujan ringan", true},
		{"curah hujan tinggi", 1, 45, 12, 20, "Hujan", true},
		{"angin kuat", 0, 10, 0, 41, "Cerah", true},
		{"kata badai", 0, 20, 1, 10, "Badai petir", true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := adverseWeather(test.willRain, test.rainChance, test.precipMM, test.windKPH, test.condition); got != test.want {
				t.Fatalf("adverseWeather()=%v, ingin %v", got, test.want)
			}
		})
	}
}

func TestWeatherServiceDisabledWithoutKey(t *testing.T) {
	service := &weatherAPIService{baseURL: "https://api.weatherapi.com/v1", client: http.DefaultClient}
	_, err := service.Forecast(context.Background(), "Bali", time.Now().AddDate(0, 0, 3))
	if err != ErrWeatherServiceDisabled {
		t.Fatalf("error=%v, ingin ErrWeatherServiceDisabled", err)
	}
}
