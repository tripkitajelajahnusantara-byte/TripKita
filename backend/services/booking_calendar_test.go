package services

import (
	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"testing"
	"time"
	"tripkita-provider/models"
)

func TestBookingScheduleBoundaryRules(t *testing.T) {
	now := time.Date(2026, 9, 30, 10, 0, 0, 0, models.BookingLocation)
	pkg := &models.Package{TripType: "Private Trip", StartDate: "2026-10-07", EndDate: "2026-12-30", Duration: 3}
	for _, tc := range []struct {
		day     string
		allowed bool
	}{{"2026-10-06", false}, {"2026-10-07", true}, {"2026-12-28", true}, {"2026-12-29", false}, {"2027-01-01", false}} {
		start, _ := time.ParseInLocation("2006-01-02", tc.day, models.BookingLocation)
		err := validateBookingSchedule(pkg, start, calculatePackageTripEnd(pkg, start), now, false)
		if (err == nil) != tc.allowed {
			t.Fatalf("%s: %v", tc.day, err)
		}
	}
	pkg.TripType = "Open Trip"
	start := now.AddDate(0, 0, 8)
	pkg.DepartureDates = []string{start.Format("2006-01-02")}
	if err := validateBookingSchedule(pkg, start, calculatePackageTripEnd(pkg, start), now, false); err != nil {
		t.Fatalf("Open Trip period rule changed: %v", err)
	}
	if got := calculatePackageTripEnd(pkg, start); !got.Equal(start.AddDate(0, 0, 3)) {
		t.Fatal("Open Trip end time changed")
	}

}

func TestExclusiveDatesFailClosedAndCheckAllOccupiedDays(t *testing.T) {
	for _, offered := range []int64{0, 1, 2, 3} {
		conn, mock, err := sqlmock.New()
		if err != nil {
			t.Fatal(err)
		}
		db, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
		if err != nil {
			t.Fatal(err)
		}
		start := time.Now().In(models.BookingLocation).AddDate(0, 0, 10)
		end := calculatePackageTripEnd(&models.Package{TripType: "Honeymoon", Duration: 3}, start)
		days := occupiedDays(start, end)
		if len(days) != 3 {
			t.Fatalf("3-day trip locks %d days", len(days))
		}
		pkg := &models.Package{ID: 1, TripType: "Honeymoon", Duration: 3, StartDate: days[0], EndDate: days[2]}
		mock.ExpectQuery(`SELECT count\(\*\) FROM "bookings"`).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
		mock.ExpectQuery(`SELECT count\(\*\) FROM "package_dates"`).WithArgs(1, days[0], days[1], days[2], models.PackageDateOriginProvider, models.PackageDateOpen, uint(0)).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(offered))
		err = ensureExclusiveDateTx(db, pkg, start, end, 0)
		if (err == nil) != (offered == 3) {
			t.Fatalf("offered %d: %v", offered, err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatal(err)
		}
		conn.Close()
	}
}

func TestExclusiveBookingCapacityDoesNotConsumeOtherPeriods(t *testing.T) {
	for _, tripType := range []string{"Private Trip", "Honeymoon", "Family", "Family Trip", "Corporate", "Corporate Trip"} {
		pkg := &models.Package{TripType: tripType, QuotaMax: 4, QuotaUsed: 4}
		if err := validateBookingCapacity(pkg, 4); err != nil {
			t.Fatalf("%s: prior four-person booking blocked another period: %v", tripType, err)
		}
		if err := validateBookingCapacity(pkg, 5); err == nil {
			t.Fatalf("%s: per-booking capacity not enforced", tripType)
		}
	}
	if err := validateBookingCapacity(&models.Package{TripType: "Open Trip", QuotaMax: 4, QuotaUsed: 4}, 1); err == nil {
		t.Fatal("Open Trip shared quota behavior changed")
	}
}

func TestOverlapCheckedAcrossProviderPackages(t *testing.T) {
	conn, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	start := time.Now().In(models.BookingLocation).AddDate(0, 0, 15)
	pkg := &models.Package{ID: 2, ProviderID: 7, TripType: "Private Trip", Duration: 3, StartDate: start.Format("2006-01-02"), EndDate: start.AddDate(0, 0, 5).Format("2006-01-02")}
	end := calculatePackageTripEnd(pkg, start)
	// Existing reservation is in a different package. Query must use provider ID
	// and also treat replacement dates still awaiting a customer's answer as taken.
	mock.ExpectQuery(`SELECT count\(\*\) FROM "bookings".*bookings.provider_id = .*EXISTS .*source.trip_type.*reschedule_date`).
		WithArgs(7, models.StatusPendingPayment, models.StatusPaymentReview, models.StatusPaid, models.StatusConfirmed, models.StatusCompleted, end.Format("2006-01-02"), start.Format("2006-01-02"),
			models.StatusRescheduleOffered, end.Format("2006-01-02"), start.Format("2006-01-02")).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
	if err := ensureExclusiveDateTx(db, pkg, start, end, 0); err == nil {
		t.Fatal("overlap with provider's other package accepted")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestExclusiveBookingLocksProviderBeforePackage(t *testing.T) {
	conn, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	mock.ExpectQuery(`SELECT .* FROM "packages"`).WillReturnRows(sqlmock.NewRows([]string{"id", "provider_id", "trip_type"}).AddRow(2, 7, "Private Trip"))
	mock.ExpectQuery(`SELECT .* FROM "providers".*FOR UPDATE`).WithArgs(7, 1).WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(7))
	mock.ExpectQuery(`SELECT .* FROM "packages".*FOR UPDATE`).WillReturnRows(sqlmock.NewRows([]string{"id", "provider_id", "trip_type"}).AddRow(2, 7, "Private Trip"))
	var pkg models.Package
	if err := lockBookingPackageTx(db, 2, &pkg); err != nil {
		t.Fatal(err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
