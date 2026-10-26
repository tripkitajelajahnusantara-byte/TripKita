package services

import (
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"tripkita-provider/models"
)

func newTestMidtrans(t *testing.T, handler http.HandlerFunc) *midtransService {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	return &midtransService{
		serverKey:   "SB-Mid-server-test",
		snapURL:     server.URL + "/snap/v1/transactions",
		apiBaseURL:  server.URL,
		frontendURL: "https://app.example.com",
		client:      server.Client(),
	}
}

func TestMidtransNotificationSignature(t *testing.T) {
	s := &midtransService{serverKey: "SB-Mid-server-test"}
	sum := sha512.Sum512([]byte("TK-1-1700" + "200" + "150000.00" + "SB-Mid-server-test"))
	n := &MidtransNotification{OrderID: "TK-1-1700", StatusCode: "200", GrossAmount: "150000.00", SignatureKey: hex.EncodeToString(sum[:])}
	if !s.VerifyNotificationSignature(n) {
		t.Fatal("signature valid ditolak")
	}
	n.GrossAmount = "1.00"
	if s.VerifyNotificationSignature(n) {
		t.Fatal("signature untuk nominal lain diterima")
	}
}

func TestMidtransStatusMapping(t *testing.T) {
	cases := []struct {
		status, fraud string
		paid, failed  bool
	}{
		{"settlement", "", true, false},
		{"capture", "accept", true, false},
		{"capture", "challenge", false, false},
		{"pending", "", false, false},
		{"expire", "", false, true},
		{"deny", "", false, true},
	}
	for _, c := range cases {
		st := &MidtransTransactionStatus{TransactionStatus: c.status, FraudStatus: c.fraud}
		if st.IsPaid() != c.paid || st.IsFailed() != c.failed {
			t.Errorf("%s/%s: paid=%v failed=%v", c.status, c.fraud, st.IsPaid(), st.IsFailed())
		}
	}
	if amount, err := (&MidtransTransactionStatus{GrossAmount: "150000.00"}).Amount(); err != nil || amount != 150000 {
		t.Fatalf("amount = %d, %v", amount, err)
	}
	if _, err := (&MidtransTransactionStatus{GrossAmount: "150000.50"}).Amount(); err == nil {
		t.Fatal("nominal pecahan diterima")
	}
	if got := midtransBookingCode("TK-20260928-AB12CD34-1700000000000"); got != "TK-20260928-AB12CD34" {
		t.Fatalf("booking code = %q", got)
	}
}

func TestMidtransCreateTransaction(t *testing.T) {
	var got map[string]interface{}
	s := newTestMidtrans(t, func(w http.ResponseWriter, r *http.Request) {
		if user, pass, ok := r.BasicAuth(); !ok || user != "SB-Mid-server-test" || pass != "" {
			t.Errorf("basic auth salah: %q %q", user, pass)
		}
		if got := r.Header.Get("X-Override-Notification"); got != "https://api.example.com/api/v1/public/webhooks/midtrans" {
			t.Errorf("X-Override-Notification = %q", got)
		}
		_ = json.NewDecoder(r.Body).Decode(&got)
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"token":"t","redirect_url":"https://app.sandbox.midtrans.com/snap/v4/redirection/t"}`))
	})
	booking := &models.Booking{BookingCode: "TK-1", TotalPrice: 150000, CustomerName: "Tamu", CustomerEmail: "tamu@example.com"}
	s.notificationURL = "https://api.example.com/api/v1/public/webhooks/midtrans"
	paymentURL, err := s.CreateTransaction(booking, "Bromo", "TK-1-1700", time.Now().Add(2*time.Hour))
	if err != nil || paymentURL != "https://app.sandbox.midtrans.com/snap/v4/redirection/t" {
		t.Fatalf("url = %q, err = %v", paymentURL, err)
	}
	details := got["transaction_details"].(map[string]interface{})
	if details["order_id"] != "TK-1-1700" || details["gross_amount"] != float64(150000) {
		t.Fatalf("transaction_details = %v", details)
	}
	if duration := got["expiry"].(map[string]interface{})["duration"].(float64); duration < 118 || duration > 120 {
		t.Fatalf("expiry duration = %v menit", duration)
	}
	if _, leaked := got["customer_details"].(map[string]interface{})["email"]; leaked {
		t.Fatal("email booking tamu dikirim ke Midtrans")
	}
	if finish := got["callbacks"].(map[string]interface{})["finish"]; finish != "https://app.example.com/#/halaman-pembayaran?code=TK-1" {
		t.Fatalf("finish = %v", finish)
	}
}

func TestMidtransRejectsForeignRedirect(t *testing.T) {
	s := newTestMidtrans(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"redirect_url":"https://evil.example.com/pay"}`))
	})
	_, err := s.CreateTransaction(&models.Booking{BookingCode: "TK-1", TotalPrice: 1}, "", "TK-1-1", time.Now().Add(time.Hour))
	if err == nil || !strings.Contains(err.Error(), "tidak resmi") {
		t.Fatalf("err = %v", err)
	}
}

func TestMidtransStatusNotFoundAndAuth(t *testing.T) {
	s := newTestMidtrans(t, func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "unauthorized") {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		_, _ = w.Write([]byte(`{"status_code":"404","status_message":"Transaction doesn't exist."}`))
	})
	st, err := s.GetTransactionStatus("TK-1-1")
	if err != nil || st != nil {
		t.Fatalf("status = %v, err = %v", st, err)
	}
	if _, err := s.GetTransactionStatus("unauthorized"); !errors.Is(err, ErrMidtransAuthentication) {
		t.Fatalf("err = %v", err)
	}
}

func TestMidtransExpireTransaction(t *testing.T) {
	var gotMethod, gotPath string
	s := newTestMidtrans(t, func(w http.ResponseWriter, r *http.Request) {
		gotMethod, gotPath = r.Method, r.URL.Path
		if strings.Contains(r.URL.Path, "settled") {
			w.WriteHeader(http.StatusPreconditionFailed)
			return
		}
		_, _ = w.Write([]byte(`{"status_code":"407","transaction_status":"expire"}`))
	})
	if err := s.ExpireTransaction("TK-1-1"); err != nil {
		t.Fatalf("err = %v", err)
	}
	if gotMethod != http.MethodPost || gotPath != "/v2/TK-1-1/expire" {
		t.Fatalf("request = %s %s", gotMethod, gotPath)
	}
	if err := s.ExpireTransaction("settled"); err == nil {
		t.Fatal("HTTP 412 harus menjadi error")
	}
}

type fakeMidtrans struct {
	MidtransService
	validSignature bool
	status         *MidtransTransactionStatus
	// afterExpire menggantikan status saat ExpireTransaction dipanggil;
	// nil berarti Midtrans menolak expire.
	afterExpire *MidtransTransactionStatus
}

func (f *fakeMidtrans) VerifyNotificationSignature(*MidtransNotification) bool {
	return f.validSignature
}
func (f *fakeMidtrans) GetTransactionStatus(string) (*MidtransTransactionStatus, error) {
	return f.status, nil
}
func (f *fakeMidtrans) ExpireTransaction(string) error {
	if f.afterExpire == nil {
		return errors.New("ditolak")
	}
	f.status = f.afterExpire
	return nil
}

func TestExpireMidtransOrder(t *testing.T) {
	pending := &MidtransTransactionStatus{TransactionStatus: "pending"}
	cases := []struct {
		name       string
		fake       *fakeMidtrans
		wantStatus string
	}{
		{"pending menjadi expire", &fakeMidtrans{status: pending, afterExpire: &MidtransTransactionStatus{TransactionStatus: "expire"}}, "expire"},
		// Expire ditolak karena customer baru saja membayar order lama.
		{"lunas sebelum expire", &fakeMidtrans{status: &MidtransTransactionStatus{TransactionStatus: "settlement"}}, "settlement"},
		{"expire ditolak tetap pending", &fakeMidtrans{status: pending}, ""},
	}
	for _, tc := range cases {
		st, err := (&bookingService{midtrans: tc.fake}).expireMidtransOrder("TK-1-1")
		if tc.wantStatus == "" {
			if err == nil {
				t.Fatalf("%s: order yang masih pending harus menjadi error", tc.name)
			}
			continue
		}
		if err != nil || st.TransactionStatus != tc.wantStatus {
			t.Fatalf("%s: status = %v, err = %v", tc.name, st, err)
		}
	}
}

// Jalur lunas memakai database (applyMidtransPayment), jadi tidak diuji di sini.
func TestStopMidtransPaymentBeforeCancel(t *testing.T) {
	booking := &models.Booking{PaymentMethod: models.PaymentMethodMidtrans, XenditInvoiceID: "TK-1-1", PaymentURL: "https://app.sandbox.midtrans.com/snap/x"}
	pending := &MidtransTransactionStatus{TransactionStatus: "pending"}

	expired := &fakeMidtrans{status: pending, afterExpire: &MidtransTransactionStatus{TransactionStatus: "expire"}}
	if err := (&bookingService{midtrans: expired}).stopMidtransPayment(booking); err != nil || expired.status.TransactionStatus != "expire" {
		t.Fatalf("pending: err = %v, status = %v", err, expired.status)
	}
	if err := (&bookingService{midtrans: &fakeMidtrans{}}).stopMidtransPayment(booking); err != nil {
		t.Fatalf("belum memilih metode: err = %v", err)
	}
	var gatewayErr *BookingGatewayError
	if err := (&bookingService{midtrans: &fakeMidtrans{status: pending}}).stopMidtransPayment(booking); !errors.As(err, &gatewayErr) {
		t.Fatalf("expire ditolak: err = %v", err)
	}
	manual := &models.Booking{PaymentMethod: "Transfer Bank", XenditInvoiceID: "TK-1-1", PaymentURL: "x"}
	if err := (&bookingService{midtrans: &fakeMidtrans{status: pending}}).stopMidtransPayment(manual); err != nil {
		t.Fatalf("booking manual: err = %v", err)
	}
}

func TestHandleMidtransNotificationIgnoresUnpaidAndForged(t *testing.T) {
	forged := &bookingService{midtrans: &fakeMidtrans{validSignature: false}}
	var inputErr *BookingInputError
	if err := forged.HandleMidtransNotification(&MidtransNotification{OrderID: "TK-1-1"}); !errors.As(err, &inputErr) {
		t.Fatalf("notifikasi palsu: err = %v", err)
	}
	// Pending tidak menyentuh database, jadi aman tanpa database.DB.
	pending := &bookingService{midtrans: &fakeMidtrans{validSignature: true, status: &MidtransTransactionStatus{TransactionStatus: "pending"}}}
	if err := pending.HandleMidtransNotification(&MidtransNotification{OrderID: "TK-1-1"}); err != nil {
		t.Fatalf("pending: err = %v", err)
	}
}
