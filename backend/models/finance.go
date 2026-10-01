package models

import (
	"time"
)

type ProviderBalance struct {
	ID               uint  `gorm:"primaryKey" json:"id"`
	ProviderID       uint  `gorm:"not null;uniqueIndex" json:"providerId"`
	AvailableBalance int64 `gorm:"default:0" json:"availableBalance"`
	HeldBalance      int64 `gorm:"default:0" json:"heldBalance"`
	// DebtBalance mencatat dana provider yang sudah telanjur dicairkan ketika
	// sebuah booking kemudian wajib direfund penuh. Pendapatan berikutnya akan
	// melunasi saldo ini lebih dahulu sebelum dapat dicairkan kembali.
	DebtBalance int64     `gorm:"default:0" json:"debtBalance"`
	TotalEarned int64     `gorm:"default:0" json:"totalEarned"`
	UpdatedAt   time.Time `json:"updatedAt"`
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

const (
	// DefaultPlatformFeePercent berlaku untuk provider baru.
	DefaultPlatformFeePercent int64 = 15
	// LegacyPlatformFeePercent menjaga transaksi lama yang dibuat saat tarif
	// platform masih hardcoded 15 persen.
	LegacyPlatformFeePercent int64 = 15
)

func IsAllowedProviderPlatformFeePercent(percent int64) bool {
	return percent >= 1 && percent <= 100
}

// NormalizePlatformFeePercent menerima persentase bulat yang valid. Nilai di
// luar rentang kembali ke tarif default agar perhitungan tidak menghasilkan
// saldo negatif.
func NormalizePlatformFeePercent(percent int64) int64 {
	if IsAllowedProviderPlatformFeePercent(percent) {
		return percent
	}
	return DefaultPlatformFeePercent
}

// EarningSplit memerinci satu booking berbayar menjadi bagian platform dan
// bagian mitra, termasuk pembagian DP dan pelunasan.
type EarningSplit struct {
	ServiceFee     int64 // biaya layanan tetap per pesanan, bagian dari PlatformFee
	PlatformFee    int64 // biaya layanan tetap + komisi
	NetEarning     int64 // hak mitra setelah potongan platform
	DPAmount       int64 // separuh hak mitra, dapat diajukan mulai H-3 setelah lunas
	SettlementHeld int64 // sisanya, ditahan sampai trip selesai
}

// SplitBookingEarning adalah satu-satunya tempat pembagian uang per booking
// dihitung. Ringkasan pencairan, buku besar saldo, dan data seed wajib memakai
// fungsi ini agar tidak ada dua versi rumus yang saling menyimpang.
func SplitBookingEarning(totalCustomerPaid int64, platformFeePercent int64) EarningSplit {
	adminFee := BookingServiceFee
	if totalCustomerPaid < adminFee {
		adminFee = 0
	}

	packageGross := totalCustomerPaid - adminFee
	platformFeePercent = NormalizePlatformFeePercent(platformFeePercent)
	netEarning := packageGross * (100 - platformFeePercent) / 100
	dpAmount := netEarning / 2

	return EarningSplit{
		ServiceFee: adminFee,
		// Sisa pembulatan rupiah masuk ke fee platform agar seluruh komponen
		// selalu tepat menjumlah ke nilai yang dibayar pelanggan.
		PlatformFee:    totalCustomerPaid - netEarning,
		NetEarning:     netEarning,
		DPAmount:       dpAmount,
		SettlementHeld: netEarning - dpAmount,
	}
}
