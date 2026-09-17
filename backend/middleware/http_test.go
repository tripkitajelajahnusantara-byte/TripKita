package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"tripkita-provider/config"
)

func init() { gin.SetMode(gin.TestMode) }

func TestRateLimitBlocksAfterLimit(t *testing.T) {
	router := gin.New()
	router.Use(RateLimit(2, time.Minute))
	router.GET("/uji", func(c *gin.Context) { c.Status(http.StatusOK) })

	call := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/uji", nil)
		req.RemoteAddr = "203.0.113.10:1234"
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}

	for i := 1; i <= 2; i++ {
		if got := call().Code; got != http.StatusOK {
			t.Fatalf("permintaan ke-%d dalam batas seharusnya lolos, dapat %d", i, got)
		}
	}
	blocked := call()
	if blocked.Code != http.StatusTooManyRequests {
		t.Fatalf("permintaan melebihi batas seharusnya 429, dapat %d", blocked.Code)
	}
	if blocked.Header().Get("Retry-After") == "" {
		t.Error("respons 429 wajib menyertakan header Retry-After")
	}
}

// Batas dihitung per klien; satu pengguna yang agresif tidak boleh mengunci
// pengguna lain.
func TestRateLimitIsolatesClients(t *testing.T) {
	router := gin.New()
	router.Use(RateLimit(1, time.Minute))
	router.GET("/uji", func(c *gin.Context) { c.Status(http.StatusOK) })

	call := func(ip string) int {
		req := httptest.NewRequest(http.MethodGet, "/uji", nil)
		req.RemoteAddr = ip + ":1234"
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec.Code
	}

	call("203.0.113.10")
	if got := call("203.0.113.10"); got != http.StatusTooManyRequests {
		t.Fatalf("klien pertama seharusnya sudah dibatasi, dapat %d", got)
	}
	if got := call("203.0.113.99"); got != http.StatusOK {
		t.Fatalf("klien berbeda seharusnya tidak ikut terblokir, dapat %d", got)
	}
}

func TestCORSRejectsUnknownOrigin(t *testing.T) {
	cfg := &config.Config{AllowedOrigins: []string{"https://app.example.com"}}
	router := gin.New()
	router.Use(CORSMiddleware(cfg))
	router.GET("/uji", func(c *gin.Context) { c.Status(http.StatusOK) })

	call := func(origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/uji", nil)
		if origin != "" {
			req.Header.Set("Origin", origin)
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}

	if got := call("https://app.example.com"); got.Code != http.StatusOK {
		t.Fatalf("origin terdaftar seharusnya lolos, dapat %d", got.Code)
	} else if got.Header().Get("Access-Control-Allow-Origin") != "https://app.example.com" {
		t.Error("origin terdaftar wajib dipantulkan pada header CORS")
	}

	if got := call("https://penyerang.example.com"); got.Code != http.StatusForbidden {
		t.Fatalf("origin asing seharusnya ditolak, dapat %d", got.Code)
	}

	// Klien non-browser (aplikasi mobile) tidak mengirim Origin dan tetap dilayani.
	if got := call(""); got.Code != http.StatusOK {
		t.Fatalf("permintaan tanpa Origin seharusnya dilayani, dapat %d", got.Code)
	}
}

func TestRequestSizeLimitRejectsOversizedBody(t *testing.T) {
	router := gin.New()
	router.Use(RequestSizeLimit(16))
	router.POST("/uji", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodPost, "/uji", strings.NewReader(strings.Repeat("x", 64)))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("body melebihi batas seharusnya 413, dapat %d", rec.Code)
	}
}

// Panic tidak boleh membocorkan detail internal ke klien, tetapi harus tetap
// dapat ditelusuri lewat request id.
func TestSafeRecoveryHidesInternalsAndReturnsRequestID(t *testing.T) {
	router := gin.New()
	router.Use(RequestID(), SafeRecovery())
	router.GET("/uji", func(_ *gin.Context) { panic("kredensial database rahasia") })

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/uji", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("panic seharusnya menghasilkan 500, dapat %d", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "kredensial database rahasia") {
		t.Error("detail panic tidak boleh dikirim ke klien")
	}
	if rec.Header().Get(RequestIDHeader) == "" {
		t.Error("respons wajib menyertakan request id untuk penelusuran")
	}
}

// Request id selalu dibuat server; nilai kiriman klien tidak dipercaya agar log
// tidak dapat dipalsukan.
func TestRequestIDIgnoresClientSuppliedValue(t *testing.T) {
	router := gin.New()
	router.Use(RequestID())
	router.GET("/uji", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/uji", nil)
	req.Header.Set(RequestIDHeader, "dipalsukan-klien")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if got := rec.Header().Get(RequestIDHeader); got == "dipalsukan-klien" || got == "" {
		t.Errorf("request id wajib dibuat server, dapat %q", got)
	}
}

func TestSecurityHeadersAreSet(t *testing.T) {
	router := gin.New()
	router.Use(SecurityHeaders())
	router.GET("/api/v1/uji", func(c *gin.Context) { c.Status(http.StatusOK) })

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/uji", nil))

	expected := map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "DENY",
		"Referrer-Policy":        "strict-origin-when-cross-origin",
		"Cache-Control":          "no-store",
	}
	for header, want := range expected {
		if got := rec.Header().Get(header); got != want {
			t.Errorf("header %s = %q, diharapkan %q", header, got, want)
		}
	}
}
