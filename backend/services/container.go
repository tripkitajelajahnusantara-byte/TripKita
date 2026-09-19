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
	ProviderRepo repositories.ProviderRepository
	PackageRepo  repositories.PackageRepository
	BookingRepo  repositories.BookingRepository
	PayoutRepo   repositories.PayoutRepository
	ReviewRepo   repositories.ReviewRepository

	PDFService     *PDFService
	EmailService   *EmailService
	ExcelService   *ExcelService
	NotifService   *NotificationService
	AuthService    AuthService
	AdminService   AdminService
	PackageService PackageService
	XenditService  XenditService
	BookingService BookingService
	DashService    DashboardService
	PayoutService  PayoutService
	ReviewService  ReviewService
}

func NewContainer(db *gorm.DB, cfg *config.Config) *Container {
	providerRepo := repositories.NewProviderRepository(db)
	packageRepo := repositories.NewPackageRepository(db)
	bookingRepo := repositories.NewBookingRepository(db)
	payoutRepo := repositories.NewPayoutRepository(db)
	reviewRepo := repositories.NewReviewRepository(db)

	pdfService := NewPDFService()
	emailService := NewEmailService(cfg, pdfService)
	excelService := NewExcelService()
	notifService := NewNotificationService(db)
	xenditService := NewXenditService(cfg)

	return &Container{
		ProviderRepo: providerRepo,
		PackageRepo:  packageRepo,
		BookingRepo:  bookingRepo,
		PayoutRepo:   payoutRepo,
		ReviewRepo:   reviewRepo,

		PDFService:     pdfService,
		EmailService:   emailService,
		ExcelService:   excelService,
		NotifService:   notifService,
		XenditService:  xenditService,
		AuthService:    NewAuthService(db, providerRepo, cfg, emailService, notifService),
		AdminService:   NewAdminService(db, providerRepo, notifService),
		PackageService: NewPackageService(packageRepo, providerRepo),
		BookingService: NewBookingService(bookingRepo, packageRepo, xenditService, emailService, notifService),
		DashService:    NewDashboardService(packageRepo, bookingRepo, providerRepo, reviewRepo),
		PayoutService:  NewPayoutService(payoutRepo, providerRepo, bookingRepo, emailService, notifService, xenditService, cfg),
		ReviewService:  NewReviewService(reviewRepo, bookingRepo, packageRepo),
	}
}
