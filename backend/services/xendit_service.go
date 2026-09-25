package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
	"tripkita-provider/config"
	"tripkita-provider/models"
)

type XenditInvoiceResponse struct {
	ID         string `json:"id"`
	InvoiceURL string `json:"invoice_url"`
	Status     string `json:"status"`
}

type XenditService interface {
	CreateInvoice(booking *models.Booking, packageName string) (string, string, error)
	GetInvoice(invoiceID string) (*XenditInvoiceStatus, error)
	CreatePayout(req XenditPayoutRequest) (*XenditPayoutResult, error)
	GetPayout(payoutID string) (*XenditPayoutResult, error)
}

type xenditService struct {
	cfg *config.Config
	// client dipakai ulang agar koneksi TLS ke payment gateway tidak dibuat
	// dari nol pada setiap checkout.
	client *http.Client
}

func NewXenditService(cfg *config.Config) XenditService {
	return &xenditService{
		cfg: cfg,
		client: &http.Client{
			Timeout: 15 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        10,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}
}

func (s *xenditService) CreateInvoice(booking *models.Booking, packageName string) (string, string, error) {
	if s.cfg.XenditAPIKey == "" {
		return "", "", fmt.Errorf("Xendit belum dikonfigurasi")
	}

	apiURL := "https://api.xendit.co/v2/invoices"

	if booking.CustomerEmail == "" {
		return "", "", fmt.Errorf("email pelanggan wajib diisi")
	}

	tripDateStr := ""
	if !booking.TripDate.IsZero() {
		tripDateStr = fmt.Sprintf(" - Tanggal Trip: %s", booking.TripDate.Format("02 Jan 2006"))
	}

	payload := map[string]interface{}{
		"external_id":          fmt.Sprintf("booking_%d_%d", booking.ID, time.Now().Unix()),
		"amount":               booking.TotalPrice,
		"payer_email":          booking.CustomerEmail,
		"description":          fmt.Sprintf("Pembayaran Paket Wisata: %s (%d peserta)%s", packageName, booking.Guests, tripDateStr),
		"invoice_duration":     int(models.PaymentWindow.Seconds()),
		"success_redirect_url": fmt.Sprintf("%s/?payment_result=success&booking_id=%d#/riwayat-booking", s.cfg.FrontendURL, booking.ID),
		"failure_redirect_url": fmt.Sprintf("%s/?payment_result=failed&booking_id=%d#/riwayat-booking", s.cfg.FrontendURL, booking.ID),
		"currency":             "IDR",
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return "", "", err
	}

	// Timeout eksplisit menjaga request checkout tidak menggantung bila payment
	// gateway lambat merespons.
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-IDEMPOTENCY-KEY", fmt.Sprintf("tripkita-invoice-%d", booking.ID))

	// Basic Auth with Xendit Secret Key
	req.Header.Set("Authorization", "Basic "+basicAuthHeader(s.cfg.XenditAPIKey))

	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("[Xendit Error] Failed connection: %v", err)
		return "", "", fmt.Errorf("payment gateway tidak dapat dihubungi")
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("[Xendit Error Response] Status: %d", resp.StatusCode)
		return "", "", fmt.Errorf("payment gateway menolak pembuatan invoice")
	}

	var xenditResp XenditInvoiceResponse
	if err := json.Unmarshal(bodyBytes, &xenditResp); err != nil {
		return "", "", err
	}
	parsedInvoiceURL, err := url.Parse(xenditResp.InvoiceURL)
	if err != nil || parsedInvoiceURL == nil {
		return "", "", fmt.Errorf("payment gateway mengembalikan invoice tidak valid")
	}
	invoiceHost := strings.ToLower(parsedInvoiceURL.Hostname())
	if xenditResp.ID == "" || parsedInvoiceURL.Scheme != "https" || (invoiceHost != "xendit.co" && !strings.HasSuffix(invoiceHost, ".xendit.co")) {
		return "", "", fmt.Errorf("payment gateway mengembalikan invoice tidak valid")
	}

	return xenditResp.ID, xenditResp.InvoiceURL, nil
}

// XenditInvoiceStatus adalah ringkasan status invoice yang dibutuhkan untuk
// rekonsiliasi pembayaran.
type XenditInvoiceStatus struct {
	ID            string
	ExternalID    string
	Status        string
	Amount        int64
	PaidAmount    int64
	Currency      string
	PaymentMethod string
}

// GetInvoice menanyakan status invoice langsung ke Xendit. Ini dipakai sebagai
// jaring pengaman saat webhook tidak pernah sampai, supaya booking yang sudah
// dibayar tidak ikut dikedaluwarsakan.
func (s *xenditService) GetInvoice(invoiceID string) (*XenditInvoiceStatus, error) {
	if s.cfg.XenditAPIKey == "" {
		return nil, fmt.Errorf("Xendit belum dikonfigurasi")
	}
	if strings.TrimSpace(invoiceID) == "" {
		return nil, fmt.Errorf("invoice id kosong")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.xendit.co/v2/invoices/"+url.PathEscape(invoiceID), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Basic "+basicAuthHeader(s.cfg.XenditAPIKey))

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("payment gateway tidak dapat dihubungi")
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("payment gateway menolak permintaan status invoice (HTTP %d)", resp.StatusCode)
	}

	var payload struct {
		ID             string `json:"id"`
		ExternalID     string `json:"external_id"`
		Status         string `json:"status"`
		Amount         int64  `json:"amount"`
		PaidAmount     int64  `json:"paid_amount"`
		Currency       string `json:"currency"`
		PaymentMethod  string `json:"payment_method"`
		PaymentChannel string `json:"payment_channel"`
	}
	if err := json.Unmarshal(bodyBytes, &payload); err != nil {
		return nil, err
	}

	method := payload.PaymentMethod
	if method == "" {
		method = payload.PaymentChannel
	}
	return &XenditInvoiceStatus{
		ID:            payload.ID,
		ExternalID:    payload.ExternalID,
		Status:        payload.Status,
		Amount:        payload.Amount,
		PaidAmount:    payload.PaidAmount,
		Currency:      payload.Currency,
		PaymentMethod: method,
	}, nil
}

func basicAuthHeader(secretKey string) string {
	return base64.StdEncoding.EncodeToString([]byte(secretKey + ":"))
}

// xenditPayoutAPIVersion mengikuti kontrak Payouts v3. Versi invoice tetap v2
// karena merupakan produk/endpoint yang berbeda dari Payouts.
const xenditPayoutAPIVersion = "2025-09-01"

var ErrPayoutStatusUnknown = errors.New("status pencairan di gateway belum dapat dipastikan")

// XenditPayoutRequest adalah instruksi pencairan ke rekening mitra.
type XenditPayoutRequest struct {
	ReferenceID       string
	RoutingType       string
	RoutingValue      string
	AccountNumber     string
	AccountHolderName string
	Amount            int64
	Description       string
}

// XenditPayoutResult adalah hasil pengiriman instruksi pencairan.
type XenditPayoutResult struct {
	ID          string
	ReferenceID string
	Status      string
	FailureCode string
}

// CreatePayout mengirim instruksi pencairan ke Xendit Payouts API v3.
//
// ReferenceID dipakai sekaligus sebagai idempotency key sehingga percobaan ulang
// karena timeout jaringan tidak menghasilkan transfer ganda ke mitra.
func (s *xenditService) CreatePayout(req XenditPayoutRequest) (*XenditPayoutResult, error) {
	if s.cfg.XenditAPIKey == "" {
		return nil, fmt.Errorf("Xendit belum dikonfigurasi")
	}
	if req.Amount <= 0 {
		return nil, fmt.Errorf("nominal pencairan harus lebih dari 0")
	}
	for label, value := range map[string]string{
		"reference_id":        req.ReferenceID,
		"routing_type":        req.RoutingType,
		"routing_value":       req.RoutingValue,
		"account_number":      req.AccountNumber,
		"account_holder_name": req.AccountHolderName,
	} {
		if strings.TrimSpace(value) == "" {
			return nil, fmt.Errorf("%s wajib diisi untuk pencairan", label)
		}
	}

	recipient := payoutRecipient(req)
	payload := map[string]interface{}{
		"reference_id": req.ReferenceID,
		"recipient":    recipient,
		"payout_details": map[string]interface{}{
			"source_currency":      "IDR",
			"source_amount":        req.Amount,
			"destination_currency": "IDR",
		},
		"source_of_fund": "BUSINESS_REVENUE",
		"purpose_code":   "TRAVEL",
		"description":    truncateText(req.Description, 100),
		"metadata": map[string]string{
			"tripkita_reference_id": req.ReferenceID,
		},
	}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.xendit.co/v3/payouts", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("API-VERSION", xenditPayoutAPIVersion)
	httpReq.Header.Set("Idempotency-key", req.ReferenceID)
	httpReq.Header.Set("Authorization", "Basic "+basicAuthHeader(s.cfg.XenditAPIKey))

	resp, err := s.client.Do(httpReq)
	if err != nil {
		// Penting: kegagalan jaringan tidak berarti pencairan gagal. Instruksi
		// mungkin sudah diterima Xendit, jadi status harus dipastikan lewat
		// callback atau pengecekan manual sebelum dikirim ulang.
		log.Printf("[Xendit Payout] Koneksi gagal untuk reference_id=%s: %v", req.ReferenceID, err)
		return nil, fmt.Errorf("%w: payment gateway tidak dapat dihubungi", ErrPayoutStatusUnknown)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))

	var payoutResp struct {
		PayoutID    string `json:"payout_id"`
		ReferenceID string `json:"reference_id"`
		Status      string `json:"status"`
		FailureCode string `json:"failure_code"`
		ErrorCode   string `json:"error_code"`
		Message     string `json:"message"`
	}
	if err := json.Unmarshal(bodyBytes, &payoutResp); err != nil {
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return nil, fmt.Errorf("%w: respons gateway tidak dapat dibaca", ErrPayoutStatusUnknown)
		}
		return nil, fmt.Errorf("payment gateway mengembalikan respons tidak valid (HTTP %d)", resp.StatusCode)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("[Xendit Payout] Ditolak reference_id=%s status=%d error_code=%s", req.ReferenceID, resp.StatusCode, payoutResp.ErrorCode)
		if resp.StatusCode >= 500 {
			return nil, fmt.Errorf("%w: gateway mengembalikan HTTP %d", ErrPayoutStatusUnknown, resp.StatusCode)
		}
		if payoutResp.ErrorCode != "" {
			return nil, fmt.Errorf("payment gateway menolak pencairan (%s)", payoutResp.ErrorCode)
		}
		return nil, fmt.Errorf("payment gateway menolak pencairan (HTTP %d)", resp.StatusCode)
	}
	if payoutResp.PayoutID == "" {
		return nil, fmt.Errorf("%w: gateway tidak mengembalikan payout_id", ErrPayoutStatusUnknown)
	}

	return &XenditPayoutResult{
		ID:          payoutResp.PayoutID,
		ReferenceID: payoutResp.ReferenceID,
		Status:      payoutResp.Status,
		FailureCode: payoutResp.FailureCode,
	}, nil
}

// GetPayout mengambil status gateway sebagai jaring pengaman ketika callback
// terlambat atau gagal terkirim.
func (s *xenditService) GetPayout(payoutID string) (*XenditPayoutResult, error) {
	if s.cfg.XenditAPIKey == "" {
		return nil, fmt.Errorf("Xendit belum dikonfigurasi")
	}
	if strings.TrimSpace(payoutID) == "" {
		return nil, fmt.Errorf("payout id kosong")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.xendit.co/v3/payouts/"+url.PathEscape(payoutID), nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("API-VERSION", xenditPayoutAPIVersion)
	httpReq.Header.Set("Authorization", "Basic "+basicAuthHeader(s.cfg.XenditAPIKey))

	resp, err := s.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("payment gateway tidak dapat dihubungi: %w", err)
	}
	defer resp.Body.Close()
	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("payment gateway menolak permintaan status payout (HTTP %d)", resp.StatusCode)
	}

	var payoutResp struct {
		PayoutID    string `json:"payout_id"`
		ReferenceID string `json:"reference_id"`
		Status      string `json:"status"`
		FailureCode string `json:"failure_code"`
	}
	if err := json.Unmarshal(bodyBytes, &payoutResp); err != nil {
		return nil, fmt.Errorf("respons status payout tidak valid: %w", err)
	}
	if payoutResp.PayoutID == "" || payoutResp.ReferenceID == "" {
		return nil, fmt.Errorf("respons status payout tidak lengkap")
	}
	return &XenditPayoutResult{
		ID:          payoutResp.PayoutID,
		ReferenceID: payoutResp.ReferenceID,
		Status:      payoutResp.Status,
		FailureCode: payoutResp.FailureCode,
	}, nil
}

func payoutRecipient(req XenditPayoutRequest) map[string]interface{} {
	accountDetails := map[string]string{
		"currency":            "IDR",
		"account_country":     "ID",
		"account_holder_name": req.AccountHolderName,
		"account_number":      req.AccountNumber,
		"routing_type_1":      req.RoutingType,
		"routing_value_1":     req.RoutingValue,
	}

	holderName := strings.TrimSpace(req.AccountHolderName)
	recipient := map[string]interface{}{
		"relationship":    "BUSINESS_PARTNER",
		"account_details": accountDetails,
		"address":         map[string]string{"country": "ID"},
	}
	if looksLikeBusinessName(holderName) {
		recipient["type"] = "BUSINESS"
		recipient["business_name"] = truncateText(holderName, 50)
		return recipient
	}

	parts := strings.Fields(holderName)
	givenName, surname := holderName, holderName
	if len(parts) > 1 {
		givenName = parts[0]
		surname = strings.Join(parts[1:], " ")
	}
	recipient["type"] = "INDIVIDUAL"
	recipient["given_name"] = truncateText(givenName, 50)
	recipient["surname"] = truncateText(surname, 50)
	return recipient
}

func looksLikeBusinessName(name string) bool {
	normalized := strings.ToUpper(strings.TrimSpace(name))
	for _, prefix := range []string{"PT ", "PT. ", "CV ", "CV. ", "UD ", "UD. ", "KOPERASI ", "YAYASAN "} {
		if strings.HasPrefix(normalized, prefix) {
			return true
		}
	}
	return false
}
