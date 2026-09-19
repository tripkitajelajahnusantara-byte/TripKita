package models

import "time"

// User menyimpan identitas dan kredensial login. Data bisnis tetap berada di
// Provider agar relasi booking/payout lama tidak berubah.
type User struct {
	ID           uint     `gorm:"primaryKey" json:"id"`
	ProviderID   uint     `gorm:"not null;uniqueIndex" json:"providerId"`
	Provider     Provider `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	Email        string   `gorm:"size:255;not null;uniqueIndex" json:"email"`
	PasswordHash string   `gorm:"size:255;not null;default:''" json:"-"`
	// Partial unique index dibuat oleh migrasi agar banyak akun lokal boleh
	// memiliki GoogleSubject kosong.
	GoogleSubject       string     `gorm:"size:255" json:"-"`
	FailedLoginAttempts int        `gorm:"not null;default:0" json:"-"`
	LockedUntil         *time.Time `json:"-"`
	LastLoginAt         *time.Time `json:"lastLoginAt,omitempty"`
	PasswordChangedAt   *time.Time `json:"-"`
	ResetTokenHash      string     `gorm:"size:64;not null;default:''" json:"-"`
	ResetTokenExpiresAt *time.Time `json:"-"`
	ResetAttempts       int        `gorm:"not null;default:0" json:"-"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

// AuthSession adalah sesi opaque yang dapat dicabut di server. Hanya hash
// token yang disimpan sehingga kebocoran database tidak langsung memberikan
// token aktif kepada penyerang.
type AuthSession struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	UserID        uint       `gorm:"not null;index" json:"userId"`
	User          User       `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	TokenHash     string     `gorm:"size:64;not null;uniqueIndex" json:"-"`
	ExpiresAt     time.Time  `gorm:"not null;index" json:"expiresAt"`
	IdleExpiresAt time.Time  `gorm:"not null;index" json:"idleExpiresAt"`
	LastSeenAt    time.Time  `gorm:"not null" json:"lastSeenAt"`
	RevokedAt     *time.Time `gorm:"index" json:"revokedAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
}
