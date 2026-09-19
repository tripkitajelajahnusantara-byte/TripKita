package models

import "time"

type OAuthLoginCode struct {
	ID       uint   `gorm:"primaryKey"`
	CodeHash string `gorm:"size:64;uniqueIndex;not null"`
	// Sementara nullable agar baris lama dapat dimigrasikan tanpa deployment
	// gagal; migrasi SQL production memasang constraint NOT NULL.
	UserID uint `gorm:"index"`
	// ProviderID dipertahankan selama masa migrasi agar deployment lama dapat
	// di-rollback tanpa kehilangan relasi kode OAuth yang sudah ada.
	ProviderID uint      `gorm:"not null;index"`
	ExpiresAt  time.Time `gorm:"not null;index"`
	UsedAt     *time.Time
	CreatedAt  time.Time
}
