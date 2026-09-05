package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
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
	XenditAPIKey       string
	XenditWebhookToken string
}

func LoadConfig() *Config {
	// Try loading .env. If it fails, we assume env variables are set manually.
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on system environment variables")
	}

	xenditKey := strings.TrimSpace(getEnv("XENDIT_SECRET_KEY", getEnv("XENDIT_API_KEY", "xnd_development_tm5ouw4jC8H6vWuyHr0oZan5hs2GcFgvo8NYsm5wCfiAM6Oxe505JdZhJFHFe3")))

	return &Config{
		Port:               getEnv("PORT", "8080"),
		DatabaseURL:        getEnv("DATABASE_URL", ""),
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBPort:             getEnv("DB_PORT", "5432"),
		DBUser:             getEnv("DB_USER", "postgres"),
		DBPass:             getEnv("DB_PASSWORD", "postgres"),
		DBName:             getEnv("DB_NAME", "tripkita_provider"),
		DBSSLMode:          getEnv("DB_SSLMODE", "disable"),
		JWTSecret:          getEnv("JWT_SECRET", "supersecretjwtkey123!"),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURI:  getEnv("GOOGLE_REDIRECT_URI", "http://localhost:8080/api/v1/public/auth/google/callback"),
		FrontendURL:        getEnv("FRONTEND_URL", "https://trip-kita.vercel.app"),
		BackendURL:         getEnv("BACKEND_URL", "https://tripkita-production.up.railway.app"),
		XenditAPIKey:       xenditKey,
		XenditWebhookToken: getEnv("XENDIT_WEBHOOK_TOKEN", ""),
	}
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
