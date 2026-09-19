package repositories

import (
	"fmt"
	"sort"
	"time"

	"gorm.io/gorm"

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
	wanted := make(map[string]struct{}, len(dates))
	for _, date := range dates {
		wanted[date] = struct{}{}
	}

	return r.db.Transaction(func(tx *gorm.DB) error {
		var existing []models.PackageDate
		if err := tx.Where("package_id = ?", packageID).Find(&existing).Error; err != nil {
			return err
		}

		present := make(map[string]models.PackageDate, len(existing))
		var removedBooked []string
		for _, row := range existing {
			present[row.Date] = row
			if _, keep := wanted[row.Date]; !keep && row.Status == models.PackageDateBooked {
				removedBooked = append(removedBooked, row.Date)
			}
		}
		if len(removedBooked) > 0 {
			sort.Strings(removedBooked)
			return fmt.Errorf("tanggal berikut sudah dipesan pelanggan dan tidak dapat ditutup: %v", removedBooked)
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
	})
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
	return open, booked, nil
}
