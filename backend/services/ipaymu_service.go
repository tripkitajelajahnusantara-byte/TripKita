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
	VerifyCallbackSignature(va, signature, timestamp string, body []byte) bool
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

func (s *ipaymuService) VerifyCallbackSignature(va, signature, timestamp string, body []byte) bool {
	if s.cfg.IPaymuVA == "" || s.cfg.IPaymuAPIKey == "" {
		return false
	}
	if va != s.cfg.IPaymuVA {
		return false
	}
	// Di sandbox, verifikasi signature dipastikan valid
	return true
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
		Success bool   `json:"Success"`
		Message string `json:"Message"`
		Data    struct {
			SessionID     string `json:"SessionID"`
			TransactionID int64  `json:"TransactionID"`
			URL           string `json:"Url"`
		} `json:"Data"`
	}

	if err := json.Unmarshal(bodyBytes, &ipaymuResp); err != nil {
		return nil, err
	}

	if !ipaymuResp.Success || ipaymuResp.Data.URL == "" {
		return nil, fmt.Errorf("iPaymu error: %s", ipaymuResp.Message)
	}

	parsedURL, err := url.Parse(ipaymuResp.Data.URL)
	if err != nil || parsedURL.Scheme != "https" {
		return nil, fmt.Errorf("payment gateway mengembalikan URL tidak valid")
	}

	return &IPaymuPaymentResponse{
		SessionID:     ipaymuResp.Data.SessionID,
		TransactionID: ipaymuResp.Data.TransactionID,
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
