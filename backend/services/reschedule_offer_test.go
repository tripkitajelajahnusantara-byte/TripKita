package services

import (
	"strings"
	"testing"
	"time"
	"unicode/utf8"

	"tripkita-provider/models"
)

func TestResolveProposedStartRulesForProviderReschedule(t *testing.T) {
	now := time.Date(2026, 10, 2, 10, 0, 0, 0, models.BookingLocation)
	departure := &models.TripDeparture{
		DepartureDay: "2026-10-14",
		DepartureAt:  time.Date(2026, 10, 14, 8, 0, 0, 0, models.BookingLocation).UTC(),
		Reason:       models.DepartureReasonProviderReschedule,
	}
	family := &models.Package{TripType: "Family", StartDate: "2026-10-02", EndDate: "2026-10-20"}

	got, err := resolveProposedStart(departure, family, "2026-10-21", now)
	if err != nil {
		t.Fatalf("tanggal setelah periode paket harus boleh dipilih mitra: %v", err)
	}
	if want := time.Date(2026, 10, 21, 8, 0, 0, 0, models.BookingLocation); !got.Equal(want) {
		t.Fatalf("jam keberangkatan semula harus dipertahankan, got %v want %v", got, want)
	}

	for raw, wantMessage := range map[string]string{
		"":           "wajib diisi",
		"14-10-2026": "format tanggal",
		"2026-10-14": "berbeda dari tanggal keberangkatan semula",
		// 4 Okt 08:00 WIB < 2 Okt 10:00 + 48 jam, sehingga paling cepat 5 Oktober.
		"2026-10-04": "paling cepat 5 Oktober 2026",
		"2027-02-01": "paling lambat 2 Januari 2027",
	} {
		if _, err := resolveProposedStart(departure, family, raw, now); err == nil || !strings.Contains(err.Error(), wantMessage) {
			t.Errorf("tanggal %q: want error berisi %q, got %v", raw, wantMessage, err)
		}
	}

	// Open Trip tidak terikat kalender eksklusif tiga bulan.
	openTrip := &models.Package{TripType: "Open Trip"}
	if _, err := resolveProposedStart(departure, openTrip, "2027-02-01", now); err != nil {
		t.Fatalf("open trip tidak dibatasi kalender eksklusif: %v", err)
	}

	// Keputusan peninjauan kuota/cuaca tetap terikat periode operasional paket.
	review := *departure
	review.Reason = models.DepartureReasonWeatherForecast
	if _, err := resolveProposedStart(&review, family, "2026-10-21", now); err == nil || !strings.Contains(err.Error(), "periode operasional") {
		t.Fatalf("peninjauan cuaca harus mengikuti periode paket, got %v", err)
	}
}

func TestResponseDeadlineNeverPassesReplacementStart(t *testing.T) {
	now := time.Date(2026, 10, 2, 10, 0, 0, 0, models.BookingLocation)
	original := now.AddDate(0, 0, 30)
	earlier := now.AddDate(0, 0, 5)
	if got := models.ResponseDeadlineFor(original, earlier, now); !got.Equal(earlier) {
		t.Fatalf("batas jawaban tidak boleh melewati jadwal pengganti yang lebih awal, got %v", got)
	}
	later := now.AddDate(0, 0, 40)
	if got := models.ResponseDeadlineFor(original, later, now); !got.Equal(original) {
		t.Fatalf("batas jawaban mengikuti jadwal semula bila pengganti lebih lambat, got %v", got)
	}
	// Pembatalan pada hari-H tetap memberi minimal 2x24 jam.
	if got := models.ResponseDeadlineFor(now.Add(time.Hour), later, now); !got.Equal(now.Add(models.MinimumResponseWindow)) {
		t.Fatalf("batas jawaban minimal 48 jam, got %v", got)
	}
}

func TestProposedTripRangeKeepsDuration(t *testing.T) {
	start := time.Date(2026, 10, 14, 8, 0, 0, 0, models.BookingLocation)
	booking := models.Booking{TripDate: start, TripEndDate: start.Add(63*time.Hour + 59*time.Minute)}
	proposed := start.AddDate(0, 0, 7)
	from, to := proposedTripRange(booking, proposed)
	if !from.Equal(proposed) || to.Sub(from) != booking.TripEndDate.Sub(booking.TripDate) {
		t.Fatalf("durasi trip pengganti harus sama, got %v - %v", from, to)
	}
}

func TestTruncateTextKeepsValidUTF8(t *testing.T) {
	got := truncateText("Cuaca ekstrem 🌧️ di jalur pendakian", 16)
	if !utf8.ValidString(got) || len(got) > 16 {
		t.Fatalf("hasil potong harus UTF-8 valid dan <= 16 byte, got %q", got)
	}
}
