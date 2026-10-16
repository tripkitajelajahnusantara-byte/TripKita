package services

import (
	"net/smtp"
	"strings"
	"testing"
	"time"

	"tripkita-provider/config"
	"tripkita-provider/models"
)

func TestManualPaymentInstructionEmailContainsTransferDetails(t *testing.T) {
	var sent string
	email := NewEmailService(&config.Config{
		SMTPHost: "smtp.example.test", SMTPPort: "587", SMTPUser: "user", SMTPPass: "pass", SMTPFrom: "no-reply@example.test",
		FrontendURL:           "https://app.example.com",
		ManualPaymentBankName: "BCA", ManualPaymentAccountNumber: "1234567890", ManualPaymentAccountHolder: "PT Contoh",
	}, nil)
	email.mailSender = func(addr string, auth smtp.Auth, from string, to []string, message []byte) error {
		sent = string(message)
		return nil
	}
	booking := &models.Booking{BookingCode: "TK-20260928-AB12CD34", CustomerName: "<b>Budi</b>", CustomerEmail: "budi@example.com", TotalPrice: 1255000}
	deadline := time.Date(2026, 9, 29, 12, 0, 0, 0, time.UTC)
	if err := email.SendManualPaymentInstructionEmail(booking, "Bromo", deadline); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"1234567890", "PT Contoh", "TK-20260928-AB12CD34",
		"https://app.example.com/#/halaman-pembayaran?code=TK-20260928-AB12CD34",
		"29 Sep 2026 19.00 WIB", "&lt;b&gt;Budi&lt;/b&gt;",
	} {
		if !strings.Contains(sent, want) {
			t.Errorf("email tidak memuat %q", want)
		}
	}
}

func TestAdminPaymentReviewEmailContainsBookingAndPanelLink(t *testing.T) {
	var sent string
	var recipients []string
	email := NewEmailService(&config.Config{
		SMTPHost: "smtp.example.test", SMTPPort: "587", SMTPUser: "user", SMTPPass: "pass", SMTPFrom: "no-reply@example.test",
		FrontendURL: "https://app.example.com/",
	}, nil)
	email.mailSender = func(addr string, auth smtp.Auth, from string, to []string, message []byte) error {
		sent, recipients = string(message), to
		return nil
	}
	booking := &models.Booking{BookingCode: "TK-1", CustomerName: "Budi", CustomerEmail: "budi@example.com", TotalPrice: 500000}
	if err := email.SendAdminPaymentReviewEmail("admin@example.com", booking, "Bromo"); err != nil {
		t.Fatal(err)
	}
	if len(recipients) != 1 || recipients[0] != "admin@example.com" {
		t.Fatalf("penerima salah: %v", recipients)
	}
	for _, want := range []string{"TK-1", "Bromo", "budi@example.com", "https://app.example.com/#/admin/dashboard"} {
		if !strings.Contains(sent, want) {
			t.Errorf("email tidak memuat %q", want)
		}
	}
}
