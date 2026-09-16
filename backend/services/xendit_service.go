package services

import (
	"bytes"
	"encoding/base64"
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

type XenditInvoiceResponse struct {
	ID         string `json:"id"`
	InvoiceURL string `json:"invoice_url"`
	Status     string `json:"status"`
}

type XenditService interface {
	CreateInvoice(booking *models.Booking, packageName string) (string, string, error)
}

type xenditService struct {
	cfg *config.Config
}

func NewXenditService(cfg *config.Config) XenditService {
	return &xenditService{cfg: cfg}
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
		"invoice_duration":     86400, // 24 hours
		"success_redirect_url": fmt.Sprintf("%s/?payment_result=success&booking_id=%d#/riwayat-booking", s.cfg.FrontendURL, booking.ID),
		"failure_redirect_url": fmt.Sprintf("%s/?payment_result=failed&booking_id=%d#/riwayat-booking", s.cfg.FrontendURL, booking.ID),
		"currency":             "IDR",
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return "", "", err
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-IDEMPOTENCY-KEY", fmt.Sprintf("tripkita-invoice-%d", booking.ID))

	// Basic Auth with Xendit Secret Key
	auth := s.cfg.XenditAPIKey + ":"
	basicAuth := base64.StdEncoding.EncodeToString([]byte(auth))
	req.Header.Set("Authorization", "Basic "+basicAuth)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
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
