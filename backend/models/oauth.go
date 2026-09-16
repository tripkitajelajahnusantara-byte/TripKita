package models

import "time"

type OAuthLoginCode struct {
	ID         uint      `gorm:"primaryKey"`
	CodeHash   string    `gorm:"size:64;uniqueIndex;not null"`
	ProviderID uint      `gorm:"not null;index"`
	ExpiresAt  time.Time `gorm:"not null;index"`
	UsedAt     *time.Time
	CreatedAt  time.Time
}
