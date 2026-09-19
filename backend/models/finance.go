package models

import (
	"time"
)

type ProviderBalance struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	ProviderID       uint      `gorm:"not null;uniqueIndex" json:"providerId"`
	AvailableBalance int64     `gorm:"default:0" json:"availableBalance"`
	HeldBalance      int64     `gorm:"default:0" json:"heldBalance"`
	TotalEarned      int64     `gorm:"default:0" json:"totalEarned"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type HeldSettlement struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	BookingID   uint      `gorm:"not null;uniqueIndex" json:"bookingId"`
	ProviderID  uint      `gorm:"not null;index" json:"providerId"`
	Amount      int64     `gorm:"not null" json:"amount"`
	Status      string    `gorm:"size:50;default:'HELD'" json:"status"` // HELD, RELEASED
	ReleaseDate time.Time `json:"releaseDate"`
	CreatedAt   time.Time `json:"createdAt"`
}

// PlatformAdminFee adalah biaya layanan tetap yang dipungut dari setiap booking
// berbayar sebelum komisi dihitung.
const PlatformAdminFee int64 = 5000

// PlatformCommissionPercent adalah komisi platform atas nilai paket setelah
// biaya layanan tetap dipotong.
const PlatformCommissionPercent int64 = 15

// EarningSplit memerinci satu booking berbayar menjadi bagian platform dan
// bagian mitra, termasuk pembagian DP dan pelunasan.
type EarningSplit struct {
	PlatformFee    int64 // biaya layanan tetap + komisi
	NetEarning     int64 // hak mitra setelah potongan platform
	DPAmount       int64 // separuh hak mitra, cair setelah pembayaran lunas
	SettlementHeld int64 // sisanya, ditahan sampai trip selesai
}

// SplitBookingEarning adalah satu-satunya tempat pembagian uang per booking
// dihitung. Ringkasan pencairan, buku besar saldo, dan data seed wajib memakai
// fungsi ini agar tidak ada dua versi rumus yang saling menyimpang.
func SplitBookingEarning(totalCustomerPaid int64) EarningSplit {
	adminFee := PlatformAdminFee
	if totalCustomerPaid < adminFee {
		adminFee = 0
	}

	packageGross := totalCustomerPaid - adminFee
	netEarning := packageGross * (100 - PlatformCommissionPercent) / 100
	dpAmount := netEarning / 2

	return EarningSplit{
		PlatformFee:    packageGross*PlatformCommissionPercent/100 + adminFee,
		NetEarning:     netEarning,
		DPAmount:       dpAmount,
		SettlementHeld: netEarning - dpAmount,
	}
}
