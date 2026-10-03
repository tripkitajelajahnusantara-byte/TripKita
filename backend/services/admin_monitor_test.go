package services

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"tripkita-provider/models"
)

func monitorTestService(t *testing.T) (*adminService, sqlmock.Sqlmock) {
	t.Helper()
	conn, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	return &adminService{db: db}, mock
}

func TestMonitorIncludesUnpaidAndCancelledAcrossProviders(t *testing.T) {
	s, mock := monitorTestService(t)
	mock.ExpectQuery(`SELECT b.status, COUNT\(\*\) AS count FROM bookings AS b .* GROUP BY "b"."status"`).
		WithArgs().WillReturnRows(sqlmock.NewRows([]string{"status", "count"}).AddRow("PENDING_PAYMENT", 1).AddRow("CANCELLED_BY_PROVIDER", 1))
	now := time.Now()
	mock.ExpectQuery(`SELECT b.id, b.booking_code,.* FROM bookings AS b .* ORDER BY b.created_at DESC, b.id DESC LIMIT \$1$`).
		WithArgs(20).WillReturnRows(sqlmock.NewRows([]string{"id", "provider_id", "status", "created_at"}).AddRow(2, 8, "PENDING_PAYMENT", now).AddRow(1, 7, "CANCELLED_BY_PROVIDER", now))
	result, err := s.MonitorBookings(models.AdminBookingFilter{Page: 1, PageSize: 20})
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 2 || len(result.Items) != 2 || result.Items[0].ProviderID != 8 || result.Items[1].ProviderID != 7 {
		t.Fatalf("missing bookings: %+v", result)
	}
	encoded, _ := json.Marshal(result)
	for _, private := range []string{"password", "paymentProof", "customerEmail", "participants", "bankAccount"} {
		if strings.Contains(string(encoded), private) {
			t.Fatalf("private field exposed: %s", private)
		}
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestMonitorProviderStatusSearchAndPaginationAreScoped(t *testing.T) {
	s, mock := monitorTestService(t)
	mock.ExpectQuery(`SELECT "id" FROM "providers" WHERE .*`).WithArgs(7, "PROVIDER", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(7))
	search := `%TK\_50\%%`
	mock.ExpectQuery(`SELECT b.status, COUNT\(\*\).*WHERE b.provider_id = \$1 AND .* GROUP BY "b"."status"$`).
		WithArgs(7, search, search, search, search).
		WillReturnRows(sqlmock.NewRows([]string{"status", "count"}).AddRow("PAID", 7).AddRow("EXPIRED", 2))
	mock.ExpectQuery(`SELECT b.id,.*WHERE b.provider_id = \$1 AND .* AND b.status = \$6 ORDER BY b.created_at DESC, b.id DESC LIMIT \$7 OFFSET \$8$`).
		WithArgs(7, search, search, search, search, "PAID", 5, 5).
		WillReturnRows(sqlmock.NewRows([]string{"id", "provider_id", "status"}).AddRow(2, 7, "PAID").AddRow(1, 7, "PAID"))
	result, err := s.MonitorBookings(models.AdminBookingFilter{ProviderID: 7, Status: "PAID", Search: " TK_50% ", Page: 2, PageSize: 5})
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 7 || result.Summary.Total != 9 || result.Summary.ByStatus["EXPIRED"] != 2 || len(result.Items) != 2 {
		t.Fatalf("incorrect summary/pagination: %+v", result)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestMonitorEmptyAndMissingProvider(t *testing.T) {
	s, mock := monitorTestService(t)
	mock.ExpectQuery(`SELECT b.status, COUNT\(\*\).*`).WillReturnRows(sqlmock.NewRows([]string{"status", "count"}))
	mock.ExpectQuery(`SELECT b.id,.*`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	result, err := s.MonitorBookings(models.AdminBookingFilter{Page: 1, PageSize: 5})
	if err != nil || result.Items == nil || result.Summary.ByStatus == nil || result.Total != 0 {
		t.Fatalf("empty response: %+v %v", result, err)
	}
	mock.ExpectQuery(`SELECT "id" FROM "providers" WHERE .*`).WithArgs(999, "PROVIDER", 1).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	if _, err := s.MonitorBookings(models.AdminBookingFilter{ProviderID: 999, Page: 1, PageSize: 5}); !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("missing provider: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
