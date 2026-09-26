package routes

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tripkita-provider/config"
	"tripkita-provider/controllers"
	"tripkita-provider/middleware"
	"tripkita-provider/services"
)

func SetupRouter(db *gorm.DB, cfg *config.Config, c *services.Container) *gin.Engine {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(middleware.RequestID(), middleware.AccessLogger(), middleware.SafeRecovery())
	if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		panic("TRUSTED_PROXIES tidak valid: " + err.Error())
	}

	// Apply CORS
	r.Use(middleware.SecurityHeaders(), middleware.CORSMiddleware(cfg), middleware.RequestSizeLimit(10*1024*1024))
	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/readyz", func(c *gin.Context) {
		// Probe dibatasi waktu agar database yang menggantung tidak menahan
		// worker health check sampai server timeout.
		ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
		defer cancel()
		sqlDB, err := db.DB()
		if err != nil || sqlDB.PingContext(ctx) != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	// Seluruh service dibangun sekali di services.Container agar router HTTP dan
	// job latar belakang berbagi instance yang sama.
	authCtrl := controllers.NewAuthController(c.AuthService, cfg)
	adminCtrl := controllers.NewAdminController(c.AdminService)
	packageCtrl := controllers.NewPackageController(c.PackageService)
	bookingCtrl := controllers.NewBookingController(c.BookingService, cfg)
	dashboardCtrl := controllers.NewDashboardController(c.DashService)
	uploadCtrl := controllers.NewUploadController(db)
	oauthCtrl := controllers.NewOAuthController(db, cfg)
	payoutCtrl := controllers.NewPayoutController(c.PayoutService, c.ExcelService, c.PDFService, c.ProviderRepo, c.BookingRepo, c.PayoutRepo, cfg)
	reviewCtrl := controllers.NewReviewController(c.ReviewService)
	notifCtrl := controllers.NewNotificationController(c.NotifService)
	departureCtrl := controllers.NewDepartureController(c.DepartureService)

	// Dokumen verifikasi tidak boleh menjadi file publik di production.
	if !cfg.IsProduction() {
		r.Static("/uploads", "./uploads")
	}

	// API Group
	apiV1 := r.Group("/api/v1")
	{
		// PUBLIC ROUTES (No Auth Required)
		public := apiV1.Group("/public")
		{
			// Packages public endpoint for mobile customers
			public.GET("/packages", packageCtrl.GetAllPublic)
			public.GET("/providers/:id", packageCtrl.GetPublicProviderProfile)
			public.GET("/checkout-config", bookingCtrl.GetCheckoutConfig)

			// Reviews public read endpoints
			public.GET("/reviews/package/:packageId", reviewCtrl.GetReviewsByPackage)
			public.GET("/reviews/booking/:bookingId", reviewCtrl.GetReviewByBooking)

			// Public checkout may be used by guests; authenticated customer identity is
			// derived from a valid token and never accepted from the request body.
			public.POST("/bookings", middleware.RateLimit(30, time.Minute), middleware.OptionalAuthMiddleware(db, cfg), bookingCtrl.CreateBooking)
			public.GET("/bookings/status/:code", middleware.RateLimit(30, time.Minute), middleware.OptionalAuthMiddleware(db, cfg), bookingCtrl.GetPublicStatus)
			public.POST("/webhooks/ipaymu", middleware.RateLimit(120, time.Minute), bookingCtrl.IPaymuWebhook)
			public.POST("/webhooks/ipaymu/payout", middleware.RateLimit(120, time.Minute), payoutCtrl.IPaymuPayoutWebhook)
			public.POST("/webhooks/xendit", middleware.RateLimit(120, time.Minute), bookingCtrl.IPaymuWebhook)

			if cfg.EnableDevMocks {
				public.GET("/xendit-mock-checkout/:id", bookingCtrl.RenderMockCheckout)
				public.POST("/xendit-mock-checkout/:id/pay", bookingCtrl.ProcessMockPayment)
			}

			// Auth routes
			auth := public.Group("/auth")
			auth.Use(middleware.RateLimit(20, time.Minute))
			{
				auth.POST("/register", middleware.RateLimit(5, time.Hour), authCtrl.Register)
				auth.POST("/register-customer", middleware.RateLimit(5, time.Hour), authCtrl.RegisterCustomer)
				auth.POST("/login", middleware.RateLimit(10, time.Minute), authCtrl.Login)
				auth.POST("/logout", middleware.AuthMiddleware(db, cfg), authCtrl.Logout)
				auth.GET("/config", authCtrl.GetAuthConfig)
				auth.POST("/upload", middleware.RateLimit(5, time.Hour), uploadCtrl.UploadDocument)
				auth.GET("/google", oauthCtrl.RedirectToGoogle)
				auth.GET("/google/callback", oauthCtrl.GoogleCallback)
				auth.POST("/google/exchange", oauthCtrl.ExchangeLoginCode)

				auth.POST("/provider/forgot-password", middleware.RateLimit(5, time.Hour), authCtrl.ProviderForgotPassword)
				auth.POST("/provider/reset-password", middleware.RateLimit(10, time.Hour), authCtrl.ProviderResetPassword)
			}
		}

		// AUTHENTICATED PROFILE & NOTIFICATION ROUTES (Accessible by logged in users)
		authProfile := apiV1.Group("/provider")
		authProfile.Use(middleware.AuthMiddleware(db, cfg))
		{
			authProfile.GET("/profile", authCtrl.GetProfile)
			authProfile.PUT("/profile", authCtrl.UpdateProfile)
			authProfile.POST("/upload", middleware.ProviderAccountRequired(), middleware.RateLimit(10, time.Hour), uploadCtrl.UploadDocument)
			authProfile.GET("/documents", middleware.ProviderAccountRequired(), uploadCtrl.GetProviderDocument)

			// Notification Center endpoints
			authProfile.GET("/notifications", notifCtrl.GetUserNotifications)
			authProfile.PUT("/notifications/read-all", notifCtrl.MarkAllAsRead)
			authProfile.PUT("/notifications/:id/read", notifCtrl.MarkAsRead)
		}

		// PROVIDER SPECIFIC ROUTES (Auth + Provider Role Required)
		provider := apiV1.Group("/provider")
		provider.Use(middleware.AuthMiddleware(db, cfg), middleware.ProviderRequired())
		{
			// Packages
			packages := provider.Group("/packages")
			{
				packages.POST("", packageCtrl.Create)
				packages.GET("", packageCtrl.GetAll)
				packages.GET("/:id", packageCtrl.GetByID)
				packages.PUT("/:id", packageCtrl.Update)
				packages.DELETE("/:id", packageCtrl.Delete)

				// Tanggal keberangkatan yang dibuka mitra untuk paket selain
				// Open Trip; pelanggan hanya dapat memilih dari daftar ini.
				packages.GET("/:id/dates", packageCtrl.GetPackageDates)
				packages.PUT("/:id/dates", packageCtrl.SetPackageDates)
			}

			// Bookings
			bookings := provider.Group("/bookings")
			{
				bookings.GET("", bookingCtrl.GetAll)
				bookings.PUT("/:id/status", bookingCtrl.UpdateStatus)
				bookings.PUT("/:id/reschedule", bookingCtrl.ProviderReschedule)
			}

			// Payouts / Keuangan Mitra
			provider.GET("/payouts/summary", payoutCtrl.GetProviderPayoutSummary)
			provider.POST("/payouts/request", payoutCtrl.RequestPayout)
			provider.GET("/payouts/export-excel", payoutCtrl.ExportExcel)
			provider.GET("/payouts/:id/pdf-receipt", payoutCtrl.GetPayoutPDFReceipt)

			// Dashboard Stats
			provider.GET("/dashboard/stats", dashboardCtrl.GetStats)

			// Ulasan yang diterima mitra
			provider.GET("/reviews", reviewCtrl.GetProviderReviews)

			// Keputusan atas keberangkatan bermasalah: kuota open trip kurang
			// pada H-3, maupun pembatalan force majeure oleh mitra.
			provider.GET("/departures", departureCtrl.GetProviderDepartures)
			provider.GET("/departures/upcoming", departureCtrl.GetUpcomingDepartures)
			provider.POST("/departures/force-majeure", departureCtrl.DeclareForceMajeure)
			provider.POST("/departures/:id/decision", departureCtrl.SubmitDecision)
		}

		// ADMIN ROUTES (Auth + Admin Role Required)
		admin := apiV1.Group("/admin")
		admin.Use(middleware.AuthMiddleware(db, cfg), middleware.AdminRequired())
		{
			admin.GET("/providers", adminCtrl.ListProviders)
			admin.GET("/documents", uploadCtrl.GetAdminDocument)
			admin.PUT("/providers/:id/status", adminCtrl.UpdateProviderStatus)
			admin.DELETE("/providers/:id", adminCtrl.DeleteProvider)
			admin.GET("/providers/:id/history", adminCtrl.GetStatusHistory)
			admin.POST("/providers/:id/verify-legal", adminCtrl.VerifyProviderLegal)
			admin.POST("/providers/:id/verify-document", adminCtrl.VerifyProviderDocument)
			admin.GET("/refunds", bookingCtrl.GetRefunds)
			admin.POST("/refunds/:id/complete", bookingCtrl.CompleteRefund)
			admin.GET("/bookings", bookingCtrl.AdminListBookings)

			// Admin Payout management
			admin.GET("/payouts", payoutCtrl.AdminGetAllPayouts)
			admin.PUT("/payouts/:id/process", payoutCtrl.AdminProcessPayout)
			admin.GET("/payouts/:id/pdf-receipt", payoutCtrl.GetPayoutPDFReceipt)
		}

		// CUSTOMER ROUTES (Auth + Customer Role Required)
		customer := apiV1.Group("/customer")
		customer.Use(middleware.AuthMiddleware(db, cfg), middleware.CustomerRequired())
		{
			customer.GET("/bookings", bookingCtrl.GetCustomerBookings)
			customer.PUT("/bookings/:id/cancel", bookingCtrl.CustomerCancelBooking)
			customer.POST("/bookings/:id/reschedule-response", departureCtrl.RespondToReschedule)
			customer.POST("/reviews", reviewCtrl.CreateReview)
			customer.GET("/notifications", notifCtrl.GetUserNotifications)
			customer.PUT("/notifications/read-all", notifCtrl.MarkAllAsRead)
			customer.PUT("/notifications/:id/read", notifCtrl.MarkAsRead)
		}
	}

	return r
}
