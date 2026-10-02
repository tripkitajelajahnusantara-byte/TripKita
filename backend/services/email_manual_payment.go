package services

import (
	"fmt"
	"html"
	"net/url"
	"strings"
	"time"

	"tripkita-provider/models"
)

// Email alur transfer manual. Tamu (tanpa akun) tidak menerima notifikasi
// in-app, sehingga email inilah satu-satunya jejak kode booking dan tautan
// pembayarannya.

func (s *EmailService) paymentPageURL(bookingCode string) string {
	return fmt.Sprintf("%s/#/halaman-pembayaran?code=%s", strings.TrimRight(s.cfg.FrontendURL, "/"), url.QueryEscape(bookingCode))
}

func formatJakartaTime(t time.Time) string {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.FixedZone("WIB", 7*3600)
	}
	return t.In(loc).Format("02 Jan 2006 15.04") + " WIB"
}

func manualPaymentEmailLayout(accent, heading, intro, details, ctaURL, ctaLabel, footer string) string {
	return fmt.Sprintf(`<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px;color:#1e293b">
<div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:30px">
<h2 style="color:#0284c7;text-align:center">Temen<span style="color:#00c9a7">Trip</span></h2>
<h3 style="color:%s;margin:16px 0 8px">%s</h3>
<p style="font-size:14px;line-height:1.6">%s</p>
%s
<p style="text-align:center;margin:24px 0"><a href="%s" style="background:#0284c7;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">%s</a></p>
<p style="font-size:12px;color:#64748b;line-height:1.6">%s</p>
</div></body></html>`, accent, heading, intro, details, html.EscapeString(ctaURL), ctaLabel, footer)
}

// SendManualPaymentInstructionEmail dikirim saat booking dibuat.
func (s *EmailService) SendManualPaymentInstructionEmail(b *models.Booking, packageName string, deadline time.Time) error {
	if strings.TrimSpace(b.CustomerEmail) == "" {
		return nil
	}
	subject := fmt.Sprintf("Instruksi Pembayaran - Pesanan #%s TemenTrip", b.BookingCode)
	details := fmt.Sprintf(`<table style="width:100%%;font-size:14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px">
<tr><td style="color:#64748b">Kode booking</td><td><strong>%s</strong></td></tr>
<tr><td style="color:#64748b">Paket</td><td>%s</td></tr>
<tr><td style="color:#64748b">Total transfer</td><td><strong style="color:#0284c7">Rp %s</strong></td></tr>
<tr><td style="color:#64748b">Bank</td><td><strong>%s</strong></td></tr>
<tr><td style="color:#64748b">No. rekening</td><td><strong>%s</strong></td></tr>
<tr><td style="color:#64748b">Atas nama</td><td>%s</td></tr>
<tr><td style="color:#64748b">Batas bayar</td><td><strong style="color:#c2410c">%s</strong></td></tr>
</table>`,
		html.EscapeString(b.BookingCode), html.EscapeString(packageName), formatIDRNumber(b.TotalPrice),
		html.EscapeString(s.cfg.ManualPaymentBankName), html.EscapeString(s.cfg.ManualPaymentAccountNumber),
		html.EscapeString(s.cfg.ManualPaymentAccountHolder), formatJakartaTime(deadline))
	body := manualPaymentEmailLayout("#0f172a", "Selesaikan pembayaran Anda",
		fmt.Sprintf("Halo <strong>%s</strong>, kuota Anda sedang kami tahan. Transfer <strong>tepat sesuai total</strong>, tulis kode booking di berita transfer, lalu unggah bukti transfer melalui tombol di bawah.", html.EscapeString(b.CustomerName)),
		details, s.paymentPageURL(b.BookingCode), "Unggah Bukti Transfer",
		"Simpan email ini: kode booking diperlukan untuk memantau pesanan di menu Cek Booking. Jika tidak dibayar sebelum batas waktu, pesanan dibatalkan otomatis.")
	return s.sendMailWithAttachment(b.CustomerEmail, subject, body, nil, "")
}

// SendPaymentProofReceivedEmail dikirim saat customer mengunggah bukti.
func (s *EmailService) SendPaymentProofReceivedEmail(b *models.Booking) error {
	if strings.TrimSpace(b.CustomerEmail) == "" {
		return nil
	}
	reviewBy := "1×24 jam"
	if b.PaymentReviewDeadline != nil {
		reviewBy = formatJakartaTime(*b.PaymentReviewDeadline)
	}
	subject := fmt.Sprintf("Bukti Transfer Diterima - Pesanan #%s TemenTrip", b.BookingCode)
	body := manualPaymentEmailLayout("#2563eb", "Bukti transfer sedang diperiksa",
		fmt.Sprintf("Halo <strong>%s</strong>, bukti transfer untuk pesanan <strong>#%s</strong> sudah kami terima. Admin akan memeriksanya paling lambat <strong>%s</strong>.", html.EscapeString(b.CustomerName), html.EscapeString(b.BookingCode), reviewBy),
		"", s.paymentPageURL(b.BookingCode), "Lihat Status Pembayaran",
		"Anda akan menerima email lagi setelah pembayaran disetujui atau bila bukti perlu diperbaiki.")
	return s.sendMailWithAttachment(b.CustomerEmail, subject, body, nil, "")
}

// SendPaymentProofRejectedEmail dikirim saat admin menolak bukti transfer.
func (s *EmailService) SendPaymentProofRejectedEmail(b *models.Booking, deadline time.Time) error {
	if strings.TrimSpace(b.CustomerEmail) == "" {
		return nil
	}
	reason := strings.TrimSpace(b.PaymentReviewNotes)
	if reason == "" {
		reason = "Bukti transfer belum dapat dikonfirmasi."
	}
	subject := fmt.Sprintf("Bukti Transfer Perlu Diperbaiki - Pesanan #%s TemenTrip", b.BookingCode)
	details := fmt.Sprintf(`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;font-size:14px;color:#991b1b"><strong>Alasan:</strong> %s</div>`, html.EscapeString(reason))
	body := manualPaymentEmailLayout("#dc2626", "Bukti transfer belum dapat dikonfirmasi",
		fmt.Sprintf("Halo <strong>%s</strong>, admin belum dapat mengonfirmasi bukti transfer pesanan <strong>#%s</strong>. Silakan unggah bukti yang benar sebelum <strong>%s</strong>.", html.EscapeString(b.CustomerName), html.EscapeString(b.BookingCode), formatJakartaTime(deadline)),
		details, s.paymentPageURL(b.BookingCode), "Unggah Ulang Bukti",
		"Bila Anda yakin dana sudah terpotong, balas email ini atau hubungi layanan pelanggan TemenTrip dengan menyertakan kode booking.")
	return s.sendMailWithAttachment(b.CustomerEmail, subject, body, nil, "")
}
