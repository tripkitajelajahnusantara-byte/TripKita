package services

import (
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"net/url"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"
	"tripkita-provider/database"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

// Opt in with an isolated local PostgreSQL database. Each run owns a temporary
// schema and removes only that schema. No seeded/demo or production data is used.
func TestPickupDeparturePostgres(t *testing.T) {
	dsn := os.Getenv("TRIPKITA_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set TRIPKITA_TEST_DATABASE_URL for PostgreSQL integration")
	}
	base, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	baseConn, _ := base.DB()
	t.Cleanup(func() { baseConn.Close() })
	schema := fmt.Sprintf("pickup_qa_%d", time.Now().UnixNano())
	if err := base.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { base.Exec("DROP SCHEMA " + schema + " CASCADE") })
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	query := u.Query()
	query.Set("search_path", schema)
	u.RawQuery = query.Encode()
	db, err := gorm.Open(postgres.Open(u.String()), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	conn, _ := db.DB()
	t.Cleanup(func() { conn.Close() })
	if err := db.AutoMigrate(&models.Provider{}, &models.Package{}, &models.Booking{}, &models.BookingParticipant{}, &models.PackageDate{}, &models.TripDeparture{}); err != nil {
		t.Fatal(err)
	}
	migration, err := os.ReadFile("../database/migrations/019_pickup_and_departure_dates.sql")
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if err := db.Exec(string(migration)).Error; err != nil {
			t.Fatalf("migration is not repeatable: %v", err)
		}
	}
	previous := database.DB
	database.DB = db
	t.Cleanup(func() { database.DB = previous })
	provider := models.Provider{BusinessName: "QA", Email: "qa@example.invalid", Role: "PROVIDER", Status: "APPROVED", IsVerified: true}
	if err := db.Create(&provider).Error; err != nil {
		t.Fatal(err)
	}
	repo := repositories.NewPackageRepository(db)
	s := &packageService{repo: repo, dateRepo: repositories.NewPackageDateRepository(db)}
	first := time.Now().In(models.BookingLocation).AddDate(0, 0, 10)
	second := first.AddDate(0, 1, 0)
	firstDay, secondDay := first.Format("2006-01-02"), second.Format("2006-01-02")
	pkg, err := s.CreatePackage(provider.ID, &models.CreatePackageRequest{Name: "Dieng QA", Destination: "Jawa Tengah", Category: "Alam", TripType: "Open Trip", Price: 500000, QuotaMin: 2, QuotaMax: 15, Duration: 3, MinGuests: 1, Status: "Aktif", Description: "QA", Schedule: "Pilihan tanggal", StartDate: firstDay, EndDate: secondDay, PickupMode: models.PickupFlexible, PickupArea: "Jabodetabek", PickupPoints: []string{"Jakarta, RS UKI"}, DepartureDates: []string{firstDay, secondDay}})
	if err != nil {
		t.Fatal(err)
	}
	service := &bookingService{}
	newBooking := func(day time.Time, pickup string) *models.Booking {
		p := validParticipant()
		p.PickupPoint = pickup
		return &models.Booking{PackageID: pkg.ID, CustomerName: "Budi Santoso", CustomerPhone: "081234567890", CustomerEmail: "qa@example.invalid", Guests: 1, TripDate: day, Participants: []models.BookingParticipant{p}}
	}
	if err := service.CreateBooking(newBooking(first.AddDate(0, 0, 1), "Jakarta, RS UKI")); err == nil {
		t.Fatal("unscheduled date booked")
	}
	if err := service.CreateBooking(newBooking(first, "")); err == nil {
		t.Fatal("missing pickup booked")
	}
	var accepted [2]atomic.Int32
	var wg sync.WaitGroup
	for i, day := range []time.Time{first, second} {
		for n := 0; n < 20; n++ {
			wg.Add(1)
			go func(i int, day time.Time) {
				defer wg.Done()
				if err := service.CreateBooking(newBooking(day, "Bekasi, Exit Tol Barat")); err == nil {
					accepted[i].Add(1)
				}
			}(i, day)
		}
	}
	wg.Wait()
	if accepted[0].Load() != 15 || accepted[1].Load() != 15 {
		t.Fatalf("concurrent capacity incorrect: %d / %d", accepted[0].Load(), accepted[1].Load())
	}
	loaded, err := s.GetPackageByID(pkg.ID, provider.ID)
	if err != nil || len(loaded.Departures) != 2 || loaded.Departures[0].SeatsLeft != 0 || loaded.Departures[1].QuotaUsed != 15 {
		t.Fatalf("read availability: %+v %v", loaded, err)
	}
	remove := []string{secondDay}
	if _, err := s.UpdatePackage(pkg.ID, provider.ID, &models.UpdatePackageRequest{DepartureDates: &remove}); err == nil {
		t.Fatal("reserved departure removed")
	}
	capacity := 14
	if _, err := s.UpdatePackage(pkg.ID, provider.ID, &models.UpdatePackageRequest{QuotaMax: &capacity}); err == nil {
		t.Fatal("capacity reduced below reservations")
	}
	var b models.Booking
	if err := db.Preload("Participants").Where("package_id = ?", pkg.ID).First(&b).Error; err != nil {
		t.Fatal(err)
	}
	if b.PickupMode != models.PickupFlexible || b.Participants[0].PickupPoint != "Bekasi, Exit Tol Barat" {
		t.Fatalf("pickup not persisted: %+v", b)
	}
	// A cancelled booking releases exactly one seat on its own date.
	if err := db.Model(&b).Update("status", models.StatusCancelledByCustomer).Error; err != nil {
		t.Fatal(err)
	}
	if err := service.CreateBooking(newBooking(b.TripDate, "Jakarta, RS UKI")); err != nil {
		t.Fatalf("released seat not reusable: %v", err)
	}
	if err := service.CreateBooking(newBooking(b.TripDate, "Jakarta, RS UKI")); err == nil {
		t.Fatal("overbooking after reuse")
	}
	// Reschedule offers reserve target seats, and cannot target a full departure.
	third := second.AddDate(0, 0, 14)
	dates := []string{firstDay, secondDay, third.Format("2006-01-02")}
	pkg, err = s.UpdatePackage(pkg.ID, provider.ID, &models.UpdatePackageRequest{DepartureDates: &dates})
	if err != nil {
		t.Fatal(err)
	}
	var moving models.Booking
	if err := db.Where("package_id = ? AND status = ?", pkg.ID, models.StatusPendingPayment).First(&moving).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&moving).Update("status", models.StatusPaid).Error; err != nil {
		t.Fatal(err)
	}
	departures := &departureService{db: db}
	fullTarget := first
	if moving.TripDate.In(models.BookingLocation).Format("2006-01-02") == firstDay {
		fullTarget = second
	}
	if err := departures.offerRescheduleToBooking(&moving, &models.TripDeparture{ID: 88}, fullTarget); err == nil {
		t.Fatal("offer overbooked full target")
	}
	if err := departures.offerRescheduleToBooking(&moving, &models.TripDeparture{ID: 88}, third); err != nil {
		t.Fatal(err)
	}
	loaded, err = s.GetPackageByID(pkg.ID, provider.ID)
	if err != nil || loaded.Departures[2].SeatsLeft != 14 {
		t.Fatalf("offer did not reserve target: %+v %v", loaded, err)
	}
	closed := models.TripDeparture{PackageID: pkg.ID, ProviderID: provider.ID, DepartureDay: dates[2], Status: models.DepartureCancelled, Reason: models.DepartureReasonForceMajeure}
	if err := db.Create(&closed).Error; err != nil {
		t.Fatal(err)
	}
	if err := service.CreateBooking(newBooking(third, "Jakarta, RS UKI")); err == nil {
		t.Fatal("cancelled departure was sold again")
	}
	loaded, err = s.GetPackageByID(pkg.ID, provider.ID)
	if err != nil || !loaded.Departures[2].Closed || loaded.Departures[2].SeatsLeft != 0 {
		t.Fatalf("cancelled departure appears bookable: %+v %v", loaded, err)
	}
}
