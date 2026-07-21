package models

import (
	"time"
)

type Booking struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	BookingCode     string    `gorm:"size:100;uniqueIndex;not null" json:"bookingCode"` // e.g. TK-2824-1891
	ProviderID      uint      `gorm:"not null" json:"providerId"`
	PackageID       uint      `gorm:"not null" json:"packageId"`
	Package         Package   `gorm:"foreignKey:PackageID" json:"packageDetails,omitempty"`
	CustomerName    string    `gorm:"size:255;not null" json:"customerName"`
	CustomerInitial string    `gorm:"size:10" json:"customerInitial"`
	TripDate        time.Time `gorm:"not null" json:"tripDate"`
	Guests          int       `gorm:"not null" json:"guests"`
	TotalPrice      int64     `gorm:"not null" json:"totalPrice"`
	DPAmount        int64     `json:"dpAmount"`
	PaymentMethod   string    `gorm:"size:100" json:"paymentMethod"`
	Status          string    `gorm:"size:50;default:'PENDING_PAYMENT'" json:"status"` // PENDING_PAYMENT, PAID, CONFIRMED, COMPLETED, CANCELLED_BY_CUSTOMER, CANCELLED_BY_PROVIDER, REFUND_REQUIRED, REFUNDED
	XenditInvoiceID string    `gorm:"size:255" json:"xenditInvoiceId"`
	PaymentURL      string    `gorm:"size:1024" json:"paymentUrl"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

const (
	StatusPendingPayment     = "PENDING_PAYMENT"
	StatusPaid               = "PAID"
	StatusConfirmed          = "CONFIRMED"
	StatusCompleted          = "COMPLETED"
	StatusCancelledByCustomer = "CANCELLED_BY_CUSTOMER"
	StatusCancelledByProvider = "CANCELLED_BY_PROVIDER"
	StatusRefundRequired     = "REFUND_REQUIRED"
	StatusRefunded           = "REFUNDED"
)

type UpdateBookingStatusRequest struct {
	Status string `json:"status" binding:"required"` 
}
