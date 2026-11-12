package middleware

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func validOpaqueToken() string {
	return "tks_" + base64.RawURLEncoding.EncodeToString([]byte(strings.Repeat("x", 32)))
}

func TestBearerToken(t *testing.T) {
	valid := validOpaqueToken()
	cases := []struct {
		name   string
		header string
		ok     bool
	}{
		{"valid", "Bearer " + valid, true},
		{"case insensitive scheme", "bearer " + valid, true},
		{"extra whitespace", "  Bearer   " + valid + "  ", true},
		{"missing", "", false},
		{"jwt lama", "Bearer a.b.c", false},
		{"malformed", "Bearer not-a-token", false},
		{"extra field", "Bearer " + valid + " other", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := bearerToken(tc.header)
			if ok != tc.ok {
				t.Fatalf("ok=%v, want %v", ok, tc.ok)
			}
			if ok && got != valid {
				t.Fatalf("token=%q, want %q", got, valid)
			}
		})
	}
}

func TestProfileOwnerRequiredAllowsActiveCustomerAndProvider(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cases := []struct {
		name   string
		role   string
		status string
		want   int
	}{
		{"customer aktif", "CUSTOMER", "APPROVED", http.StatusOK},
		{"customer nonaktif", "CUSTOMER", "SUSPENDED", http.StatusForbidden},
		{"mitra menunggu verifikasi", "PROVIDER", "PENDING", http.StatusOK},
		{"admin", "ADMIN", "APPROVED", http.StatusForbidden},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := gin.New()
			r.GET("/", func(c *gin.Context) {
				c.Set("role", tc.role)
				c.Set("account_status", tc.status)
				c.Set("is_verified", true)
				c.Next()
			}, ProfileOwnerRequired(), func(c *gin.Context) { c.Status(http.StatusOK) })
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
			if w.Code != tc.want {
				t.Fatalf("status=%d, want %d", w.Code, tc.want)
			}
		})
	}
}
