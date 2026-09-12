package services

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"log"
	"net/smtp"

	"tripkita-provider/config"
	"tripkita-provider/models"
)

type EmailService struct {
	cfg        *config.Config
	pdfService *PDFService
}

func NewEmailService(cfg *config.Config, pdfService *PDFService) *EmailService {
	return &EmailService{
		cfg:        cfg,
		pdfService: pdfService,
	}
}

// SendPaymentSuccessEmail sends payment confirmation email to Customer with PDF E-Voucher attachment
func (s *EmailService) SendPaymentSuccessEmail(b *models.Booking, pkg *models.Package) error {
	to := b.CustomerEmail
	if to == "" {
		log.Println("[EmailService] Customer email is empty, skipping dispatch.")
		return nil
	}

	subject := fmt.Sprintf("✨ Pembayaran Berhasil! E-Voucher Pesanan #%s - TemenTrip", b.BookingCode)

	pdfBytes, pdfFilename, err := s.pdfService.GenerateBookingReceiptPDF(b, pkg)
	if err != nil {
		log.Printf("[EmailService] Failed to generate PDF: %v\n", err)
	}

	packageName := "Paket Wisata TemenTrip"
	destination := "Indonesia"
	meetingPoint := "Lokasi Utama Destinasi"

	if pkg != nil {
		if pkg.Name != "" {
			packageName = pkg.Name
		}
		if pkg.Destination != "" {
			destination = pkg.Destination
		}
		if pkg.MeetingPoint != "" {
			meetingPoint = pkg.MeetingPoint
		}
	}

	travelDateStr := b.TripDate.Format("02 Jan 2006")

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
      <h2 style="color: #0284c7; margin: 0; font-size: 24px;">Temen<span style="color: #00c9a7;">Trip</span>✨</h2>
      <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Sahabat Perjalanan Wisata Indonesia</p>
    </div>

    <div style="padding: 24px 0;">
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
        <h3 style="color: #059669; margin: 0 0 6px 0;">🎉 Pembayaran Berhasil Dilakukan!</h3>
        <p style="color: #047857; margin: 0; font-size: 14px;">Terima kasih <strong>%s</strong>, pesanan wisata Anda telah aktif dan terkonfirmasi.</p>
      </div>

      <table style="width: 100%%; font-size: 14px; color: #334155; margin-bottom: 20px;">
        <tr><td style="padding: 6px 0; color: #64748b;">Kode Invoice:</td><td style="text-align: right; font-weight: bold;">%s</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Nama Paket:</td><td style="text-align: right; font-weight: bold; color: #0284c7;">%s</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Destinasi:</td><td style="text-align: right; font-weight: bold;">%s</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Titik Kumpul (Meeting Point):</td><td style="text-align: right; font-weight: bold; color: #059669;">%s</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Tanggal Waktu:</td><td style="text-align: right; font-weight: bold;">%s</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Jumlah Peserta:</td><td style="text-align: right; font-weight: bold;">%d Orang</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Total Dibayar:</td><td style="text-align: right; font-weight: bold; color: #0284c7; font-size: 16px;">Rp %s</td></tr>
      </table>

      <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 14px; border-radius: 8px; font-size: 13.5px; color: #0369a1;">
        <strong>📄 Bukti E-Voucher PDF Terlampir:</strong><br>
        Kami telah melampirkan berkas PDF E-Voucher resmi pada email ini. Harap mengunduh dan menyimpannya untuk ditunjukkan kepada petugas saat tiba di Titik Kumpul.
      </div>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
      &copy; 2026 TemenTrip. Hak Cipta Dilindungi Undang-Undang.<br>
      Ada pertanyaan? Hubungi Customer Service di <a href="mailto:tripkitajelajahnusantara@gmail.com" style="color: #0284c7;">tripkitajelajahnusantara@gmail.com</a>
    </div>
  </div>
</body>
</html>
`, b.CustomerName, b.BookingCode, packageName, destination, meetingPoint, travelDateStr, b.Guests, formatIDRNumber(b.TotalPrice))

	return s.sendMailWithAttachment(to, subject, htmlBody, pdfBytes, pdfFilename)
}

// SendRefundEmail sends refund confirmation email to Customer with PDF Refund receipt attachment
func (s *EmailService) SendRefundEmail(b *models.Booking) error {
	to := b.CustomerEmail
	if to == "" {
		return nil
	}

	subject := fmt.Sprintf("💳 Refund Berhasil Diproses! Pesanan #%s - TemenTrip", b.BookingCode)

	pdfBytes, pdfFilename, err := s.pdfService.GenerateRefundReceiptPDF(b)
	if err != nil {
		log.Printf("[EmailService] Failed to generate Refund PDF: %v\n", err)
	}

	packageName := "Paket Wisata"
	if b.Package.Name != "" {
		packageName = b.Package.Name
	}

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0284c7; text-align: center;">Temen<span style="color: #00c9a7;">Trip</span>✨</h2>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
      <h3 style="color: #dc2626; margin: 0 0 6px 0;">Pengembalian Dana (Refund) Diproses</h3>
      <p style="color: #991b1b; margin: 0; font-size: 14px;">Halo <strong>%s</strong>, pengembalian dana sebesar <strong>Rp %s</strong> untuk invoice #%s (Paket: %s) telah berhasil diproses.</p>
    </div>
    <p style="font-size: 14px; color: #475569;">Bukti tanda terima Refund resmi dalam bentuk PDF telah dilampirkan pada email ini. Dana akan efektif masuk ke rekening/dompet elektronik Anda sesuai ketentuan perbankan.</p>
    <p style="font-size: 14px; color: #475569;">Terima kasih atas pengertian Anda. Semoga kita dapat bertemu di perjalanan berikutnya!</p>
  </div>
</body>
</html>
`, b.CustomerName, formatIDRNumber(b.TotalPrice), b.BookingCode, packageName)

	return s.sendMailWithAttachment(to, subject, htmlBody, pdfBytes, pdfFilename)
}

// SendExpiredEmail sends payment expired notification email to Customer (no PDF attachment)
func (s *EmailService) SendExpiredEmail(b *models.Booking) error {
	to := b.CustomerEmail
	if to == "" {
		return nil
	}

	subject := fmt.Sprintf("⏳ Waktu Pembayaran Berakhir - Pesanan #%s TemenTrip", b.BookingCode)

	packageName := "Paket Wisata"
	if b.Package.Name != "" {
		packageName = b.Package.Name
	}

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0284c7; text-align: center;">Temen<span style="color: #00c9a7;">Trip</span>✨</h2>
    <div style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
      <h3 style="color: #c2410c; margin: 0 0 6px 0;">Batas Waktu Pembayaran Telah Berakhir</h3>
      <p style="color: #9a3412; margin: 0; font-size: 14px;">Halo <strong>%s</strong>, masa berlaku tagihan pembayaran pesanan <strong>%s</strong> (Kode: #%s) telah kadaluarsa.</p>
    </div>
    <div style="padding: 16px; background-color: #f8fafc; border-radius: 12px; text-align: center; font-size: 14px; color: #475569; margin-bottom: 20px;">
      <p style="margin: 0;">Jangan berkecil hati! Anda selalu dapat membuat pemesanan tur baru kapan saja melalui aplikasi & website TemenTrip.</p>
      <p style="margin: 10px 0 0 0; font-weight: bold; color: #0284c7;">Semoga dapat menjelajahi keindahan Indonesia bersama TemenTrip di lain kesempatan! 🌄🌴</p>
    </div>
  </div>
</body>
</html>
`, b.CustomerName, packageName, b.BookingCode)

	return s.sendMailWithAttachment(to, subject, htmlBody, nil, "")
}

// SendPayoutDisbursedEmail sends payout completion notification email to Provider with PDF Transfer Proof attachment
func (s *EmailService) SendPayoutDisbursedEmail(payout *models.Payout, provider *models.Provider) error {
	to := provider.Email
	if to == "" {
		return nil
	}

	payoutTypeLabel := "Pencairan Penuh (100%)"
	if payout.Type == "DP_50" {
		payoutTypeLabel = "Uang Muka (DP 50%)"
	} else if payout.Type == "PELUNASAN_50" {
		payoutTypeLabel = "Pelunasan Sisa (50%)"
	}

	subject := fmt.Sprintf("💰 Pencairan Dana %s Berhasil Ditransfer! - TemenTrip Partner", payoutTypeLabel)

	pdfBytes, pdfFilename, err := s.pdfService.GeneratePayoutReceiptPDF(payout, provider)
	if err != nil {
		log.Printf("[EmailService] Failed to generate Payout PDF: %v\n", err)
	}

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0284c7; text-align: center;">Temen<span style="color: #00c9a7;">Trip</span> Partner Hub</h2>
    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
      <h3 style="color: #059669; margin: 0 0 6px 0;">Pencairan Dana Berhasil Ditransfer!</h3>
      <p style="color: #047857; margin: 0; font-size: 14px;">Halo <strong>%s</strong>, pengajuan pencairan dana kategori <strong>%s</strong> sebesar <strong>Rp %s</strong> telah ditransfer ke rekening bank Anda.</p>
    </div>
    <table style="width: 100%%; font-size: 14px; color: #334155; margin-bottom: 20px;">
      <tr><td style="padding: 4px 0; color: #64748b;">Bank Tujuan:</td><td style="text-align: right; font-weight: bold;">%s</td></tr>
      <tr><td style="padding: 4px 0; color: #64748b;">Nomor Rekening:</td><td style="text-align: right; font-weight: bold;">%s</td></tr>
      <tr><td style="padding: 4px 0; color: #64748b;">Atas Nama:</td><td style="text-align: right; font-weight: bold;">%s</td></tr>
      <tr><td style="padding: 4px 0; color: #64748b;">Jumlah Transfer:</td><td style="text-align: right; font-weight: bold; color: #059669; font-size: 16px;">Rp %s</td></tr>
    </table>
    <p style="font-size: 13.5px; color: #475569;">Lampiran Bukti Transfer Resmi PDF telah dilampirkan pada email ini. Silakan memeriksa mutasi rekening Anda secara berkala.</p>
  </div>
</body>
</html>
`, provider.BusinessName, payoutTypeLabel, formatIDRNumber(int64(payout.Amount)), payout.BankName, payout.BankAccount, payout.BankAccountName, formatIDRNumber(int64(payout.Amount)))

	return s.sendMailWithAttachment(to, subject, htmlBody, pdfBytes, pdfFilename)
}

func (s *EmailService) sendMailWithAttachment(to, subject, htmlBody string, pdfBytes []byte, pdfFilename string) error {
	smtpUser := s.cfg.SMTPUser
	smtpPass := s.cfg.SMTPPass
	smtpHost := s.cfg.SMTPHost
	smtpPort := s.cfg.SMTPPort
	fromAddr := s.cfg.SMTPFrom

	if smtpUser == "" || smtpPass == "" || smtpHost == "" {
		log.Printf("[EmailService] SMTP credentials not fully set. Logged Email dispatch to: %s | Subject: %s\n", to, subject)
		return nil
	}

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	var bodyBuf bytes.Buffer
	boundary := "===TemenTripBoundary123456789==="

	bodyBuf.WriteString(fmt.Sprintf("From: TemenTrip <%s>\r\n", fromAddr))
	bodyBuf.WriteString(fmt.Sprintf("To: %s\r\n", to))
	bodyBuf.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	bodyBuf.WriteString("MIME-Version: 1.0\r\n")

	if len(pdfBytes) > 0 && pdfFilename != "" {
		bodyBuf.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n\r\n", boundary))

		bodyBuf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		bodyBuf.WriteString("Content-Type: text/html; charset=\"utf-8\"\r\n")
		bodyBuf.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
		bodyBuf.WriteString(htmlBody)
		bodyBuf.WriteString("\r\n\r\n")

		bodyBuf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		bodyBuf.WriteString(fmt.Sprintf("Content-Type: application/pdf; name=\"%s\"\r\n", pdfFilename))
		bodyBuf.WriteString("Content-Transfer-Encoding: base64\r\n")
		bodyBuf.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=\"%s\"\r\n\r\n", pdfFilename))

		encoded := base64.StdEncoding.EncodeToString(pdfBytes)
		for i := 0; i < len(encoded); i += 76 {
			end := i + 76
			if end > len(encoded) {
				end = len(encoded)
			}
			bodyBuf.WriteString(encoded[i:end] + "\r\n")
		}
		bodyBuf.WriteString(fmt.Sprintf("--%s--\r\n", boundary))
	} else {
		bodyBuf.WriteString("Content-Type: text/html; charset=\"utf-8\"\r\n\r\n")
		bodyBuf.WriteString(htmlBody)
	}

	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	err := smtp.SendMail(addr, auth, fromAddr, []string{to}, bodyBuf.Bytes())
	if err != nil {
		log.Printf("[EmailService] SMTP error sending to %s: %v\n", to, err)
		return err
	}

	log.Printf("[EmailService] Successfully sent email to %s | Subject: %s\n", to, subject)
	return nil
}
