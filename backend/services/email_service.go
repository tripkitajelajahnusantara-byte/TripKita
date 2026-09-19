package services

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"html"
	"log"
	"net/smtp"
	"time"

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
`, html.EscapeString(b.CustomerName), html.EscapeString(b.BookingCode), html.EscapeString(packageName), html.EscapeString(destination), html.EscapeString(meetingPoint), travelDateStr, b.Guests, formatIDRNumber(b.TotalPrice))

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
`, html.EscapeString(b.CustomerName), formatIDRNumber(b.TotalPrice), html.EscapeString(b.BookingCode), html.EscapeString(packageName))

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
`, html.EscapeString(b.CustomerName), html.EscapeString(packageName), html.EscapeString(b.BookingCode))

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
`, html.EscapeString(provider.BusinessName), html.EscapeString(payoutTypeLabel), formatIDRNumber(payout.Amount), html.EscapeString(payout.BankName), html.EscapeString(payout.BankAccount), html.EscapeString(payout.BankAccountName), formatIDRNumber(payout.Amount))

	return s.sendMailWithAttachment(to, subject, htmlBody, pdfBytes, pdfFilename)
}

// SendCancelledEmail sends cancellation confirmation email to Customer with PDF Cancellation receipt attachment
func (s *EmailService) SendCancelledEmail(b *models.Booking) error {
	to := b.CustomerEmail
	if to == "" {
		return nil
	}

	subject := fmt.Sprintf("❌ Pesanan #%s Dibatalkan - TemenTrip", b.BookingCode)

	pdfBytes, pdfFilename, err := s.pdfService.GenerateCancelledReceiptPDF(b)
	if err != nil {
		log.Printf("[EmailService] Failed to generate Cancelled PDF: %v\n", err)
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
      <h3 style="color: #dc2626; margin: 0 0 6px 0;">Pesanan Wisata Telah Dibatalkan</h3>
      <p style="color: #991b1b; margin: 0; font-size: 14px;">Halo <strong>%s</strong>, pesanan #%s untuk paket <strong>%s</strong> telah resmi dibatalkan.</p>
    </div>
    <p style="font-size: 14px; color: #475569;">Berkas tanda bukti pembatalan resmi dalam format PDF telah kami lampirkan pada email ini.</p>
    <p style="font-size: 14px; color: #475569;">Jika ini adalah kekeliruan atau Anda ingin melakukan pemesanan ulang, silakan kunjungi website kami kapan saja.</p>
  </div>
</body>
</html>
`, html.EscapeString(b.CustomerName), html.EscapeString(b.BookingCode), html.EscapeString(packageName))

	return s.sendMailWithAttachment(to, subject, htmlBody, pdfBytes, pdfFilename)
}

// SendRescheduleEmail sends reschedule notice email to Customer with updated PDF E-Voucher attachment
func (s *EmailService) SendRescheduleEmail(b *models.Booking) error {
	to := b.CustomerEmail
	if to == "" {
		return nil
	}

	subject := fmt.Sprintf("📅 Perubahan Jadwal Trip Pesanan #%s - TemenTrip", b.BookingCode)

	pdfBytes, pdfFilename, err := s.pdfService.GenerateRescheduleReceiptPDF(b)
	if err != nil {
		log.Printf("[EmailService] Failed to generate Reschedule PDF: %v\n", err)
	}

	packageName := "Paket Wisata"
	if b.Package.Name != "" {
		packageName = b.Package.Name
	}

	newDateStr := b.TripDate.Format("02 Jan 2006")

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0284c7; text-align: center;">Temen<span style="color: #00c9a7;">Trip</span>✨</h2>
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
      <h3 style="color: #0284c7; margin: 0 0 6px 0;">Jadwal Trip Berhasil Diperbarui!</h3>
      <p style="color: #0369a1; margin: 0; font-size: 14px;">Halo <strong>%s</strong>, jadwal perjalanan pesanan #%s (Paket: %s) telah diubah menjadi tanggal <strong>%s</strong>.</p>
    </div>
    <p style="font-size: 14px; color: #475569;">Berkas Bukti Perubahan Jadwal PDF terbaru telah kami lampirkan pada email ini. Harap membawa dokumen ini saat hari keberangkatan.</p>
  </div>
</body>
</html>
`, html.EscapeString(b.CustomerName), html.EscapeString(b.BookingCode), html.EscapeString(packageName), newDateStr)

	return s.sendMailWithAttachment(to, subject, htmlBody, pdfBytes, pdfFilename)
}

// SendResetPasswordEmail sends a 6-digit OTP for password reset
func (s *EmailService) SendResetPasswordEmail(email string, otp string) error {
	subject := "TripKita - Kode Reset Password"

	htmlBody := fmt.Sprintf(`
		<h2>Reset Password Anda</h2>
		<p>Seseorang telah meminta untuk mereset password akun TripKita Anda.</p>
		<p>Gunakan kode 6 digit di bawah ini untuk mereset password Anda. Kode ini berlaku selama 15 menit.</p>
		<h1 style="color: #00a896; letter-spacing: 5px;">%s</h1>
		<p>Jika Anda tidak merasa meminta reset password, abaikan email ini.</p>
		<br/>
		<p>Salam hangat,</p>
		<p>Tim TripKita</p>
	`, otp)

	return s.sendMailWithAttachment(email, subject, htmlBody, nil, "")
}

func (s *EmailService) sendMailWithAttachment(to, subject, htmlBody string, pdfBytes []byte, pdfFilename string) error {
	smtpUser := s.cfg.SMTPUser
	smtpPass := s.cfg.SMTPPass
	smtpHost := s.cfg.SMTPHost
	smtpPort := s.cfg.SMTPPort
	fromAddr := s.cfg.SMTPFrom

	if smtpUser == "" || smtpPass == "" || smtpHost == "" {
		log.Printf("[EmailService] SMTP credentials not fully set; email dispatch skipped")
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
		log.Printf("[EmailService] SMTP dispatch failed: %v\n", err)
		return err
	}

	log.Printf("[EmailService] Email dispatched successfully")
	return nil
}

// SendOpenTripQuotaAlertEmail memberi tahu mitra bahwa kuota minimal satu
// keberangkatan open trip tidak terpenuhi pada batas H-3, beserta tiga pilihan
// keputusan yang tersedia di Partner Hub.
func (s *EmailService) SendOpenTripQuotaAlertEmail(provider *models.Provider, departure *models.TripDeparture, pkg *models.Package) error {
	if provider == nil || departure == nil || provider.Email == "" {
		return nil
	}

	packageName := "Paket Wisata"
	if pkg != nil && pkg.Name != "" {
		packageName = pkg.Name
	}

	dashboardURL := s.cfg.FrontendURL + "/#/provider/dashboard"
	subject := fmt.Sprintf("⚠️ Kuota Open Trip %s Belum Terpenuhi - Keputusan H-3 Dibutuhkan", packageName)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0284c7; text-align: center;">Temen<span style="color: #00c9a7;">Trip</span>✨</h2>
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 12px; margin: 20px 0;">
      <h3 style="color: #b45309; margin: 0 0 6px 0;">Kuota Minimal Belum Terpenuhi</h3>
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        Halo <strong>%s</strong>, Open Trip <strong>%s</strong> yang dijadwalkan berangkat pada
        <strong>%s</strong> baru terisi <strong>%d dari minimal %d kursi</strong> (%d pesanan).
      </p>
    </div>
    <p style="font-size: 14px; color: #475569;">Sesuai ketentuan H-3, Anda perlu menentukan salah satu dari tiga pilihan berikut:</p>
    <ul style="font-size: 14px; color: #475569; line-height: 1.8;">
      <li><strong>Tetap berangkat</strong> — perjalanan berjalan sesuai jadwal meski peserta di bawah kuota minimal.</li>
      <li><strong>Batalkan</strong> — seluruh pesanan diteruskan ke admin untuk pengembalian dana penuh kepada pelanggan.</li>
      <li><strong>Jadwalkan ulang</strong> — Anda menawarkan tanggal pengganti, dan setiap pelanggan berhak menerima atau menolaknya. Pelanggan yang menolak otomatis masuk proses pengembalian dana.</li>
    </ul>
    <div style="text-align: center; margin: 28px 0;">
      <a href="%s" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Buka Partner Hub</a>
    </div>
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">Keputusan harus dikirim sebelum tanggal keberangkatan. Tanpa keputusan, pesanan tetap berjalan pada jadwal semula.</p>
  </div>
</body>
</html>
`,
		html.EscapeString(provider.PicName),
		html.EscapeString(packageName),
		html.EscapeString(departure.DepartureAt.Format("02 January 2006")),
		departure.SeatsBooked,
		departure.SeatsRequired,
		departure.BookingCount,
		html.EscapeString(dashboardURL),
	)

	return s.sendMailWithAttachment(provider.Email, subject, htmlBody, nil, "")
}

// SendRescheduleOfferEmail meminta persetujuan pelanggan atas tanggal pengganti.
// Berbeda dengan SendRescheduleEmail yang mengabarkan jadwal yang sudah berubah,
// email ini menuntut jawaban: diterima atau ditolak.
func (s *EmailService) SendRescheduleOfferEmail(b *models.Booking, proposed time.Time, originalDate time.Time, cause string) error {
	if b == nil || b.CustomerEmail == "" {
		return nil
	}

	packageName := "Paket Wisata"
	if b.Package.Name != "" {
		packageName = b.Package.Name
	}

	historyURL := s.cfg.FrontendURL + "/#/riwayat-booking"
	subject := fmt.Sprintf("🗓️ Tawaran Jadwal Pengganti untuk Pesanan #%s - TemenTrip", b.BookingCode)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0284c7; text-align: center;">Temen<span style="color: #00c9a7;">Trip</span>✨</h2>
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 12px; margin: 20px 0;">
      <h3 style="color: #b45309; margin: 0 0 6px 0;">Jadwal Trip Perlu Diubah</h3>
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        Halo <strong>%s</strong>, keberangkatan <strong>%s</strong> tanggal <strong>%s</strong> tidak dapat dijalankan.
        <br /><br />Sebab: <strong>%s</strong>.
        <br /><br />Penyelenggara menawarkan tanggal pengganti berikut.
      </p>
    </div>
    <table style="width: 100%%; font-size: 14px; color: #475569; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 0;">Kode Pesanan</td><td style="padding: 8px 0; text-align: right;"><strong>#%s</strong></td></tr>
      <tr><td style="padding: 8px 0;">Jadwal Semula</td><td style="padding: 8px 0; text-align: right;">%s</td></tr>
      <tr><td style="padding: 8px 0;">Jadwal Pengganti</td><td style="padding: 8px 0; text-align: right;"><strong style="color: #0284c7;">%s</strong></td></tr>
    </table>
    <p style="font-size: 14px; color: #475569;">
      Silakan buka riwayat pesanan Anda untuk <strong>menerima</strong> atau <strong>menolak</strong> tanggal pengganti ini.
      Jika Anda menolak, pesanan akan diteruskan ke proses pengembalian dana penuh.
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="%s" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Tanggapi Tawaran Jadwal</a>
    </div>
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">Tanpa jawaban sampai tanggal keberangkatan semula, pesanan otomatis diteruskan ke proses pengembalian dana.</p>
  </div>
</body>
</html>
`,
		html.EscapeString(b.CustomerName),
		html.EscapeString(packageName),
		html.EscapeString(originalDate.Format("02 January 2006")),
		html.EscapeString(cause),
		html.EscapeString(b.BookingCode),
		html.EscapeString(originalDate.Format("02 January 2006")),
		html.EscapeString(proposed.Format("02 January 2006")),
		html.EscapeString(historyURL),
	)

	return s.sendMailWithAttachment(b.CustomerEmail, subject, htmlBody, nil, "")
}
