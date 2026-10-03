package services

import (
	"testing"
	"tripkita-provider/models"
)

func TestPackageItineraryAllowsEditedOrderAndLegacyTimeLabels(t *testing.T) {
	for _, value := range []string{"", "[]", `[{"day":1,"activities":[]}]`, `[{"day":2,"activities":[{"time":"10.00 - 12.00 WIB","title":"Kegiatan dipindah"},{"time":"Pagi","title":"Judul diedit"}]}]`} {
		if err := validatePackageItinerary(value); err != nil {
			t.Fatalf("valid itinerary %s: %v", value, err)
		}
	}
}

func TestPackageItineraryRejectsIncompleteEdits(t *testing.T) {
	for _, value := range []string{"broken", "null", `{}`, `[{"day":0}]`, `[{"day":1}]`, `[{"day":1,"activities":null}]`, `[{"day":1,"activities":[]},{"day":1,"activities":[]}]`, `[{"day":1,"activities":[{"time":" ","title":"Judul"}]}]`, `[{"day":1,"activities":[{"time":"10:00","title":" "}]}]`, `[{"day":1,"activities":[{"time":123,"title":"Judul"}]}]`} {
		if err := validatePackageItinerary(value); err == nil {
			t.Fatalf("invalid itinerary accepted: %s", value)
		}
	}
	// Both save paths must reject invalid edits before attempting persistence.
	s := &packageService{}
	if _, err := s.CreatePackage(1, &models.CreatePackageRequest{Itinerary: "broken"}); err == nil {
		t.Fatal("create accepted incomplete itinerary")
	}
	if _, err := s.UpdatePackage(1, 1, &models.UpdatePackageRequest{Itinerary: "broken"}); err == nil {
		t.Fatal("update accepted incomplete itinerary")
	}
}
