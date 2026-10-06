package controllers

import (
	"encoding/json"
	"strings"
	"testing"

	"tripkita-provider/models"
)

func TestGuestTrackingDoesNotExposePickupAddresses(t *testing.T) {
	b := &models.Booking{
		BookingCode: "TK-TEST", PickupMode: models.PickupFlexible,
		PickupInstructions: "Private route instructions",
		Participants:       []models.BookingParticipant{{Name: "Private participant", PickupPoint: "Private home address"}},
	}
	encoded, err := json.Marshal(guestBookingView(b))
	if err != nil {
		t.Fatal(err)
	}
	for _, private := range []string{"pickupPoint", "pickupInstructions", "participants", "Private"} {
		if strings.Contains(string(encoded), private) {
			t.Fatalf("guest response exposed %s", private)
		}
	}
}
