package config

import (
	"strings"
	"testing"
)

// validProductionEnv adalah baseline environment production yang lolos
// validasi; setiap test mengubah satu nilai untuk menguji satu aturan.
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
		"XENDIT_SECRET_KEY":    "xnd_production_abc123",
		"XENDIT_WEBHOOK_TOKEN": "callback-token-value",
		"SMTP_HOST":            "smtp.example.com",
		"SMTP_PORT":            "587",
		"SMTP_USER":            "mailer",
		"SMTP_PASS":            "mailer-password",
		"SMTP_FROM":            "no-reply@example.com",
	}
}

func loadWith(t *testing.T, env map[string]string) (*Config, error) {
	t.Helper()
	// Env dibersihkan supaya nilai dari mesin developer tidak membocor ke test.
	for _, key := range []string{
		"APP_ENV", "PORT", "DATABASE_URL", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD",
		"DB_NAME", "DB_SSLMODE", "DB_MAX_OPEN_CONNS", "DB_MAX_IDLE_CONNS", "JWT_SECRET",
		"FRONTEND_URL", "BACKEND_URL", "ALLOWED_ORIGINS", "TRUSTED_PROXIES",
		"GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI",
		"XENDIT_SECRET_KEY", "XENDIT_API_KEY", "XENDIT_WEBHOOK_TOKEN",
		"SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM",
		"RUN_MIGRATIONS", "SEED_DB", "ENABLE_DEV_MOCKS", "ENABLE_BACKGROUND_JOBS",
		"ENABLE_AUTOMATIC_PAYOUT", "XENDIT_PAYOUT_WEBHOOK_TOKEN",
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

func TestProductionRejectsUnsafeValues(t *testing.T) {
	cases := []struct {
		name    string
		mutate  func(map[string]string)
		wantSub string
	}{
		{"jwt secret terlalu pendek", func(e map[string]string) { e["JWT_SECRET"] = "pendek" }, "JWT_SECRET"},
		{"jwt secret mudah ditebak", func(e map[string]string) { e["JWT_SECRET"] = strings.Repeat("ab", 20) }, "JWT_SECRET"},
		{"nilai contoh belum diganti", func(e map[string]string) { e["XENDIT_WEBHOOK_TOKEN"] = "replace-with-token" }, "nilai contoh"},
		{"database tanpa TLS", func(e map[string]string) {
			e["DATABASE_URL"] = "postgres://u:p@db.example.com:5432/tripkita?sslmode=disable"
		}, "TLS"},
		{"frontend bukan https", func(e map[string]string) { e["FRONTEND_URL"] = "http://app.example.com" }, "HTTPS"},
		{"origin memakai path", func(e map[string]string) { e["ALLOWED_ORIGINS"] = "https://app.example.com/app" }, "ALLOWED_ORIGINS"},
		{"smtp from bukan email", func(e map[string]string) { e["SMTP_FROM"] = "Tim TemenTrip" }, "SMTP_FROM"},
		{"webhook token kosong", func(e map[string]string) { e["XENDIT_WEBHOOK_TOKEN"] = "" }, "XENDIT_WEBHOOK_TOKEN"},
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

// Mock checkout dan seeding tidak boleh bisa dinyalakan di production, berapa
// pun nilai environment yang diberikan operator.
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
}

// Pencairan otomatis memindahkan uang sungguhan, jadi harus mati kecuali
// dinyalakan secara eksplisit.
func TestAutomaticPayoutIsOffByDefault(t *testing.T) {
	cfg, err := loadWith(t, validProductionEnv())
	if err != nil {
		t.Fatalf("konfigurasi ditolak: %v", err)
	}
	if cfg.EnableAutoPayout {
		t.Error("ENABLE_AUTOMATIC_PAYOUT harus default false")
	}
}

// Tanpa token callback, status pencairan tidak pernah dapat dikonfirmasi dan
// dana akan menggantung di status PROCESSING, jadi konfigurasinya ditolak.
func TestAutomaticPayoutRequiresCallbackToken(t *testing.T) {
	env := validProductionEnv()
	env["ENABLE_AUTOMATIC_PAYOUT"] = "true"
	env["XENDIT_WEBHOOK_TOKEN"] = "callback-token-value"

	cfg, err := loadWith(t, env)
	if err != nil {
		t.Fatalf("token webhook invoice seharusnya dipakai sebagai cadangan: %v", err)
	}
	if !cfg.EnableAutoPayout || cfg.XenditPayoutToken != "callback-token-value" {
		t.Errorf("token cadangan tidak terpakai: aktif=%v token=%q", cfg.EnableAutoPayout, cfg.XenditPayoutToken)
	}
}
