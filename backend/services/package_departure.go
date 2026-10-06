package services

import (
	"sort"
	"time"

	"gorm.io/gorm"
	"tripkita-provider/models"
)

func configureOpenTripDates(pkg *models.Package, dates, previous []string, now time.Time) error {
	if !models.IsOpenTrip(pkg.TripType) {
		if len(dates) > 0 {
			return packageValidationErrorf("tanggal keberangkatan bersama hanya untuk Open Trip")
		}
		pkg.DepartureDates = nil
		return nil
	}
	if len(dates) == 0 || len(dates) > models.MaxAvailabilityDates {
		return packageValidationErrorf("pilih 1–100 tanggal keberangkatan Open Trip")
	}
	today, latest := models.AvailabilityWindow(now)
	old := map[string]bool{}
	for _, day := range previous {
		old[day] = true
	}
	unique := map[string]bool{}
	cleaned := []string{}
	for _, day := range dates {
		if _, err := time.Parse("2006-01-02", day); err != nil || (!old[day] && (day < today || day > latest)) {
			return packageValidationErrorf("tanggal keberangkatan baru harus antara %s dan %s", today, latest)
		}
		if !unique[day] {
			cleaned = append(cleaned, day)
			unique[day] = true
		}
	}
	sort.Strings(cleaned)
	pkg.DepartureDates = cleaned
	pkg.StartDate = cleaned[0]
	pkg.EndDate = pkg.DepartureEnd(cleaned[len(cleaned)-1])
	return nil
}

// Mutating callers hold the package row lock, shared with checkout and edits.
// A preflight read can also call this; the transaction must check again.
func ensureOpenTripCapacityTx(tx *gorm.DB, pkg *models.Package, day time.Time, guests int, excludeID uint) error {
	if !models.IsOpenTrip(pkg.TripType) {
		return nil
	}
	var used int
	date := day.In(models.BookingLocation).Format("2006-01-02")
	var closed int64
	if err := tx.Model(&models.TripDeparture{}).Where("package_id = ? AND departure_day = ? AND status IN ? AND reason <> ?", pkg.ID, date, models.ClosedDepartureStatuses(), models.DepartureReasonProviderReschedule).Count(&closed).Error; err != nil {
		return err
	}
	if closed > 0 {
		return &BookingInputError{Message: "keberangkatan ini sudah dibatalkan atau dijadwalkan ulang; pilih tanggal lain"}
	}
	if err := tx.Model(&models.Booking{}).Select("COALESCE(SUM(guests), 0)").
		Where(`package_id = ? AND id <> ? AND
		((status IN ? AND to_char(trip_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') = ?)
		OR (status = ? AND to_char(reschedule_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') = ?))`,
			pkg.ID, excludeID, activeBookingStatuses, date, models.StatusRescheduleOffered, date).Scan(&used).Error; err != nil {
		return err
	}
	if pkg.QuotaMax > 0 && used+guests > pkg.QuotaMax {
		return &BookingInputError{Message: "kuota tanggal keberangkatan tersebut tidak mencukupi; pilih tanggal lain atau kurangi peserta"}
	}
	return nil
}
