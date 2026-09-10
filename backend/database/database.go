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
	err = DB.AutoMigrate(
		&models.Provider{},
		&models.Package{},
		&models.Booking{},
		&models.ProviderStatusHistory{},
		&models.Payout{},
		&models.Review{},
		&models.ProviderBalance{},
		&models.HeldSettlement{},
	)
	if err != nil {
		log.Printf("[Catatan Migrasi] %v", err)
	} else {
		fmt.Println("Migrasi database selesai")
	}

	// Isi data awal (Seeding) jika DB kosong
	SeedDatabase()
	EnsureAdminUserExists()
	EnsureAllTestProvidersAndSeats()

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

func AutoCompleteFinishedBookings() {
	now := time.Now()
	// Fetch bookings whose status is PAID or CONFIRMED and trip_date is in the past
	var finishedBookings []models.Booking
	err := DB.Where("(status = ? OR status = ?) AND trip_date < ?", "PAID", "CONFIRMED", now).Find(&finishedBookings).Error
	if err == nil && len(finishedBookings) > 0 {
		for _, b := range finishedBookings {
			DB.Model(&models.Booking{}).Where("id = ?", b.ID).Update("status", "COMPLETED")
			
			// Transition held_settlements from HELD to RELEASED
			var settlement models.HeldSettlement
			if errS := DB.Where("booking_id = ? AND status = ?", b.ID, "HELD").First(&settlement).Error; errS == nil {
				settlement.Status = "RELEASED"
				DB.Save(&settlement)

				// Move funds from held_balance to available_balance in provider_balances
				var balance models.ProviderBalance
				if errB := DB.Where("provider_id = ?", b.ProviderID).First(&balance).Error; errB == nil {
					halfAmount := b.TotalPrice / 2
					if halfAmount <= 0 {
						halfAmount = b.TotalPrice
					}
					balance.HeldBalance -= halfAmount
					if balance.HeldBalance < 0 {
						balance.HeldBalance = 0
					}
					balance.AvailableBalance += halfAmount
					balance.UpdatedAt = time.Now()
					DB.Save(&balance)
				}
			}
		}
		log.Printf("[Auto Complete] Berhasil mengubah %d pesanan menjadi COMPLETED dan mencairkan held settlements.", len(finishedBookings))
	}
}

func StartPeriodicCleanup() {
	go func() {
		// Pembersihan awal saat server baru dinyalakan
		CleanOldBookings()
		AutoCompleteFinishedBookings()

		// Jalankan pembersihan berkala di latar belakang setiap 1 jam
		ticker := time.NewTicker(1 * time.Hour)
		for range ticker.C {
			CleanOldBookings()
			AutoCompleteFinishedBookings()
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
	_ = sched4
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
			IsVerified:           true,
			Role:                 "PROVIDER",
			Status:               "APPROVED",
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
			IsVerified:           true,
			Role:                 "PROVIDER",
			Status:               "APPROVED",
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
			IsVerified:           true,
			Role:                 "PROVIDER",
			Status:               "APPROVED",
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
			IsVerified:           true,
			Role:                 "PROVIDER",
			Status:               "APPROVED",
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
			IsVerified:           true,
			Role:                 "PROVIDER",
			Status:               "APPROVED",
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
			IsVerified:           true,
			Role:                 "PROVIDER",
			Status:               "APPROVED",
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
			IsVerified:           true,
			Role:                 "PROVIDER",
			Status:               "APPROVED",
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
			IsVerified:           true,
			Role:                 "PROVIDER",
			Status:               "APPROVED",
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

	// 3. Seed Packages (12 packages covering Open Trip, Private Trip, Honeymoon, Family, Corporate)
	pkgs := []models.Package{
		{
			ProviderID:  createdProviders[0].ID,
			Name:        "Open Trip Gunung Bromo",
			Destination: "Probolinggo, Jawa Timur",
			Category:    "Gunung",
			TripType:    "Open Trip",
			Price:       350000,
			QuotaMin:    1,
			QuotaUsed:   0,
			QuotaMax:    15,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched3,
			Status:      "Aktif",
			Rating:      4.8,
			Image:       "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[1].ID,
			Name:        "Open Trip Pulau Tidung",
			Destination: "Kepulauan Seribu, Jakarta",
			Category:    "Pantai",
			TripType:    "Open Trip",
			Price:       450000,
			QuotaMin:    1,
			QuotaUsed:   0,
			QuotaMax:    12,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched3,
			Status:      "Aktif",
			Rating:      4.7,
			Image:       "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[2].ID,
			Name:        "Trip Curug Cilember",
			Destination: "Bogor, Jawa Barat",
			Category:    "Curug",
			TripType:    "Open Trip",
			Price:       275000,
			QuotaMin:    1,
			QuotaUsed:   0,
			QuotaMax:    10,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched2,
			Status:      "Aktif",
			Rating:      4.6,
			Image:       "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[3].ID,
			Name:        "Bandung City Tour",
			Destination: "Bandung, Jawa Barat",
			Category:    "City Tour",
			TripType:    "Open Trip",
			Price:       200000,
			QuotaMin:    1,
			QuotaUsed:   0,
			QuotaMax:    10,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    sched2,
			Status:      "Aktif",
			Rating:      4.5,
			Image:       "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[0].ID,
			Name:        "Private Trip Bromo Sunrise & Savana",
			Destination: "Probolinggo, Jawa Timur",
			Category:    "Gunung",
			TripType:    "Private Trip",
			Price:       1250000,
			QuotaMin:    2,
			QuotaUsed:   0,
			QuotaMax:    10,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    "Fleksibel (Pilihan Customer)",
			Status:      "Aktif",
			Rating:      4.9,
			Image:       "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[6].ID,
			Name:        "Private Trip Wisata Raja Ampat 4D3N",
			Destination: "Papua Barat",
			Category:    "Diving & Snorkeling",
			TripType:    "Private Trip",
			Price:       3850000,
			QuotaMin:    1,
			QuotaUsed:   0,
			QuotaMax:    8,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    "Fleksibel (Pilihan Customer)",
			Status:      "Aktif",
			Rating:      5.0,
			Image:       "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[7].ID,
			Name:        "Honeymoon Romantic Bali Villa 3D2N",
			Destination: "Bali",
			Category:    "Pantai",
			TripType:    "Honeymoon",
			Price:       2950000,
			QuotaMin:    2,
			QuotaUsed:   0,
			QuotaMax:    2,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    "Fleksibel (Pilihan Customer)",
			Status:      "Aktif",
			Rating:      5.0,
			Image:       "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[1].ID,
			Name:        "Honeymoon Island Sunset Tidung 3D2N",
			Destination: "Kepulauan Seribu, Jakarta",
			Category:    "Pantai",
			TripType:    "Honeymoon",
			Price:       1650000,
			QuotaMin:    2,
			QuotaUsed:   0,
			QuotaMax:    2,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    "Fleksibel (Pilihan Customer)",
			Status:      "Aktif",
			Rating:      4.8,
			Image:       "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[7].ID,
			Name:        "Family Vacation Yogyakarta & Borobudur",
			Destination: "Yogyakarta, DI Yogyakarta",
			Category:    "Wisata Budaya & Sejarah",
			TripType:    "Family",
			Price:       850000,
			QuotaMin:    3,
			QuotaUsed:   0,
			QuotaMax:    15,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    "Fleksibel (Pilihan Customer)",
			Status:      "Aktif",
			Rating:      4.9,
			Image:       "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[2].ID,
			Name:        "Family Nature Retreat Cilember 2D1N",
			Destination: "Bogor, Jawa Barat",
			Category:    "Curug",
			TripType:    "Family",
			Price:       650000,
			QuotaMin:    3,
			QuotaUsed:   0,
			QuotaMax:    12,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    "Fleksibel (Pilihan Customer)",
			Status:      "Aktif",
			Rating:      4.7,
			Image:       "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[3].ID,
			Name:        "Corporate Gathering & Outbound Bandung",
			Destination: "Bandung, Jawa Barat",
			Category:    "City Tour",
			TripType:    "Corporate",
			Price:       750000,
			QuotaMin:    10,
			QuotaUsed:   0,
			QuotaMax:    100,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    "Fleksibel (Pilihan Customer)",
			Status:      "Aktif",
			Rating:      4.9,
			Image:       "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
		},
		{
			ProviderID:  createdProviders[2].ID,
			Name:        "Corporate Team Building Bogor 2D1N",
			Destination: "Bogor, Jawa Barat",
			Category:    "Wisata Budaya & Sejarah",
			TripType:    "Corporate",
			Price:       680000,
			QuotaMin:    10,
			QuotaUsed:   0,
			QuotaMax:    80,
			StartDate:   todayStr,
			EndDate:     todayStr,
			Schedule:    "Fleksibel (Pilihan Customer)",
			Status:      "Aktif",
			Rating:      4.8,
			Image:       "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
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
		if err := DB.Create(&bookingsList[i]).Error; err == nil {
			b := bookingsList[i]
			if b.Status == "CONFIRMED" || b.Status == "PAID" || b.Status == "COMPLETED" {
				halfAmount := b.TotalPrice / 2
				if halfAmount <= 0 {
					halfAmount = b.TotalPrice
				}

				// Create held_settlements record
				settlement := models.HeldSettlement{
					BookingID:   b.ID,
					ProviderID:  b.ProviderID,
					Amount:      halfAmount,
					Status:      "HELD",
					ReleaseDate: b.TripDate.AddDate(0, 0, 1),
					CreatedAt:   time.Now(),
				}
				DB.Create(&settlement)

				// Create or update ProviderBalance
				var balance models.ProviderBalance
				if errBal := DB.Where("provider_id = ?", b.ProviderID).First(&balance).Error; errBal != nil {
					balance = models.ProviderBalance{
						ProviderID:       b.ProviderID,
						AvailableBalance: halfAmount,
						HeldBalance:      halfAmount,
						TotalEarned:      b.TotalPrice,
						UpdatedAt:        time.Now(),
					}
					DB.Create(&balance)
				} else {
					balance.AvailableBalance += halfAmount
					balance.HeldBalance += halfAmount
					balance.TotalEarned += b.TotalPrice
					balance.UpdatedAt = time.Now()
					DB.Save(&balance)
				}
			}
		}
	}

	fmt.Println("8 Akun mitra dan 8 destinasi awal berhasil disimpan ke database")
}

func EnsureAdminUserExists() {
	var count int64
	DB.Model(&models.Provider{}).Where("email = ?", "admin@tementrip.id").Count(&count)
	hashedAdminPassword, _ := bcrypt.GenerateFromPassword([]byte("Admin123!"), bcrypt.DefaultCost)

	if count == 0 {
		admin := models.Provider{
			BusinessName:        "TemenTrip Admin",
			BusinessCategory:    "admin",
			OperationalProvince: "DKI Jakarta",
			OperationalCity:     "Jakarta Central",
			Description:         "System Administrator",
			DocumentUploaded:   true,
			PicName:             "Admin",
			Email:               "admin@tementrip.id",
			PasswordHash:        string(hashedAdminPassword),
			WhatsApp:            "+62 800 0000 0000",
			IsVerified:          true,
			Role:                "ADMIN",
			Status:              "APPROVED",
		}
		if err := DB.Create(&admin).Error; err != nil {
			log.Printf("[Admin Setup Error] %v", err)
		} else {
			fmt.Println("[Admin Setup] Akun default admin@tementrip.id berhasil dibuat.")
		}
	} else {
		DB.Model(&models.Provider{}).Where("email = ?", "admin@tementrip.id").Updates(map[string]interface{}{
			"password_hash": string(hashedAdminPassword),
			"role":          "ADMIN",
			"status":        "APPROVED",
			"is_verified":   true,
		})
		fmt.Println("[Admin Setup] Akun admin@tementrip.id diperbarui & aktif (ADMIN).")
	}
}

func EnsureAllTestProvidersAndSeats() {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("demo123"), bcrypt.DefaultCost)
	passStr := string(hashedPassword)

	testEmails := []struct {
		Email string
		Name  string
		City  string
		Prov  string
	}{
		{"partner@wisatanusantara.id", "Wisata Bromo Nusantara", "Probolinggo", "Jawa Timur"},
		{"partner2@tidung.id", "Tidung Paradise Tour", "Kepulauan Seribu", "DKI Jakarta"},
		{"partner3@cilember.id", "Bogor Curug Explorer", "Bogor", "Jawa Barat"},
		{"partner4@bandung.id", "Bandung Juara Tour", "Bandung", "Jawa Barat"},
		{"partner5@ranukumbolo.id", "Ranu Kumbolo Trail", "Malang", "Jawa Timur"},
		{"partner6@baduy.id", "Baduy Cultural Heritage", "Lebak", "Banten"},
		{"partner7@palu.id", "Palu Bahari Tour", "Palu", "Sulawesi Tengah"},
		{"partner8@jogja.id", "Jogja Istimewa Tour", "Yogyakarta", "DI Yogyakarta"},
	}

	for _, item := range testEmails {
		var count int64
		DB.Model(&models.Provider{}).Where("email = ?", item.Email).Count(&count)
		if count == 0 {
			provider := models.Provider{
				BusinessName:        item.Name,
				BusinessCategory:    "tour",
				OperationalProvince: item.Prov,
				OperationalCity:     item.City,
				Description:         "Mitra Provider Resmi TemenTrip",
				DocumentUploaded:    true,
				PicName:             item.Name,
				Email:               item.Email,
				PasswordHash:        passStr,
				WhatsApp:            "+62 812 3456 7890",
				IsVerified:          true,
				Role:                "PROVIDER",
				Status:              "APPROVED",
			}
			if err := DB.Create(&provider).Error; err != nil {
				log.Printf("[Provider Seed Error] %v", err)
			}
		} else {
			DB.Model(&models.Provider{}).Where("email = ?", item.Email).Updates(map[string]interface{}{
				"password_hash": passStr,
				"role":          "PROVIDER",
				"status":        "APPROVED",
				"is_verified":   true,
			})
		}

		var provider models.Provider
		if err := DB.Where("email = ?", item.Email).First(&provider).Error; err == nil {
			// Ensure ProviderBalance record exists
			var balance models.ProviderBalance
			if errB := DB.Where("provider_id = ?", provider.ID).First(&balance).Error; errB != nil {
				balance = models.ProviderBalance{
					ProviderID:       provider.ID,
					AvailableBalance: 0,
					HeldBalance:      0,
					TotalEarned:      0,
					UpdatedAt:        time.Now(),
				}
				DB.Create(&balance)
			}
		}
	}
	log.Println("[QA Prep] All 8 Provider test accounts verified and updated with password 'demo123'.")

	todayStr := time.Now().Format("2006-01-02")
	months := []string{"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
	now := time.Now()
	sched3 := fmt.Sprintf("%d %s %d – %d %s %d (3 Hari)", now.Day(), months[now.Month()-1], now.Year(), now.AddDate(0, 0, 2).Day(), months[now.AddDate(0, 0, 2).Month()-1], now.AddDate(0, 0, 2).Year())
	sched2 := fmt.Sprintf("%d %s %d – %d %s %d (2 Hari)", now.Day(), months[now.Month()-1], now.Year(), now.AddDate(0, 0, 1).Day(), months[now.AddDate(0, 0, 1).Month()-1], now.AddDate(0, 0, 1).Year())

	// Map provider IDs by email
	var p1, p2, p3, p4, p8 models.Provider
	DB.Where("email = ?", "partner@wisatanusantara.id").First(&p1)
	DB.Where("email = ?", "partner2@tidung.id").First(&p2)
	DB.Where("email = ?", "partner3@cilember.id").First(&p3)
	DB.Where("email = ?", "partner4@bandung.id").First(&p4)
	DB.Where("email = ?", "partner8@jogja.id").First(&p8)

	pID1 := p1.ID
	if pID1 == 0 { pID1 = 1 }
	pID2 := p2.ID
	if pID2 == 0 { pID2 = 2 }
	pID3 := p3.ID
	if pID3 == 0 { pID3 = 3 }
	pID4 := p4.ID
	if pID4 == 0 { pID4 = 4 }
	pID8 := p8.ID
	if pID8 == 0 { pID8 = 8 }

	packagesToEnsure := []models.Package{
		// Provider 1: Wisata Bromo Nusantara (Bromo & Bali)
		{ProviderID: pID1, Name: "Open Trip Gunung Bromo", Destination: "Probolinggo, Jawa Timur", Category: "Gunung", TripType: "Open Trip", Price: 350000, QuotaMin: 1, QuotaMax: 15, StartDate: todayStr, EndDate: todayStr, Schedule: sched3, Status: "Aktif", Rating: 4.8, Image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80"},
		{ProviderID: pID1, Name: "Private Trip Bromo Sunrise & Savana", Destination: "Probolinggo, Jawa Timur", Category: "Gunung", TripType: "Private Trip", Price: 1250000, QuotaMin: 1, QuotaMax: 10, StartDate: "2026-09-21", EndDate: "2026-11-30", Schedule: "Operasional: 21-30 Sep, 10-25 Okt, 05-20 Nov 2026", Status: "Aktif", Rating: 4.9, Image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80"},
		{ProviderID: pID1, Name: "Honeymoon Romantic Bali Villa 3D2N", Destination: "Bali", Category: "Pantai", TripType: "Honeymoon", Price: 2950000, QuotaMin: 2, QuotaMax: 10, StartDate: "2026-09-17", EndDate: "2026-11-30", Schedule: "Bebas Pilih Tanggal (17 Sep - 30 Nov 2026)", Status: "Aktif", Rating: 5.0, Image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80"},

		// Provider 2: Tidung Paradise Tour (Kepulauan Seribu)
		{ProviderID: pID2, Name: "Open Trip Pulau Tidung", Destination: "Kepulauan Seribu, Jakarta", Category: "Pantai", TripType: "Open Trip", Price: 450000, QuotaMin: 1, QuotaMax: 12, StartDate: todayStr, EndDate: todayStr, Schedule: sched3, Status: "Aktif", Rating: 4.7, Image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80"},
		{ProviderID: pID2, Name: "Honeymoon Island Sunset Tidung 3D2N", Destination: "Kepulauan Seribu, Jakarta", Category: "Pantai", TripType: "Honeymoon", Price: 1650000, QuotaMin: 2, QuotaMax: 10, StartDate: "2026-09-20", EndDate: "2026-11-30", Schedule: "Operasional: 20-30 Sep, 05-20 Okt, 01-15 Nov 2026", Status: "Aktif", Rating: 4.8, Image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80"},

		// Provider 3: Bogor Curug Explorer (Bogor & Cilember)
		{ProviderID: pID3, Name: "Trip Curug Cilember", Destination: "Bogor, Jawa Barat", Category: "Curug", TripType: "Open Trip", Price: 275000, QuotaMin: 1, QuotaMax: 10, StartDate: todayStr, EndDate: todayStr, Schedule: sched2, Status: "Aktif", Rating: 4.6, Image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80"},
		{ProviderID: pID3, Name: "Family Nature Retreat Cilember 2D1N", Destination: "Bogor, Jawa Barat", Category: "Curug", TripType: "Family", Price: 650000, QuotaMin: 3, QuotaMax: 12, StartDate: "2026-09-17", EndDate: "2026-11-30", Schedule: "Operasional: 17-30 Sep, 15-31 Okt, 10-25 Nov 2026", Status: "Aktif", Rating: 4.7, Image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80"},
		{ProviderID: pID3, Name: "Corporate Team Building Bogor 2D1N", Destination: "Bogor, Jawa Barat", Category: "Wisata Budaya & Sejarah", TripType: "Corporate", Price: 680000, QuotaMin: 10, QuotaMax: 80, StartDate: "2026-09-18", EndDate: "2026-11-30", Schedule: "Operasional: 18-30 Sep, 01-31 Okt, 01-30 Nov 2026", Status: "Aktif", Rating: 4.8, Image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80"},

		// Provider 4: Bandung Juara Tour (Bandung)
		{ProviderID: pID4, Name: "Bandung City Tour", Destination: "Bandung, Jawa Barat", Category: "City Tour", TripType: "Open Trip", Price: 420000, QuotaMin: 1, QuotaMax: 15, StartDate: todayStr, EndDate: todayStr, Schedule: sched2, Status: "Aktif", Rating: 4.9, Image: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80"},
		{ProviderID: pID4, Name: "Corporate Gathering & Outbound Bandung", Destination: "Bandung, Jawa Barat", Category: "City Tour", TripType: "Corporate", Price: 750000, QuotaMin: 10, QuotaMax: 100, StartDate: "2026-09-25", EndDate: "2026-11-30", Schedule: "Operasional: 25-30 Sep, 15-30 Okt, 15-30 Nov 2026", Status: "Aktif", Rating: 4.9, Image: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80"},

		// Provider 5: Jogja Istimewa Tour (Yogyakarta & Raja Ampat)
		{ProviderID: pID8, Name: "Family Vacation Yogyakarta & Borobudur", Destination: "Yogyakarta, DI Yogyakarta", Category: "Wisata Budaya & Sejarah", TripType: "Family", Price: 850000, QuotaMin: 3, QuotaMax: 15, StartDate: "2026-09-17", EndDate: "2026-11-30", Schedule: "Bebas Pilih Tanggal (Ready 1 Bulan Full & 3 Bulan Kedepan)", Status: "Aktif", Rating: 4.9, Image: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80"},
		{ProviderID: pID8, Name: "Private Trip Wisata Raja Ampat 4D3N", Destination: "Papua Barat", Category: "Diving & Snorkeling", TripType: "Private Trip", Price: 3850000, QuotaMin: 1, QuotaMax: 8, StartDate: "2026-09-18", EndDate: "2026-11-30", Schedule: "Operasional: 18-28 Sep, 01-15 Okt, 10-28 Nov 2026", Status: "Aktif", Rating: 5.0, Image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80"},
	}

	for _, p := range packagesToEnsure {
		var existing models.Package
		if err := DB.Where("name = ?", p.Name).First(&existing).Error; err != nil {
			DB.Create(&p)
		} else {
			DB.Model(&existing).Updates(map[string]interface{}{
				"provider_id": p.ProviderID,
				"trip_type":   p.TripType,
				"quota_min":   p.QuotaMin,
				"quota_max":   p.QuotaMax,
				"price":       p.Price,
				"category":    p.Category,
				"destination": p.Destination,
				"start_date":  p.StartDate,
				"end_date":    p.EndDate,
				"schedule":    p.Schedule,
				"status":      "Aktif",
				"image":       p.Image,
			})
		}
	}

	// Recalculate quota_used for each package based on active non-cancelled/non-expired bookings
	err := DB.Exec(`
		UPDATE packages p
		SET quota_used = COALESCE((
			SELECT SUM(b.guests)
			FROM bookings b
			WHERE b.package_id = p.id
			AND b.status IN ('PENDING_PAYMENT', 'WAITING_CONFIRMATION', 'PAID', 'CONFIRMED', 'COMPLETED')
		), 0)
	`).Error

	if err == nil {
		log.Println("[DB Sync] Quota used successfully recalculated from active bookings.")
	} else {
		log.Printf("[DB Sync Error] Failed to sync quota used: %v", err)
	}
}
