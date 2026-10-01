package services

import (
	"testing"
	"time"

	"tripkita-provider/models"
)

func TestBuildPlatformRevenueReportFollowsProviderEarningRules(t *testing.T) {
	now := time.Date(2026, 10, 1, 12, 0, 0, 0, models.BookingLocation)
	at := func(day int) *time.Time {
		v := time.Date(2026, 9, day, 10, 0, 0, 0, models.BookingLocation)
		return &v
	}
	booking := func(id uint, status string, total int64, fee int64, paidAt *time.Time, tripEnd time.Time) models.Booking {
		return models.Booking{
			ID: id, BookingCode: "TK-" + status, ProviderID: 7, ProviderName: "Mitra Uji", Status: status,
			TotalPrice: total, PlatformFeePercent: fee, PaidAt: paidAt,
			TripDate: tripEnd.AddDate(0, 0, -1), TripEndDate: tripEnd, CreatedAt: now.AddDate(0, -1, 0),
		}
	}
	past := now.AddDate(0, 0, -2)
	future := now.AddDate(0, 0, 10)
	// Pembayaran 1 Okt 01:00 WIB masih tercatat 30 Sep di UTC; bulan harus mengikuti WIB.
	octoberWIB := time.Date(2026, 10, 1, 1, 0, 0, 0, models.BookingLocation).UTC()

	report := buildPlatformRevenueReport([]models.Booking{
		booking(1, models.StatusCompleted, 1_005_000, 15, at(5), past),           // diterima: 5.000 + 150.000
		booking(2, models.StatusPaid, 505_000, 10, &octoberWIB, future),          // berjalan: 5.000 + 50.000
		booking(3, models.StatusRefunded, 805_000, 15, at(7), future),            // refund penuh: tidak dihitung
		booking(4, models.StatusCancelledByCustomer, 205_000, 20, at(8), future), // batal tanpa refund: tetap penghasilan
		func() models.Booking { // batal dengan refund penuh: tidak dihitung
			b := booking(5, models.StatusCancelledByCustomer, 205_000, 20, at(9), future)
			b.RefundAmount = b.TotalPrice
			return b
		}(),
		booking(6, models.StatusPendingPayment, 300_000, 15, nil, future), // belum dibayar
	}, now)

	if report.BookingCount != 3 {
		t.Fatalf("booking yang dihitung harus 3, got %d (%+v)", report.BookingCount, report.Items)
	}
	wantRealized := int64(155_000 + 45_000) // booking 1 + booking 4 (5.000 + 20% x 200.000)
	wantPending := int64(55_000)
	if report.RealizedRevenue != wantRealized || report.PendingRevenue != wantPending || report.TotalRevenue != wantRealized+wantPending {
		t.Fatalf("total salah: realized=%d pending=%d total=%d", report.RealizedRevenue, report.PendingRevenue, report.TotalRevenue)
	}
	if report.ServiceFeeTotal != 15_000 || report.CommissionTotal != report.TotalRevenue-15_000 {
		t.Fatalf("rincian biaya layanan/komisi salah: %+v", report)
	}
	if report.GrossPaid-report.ProviderNetTotal != report.TotalRevenue {
		t.Fatalf("bagian platform + mitra harus sama dengan total dibayar: %+v", report)
	}
	if report.Items[0].BookingID != 2 || report.Items[0].RevenueStatus != models.PlatformRevenuePending {
		t.Fatalf("item terbaru harus booking 2 berstatus berjalan: %+v", report.Items[0])
	}
	if len(report.Months) != 2 || report.Months[0].Month != "2026-10" || report.Months[0].Pending != wantPending || report.Months[1].Realized != wantRealized {
		t.Fatalf("ringkasan bulanan salah: %+v", report.Months)
	}
}

func TestBuildPlatformRevenueReportEmptyListsAreNotNull(t *testing.T) {
	report := buildPlatformRevenueReport(nil, time.Now())
	if report.Items == nil || report.Months == nil {
		t.Fatal("daftar kosong harus dikirim sebagai [] agar frontend tidak menerima null")
	}
}
