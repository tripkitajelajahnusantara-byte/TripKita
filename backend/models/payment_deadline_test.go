package models

import (
	"testing"
	"time"
)

func TestPaymentDeadlineExtendsAfterRejectedProof(t *testing.T) {
	created := time.Date(2026, 9, 1, 8, 0, 0, 0, time.UTC)
	booking := &Booking{}
	booking.CreatedAt = created

	if got := PaymentDeadline(booking); !got.Equal(created.Add(PaymentWindow)) {
		t.Fatalf("tanpa review batas bayar harus 24 jam sejak dibuat, dapat %v", got)
	}

	// Ditolak menjelang akhir jendela: customer tetap mendapat waktu unggah ulang.
	reviewed := created.Add(23 * time.Hour)
	booking.PaymentReviewedAt = &reviewed
	if got := PaymentDeadline(booking); !got.Equal(reviewed.Add(RejectedProofReuploadWindow)) {
		t.Fatalf("batas bayar harus diperpanjang setelah penolakan, dapat %v", got)
	}

	// Ditolak lebih awal: batas 24 jam semula tetap berlaku.
	early := created.Add(time.Hour)
	booking.PaymentReviewedAt = &early
	if got := PaymentDeadline(booking); !got.Equal(created.Add(PaymentWindow)) {
		t.Fatalf("penolakan awal tidak boleh memperpendek batas bayar, dapat %v", got)
	}
}
