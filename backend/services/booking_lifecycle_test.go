package services

import (
	"strings"
	"testing"
	"time"

	"tripkita-provider/models"
)

func TestCalculateTripEndUsesPackageDuration(t *testing.T) {
	start := time.Date(2026, time.September, 20, 8, 0, 0, 0, time.FixedZone("WIB", 7*60*60))

	if got, want := calculateTripEnd(start, 5), start.AddDate(0, 0, 5); !got.Equal(want) {
		t.Fatalf("akhir trip lima hari = %s, ingin %s", got, want)
	}
	if got, want := calculateTripEnd(start, 0), start.AddDate(0, 0, 1); !got.Equal(want) {
		t.Fatalf("durasi invalid harus menjadi satu hari: got %s want %s", got, want)
	}
}

func TestTripHasEndedUsesTripEndDate(t *testing.T) {
	end := time.Date(2026, time.September, 25, 8, 0, 0, 0, time.UTC)
	booking := models.Booking{Status: models.StatusConfirmed, TripEndDate: end}

	if tripHasEnded(booking, end.Add(-time.Second)) {
		t.Fatal("trip dianggap selesai sebelum trip_end_date")
	}
	if !tripHasEnded(booking, end) {
		t.Fatal("trip belum dianggap selesai tepat pada trip_end_date")
	}
}

func TestProviderMayCompleteOnlyAfterTripEnds(t *testing.T) {
	end := time.Now().UTC().Add(time.Hour)
	if err := validateProviderStatusTransition(models.StatusConfirmed, models.StatusCompleted, end, end.Add(-time.Second)); err == nil || !strings.Contains(err.Error(), "setelah perjalanan berakhir") {
		t.Fatalf("penyelesaian sebelum akhir trip harus ditolak, got %v", err)
	}
	if err := validateProviderStatusTransition(models.StatusConfirmed, models.StatusCompleted, end, end); err != nil {
		t.Fatalf("penyelesaian setelah akhir trip harus diterima: %v", err)
	}
	if err := validateProviderStatusTransition(models.StatusPendingPayment, models.StatusCompleted, end, end.Add(time.Hour)); err == nil {
		t.Fatal("booking belum dibayar tidak boleh diselesaikan")
	}
}
