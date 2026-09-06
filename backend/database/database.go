package database

import (
	"fmt"
	"log"
	"os"
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
		log.Fatalf("Gagal terhubung ke database: %v", err)
	}

	fmt.Println("Koneksi database berhasil terhubung")

	// Jalankan Auto-Migration
	err = DB.AutoMigrate(&models.Provider{}, &models.Package{}, &models.Booking{}, &models.ProviderStatusHistory{}, &models.Payout{})
	if err != nil {
		log.Printf("[Catatan Migrasi] %v", err)
	} else {
		fmt.Println("Migrasi database selesai")
	}

	// Isi data awal (Seeding) jika DB kosong
	SeedDatabase()

	// Otomatis bersihkan pesanan yang lebih tua dari 3 bulan dan jalankan worker berkala
	StartPeriodicCleanup()
}

func CleanOldBookings() {
	threeMonthsAgo := time.Now().AddDate(0, -3, 0)
	res := DB.Where("created_at < ? AND created_at IS NOT NULL AND created_at != '0001-01-01 00:00:00'", threeMonthsAgo).Delete(&models.Booking{})
	if res.Error != nil {
		log.Printf("[Pembersihan Gagal] Gagal menghapus pesanan lama: %v", res.Error)
	} else if res.RowsAffected > 0 {
		log.Printf("[Pembersihan] Berhasil menghapus %d pesanan lama (lebih tua dari 3 bulan).", res.RowsAffected)
	}
}

func StartPeriodicCleanup() {
	go func() {
		// Pembersihan awal saat server baru dinyalakan
		CleanOldBookings()

		// Jalankan pembersihan berkala di latar belakang setiap 12 jam
		ticker := time.NewTicker(12 * time.Hour)
		for range ticker.C {
			CleanOldBookings()
		}
	}()
}

func SeedDatabase() {
	if strings.ToLower(os.Getenv("SEED_DB")) == "false" || os.Getenv("SKIP_SEEDING") == "true" {
		fmt.Println("[Persistensi Data] Seeding database dinonaktifkan melalui konfigurasi environment.")
		return
	}

	var providerCount, packageCount, bookingCount int64
	DB.Model(&models.Provider{}).Count(&providerCount)
	DB.Model(&models.Package{}).Count(&packageCount)
	DB.Model(&models.Booking{}).Count(&bookingCount)

	if providerCount > 0 || packageCount > 0 || bookingCount > 0 {
		fmt.Println("[Persistensi Data] Database sudah berisi data aktif (Mitra/Paket/Pesanan). Semua data tetap dipertahankan.")
		return
	}

	fmt.Println("Mengisi data awal database...")

	todayStr := time.Now().Format("2006-01-02")
	months := []string{"Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"}
	now := time.Now()
	sched3 := fmt.Sprintf("%d %s %d - %d %s %d (3 Hari)", now.Day(), months[now.Month()-1], now.Year(), now.AddDate(0, 0, 2).Day(), months[now.AddDate(0, 0, 2).Month()-1], now.AddDate(0, 0, 2).Year())
	sched2 := fmt.Sprintf("%d %s %d - %d %s %d (2 Hari)", now.Day(), months[now.Month()-1], now.Year(), now.AddDate(0, 0, 1).Day(), months[now.AddDate(0, 0, 1).Month()-1], now.AddDate(0, 0, 1).Year())
	sched4 := fmt.Sprintf("%d %s %d - %d %s %d (4 Hari)", now.Day(), months[now.Month()-1], now.Year(), now.AddDate(0, 0, 3).Day(), months[now.AddDate(0, 0, 3).Month()-1], now.AddDate(0, 0, 3).Year())
	fmt.Println("Mengisi akun admin bawaan...")
	hashedAdminPassword, _ := bcrypt.GenerateFromPassword([]byte("Admin123!"), bcrypt.DefaultCost)
	admin := models.Provider{
		BusinessName:        "TemenTrip Admin",
		BusinessCategory:     "admin",
		OperationalProvince: "DKI Jakarta",
		OperationalCity:     "Jakarta Central",
		Description:          "System Administrator",
		DocumentUploaded:    true,
		PicName:              "Admin",
		Email:                "admin@tementrip.id",
		PasswordHash:         string(hashedAdminPassword),
		WhatsApp:             "+62 800 0000 0000",
		IsVerified:           true,
		Role:                 "ADMIN",
		Status:               "APPROVED",
	}
	if err := DB.Create(&admin).Error; err != nil {
		log.Printf("Seeding admin failed: %v", err)
	}

	// 2. Seed 8 Providers (One for each trip destination)
	fmt.Println("Mengisi 8 akun mitra provider awal...")
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("demo123"), bcrypt.DefaultCost)

	providersData := []models.Provider{
		{
			BusinessName:        "Wisata Bromo Nusantara",
			BusinessCategory:     "tour",
			OperationalProvince: "Jawa Timur",
			OperationalCity:     "Probolinggo",
			Description:          "Penyedia open trip Bromo terpercaya dengan pengalaman 10+ tahun dan pemandu berpengalaman.",
			DocumentUploaded:    true,
			DocumentPath:        "/uploads/siup.pdf",
			KtpPath:             "/uploads/ktp_pic.jpg",
			PicName:             "Budi Santoso",
			Email:               "partner@wisatanusantara.id", // Akun 1: Bromo
			PasswordHash:        string(hashedPassword),
			WhatsApp:            "+62 812 3456 7890",
			IsVerified:          true,
			Role:                "PROVIDER",
			Status:              "APPROVED",
			VerificationNotes:   "Berkas lengkap dan terverifikasi secara sistem.",
		},
		{
			BusinessName:        "Tidung Paradise Tour",
			BusinessCategory:     "tour",
			OperationalProvince: "DKI Jakarta",
			OperationalCity:     "Kepulauan Seribu",
			Description:          "Spesialis wisata jelajah Pulau Tidung dan pulau-pulau eksotis Kepulauan Seribu.",
			DocumentUploaded:    true,
			DocumentPath:        "/uploads/siup.pdf",
			KtpPath:             "/uploads/ktp_pic.jpg",
			PicName:             "Ahmad Fauzi",
			Email:               "partner2@tidung.id", // Akun 2: Tidung
			PasswordHash:        string(hashedPassword),
			WhatsApp:            "+62 813 9876 5432",
			IsVerified:          true,
			Role:                "PROVIDER",
			Status:              "APPROVED",
			VerificationNotes:   "Berkas lengkap dan terverifikasi secara sistem.",
		},
		{
			BusinessName:        "Bogor Curug Explorer",
			BusinessCategory:     "tour",
			OperationalProvince: "Jawa Barat",
			OperationalCity:     "Bogor",
			Description:          "Mitra petualangan alam dan eksplorasi curug indah seputar wilayah Bogor.",
			DocumentUploaded:    true,
			DocumentPath:        "/uploads/siup.pdf",
			KtpPath:             "/uploads/ktp_pic.jpg",
			PicName:             "Rian Hidayat",
			Email:               "partner3@cilember.id", // Akun 3: Curug Cilember
			PasswordHash:        string(hashedPassword),
			WhatsApp:            "+62 815 1122 3344",
			IsVerified:          true,
			Role:                "PROVIDER",
			Status:              "APPROVED",
			VerificationNotes:   "Berkas lengkap dan terverifikasi secara sistem.",
		},
		{
			BusinessName:        "Bandung Juara Tour",
			BusinessCategory:     "tour",
			OperationalProvince: "Jawa Barat",
			OperationalCity:     "Bandung",
			Description:          "Layanan keliling kota Bandung, tempat bersejarah, wisata kuliner, dan belanja terfavorit.",
			DocumentUploaded:    true,
			DocumentPath:        "/uploads/siup.pdf",
			KtpPath:             "/uploads/ktp_pic.jpg",
			PicName:             "Dede Suhendar",
			Email:               "partner4@bandung.id", // Akun 4: Bandung
			PasswordHash:        string(hashedPassword),
			WhatsApp:            "+62 817 5566 7788",
			IsVerified:          true,
			Role:                "PROVIDER",
			Status:              "APPROVED",
			VerificationNotes:   "Berkas lengkap dan terverifikasi secara sistem.",
		},
		{
			BusinessName:        "Ranu Kumbolo Trail",
			BusinessCategory:     "tour",
			OperationalProvince: "Jawa Timur",
			OperationalCity:     "Malang",
			Description:          "Komunitas dan operator pendakian Gunung Semeru & Danau Ranu Kumbolo.",
			DocumentUploaded:    true,
			DocumentPath:        "/uploads/siup.pdf",
			KtpPath:             "/uploads/ktp_pic.jpg",
			PicName:             "Suryadi",
			Email:               "partner5@ranukumbolo.id", // Akun 5: Ranu Kumbolo
			PasswordHash:        string(hashedPassword),
			WhatsApp:            "+62 819 9900 1122",
			IsVerified:          true,
			Role:                "PROVIDER",
			Status:              "APPROVED",
			VerificationNotes:   "Berkas lengkap dan terverifikasi secara sistem.",
		},
		{
			BusinessName:        "Baduy Cultural Heritage",
			BusinessCategory:     "tour",
			OperationalProvince: "Banten",
			OperationalCity:     "Lebak",
			Description:          "Penyedia trip edukasi dan budaya adat Suku Baduy Luar & Baduy Dalam.",
			DocumentUploaded:    true,
			DocumentPath:        "/uploads/siup.pdf",
			KtpPath:             "/uploads/ktp_pic.jpg",
			PicName:             "Kurnia",
			Email:               "partner6@baduy.id", // Akun 6: Baduy
			PasswordHash:        string(hashedPassword),
			WhatsApp:            "+62 821 3344 5566",
			IsVerified:          true,
			Role:                "PROVIDER",
			Status:              "APPROVED",
			VerificationNotes:   "Berkas lengkap dan terverifikasi secara sistem.",
		},
		{
			BusinessName:        "Palu Bahari Tour",
			BusinessCategory:     "tour",
			OperationalProvince: "Sulawesi Tengah",
			OperationalCity:     "Palu",
			Description:          "Wisata bahari pantai Tanjung Karang Palu dengan fasilitas snorkeling dan diving terpercaya.",
			DocumentUploaded:    true,
			DocumentPath:        "/uploads/siup.pdf",
			KtpPath:             "/uploads/ktp_pic.jpg",
			PicName:             "Fajar Bahari",
			Email:               "partner7@palu.id", // Akun 7: Palu
			PasswordHash:        string(hashedPassword),
			WhatsApp:            "+62 823 7788 9900",
			IsVerified:          true,
			Role:                "PROVIDER",
			Status:              "APPROVED",
			VerificationNotes:   "Berkas lengkap dan terverifikasi secara sistem.",
		},
		{
			BusinessName:        "Jogja Istimewa Tour",
			BusinessCategory:     "tour",
			OperationalProvince: "DI Yogyakarta",
			OperationalCity:     "Yogyakarta",
			Description:          "Paket liburan seru mengelilingi tempat bersejarah, keraton, candi, dan pantai Yogyakarta.",
			DocumentUploaded:    true,
			DocumentPath:        "/uploads/siup.pdf",
			KtpPath:             "/uploads/ktp_pic.jpg",
			PicName:             "Bambang Gunawan",
			Email:               "partner8@jogja.id", // Akun 8: Jogja
			PasswordHash:        string(hashedPassword),
			WhatsApp:            "+62 856 1234 5678",
			IsVerified:          true,
			Role:                "PROVIDER",
			Status:              "APPROVED",
			VerificationNotes:   "Berkas lengkap dan terverifikasi secara sistem.",
		},
	}

	createdProviders := make([]models.Provider, len(providersData))
	for i, p := range providersData {
		var existing models.Provider
		if err := DB.Where("email = ?", p.Email).First(&existing).Error; err != nil {
			if err := DB.Create(&p).Error; err != nil {
				log.Printf("Gagal membuat data mitra %s: %v", p.BusinessName, err)
			}
			createdProviders[i] = p
		} else {
			createdProviders[i] = existing
		}

		// Seed status history for each provider
		history := models.ProviderStatusHistory{
			ProviderID: createdProviders[i].ID,
			Status:     "APPROVED",
			Notes:      "Dokumen terverifikasi lengkap.",
			CreatedAt:  time.Now().Add(-1 * time.Hour),
		}
		DB.Create(&history)
	}

	// 3. Seed Packages (8 packages assigned to 8 distinct providers)
	pkgs := []models.Package{
		{
			ProviderID:  createdProviders[0].ID,
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
			ProviderID:  createdProviders[1].ID,
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
			ProviderID:  createdProviders[2].ID,
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
			ProviderID:  createdProviders[3].ID,
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
			ProviderID:  createdProviders[4].ID,
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
			Schedule:    sched4,
			Status:      "Aktif",
			Rating:      4.7,
		},
		{
			ProviderID:  createdProviders[5].ID,
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
			ProviderID:  createdProviders[6].ID,
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
			Schedule:    sched4,
			Status:      "Aktif",
			Rating:      4.9,
		},
		{
			ProviderID:  createdProviders[7].ID,
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
			log.Printf("Gagal membuat paket %s: %v", pkgs[i].Name, err)
		}
	}

	// 4. Seed Bookings for each provider
	bookingsList := []models.Booking{
		{
			BookingCode:     "TK-20260906-7891",
			ProviderID:      createdProviders[0].ID,
			PackageID:       pkgs[0].ID,
			CustomerName:    "Anisa Rahmawati",
			CustomerInitial: "AR",
			TripDate:        time.Now().AddDate(0, 0, 10),
			Guests:          2,
			TotalPrice:      700000,
			DPAmount:        140000,
			PaymentMethod:   "Xendit Invoice",
			Status:          "CONFIRMED",
		},
		{
			BookingCode:     "TK-20260906-7890",
			ProviderID:      createdProviders[1].ID,
			PackageID:       pkgs[1].ID,
			CustomerName:    "Dimas Prasetyo",
			CustomerInitial: "DP",
			TripDate:        time.Now().AddDate(0, 0, 13),
			Guests:          4,
			TotalPrice:      1800000,
			DPAmount:        360000,
			PaymentMethod:   "Xendit Invoice",
			Status:          "CONFIRMED",
			PaymentProof:    "/uploads/bukti_dummy.png",
		},
		{
			BookingCode:     "TK-20260906-7889",
			ProviderID:      createdProviders[2].ID,
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
		{
			BookingCode:     "TK-20260906-7888",
			ProviderID:      createdProviders[3].ID,
			PackageID:       pkgs[3].ID,
			CustomerName:    "Budi Hermawan",
			CustomerInitial: "BH",
			TripDate:        time.Now().AddDate(0, 0, 8),
			Guests:          2,
			TotalPrice:      400000,
			DPAmount:        80000,
			PaymentMethod:   "Manual Transfer",
			Status:          "CONFIRMED",
		},
	}

	for i := range bookingsList {
		if err := DB.Create(&bookingsList[i]).Error; err != nil {
			log.Printf("Gagal membuat data pesanan: %v", err)
		}
	}

	fmt.Println("8 Akun mitra dan 8 destinasi awal berhasil disimpan ke database")
}
