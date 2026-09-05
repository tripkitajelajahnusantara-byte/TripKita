package database

import (
	"fmt"
	"log"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"tripkita-provider/config"
	"tripkita-provider/models"
)

var DB *gorm.DB

func ConnectDB(cfg *config.Config) {
	var dsn string
	if cfg.DatabaseURL != "" {
		rawUrl := cfg.DatabaseURL
		// Auto encode '#' in password before @ to avoid URL parse errors
		if strings.Contains(rawUrl, "#") && strings.Contains(rawUrl, "@") {
			parts := strings.SplitN(rawUrl, "@", 2)
			userInfo := strings.ReplaceAll(parts[0], "#", "%23")
			rawUrl = userInfo + "@" + parts[1]
		}
		dsn = rawUrl
	} else {
		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
			cfg.DBHost, cfg.DBUser, cfg.DBPass, cfg.DBName, cfg.DBPort, cfg.DBSSLMode)
	}

	var err error
	DB, err = gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Info),
		PrepareStmt: false,
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("Database connection established successfully")

	// Run Auto-Migrations
	err = DB.AutoMigrate(&models.Provider{}, &models.Package{}, &models.Booking{}, &models.ProviderStatusHistory{}, &models.Payout{})
	if err != nil {
		log.Printf("[Migration Notice] %v", err)
	} else {
		fmt.Println("Database migration completed")
	}

	// Seed DB if empty
	SeedDatabase()
}

func SeedDatabase() {
	var count int64
	todayStr := time.Now().Format("2006-01-02")
	months := []string{"Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"}
	now := time.Now()
	sched3 := fmt.Sprintf("%d %s %d - %d %s %d (3 Hari)", now.Day(), months[now.Month()-1], now.Year(), now.AddDate(0, 0, 2).Day(), months[now.AddDate(0, 0, 2).Month()-1], now.AddDate(0, 0, 2).Year())
	sched2 := fmt.Sprintf("%d %s %d - %d %s %d (2 Hari)", now.Day(), months[now.Month()-1], now.Year(), now.AddDate(0, 0, 1).Day(), months[now.AddDate(0, 0, 1).Month()-1], now.AddDate(0, 0, 1).Year())
	sched4 := fmt.Sprintf("%d %s %d - %d %s %d (4 Hari)", now.Day(), months[now.Month()-1], now.Year(), now.AddDate(0, 0, 3).Day(), months[now.AddDate(0, 0, 3).Month()-1], now.AddDate(0, 0, 3).Year())

	DB.Model(&models.Package{}).Count(&count)
	if count > 0 {
		DB.Model(&models.Package{}).Where("start_date = ? OR schedule LIKE ?", "2026-05-22", "%22 Mei 2026%").Updates(map[string]interface{}{
			"start_date": todayStr,
			"end_date":   todayStr,
			"schedule":   sched3,
		})
		fmt.Println("Database already seeded with packages, updated legacy date references.")
		return
	}

	fmt.Println("Seeding initial database data...")

	// 1. Seed Admin
	fmt.Println("Seeding default admin account...")
	hashedAdminPassword, _ := bcrypt.GenerateFromPassword([]byte("Admin123!"), bcrypt.DefaultCost)
	admin := models.Provider{
		BusinessName:        "TripKita Admin",
		BusinessCategory:     "admin",
		OperationalProvince: "DKI Jakarta",
		OperationalCity:     "Jakarta Central",
		Description:          "System Administrator",
		DocumentUploaded:    true,
		PicName:              "Admin",
		Email:                "admin@tripkita.id",
		PasswordHash:         string(hashedAdminPassword),
		WhatsApp:             "+62 800 0000 0000",
		IsVerified:           true,
		Role:                 "ADMIN",
		Status:               "APPROVED",
	}
	if err := DB.Create(&admin).Error; err != nil {
		log.Printf("Seeding admin failed: %v", err)
	}

	// 2. Seed Provider
	fmt.Println("Seeding initial provider...")
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("demo123"), bcrypt.DefaultCost)
	provider := models.Provider{
		BusinessName:        "Wisata Nusantara",
		BusinessCategory:     "tour",
		OperationalProvince: "DKI Jakarta",
		OperationalCity:     "Jakarta Pusat",
		Description:          "Wisata Nusantara adalah penyedia layanan tour terpercaya di Indonesia dengan pengalaman lebih dari 10 tahun.",
		DocumentUploaded:    true,
		DocumentPath:        "/uploads/siup.pdf",
		KtpPath:             "/uploads/ktp_pic.jpg",
		NibPath:             "/uploads/nib.pdf",
		NpwpPath:            "/uploads/npwp.pdf",
		AktaPath:            "/uploads/akta.pdf",
		Instagram:           "https://instagram.com/wisatanusantara",
		TikTok:              "https://tiktok.com/@wisatanusantara",
		PicName:             "Budi Santoso",
		Email:               "partner@wisatanusantara.id",
		PasswordHash:        string(hashedPassword),
		WhatsApp:            "+62 812 3456 7890",
		IsVerified:          true,
		Role:                "PROVIDER",
		Status:              "APPROVED",
		VerificationNotes:   "Berkas lengkap dan terverifikasi secara sistem.",
	}
	if err := DB.Create(&provider).Error; err != nil {
		log.Printf("Seeding provider failed: %v", err)
		return
	}

	// Seed status history for this provider
	history1 := models.ProviderStatusHistory{
		ProviderID: provider.ID,
		Status:     "PENDING",
		Notes:      "Pendaftaran akun baru via sistem.",
		CreatedAt:  time.Now().Add(-2 * time.Hour),
	}
	history2 := models.ProviderStatusHistory{
		ProviderID: provider.ID,
		Status:     "APPROVED",
		Notes:      "Dokumen lengkap dan disetujui oleh Administrator.",
		CreatedAt:  time.Now().Add(-1 * time.Hour),
	}
	DB.Create(&history1)
	DB.Create(&history2)

	// 3. Seed Packages (Exactly 8 data points requested)
	pkgs := []models.Package{
		{
			ProviderID:  provider.ID,
			Name:        "Open Trip Gunung Bromo",
			Destination: "Probolinggo, Jawa Timur",
			Category:    "Gunung",
			TripType:    "Open Trip",
			Price:       350000,
			QuotaMin:    5,
			QuotaUsed:   3,
			QuotaMax:    15,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched3,
			Status:      "Aktif",
			Rating:      4.8,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Open Trip Pulau Tidung",
			Destination: "Kepulauan Seribu, Jakarta",
			Category:    "Pantai",
			TripType:    "Open Trip",
			Price:       450000,
			QuotaMin:    4,
			QuotaUsed:   2,
			QuotaMax:    12,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched3,
			Status:      "Aktif",
			Rating:      4.7,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Trip Curug Cilember",
			Destination: "Bogor, Jawa Barat",
			Category:    "Curug",
			TripType:    "Open Trip",
			Price:       275000,
			QuotaMin:    5,
			QuotaUsed:   4,
			QuotaMax:    10,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched2,
			Status:      "Aktif",
			Rating:      4.6,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Bandung City Tour",
			Destination: "Bandung, Jawa Barat",
			Category:    "City Tour",
			TripType:    "Open Trip",
			Price:       200000,
			QuotaMin:    2,
			QuotaUsed:   0,
			QuotaMax:    10,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched2,
			Status:      "Aktif",
			Rating:      4.5,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Open Trip Ranu Kumbolo",
			Destination: "Malang, Jawa Timur",
			Category:    "Gunung",
			TripType:    "Open Trip",
			Price:       300000,
			QuotaMin:    5,
			QuotaUsed:   5,
			QuotaMax:    15,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched3,
			Status:      "Aktif",
			Rating:      4.7,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Wisata Budaya Suku Baduy",
			Destination: "Lebak, Banten",
			Category:    "Budaya",
			TripType:    "Open Trip",
			Price:       250000,
			QuotaMin:    4,
			QuotaUsed:   1,
			QuotaMax:    12,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched2,
			Status:      "Aktif",
			Rating:      4.8,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Wisata Pantai Tanjung Karang Palu",
			Destination: "Palu, Sulawesi Tengah",
			Category:    "Pantai",
			TripType:    "Open Trip",
			Price:       500000,
			QuotaMin:    4,
			QuotaUsed:   0,
			QuotaMax:    8,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched3,
			Status:      "Aktif",
			Rating:      4.9,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Yogyakarta City Tour",
			Destination: "Yogyakarta, DI Yogyakarta",
			Category:    "City Tour",
			TripType:    "Open Trip",
			Price:       220000,
			QuotaMin:    2,
			QuotaUsed:   1,
			QuotaMax:    20,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched2,
			Status:      "Aktif",
			Rating:      4.8,
		},
	}

	for i := range pkgs {
		if err := DB.Create(&pkgs[i]).Error; err != nil {
			log.Printf("Seeding package %s failed: %v", pkgs[i].Name, err)
		}
	}

	// 4. Seed Bookings
	bookingsList := []models.Booking{
		{
			BookingCode:     "TK-2824-1891",
			ProviderID:      provider.ID,
			PackageID:       pkgs[0].ID,
			CustomerName:    "Anisa Rahmawati",
			CustomerInitial: "AR",
			TripDate:        time.Now().AddDate(0, 0, 10),
			Guests:          2,
			TotalPrice:      700000,
			DPAmount:        140000,
			PaymentMethod:   "Manual Transfer",
			Status:          "CONFIRMED",
		},
		{
			BookingCode:     "TK-2824-1890",
			ProviderID:      provider.ID,
			PackageID:       pkgs[1].ID,
			CustomerName:    "Dimas Prasetyo",
			CustomerInitial: "DP",
			TripDate:        time.Now().AddDate(0, 0, 13),
			Guests:          4,
			TotalPrice:      1800000,
			DPAmount:        360000,
			PaymentMethod:   "Manual Transfer",
			Status:          "WAITING_CONFIRMATION",
			PaymentProof:    "/uploads/bukti_dummy.png",
		},
		{
			BookingCode:     "TK-2824-1889",
			ProviderID:      provider.ID,
			PackageID:       pkgs[2].ID,
			CustomerName:    "Rika Susanti",
			CustomerInitial: "RS",
			TripDate:        time.Now().AddDate(0, 0, 15),
			Guests:          3,
			TotalPrice:      825000,
			DPAmount:        165000,
			PaymentMethod:   "Manual Transfer",
			Status:          "CONFIRMED",
		},
	}

	for i := range bookingsList {
		if err := DB.Create(&bookingsList[i]).Error; err != nil {
			log.Printf("Seeding booking failed: %v", err)
		}
	}

	fmt.Println("Initial data seeded successfully")
}
