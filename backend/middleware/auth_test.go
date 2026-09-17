package middleware

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"tripkita-provider/config"
)

const testSecret = "9f2b7c41ae6d05938bd14c7ea2f6091d"

func testConfig() *config.Config {
	return &config.Config{AppEnv: "test", JWTSecret: testSecret}
}

func signToken(t *testing.T, claims jwt.MapClaims, method jwt.SigningMethod, secret string) string {
	t.Helper()
	token := jwt.NewWithClaims(method, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("gagal menandatangani token uji: %v", err)
	}
	return signed
}

func validClaims() jwt.MapClaims {
	now := time.Now()
	return jwt.MapClaims{
		"provider_id": 42,
		"role":        "PROVIDER",
		"iss":         "tripkita-api",
		"aud":         "tripkita-web",
		"iat":         now.Unix(),
		"exp":         now.Add(time.Hour).Unix(),
	}
}

func TestParseTokenAcceptsValidToken(t *testing.T) {
	id, role, err := ParseToken(testConfig(), signToken(t, validClaims(), jwt.SigningMethodHS256, testSecret))
	if err != nil {
		t.Fatalf("token valid ditolak: %v", err)
	}
	if id != 42 || role != "PROVIDER" {
		t.Errorf("klaim tidak terbaca benar: id=%d role=%s", id, role)
	}
}

func TestParseTokenRejectsTamperedOrExpiredTokens(t *testing.T) {
	expired := validClaims()
	expired["exp"] = time.Now().Add(-time.Minute).Unix()

	noExpiry := validClaims()
	delete(noExpiry, "exp")

	wrongIssuer := validClaims()
	wrongIssuer["iss"] = "penyerang"

	wrongAudience := validClaims()
	wrongAudience["aud"] = "aplikasi-lain"

	missingRole := validClaims()
	delete(missingRole, "role")

	zeroID := validClaims()
	zeroID["provider_id"] = 0

	cases := map[string]string{
		"ditandatangani secret lain": signToken(t, validClaims(), jwt.SigningMethodHS256, "secret-penyerang-yang-berbeda"),
		"sudah kedaluwarsa":          signToken(t, expired, jwt.SigningMethodHS256, testSecret),
		"tanpa klaim exp":            signToken(t, noExpiry, jwt.SigningMethodHS256, testSecret),
		"issuer tidak dikenal":       signToken(t, wrongIssuer, jwt.SigningMethodHS256, testSecret),
		"audience tidak dikenal":     signToken(t, wrongAudience, jwt.SigningMethodHS256, testSecret),
		"tanpa klaim role":           signToken(t, missingRole, jwt.SigningMethodHS256, testSecret),
		"provider id nol":            signToken(t, zeroID, jwt.SigningMethodHS256, testSecret),
		"bukan token":                "bukan-sebuah-jwt",
		"algoritma none":             "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJwcm92aWRlcl9pZCI6NDJ9.",
	}

	for name, token := range cases {
		t.Run(name, func(t *testing.T) {
			if _, _, err := ParseToken(testConfig(), token); err == nil {
				t.Error("token tidak sah seharusnya ditolak")
			}
		})
	}
}
