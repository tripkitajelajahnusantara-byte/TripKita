package controllers

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"tripkita-provider/config"
	"tripkita-provider/services"
)

type callbackBookingService struct {
	services.BookingService
	called      bool
	transaction string
	reference   string
	status      string
	amount      int64
}

func (s *callbackBookingService) UpdateStatusByWebhook(transaction, reference, status, method string, amount int64, currency string) error {
	s.called, s.transaction, s.reference, s.status, s.amount = true, transaction, reference, status, amount
	return nil
}

func TestIPaymuWebhookSignedFormEndToEnd(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const va = "1179001234567890"
	values := url.Values{
		"trx_id": {"12345678"}, "reference_id": {"TK-TEST-42"}, "status": {"berhasil"},
		"status_code": {"1"}, "total": {"250000"}, "paid_off": {"248500"},
		"transaction_status_code": {"1"}, "is_escrow": {"0"}, "additional_info": {"[]"},
		"merchant": {va}, "via": {"va"}, "channel": {"bca"},
	}
	rawBody := []byte(values.Encode())
	payload, err := services.ParseIPaymuCallback(rawBody, "application/x-www-form-urlencoded")
	if err != nil {
		t.Fatal(err)
	}
	signature := signControllerCallback(t, va, payload)

	booking := &callbackBookingService{}
	ipaymu := services.NewIPaymuService(&config.Config{IPaymuVA: va, IPaymuAPIKey: "api-key"})
	controller := NewBookingController(booking, ipaymu, &config.Config{IPaymuVA: va})
	router := gin.New()
	router.POST("/callback", controller.IPaymuWebhook)
	req := httptest.NewRequest(http.MethodPost, "/callback", bytes.NewReader(rawBody))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("X-Signature", signature)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, req)

	if response.Code != http.StatusOK {
		t.Fatalf("callback returned %d: %s", response.Code, response.Body.String())
	}
	if !booking.called || booking.transaction != "12345678" || booking.reference != "TK-TEST-42" || booking.status != "PAID" || booking.amount != 250000 {
		t.Fatalf("callback not forwarded correctly: %+v", booking)
	}
}

func TestIPaymuWebhookRejectsInvalidSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	booking := &callbackBookingService{}
	ipaymu := services.NewIPaymuService(&config.Config{IPaymuVA: "merchant-va", IPaymuAPIKey: "api-key"})
	controller := NewBookingController(booking, ipaymu, &config.Config{IPaymuVA: "merchant-va"})
	router := gin.New()
	router.POST("/callback", controller.IPaymuWebhook)
	body := `{"trx_id":"123","reference_id":"TK-1","status_code":"1","status":"berhasil","total":"10000","paid_off":"9500","transaction_status_code":"1","is_escrow":"0","additional_info":[]}`
	req := httptest.NewRequest(http.MethodPost, "/callback", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", strings.Repeat("0", 64))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, req)
	if response.Code != http.StatusBadRequest || booking.called {
		t.Fatalf("invalid signature response=%d called=%v", response.Code, booking.called)
	}
}

func signControllerCallback(t *testing.T, va string, payload map[string]interface{}) string {
	t.Helper()
	normalized, err := services.NormalizeIPaymuCallback(payload)
	if err != nil {
		t.Fatal(err)
	}
	// encoding/json sorts map keys. Escape slash to follow iPaymu callback docs.
	body, err := json.Marshal(normalized)
	if err != nil {
		t.Fatal(err)
	}
	body = []byte(strings.ReplaceAll(string(body), "/", `\/`))
	mac := hmac.New(sha256.New, []byte(va))
	_, _ = mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}
