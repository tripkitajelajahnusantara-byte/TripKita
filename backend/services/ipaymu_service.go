package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"tripkita-provider/config"
	"tripkita-provider/models"
)

type IPaymuPaymentResponse struct {
	SessionID     string `json:"session_id"`
	TransactionID int64  `json:"transaction_id"`
	PaymentURL    string `json:"payment_url"`
}

type IPaymuPaymentStatus struct {
	TransactionID int64  `json:"transaction_id"`
	ReferenceID   string `json:"reference_id"`
	StatusCode    int    `json:"status_code"`
	Status        string `json:"status"`
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

type IPaymuService interface {
	CreatePayment(booking *models.Booking, packageName string) (*IPaymuPaymentResponse, error)
	GetTransactionStatus(transactionID string) (*IPaymuPaymentStatus, error)
	VerifyCallbackSignature(signature string, payload map[string]interface{}) bool
}

type ipaymuService struct {
	cfg    *config.Config
	client *http.Client
}

func NewIPaymuService(cfg *config.Config) IPaymuService {
	return &ipaymuService{
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

func (s *ipaymuService) generateSignature(method string, body []byte) (string, string) {
	timestamp := time.Now().Format("20060102150405")
	hBody := sha256.Sum256(body)
	bodyHashHex := strings.ToLower(hex.EncodeToString(hBody[:]))

	stringToSign := fmt.Sprintf("%s:%s:%s:%s", method, s.cfg.IPaymuVA, bodyHashHex, s.cfg.IPaymuAPIKey)

	mac := hmac.New(sha256.New, []byte(s.cfg.IPaymuAPIKey))
	mac.Write([]byte(stringToSign))
	signature := hex.EncodeToString(mac.Sum(nil))

	return signature, timestamp
}

func (s *ipaymuService) VerifyCallbackSignature(signature string, payload map[string]interface{}) bool {
	if s.cfg.IPaymuVA == "" || strings.TrimSpace(signature) == "" || payload == nil {
		return false
	}
	normalized, err := NormalizeIPaymuCallback(payload)
	if err != nil {
		return false
	}
	delete(normalized, "signature")

	// encoding/json mengurutkan map key secara leksikografis. Slash di-escape
	// terpisah agar byte yang di-HMAC sama dengan implementasi resmi iPaymu.
	body, err := marshalSortedIPaymuCallback(normalized)
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(s.cfg.IPaymuVA))
	_, _ = mac.Write(body)
	expected := mac.Sum(nil)
	received, err := hex.DecodeString(strings.TrimSpace(signature))
	return err == nil && hmac.Equal(expected, received)
}

// ParseIPaymuCallback membaca kedua content type callback yang didukung iPaymu.
// Form-urlencoded adalah format default mereka; JSON merupakan alternatif.
func ParseIPaymuCallback(body []byte, contentType string) (map[string]interface{}, error) {
	payload := make(map[string]interface{})
	if strings.Contains(strings.ToLower(contentType), "application/json") {
		decoder := json.NewDecoder(bytes.NewReader(body))
		decoder.UseNumber()
		if err := decoder.Decode(&payload); err != nil {
			return nil, fmt.Errorf("payload callback JSON tidak valid: %w", err)
		}
		return payload, nil
	}

	values, err := url.ParseQuery(string(body))
	if err != nil {
		return nil, fmt.Errorf("payload callback form tidak valid: %w", err)
	}
	for key, entries := range values {
		if len(entries) > 0 {
			payload[key] = entries[0]
		}
	}
	if len(payload) == 0 {
		return nil, fmt.Errorf("payload callback kosong")
	}
	return payload, nil
}

// NormalizeIPaymuCallback mengikuti aturan tipe data pada dokumentasi callback
// iPaymu. Perbedaan satu tipe saja akan menghasilkan HMAC yang berbeda.
func NormalizeIPaymuCallback(payload map[string]interface{}) (map[string]interface{}, error) {
	normalized := make(map[string]interface{}, len(payload)+1)
	integerFields := map[string]bool{
		"trx_id": true, "status_code": true, "transaction_status_code": true, "paid_off": true,
	}
	for key, value := range payload {
		switch {
		case integerFields[key]:
			n, err := strconv.ParseInt(stringValue(value), 10, 64)
			if err != nil {
				return nil, fmt.Errorf("field callback %s bukan integer", key)
			}
			normalized[key] = n
		case key == "is_escrow":
			raw := strings.ToLower(stringValue(value))
			normalized[key] = raw == "true" || raw == "1"
		case key == "additional_info":
			if value == nil || stringValue(value) == "" || stringValue(value) == "[]" {
				normalized[key] = []interface{}{}
			} else if _, ok := value.([]interface{}); ok {
				normalized[key] = value
			} else {
				normalized[key] = stringValue(value)
			}
		default:
			normalized[key] = stringValue(value)
		}
	}
	if _, exists := normalized["additional_info"]; !exists {
		normalized["additional_info"] = []interface{}{}
	}
	return normalized, nil
}

func marshalSortedIPaymuCallback(payload map[string]interface{}) ([]byte, error) {
	// Explicit sort documents the case-sensitive ordering requirement. The
	// reconstructed map is then serialized deterministically by encoding/json.
	keys := make([]string, 0, len(payload))
	for key := range payload {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	ordered := make(map[string]interface{}, len(keys))
	for _, key := range keys {
		ordered[key] = payload[key]
	}
	body, err := json.Marshal(ordered)
	if err != nil {
		return nil, err
	}
	return []byte(strings.ReplaceAll(string(body), "/", `\/`)), nil
}

func stringValue(value interface{}) string {
	if value == nil {
		return "null"
	}
	if number, ok := value.(json.Number); ok {
		return number.String()
	}
	return fmt.Sprint(value)
}

func (s *ipaymuService) CreatePayment(booking *models.Booking, packageName string) (*IPaymuPaymentResponse, error) {
	if s.cfg.IPaymuVA == "" || s.cfg.IPaymuAPIKey == "" {
		return nil, fmt.Errorf("iPaymu belum dikonfigurasi (VA atau API Key kosong)")
	}

	baseURL := strings.TrimRight(s.cfg.IPaymuBaseURL, "/")
	if baseURL == "" {
		baseURL = "https://sandbox.ipaymu.com/api/v2"
	}
	apiURL := baseURL + "/payment"

	if booking.CustomerEmail == "" {
		return nil, fmt.Errorf("email pelanggan wajib diisi")
	}

	referenceID := fmt.Sprintf("TK-BOOK-%d", booking.ID)
	if booking.BookingCode != "" {
		referenceID = booking.BookingCode
	}

	returnURL := s.cfg.IPaymuReturnURL
	if returnURL == "" {
		returnURL = fmt.Sprintf("%s/?payment_result=success&booking_id=%d#/riwayat-booking", s.cfg.FrontendURL, booking.ID)
	}

	cancelURL := s.cfg.IPaymuCancelURL
	if cancelURL == "" {
		cancelURL = fmt.Sprintf("%s/?payment_result=failed&booking_id=%d#/riwayat-booking", s.cfg.FrontendURL, booking.ID)
	}

	callbackURL := s.cfg.IPaymuCallbackURL
	if callbackURL == "" {
		callbackURL = fmt.Sprintf("%s/api/v1/public/webhooks/ipaymu", s.cfg.BackendURL)
	}

	payload := map[string]interface{}{
		"product":     []string{packageName},
		"qty":         []int{1},
		"price":       []int64{booking.TotalPrice},
		"description": []string{fmt.Sprintf("Pemesanan %s - %d peserta", packageName, booking.Guests)},
		"returnUrl":   returnURL,
		"cancelUrl":   cancelURL,
		"notifyUrl":   callbackURL,
		"referenceId": referenceID,
		"buyerName":   booking.CustomerName,
		"buyerEmail":  booking.CustomerEmail,
		"buyerPhone":  booking.CustomerPhone,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	signature, timestamp := s.generateSignature(http.MethodPost, jsonPayload)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("va", s.cfg.IPaymuVA)
	req.Header.Set("signature", signature)
	req.Header.Set("timestamp", timestamp)

	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("[iPaymu Error] Failed connection: %v", err)
		return nil, fmt.Errorf("payment gateway tidak dapat dihubungi")
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("[iPaymu Error Response] Status: %d, Body: %s", resp.StatusCode, string(bodyBytes))
		return nil, fmt.Errorf("payment gateway menolak pembuatan tagihan")
	}

	var ipaymuResp struct {
		Status  int    `json:"Status"`
		Message string `json:"Message"`
		Data    struct {
			SessionID     string      `json:"SessionID"`
			TransactionID json.Number `json:"TransactionID"`
			URL           string      `json:"Url"`
		} `json:"Data"`
	}

	decoder := json.NewDecoder(bytes.NewReader(bodyBytes))
	decoder.UseNumber()
	if err := decoder.Decode(&ipaymuResp); err != nil {
		return nil, err
	}

	if ipaymuResp.Status < 200 || ipaymuResp.Status >= 300 || ipaymuResp.Data.URL == "" || ipaymuResp.Data.SessionID == "" {
		return nil, fmt.Errorf("iPaymu error: %s", ipaymuResp.Message)
	}

	parsedURL, err := url.Parse(ipaymuResp.Data.URL)
	if err != nil || parsedURL.Scheme != "https" {
		return nil, fmt.Errorf("payment gateway mengembalikan URL tidak valid")
	}
	paymentHost := strings.ToLower(parsedURL.Hostname())
	if paymentHost != "my.ipaymu.com" && paymentHost != "sandbox.ipaymu.com" {
		return nil, fmt.Errorf("payment gateway mengembalikan host URL tidak resmi")
	}

	transactionID, _ := strconv.ParseInt(ipaymuResp.Data.TransactionID.String(), 10, 64)
	return &IPaymuPaymentResponse{
		SessionID:     ipaymuResp.Data.SessionID,
		TransactionID: transactionID,
		PaymentURL:    ipaymuResp.Data.URL,
	}, nil
}

func (s *ipaymuService) GetTransactionStatus(transactionID string) (*IPaymuPaymentStatus, error) {
	if s.cfg.IPaymuVA == "" || s.cfg.IPaymuAPIKey == "" {
		return nil, fmt.Errorf("iPaymu belum dikonfigurasi")
	}

	baseURL := strings.TrimRight(s.cfg.IPaymuBaseURL, "/")
	if baseURL == "" {
		baseURL = "https://sandbox.ipaymu.com/api/v2"
	}
	apiURL := baseURL + "/transaction"

	payload := map[string]interface{}{
		"transactionId": transactionID,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	signature, timestamp := s.generateSignature(http.MethodPost, jsonPayload)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("va", s.cfg.IPaymuVA)
	req.Header.Set("signature", signature)
	req.Header.Set("timestamp", timestamp)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("payment gateway tidak dapat dihubungi")
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("iPaymu error status (HTTP %d)", resp.StatusCode)
	}

	var payloadResp struct {
		Status  int  `json:"Status"`
		Success bool `json:"Success"`
		Data    struct {
			TransactionID int64  `json:"TransactionId"`
			ReferenceID   string `json:"ReferenceId"`
			StatusCode    int    `json:"StatusCode"`
			Status        string `json:"Status"`
			Amount        int64  `json:"Amount"`
			Via           string `json:"Via"`
		} `json:"Data"`
	}

	if err := json.Unmarshal(bodyBytes, &payloadResp); err != nil {
		return nil, err
	}

	return &IPaymuPaymentStatus{
		TransactionID: payloadResp.Data.TransactionID,
		ReferenceID:   payloadResp.Data.ReferenceID,
		StatusCode:    payloadResp.Data.StatusCode,
		Status:        payloadResp.Data.Status,
		Amount:        payloadResp.Data.Amount,
		PaymentMethod: payloadResp.Data.Via,
	}, nil
}
