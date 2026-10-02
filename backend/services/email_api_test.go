package services

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"tripkita-provider/config"
)

func TestSendViaBrevoAPI(t *testing.T) {
	var got map[string]interface{}
	var apiKey string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey = r.Header.Get("api-key")
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &got)
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	email := NewEmailService(&config.Config{EmailAPIProvider: "brevo", EmailAPIKey: "xkeysib-test", SMTPFrom: "tripkita@example.com"}, nil)
	email.apiEndpointOverride = server.URL
	if err := email.sendMailWithAttachment("customer@example.com", "Uji", "<p>Halo</p>", []byte("%PDF"), "bukti.pdf"); err != nil {
		t.Fatal(err)
	}
	if apiKey != "xkeysib-test" {
		t.Fatalf("api-key header tidak dikirim: %q", apiKey)
	}
	sender := got["sender"].(map[string]interface{})
	if sender["email"] != "tripkita@example.com" || got["subject"] != "Uji" || got["htmlContent"] != "<p>Halo</p>" {
		t.Fatalf("payload brevo tidak sesuai: %v", got)
	}
	if attachments, ok := got["attachment"].([]interface{}); !ok || len(attachments) != 1 {
		t.Fatalf("lampiran PDF tidak ikut terkirim: %v", got["attachment"])
	}
}

func TestSendViaAPIReportsRejectedKey(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
			t.Errorf("resend wajib memakai Bearer token")
		}
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"message":"invalid api key"}`))
	}))
	defer server.Close()

	email := NewEmailService(&config.Config{EmailAPIProvider: "resend", EmailAPIKey: "re_bad", SMTPFrom: "tripkita@example.com"}, nil)
	email.apiEndpointOverride = server.URL
	err := email.sendMailWithAttachment("customer@example.com", "Uji", "<p>Halo</p>", nil, "")
	if err == nil {
		t.Fatal("key yang ditolak seharusnya menghasilkan error")
	}
	if hint := emailFailureHint(err); !strings.Contains(hint, "EMAIL_API_KEY") {
		t.Fatalf("petunjuk untuk admin tidak menyebut EMAIL_API_KEY: %q", hint)
	}
}
