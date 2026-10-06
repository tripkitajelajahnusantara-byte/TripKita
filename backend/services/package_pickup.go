package services

import (
	"strings"
	"tripkita-provider/models"
)

func validatePackagePickup(pkg *models.Package) error {
	if pkg.PickupMode == "" {
		pkg.PickupMode = models.PickupMeetingPoint
	}
	if pkg.PickupMode != models.PickupMeetingPoint && pkg.PickupMode != models.PickupFlexible {
		return packageValidationErrorf("mode penjemputan tidak valid")
	}
	pkg.PickupArea, pkg.PickupNotes = strings.TrimSpace(pkg.PickupArea), strings.TrimSpace(pkg.PickupNotes)
	if len([]rune(pkg.PickupArea)) > 500 || len([]rune(pkg.PickupNotes)) > 1000 || len(pkg.PickupPoints) > 30 {
		return packageValidationErrorf("area, catatan, atau jumlah titik jemput melebihi batas")
	}
	seen := map[string]bool{}
	points := []string{}
	for _, raw := range pkg.PickupPoints {
		point := strings.TrimSpace(raw)
		if len([]rune(point)) < 5 || len([]rune(point)) > 255 {
			return packageValidationErrorf("nama titik jemput wajib diisi 5–255 karakter")
		}
		key := strings.ToLower(point)
		if !seen[key] {
			points = append(points, point)
			seen[key] = true
		}
	}
	pkg.PickupPoints = points
	if pkg.PickupMode == models.PickupFlexible {
		if pkg.PickupArea == "" {
			return packageValidationErrorf("area atau rute penjemputan wajib diisi untuk penjemputan fleksibel")
		}
		// Coordinates belong only to a fixed meeting point, never to an area.
		pkg.MeetingPoint, pkg.MeetingPointLat, pkg.MeetingPointLng = "", nil, nil
		return nil
	}
	if pkg.Status == "Aktif" && strings.TrimSpace(pkg.MeetingPoint) == "" {
		return packageValidationErrorf("titik kumpul wajib diisi sebelum paket diaktifkan")
	}
	return validateMeetingPointCoordinates(pkg.MeetingPointLat, pkg.MeetingPointLng, pkg.Status == "Aktif")
}

func snapshotBookingPickup(booking *models.Booking, pkg *models.Package) error {
	booking.PickupMode = models.PickupMeetingPoint
	booking.PickupInstructions = pkg.MeetingPoint
	if pkg.PickupMode == models.PickupFlexible {
		booking.PickupMode = models.PickupFlexible
		booking.PickupInstructions = strings.TrimSpace(pkg.PickupArea + "\n" + pkg.PickupNotes)
		if len(booking.Participants) != booking.Guests {
			return &BookingInputError{Message: "lengkapi titik jemput setiap peserta melalui formulir pemesanan"}
		}
	}
	for i := range booking.Participants {
		p := &booking.Participants[i]
		if booking.PickupMode == models.PickupMeetingPoint {
			p.PickupPoint = pkg.MeetingPoint
			continue
		}
		p.PickupPoint = strings.TrimSpace(p.PickupPoint)
		if len([]rune(p.PickupPoint)) < 5 || len([]rune(p.PickupPoint)) > 500 {
			return &BookingInputError{Message: "titik jemput setiap peserta wajib diisi 5–500 karakter, sertakan alamat atau patokan yang jelas"}
		}
	}
	return nil
}
