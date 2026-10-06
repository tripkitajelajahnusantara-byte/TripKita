package services

import (
	"fmt"
	"strings"
	"time"

	"tripkita-provider/models"
)

// DuplicatePackage copies the trip definition only. Bookings, occupied quota,
// reviews and lifecycle metadata belong to the original package.
func (s *packageService) DuplicatePackage(id uint, providerID uint) (*models.Package, error) {
	source, err := s.repo.FindByIDAndProvider(id, providerID)
	if err != nil {
		return nil, err
	}

	name := []rune(strings.TrimSpace(source.Name))
	const suffix = " (Salinan)"
	if len(name) > 255-len([]rune(suffix)) {
		name = name[:255-len([]rune(suffix))]
	}
	pkg := &models.Package{
		PickupMode: source.PickupMode, PickupArea: source.PickupArea, PickupNotes: source.PickupNotes,
		PickupPoints: append([]string(nil), source.PickupPoints...), DepartureDates: append([]string(nil), source.DepartureDates...),
		ProviderID:         providerID,
		Name:               string(name) + suffix,
		Destination:        source.Destination,
		MeetingPoint:       source.MeetingPoint,
		MeetingPointLat:    source.MeetingPointLat,
		MeetingPointLng:    source.MeetingPointLng,
		Category:           source.Category,
		TripType:           source.TripType,
		Price:              source.Price,
		QuotaMin:           quotaMinimumForTripType(source.TripType, source.QuotaMin),
		QuotaMax:           source.QuotaMax,
		StartDate:          source.StartDate,
		EndDate:            source.EndDate,
		Schedule:           source.Schedule,
		Duration:           source.Duration,
		MinGuests:          source.MinGuests,
		MaxGuests:          source.MaxGuests,
		MinAge:             source.MinAge,
		MaxAge:             source.MaxAge,
		Status:             "Draft",
		Description:        source.Description,
		IncludedFacilities: source.IncludedFacilities,
		ExcludedFacilities: source.ExcludedFacilities,
		Itinerary:          source.Itinerary,
		Image:              source.Image,
		Images:             source.Images,
	}
	pkg.NormalizeBookingLimits()
	if !models.IsOpenTrip(pkg.TripType) {
		if s.dateRepo == nil {
			return nil, fmt.Errorf("penyimpanan tanggal paket tidak tersedia")
		}
		rows, err := s.dateRepo.ListByPackage(source.ID)
		if err != nil {
			return nil, err
		}
		today, latest := models.AvailabilityWindow(time.Now())
		pkg.AvailableDates = []string{}
		for _, row := range rows {
			// Copy configured future days as new OPEN rows. Booking locks are
			// still derived across the provider's packages during reads/checkout.
			if row.Origin == models.PackageDateOriginProvider && row.Date >= today && row.Date <= latest && row.Date >= pkg.StartDate && row.Date <= pkg.EndDate {
				if _, err := time.Parse("2006-01-02", row.Date); err == nil {
					pkg.AvailableDates = append(pkg.AvailableDates, row.Date)
				}
			}
		}
	}
	// Drafts may have an old schedule or legacy fields. The normal edit/publish
	// flow validates them when the provider finishes adapting this copy.
	if err := s.repo.Create(pkg); err != nil {
		return nil, err
	}
	return pkg, nil
}
