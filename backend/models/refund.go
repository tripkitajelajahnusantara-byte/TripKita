package models

import "time"

// Metode pengembalian dana. Nilai ini menjelaskan bagaimana dana benar-benar
// dikirim, bukan sekadar bahwa booking ditandai selesai.
const (
	// RefundMethodManualTransfer: admin mentransfer sendiri dari rekening platform.
	RefundMethodManualTransfer = "MANUAL_TRANSFER"
	// RefundMethodGatewayRefund: dikembalikan melalui refund API payment gateway
	// ke sumber dana asal pelanggan.
	RefundMethodGatewayRefund = "GATEWAY_REFUND"
	// RefundMethodGatewayPayout: dikirim sebagai payout ke rekening pelanggan,
	// dipakai untuk kanal yang tidak mendukung refund (mis. virtual account).
	RefundMethodGatewayPayout = "GATEWAY_PAYOUT"
)

var RefundMethods = []string{
	RefundMethodManualTransfer,
	RefundMethodGatewayRefund,
	RefundMethodGatewayPayout,
}

// RefundRecord adalah catatan audit satu pengembalian dana.
//
// Sebelum ada tabel ini, penyelesaian refund hanya membalik status booking
// menjadi REFUNDED: tidak ada nominal yang benar-benar dikirim, tidak ada bukti,
// dan tidak ada jejak siapa yang memprosesnya. Satu booking hanya boleh memiliki
// satu catatan (unique index) supaya refund tidak dapat dicatat dua kali.
type RefundRecord struct {
	ID        uint     `gorm:"primaryKey" json:"id"`
	BookingID uint     `gorm:"not null;uniqueIndex" json:"bookingId"`
	Booking   *Booking `gorm:"foreignKey:BookingID" json:"booking,omitempty"`

	// EntitledAmount adalah hak refund menurut kebijakan pembatalan, disalin saat
	// pencatatan agar perubahan data booking di kemudian hari tidak mengaburkan
	// nilai yang berlaku pada saat itu.
	EntitledAmount int64 `gorm:"not null" json:"entitledAmount"`
	// Amount adalah nominal yang benar-benar dikirim ke pelanggan.
	Amount int64  `gorm:"not null" json:"amount"`
	Method string `gorm:"size:50;not null" json:"method"`

	// Reference adalah nomor referensi transfer bank atau id transaksi gateway.
	Reference string `gorm:"size:255;not null" json:"reference"`
	Notes     string `gorm:"type:text" json:"notes"`

	// ProcessedByID menunjuk akun admin yang menyatakan dana sudah dikirim.
	ProcessedByID    uint      `gorm:"not null;index" json:"processedById"`
	ProcessedByEmail string    `gorm:"size:255;not null" json:"processedByEmail"`
	ProcessedAt      time.Time `gorm:"not null" json:"processedAt"`

	CreatedAt time.Time `json:"createdAt"`
}

// CompleteRefundRequest adalah data yang wajib diisi admin saat menyatakan dana
// sudah dikembalikan.
type CompleteRefundRequest struct {
	Amount    int64  `json:"amount" binding:"required,gt=0"`
	Method    string `json:"method" binding:"required,oneof=MANUAL_TRANSFER GATEWAY_REFUND GATEWAY_PAYOUT"`
	Reference string `json:"reference" binding:"required,min=4,max=255"`
	Notes     string `json:"notes" binding:"max=1000"`
}
