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
	Amount          float64   `gorm:"not null" json:"amount"`
	Type            string    `gorm:"size:50;not null" json:"type"` // DP_50, PELUNASAN_50, FULL
	Status          string    `gorm:"size:50;not null;default:'PENDING'" json:"status"` // PENDING, APPROVED, REJECTED
	BankName        string    `gorm:"size:100;not null" json:"bankName"`
	BankAccount     string    `gorm:"size:100;not null" json:"bankAccount"`
	BankAccountName string    `gorm:"size:255;not null" json:"bankAccountName"`
	ProofPath       string    `gorm:"size:500" json:"proofPath"`
	Notes           string    `gorm:"type:text" json:"notes"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type CreatePayoutRequest struct {
	Amount    float64 `json:"amount" binding:"required"`
	Type      string  `json:"type" binding:"required"` // DP_50, PELUNASAN_50
	BookingID *uint   `json:"bookingId"`
}

type PayoutSummary struct {
	TotalEarnings  float64  `json:"totalEarnings"`
	PlatformFee    float64  `json:"platformFee"`
	NetEarnings    float64  `json:"netEarnings"`
	AvailableDP    float64  `json:"availableDp"`
	HeldSettlement float64  `json:"heldSettlement"`
	TotalPaidOut   float64  `json:"totalPaidOut"`
	PendingPayout  float64  `json:"pendingPayout"`
	Payouts        []Payout `json:"payouts"`
}
