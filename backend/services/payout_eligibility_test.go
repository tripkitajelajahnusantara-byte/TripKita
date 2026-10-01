package services

import (
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"tripkita-provider/database"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

func TestPayoutDateBoundariesWIB(t *testing.T) {
	// Trip at 01:00 WIB is stored on the preceding UTC date.
	start := time.Date(2026, 10, 15, 1, 0, 0, 0, models.BookingLocation).UTC()
	end := time.Date(2026, 10, 17, 23, 59, 59, 0, models.BookingLocation)
	b := payoutTestBooking(1, start, end)
	unlock := time.Date(2026, 10, 12, 0, 0, 0, 0, models.BookingLocation)
	if !dpAvailableAt(b).Equal(unlock) {
		t.Fatalf("H-3 must start at midnight WIB, got %v", dpAvailableAt(b))
	}
	for _, tc := range []struct {
		name           string
		now            time.Time
		dp, settlement bool
	}{
		{"before H-3", unlock.Add(-time.Nanosecond), false, false},
		{"H-3 midnight", unlock, true, false},
		{"before trip end", end.Add(-time.Nanosecond), true, false},
		{"trip end", end, true, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			stages := buildBookingPayouts([]models.Booking{b}, nil, tc.now)[0]
			if (stages.DP.Status == models.BookingPayoutAvailable) != tc.dp || (stages.Settlement.Status == models.BookingPayoutAvailable) != tc.settlement {
				t.Fatalf("wrong eligibility: %+v", stages)
			}
			if stages.DP.AvailableAt == nil || !stages.DP.AvailableAt.Equal(unlock) || stages.Settlement.AvailableAt == nil || !stages.Settlement.AvailableAt.Equal(end) {
				t.Fatal("UI eligibility dates must match server boundaries")
			}
		})
	}
	// Rescheduling must recalculate eligibility rather than retain the old H-3.
	b.TripDate = start.AddDate(0, 0, 7)
	if dpCanBePaid(b, unlock) {
		t.Fatal("rescheduled DP unlocked using the old start date")
	}
}

func TestDirectPayoutRequestCannotBypassDateLock(t *testing.T) {
	for _, tc := range []struct{ payoutType, reason string }{
		{"DP_50", "H-3"}, {"PELUNASAN_50", "waktu selesai"},
	} {
		t.Run(tc.payoutType, func(t *testing.T) {
			conn, mock, err := sqlmock.New()
			if err != nil {
				t.Fatal(err)
			}
			defer conn.Close()
			db, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
			if err != nil {
				t.Fatal(err)
			}
			previous := database.DB
			database.DB = db
			defer func() { database.DB = previous }()
			providerRows := func() *sqlmock.Rows {
				return sqlmock.NewRows([]string{"id", "bank_name", "bank_account", "bank_account_name", "platform_fee_percent"}).AddRow(7, "BCA", "0000000000", "Mitra Uji", 15)
			}
			mock.ExpectQuery(`SELECT .* FROM "providers"`).WillReturnRows(providerRows())
			mock.ExpectBegin()
			mock.ExpectExec(`SELECT pg_advisory_xact_lock`).WillReturnResult(sqlmock.NewResult(0, 1))
			mock.ExpectQuery(`SELECT .* FROM "providers"`).WillReturnRows(providerRows())
			now := time.Now()
			b := payoutTestBooking(1, now.AddDate(0, 0, 10), now.AddDate(0, 0, 12))
			mock.ExpectQuery(`SELECT .* FROM "bookings"`).WillReturnRows(sqlmock.NewRows([]string{"id", "provider_id", "status", "total_price", "platform_fee_percent", "trip_date", "trip_end_date", "paid_at"}).AddRow(b.ID, 7, b.Status, b.TotalPrice, b.PlatformFeePercent, b.TripDate, b.TripEndDate, b.PaidAt))
			mock.ExpectQuery(`SELECT .* FROM "booking_participants"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
			mock.ExpectQuery(`SELECT .* FROM "payouts"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
			mock.ExpectQuery(`SELECT .* FROM "provider_balances"`).WillReturnRows(sqlmock.NewRows([]string{"provider_id", "available_balance", "held_balance"}).AddRow(7, 425_000, 425_000))
			mock.ExpectRollback()
			service := NewPayoutService(repositories.NewPayoutRepository(db), repositories.NewProviderRepository(db), repositories.NewBookingRepository(db), nil, nil, nil, nil)
			payout, err := service.RequestPayout(7, &models.CreatePayoutRequest{BookingID: uintPtr(1), Type: tc.payoutType, Amount: 425_000})
			if payout != nil || err == nil || !strings.Contains(err.Error(), tc.reason) {
				t.Fatalf("direct request should report the date lock: %v", err)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestPayoutEligibilityFailsClosed(t *testing.T) {
	now := time.Date(2026, 10, 1, 12, 0, 0, 0, models.BookingLocation)
	b := payoutTestBooking(1, now.AddDate(0, 0, -1), now.Add(time.Hour))
	b.Status = models.StatusCompleted
	if settlementCanBePaid(b, now) {
		t.Fatal("COMPLETED must not bypass a future end timestamp")
	}
	b.TripDate, b.TripEndDate = time.Time{}, time.Time{}
	if dpCanBePaid(b, now) || settlementCanBePaid(b, now) {
		t.Fatal("missing trip dates must stay locked")
	}
	stages := buildBookingPayouts([]models.Booking{b}, nil, now)[0]
	if stages.DP.AvailableAt != nil || stages.DP.BlockedReason == "" || stages.Settlement.BlockedReason == "" {
		t.Fatal("missing schedule must provide an actionable reason")
	}
	b.TripDate, b.TripEndDate = now.AddDate(0, 0, -5), now.AddDate(0, 0, -1)
	for _, status := range []string{models.StatusPendingPayment, models.StatusRefundRequired, models.StatusRefunded, models.StatusCancelledByProvider} {
		b.Status = status
		if dpCanBePaid(b, now) || settlementCanBePaid(b, now) {
			t.Fatalf("%s has no withdrawable earning", status)
		}
	}
}

func TestOnlyUnlockedUnreservedDPIsWithdrawable(t *testing.T) {
	now := time.Date(2026, 10, 1, 12, 0, 0, 0, models.BookingLocation)
	ready := payoutTestBooking(1, now.AddDate(0, 0, 2), now.AddDate(0, 0, 3))
	future := payoutTestBooking(2, now.AddDate(0, 0, 10), now.AddDate(0, 0, 11))
	reserved := payoutTestBooking(3, ready.TripDate, ready.TripEndDate)
	split := models.SplitBookingEarning(ready.TotalPrice, ready.PlatformFeePercent)
	payouts := []models.Payout{{ID: 1, BookingID: uintPtr(3), Type: "DP_50", Amount: split.DPAmount, Status: models.PayoutStatusPending}}
	stages := buildBookingPayouts([]models.Booking{ready, future, reserved}, payouts, now)
	if got := capAvailableDP(2*split.DPAmount, stages); got != split.DPAmount {
		t.Fatalf("future/pending DP counted as available: %d", got)
	}
	if got := capAvailableDP(10_000, stages); got != 10_000 {
		t.Fatalf("refund debt adjustment was bypassed: %d", got)
	}
}

func TestAdminApprovalRechecksTripDate(t *testing.T) {
	for _, tc := range []struct {
		name, payoutType string
		future           bool
		legacy           bool
		completed        bool
		mixed            bool
	}{
		{"future per-trip DP", "DP_50", true, false, false, false},
		{"future legacy DP", "DP_50", true, true, false, false},
		{"mixed legacy DP must not allocate to locked older booking", "DP_50", true, true, false, true},
		{"mixed legacy settlement must not allocate to locked older booking", "PELUNASAN_50", true, true, false, true},
		{"ready legacy DP", "DP_50", false, true, false, false},
		{"ready DP", "DP_50", false, false, false, false},
		{"future completed settlement", "PELUNASAN_50", true, false, true, false},
		{"ended settlement", "PELUNASAN_50", false, false, false, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			conn, mock, err := sqlmock.New()
			if err != nil {
				t.Fatal(err)
			}
			defer conn.Close()
			db, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
			if err != nil {
				t.Fatal(err)
			}
			now := time.Now()
			b := payoutTestBooking(1, now.AddDate(0, 0, -5), now.AddDate(0, 0, -1))
			if tc.future {
				b.TripDate, b.TripEndDate = now.AddDate(0, 0, 10), now.AddDate(0, 0, 12)
			}
			if tc.completed {
				b.Status = models.StatusCompleted
			}
			rows := sqlmock.NewRows([]string{"id", "provider_id", "status", "total_price", "platform_fee_percent", "trip_date", "trip_end_date", "paid_at"}).AddRow(b.ID, 7, b.Status, b.TotalPrice, b.PlatformFeePercent, b.TripDate, b.TripEndDate, b.PaidAt)
			if tc.mixed {
				ready := payoutTestBooking(2, now.AddDate(0, 0, -5), now.AddDate(0, 0, -1))
				rows.AddRow(ready.ID, 7, ready.Status, ready.TotalPrice, ready.PlatformFeePercent, ready.TripDate, ready.TripEndDate, ready.PaidAt)
			}
			mock.ExpectQuery(`SELECT .* FROM "bookings"`).WithArgs(uint(7)).WillReturnRows(rows)
			mock.ExpectQuery(`SELECT .* FROM "payouts"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
			current := &models.Payout{ID: 10, ProviderID: 7, BookingID: uintPtr(1), Type: tc.payoutType, Amount: 425_000}
			if tc.legacy {
				current.BookingID = nil
			}
			available, err := availablePayoutAmountTx(db, current)
			if err != nil {
				t.Fatal(err)
			}
			split := models.SplitBookingEarning(b.TotalPrice, b.PlatformFeePercent)
			want := split.DPAmount
			if tc.payoutType == "PELUNASAN_50" {
				want = split.SettlementHeld
			}
			if tc.future {
				want = 0
			}
			if available != want {
				t.Fatalf("approval amount: got %d want %d", available, want)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}
