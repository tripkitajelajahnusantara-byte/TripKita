package routes

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tripkita-provider/config"
	"tripkita-provider/controllers"
	"tripkita-provider/middleware"
	"tripkita-provider/repositories"
	"tripkita-provider/services"
)

func SetupRouter(db *gorm.DB, cfg *config.Config) *gin.Engine {
	r := gin.Default()

	// Apply CORS
	r.Use(middleware.CORSMiddleware())

	// Initialize Repositories
	providerRepo := repositories.NewProviderRepository(db)
	packageRepo := repositories.NewPackageRepository(db)
	bookingRepo := repositories.NewBookingRepository(db)
	payoutRepo := repositories.NewPayoutRepository(db)

	// Initialize Services
	authService := services.NewAuthService(providerRepo, cfg)
	adminService := services.NewAdminService(providerRepo)
	packageService := services.NewPackageService(packageRepo)
	xenditService := services.NewXenditService(cfg)
	bookingService := services.NewBookingService(bookingRepo, packageRepo, xenditService)
	dashboardService := services.NewDashboardService(packageRepo, bookingRepo, providerRepo)
	payoutService := services.NewPayoutService(payoutRepo, providerRepo, bookingRepo)

	// Initialize Controllers
	authCtrl := controllers.NewAuthController(authService, cfg)
	adminCtrl := controllers.NewAdminController(adminService)
	packageCtrl := controllers.NewPackageController(packageService)
	bookingCtrl := controllers.NewBookingController(bookingService, cfg)
	dashboardCtrl := controllers.NewDashboardController(dashboardService)
	uploadCtrl := controllers.NewUploadController()
	oauthCtrl := controllers.NewOAuthController(db, cfg)
	payoutCtrl := controllers.NewPayoutController(payoutService)

	// Serve Static Files for uploads
	r.Static("/uploads", "./uploads")

	// API Group
	apiV1 := r.Group("/api/v1")
	{
		// PUBLIC ROUTES (No Auth Required)
		public := apiV1.Group("/public")
		{
			// Packages public endpoint for mobile customers
			public.GET("/packages", packageCtrl.GetAllPublic)

			// Simulation & Webhook routes
			public.POST("/bookings", bookingCtrl.CreateSimulatedBooking)
			public.POST("/bookings/:id/upload-proof", bookingCtrl.UploadPaymentProof)
			public.PUT("/bookings/:id/status", bookingCtrl.PublicUpdateStatus)
			public.GET("/bookings/status/:code", bookingCtrl.GetPublicStatus)
			public.GET("/xendit-mock-checkout/:id", bookingCtrl.RenderMockCheckout)
			public.POST("/xendit-mock-checkout/:id/pay", bookingCtrl.ProcessMockPayment)
			public.POST("/webhooks/xendit", bookingCtrl.XenditWebhook)

			// Auth routes
			auth := public.Group("/auth")
			{
				auth.POST("/register", authCtrl.Register)
				auth.POST("/register-customer", authCtrl.RegisterCustomer)
				auth.POST("/login", authCtrl.Login)
				auth.GET("/config", authCtrl.GetAuthConfig)
				auth.POST("/upload", uploadCtrl.UploadDocument)
				auth.GET("/google", oauthCtrl.RedirectToGoogle)
				auth.GET("/google/callback", oauthCtrl.GoogleCallback)
			}
		}

		// AUTHENTICATED PROFILE ROUTES (Accessible by any authenticated user: CUSTOMER, PROVIDER, ADMIN)
		authProfile := apiV1.Group("/provider")
		authProfile.Use(middleware.AuthMiddleware(cfg))
		{
			authProfile.GET("/profile", authCtrl.GetProfile)
			authProfile.PUT("/profile", authCtrl.UpdateProfile)
		}

		// PROVIDER SPECIFIC ROUTES (Auth + Provider Role Required)
		provider := apiV1.Group("/provider")
		provider.Use(middleware.AuthMiddleware(cfg), middleware.ProviderRequired())
		{
			provider.POST("/upload", uploadCtrl.UploadDocument)

			// Packages
			packages := provider.Group("/packages")
			{
				packages.POST("", packageCtrl.Create)
				packages.GET("", packageCtrl.GetAll)
				packages.GET("/:id", packageCtrl.GetByID)
				packages.PUT("/:id", packageCtrl.Update)
				packages.DELETE("/:id", packageCtrl.Delete)
			}

			// Bookings
			bookings := provider.Group("/bookings")
			{
				bookings.GET("", bookingCtrl.GetAll)
				bookings.PUT("/:id/status", bookingCtrl.UpdateStatus)
			}

			// Payouts / Keuangan Mitra
			provider.GET("/payouts/summary", payoutCtrl.GetProviderPayoutSummary)
			provider.POST("/payouts/request", payoutCtrl.RequestPayout)

			// Dashboard Stats
			provider.GET("/dashboard/stats", dashboardCtrl.GetStats)
		}

		// ADMIN ROUTES (Auth + Admin Role Required)
		admin := apiV1.Group("/admin")
		admin.Use(middleware.AuthMiddleware(cfg), middleware.AdminRequired())
		{
			admin.GET("/providers", adminCtrl.ListProviders)
			admin.PUT("/providers/:id/status", adminCtrl.UpdateProviderStatus)
			admin.DELETE("/providers/:id", adminCtrl.DeleteProvider)
			admin.GET("/providers/:id/history", adminCtrl.GetStatusHistory)
			admin.POST("/providers/:id/verify-legal", adminCtrl.VerifyProviderLegal)
			admin.POST("/providers/:id/verify-document", adminCtrl.VerifyProviderDocument)
			admin.GET("/refunds", bookingCtrl.GetRefunds)
			admin.POST("/refunds/:id/complete", bookingCtrl.CompleteRefund)
			admin.GET("/bookings", bookingCtrl.AdminListBookings)
			admin.PUT("/bookings/:id/confirm-payment", bookingCtrl.AdminConfirmPayment)

			// Admin Payout management
			admin.GET("/payouts", payoutCtrl.AdminGetAllPayouts)
			admin.PUT("/payouts/:id/process", payoutCtrl.AdminProcessPayout)
		}

		// CUSTOMER ROUTES (Auth + Customer Role Required)
		customer := apiV1.Group("/customer")
		customer.Use(middleware.AuthMiddleware(cfg), middleware.CustomerRequired())
		{
			customer.GET("/bookings", bookingCtrl.GetCustomerBookings)
		}
	}

	return r
}
