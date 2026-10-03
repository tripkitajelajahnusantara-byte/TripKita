package models

import "time"

// AdminBookingFilter is independent of the provider's paid-only booking list.
type AdminBookingFilter struct {
	ProviderID uint   `form:"providerId"`
	Status     string `form:"status" binding:"omitempty,oneof=PENDING_PAYMENT PAYMENT_REVIEW PAID CONFIRMED COMPLETED FAILED EXPIRED CANCELLED_BY_CUSTOMER CANCELLED_BY_PROVIDER REFUND_REQUIRED REFUNDED RESCHEDULE_OFFERED"`
	Search     string `form:"q" binding:"max=150"`
	Page       int    `form:"page" binding:"min=1,max=1000000"`
	PageSize   int    `form:"pageSize" binding:"min=1,max=100"`
}

// Only fields needed for monitoring are returned, without payment documents,
// credentials, or participant identity documents.
type AdminBookingItem struct {
	ID           uint      `json:"id"`
	BookingCode  string    `json:"bookingCode"`
	ProviderID   uint      `json:"providerId"`
	ProviderName string    `json:"providerName"`
	PackageName  string    `json:"packageName"`
	CustomerName string    `json:"customerName"`
	Status       string    `json:"status"`
	TripDate     time.Time `json:"tripDate"`
	Guests       int       `json:"guests"`
	TotalPrice   int64     `json:"totalPrice"`
	CreatedAt    time.Time `json:"createdAt"`
}

type AdminBookingSummary struct {
	Total    int64            `json:"total"`
	ByStatus map[string]int64 `json:"byStatus"`
}

type AdminBookingMonitor struct {
	Items    []AdminBookingItem  `json:"items"`
	Total    int64               `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"pageSize"`
	Summary  AdminBookingSummary `json:"summary"`
}
