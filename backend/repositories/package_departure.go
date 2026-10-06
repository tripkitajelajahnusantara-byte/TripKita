package repositories

import (
	"time"

	"gorm.io/gorm"
	"tripkita-provider/models"
)

// Offers reserve target seats until accepted, declined, or expired.
const openTripSeatSQL = `SELECT package_id,
	to_char(CASE WHEN status = 'RESCHEDULE_OFFERED' THEN reschedule_date ELSE trip_date END AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day,
	SUM(guests) AS guests FROM bookings
	WHERE package_id IN ? AND (status IN ('PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'CONFIRMED', 'COMPLETED')
	OR (status = 'RESCHEDULE_OFFERED' AND reschedule_date IS NOT NULL))
	GROUP BY package_id, day`

type departureSeatRow struct {
	PackageID uint
	Day       string
	Guests    int
}

func (r *packageRepository) LoadDepartureAvailability(packages []models.Package) error {
	ids := []uint{}
	for _, pkg := range packages {
		if models.IsOpenTrip(pkg.TripType) {
			ids = append(ids, pkg.ID)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	var rows []departureSeatRow
	if err := r.db.Raw(openTripSeatSQL, ids).Scan(&rows).Error; err != nil {
		return err
	}
	var closed []models.TripDeparture
	if err := r.db.Where("package_id IN ? AND status IN ? AND reason <> ?", ids, models.ClosedDepartureStatuses(), models.DepartureReasonProviderReschedule).Find(&closed).Error; err != nil {
		return err
	}
	blocked := map[uint]map[string]bool{}
	for _, departure := range closed {
		if blocked[departure.PackageID] == nil {
			blocked[departure.PackageID] = map[string]bool{}
		}
		blocked[departure.PackageID][departure.DepartureDay] = true
	}
	used := map[uint]map[string]int{}
	for _, row := range rows {
		if used[row.PackageID] == nil {
			used[row.PackageID] = map[string]int{}
		}
		used[row.PackageID][row.Day] = row.Guests
	}
	today := time.Now().In(models.BookingLocation).Format("2006-01-02")
	for i := range packages {
		pkg := &packages[i]
		pkg.Departures = nil
		for _, day := range pkg.OpenTripDates() {
			if day < today {
				continue
			}
			seats := used[pkg.ID][day]
			left := max(0, pkg.QuotaMax-seats)
			if blocked[pkg.ID][day] {
				left = 0
			}
			pkg.Departures = append(pkg.Departures, models.PackageDeparture{Date: day, EndDate: pkg.DepartureEnd(day), QuotaUsed: seats, SeatsLeft: left, Closed: blocked[pkg.ID][day]})
		}
	}
	return nil
}

// Booking rows and pending offers are authoritative. Never remove a departure
// with reservations, silently change its duration, or lower capacity below sales.
func protectOpenTripBookingsTx(tx *gorm.DB, current, next *models.Package) error {
	if !models.IsOpenTrip(current.TripType) {
		return nil
	}
	var bookings []models.Booking
	today := time.Now().In(models.BookingLocation).Format("2006-01-02")
	if err := tx.Where(`package_id = ? AND status IN ? AND
		(to_char(trip_end_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') >= ? OR status = ?)`, current.ID,
		[]string{models.StatusPendingPayment, models.StatusPaymentReview, models.StatusPaid, models.StatusConfirmed, models.StatusRescheduleOffered}, today, models.StatusRescheduleOffered).
		Find(&bookings).Error; err != nil {
		return err
	}
	if len(bookings) == 0 {
		return nil
	}
	if current.TripType != next.TripType || current.Duration != next.Duration {
		return &AvailabilityConflictError{Message: "tipe dan durasi tidak dapat diubah saat masih ada pesanan berjalan; gunakan paket baru"}
	}
	wanted := map[string]bool{}
	previous := map[string]bool{}
	for _, day := range next.OpenTripDates() {
		wanted[day] = true
	}
	for _, day := range current.OpenTripDates() {
		previous[day] = true
	}
	counts := map[string]int{}
	for _, b := range bookings {
		day := b.TripDate.In(models.BookingLocation).Format("2006-01-02")
		if previous[day] && !wanted[day] {
			return &AvailabilityConflictError{Message: "tanggal " + day + " sudah dipesan dan tidak dapat dihapus; gunakan alur pembatalan atau jadwal ulang booking"}
		}
		if b.Status == models.StatusRescheduleOffered && b.RescheduleDate != nil {
			day = b.RescheduleDate.In(models.BookingLocation).Format("2006-01-02")
		}
		if previous[day] && !wanted[day] {
			return &AvailabilityConflictError{Message: "tanggal pengganti yang sedang ditawarkan tidak dapat dihapus"}
		}
		counts[day] += b.Guests
		if counts[day] > next.QuotaMax {
			return &AvailabilityConflictError{Message: "kuota maksimal tidak boleh kurang dari kursi yang sudah dipesan pada " + day}
		}
	}
	return nil
}
