package services

import (
	"tripkita-provider/repositories"
)

type DashboardStats struct {
	TotalPackages     int64   `json:"totalPackages"`
	TotalBookings     int64   `json:"totalBookings"`
	PendingBookings   int64   `json:"pendingBookings"`
	CompletedBookings int64   `json:"completedBookings"`
	TotalRevenue      int64   `json:"totalRevenue"`
	Rating            float64 `json:"rating"`
	ActivePackages    int64   `json:"activePackages"`
}

type DashboardService interface {
	GetStats(providerID uint) (*DashboardStats, error)
}

type dashboardService struct {
	packageRepo  repositories.PackageRepository
	bookingRepo  repositories.BookingRepository
	providerRepo repositories.ProviderRepository
}

func NewDashboardService(
	packageRepo repositories.PackageRepository,
	bookingRepo repositories.BookingRepository,
	providerRepo repositories.ProviderRepository,
) DashboardService {
	return &dashboardService{
		packageRepo:  packageRepo,
		bookingRepo:  bookingRepo,
		providerRepo: providerRepo,
	}
}

func (s *dashboardService) GetStats(providerID uint) (*DashboardStats, error) {
	totalPackages, err := s.packageRepo.CountByProvider(providerID)
	if err != nil {
		return nil, err
	}

	activePackages, err := s.packageRepo.CountActiveByProvider(providerID)
	if err != nil {
		return nil, err
	}

	totalBookings, err := s.bookingRepo.CountByProvider(providerID)
	if err != nil {
		return nil, err
	}

	pendingBookings, err := s.bookingRepo.CountByStatusAndProvider("PAID", providerID)
	if err != nil {
		return nil, err
	}

	completedBookings, err := s.bookingRepo.CountByStatusAndProvider("COMPLETED", providerID)
	if err != nil {
		return nil, err
	}

	totalRevenue, err := s.bookingRepo.SumRevenueByProvider(providerID)
	if err != nil {
		return nil, err
	}

	provider, err := s.providerRepo.FindByID(providerID)
	var rating float64 = 0
	if err == nil && provider.IsVerified {
		packages, _ := s.packageRepo.FindAllByProvider(providerID)
		if len(packages) > 0 {
			var total float64
			var count int
			for _, p := range packages {
				if p.Rating > 0 {
					total += p.Rating
					count++
				}
			}
			if count > 0 {
				rating = total / float64(count)
			}
		}
	}

	return &DashboardStats{
		TotalPackages:     totalPackages,
		TotalBookings:     totalBookings,
		PendingBookings:   pendingBookings,
		CompletedBookings: completedBookings,
		TotalRevenue:      totalRevenue,
		Rating:            rating,
		ActivePackages:    activePackages,
	}, nil
}
