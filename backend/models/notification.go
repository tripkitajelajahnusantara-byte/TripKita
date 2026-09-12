package models

import (
	"time"

	"gorm.io/gorm"
)

type Notification struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"not null;index" json:"userId"`
	Role      string         `gorm:"size:50;not null" json:"role"` // CUSTOMER, PROVIDER, ADMIN
	Title     string         `gorm:"size:255;not null" json:"title"`
	Message   string         `gorm:"type:text;not null" json:"message"`
	Type      string         `gorm:"size:50;default:'GENERAL'" json:"type"` // PAYMENT, REFUND, RESCHEDULE, PAYOUT, GENERAL
	Link      string         `gorm:"size:255;default:''" json:"link"`
	IsRead    bool           `gorm:"default:false" json:"isRead"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
