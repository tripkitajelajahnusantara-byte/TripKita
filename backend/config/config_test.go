package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func validProductionEnv() map[string]string {
	return map[string]string{
		"APP_ENV":              "production",
		"PORT":                 "8080",
		"DATABASE_URL":         "postgres://tripkita:s3cret@db.example.com:5432/tripkita?sslmode=require",
		"JWT_SECRET":           "9f2b7c41ae6d05938bd14c7ea2f6091d",
		"FRONTEND_URL":         "https://app.example.com",
		"BACKEND_URL":          "https://api.example.com",
		"ALLOWED_ORIGINS":      "https://app.example.com",
		"GOOGLE_CLIENT_ID":     "1234.apps.googleusercontent.com",
		"GOOGLE_CLIENT_SECRET": "google-secret-value",
		"GOOGLE_REDIRECT_URI":  "https://api.example.com/api/v1/public/auth/google/callback",
		"IPAYMU_VA":            "0000000813208875",
		"IPAYMU_API_KEY":       "production-secret-443ff47c",
		"IPAYMU_BASE_URL":      "https://my.ipaymu.com/api/v2",
		"SMTP_HOST":            "smtp.example.com",
		"SMTP_PORT":            "587",
		"SMTP_USER":            "mailer",
		"SMTP_PASS":            "mailer-password",
		"SMTP_FROM":            "no-reply@example.com",
		"UPLOAD_DIR":           filepath.Join(os.TempDir(), "tripkita-uploads"),

		"MANUAL_PAYMENT_BANK_NAME":      "BCA",
		"MANUAL_PAYMENT_ACCOUNT_NUMBER": "1234567890",
		"MANUAL_PAYMENT_ACCOUNT_HOLDER": "PT Contoh Wisata",
	}
}

func loadWith(t *testing.T, env map[string]string) (*Config, error) {
	t.Helper()
	for _, key := range []string{
		"APP_ENV", "PORT", "DATABASE_URL", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD",
		"DB_NAME", "DB_SSLMODE", "DB_MAX_OPEN_CONNS", "DB_MAX_IDLE_CONNS", "JWT_SECRET",
		"FRONTEND_URL", "BACKEND_URL", "ALLOWED_ORIGINS", "TRUSTED_PROXIES",
		"GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI",
		"IPAYMU_VA", "IPAYMU_API_KEY", "IPAYMU_BASE_URL", "IPAYMU_CALLBACK_URL", "IPAYMU_RETURN_URL", "IPAYMU_CANCEL_URL",
		"SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM",
		"WEATHER_API_KEY", "WEATHER_API_BASE_URL", "GEOCODING_API_BASE_URL",
		"RUN_MIGRATIONS", "SEED_DB", "ENABLE_DEV_MOCKS", "ENABLE_BACKGROUND_JOBS",
		"ENABLE_AUTOMATIC_PAYOUT", "UPLOAD_DIR", "RAILWAY_VOLUME_MOUNT_PATH",
		"MANUAL_PAYMENT_BANK_NAME", "MANUAL_PAYMENT_ACCOUNT_NUMBER", "MANUAL_PAYMENT_ACCOUNT_HOLDER",
		"EMAIL_API_PROVIDER", "EMAIL_API_KEY", "EMAIL_FROM", "BREVO_API_KEY", "RESEND_API_KEY",
	} {
		t.Setenv(key, "")
	}
	for key, value := range env {
		t.Setenv(key, value)
	}
	return LoadConfig()
}

func TestLoadConfigAcceptsValidProductionEnv(t *testing.T) {
	cfg, err := loadWith(t, validProductionEnv())
	if err != nil {
		t.Fatalf("konfigurasi production yang valid ditolak: %v", err)
	}
	if !cfg.IsProduction() {
		t.Error("APP_ENV=production seharusnya menghasilkan IsProduction() true")
	}
	if cfg.DBMaxOpenConns != 25 || cfg.DBMaxIdleConns != 10 {
		t.Errorf("default pool tidak sesuai: open=%d idle=%d", cfg.DBMaxOpenConns, cfg.DBMaxIdleConns)
	}
}

func TestProductionUsesRailwayVolumeMountPath(t *testing.T) {
	env := validProductionEnv()
	delete(env, "UPLOAD_DIR")
	want := filepath.Join(os.TempDir(), "railway-tripkita-volume")
	env["RAILWAY_VOLUME_MOUNT_PATH"] = want

	cfg, err := loadWith(t, env)
	if err != nil {
		t.Fatalf("mount path otomatis Railway ditolak: %v", err)
	}
	if cfg.DocumentUploadDir() != want {
		t.Fatalf("upload dir=%q, ingin %q", cfg.DocumentUploadDir(), want)
	}
}

func TestProductionRejectsUnsafeValues(t *testing.T) {
	cases := []struct {
		name    string
		mutate  func(map[string]string)
		wantSub string
	}{
		{"jwt secret terlalu pendek", func(e map[string]string) { e["JWT_SECRET"] = "pendek" }, "JWT_SECRET"},
		{"jwt secret mudah ditebak", func(e map[string]string) { e["JWT_SECRET"] = strings.Repeat("ab", 20) }, "JWT_SECRET"},
		{"nilai contoh belum diganti", func(e map[string]string) { e["SMTP_PASS"] = "replace-with-password" }, "nilai contoh"},
		{"database tanpa TLS", func(e map[string]string) {
			e["DATABASE_URL"] = "postgres://u:p@db.example.com:5432/tripkita?sslmode=disable"
		}, "TLS"},
		{"frontend bukan https", func(e map[string]string) { e["FRONTEND_URL"] = "http://app.example.com" }, "HTTPS"},
		{"geocoder bukan https", func(e map[string]string) { e["GEOCODING_API_BASE_URL"] = "http://geocoder.example.com" }, "GEOCODING_API_BASE_URL"},
		{"redirect google beda origin", func(e map[string]string) {
			e["GOOGLE_REDIRECT_URI"] = "https://other-api.example.com/api/v1/public/auth/google/callback"
		}, "BACKEND_URL"},
		{"redirect google salah path", func(e map[string]string) {
			e["GOOGLE_REDIRECT_URI"] = "https://api.example.com/oauth/callback"
		}, "GOOGLE_REDIRECT_URI"},
		{"origin memakai path", func(e map[string]string) { e["ALLOWED_ORIGINS"] = "https://app.example.com/app" }, "ALLOWED_ORIGINS"},
		{"smtp from bukan email", func(e map[string]string) { e["SMTP_FROM"] = "Tim TemenTrip" }, "SMTP_FROM"},
		{"rekening pembayaran manual kosong", func(e map[string]string) { e["MANUAL_PAYMENT_ACCOUNT_NUMBER"] = "" }, "MANUAL_PAYMENT_ACCOUNT_NUMBER"},
		{"nama bank pembayaran manual kosong", func(e map[string]string) { e["MANUAL_PAYMENT_BANK_NAME"] = "" }, "MANUAL_PAYMENT_BANK_NAME"},
		{"payout otomatis belum terintegrasi", func(e map[string]string) { e["ENABLE_AUTOMATIC_PAYOUT"] = "true" }, "ENABLE_AUTOMATIC_PAYOUT"},
		{"upload dir kosong", func(e map[string]string) { e["UPLOAD_DIR"] = "" }, "UPLOAD_DIR"},
		{"upload dir relatif", func(e map[string]string) { e["UPLOAD_DIR"] = "uploads" }, "path absolut"},
		{"pool idle melebihi open", func(e map[string]string) {
			e["DB_MAX_OPEN_CONNS"] = "5"
			e["DB_MAX_IDLE_CONNS"] = "10"
		}, "DB_MAX_IDLE_CONNS"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			env := validProductionEnv()
			tc.mutate(env)
			_, err := loadWith(t, env)
			if err == nil {
				t.Fatal("konfigurasi tidak aman seharusnya ditolak")
			}
			if !strings.Contains(err.Error(), tc.wantSub) {
				t.Errorf("pesan error %q tidak menyebut %q", err.Error(), tc.wantSub)
			}
		})
	}
}

func TestProductionForcesDevFlagsOff(t *testing.T) {
	env := validProductionEnv()
	env["ENABLE_DEV_MOCKS"] = "true"
	env["SEED_DB"] = "true"
	env["RUN_MIGRATIONS"] = ""

	cfg, err := loadWith(t, env)
	if err != nil {
		t.Fatalf("konfigurasi ditolak: %v", err)
	}
	if cfg.EnableDevMocks {
		t.Error("ENABLE_DEV_MOCKS harus dipaksa false di production")
	}
	if cfg.SeedDatabase {
		t.Error("SEED_DB harus dipaksa false di production")
	}
	if cfg.RunMigrations {
		t.Error("RUN_MIGRATIONS harus default false di production")
	}
}

func TestDevelopmentDefaultsStayUsable(t *testing.T) {
	cfg, err := loadWith(t, map[string]string{
		"APP_ENV":     "development",
		"JWT_SECRET":  "9f2b7c41ae6d05938bd14c7ea2f6091d",
		"DB_PASSWORD": "local-password",
	})
	if err != nil {
		t.Fatalf("konfigurasi development ditolak: %v", err)
	}
	if !cfg.RunMigrations {
		t.Error("RUN_MIGRATIONS harus default true di luar production")
	}
	if cfg.Port != "8080" {
		t.Errorf("PORT default tidak sesuai: %s", cfg.Port)
	}
	if cfg.WeatherAPIBaseURL != "https://api.weatherapi.com/v1" {
		t.Errorf("WEATHER_API_BASE_URL default tidak sesuai: %s", cfg.WeatherAPIBaseURL)
	}
	if cfg.GeocodingAPIBaseURL != "https://nominatim.openstreetmap.org" {
		t.Errorf("GEOCODING_API_BASE_URL default tidak sesuai: %s", cfg.GeocodingAPIBaseURL)
	}
}

func TestSMTPFromDefaultsToAuthenticatedUser(t *testing.T) {
	cfg, err := loadWith(t, map[string]string{
		"APP_ENV":     "development",
		"DB_HOST":     "localhost",
		"DB_USER":     "u",
		"DB_PASSWORD": "p",
		"DB_NAME":     "d",
		"JWT_SECRET":  "9f2b7c41ae6d05938bd14c7ea2f6091d",
		"SMTP_USER":   "mailer@example.com",
		"SMTP_PASS":   "valid-secret-1234",
	})
	if err != nil {
		t.Fatalf("konfigurasi development ditolak: %v", err)
	}
	if cfg.SMTPFrom != "mailer@example.com" {
		t.Fatalf("SMTP_FROM=%q, ingin fallback ke SMTP_USER", cfg.SMTPFrom)
	}
}

func TestDevelopmentRejectsPlaceholderSMTPPassword(t *testing.T) {
	_, err := loadWith(t, map[string]string{
		"APP_ENV":     "development",
		"DB_HOST":     "localhost",
		"DB_USER":     "u",
		"DB_PASSWORD": "p",
		"DB_NAME":     "d",
		"JWT_SECRET":  "9f2b7c41ae6d05938bd14c7ea2f6091d",
		"SMTP_USER":   "mailer@example.com",
		"SMTP_PASS":   "your-16-digit-app-password",
		"SMTP_FROM":   "mailer@example.com",
	})
	if err == nil || !strings.Contains(err.Error(), "App Password SMTP") {
		t.Fatalf("SMTP placeholder seharusnya ditolak dengan petunjuk yang jelas, dapat %v", err)
	}
}

func TestAutomaticPayoutIsOffByDefault(t *testing.T) {
	cfg, err := loadWith(t, validProductionEnv())
	if err != nil {
		t.Fatalf("konfigurasi ditolak: %v", err)
	}
	if cfg.EnableAutoPayout {
		t.Error("ENABLE_AUTOMATIC_PAYOUT harus default false")
	}
}

func TestManualPaymentAccountRequiresBankAndHolder(t *testing.T) {
	_, err := loadWith(t, map[string]string{
		"APP_ENV": "development", "DB_HOST": "localhost", "DB_USER": "u", "DB_PASSWORD": "p", "DB_NAME": "d",
		"JWT_SECRET":                    "9f2b7c41ae6d05938bd14c7ea2f6091d",
		"MANUAL_PAYMENT_ACCOUNT_NUMBER": "1234567890",
	})
	if err == nil || !strings.Contains(err.Error(), "MANUAL_PAYMENT_BANK_NAME") {
		t.Fatalf("rekening tanpa nama bank seharusnya ditolak, dapat %v", err)
	}
}

func TestProductionAcceptsEmailAPIWithoutSMTP(t *testing.T) {
	env := validProductionEnv()
	delete(env, "SMTP_USER")
	delete(env, "SMTP_PASS")
	env["EMAIL_API_PROVIDER"] = "brevo"
	env["EMAIL_API_KEY"] = "xkeysib-test-key"
	env["EMAIL_FROM"] = "no-reply@example.com"
	cfg, err := loadWith(t, env)
	if err != nil {
		t.Fatalf("production dengan API email seharusnya valid: %v", err)
	}
	if !cfg.UsesEmailAPI() || cfg.SMTPFrom != "no-reply@example.com" {
		t.Fatalf("konfigurasi API email tidak terbaca: provider=%q from=%q", cfg.EmailAPIProvider, cfg.SMTPFrom)
	}

	env["EMAIL_API_KEY"] = ""
	if _, err := loadWith(t, env); err == nil || !strings.Contains(err.Error(), "EMAIL_API_KEY") {
		t.Fatalf("API email tanpa key seharusnya ditolak, dapat %v", err)
	}
}

func TestEmailAPIKeysSelectHTTPSAndIgnoreUnusedSMTPPlaceholder(t *testing.T) {
	for _, tc := range []struct{ key, value, provider string }{
		{"BREVO_API_KEY", "xkeysib-valid-test", "brevo"},
		{"RESEND_API_KEY", "re_valid-test", "resend"},
		{"EMAIL_API_KEY", "xkeysib-valid-test", "brevo"},
		{"EMAIL_API_KEY", "re_valid-test", "resend"},
	} {
		t.Run(tc.key+tc.provider, func(t *testing.T) {
			env := validProductionEnv()
			env[tc.key] = tc.value
			env["SMTP_PASS"] = "your-16-digit-app-password"
			cfg, err := loadWith(t, env)
			if err != nil {
				t.Fatal(err)
			}
			if cfg.EmailAPIProvider != tc.provider || cfg.EmailAPIKey != tc.value {
				t.Fatal("HTTPS transport was not selected")
			}
		})
	}
}

func TestUnknownEmailAPIKeyCannotFallBackToSMTP(t *testing.T) {
	env := validProductionEnv()
	env["EMAIL_API_KEY"] = "unrecognized-key"
	if _, err := loadWith(t, env); err == nil || !strings.Contains(err.Error(), "EMAIL_API_PROVIDER") {
		t.Fatalf("unexpected error: %v", err)
	}
}
