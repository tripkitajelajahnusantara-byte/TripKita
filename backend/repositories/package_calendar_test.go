package repositories

import (
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	"reflect"
	"testing"
	"time"
	"tripkita-provider/models"
)

func TestPackageAndCalendarCommitTogether(t *testing.T) {
	for _, fail := range []bool{false, true} {
		t.Run(map[bool]string{false: "commit", true: "rollback"}[fail], func(t *testing.T) {
			db, mock := mockRepositoryDB(t)
			mock.ExpectBegin()
			mock.ExpectQuery(`SELECT .* FROM "providers".*FOR UPDATE`).WillReturnRows(sqlmock.NewRows([]string{"id", "role", "status", "is_verified"}).AddRow(7, "PROVIDER", "APPROVED", true))
			mock.ExpectQuery(`INSERT INTO "packages"`).WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(3))
			mock.ExpectQuery(`SELECT .* FROM "package_dates"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
			mock.ExpectExec(`DELETE FROM "package_dates"`).WillReturnResult(sqlmock.NewResult(0, 0))
			insert := mock.ExpectQuery(`INSERT INTO "package_dates"`)
			if fail {
				insert.WillReturnError(errors.New("calendar write failed"))
				mock.ExpectRollback()
			} else {
				insert.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
				mock.ExpectCommit()
			}
			err := NewPackageRepository(db).Create(&models.Package{ProviderID: 7, TripType: "Private Trip", AvailableDates: []string{"2026-10-10"}})
			if (err != nil) != fail {
				t.Fatalf("unexpected result: %v", err)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestAvailabilityAcrossPackagesUsesProviderBookingPeriod(t *testing.T) {
	db, mock := mockRepositoryDB(t)
	start := time.Now().In(models.BookingLocation).AddDate(0, 0, 15)
	days, _ := models.CalendarRange(start.Format("2006-01-02"), start.AddDate(0, 0, 5).Format("2006-01-02"))
	rows := sqlmock.NewRows([]string{"package_id", "date", "status", "origin"})
	for _, id := range []int{1, 2, 3} {
		for _, day := range days {
			rows.AddRow(id, day, models.PackageDateOpen, models.PackageDateOriginProvider)
		}
	}
	mock.ExpectQuery(`SELECT .* FROM "package_dates"`).WillReturnRows(rows)
	mock.ExpectQuery(`SELECT .* FROM "packages"`).WillReturnRows(sqlmock.NewRows([]string{"id", "provider_id"}).AddRow(1, 7).AddRow(2, 7).AddRow(3, 8))
	mock.ExpectQuery(`SELECT .* FROM "bookings" JOIN packages source.*source.trip_type`).WillReturnRows(sqlmock.NewRows([]string{"provider_id", "trip_date", "trip_end_date"}).AddRow(7, start, start.AddDate(0, 0, 2)))
	open, booked, err := NewPackageDateRepository(db).DatesFor([]uint{1, 2, 3}, time.Now().In(models.BookingLocation).Format("2006-01-02"))
	if err != nil {
		t.Fatal(err)
	}
	for _, id := range []uint{1, 2} {
		if !reflect.DeepEqual(open[id], days[3:]) || !reflect.DeepEqual(booked[id], days[:3]) {
			t.Fatalf("provider 7 package %d: open=%v booked=%v", id, open[id], booked[id])
		}
	}
	if !reflect.DeepEqual(open[3], days) || len(booked[3]) != 0 {
		t.Fatal("another provider incorrectly locked")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestCannotCloseBookedDate(t *testing.T) {
	db, mock := mockRepositoryDB(t)
	day := time.Now().In(models.BookingLocation).AddDate(0, 0, 10).Format("2006-01-02")
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT .* FROM "packages".*FOR UPDATE`).WillReturnRows(sqlmock.NewRows([]string{"id", "start_date", "end_date"}).AddRow(3, day, day))
	mock.ExpectQuery(`SELECT .* FROM "package_dates"`).WillReturnRows(sqlmock.NewRows([]string{"id", "date", "status", "origin"}).AddRow(1, day, models.PackageDateBooked, models.PackageDateOriginProvider))
	mock.ExpectRollback()
	err := NewPackageDateRepository(db).ReplaceProviderDates(3, []string{})
	var conflict *AvailabilityConflictError
	if !errors.As(err, &conflict) {
		t.Fatalf("expected booked-date conflict, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
