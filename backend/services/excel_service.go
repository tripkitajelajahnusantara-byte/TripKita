package services

import (
	"bytes"
	"fmt"
	"time"
	"tripkita-provider/models"
)

type ExcelService struct{}

func NewExcelService() *ExcelService {
	return &ExcelService{}
}

// GenerateProviderFinanceCSV generates a CSV formatted Excel spreadsheet for Provider Earnings & Payout History
func (s *ExcelService) GenerateProviderFinanceCSV(provider *models.Provider, bookings []models.Booking, payouts []models.Payout) ([]byte, string, error) {
	var buf bytes.Buffer

	// Write UTF-8 BOM for Microsoft Excel compatibility
	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	providerName := "Mitra TemenTrip"
	if provider != nil {
		providerName = provider.BusinessName
	}

	filename := fmt.Sprintf("Laporan_Keuangan_TemenTrip_%s.csv", time.Now().Format("20060102"))

	buf.WriteString("================================================================================\n")
	buf.WriteString(fmt.Sprintf("REKAPITULASI LAPORAN KEUANGAN MITRA TEMENTRIP - %s\n", sanitizeCSV(providerName)))
	buf.WriteString(fmt.Sprintf("Tanggal Unduh: %s\n", time.Now().Format("02 Jan 2006 15:04 WIB")))
	buf.WriteString("================================================================================\n\n")

	// Section 1: Bookings & Revenue Breakdown
	buf.WriteString("1. RIWAYAT PEMESANAN & PENDAPATAN BERSIH\n")
	buf.WriteString("ID Booking,Kode Invoice,Nama Paket,Pelanggan,Tanggal Trip,Status,Gross Sales (Rp),Platform Fee 10% (Rp),Net Revenue (Rp)\n")

	var totalGross int64 = 0
	var totalNet int64 = 0

	for _, b := range bookings {
		fee := b.TotalPrice * 10 / 100
		net := b.TotalPrice - fee
		totalGross += b.TotalPrice
		totalNet += net

		pkgName := "Paket Wisata"
		if b.Package.Name != "" {
			pkgName = b.Package.Name
		}

		travelDateStr := b.TripDate.Format("02/01/2006")

		buf.WriteString(fmt.Sprintf("%d,%s,\"%s\",\"%s\",%s,%s,%d,%d,%d\n",
			b.ID,
			sanitizeCSV(b.BookingCode),
			sanitizeCSV(pkgName),
			sanitizeCSV(b.CustomerName),
			sanitizeCSV(travelDateStr),
			sanitizeCSV(b.Status),
			b.TotalPrice,
			fee,
			net,
		))
	}
	buf.WriteString(fmt.Sprintf("TOTAL AUDIT,,,,,,%d,%d,%d\n\n", totalGross, totalGross*10/100, totalNet))

	// Section 2: Payouts & Disbursement History
	buf.WriteString("2. RIWAYAT PENCAIRAN DANA (PAYOUT DISBURSEMENT)\n")
	buf.WriteString("ID Payout,Kategori Pencairan,Bank Tujuan,Nomor Rekening,Atas Nama,Tanggal Pengajuan,Status,Jumlah Pencairan (Rp)\n")

	var totalDisbursed int64 = 0
	for _, p := range payouts {
		payoutTypeLabel := "Pencairan Penuh (100%)"
		if p.Type == "DP_50" {
			payoutTypeLabel = "Uang Muka (DP 50%)"
		} else if p.Type == "PELUNASAN_50" {
			payoutTypeLabel = "Pelunasan Sisa (50%)"
		}

		amountInt := int64(p.Amount)
		totalDisbursed += amountInt

		buf.WriteString(fmt.Sprintf("%d,\"%s\",\"%s\",\"%s\",\"%s\",%s,%s,%d\n",
			p.ID,
			payoutTypeLabel,
			sanitizeCSV(p.BankName),
			sanitizeCSV(p.BankAccount),
			sanitizeCSV(p.BankAccountName),
			p.CreatedAt.Format("02/01/2006"),
			sanitizeCSV(p.Status),
			amountInt,
		))
	}
	buf.WriteString(fmt.Sprintf("TOTAL PENCAIRAN TERPROSES,,,,,,,,%d\n", totalDisbursed))

	return buf.Bytes(), filename, nil
}

func sanitizeCSV(s string) string {
	return fmt.Sprintf("%v", s)
}
