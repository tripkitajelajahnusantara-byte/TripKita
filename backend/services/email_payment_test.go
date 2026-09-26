package services

import (
	"bytes"
	"fmt"
	"net/smtp"
	"strings"
	"testing"
	"time"

	"tripkita-provider/config"
	"tripkita-provider/models"
)

func TestPaymentSuccessEmailContainsValidPDFPage(t *testing.T) {
	paidAt := time.Date(2026, 9, 26, 10, 30, 0, 0, time.FixedZone("WIB", 7*60*60))
	booking := &models.Booking{
		BookingCode: "TK-PDF-1", Status: models.StatusPaid, CustomerName: "Pelanggan Uji",
		CustomerEmail: "customer@example.com", CustomerPhone: "08123456789", TotalPrice: 250000,
		Guests: 2, TripDate: paidAt.AddDate(0, 1, 0), PaidAt: &paidAt,
		IPaymuTransactionID: "12345678", PaymentMethod: "iPaymu va bca",
	}
	pkg := &models.Package{Name: "Paket Uji", Destination: "Bali", MeetingPoint: "Sanur"}
	pdfService := NewPDFService()
	pdf, filename, err := pdfService.GenerateBookingReceiptPDF(booking, pkg)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(pdf, []byte("%PDF-1.4")) || !bytes.HasSuffix(pdf, []byte("%%EOF\n")) {
		t.Fatal("generated attachment is not a complete PDF document")
	}
	assertPDFXRefOffsets(t, pdf, 6)
	if filename != "Pembayaran_Berhasil_TemenTrip_TK-PDF-1.pdf" {
		t.Fatalf("unexpected filename: %s", filename)
	}

	var sentMessage []byte
	email := NewEmailService(&config.Config{SMTPHost: "smtp.example.test", SMTPPort: "587", SMTPUser: "user", SMTPPass: "pass", SMTPFrom: "no-reply@example.test"}, pdfService)
	email.mailSender = func(addr string, auth smtp.Auth, from string, to []string, message []byte) error {
		sentMessage = append([]byte(nil), message...)
		return nil
	}
	if err := email.SendPaymentSuccessEmail(booking, pkg); err != nil {
		t.Fatal(err)
	}
	mime := string(sentMessage)
	if !strings.Contains(mime, "Content-Type: application/pdf") || !strings.Contains(mime, filename) || !strings.Contains(mime, "Halaman Pembayaran Berhasil dalam PDF") {
		t.Fatalf("payment email is missing PDF MIME attachment or success-page explanation")
	}
}

func TestEveryCustomerTransactionOutcomeBuildsAnEmail(t *testing.T) {
	booking := &models.Booking{
		BookingCode: "TK-OUTCOMES", CustomerName: "Pelanggan Uji", CustomerEmail: "customer@example.com",
		CustomerPhone: "08123456789", TotalPrice: 250000, RefundAmount: 250000,
	}
	email := NewEmailService(&config.Config{SMTPHost: "smtp.example.test", SMTPPort: "587", SMTPUser: "user", SMTPPass: "pass", SMTPFrom: "no-reply@example.test"}, NewPDFService())
	sent := 0
	email.mailSender = func(addr string, auth smtp.Auth, from string, to []string, message []byte) error {
		sent++
		if len(message) == 0 || len(to) != 1 || to[0] != booking.CustomerEmail {
			t.Fatalf("invalid email dispatch for outcome %d", sent)
		}
		return nil
	}

	senders := []func() error{
		func() error { return email.SendPaymentFailedEmail(booking) },
		func() error { return email.SendExpiredEmail(booking) },
		func() error { return email.SendCancelledEmail(booking) },
		func() error { return email.SendRefundPendingEmail(booking) },
		func() error { return email.SendRefundEmail(booking) },
	}
	for _, send := range senders {
		if err := send(); err != nil {
			t.Fatal(err)
		}
	}
	if sent != len(senders) {
		t.Fatalf("sent %d outcome emails, want %d", sent, len(senders))
	}
}

func assertPDFXRefOffsets(t *testing.T, pdf []byte, objectCount int) {
	t.Helper()
	for objectID := 1; objectID <= objectCount; objectID++ {
		marker := []byte(fmt.Sprintf("%d 0 obj", objectID))
		offset := bytes.Index(pdf, marker)
		if offset < 0 || !bytes.Contains(pdf, []byte(fmt.Sprintf("%010d 00000 n", offset))) {
			t.Fatalf("xref offset missing or invalid for object %d", objectID)
		}
	}
}
