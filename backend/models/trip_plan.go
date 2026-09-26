package models

import "time"

// TripPlan is the server-owned copy of a customer's travel plan. Checklist
// and savings data use GORM's JSON serializer so web and mobile share exactly
// the same representation without separate device-only stores.
type TripPlan struct {
	ID           uint                `gorm:"primaryKey" json:"id"`
	CustomerID   uint                `gorm:"not null;index:idx_trip_plans_customer_updated" json:"-"`
	Destination  string              `gorm:"size:120;not null" json:"destination"`
	TargetMonth  string              `gorm:"column:target_date;size:10;not null" json:"targetMonth"`
	Participants int                 `gorm:"not null" json:"participants"`
	TargetBudget int64               `gorm:"not null" json:"targetBudget"`
	Checklist    []TripChecklistItem `gorm:"type:jsonb;serializer:json;not null;default:'[]'" json:"checklist"`
	SavingsLogs  []TripSavingsLog    `gorm:"type:jsonb;serializer:json;not null;default:'[]'" json:"savingsLogs"`
	Status       string              `gorm:"size:20;not null;default:'SAVED'" json:"status"`
	CreatedAt    time.Time           `json:"createdAt"`
	UpdatedAt    time.Time           `gorm:"index:idx_trip_plans_customer_updated" json:"updatedAt"`

	TargetMonthLabel string `gorm:"-" json:"targetMonthLabel"`
	SavedAmount      int64  `gorm:"-" json:"savedAmount"`
}

type TripChecklistItem struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Completed bool   `json:"completed"`
}

type TripSavingsLog struct {
	ID     string `json:"id"`
	Date   string `json:"date"`
	Amount int64  `json:"amount"`
	Note   string `json:"note,omitempty"`
}

type SaveTripPlanRequest struct {
	Destination  string              `json:"destination" binding:"required,max=120"`
	TargetMonth  string              `json:"targetMonth" binding:"required"`
	Participants int                 `json:"participants" binding:"required,min=1,max=100"`
	TargetBudget int64               `json:"targetBudget" binding:"required,min=1,max=1000000000000"`
	Checklist    []TripChecklistItem `json:"checklist"`
	SavingsLogs  []TripSavingsLog    `json:"savingsLogs"`
	Status       string              `json:"status" binding:"omitempty,oneof=DRAFT SAVED"`
}
