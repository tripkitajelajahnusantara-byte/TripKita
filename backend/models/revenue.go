package models

import "time"

const (
	// PlatformRevenueRealized: trip sudah selesai (atau dibatalkan customer
	// tanpa refund), sehingga bagian TemenTrip tidak bisa lagi direfund.
	PlatformRevenueRealized = "REALIZED"
	// PlatformRevenuePending: pembayaran sudah diterima tetapi trip belum
	// selesai. Bagian ini masih bisa hilang bila booking direfund penuh.
	PlatformRevenuePending = "PENDING"
)

// PlatformRevenueItem adalah bagian TemenTrip dari satu booking berbayar.
type PlatformRevenueItem struct {
	BookingID          uint      `json:"bookingId"`
	BookingCode        string    `json:"bookingCode"`
	ProviderID         uint      `json:"providerId"`
	ProviderName       string    `json:"providerName"`
	PackageName        string    `json:"packageName"`
	CustomerName       string    `json:"customerName"`
	Guests             int       `json:"guests"`
	BookingStatus      string    `json:"bookingStatus"`
	PaidAt             time.Time `json:"paidAt"`
	TripDate           time.Time `json:"tripDate"`
	TripEndDate        time.Time `json:"tripEndDate"`
	TotalPaid          int64     `json:"totalPaid"`
	PlatformFeePercent int64     `json:"platformFeePercent"`
	ServiceFee         int64     `json:"serviceFee"`
	Commission         int64     `json:"commission"`
	PlatformRevenue    int64     `json:"platformRevenue"`
	ProviderNet        int64     `json:"providerNet"`
	RevenueStatus      string    `json:"revenueStatus"`
}

// PlatformRevenueMonth merangkum penghasilan per bulan pembayaran (WIB).
type PlatformRevenueMonth struct {
	Month    string `json:"month"` // YYYY-MM
	Revenue  int64  `json:"revenue"`
	Realized int64  `json:"realized"`
	Pending  int64  `json:"pending"`
	Bookings int    `json:"bookings"`
}

type PlatformRevenueReport struct {
	TotalRevenue     int64                  `json:"totalRevenue"`
	RealizedRevenue  int64                  `json:"realizedRevenue"`
	PendingRevenue   int64                  `json:"pendingRevenue"`
	ServiceFeeTotal  int64                  `json:"serviceFeeTotal"`
	CommissionTotal  int64                  `json:"commissionTotal"`
	GrossPaid        int64                  `json:"grossPaid"`
	ProviderNetTotal int64                  `json:"providerNetTotal"`
	BookingCount     int                    `json:"bookingCount"`
	Months           []PlatformRevenueMonth `json:"months"`
	Items            []PlatformRevenueItem  `json:"items"`
}
