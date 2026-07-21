package database

import (
	"fmt"
	"log"
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
	// 1. Connect to default postgres database to check/create target database if not exists
	defaultDsn := fmt.Sprintf("host=%s user=%s password=%s dbname=postgres port=%s sslmode=%s",
		cfg.DBHost, cfg.DBUser, cfg.DBPass, cfg.DBPort, cfg.DBSSLMode)

	tempDB, err := gorm.Open(postgres.Open(defaultDsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Printf("Warning: Failed to connect to default postgres DB to check target database: %v. Will try connecting to target DB directly.", err)
	} else {
		var exists int
		tempDB.Raw("SELECT 1 FROM pg_database WHERE datname = ?", cfg.DBName).Scan(&exists)
		if exists != 1 {
			fmt.Printf("Database %s does not exist, creating...\n", cfg.DBName)
			err = tempDB.Exec(fmt.Sprintf("CREATE DATABASE %s", cfg.DBName)).Error
			if err != nil {
				log.Printf("Warning: Failed to create database %s: %v", cfg.DBName, err)
			} else {
				fmt.Printf("Database %s created successfully\n", cfg.DBName)
			}
		}
		sqlDB, err := tempDB.DB()
		if err == nil {
			sqlDB.Close()
		}
	}

	// 2. Connect to target database
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		cfg.DBHost, cfg.DBUser, cfg.DBPass, cfg.DBName, cfg.DBPort, cfg.DBSSLMode)

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("Database connection established successfully")

	// Run Auto-Migrations
	err = DB.AutoMigrate(&models.Provider{}, &models.Package{}, &models.Booking{}, &models.ProviderStatusHistory{})
	if err != nil {
		log.Fatalf("Database auto-migration failed: %v", err)
	}
	fmt.Println("Database migration completed")

	// Seed DB if empty
	SeedDatabase()
}

func SeedDatabase() {
	// 1. Seed Admin if not exists
	var adminCount int64
	DB.Model(&models.Provider{}).Where("role = ?", "ADMIN").Count(&adminCount)
	if adminCount == 0 {
		fmt.Println("Seeding default admin account...")
		hashedAdminPassword, _ := bcrypt.GenerateFromPassword([]byte("Admin123!"), bcrypt.DefaultCost)
		admin := models.Provider{
			BusinessName:        "TripKita Admin",
			BusinessCategory:     "admin",
			OperationalProvince: "DKI Jakarta",
			OperationalCity:     "Jakarta Central",
			Description:      "System Administrator",
			DocumentUploaded: true,
			PicName:          "Admin",
			Email:            "admin@tripkita.id",
			PasswordHash:     string(hashedAdminPassword),
			WhatsApp:         "+62 800 0000 0000",
			IsVerified:       true,
			Role:             "ADMIN",
			Status:           "APPROVED",
		}
		if err := DB.Create(&admin).Error; err != nil {
			log.Printf("Seeding admin failed: %v", err)
		}
	}

	// 2. Seed Provider if not exists
	var providerCount int64
	DB.Model(&models.Provider{}).Where("role = ?", "PROVIDER").Count(&providerCount)
	if providerCount > 0 {
		return
	}

	fmt.Println("No provider found, seeding initial provider and sample data...")

	// 1. Seed Provider
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("demo123"), bcrypt.DefaultCost)
	provider := models.Provider{
		BusinessName:        "Wisata Nusantara",
		BusinessCategory:     "tour",
		OperationalProvince: "Bali",
		OperationalCity:     "Denpasar",
		Description:       "Wisata Nusantara adalah penyedia layanan tour terpercaya di Indonesia dengan pengalaman lebih dari 10 tahun.",
		DocumentUploaded:  true,
		DocumentPath:      "/uploads/siup.pdf",
		KtpPath:           "/uploads/ktp_pic.jpg",
		NibPath:           "/uploads/nib.pdf",
		NpwpPath:          "/uploads/npwp.pdf",
		AktaPath:          "/uploads/akta.pdf",
		Instagram:         "https://instagram.com/wisatanusantara",
		TikTok:            "https://tiktok.com/@wisatanusantara",
		PicName:           "Budi Santoso",
		Email:             "partner@wisatanusantara.id",
		PasswordHash:      string(hashedPassword),
		WhatsApp:          "+62 812 3456 7890",
		IsVerified:        true,
		Role:              "PROVIDER",
		Status:            "APPROVED",
		VerificationNotes: "Berkas lengkap dan terverifikasi secara sistem.",
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

	// 2. Seed Packages
	pkgs := []models.Package{
		{
			ProviderID:  provider.ID,
			Name:        "Raja Ampat Diving 5D4N",
			Destination: "Raja Ampat, Papua Barat",
			Price:       4200000,
			QuotaUsed:   8,
			QuotaMax:    12,
			Schedule:    "Setiap Jumat",
			Status:      "Aktif",
			Rating:      4.97,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Bali Cultural Heritage 3D2N",
			Destination: "Ubud & Kuta, Bali",
			Price:       1550000,
			QuotaUsed:   18,
			QuotaMax:    20,
			Schedule:    "Setiap Hari",
			Status:      "Aktif",
			Rating:      4.91,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Komodo Island Adventure",
			Destination: "Labuan Bajo, NTT",
			Price:       3900000,
			QuotaUsed:   7,
			QuotaMax:    10,
			Schedule:    "Setiap Senin & Kamis",
			Status:      "Aktif",
			Rating:      4.95,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Lombok Surfing Paradise 3D2N",
			Destination: "Senggigi, Lombok",
			Price:       2400000,
			QuotaUsed:   5,
			QuotaMax:    8,
			Schedule:    "Setiap Sabtu",
			Status:      "Aktif",
			Rating:      4.88,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Yogyakarta Heritage Full Day",
			Destination: "Yogyakarta, DIY",
			Price:       850000,
			QuotaUsed:   22,
			QuotaMax:    30,
			Schedule:    "Setiap Hari",
			Status:      "Aktif",
			Rating:      4.85,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Manado Diving & Bunaken",
			Destination: "Manado, Sulawesi Utara",
			Price:       3200000,
			QuotaUsed:   0,
			QuotaMax:    8,
			Schedule:    "Setiap Rabu",
			Status:      "Nonaktif",
			Rating:      4.93,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Bromo Tengger Sunrise Hike",
			Destination: "Probolinggo, Jawa Timur",
			Price:       1200000,
			QuotaUsed:   11,
			QuotaMax:    15,
			Schedule:    "Setiap Hari",
			Status:      "Aktif",
			Rating:      4.89,
		},
		{
			ProviderID:  provider.ID,
			Name:        "Toba Lake Cultural Immersion",
			Destination: "Samosir, Sumatera Utara",
			Price:       1800000,
			QuotaUsed:   8,
			QuotaMax:    20,
			Schedule:    "Setiap Jumat-Minggu",
			Status:      "Draft",
			Rating:      0,
		},
	}

	for i := range pkgs {
		if err := DB.Create(&pkgs[i]).Error; err != nil {
			log.Printf("Seeding package %s failed: %v", pkgs[i].Name, err)
		}
	}

	// 3. Seed Bookings
	bookingsList := []models.Booking{
		{
			BookingCode:     "TK-2824-1891",
			ProviderID:      provider.ID,
			PackageID:       pkgs[0].ID, // Raja Ampat Diving
			CustomerName:    "Anisa Rahmawati",
			CustomerInitial: "AR",
			TripDate:        time.Now().AddDate(0, 0, 10),
			Guests:          2,
			TotalPrice:      8400000,
			DPAmount:        1680000,
			PaymentMethod:   "Bank Transfer",
			Status:          "Dikonfirmasi",
		},
		{
			BookingCode:     "TK-2824-1890",
			ProviderID:      provider.ID,
			PackageID:       pkgs[1].ID, // Bali Cultural Heritage
			CustomerName:    "Dimas Prasetyo",
			CustomerInitial: "DP",
			TripDate:        time.Now().AddDate(0, 0, 13),
			Guests:          4,
			TotalPrice:      6200000,
			DPAmount:        1240000,
			PaymentMethod:   "Bank Transfer",
			Status:          "Menunggu",
		},
		{
			BookingCode:     "TK-2824-1889",
			ProviderID:      provider.ID,
			PackageID:       pkgs[2].ID, // Komodo Island Adventure
			CustomerName:    "Rika Susanti",
			CustomerInitial: "RS",
			TripDate:        time.Now().AddDate(0, 0, 15),
			Guests:          3,
			TotalPrice:      11700000,
			DPAmount:        2340000,
			PaymentMethod:   "Bank Transfer",
			Status:          "Dikonfirmasi",
		},
		{
			BookingCode:     "TK-2824-1888",
			ProviderID:      provider.ID,
			PackageID:       pkgs[3].ID, // Lombok Surfing Paradise
			CustomerName:    "Fajar Nugroho",
			CustomerInitial: "FN",
			TripDate:        time.Now().AddDate(0, 0, 17),
			Guests:          2,
			TotalPrice:      4800000,
			DPAmount:        960000,
			PaymentMethod:   "Bank Transfer",
			Status:          "Selesai",
		},
		{
			BookingCode:     "TK-2824-1887",
			ProviderID:      provider.ID,
			PackageID:       pkgs[4].ID, // Yogyakarta Heritage
			CustomerName:    "Maya Indah",
			CustomerInitial: "MI",
			TripDate:        time.Now().AddDate(0, 0, 19),
			Guests:          6,
			TotalPrice:      9900000,
			DPAmount:        1980000,
			PaymentMethod:   "Bank Transfer",
			Status:          "Menunggu",
		},
	}

	for i := range bookingsList {
		if err := DB.Create(&bookingsList[i]).Error; err != nil {
			log.Printf("Seeding booking failed: %v", err)
		}
	}

	fmt.Println("Initial data seeded successfully")
}
