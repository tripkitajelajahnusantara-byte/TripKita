package config

import (
	"fmt"
	"log"
	"net/mail"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv             string
	Port               string
	DatabaseURL        string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPass             string
	DBName             string
	DBSSLMode          string
	JWTSecret          string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURI  string
	FrontendURL        string
	BackendURL         string
	IPaymuVA           string
	IPaymuAPIKey       string
	IPaymuBaseURL      string
	IPaymuCallbackURL  string
	IPaymuReturnURL    string
	IPaymuCancelURL    string
	SMTPHost           string
	SMTPPort           string
	SMTPUser           string
	SMTPPass           string
	SMTPFrom           string
	AllowedOrigins     []string
	TrustedProxies     []string
	EnableDevMocks     bool
	RunMigrations      bool
	SeedDatabase       bool
	EnableJobs         bool
	DBMaxOpenConns     int
	DBMaxIdleConns     int
	EnableAutoPayout   bool
}

func LoadConfig() (*Config, error) {
	// Try loading .env. If it fails, we assume env variables are set manually.
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on system environment variables")
	}

	appEnv := strings.ToLower(getEnv("APP_ENV", "development"))
	isProduction := appEnv == "production"

	cfg := &Config{
		AppEnv:             appEnv,
		Port:               getEnv("PORT", "8080"),
		DatabaseURL:        getEnv("DATABASE_URL", ""),
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBPort:             getEnv("DB_PORT", "5432"),
		DBUser:             getEnv("DB_USER", "postgres"),
		DBPass:             getEnv("DB_PASSWORD", ""),
		DBName:             getEnv("DB_NAME", "tripkita_provider"),
		DBSSLMode:          getEnv("DB_SSLMODE", "disable"),
		JWTSecret:          getEnv("JWT_SECRET", ""),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURI:  getEnv("GOOGLE_REDIRECT_URI", "http://localhost:8080/api/v1/public/auth/google/callback"),
		FrontendURL:        strings.TrimRight(getEnv("FRONTEND_URL", "http://localhost:5173"), "/"),
		BackendURL:         strings.TrimRight(getEnv("BACKEND_URL", "http://localhost:8080"), "/"),
		IPaymuVA:           getEnv("IPAYMU_VA", "0000000813208875"),
		IPaymuAPIKey:       getEnv("IPAYMU_API_KEY", ""),
		IPaymuBaseURL:      getEnv("IPAYMU_BASE_URL", "https://sandbox.ipaymu.com/api/v2"),
		IPaymuCallbackURL:  getEnv("IPAYMU_CALLBACK_URL", ""),
		IPaymuReturnURL:    getEnv("IPAYMU_RETURN_URL", ""),
		IPaymuCancelURL:    getEnv("IPAYMU_CANCEL_URL", ""),
		SMTPHost:           getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:           getEnv("SMTP_PORT", "587"),
		SMTPUser:           getEnv("SMTP_USER", ""),
		SMTPPass:           getEnv("SMTP_PASS", ""),
		SMTPFrom:           getEnv("SMTP_FROM", ""),
		AllowedOrigins:     splitCSV(getEnv("ALLOWED_ORIGINS", getEnv("FRONTEND_URL", "http://localhost:5173"))),
		TrustedProxies:     splitCSV(getEnv("TRUSTED_PROXIES", "")),
		EnableDevMocks:     getBoolEnv("ENABLE_DEV_MOCKS", false) && !isProduction,
		RunMigrations:      getBoolEnv("RUN_MIGRATIONS", !isProduction),
		SeedDatabase:       getBoolEnv("SEED_DB", false) && !isProduction,
		EnableJobs:         getBoolEnv("ENABLE_BACKGROUND_JOBS", true),
		DBMaxOpenConns:     getIntEnv("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:     getIntEnv("DB_MAX_IDLE_CONNS", 10),
		EnableAutoPayout:   getBoolEnv("ENABLE_AUTOMATIC_PAYOUT", false),
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) IsProduction() bool { return c.AppEnv == "production" }

func (c *Config) Validate() error {
	if c.AppEnv != "development" && c.AppEnv != "test" && c.AppEnv != "production" {
		return fmt.Errorf("APP_ENV harus development, test, atau production")
	}
	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET wajib diisi minimal 32 karakter")
	}
	uniqueSecretChars := make(map[rune]struct{})
	for _, char := range c.JWTSecret {
		uniqueSecretChars[char] = struct{}{}
	}
	if len(uniqueSecretChars) < 8 {
		return fmt.Errorf("JWT_SECRET terlalu mudah ditebak; gunakan secret acak")
	}
	if err := validatePort("PORT", c.Port); err != nil {
		return err
	}
	if c.DBMaxOpenConns < 1 {
		return fmt.Errorf("DB_MAX_OPEN_CONNS wajib minimal 1")
	}
	if c.DBMaxIdleConns < 0 || c.DBMaxIdleConns > c.DBMaxOpenConns {
		return fmt.Errorf("DB_MAX_IDLE_CONNS wajib antara 0 dan DB_MAX_OPEN_CONNS")
	}
	if c.DatabaseURL == "" && (c.DBHost == "" || c.DBUser == "" || c.DBPass == "" || c.DBName == "") {
		return fmt.Errorf("konfigurasi database belum lengkap")
	}
	if !c.IsProduction() {
		return nil
	}

	required := map[string]string{
		"IPAYMU_VA":            c.IPaymuVA,
		"IPAYMU_API_KEY":       c.IPaymuAPIKey,
		"GOOGLE_CLIENT_ID":     c.GoogleClientID,
		"GOOGLE_CLIENT_SECRET": c.GoogleClientSecret,
		"GOOGLE_REDIRECT_URI":  c.GoogleRedirectURI,
		"FRONTEND_URL":         c.FrontendURL,
		"BACKEND_URL":          c.BackendURL,
		"SMTP_HOST":            c.SMTPHost,
		"SMTP_USER":            c.SMTPUser,
		"SMTP_PASS":            c.SMTPPass,
		"SMTP_FROM":            c.SMTPFrom,
	}
	productionSecrets := map[string]string{
		"DATABASE_URL":         c.DatabaseURL,
		"DB_PASSWORD":          c.DBPass,
		"JWT_SECRET":           c.JWTSecret,
		"IPAYMU_API_KEY":       c.IPaymuAPIKey,
		"GOOGLE_CLIENT_ID":     c.GoogleClientID,
		"GOOGLE_CLIENT_SECRET": c.GoogleClientSecret,
		"SMTP_PASS":            c.SMTPPass,
	}
	for key, value := range productionSecrets {
		lower := strings.ToLower(value)
		if strings.Contains(lower, "replace-with") || strings.Contains(lower, "your-") || strings.Contains(lower, "your_") {
			return fmt.Errorf("%s masih menggunakan nilai contoh", key)
		}
	}
	for key, value := range required {
		if strings.TrimSpace(value) == "" {
			return fmt.Errorf("%s wajib diisi pada production", key)
		}
	}
	if err := validatePort("SMTP_PORT", c.SMTPPort); err != nil {
		return err
	}
	fromAddress, err := mail.ParseAddress(c.SMTPFrom)
	if err != nil || fromAddress.Address != c.SMTPFrom || strings.ContainsAny(c.SMTPFrom, "\r\n") {
		return fmt.Errorf("SMTP_FROM wajib berupa satu alamat email yang valid")
	}
	if c.DatabaseURL != "" {
		if strings.Contains(strings.ToLower(c.DatabaseURL), "sslmode=disable") {
			return fmt.Errorf("DATABASE_URL production tidak boleh menonaktifkan TLS")
		}
	} else if strings.EqualFold(c.DBSSLMode, "disable") {
		return fmt.Errorf("DB_SSLMODE production tidak boleh disable")
	}
	for _, rawURL := range []string{c.FrontendURL, c.BackendURL, c.GoogleRedirectURI} {
		parsed, err := url.Parse(rawURL)
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
			return fmt.Errorf("URL production wajib berupa HTTPS yang valid: %s", rawURL)
		}
	}
	backendURL, _ := url.Parse(c.BackendURL)
	googleRedirectURL, _ := url.Parse(c.GoogleRedirectURI)
	if backendURL.Scheme != googleRedirectURL.Scheme || backendURL.Host != googleRedirectURL.Host {
		return fmt.Errorf("GOOGLE_REDIRECT_URI wajib menggunakan origin BACKEND_URL yang sama")
	}
	if googleRedirectURL.Path != "/api/v1/public/auth/google/callback" || googleRedirectURL.RawQuery != "" || googleRedirectURL.Fragment != "" {
		return fmt.Errorf("GOOGLE_REDIRECT_URI wajib berakhir dengan /api/v1/public/auth/google/callback tanpa query atau fragment")
	}
	if len(c.AllowedOrigins) == 0 {
		return fmt.Errorf("ALLOWED_ORIGINS wajib diisi pada production")
	}
	for _, origin := range c.AllowedOrigins {
		parsed, err := url.Parse(origin)
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" || (parsed.Path != "" && parsed.Path != "/") || parsed.RawQuery != "" || parsed.Fragment != "" {
			return fmt.Errorf("ALLOWED_ORIGINS hanya boleh berisi origin HTTPS tanpa path: %s", origin)
		}
	}
	return nil
}

func validatePort(name, value string) error {
	port, err := strconv.Atoi(value)
	if err != nil || port < 1 || port > 65535 {
		return fmt.Errorf("%s wajib berupa port 1-65535", name)
	}
	return nil
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists && strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return defaultVal
}

func getBoolEnv(key string, defaultVal bool) bool {
	value, exists := os.LookupEnv(key)
	if !exists || strings.TrimSpace(value) == "" {
		return defaultVal
	}
	parsed, err := strconv.ParseBool(strings.TrimSpace(value))
	if err != nil {
		return defaultVal
	}
	return parsed
}

func getIntEnv(key string, defaultVal int) int {
	value, exists := os.LookupEnv(key)
	if !exists || strings.TrimSpace(value) == "" {
		return defaultVal
	}
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return defaultVal
	}
	return parsed
}

func splitCSV(value string) []string {
	var result []string
	for _, item := range strings.Split(value, ",") {
		if trimmed := strings.TrimSpace(strings.TrimRight(item, "/")); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
