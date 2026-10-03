package services

import (
	"strings"

	"gorm.io/gorm"
	"tripkita-provider/models"
)

func (s *adminService) MonitorBookings(filter models.AdminBookingFilter) (*models.AdminBookingMonitor, error) {
	if filter.ProviderID != 0 {
		var provider models.Provider
		if err := s.db.Select("id").Where("id = ? AND role = ?", filter.ProviderID, "PROVIDER").First(&provider).Error; err != nil {
			return nil, err
		}
	}
	result := &models.AdminBookingMonitor{
		Items: []models.AdminBookingItem{}, Page: filter.Page, PageSize: filter.PageSize,
		Summary: models.AdminBookingSummary{ByStatus: map[string]int64{}},
	}
	// Fresh builders keep the status filter and pagination out of the summary.
	scope := func() *gorm.DB {
		query := s.db.Table("bookings AS b").
			Joins("LEFT JOIN providers AS p ON p.id = b.provider_id").
			Joins("LEFT JOIN packages AS pkg ON pkg.id = b.package_id")
		if filter.ProviderID != 0 {
			query = query.Where("b.provider_id = ?", filter.ProviderID)
		}
		if search := strings.TrimSpace(filter.Search); search != "" {
			// Treat LIKE wildcards as literal search text.
			search = "%" + strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(search) + "%"
			query = query.Where("(b.booking_code ILIKE ? OR b.customer_name ILIKE ? OR p.business_name ILIKE ? OR pkg.name ILIKE ?)", search, search, search, search)
		}
		return query
	}
	var counts []struct {
		Status string
		Count  int64
	}
	if err := scope().Select("b.status, COUNT(*) AS count").Group("b.status").Scan(&counts).Error; err != nil {
		return nil, err
	}
	for _, count := range counts {
		result.Summary.Total += count.Count
		result.Summary.ByStatus[count.Status] = count.Count
	}
	result.Total = result.Summary.Total
	query := scope()
	if filter.Status != "" {
		query = query.Where("b.status = ?", filter.Status)
		result.Total = result.Summary.ByStatus[filter.Status]
	}
	err := query.Select(`b.id, b.booking_code, b.provider_id, COALESCE(p.business_name, '') AS provider_name,
		COALESCE(pkg.name, '') AS package_name, b.customer_name, b.status,
		b.trip_date, b.guests, b.total_price, b.created_at`).
		Order("b.created_at DESC, b.id DESC").Limit(filter.PageSize).Offset((filter.Page - 1) * filter.PageSize).
		Scan(&result.Items).Error
	return result, err
}
