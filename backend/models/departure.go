package models

import (
	"strings"
	"time"
)

// TripTypeOpenTrip adalah satu-satunya tipe paket yang tunduk pada aturan kuota
// minimal keberangkatan. Private trip, honeymoon, family, dan corporate berangkat
// atas permintaan pemesan sehingga tidak pernah dibatalkan karena kurang peserta.
const TripTypeOpenTrip = "Open Trip"

// IsOpenTrip menormalkan perbandingan tipe paket. Kolom trip_type adalah teks
// bebas, jadi perbandingan huruf-per-huruf terhadap "Open Trip" akan meleset
// hanya karena beda kapital atau spasi.
func IsOpenTrip(tripType string) bool {
	normalized := strings.ToLower(strings.Join(strings.Fields(tripType), ""))
	return normalized == "opentrip"
}

// Status peninjauan keberangkatan open trip.
const (
	// DepartureAwaitingProvider: batas H-3 terlampaui dengan kuota kurang dan
	// mitra belum menentukan keputusan.
	DepartureAwaitingProvider = "AWAITING_PROVIDER"
	// DepartureContinued: mitra memutuskan tetap berangkat meski kuota kurang.
	DepartureContinued = "CONTINUED"
	// DepartureCancelled: mitra membatalkan; seluruh booking masuk antrean refund.
	DepartureCancelled = "CANCELLED"
	// DepartureRescheduleOffered: mitra menawarkan tanggal pengganti dan sedang
	// menunggu jawaban setiap pelanggan.
	DepartureRescheduleOffered = "RESCHEDULE_OFFERED"
	// DepartureResolved: seluruh pelanggan sudah menjawab tawaran penjadwalan ulang.
	DepartureResolved = "RESOLVED"
)

// Sebab satu keberangkatan ditinjau. Keduanya berujung pada pilihan yang sama
// bagi pelanggan, tetapi pemicunya berbeda: kuota kurang terdeteksi otomatis
// pada H-3, sedangkan keadaan kahar dinyatakan sendiri oleh mitra kapan saja.
const (
	DepartureReasonQuotaShortfall = "QUOTA_SHORTFALL"
	DepartureReasonForceMajeure   = "FORCE_MAJEURE"
)

// MinimumResponseWindow adalah waktu minimal yang dimiliki pelanggan untuk
// menjawab tawaran jadwal pengganti. Pembatalan karena keadaan kahar umumnya
// dinyatakan pada hari keberangkatan, sehingga batas jawaban tidak boleh
// mengikuti jam berangkat yang mungkin tinggal beberapa jam lagi.
const MinimumResponseWindow = 48 * time.Hour

// Pilihan keputusan mitra atas keberangkatan yang kekurangan peserta.
const (
	DepartureDecisionContinue   = "CONTINUE"
	DepartureDecisionCancel     = "CANCEL"
	DepartureDecisionReschedule = "RESCHEDULE"
)

// TripDeparture adalah satu keberangkatan open trip (kombinasi paket dan
// tanggal jalan) yang kuota minimalnya tidak terpenuhi pada batas H-3.
//
// Barisnya dibuat oleh job latar belakang, bukan oleh antarmuka, sehingga
// keputusan mitra selalu punya jejak: berapa kursi terisi saat ditinjau, kapan
// diputuskan, dan apa hasilnya.
type TripDeparture struct {
	ID         uint     `gorm:"primaryKey" json:"id"`
	PackageID  uint     `gorm:"not null;uniqueIndex:idx_trip_departure" json:"packageId"`
	Package    *Package `gorm:"foreignKey:PackageID" json:"packageDetails,omitempty"`
	ProviderID uint     `gorm:"not null;index" json:"providerId"`

	// DepartureDay disimpan sebagai YYYY-MM-DD, bukan timestamp, supaya indeks
	// unik per keberangkatan tidak bergantung pada jam dan zona waktu.
	DepartureDay string `gorm:"size:10;not null;uniqueIndex:idx_trip_departure" json:"departureDay"`
	// DepartureAt adalah waktu berangkat sebenarnya dari booking pada hari itu.
	DepartureAt time.Time `gorm:"not null" json:"departureAt"`
	// ReviewDeadline adalah H-3 pukul 00:01 terhadap DepartureAt. Untuk
	// pembatalan karena keadaan kahar, nilainya sama dengan waktu penyataan.
	ReviewDeadline time.Time `gorm:"not null" json:"reviewDeadline"`
	// ResponseDeadline adalah batas akhir pelanggan menjawab tawaran jadwal
	// pengganti. Lewat batas ini pesanan otomatis dialihkan ke pengembalian dana.
	ResponseDeadline *time.Time `json:"responseDeadline,omitempty"`

	// Reason membedakan kuota kurang dari keadaan kahar.
	Reason string `gorm:"size:50;not null;default:'QUOTA_SHORTFALL'" json:"reason"`

	SeatsBooked   int `gorm:"not null" json:"seatsBooked"`
	SeatsRequired int `gorm:"not null" json:"seatsRequired"`
	BookingCount  int `gorm:"not null" json:"bookingCount"`

	Status        string     `gorm:"size:50;not null;default:'AWAITING_PROVIDER'" json:"status"`
	Decision      string     `gorm:"size:50;not null;default:''" json:"decision"`
	ProposedDate  *time.Time `json:"proposedDate,omitempty"`
	DecisionNotes string     `gorm:"type:text" json:"decisionNotes"`
	DecidedAt     *time.Time `json:"decidedAt,omitempty"`

	// Rekap jawaban pelanggan atas tawaran penjadwalan ulang.
	AcceptedCount int `gorm:"not null;default:0" json:"acceptedCount"`
	DeclinedCount int `gorm:"not null;default:0" json:"declinedCount"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// Bookings hanya diisi saat daftar ditampilkan ke mitra; tidak disimpan.
	Bookings []Booking `gorm:"-" json:"bookings,omitempty"`
}

// ReviewDeadlineFor mengembalikan batas keputusan H-3 pukul 00:01 untuk satu
// waktu keberangkatan. Perhitungan memakai zona waktu tanggal keberangkatan itu
// sendiri agar "H-3 pukul 00.01" berarti dini hari di kalender yang sama.
func ReviewDeadlineFor(departureAt time.Time) time.Time {
	day := time.Date(
		departureAt.Year(), departureAt.Month(), departureAt.Day(),
		0, 0, 0, 0, departureAt.Location(),
	)
	return day.AddDate(0, 0, -3).Add(1 * time.Minute)
}

// ResponseDeadlineFor menghitung batas jawaban pelanggan: waktu keberangkatan
// semula, atau MinimumResponseWindow dari sekarang bila itu lebih longgar.
func ResponseDeadlineFor(departureAt time.Time, now time.Time) time.Time {
	floor := now.Add(MinimumResponseWindow)
	if departureAt.After(floor) {
		return departureAt
	}
	return floor
}

// ForceMajeureRequest adalah pernyataan mitra bahwa satu keberangkatan tidak
// dapat dijalankan karena keadaan di luar kendalinya.
type ForceMajeureRequest struct {
	PackageID uint `json:"packageId" binding:"required"`
	// DepartureDay adalah tanggal jalan yang dibatalkan (YYYY-MM-DD).
	DepartureDay string `json:"departureDay" binding:"required,datetime=2006-01-02"`
	// ProposedDate adalah tanggal pengganti yang ditawarkan kepada pelanggan.
	ProposedDate string `json:"proposedDate" binding:"required,datetime=2006-01-02"`
	// Reason wajib diisi dan tersimpan sebagai jejak audit; pelanggan membacanya
	// pada notifikasi dan email yang dikirim.
	Reason string `json:"reason" binding:"required,min=10,max=500"`
}

// DepartureDecisionRequest adalah keputusan mitra atas satu keberangkatan.
type DepartureDecisionRequest struct {
	Action string `json:"action" binding:"required,oneof=CONTINUE CANCEL RESCHEDULE"`
	// ProposedDate wajib diisi saat Action bernilai RESCHEDULE (format YYYY-MM-DD).
	ProposedDate string `json:"proposedDate"`
	Notes        string `json:"notes" binding:"max=500"`
}

// RescheduleResponseRequest adalah jawaban pelanggan atas tanggal pengganti.
type RescheduleResponseRequest struct {
	// Pointer agar badan permintaan tanpa field ini ditolak, bukan diam-diam
	// dianggap penolakan.
	Accept *bool `json:"accept" binding:"required"`
}
