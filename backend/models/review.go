package models

import (
	"time"
)

type Review struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	BookingID  uint      `gorm:"not null;uniqueIndex" json:"bookingId"`
	CustomerID uint      `gorm:"not null;index" json:"customerId"`
	PackageID  uint      `gorm:"not null;index" json:"packageId"`
	Rating     int       `gorm:"not null" json:"rating"`
	Comment    string    `gorm:"type:text" json:"comment"`
	CreatedAt  time.Time `json:"createdAt"`
}

type CreateReviewRequest struct {
	BookingID uint   `json:"bookingId" binding:"required"`
	Rating    int    `json:"rating" binding:"required,min=1,max=5"`
	Comment   string `json:"comment"`
}
