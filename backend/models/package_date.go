package models

import "time"

// Status satu tanggal keberangkatan pada paket non-open-trip.
const (
	// PackageDateOpen: tanggal dibuka mitra dan masih dapat dipilih pelanggan.
	PackageDateOpen = "OPEN"
	// PackageDateBooked: tanggal sudah dikunci satu pesanan aktif dan tidak dapat
	// dipilih pelanggan lain.
	PackageDateBooked = "BOOKED"
)

// Asal baris tanggal. Dibutuhkan agar pelepasan kunci tahu mana yang harus
// kembali menjadi pilihan mitra dan mana yang cukup dihapus.
const (
	// PackageDateOriginProvider: tanggal yang sengaja dibuka mitra.
	PackageDateOriginProvider = "PROVIDER"
	// PackageDateOriginAuto: baris bayangan untuk paket lama yang belum pernah
	// mengatur tanggal, dibuat hanya agar kalender pelanggan tetap menampilkan
	// tanggal yang sudah terisi.
	PackageDateOriginAuto = "AUTO"
)

// AvailabilityHorizonMonths membatasi seberapa jauh ke depan mitra boleh membuka
// tanggal keberangkatan.
const AvailabilityHorizonMonths = 6

// MaxAvailabilityDates membatasi jumlah tanggal per paket agar satu permintaan
// tidak dapat menulis ribuan baris sekaligus. Enam bulan berisi paling banyak
// 184 hari, jadi batas ini tidak pernah menghalangi pemakaian yang wajar.
const MaxAvailabilityDates = 200

// PackageDate adalah satu tanggal keberangkatan pada paket selain Open Trip.
//
// Open Trip berangkat bersama-sama sehingga satu tanggal dibagi banyak pemesan
// dan dikendalikan kuota. Tipe lain (private, honeymoon, family, corporate)
// bersifat eksklusif: satu tanggal hanya untuk satu pesanan, dan indeks unik
// (package_id, date) di sinilah penguncian itu ditegakkan.
type PackageDate struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	PackageID uint   `gorm:"not null;uniqueIndex:idx_package_date_day" json:"packageId"`
	Date      string `gorm:"size:10;not null;uniqueIndex:idx_package_date_day" json:"date"`
	Status    string `gorm:"size:20;not null;default:'OPEN'" json:"status"`
	Origin    string `gorm:"size:20;not null;default:'PROVIDER'" json:"origin"`
	// BookingID menunjuk pesanan yang mengunci tanggal ini.
	BookingID *uint     `gorm:"index" json:"bookingId,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// SetPackageDatesRequest mengganti seluruh tanggal yang dibuka untuk satu paket.
// Daftar kosong berarti mitra menutup semua tanggal.
type SetPackageDatesRequest struct {
	Dates []string `json:"dates" binding:"omitempty,max=200,dive,datetime=2006-01-02"`
}

// AvailabilityWindow mengembalikan batas tanggal yang boleh dibuka mitra,
// dihitung dari hari berjalan.
func AvailabilityWindow(now time.Time) (earliest string, latest string) {
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	return today.Format("2006-01-02"), today.AddDate(0, AvailabilityHorizonMonths, 0).Format("2006-01-02")
}
