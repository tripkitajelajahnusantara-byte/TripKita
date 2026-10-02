package repositories

import (
	"fmt"
	"sort"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"tripkita-provider/models"
)

type PackageDateRepository interface {
	ListByPackage(packageID uint) ([]models.PackageDate, error)
	ReplaceProviderDates(packageID uint, dates []string) error
	// DatesFor mengembalikan tanggal yang masih terbuka dan tanggal yang sudah
	// terkunci untuk sekumpulan paket sekaligus, agar daftar paket tidak
	// menghasilkan satu query per baris.
	DatesFor(packageIDs []uint, from string) (open map[uint][]string, booked map[uint][]string, err error)
}

type packageDateRepository struct {
	db *gorm.DB
}

type AvailabilityConflictError struct{ Message string }

func (e *AvailabilityConflictError) Error() string { return e.Message }

func NewPackageDateRepository(db *gorm.DB) PackageDateRepository {
	return &packageDateRepository{db: db}
}

func (r *packageDateRepository) ListByPackage(packageID uint) ([]models.PackageDate, error) {
	var dates []models.PackageDate
	err := r.db.Where("package_id = ?", packageID).Order("date asc").Find(&dates).Error
	return dates, err
}

// ReplaceProviderDates menyetel ulang daftar tanggal yang dibuka mitra.
//
// Tanggal yang sedang terkunci pesanan tidak boleh hilang dari daftar: menutup
// tanggal yang sudah dibayar pelanggan akan membuat pesanan itu menunjuk jadwal
// yang tidak lagi diakui paketnya.
func (r *packageDateRepository) ReplaceProviderDates(packageID uint, dates []string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Same package row lock as checkout: opening/closing cannot race booking.
		var pkg models.Package
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&pkg, packageID).Error; err != nil {
			return err
		}
		today, latest := models.AvailabilityWindow(time.Now())
		for _, day := range dates {
			if day < today || day > latest || day < pkg.StartDate || day > pkg.EndDate {
				return fmt.Errorf("tanggal %s di luar periode paket atau batas tiga bulan", day)
			}
		}
		return replaceProviderDatesTx(tx, packageID, dates)
	})
}

func replaceProviderDatesTx(tx *gorm.DB, packageID uint, dates []string) error {
	wanted := make(map[string]struct{}, len(dates))
	for _, date := range dates {
		wanted[date] = struct{}{}
	}

	var existing []models.PackageDate
	if err := tx.Where("package_id = ?", packageID).Find(&existing).Error; err != nil {
		return err
	}

	present := make(map[string]models.PackageDate, len(existing))
	var removedBooked []string
	for _, row := range existing {
		present[row.Date] = row
		if _, keep := wanted[row.Date]; !keep && row.Status == models.PackageDateBooked && row.Date >= time.Now().In(models.BookingLocation).Format("2006-01-02") {
			removedBooked = append(removedBooked, row.Date)
		}
	}
	if len(removedBooked) > 0 {
		sort.Strings(removedBooked)
		return &AvailabilityConflictError{Message: fmt.Sprintf("tanggal berikut sudah dipesan pelanggan dan tidak dapat ditutup: %v", removedBooked)}
	}

	// Hapus tanggal terbuka yang tidak lagi dikehendaki mitra.
	if err := tx.Where("package_id = ? AND status = ?", packageID, models.PackageDateOpen).
		Delete(&models.PackageDate{}, "date NOT IN ?", keysOrPlaceholder(wanted)).Error; err != nil {
		return err
	}

	now := time.Now()
	for date := range wanted {
		if row, ok := present[date]; ok {
			// Baris bayangan yang kini dipilih mitra menjadi tanggal resmi.
			if row.Origin != models.PackageDateOriginProvider {
				if err := tx.Model(&models.PackageDate{}).Where("id = ?", row.ID).
					Updates(map[string]interface{}{
						"origin":     models.PackageDateOriginProvider,
						"updated_at": now,
					}).Error; err != nil {
					return err
				}
			}
			continue
		}
		if err := tx.Create(&models.PackageDate{
			PackageID: packageID,
			Date:      date,
			Status:    models.PackageDateOpen,
			Origin:    models.PackageDateOriginProvider,
		}).Error; err != nil {
			return err
		}
	}
	return nil
}

// keysOrPlaceholder mencegah klausa `NOT IN ()` yang tidak sah saat mitra
// menutup seluruh tanggal.
func keysOrPlaceholder(set map[string]struct{}) []string {
	if len(set) == 0 {
		return []string{""}
	}
	keys := make([]string, 0, len(set))
	for key := range set {
		keys = append(keys, key)
	}
	return keys
}

func (r *packageDateRepository) DatesFor(packageIDs []uint, from string) (map[uint][]string, map[uint][]string, error) {
	open := make(map[uint][]string)
	booked := make(map[uint][]string)
	if len(packageIDs) == 0 {
		return open, booked, nil
	}

	var rows []models.PackageDate
	err := r.db.Where("package_id IN ? AND date >= ?", packageIDs, from).
		Order("date asc").
		Find(&rows).Error
	if err != nil {
		return nil, nil, err
	}

	for _, row := range rows {
		switch row.Status {
		case models.PackageDateBooked:
			booked[row.PackageID] = append(booked[row.PackageID], row.Date)
		case models.PackageDateOpen:
			// Baris bayangan bukan tanggal yang sengaja dibuka mitra, jadi tidak
			// pernah ditawarkan sebagai pilihan.
			if row.Origin == models.PackageDateOriginProvider {
				open[row.PackageID] = append(open[row.PackageID], row.Date)
			}
		}
	}
	// A non-open-trip reservation consumes the provider's time, including when
	// the customer is looking at another package belonging to that provider.
	var packages []models.Package
	if err := r.db.Select("id", "provider_id").Where("id IN ?", packageIDs).Find(&packages).Error; err != nil {
		return nil, nil, err
	}
	providerIDs := make([]uint, 0, len(packages))
	for _, pkg := range packages {
		providerIDs = append(providerIDs, pkg.ProviderID)
	}
	if len(providerIDs) == 0 {
		return open, booked, nil
	}
	_, latest := models.AvailabilityWindow(time.Now())
	var reservations []models.Booking
	if err := r.db.Model(&models.Booking{}).Select("bookings.provider_id, bookings.trip_date, bookings.trip_end_date").
		Joins("JOIN packages source ON source.id = bookings.package_id").
		Where("bookings.provider_id IN ? AND bookings.status IN ? AND LOWER(REPLACE(TRIM(source.trip_type), ' ', '')) <> 'opentrip'", providerIDs,
			[]string{models.StatusPendingPayment, models.StatusPaymentReview, models.StatusPaid, models.StatusConfirmed, models.StatusCompleted}).
		Where("to_char(GREATEST(bookings.trip_end_date, bookings.trip_date) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') >= ? AND to_char(bookings.trip_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') <= ?", from, latest).
		Find(&reservations).Error; err != nil {
		return nil, nil, err
	}
	busy := make(map[uint]map[string]bool)
	for _, reservation := range reservations {
		start, end := reservation.TripDate.In(models.BookingLocation).Format("2006-01-02"), reservation.TripEndDate.In(models.BookingLocation).Format("2006-01-02")
		if end < start {
			end = start
		}
		if start < from {
			start = from
		}
		if end > latest {
			end = latest
		}
		days, err := models.CalendarRange(start, end)
		if err != nil {
			return nil, nil, err
		}
		if busy[reservation.ProviderID] == nil {
			busy[reservation.ProviderID] = make(map[string]bool)
		}
		for _, day := range days {
			busy[reservation.ProviderID][day] = true
		}
	}
	for _, pkg := range packages {
		blocked := make(map[string]bool)
		for _, day := range booked[pkg.ID] {
			blocked[day] = true
		}
		for day := range busy[pkg.ProviderID] {
			blocked[day] = true
		}
		booked[pkg.ID] = nil
		for day := range blocked {
			booked[pkg.ID] = append(booked[pkg.ID], day)
		}
		sort.Strings(booked[pkg.ID])
		available := make([]string, 0, len(open[pkg.ID]))
		for _, day := range open[pkg.ID] {
			if !blocked[day] {
				available = append(available, day)
			}
		}
		open[pkg.ID] = available
	}
	return open, booked, nil
}
