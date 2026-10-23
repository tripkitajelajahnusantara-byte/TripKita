package services

import (
	"bytes"
	"context"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"tripkita-provider/config"
	"tripkita-provider/models"
)

// MidtransService membungkus Snap API (pembuatan tagihan) dan API status
// transaksi. Server key hanya dipakai backend dan tidak pernah dicatat di log.
type MidtransService interface {
	CreateTransaction(booking *models.Booking, packageName, orderID string, expiresAt time.Time) (string, error)
	// GetTransactionStatus mengembalikan nil tanpa error bila order belum
	// memiliki transaksi (customer belum memilih metode di halaman Snap).
	GetTransactionStatus(orderID string) (*MidtransTransactionStatus, error)
	// ExpireTransaction menghentikan transaksi pending; hasilnya dipastikan
	// pemanggil lewat GetTransactionStatus.
	ExpireTransaction(orderID string) error
	VerifyNotificationSignature(n *MidtransNotification) bool
}

// MidtransNotification hanya memuat field yang dibutuhkan untuk verifikasi
// signature; status sebenarnya selalu diambil ulang dari API status.
type MidtransNotification struct {
	OrderID      string `json:"order_id"`
	StatusCode   string `json:"status_code"`
	GrossAmount  string `json:"gross_amount"`
	SignatureKey string `json:"signature_key"`
}

type MidtransTransactionStatus struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
	GrossAmount       string `json:"gross_amount"`
	Currency          string `json:"currency"`
	PaymentType       string `json:"payment_type"`
}

// IsPaid: settlement, atau capture kartu yang lolos fraud detection.
func (st *MidtransTransactionStatus) IsPaid() bool {
	return st.TransactionStatus == "settlement" ||
		(st.TransactionStatus == "capture" && st.FraudStatus == "accept")
}

// IsFailed berarti order ini tidak dapat dibayar lagi sehingga booking boleh
// dibuatkan tagihan baru. Status lain (pending, challenge) masih berjalan.
func (st *MidtransTransactionStatus) IsFailed() bool {
	switch st.TransactionStatus {
	case "deny", "cancel", "expire", "failure":
		return true
	}
	return false
}

// Amount mengubah gross_amount Midtrans ("150000.00") menjadi rupiah bulat.
func (st *MidtransTransactionStatus) Amount() (int64, error) {
	whole, fraction, _ := strings.Cut(st.GrossAmount, ".")
	if strings.Trim(fraction, "0") != "" {
		return 0, fmt.Errorf("nominal Midtrans bukan rupiah bulat: %s", st.GrossAmount)
	}
	return strconv.ParseInt(whole, 10, 64)
}

// ErrMidtransAuthentication menandai server key yang ditolak, biasanya karena
// key sandbox dipakai dengan MIDTRANS_IS_PRODUCTION=true atau sebaliknya.
var ErrMidtransAuthentication = errors.New("autentikasi Midtrans ditolak; periksa MIDTRANS_SERVER_KEY dan MIDTRANS_IS_PRODUCTION")

type midtransService struct {
	serverKey   string
	snapURL     string
	apiBaseURL  string
	frontendURL string
	// notificationURL mengarahkan notifikasi transaksi ke backend pembuatnya,
	// sehingga staging tidak bergantung pada satu URL di dashboard Midtrans.
	notificationURL string
	client          *http.Client
}

// NewMidtransService mengembalikan nil bila MIDTRANS_SERVER_KEY kosong.
func NewMidtransService(cfg *config.Config) MidtransService {
	if !cfg.UsesMidtrans() {
		return nil
	}
	s := &midtransService{
		serverKey:   cfg.MidtransServerKey,
		snapURL:     "https://app.sandbox.midtrans.com/snap/v1/transactions",
		apiBaseURL:  "https://api.sandbox.midtrans.com",
		frontendURL: strings.TrimRight(cfg.FrontendURL, "/"),
		client:      &http.Client{Timeout: 15 * time.Second},
	}
	if strings.HasPrefix(cfg.BackendURL, "https://") {
		s.notificationURL = strings.TrimRight(cfg.BackendURL, "/") + "/api/v1/public/webhooks/midtrans"
	}
	if cfg.MidtransIsProduction {
		s.snapURL = "https://app.midtrans.com/snap/v1/transactions"
		s.apiBaseURL = "https://api.midtrans.com"
	}
	return s
}

func (s *midtransService) CreateTransaction(b *models.Booking, packageName, orderID string, expiresAt time.Time) (string, error) {
	minutes := int(time.Until(expiresAt) / time.Minute)
	if minutes < 1 {
		return "", fmt.Errorf("batas pembayaran booking %s sudah lewat", b.BookingCode)
	}
	customer := map[string]string{"first_name": truncateText(b.CustomerName, 255)}
	// Booking tamu dapat dibuka siapa pun yang memegang kode booking, jadi
	// email dan HP hanya dikirim untuk booking akun yang pemiliknya terverifikasi.
	if b.CustomerID != nil && *b.CustomerID > 0 {
		customer["email"] = b.CustomerEmail
		customer["phone"] = b.CustomerPhone
	}
	if strings.TrimSpace(packageName) == "" {
		packageName = "Paket Wisata TemenTrip"
	}
	payload := map[string]interface{}{
		"transaction_details": map[string]interface{}{"order_id": orderID, "gross_amount": b.TotalPrice},
		// Satu item senilai total agar jumlah item selalu sama dengan gross_amount.
		"item_details": []map[string]interface{}{{
			"id": b.BookingCode, "price": b.TotalPrice, "quantity": 1, "name": truncateText(packageName, 50),
		}},
		"customer_details": customer,
		"callbacks":        map[string]string{"finish": s.frontendURL + "/#/halaman-pembayaran?code=" + url.QueryEscape(b.BookingCode)},
		// Tagihan berakhir bersama batas bayar booking supaya customer tidak
		// dapat membayar booking yang sudah dibatalkan otomatis.
		"expiry": map[string]interface{}{
			"start_time": time.Now().In(models.BookingLocation).Format("2006-01-02 15:04:05 -0700"),
			"unit":       "minute",
			"duration":   minutes,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	respBody, status, err := s.do(http.MethodPost, s.snapURL, body, s.notificationURL)
	if err != nil {
		return "", err
	}
	if status != http.StatusCreated && status != http.StatusOK {
		log.Printf("[Midtrans] Snap menolak order %s: HTTP %d %s", orderID, status, string(respBody))
		return "", fmt.Errorf("Midtrans menolak pembuatan tagihan (HTTP %d)", status)
	}
	var snap struct {
		RedirectURL string `json:"redirect_url"`
	}
	if err := json.Unmarshal(respBody, &snap); err != nil {
		return "", fmt.Errorf("respons Snap tidak valid: %w", err)
	}
	parsed, err := url.Parse(snap.RedirectURL)
	if err != nil || parsed.Scheme != "https" || !strings.HasSuffix(strings.ToLower(parsed.Hostname()), ".midtrans.com") {
		return "", fmt.Errorf("Midtrans mengembalikan URL pembayaran tidak resmi")
	}
	return snap.RedirectURL, nil
}

func (s *midtransService) GetTransactionStatus(orderID string) (*MidtransTransactionStatus, error) {
	respBody, status, err := s.do(http.MethodGet, s.apiBaseURL+"/v2/"+url.PathEscape(orderID)+"/status", nil, "")
	if err != nil {
		return nil, err
	}
	if status == http.StatusNotFound {
		return nil, nil
	}
	if status < 200 || status >= 300 {
		log.Printf("[Midtrans] status order %s gagal: HTTP %d %s", orderID, status, string(respBody))
		return nil, fmt.Errorf("status Midtrans tidak dapat dibaca (HTTP %d)", status)
	}
	var st MidtransTransactionStatus
	if err := json.Unmarshal(respBody, &st); err != nil {
		return nil, fmt.Errorf("respons status Midtrans tidak valid: %w", err)
	}
	// API ini menjawab HTTP 200 dengan status_code "404" untuk order yang
	// belum punya transaksi.
	if st.StatusCode == "404" {
		return nil, nil
	}
	if st.OrderID != orderID {
		return nil, fmt.Errorf("status Midtrans untuk order lain dikembalikan")
	}
	return &st, nil
}

func (s *midtransService) ExpireTransaction(orderID string) error {
	respBody, status, err := s.do(http.MethodPost, s.apiBaseURL+"/v2/"+url.PathEscape(orderID)+"/expire", nil, "")
	if err != nil {
		return err
	}
	if status < 200 || status >= 300 {
		return fmt.Errorf("expire Midtrans ditolak (HTTP %d): %s", status, respBody)
	}
	return nil
}

func (s *midtransService) VerifyNotificationSignature(n *MidtransNotification) bool {
	sum := sha512.Sum512([]byte(n.OrderID + n.StatusCode + n.GrossAmount + s.serverKey))
	expected := hex.EncodeToString(sum[:])
	return subtle.ConstantTimeCompare([]byte(expected), []byte(strings.ToLower(n.SignatureKey))) == 1
}

func (s *midtransService) do(method, endpoint string, body []byte, notificationURL string) ([]byte, int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, method, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, 0, err
	}
	req.SetBasicAuth(s.serverKey, "")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	if notificationURL != "" {
		req.Header.Set("X-Override-Notification", notificationURL)
	}
	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("[Midtrans] koneksi gagal: %v", err)
		return nil, 0, fmt.Errorf("Midtrans tidak dapat dihubungi")
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if resp.StatusCode == http.StatusUnauthorized {
		return nil, resp.StatusCode, ErrMidtransAuthentication
	}
	return respBody, resp.StatusCode, nil
}
