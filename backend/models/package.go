package models

import (
	"time"

	"gorm.io/gorm"
)

type Package struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	ProviderID         uint           `gorm:"not null" json:"providerId"`
	Name               string         `gorm:"size:255;not null" json:"name"`
	Destination        string         `gorm:"size:255;not null" json:"destination"`
	MeetingPoint       string         `gorm:"size:255;default:''" json:"meetingPoint"`
	Category           string         `gorm:"size:100;default:''" json:"category"`
	TripType           string         `gorm:"size:100;default:''" json:"tripType"`
	Price              int64          `gorm:"not null" json:"price"`
	QuotaMin           int            `gorm:"default:1" json:"quotaMin"`
	QuotaUsed          int            `gorm:"default:0" json:"quotaUsed"`
	QuotaMax           int            `gorm:"not null" json:"quotaMax"`
	StartDate          string         `gorm:"size:50" json:"startDate"`
	EndDate            string         `gorm:"size:50" json:"endDate"`
	Schedule           string         `gorm:"size:255;not null" json:"schedule"`
	Duration           int            `gorm:"default:1" json:"duration"`
	MinGuests          int            `gorm:"default:1" json:"minGuests"`
	MaxGuests          int            `gorm:"default:10" json:"maxGuests"`
	MinAge             int            `gorm:"default:0" json:"minAge"`
	MaxAge             int            `gorm:"default:100" json:"maxAge"`
	Status             string         `gorm:"size:50;default:'Draft'" json:"status"` // Aktif, Draft, Nonaktif
	Rating             float64        `gorm:"default:0" json:"rating"`
	Description        string         `gorm:"type:text" json:"description"`
	IncludedFacilities string         `gorm:"type:text" json:"includedFacilities"`
	ExcludedFacilities string         `gorm:"type:text" json:"excludedFacilities"`
	Itinerary          string         `gorm:"type:text" json:"itinerary"`
	Image              string         `gorm:"size:2048" json:"image"`
	Images             string         `gorm:"size:2048" json:"images"`
	CreatedAt          time.Time      `json:"createdAt"`
	UpdatedAt          time.Time      `json:"updatedAt"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}

type CreatePackageRequest struct {
	Name               string `json:"name" binding:"required,max=255"`
	Destination        string `json:"destination" binding:"required,max=255"`
	MeetingPoint       string `json:"meetingPoint" binding:"required,max=255"`
	Category           string `json:"category" binding:"required,max=100"`
	TripType           string `json:"tripType" binding:"required,max=100"`
	Price              int64  `json:"price" binding:"required,gt=0,lte=1000000000000"`
	QuotaMin           int    `json:"quotaMin" binding:"gte=0"`
	QuotaMax           int    `json:"quotaMax" binding:"required,gt=0,lte=10000"`
	StartDate          string `json:"startDate" binding:"required,datetime=2006-01-02"`
	EndDate            string `json:"endDate" binding:"required,datetime=2006-01-02"`
	Schedule           string `json:"schedule" binding:"required,max=255"`
	Duration           int    `json:"duration"`
	MinGuests          int    `json:"minGuests"`
	MaxGuests          int    `json:"maxGuests"`
	MinAge             int    `json:"minAge"`
	MaxAge             int    `json:"maxAge"`
	Status             string `json:"status" binding:"required,oneof=Aktif Draft Nonaktif"`
	Description        string `json:"description" binding:"required,max=5000"`
	IncludedFacilities string `json:"includedFacilities"`
	ExcludedFacilities string `json:"excludedFacilities"`
	Itinerary          string `json:"itinerary"`
	Image              string `json:"image"`
	Images             string `json:"images"`
}

type UpdatePackageRequest struct {
	Name               string `json:"name"`
	Destination        string `json:"destination"`
	MeetingPoint       string `json:"meetingPoint"`
	Category           string `json:"category"`
	TripType           string `json:"tripType"`
	Price              int64  `json:"price"`
	QuotaMin           int    `json:"quotaMin"`
	QuotaMax           int    `json:"quotaMax"`
	StartDate          string `json:"startDate"`
	EndDate            string `json:"endDate"`
	Schedule           string `json:"schedule"`
	Duration           int    `json:"duration"`
	MinGuests          int    `json:"minGuests"`
	MaxGuests          int    `json:"maxGuests"`
	MinAge             int    `json:"minAge"`
	MaxAge             int    `json:"maxAge"`
	Status             string `json:"status"` // Convert to Aktif, Draft, Nonaktif
	Description        string `json:"description"`
	IncludedFacilities string `json:"includedFacilities"`
	ExcludedFacilities string `json:"excludedFacilities"`
	Itinerary          string `json:"itinerary"`
	Image              string `json:"image"`
	Images             string `json:"images"`
}
