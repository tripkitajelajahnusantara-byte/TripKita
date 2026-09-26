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
	CustomerID      *uint     `gorm:"index" json:"customerId,omitempty"`
	CustomerName    string    `gorm:"size:255;not null" json:"customerName"`
	CustomerPhone   string    `gorm:"size:50" json:"customerPhone"`
	CustomerEmail   string    `gorm:"size:255" json:"customerEmail"`
	CustomerInitial string    `gorm:"size:10" json:"customerInitial"`
	TripDate        time.Time `gorm:"not null" json:"tripDate"`
	TripEndDate     time.Time `gorm:"not null" json:"tripEndDate"`
	Guests          int       `gorm:"not null" json:"guests"`
	TotalPrice      int64     `gorm:"not null" json:"totalPrice"`
	PaymentMethod   string    `gorm:"size:100" json:"paymentMethod"`
	Status          string    `gorm:"size:50;default:'PENDING_PAYMENT'" json:"status"` // PENDING_PAYMENT, PAID, CONFIRMED, COMPLETED, FAILED, EXPIRED, CANCELLED_BY_CUSTOMER, CANCELLED_BY_PROVIDER, REFUND_REQUIRED, REFUNDED
	// XenditInvoiceID dipertahankan sementara agar klien/data lama tetap dapat
	// dibaca. Integrasi baru menggunakan kedua field iPaymu di bawah ini.
	XenditInvoiceID     string     `gorm:"size:255" json:"xenditInvoiceId,omitempty"`
	IPaymuSessionID     string     `gorm:"column:ipaymu_session_id;size:255;index" json:"ipaymuSessionId,omitempty"`
	IPaymuTransactionID string     `gorm:"column:ipaymu_transaction_id;size:255;index" json:"ipaymuTransactionId,omitempty"`
	PaidAt              *time.Time `gorm:"column:paid_at" json:"paidAt,omitempty"`
	PaymentURL          string     `gorm:"size:1024" json:"paymentUrl"`
	CancellationReason  string     `gorm:"size:255" json:"cancellationReason,omitempty"`
	RefundAmount        int64      `json:"refundAmount"`
	RescheduleCount     int        `gorm:"default:0" json:"rescheduleCount"`
	// TripDepartureID menautkan booking ke peninjauan kuota H-3 yang
	// menghasilkan tawaran jadwal pengganti, supaya jawaban pelanggan dapat
	// direkap per keberangkatan.
	TripDepartureID  *uint      `gorm:"index" json:"tripDepartureId,omitempty"`
	OriginalTripDate *time.Time `json:"originalTripDate,omitempty"`
	RescheduleDate   *time.Time `json:"rescheduleDate,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
	SelectedAddOnIDs []string   `gorm:"-" json:"-"`
	// Participants hanya dimuat pada endpoint mitra pemilik paket dan
	// customer pemilik booking; endpoint publik tidak menyertakannya.
	Participants     []BookingParticipant `gorm:"foreignKey:BookingID;constraint:OnDelete:CASCADE" json:"participants,omitempty"`
	ProviderWhatsApp string               `gorm:"->;-:migration" json:"providerWhatsApp,omitempty"`
	ProviderName     string               `gorm:"->;-:migration" json:"providerName,omitempty"`
}

const (
	StatusPendingPayment      = "PENDING_PAYMENT"
	StatusPaid                = "PAID"
	StatusPaymentFailed       = "FAILED"
	StatusExpired             = "EXPIRED"
	StatusConfirmed           = "CONFIRMED"
	StatusCompleted           = "COMPLETED"
	StatusCancelledByCustomer = "CANCELLED_BY_CUSTOMER"
	StatusCancelledByProvider = "CANCELLED_BY_PROVIDER"
	StatusRefundRequired      = "REFUND_REQUIRED"
	StatusRefunded            = "REFUNDED"
	StatusRescheduleOffered   = "RESCHEDULE_OFFERED"
)

type UpdateBookingStatusRequest struct {
	Status             string `json:"status" binding:"required,oneof=CONFIRMED COMPLETED CANCELLED_BY_PROVIDER RESCHEDULE_OFFERED"`
	CancellationReason string `json:"cancellationReason,omitempty"`
	RescheduleDate     string `json:"rescheduleDate,omitempty"` // YYYY-MM-DD format if offering reschedule
}
