package models

import (
	"testing"
	"time"
)

func TestAvailabilityWindowClampsThreeMonths(t *testing.T) {
	for _, tc := range []struct{ input, first, last string }{
		{"2026-11-30T10:00:00+07:00", "2026-11-30", "2027-02-28"},
		{"2027-11-30T10:00:00+07:00", "2027-11-30", "2028-02-29"},
		{"2026-09-30T17:30:00Z", "2026-10-01", "2027-01-01"},
	} {
		now, _ := time.Parse(time.RFC3339, tc.input)
		first, last := AvailabilityWindow(now)
		if first != tc.first || last != tc.last {
			t.Fatalf("%s: %s..%s", tc.input, first, last)
		}
	}
}

func TestCalendarRangeRejectsImpossibleDates(t *testing.T) {
	for _, pair := range [][2]string{{"2026-02-30", "2026-03-01"}, {"2026-10-10", "2026-10-01"}, {"2026-01-01", "2026-12-31"}} {
		if _, err := CalendarRange(pair[0], pair[1]); err == nil {
			t.Fatalf("accepted %v", pair)
		}
	}
	days, err := CalendarRange("2026-10-31", "2026-11-02")
	if err != nil || len(days) != 3 || days[1] != "2026-11-01" {
		t.Fatalf("range %v %v", days, err)
	}
}
