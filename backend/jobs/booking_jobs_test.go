package jobs

import (
	"testing"

	"tripkita-provider/models"
)

func TestMidtransBookingSkipsLegacyGatewayCheck(t *testing.T) {
	for _, booking := range []models.Booking{
		{ID: 1, PaymentMethod: models.PaymentMethodMidtrans, XenditInvoiceID: "TK-ABC123-1762500000000"},
		{ID: 2, PaymentMethod: models.PaymentMethodMidtrans},
		{ID: 3, PaymentMethod: "Transfer Bank Manual"},
	} {
		if usesLegacyGateway(booking) {
			t.Fatalf("booking %d tidak boleh dicek ke iPaymu", booking.ID)
		}
	}
	for _, booking := range []models.Booking{
		{ID: 4, IPaymuTransactionID: "123456"},
		{ID: 5, PaymentMethod: "Transfer Bank Manual", XenditInvoiceID: "session-legacy"},
	} {
		if !usesLegacyGateway(booking) {
			t.Fatalf("booking %d gateway lama harus dicek ke gateway", booking.ID)
		}
	}
}

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
