package models

import (
	"time"
)

type ProviderBalance struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	ProviderID       uint      `gorm:"not null;uniqueIndex" json:"providerId"`
	AvailableBalance int64     `gorm:"default:0" json:"availableBalance"`
	HeldBalance      int64     `gorm:"default:0" json:"heldBalance"`
	TotalEarned      int64     `gorm:"default:0" json:"totalEarned"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type HeldSettlement struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	BookingID   uint      `gorm:"not null;index" json:"bookingId"`
	ProviderID  uint      `gorm:"not null;index" json:"providerId"`
	Amount      int64     `gorm:"not null" json:"amount"`
	Status      string    `gorm:"size:50;default:'HELD'" json:"status"` // HELD, RELEASED
	ReleaseDate time.Time `json:"releaseDate"`
	CreatedAt   time.Time `json:"createdAt"`
}
