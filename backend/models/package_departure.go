package models

import "time"

const (
	PickupMeetingPoint = "MEETING_POINT"
	PickupFlexible     = "FLEXIBLE"
)

type PackageDeparture struct {
	Closed    bool   `json:"closed,omitempty"`
	Date      string `json:"date"`
	EndDate   string `json:"endDate"`
	QuotaUsed int    `json:"quotaUsed"`
	SeatsLeft int    `json:"seatsLeft"`
}

func ClosedDepartureStatuses() []string {
	return []string{DepartureCancelled, DepartureRescheduleOffered, DepartureResolved}
}

// Legacy packages keep their single departure until edited by the provider.
func (p *Package) OpenTripDates() []string {
	if !IsOpenTrip(p.TripType) {
		return nil
	}
	if len(p.DepartureDates) > 0 {
		return p.DepartureDates
	}
	if p.StartDate != "" {
		return []string{p.StartDate}
	}
	return nil
}

func (p *Package) DepartureEnd(day string) string {
	date, err := time.Parse("2006-01-02", day)
	if err != nil {
		return ""
	}
	duration := p.Duration
	if duration < 1 {
		duration = 1
	}
	return date.AddDate(0, 0, duration-1).Format("2006-01-02")
}
