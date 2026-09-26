package services

import (
	"gorm.io/gorm"

	"tripkita-provider/config"
	"tripkita-provider/repositories"
)

// Container menyatukan pembuatan seluruh service aplikasi agar router HTTP dan
// job latar belakang memakai instance yang sama, bukan membangun dependensinya
// masing-masing.
type Container struct {
	ProviderRepo    repositories.ProviderRepository
	PackageRepo     repositories.PackageRepository
	BookingRepo     repositories.BookingRepository
	PayoutRepo      repositories.PayoutRepository
	ReviewRepo      repositories.ReviewRepository
	DepartureRepo   repositories.DepartureRepository
	PackageDateRepo repositories.PackageDateRepository
	TripPlanRepo    repositories.TripPlanRepository

	PDFService       *PDFService
	EmailService     *EmailService
	ExcelService     *ExcelService
	NotifService     *NotificationService
	AuthService      AuthService
	AdminService     AdminService
	PackageService   PackageService
	IPaymuService    IPaymuService
	BookingService   BookingService
	DashService      DashboardService
	PayoutService    PayoutService
	ReviewService    ReviewService
	DepartureService DepartureService
	TripPlanService  TripPlanService
}

func NewContainer(db *gorm.DB, cfg *config.Config) *Container {
	providerRepo := repositories.NewProviderRepository(db)
	packageRepo := repositories.NewPackageRepository(db)
	bookingRepo := repositories.NewBookingRepository(db)
	payoutRepo := repositories.NewPayoutRepository(db)
	reviewRepo := repositories.NewReviewRepository(db)
	departureRepo := repositories.NewDepartureRepository(db)
	packageDateRepo := repositories.NewPackageDateRepository(db)
	tripPlanRepo := repositories.NewTripPlanRepository(db)

	pdfService := NewPDFService()
	emailService := NewEmailService(cfg, pdfService)
	excelService := NewExcelService()
	notifService := NewNotificationService(db)
	ipaymuService := NewIPaymuService(cfg)

	bookingService := NewBookingService(bookingRepo, packageRepo, ipaymuService, emailService, notifService)

	return &Container{
		ProviderRepo:    providerRepo,
		PackageRepo:     packageRepo,
		BookingRepo:     bookingRepo,
		PayoutRepo:      payoutRepo,
		ReviewRepo:      reviewRepo,
		DepartureRepo:   departureRepo,
		PackageDateRepo: packageDateRepo,
		TripPlanRepo:    tripPlanRepo,

		PDFService:       pdfService,
		EmailService:     emailService,
		ExcelService:     excelService,
		NotifService:     notifService,
		IPaymuService:    ipaymuService,
		AuthService:      NewAuthService(db, providerRepo, cfg, emailService, notifService),
		AdminService:     NewAdminService(db, providerRepo, notifService),
		PackageService:   NewPackageService(packageRepo, providerRepo, packageDateRepo),
		BookingService:   bookingService,
		DashService:      NewDashboardService(packageRepo, bookingRepo, providerRepo, reviewRepo),
		PayoutService:    NewPayoutService(payoutRepo, providerRepo, bookingRepo, emailService, notifService, ipaymuService, cfg),
		ReviewService:    NewReviewService(reviewRepo, bookingRepo, packageRepo),
		DepartureService: NewDepartureService(db, departureRepo, providerRepo, bookingService, notifService, emailService),
		TripPlanService:  NewTripPlanService(tripPlanRepo, providerRepo, notifService, emailService),
	}
}
