package models

import "time"

// PublicProviderProfile deliberately excludes email, phone, bank, legal, and
// document fields. It is the only provider shape exposed without authentication.
type PublicProviderProfile struct {
	ID                  uint      `json:"id"`
	BusinessName        string    `json:"businessName"`
	BusinessCategory    string    `json:"businessCategory"`
	OperationalProvince string    `json:"operationalProvince"`
	OperationalCity     string    `json:"operationalCity"`
	Description         string    `json:"description"`
	IsVerified          bool      `json:"isVerified"`
	Rating              float64   `json:"rating"`
	TotalTravelers      int64     `json:"totalTravelers"`
	CreatedAt           time.Time `json:"createdAt"`
}
