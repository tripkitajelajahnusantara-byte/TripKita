package services

import (
	"bytes"
	"fmt"
	"time"
	"tripkita-provider/models"
)

type PDFService struct{}

func NewPDFService() *PDFService {
	return &PDFService{}
}

// GenerateBookingReceiptPDF generates an official E-Voucher / Payment Receipt PDF
func (s *PDFService) GenerateBookingReceiptPDF(b *models.Booking, pkg *models.Package) ([]byte, string, error) {
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
	filename := fmt.Sprintf("E-Voucher_TemenTrip_%s.pdf", b.BookingCode)

	pdfContent := fmt.Sprintf(`================================================================================
                        E-VOUCHER BUKTI PEMBAYARAN TEMENTRIP
================================================================================
Kode Invoice    : %s
Status Pesanan  : LUNAS (%s)
Tanggal Waktu   : %s

--------------------------------------------------------------------------------
INFORMASI PEMESAN:
Nama Pemesan    : %s
Nomor WhatsApp  : %s
Email           : %s

--------------------------------------------------------------------------------
RINCIAN PAKET WISATA:
Nama Paket      : %s
Destinasi       : %s
Titik Kumpul    : %s
Tanggal Trip    : %s
Jumlah Peserta  : %d Orang
--------------------------------------------------------------------------------
TOTAL DIBAYAR   : Rp %s
METODE BAYAR    : Xendit Payment Gateway (Virtual Account / QRIS / E-Wallet)
--------------------------------------------------------------------------------

PETUNJUK PERJALANAN:
1. Harap menunjukkan E-Voucher PDF ini saat tiba di Titik Kumpul.
2. Tiba di Titik Kumpul (%s) setidaknya 15 menit sebelum keberangkatan.
3. Hubungi Layanan Bantuan TemenTrip (+62 800-0000-0000) jika butuh kendala.

Terima kasih telah memilih TemenTrip sebagai sahabat perjalanan Anda!
================================================================================
`,
		b.BookingCode,
		b.Status,
		time.Now().Format("02 Jan 2006 15:04 WIB"),
		b.CustomerName,
		b.CustomerPhone,
		b.CustomerEmail,
		packageName,
		destination,
		meetingPoint,
		travelDateStr,
		b.Guests,
		formatIDRNumber(b.TotalPrice),
		meetingPoint,
	)

	pdfBuf := createSimplePDFDocument("E-VOUCHER RESMI TEMENTRIP", pdfContent)
	return pdfBuf, filename, nil
}

// GenerateRefundReceiptPDF generates a PDF proof for processed refunds
func (s *PDFService) GenerateRefundReceiptPDF(b *models.Booking) ([]byte, string, error) {
	filename := fmt.Sprintf("Bukti_Refund_TemenTrip_%s.pdf", b.BookingCode)

	packageName := "Paket Wisata"
	if b.Package.Name != "" {
		packageName = b.Package.Name
	}

	pdfContent := fmt.Sprintf(`================================================================================
                      BUKTI PENGEMBALIAN DANA (REFUND) TEMENTRIP
================================================================================
Kode Invoice    : %s
Status Refund   : SELESAI (REFUNDED)
Tanggal Diproses: %s

--------------------------------------------------------------------------------
INFORMASI PELANGGAN:
Nama Pelanggan  : %s
Nomor Telepon   : %s
Email           : %s

--------------------------------------------------------------------------------
RINCIAN REFUND:
Paket Wisata    : %s
Jumlah Refund   : Rp %s
Alasan Refund   : Pembatalan / Reschedule Pesanan
--------------------------------------------------------------------------------

PEMBERITAHUAN:
Pengembalian dana telah berhasil diproses oleh Admin TemenTrip.
Dana akan efektif masuk ke rekening/dompet elektronik Anda sesuai ketentuan perbankan.

Terima kasih atas pengertian Anda. Semoga kita dapat bertemu di perjalanan berikutnya!
================================================================================
`,
		b.BookingCode,
		time.Now().Format("02 Jan 2006 15:04 WIB"),
		b.CustomerName,
		b.CustomerPhone,
		b.CustomerEmail,
		packageName,
		formatIDRNumber(b.TotalPrice),
	)

	pdfBuf := createSimplePDFDocument("BUKTI REFUND TEMENTRIP", pdfContent)
	return pdfBuf, filename, nil
}

// GeneratePayoutReceiptPDF generates a PDF transfer proof for Provider Payouts
func (s *PDFService) GeneratePayoutReceiptPDF(payout *models.Payout, provider *models.Provider) ([]byte, string, error) {
	payoutCode := fmt.Sprintf("PAY-%d", payout.ID)
	filename := fmt.Sprintf("Bukti_Pencairan_TemenTrip_%s.pdf", payoutCode)

	providerName := "Mitra TemenTrip"
	if provider != nil {
		providerName = provider.BusinessName
	}

	payoutTypeLabel := "Pencairan Penuh (100%)"
	if payout.Type == "DP_50" {
		payoutTypeLabel = "Uang Muka (DP 50%)"
	} else if payout.Type == "PELUNASAN_50" {
		payoutTypeLabel = "Pelunasan Sisa (50%)"
	}

	pdfContent := fmt.Sprintf(`================================================================================
                   BUKTI PENCAIRAN DANA MITRA TEMENTRIP
================================================================================
Kode Pencairan  : %s
Kategori Payout : %s
Status Transfer : SELESAI (DISBURSED)
Tanggal Transfer: %s

--------------------------------------------------------------------------------
INFORMASI MITRA / PROVIDER:
Nama Mitra      : %s
Bank Tujuan     : %s
Nomor Rekening  : %s
Pemilik Rekening: %s

--------------------------------------------------------------------------------
RINCIAN PENCAIRAN DANA:
Jumlah Pencairan: Rp %s
--------------------------------------------------------------------------------

PEMBERITAHUAN:
Dana telah berhasil ditransfer ke rekening bank mitra terdaftar oleh Tim Keuangan TemenTrip.
Harap memeriksa mutasi rekening Anda secara berkala.

Salam hangat,
Tim Keuangan & Partner Hub TemenTrip
================================================================================
`,
		payoutCode,
		payoutTypeLabel,
		time.Now().Format("02 Jan 2006 15:04 WIB"),
		providerName,
		payout.BankName,
		payout.BankAccount,
		payout.BankAccountName,
		formatIDRNumber(int64(payout.Amount)),
	)

	pdfBuf := createSimplePDFDocument("BUKTI PENCAIRAN DANA TEMENTRIP", pdfContent)
	return pdfBuf, filename, nil
}

func createSimplePDFDocument(title, content string) []byte {
	var buf bytes.Buffer

	buf.WriteString("%PDF-1.4\n")
	buf.WriteString("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
	buf.WriteString("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
	buf.WriteString("3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n")
	buf.WriteString("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n")

	var streamBuf bytes.Buffer
	streamBuf.WriteString("BT\n")
	streamBuf.WriteString("/F1 10 Tf\n")
	streamBuf.WriteString("40 750 Td\n")
	streamBuf.WriteString("13 TL\n")

	lines := splitLines(content)
	for _, l := range lines {
		escaped := escapePDFString(l)
		streamBuf.WriteString(fmt.Sprintf("(%s) '\n", escaped))
	}
	streamBuf.WriteString("ET\n")

	streamLen := streamBuf.Len()
	buf.WriteString(fmt.Sprintf("5 0 obj\n<< /Length %d >>\nstream\n%s\nendstream\nendobj\n", streamLen, streamBuf.String()))

	buf.WriteString("xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000318 00000 n \n")
	buf.WriteString("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n500\n%%EOF\n")

	return buf.Bytes()
}

func escapePDFString(s string) string {
	res := ""
	for _, ch := range s {
		if ch == '(' || ch == ')' || ch == '\\' {
			res += "\\" + string(ch)
		} else {
			res += string(ch)
		}
	}
	return res
}

func splitLines(s string) []string {
	var lines []string
	curr := ""
	for _, ch := range s {
		if ch == '\n' {
			lines = append(lines, curr)
			curr = ""
		} else if ch != '\r' {
			curr += string(ch)
		}
	}
	if curr != "" {
		lines = append(lines, curr)
	}
	return lines
}

func formatIDRNumber(amount int64) string {
	str := fmt.Sprintf("%d", amount)
	n := len(str)
	if n <= 3 {
		return str
	}
	var res []byte
	for i, ch := range str {
		if i > 0 && (n-i)%3 == 0 {
			res = append(res, '.')
		}
		res = append(res, byte(ch))
	}
	return string(res)
}
