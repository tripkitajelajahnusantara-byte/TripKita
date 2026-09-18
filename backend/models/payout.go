package models

import (
	"time"
)

type Payout struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	ProviderID      uint      `gorm:"not null;index" json:"providerId"`
	Provider        *Provider `gorm:"foreignKey:ProviderID" json:"provider,omitempty"`
	BookingID       *uint     `gorm:"index" json:"bookingId,omitempty"`
	Booking         *Booking  `gorm:"foreignKey:BookingID" json:"booking,omitempty"`
	Amount          int64     `gorm:"not null" json:"amount"`
	Type            string    `gorm:"size:50;not null" json:"type"`                     // DP_50, PELUNASAN_50
	Status          string    `gorm:"size:50;not null;default:'PENDING'" json:"status"` // PENDING, PROCESSING, APPROVED, FAILED, REJECTED
	BankName        string    `gorm:"size:100;not null" json:"bankName"`
	BankAccount     string    `gorm:"size:100;not null" json:"bankAccount"`
	BankAccountName string    `gorm:"size:255;not null" json:"bankAccountName"`
	ProofPath       string    `gorm:"size:500" json:"proofPath"`
	Notes           string    `gorm:"type:text" json:"notes"`

	// Terisi hanya bila pencairan dikirim otomatis lewat payment gateway.
	// XenditPayoutID juga menjadi penanda idempotensi agar satu pengajuan tidak
	// pernah dikirim dua kali ke gateway.
	XenditPayoutID string    `gorm:"size:255;index" json:"xenditPayoutId,omitempty"`
	ChannelCode    string    `gorm:"size:50" json:"channelCode,omitempty"` // legacy Payouts v2
	RoutingType    string    `gorm:"size:50" json:"routingType,omitempty"`
	RoutingValue   string    `gorm:"size:100" json:"routingValue,omitempty"`
	FailureCode    string    `gorm:"size:100" json:"failureCode,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

const (
	PayoutStatusPending    = "PENDING"
	PayoutStatusProcessing = "PROCESSING"
	PayoutStatusApproved   = "APPROVED"
	PayoutStatusFailed     = "FAILED"
	PayoutStatusRejected   = "REJECTED"
)

// PayoutReservedStatuses adalah status yang dananya sudah dipesan dan tidak
// boleh dihitung ulang sebagai saldo yang masih dapat dicairkan.
var PayoutReservedStatuses = []string{PayoutStatusPending, PayoutStatusProcessing, PayoutStatusApproved}

type CreatePayoutRequest struct {
	Amount    int64  `json:"amount" binding:"required,gt=0"`
	Type      string `json:"type" binding:"required,oneof=DP_50 PELUNASAN_50"`
	BookingID *uint  `json:"bookingId"`
}

type PayoutSummary struct {
	TotalEarnings      int64    `json:"totalEarnings"`
	PlatformFee        int64    `json:"platformFee"`
	NetEarnings        int64    `json:"netEarnings"`
	AvailableDP        int64    `json:"availableDp"`
	AvailablePelunasan int64    `json:"availablePelunasan"`
	HeldSettlement     int64    `json:"heldSettlement"`
	TotalPaidOut       int64    `json:"totalPaidOut"`
	PendingPayout      int64    `json:"pendingPayout"`
	Payouts            []Payout `json:"payouts"`

	// Saldo menurut buku besar. Dibawa agar selisih terhadap hak cair yang
	// dihitung dari booking terlihat langsung, bukan hanya di log server.
	LedgerAvailable  int64 `json:"ledgerAvailable"`
	LedgerHeld       int64 `json:"ledgerHeld"`
	LedgerConsistent bool  `json:"ledgerConsistent"`
}
