package jobs

import (
	"testing"

	"tripkita-provider/models"
)

func TestInvoiceWithoutTransactionIDIsDeferred(t *testing.T) {
	runner := &Runner{}
	for _, booking := range []models.Booking{
		{ID: 1, IPaymuSessionID: "session-only"},
		{ID: 2, XenditInvoiceID: "session-legacy", IPaymuSessionID: "session-legacy"},
	} {
		if got := runner.checkInvoiceBeforeExpiry(booking); got != invoiceUnverified {
			t.Fatalf("booking %d tanpa transaction id harus ditunda, got %v", booking.ID, got)
		}
	}
}
