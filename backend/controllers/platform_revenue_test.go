package controllers

import (
	"testing"
	"time"

	"tripkita-provider/models"
)

func TestParseRevenuePeriodIsInclusiveWIB(t *testing.T) {
	from, to, err := parseRevenuePeriod("2026-09-01", "2026-09-30")
	if err != nil {
		t.Fatal(err)
	}
	if !from.Equal(time.Date(2026, 9, 1, 0, 0, 0, 0, models.BookingLocation)) || !to.Equal(time.Date(2026, 10, 1, 0, 0, 0, 0, models.BookingLocation)) {
		t.Fatalf("periode harus 1 Sep 00:00 WIB s/d sebelum 1 Okt 00:00 WIB, got %v - %v", from, to)
	}
	if from, to, err := parseRevenuePeriod("", ""); err != nil || !from.IsZero() || !to.IsZero() {
		t.Fatalf("tanpa periode berarti seluruh data, got %v %v %v", from, to, err)
	}
	for _, tc := range [][2]string{{"2026-10-02", "2026-10-01"}, {"01-09-2026", ""}, {"", "2026/09/30"}} {
		if _, _, err := parseRevenuePeriod(tc[0], tc[1]); err == nil {
			t.Fatalf("periode %v harus ditolak", tc)
		}
	}
}
