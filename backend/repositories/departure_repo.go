package repositories

import (
	"time"

	"gorm.io/gorm"

	"tripkita-provider/models"
)

// DepartureCandidate adalah satu kombinasi paket dan tanggal jalan beserta
// jumlah kursi yang sudah terisi. Kuota dihitung per keberangkatan, bukan per
// paket, karena satu open trip dapat memiliki banyak tanggal jalan sekaligus.
type DepartureCandidate struct {
	PackageID     uint
	ProviderID    uint
	DepartureDay  string
	DepartureAt   time.Time
	SeatsBooked   int
	SeatsRequired int
	BookingCount  int
}

type DepartureRepository interface {
	FindUnderfilledDepartures(now time.Time) ([]DepartureCandidate, error)
	FindDeparture(packageID uint, departureDay string) (*models.TripDeparture, error)
	FindByID(id uint) (*models.TripDeparture, error)
	ListByProvider(providerID uint, limit int) ([]models.TripDeparture, error)
	FindActiveBookings(packageID uint, departureDay string) ([]models.Booking, error)
	FindStaleRescheduleOffers(now time.Time) ([]models.Booking, error)
	FindUpcomingDepartures(providerID uint, from time.Time) ([]DepartureCandidate, error)
	HasOpenReview(packageID uint, departureDay string) (bool, error)
}

type departureRepository struct {
	db *gorm.DB
}

func NewDepartureRepository(db *gorm.DB) DepartureRepository {
	return &departureRepository{db: db}
}

// Status booking yang benar-benar menempati kursi keberangkatan. Pesanan yang
// belum dibayar tidak dihitung: kursinya belum pasti dan tidak boleh membuat
// kuota minimal terlihat terpenuhi.
var occupyingBookingStatuses = []string{models.StatusPaid, models.StatusConfirmed}

func (r *departureRepository) FindUnderfilledDepartures(now time.Time) ([]DepartureCandidate, error) {
	var rows []DepartureCandidate
	err := r.db.Raw(`
		SELECT b.package_id            AS package_id,
		       b.provider_id           AS provider_id,
		       to_char(b.trip_date, 'YYYY-MM-DD') AS departure_day,
		       MIN(b.trip_date)        AS departure_at,
		       SUM(b.guests)           AS seats_booked,
		       p.quota_min             AS seats_required,
		       COUNT(*)                AS booking_count
		FROM bookings b
		JOIN packages p ON p.id = b.package_id AND p.deleted_at IS NULL
		WHERE lower(replace(p.trip_type, ' ', '')) = 'opentrip'
		  AND b.status IN ?
		  AND b.trip_date > ?
		GROUP BY b.package_id, b.provider_id, to_char(b.trip_date, 'YYYY-MM-DD'), p.quota_min
		HAVING SUM(b.guests) < p.quota_min
		ORDER BY MIN(b.trip_date) ASC
	`, occupyingBookingStatuses, now).Scan(&rows).Error
	return rows, err
}

func (r *departureRepository) FindDeparture(packageID uint, departureDay string) (*models.TripDeparture, error) {
	var departure models.TripDeparture
	err := r.db.Where("package_id = ? AND departure_day = ?", packageID, departureDay).First(&departure).Error
	if err != nil {
		return nil, err
	}
	return &departure, nil
}

func (r *departureRepository) FindByID(id uint) (*models.TripDeparture, error) {
	var departure models.TripDeparture
	if err := r.db.Preload("Package").First(&departure, id).Error; err != nil {
		return nil, err
	}
	return &departure, nil
}

func (r *departureRepository) ListByProvider(providerID uint, limit int) ([]models.TripDeparture, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var departures []models.TripDeparture
	err := r.db.Preload("Package").
		Where("provider_id = ?", providerID).
		Order("departure_at asc").
		Limit(limit).
		Find(&departures).Error
	return departures, err
}

func (r *departureRepository) FindActiveBookings(packageID uint, departureDay string) ([]models.Booking, error) {
	var bookings []models.Booking
	err := r.db.Preload("Package").
		Where("package_id = ? AND to_char(trip_date, 'YYYY-MM-DD') = ? AND status IN ?",
			packageID, departureDay, occupyingBookingStatuses).
		Order("id asc").
		Find(&bookings).Error
	return bookings, err
}

// FindStaleRescheduleOffers mencari tawaran penjadwalan ulang yang tidak dijawab
// sampai batas waktunya habis. Tanpa ini booking menggantung selamanya di status
// RESCHEDULE_OFFERED dan dananya tidak pernah dikembalikan maupun dicairkan.
//
// Batas yang dipakai adalah response_deadline milik keberangkatan, bukan tanggal
// jalan booking: pembatalan karena keadaan kahar dinyatakan pada hari
// keberangkatan, sehingga tanggal jalan sudah lewat sejak tawaran dikirim.
func (r *departureRepository) FindStaleRescheduleOffers(now time.Time) ([]models.Booking, error) {
	var bookings []models.Booking
	err := r.db.Preload("Package").
		Joins("JOIN trip_departures d ON d.id = bookings.trip_departure_id").
		Where("bookings.status = ? AND d.response_deadline IS NOT NULL AND d.response_deadline < ?",
			models.StatusRescheduleOffered, now).
		Order("bookings.id asc").
		Find(&bookings).Error
	return bookings, err
}

// FindUpcomingDepartures mendaftar keberangkatan mitra yang masih akan datang,
// untuk seluruh tipe paket. Keadaan kahar dapat menimpa private trip maupun
// corporate, bukan hanya open trip, sehingga daftar ini tidak disaring per tipe.
// Hari berjalan ikut disertakan karena pembatalan kahar justru paling sering
// dinyatakan pada hari keberangkatan.
func (r *departureRepository) FindUpcomingDepartures(providerID uint, from time.Time) ([]DepartureCandidate, error) {
	var rows []DepartureCandidate
	err := r.db.Raw(`
		SELECT b.package_id            AS package_id,
		       b.provider_id           AS provider_id,
		       to_char(b.trip_date, 'YYYY-MM-DD') AS departure_day,
		       MIN(b.trip_date)        AS departure_at,
		       SUM(b.guests)           AS seats_booked,
		       p.quota_min             AS seats_required,
		       COUNT(*)                AS booking_count
		FROM bookings b
		JOIN packages p ON p.id = b.package_id AND p.deleted_at IS NULL
		WHERE b.provider_id = ?
		  AND b.status IN ?
		  AND b.trip_date >= ?
		GROUP BY b.package_id, b.provider_id, to_char(b.trip_date, 'YYYY-MM-DD'), p.quota_min
		ORDER BY MIN(b.trip_date) ASC
		LIMIT 100
	`, providerID, occupyingBookingStatuses, from).Scan(&rows).Error
	return rows, err
}

// HasOpenReview memastikan satu keberangkatan tidak ditinjau dua kali sekaligus.
func (r *departureRepository) HasOpenReview(packageID uint, departureDay string) (bool, error) {
	var count int64
	err := r.db.Model(&models.TripDeparture{}).
		Where("package_id = ? AND departure_day = ? AND status IN ?",
			packageID, departureDay,
			[]string{models.DepartureAwaitingProvider, models.DepartureRescheduleOffered}).
		Count(&count).Error
	return count > 0, err
}
