package models

import (
	"fmt"
	"time"
)

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
const AvailabilityHorizonMonths = 3

// MaxAvailabilityDates membatasi jumlah tanggal per paket agar satu permintaan
// tidak dapat menulis ribuan baris sekaligus. Tiga bulan maksimal 93 hari inklusif.
const MaxAvailabilityDates = 100

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
	Dates []string `json:"dates" binding:"omitempty,max=100,dive,datetime=2006-01-02"`
}

// AvailabilityWindow mengembalikan batas tanggal yang boleh dibuka mitra,
// dihitung dari hari berjalan.
func AvailabilityWindow(now time.Time) (earliest string, latest string) {
	now = now.In(BookingLocation)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	// Clamp month-end, e.g. November 30 + three months = February 28.
	month := time.Date(today.Year(), today.Month()+AvailabilityHorizonMonths, 1, 0, 0, 0, 0, today.Location())
	day := today.Day()
	last := month.AddDate(0, 1, -1).Day()
	if day > last {
		day = last
	}
	return today.Format("2006-01-02"), month.AddDate(0, 0, day-1).Format("2006-01-02")
}

var BookingLocation = time.FixedZone("WIB", 7*60*60)

func CalendarRange(start, end string) ([]string, error) {
	a, err := time.Parse("2006-01-02", start)
	if err != nil {
		return nil, fmt.Errorf("tanggal mulai tidak valid")
	}
	b, err := time.Parse("2006-01-02", end)
	if err != nil || b.Before(a) {
		return nil, fmt.Errorf("tanggal selesai tidak valid")
	}
	count := int(b.Sub(a).Hours()/24) + 1
	if count > MaxAvailabilityDates {
		return nil, fmt.Errorf("rentang tanggal maksimal tiga bulan")
	}
	dates := make([]string, count)
	for i := range dates {
		dates[i] = a.AddDate(0, 0, i).Format("2006-01-02")
	}
	return dates, nil
}
