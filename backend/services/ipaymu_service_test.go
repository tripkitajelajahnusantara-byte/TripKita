package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"tripkita-provider/config"
	"tripkita-provider/models"
)

func TestIPaymuCreatePaymentAcceptsOfficialRedirectResponse(t *testing.T) {
	var received map[string]interface{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/payment" || r.Method != http.MethodPost {
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		if r.Header.Get("va") != "1179001234567890" || r.Header.Get("signature") == "" || r.Header.Get("timestamp") == "" {
			t.Fatalf("missing iPaymu authentication headers")
		}
		if err := json.NewDecoder(r.Body).Decode(&received); err != nil {
			t.Fatal(err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Status":200,"Message":"success","Data":{"SessionID":"session-redirect-123","Url":"https://sandbox.ipaymu.com/payment/session-redirect-123"}}`))
	}))
	defer server.Close()

	cfg := &config.Config{
		IPaymuVA: "1179001234567890", IPaymuAPIKey: "sandbox-api-key", IPaymuBaseURL: server.URL,
		FrontendURL: "https://example.test", BackendURL: "https://api.example.test",
		IPaymuReturnURL: "https://example.test/payment/success", IPaymuCancelURL: "https://example.test/payment/cancel",
	}
	service := NewIPaymuService(cfg)
	booking := &models.Booking{ID: 42, BookingCode: "TK-TEST-42", CustomerName: "Test User", CustomerEmail: "test@example.com", CustomerPhone: "081234567890", Guests: 2, TotalPrice: 250000}
	response, err := service.CreatePayment(booking, "Paket Uji")
	if err != nil {
		t.Fatalf("CreatePayment returned error: %v", err)
	}
	if response.SessionID != "session-redirect-123" || response.PaymentURL == "" || response.TransactionID != 0 {
		t.Fatalf("unexpected response: %+v", response)
	}
	if descriptions, ok := received["description"].([]interface{}); !ok || len(descriptions) != 1 {
		t.Fatalf("required description[] missing: %#v", received["description"])
	}
	if received["referenceId"] != "TK-TEST-42" {
		t.Fatalf("wrong referenceId: %#v", received["referenceId"])
	}
	if received["notifyUrl"] != "https://api.example.test/api/v1/public/webhooks/ipaymu" {
		t.Fatalf("wrong notifyUrl: %#v", received["notifyUrl"])
	}
	assertIPaymuResultURL(t, received["returnUrl"], "https://example.test/payment/success", "success", "42")
	assertIPaymuResultURL(t, received["cancelUrl"], "https://example.test/payment/cancel", "failed", "42")
}

func assertIPaymuResultURL(t *testing.T, value interface{}, expectedBase, expectedResult, expectedBookingID string) {
	t.Helper()
	parsed, err := url.Parse(fmt.Sprint(value))
	if err != nil {
		t.Fatal(err)
	}
	base, _ := url.Parse(expectedBase)
	if parsed.Scheme != base.Scheme || parsed.Host != base.Host || parsed.Path != base.Path {
		t.Fatalf("unexpected result URL: %s", parsed.String())
	}
	if parsed.Query().Get("payment_result") != expectedResult || parsed.Query().Get("booking_id") != expectedBookingID || parsed.Fragment != "/riwayat-booking" {
		t.Fatalf("result URL is missing payment context: %s", parsed.String())
	}
}

func TestIPaymuCreatePaymentClassifiesRejectedCredentials(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"Status":401,"Success":false,"Message":"unauthorized signature","Data":null}`))
	}))
	defer server.Close()

	service := NewIPaymuService(&config.Config{
		IPaymuVA: "1179001234567890", IPaymuAPIKey: "rejected-key", IPaymuBaseURL: server.URL,
		FrontendURL: "https://example.test", BackendURL: "https://api.example.test",
	})
	booking := &models.Booking{ID: 42, BookingCode: "TK-TEST-42", CustomerName: "Test User", CustomerEmail: "test@example.com", CustomerPhone: "081234567890", Guests: 1, TotalPrice: 100000}

	_, err := service.CreatePayment(booking, "Paket Uji")
	if !errors.Is(err, ErrIPaymuAuthentication) {
		t.Fatalf("expected ErrIPaymuAuthentication, got %v", err)
	}
	if strings.Contains(err.Error(), "1179001234567890") || strings.Contains(err.Error(), "rejected-key") {
		t.Fatalf("credential value leaked in error: %v", err)
	}
}

func TestIPaymuCallbackSignatureAndParsing(t *testing.T) {
	cfg := &config.Config{IPaymuVA: "1179001234567890", IPaymuAPIKey: "unused-for-callback"}
	service := NewIPaymuService(cfg)
	body := []byte("trx_id=12345678&reference_id=TK-TEST-42&status=berhasil&status_code=1&total=250000&paid_off=248500&transaction_status_code=1&is_escrow=0&additional_info=%5B%5D&url=https%3A%2F%2Fexample.test%2Fcallback&merchant=1179001234567890")
	payload, err := ParseIPaymuCallback(body, "application/x-www-form-urlencoded")
	if err != nil {
		t.Fatal(err)
	}
	signature := callbackSignatureForTest(t, cfg.IPaymuVA, payload)
	if !service.VerifyCallbackSignature(signature, payload) {
		t.Fatal("valid callback signature was rejected")
	}
	payload["total"] = "1"
	if service.VerifyCallbackSignature(signature, payload) {
		t.Fatal("tampered callback signature was accepted")
	}
}

func TestIPaymuCallbackJSONSignature(t *testing.T) {
	const va = "1179001234567890"
	payload, err := ParseIPaymuCallback([]byte(`{"trx_id":"87654321","reference_id":"TK-JSON-1","status":"berhasil","status_code":"1","total":"100000","paid_off":"98500","transaction_status_code":"1","is_escrow":"0","additional_info":[]}`), "application/json; charset=utf-8")
	if err != nil {
		t.Fatal(err)
	}
	service := NewIPaymuService(&config.Config{IPaymuVA: va, IPaymuAPIKey: "api-key"})
	if !service.VerifyCallbackSignature(callbackSignatureForTest(t, va, payload), payload) {
		t.Fatal("valid JSON callback signature was rejected")
	}
}

func callbackSignatureForTest(t *testing.T, va string, payload map[string]interface{}) string {
	t.Helper()
	normalized, err := NormalizeIPaymuCallback(payload)
	if err != nil {
		t.Fatal(err)
	}
	body, err := marshalSortedIPaymuCallback(normalized)
	if err != nil {
		t.Fatal(err)
	}
	mac := hmac.New(sha256.New, []byte(va))
	_, _ = mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func TestIPaymuCreatePaymentHasBoundedHTTPTimeout(t *testing.T) {
	service := NewIPaymuService(&config.Config{IPaymuVA: "va", IPaymuAPIKey: "key"}).(*ipaymuService)
	if service.client.Timeout <= 0 || service.client.Timeout > 20*time.Second {
		t.Fatalf("unexpected HTTP timeout: %s", service.client.Timeout)
	}
}
