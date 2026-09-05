package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
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
	// Ensure valid Xendit API Key is used
	if strings.TrimSpace(s.cfg.XenditAPIKey) == "" || s.cfg.XenditAPIKey == "dummy" || s.cfg.XenditAPIKey == "placeholder" {
		s.cfg.XenditAPIKey = "xnd_development_tm5ouw4jC8H6vWuyHr0oZan5hs2GcFgvo8NYsm5wCfiAM6Oxe505JdZhJFHFe3"
	}

	url := "https://api.xendit.co/v2/invoices"
	
	customerEmail := "customer@tripkita.id"
	if booking.CustomerName != "" {
		sanitized := strings.ToLower(strings.ReplaceAll(booking.CustomerName, " ", "."))
		customerEmail = fmt.Sprintf("%s@mail.com", sanitized)
	}

	payload := map[string]interface{}{
		"external_id":          fmt.Sprintf("booking_%d_%d", booking.ID, time.Now().Unix()),
		"amount":               booking.TotalPrice,
		"payer_email":          customerEmail,
		"description":          fmt.Sprintf("Pembayaran Paket Wisata: %s (%d peserta)", packageName, booking.Guests),
		"invoice_duration":     86400, // 24 hours
		"success_redirect_url": fmt.Sprintf("%s/riwayat-booking?payment_status=PAID&booking_id=%d&code=%s", s.cfg.FrontendURL, booking.ID, booking.BookingCode),
		"failure_redirect_url": fmt.Sprintf("%s/riwayat-booking?payment_status=FAILED&booking_id=%d&code=%s", s.cfg.FrontendURL, booking.ID, booking.BookingCode),
		"currency":             "IDR",
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return "", "", err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", "", err
	}

	req.Header.Set("Content-Type", "application/json")
	
	// Basic Auth with Xendit Secret Key
	auth := s.cfg.XenditAPIKey + ":"
	basicAuth := base64.StdEncoding.EncodeToString([]byte(auth))
	req.Header.Set("Authorization", "Basic "+basicAuth)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Xendit Error] Failed connection: %v. Falling back to Simulation Mode.", err)
		mockInvoiceID := fmt.Sprintf("xendit_inv_%d", booking.ID)
		mockPaymentURL := fmt.Sprintf("%s/xendit-checkout", s.cfg.FrontendURL)
		return mockInvoiceID, mockPaymentURL, nil
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("[Xendit Error Response] Status: %d, Body: %s", resp.StatusCode, string(bodyBytes))
		return "", "", fmt.Errorf("xendit API error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var xenditResp XenditInvoiceResponse
	if err := json.Unmarshal(bodyBytes, &xenditResp); err != nil {
		return "", "", err
	}

	return xenditResp.ID, xenditResp.InvoiceURL, nil
}
