package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"strings"
	"time"
)

// Pengiriman email lewat API HTTPS. Railway (paket selain Pro) dan sebagian
// platform lain memblokir koneksi SMTP keluar, sehingga smtp.gmail.com:587
// hanya menggantung sampai timeout. API memakai port 443 yang selalu terbuka.

const emailAPITimeout = 15 * time.Second

var emailAPIEndpoints = map[string]string{
	"brevo":  "https://api.brevo.com/v3/smtp/email",
	"resend": "https://api.resend.com/emails",
}

func (s *EmailService) sendViaAPI(to, subject, htmlBody string, pdfBytes []byte, pdfFilename string) error {
	provider := s.cfg.EmailAPIProvider
	endpoint, ok := emailAPIEndpoints[provider]
	if !ok {
		return fmt.Errorf("konfigurasi api email tidak dikenal: %s", provider)
	}
	if s.apiEndpointOverride != "" {
		endpoint = s.apiEndpointOverride
	}
	if strings.TrimSpace(s.cfg.EmailAPIKey) == "" {
		return fmt.Errorf("konfigurasi api email belum lengkap; EMAIL_API_KEY kosong")
	}
	from, err := mail.ParseAddress(strings.TrimSpace(s.cfg.SMTPFrom))
	if err != nil || from.Address == "" {
		return fmt.Errorf("alamat pengirim email tidak valid")
	}
	recipient, err := mail.ParseAddress(strings.TrimSpace(to))
	if err != nil || recipient.Address == "" {
		return fmt.Errorf("alamat penerima email tidak valid")
	}
	hasAttachment := len(pdfBytes) > 0 && pdfFilename != ""
	encoded := ""
	if hasAttachment {
		encoded = base64.StdEncoding.EncodeToString(pdfBytes)
	}

	var payload map[string]interface{}
	req, _ := http.NewRequest(http.MethodPost, endpoint, nil)
	switch provider {
	case "brevo":
		payload = map[string]interface{}{
			"sender":      map[string]string{"name": "TemenTrip", "email": from.Address},
			"to":          []map[string]string{{"email": recipient.Address}},
			"subject":     subject,
			"htmlContent": htmlBody,
		}
		if hasAttachment {
			payload["attachment"] = []map[string]string{{"name": pdfFilename, "content": encoded}}
		}
		req.Header.Set("api-key", s.cfg.EmailAPIKey)
	case "resend":
		payload = map[string]interface{}{
			"from":    fmt.Sprintf("TemenTrip <%s>", from.Address),
			"to":      []string{recipient.Address},
			"subject": subject,
			"html":    htmlBody,
		}
		if hasAttachment {
			payload["attachments"] = []map[string]string{{"filename": pdfFilename, "content": encoded}}
		}
		req.Header.Set("Authorization", "Bearer "+s.cfg.EmailAPIKey)
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("gagal menyusun email: %w", err)
	}
	req.Body = io.NopCloser(bytes.NewReader(body))
	req.ContentLength = int64(len(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := s.httpClient
	if client == nil {
		client = &http.Client{Timeout: emailAPITimeout}
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("gagal terhubung ke api email %s: %w", provider, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	detail, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	switch resp.StatusCode {
	case http.StatusUnauthorized, http.StatusForbidden:
		return fmt.Errorf("autentikasi api email ditolak (%d): %s", resp.StatusCode, strings.TrimSpace(string(detail)))
	default:
		return fmt.Errorf("api email %s menolak pengiriman (%d): %s", provider, resp.StatusCode, strings.TrimSpace(string(detail)))
	}
}
