package services

import (
	"reflect"
	"strings"
	"testing"
	"time"
	"tripkita-provider/models"
)

func TestFlexiblePickupNeedsAreaButNotMapPin(t *testing.T) {
	pkg := validActivePackage()
	pkg.PickupMode = models.PickupFlexible
	pkg.PickupArea = " Jabodetabek, searah Dieng "
	pkg.PickupPoints = []string{"Jakarta, RS UKI", " Jakarta, RS UKI ", "Bekasi, Exit Tol Barat"}
	if err := validatePackagePickup(pkg); err != nil {
		t.Fatal(err)
	}
	if pkg.MeetingPoint != "" || pkg.MeetingPointLat != nil || pkg.MeetingPointLng != nil || len(pkg.PickupPoints) != 2 {
		t.Fatalf("stale map or duplicate points: %+v", pkg)
	}
	pkg.PickupArea = " "
	if err := validatePackagePickup(pkg); err == nil {
		t.Fatal("missing service area accepted")
	}
	pkg.PickupMode = models.PickupMeetingPoint
	if err := validatePackagePickup(pkg); err == nil {
		t.Fatal("fixed meeting point without pin accepted")
	}
}

func TestPickupSnapshotSupportsDifferentParticipantsAndLegacyFixedPoint(t *testing.T) {
	pkg := &models.Package{PickupMode: models.PickupFlexible, PickupArea: "Jabodetabek", PickupNotes: "Searah rute"}
	b := &models.Booking{Guests: 2, Participants: []models.BookingParticipant{{PickupPoint: " Jakarta, RS UKI "}, {PickupPoint: "Bekasi, Exit Tol Barat"}}}
	if err := snapshotBookingPickup(b, pkg); err != nil {
		t.Fatal(err)
	}
	pkg.PickupArea = "Area berubah"
	if b.Participants[0].PickupPoint != "Jakarta, RS UKI" || !strings.Contains(b.PickupInstructions, "Jabodetabek") {
		t.Fatal("snapshot did not preserve booking agreement")
	}
	b.Participants[1].PickupPoint = " "
	if err := snapshotBookingPickup(b, pkg); err == nil {
		t.Fatal("missing participant pickup accepted")
	}
	b.Participants = nil
	if err := snapshotBookingPickup(b, pkg); err == nil {
		t.Fatal("old client bypassed flexible pickup")
	}
	pkg.PickupMode, pkg.MeetingPoint = "", "Stasiun Senen"
	if err := snapshotBookingPickup(b, pkg); err != nil {
		t.Fatalf("legacy fixed booking rejected: %v", err)
	}
}

func TestOpenTripDatesAcrossThreeMonths(t *testing.T) {
	now := time.Date(2026, 10, 6, 12, 0, 0, 0, models.BookingLocation)
	pkg := &models.Package{TripType: "Open Trip", Duration: 3}
	dates := []string{"2026-12-25", "2026-10-09", "2026-11-06", "2026-10-09"}
	if err := configureOpenTripDates(pkg, dates, nil, now); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(pkg.DepartureDates, []string{"2026-10-09", "2026-11-06", "2026-12-25"}) || pkg.StartDate != "2026-10-09" || pkg.EndDate != "2026-12-27" {
		t.Fatalf("incorrect dates: %+v", pkg)
	}
	for _, invalid := range [][]string{nil, {"2026-10-05"}, {"2027-01-07"}, {"2026-02-30"}} {
		if err := configureOpenTripDates(pkg, invalid, nil, now); err == nil {
			t.Fatalf("invalid dates accepted: %v", invalid)
		}
	}
	for _, tc := range []struct {
		day string
		ok  bool
	}{{"2026-10-09", true}, {"2026-10-10", false}, {"2026-11-06", true}, {"2026-12-25", true}} {
		day, _ := time.ParseInLocation("2006-01-02", tc.day, models.BookingLocation)
		if err := validateBookingSchedule(pkg, day, calculatePackageTripEnd(pkg, day), now, false); (err == nil) != tc.ok {
			t.Fatalf("%s: %v", tc.day, err)
		}
	}
	if got := filterCurrentPublicPackages([]models.Package{{Status: "Aktif", TripType: "Open Trip", StartDate: "2026-10-01", EndDate: "2026-12-27", DepartureDates: []string{"2026-10-01", "2026-12-25"}}}, "2026-11-01"); len(got) != 1 {
		t.Fatal("future departure hidden after first departure passed")
	}
}
