package services

import (
	"testing"
	"time"

	"tripkita-provider/models"
)

func TestCancelledPaidBookingWithoutRefundRemainsProviderEarning(t *testing.T) {
	paidAt := time.Now()
	booking := models.Booking{
		Status:       models.StatusCancelledByCustomer,
		RefundAmount: 0,
		PaidAt:       &paidAt,
	}
	if !bookingGeneratesProviderEarning(booking) {
		t.Fatal("pembatalan customer tanpa refund harus tetap menjadi hak provider")
	}
	if !settlementCanBePaid(booking, time.Now()) {
		t.Fatal("kompensasi pembatalan customer harus dapat dicairkan tanpa menunggu tanggal trip")
	}
}

func TestPayoutDebtOffsetsOtherStageAvailability(t *testing.T) {
	dp, settlement := calculatePayoutAvailability(0, 425_000, 425_000, 0)
	if dp != 0 || settlement != 0 {
		t.Fatalf("piutang DP harus menyerap hak pelunasan berikutnya, got dp=%d settlement=%d", dp, settlement)
	}

	dp, settlement = calculatePayoutAvailability(500_000, 425_000, 425_000, 0)
	if dp != 75_000 || settlement != 425_000 {
		t.Fatalf("saldo setelah piutang salah, got dp=%d settlement=%d", dp, settlement)
	}
}
