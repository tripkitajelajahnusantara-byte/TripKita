package services

import (
	"testing"
	"time"

	"tripkita-provider/models"
)

func payoutTestBooking(id uint, start, end time.Time) models.Booking {
	paidAt := start.Add(-72 * time.Hour)
	return models.Booking{
		ID: id, BookingCode: "TK-UJI", Status: models.StatusPaid, PaidAt: &paidAt,
		TotalPrice: 1_005_000, PlatformFeePercent: 15, TripDate: start, TripEndDate: end,
	}
}

func uintPtr(v uint) *uint { return &v }

func TestBookingPayoutStagesPerTrip(t *testing.T) {
	now := time.Now()
	upcoming := payoutTestBooking(1, now.Add(96*time.Hour), now.Add(120*time.Hour))
	finished := payoutTestBooking(2, now.Add(-72*time.Hour), now.Add(-24*time.Hour))
	split := models.SplitBookingEarning(upcoming.TotalPrice, upcoming.PlatformFeePercent)

	payouts := []models.Payout{
		{ID: 10, BookingID: uintPtr(2), Type: "DP_50", Amount: split.DPAmount, Status: models.PayoutStatusApproved, ProofPath: "/uploads/doc_a.png"},
		{ID: 11, BookingID: uintPtr(2), Type: "PELUNASAN_50", Amount: split.SettlementHeld, Status: models.PayoutStatusPending},
	}
	items := buildBookingPayouts([]models.Booking{upcoming, finished}, payouts, now)

	dp, _ := findBookingPayoutStage(items, 1, "DP_50")
	if dp.Status != models.BookingPayoutAvailable || dp.Remaining != split.DPAmount {
		t.Fatalf("DP trip mendatang harus bisa dicairkan penuh, got %+v", dp)
	}
	settlement, _ := findBookingPayoutStage(items, 1, "PELUNASAN_50")
	if settlement.Status != models.BookingPayoutLocked {
		t.Fatalf("pelunasan harus terkunci sebelum trip selesai, got %+v", settlement)
	}

	dp, _ = findBookingPayoutStage(items, 2, "DP_50")
	if dp.Status != models.BookingPayoutPaid || dp.ProofPath != "/uploads/doc_a.png" {
		t.Fatalf("DP yang sudah ditransfer harus membawa bukti admin, got %+v", dp)
	}
	settlement, _ = findBookingPayoutStage(items, 2, "PELUNASAN_50")
	if settlement.Status != models.BookingPayoutRequested {
		t.Fatalf("pelunasan yang menunggu admin tidak boleh diajukan ulang, got %+v", settlement)
	}
}

func TestLegacyAggregatePayoutCoversOldestBookings(t *testing.T) {
	now := time.Now()
	first := payoutTestBooking(1, now.Add(96*time.Hour), now.Add(120*time.Hour))
	second := payoutTestBooking(2, now.Add(200*time.Hour), now.Add(220*time.Hour))
	split := models.SplitBookingEarning(first.TotalPrice, first.PlatformFeePercent)

	legacy := []models.Payout{{ID: 1, Type: "DP_50", Amount: split.DPAmount, Status: models.PayoutStatusApproved}}
	items := buildBookingPayouts([]models.Booking{second, first}, legacy, now)

	if dp, _ := findBookingPayoutStage(items, 1, "DP_50"); dp.Status != models.BookingPayoutPaid {
		t.Fatalf("payout gabungan lama harus menutup booking terlama, got %+v", dp)
	}
	if dp, _ := findBookingPayoutStage(items, 2, "DP_50"); dp.Status != models.BookingPayoutAvailable {
		t.Fatalf("booking berikutnya tetap dapat dicairkan, got %+v", dp)
	}
}
