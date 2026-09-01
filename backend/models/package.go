package models

import (
	"time"

	"gorm.io/gorm"
)

type Package struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ProviderID  uint           `gorm:"not null" json:"providerId"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Destination string         `gorm:"size:255;not null" json:"destination"`
	Category    string         `gorm:"size:100;default:''" json:"category"`
	TripType    string         `gorm:"size:100;default:''" json:"tripType"`
	Price       int64          `gorm:"not null" json:"price"`
	QuotaMin    int            `gorm:"default:1" json:"quotaMin"`
	QuotaUsed   int            `gorm:"default:0" json:"quotaUsed"`
	QuotaMax    int            `gorm:"not null" json:"quotaMax"`
	StartDate   string         `gorm:"size:50" json:"startDate"`
	EndDate     string         `gorm:"size:50" json:"endDate"`
	Schedule    string         `gorm:"size:255;not null" json:"schedule"`
	Status      string         `gorm:"size:50;default:'Draft'" json:"status"` // Aktif, Draft, Nonaktif
	Rating      float64        `gorm:"default:0" json:"rating"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type CreatePackageRequest struct {
	Name        string `json:"name" binding:"required"`
	Destination string `json:"destination"`
	Category    string `json:"category"`
	TripType    string `json:"tripType"`
	Price       int64  `json:"price"`
	QuotaMin    int    `json:"quotaMin"`
	QuotaMax    int    `json:"quotaMax"`
	StartDate   string `json:"startDate"`
	EndDate     string `json:"endDate"`
	Schedule    string `json:"schedule"`
	Status      string `json:"status" binding:"required"` // Convert to Aktif, Draft, Nonaktif
}

type UpdatePackageRequest struct {
	Name        string `json:"name"`
	Destination string `json:"destination"`
	Category    string `json:"category"`
	TripType    string `json:"tripType"`
	Price       int64  `json:"price"`
	QuotaMin    int    `json:"quotaMin"`
	QuotaMax    int    `json:"quotaMax"`
	StartDate   string `json:"startDate"`
	EndDate     string `json:"endDate"`
	Schedule    string `json:"schedule"`
	Status      string `json:"status"` // Aktif, Draft, Nonaktif
}
