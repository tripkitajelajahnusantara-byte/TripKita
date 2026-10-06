package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

// DepartureService menangani keberangkatan yang tidak dapat berjalan apa adanya.
//
// Ada tiga pemicu. Pertama, kuota minimal open trip: pada H-3 pukul 00:01, bila
// kursi terisi masih di bawah quotaMin, mitra diberi tiga pilihan — tetap
// berangkat, membatalkan, atau menawarkan tanggal pengganti. Kedua, prakiraan
// cuaca H-3 untuk trip selain Open Trip sebagai bahan pertimbangan tanpa
// keputusan otomatis. Ketiga, keadaan kahar yang dinyatakan sendiri oleh mitra
// untuk tipe paket apa pun sampai hari keberangkatan berakhir.
//
// Keduanya berujung pada pilihan yang sama bagi pelanggan: menerima tanggal
// pengganti, atau menolak dan menerima pengembalian dana penuh. Pembatalan
// selalu melewati alur status booking yang sudah ada agar pembalikan saldo
// mitra dan notifikasi admin tetap satu jalur.
type DepartureService interface {
	ReviewDepartures() error
	ReviewWeatherAdvisories(ctx context.Context) error
	ExpireStaleRescheduleOffers() error
	ListForProvider(providerID uint) ([]models.TripDeparture, error)
	ListUpcomingForProvider(providerID uint) ([]repositories.DepartureCandidate, error)
	DeclareForceMajeure(providerID uint, req *models.ForceMajeureRequest) (*models.TripDeparture, error)
	OfferBookingReschedule(bookingID uint, providerID uint, req *models.ProviderRescheduleRequest) (*RescheduleOfferResult, error)
	SubmitDecision(departureID uint, providerID uint, req *models.DepartureDecisionRequest) (*models.TripDeparture, error)
	RespondToReschedule(bookingID uint, customerID uint, accept bool) (*models.Booking, error)
}

type departureService struct {
	db             *gorm.DB
	repo           repositories.DepartureRepository
	providerRepo   repositories.ProviderRepository
	bookingService BookingService
	notifService   *NotificationService
	emailService   *EmailService
	weatherService WeatherService
}

func NewDepartureService(
	db *gorm.DB,
	repo repositories.DepartureRepository,
	providerRepo repositories.ProviderRepository,
	bookingService BookingService,
	notifService *NotificationService,
	emailService *EmailService,
	weatherService WeatherService,
) DepartureService {
	return &departureService{
		db:             db,
		repo:           repo,
		providerRepo:   providerRepo,
		bookingService: bookingService,
		notifService:   notifService,
		emailService:   emailService,
		weatherService: weatherService,
	}
}

// ReviewWeatherAdvisories mengambil prakiraan H-3 untuk booking terbayar selain
// Open Trip. Snapshot dibuat satu kali per paket/tanggal sehingga job per jam
// tidak mengirim email berulang. Klasifikasi cuaca hanya menentukan penekanan
// visual; status booking tidak pernah berubah sebelum provider mengirim pilihan.
func (s *departureService) ReviewWeatherAdvisories(ctx context.Context) error {
	if s.weatherService == nil {
		return ErrWeatherServiceDisabled
	}
	now := time.Now()
	candidates, err := s.repo.FindNonOpenTripWeatherCandidates(now)
	if err != nil {
		return err
	}

	created := 0
	for _, candidate := range candidates {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		deadline := models.ReviewDeadlineFor(candidate.DepartureAt)
		if now.Before(deadline) {
			continue
		}

		existing, findErr := s.repo.FindDeparture(candidate.PackageID, candidate.DepartureDay)
		if findErr != nil && !errors.Is(findErr, gorm.ErrRecordNotFound) {
			log.Printf("[Cuaca H-3] Gagal memeriksa paket %d tanggal %s: %v", candidate.PackageID, candidate.DepartureDay, findErr)
			continue
		}
		if existing != nil {
			continue
		}

		forecast, forecastErr := s.weatherService.Forecast(ctx, candidate.Destination, candidate.DepartureAt)
		if forecastErr != nil {
			if errors.Is(forecastErr, ErrWeatherServiceDisabled) {
				return forecastErr
			}
			log.Printf("[Cuaca H-3] Prakiraan %s (%s) gagal: %v", candidate.PackageName, candidate.DepartureDay, forecastErr)
			continue
		}
		forecastedAt := forecast.ForecastedAt
		departure := models.TripDeparture{
			PackageID:           candidate.PackageID,
			ProviderID:          candidate.ProviderID,
			DepartureDay:        candidate.DepartureDay,
			DepartureAt:         candidate.DepartureAt,
			ReviewDeadline:      deadline,
			SeatsBooked:         candidate.SeatsBooked,
			SeatsRequired:       candidate.SeatsRequired,
			BookingCount:        candidate.BookingCount,
			Status:              models.DepartureAwaitingProvider,
			Reason:              models.DepartureReasonWeatherForecast,
			WeatherLocation:     forecast.Location,
			WeatherCondition:    forecast.Condition,
			WeatherMinTempC:     forecast.MinTempC,
			WeatherMaxTempC:     forecast.MaxTempC,
			WeatherRainChance:   forecast.RainChance,
			WeatherPrecipMM:     forecast.PrecipMM,
			WeatherMaxWindKPH:   forecast.MaxWindKPH,
			WeatherIsAdverse:    forecast.IsAdverse,
			WeatherAdvisory:     forecast.Advisory,
			WeatherForecastedAt: &forecastedAt,
		}
		result := s.db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "package_id"}, {Name: "departure_day"}},
			DoNothing: true,
		}).Create(&departure)
		if result.Error != nil {
			log.Printf("[Cuaca H-3] Gagal menyimpan prakiraan paket %d tanggal %s: %v", candidate.PackageID, candidate.DepartureDay, result.Error)
			continue
		}
		if result.RowsAffected == 0 {
			continue
		}
		created++
		s.notifyProviderOfWeather(&departure)
	}
	if created > 0 {
		log.Printf("[Cuaca H-3] %d prakiraan trip non-open-trip dikirim ke provider.", created)
	}
	return nil
}

// DepartureInputError menandai kesalahan yang disebabkan masukan pengguna,
// sehingga controller dapat menjawab 400 dan bukan 500.
type DepartureInputError struct{ Message string }

func (e *DepartureInputError) Error() string { return e.Message }

// RescheduleOfferResult merangkum tawaran jadwal pengganti yang dikirim: berapa
// pesanan ditawari, dan berapa yang langsung direfund karena jatah penjadwalan
// ulangnya sudah habis.
type RescheduleOfferResult struct {
	Departure *models.TripDeparture
	Offered   int
	Refunded  int
}

// asDepartureInputError meneruskan kesalahan masukan dari layanan booking
// sebagai DepartureInputError agar controller menjawab 400 dengan pesan yang
// dapat dibaca, bukan "gangguan server".
func asDepartureInputError(err error, conflictMessage string) error {
	var inputErr *BookingInputError
	if !errors.As(err, &inputErr) {
		return err
	}
	if conflictMessage != "" && strings.Contains(inputErr.Message, "sudah dipesan") {
		return &DepartureInputError{Message: conflictMessage}
	}
	return &DepartureInputError{Message: inputErr.Message}
}

var indonesianMonths = [...]string{"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}

// indonesianDate menulis tanggal dalam WIB, misalnya "4 Oktober 2026".
func indonesianDate(t time.Time) string {
	t = t.In(models.BookingLocation)
	return fmt.Sprintf("%d %s %d", t.Day(), indonesianMonths[t.Month()-1], t.Year())
}

// indonesianDateTime menulis waktu dalam WIB, misalnya "4 Oktober 2026 pukul 08.00 WIB".
func indonesianDateTime(t time.Time) string {
	wib := t.In(models.BookingLocation)
	return fmt.Sprintf("%s pukul %02d.%02d WIB", indonesianDate(wib), wib.Hour(), wib.Minute())
}

// ReviewDepartures memeriksa seluruh keberangkatan open trip yang batas H-3-nya
// sudah terlampaui namun kuota minimalnya belum terpenuhi.
//
// Operasi ini idempoten: satu keberangkatan hanya menghasilkan satu baris
// peninjauan berkat indeks unik (package_id, departure_day), sehingga job yang
// berjalan tiap jam tidak mengirim notifikasi berulang.
func (s *departureService) ReviewDepartures() error {
	now := time.Now()
	candidates, err := s.repo.FindUnderfilledDepartures(now)
	if err != nil {
		return err
	}

	created := 0
	for _, candidate := range candidates {
		deadline := models.ReviewDeadlineFor(candidate.DepartureAt)
		if now.Before(deadline) {
			// Belum sampai H-3 pukul 00:01; mitra masih punya waktu mengisi kursi.
			continue
		}

		existing, err := s.repo.FindDeparture(candidate.PackageID, candidate.DepartureDay)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[Open Trip] Gagal memeriksa keberangkatan paket %d tanggal %s: %v",
				candidate.PackageID, candidate.DepartureDay, err)
			continue
		}
		if existing != nil {
			continue
		}

		departure := models.TripDeparture{
			PackageID:      candidate.PackageID,
			ProviderID:     candidate.ProviderID,
			DepartureDay:   candidate.DepartureDay,
			DepartureAt:    candidate.DepartureAt,
			ReviewDeadline: deadline,
			SeatsBooked:    candidate.SeatsBooked,
			SeatsRequired:  candidate.SeatsRequired,
			BookingCount:   candidate.BookingCount,
			Status:         models.DepartureAwaitingProvider,
			Reason:         models.DepartureReasonQuotaShortfall,
		}
		// Indeks unik adalah penjaga terakhir bila dua instance menjalankan job
		// bersamaan; baris kedua diabaikan tanpa menggagalkan seluruh putaran.
		result := s.db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "package_id"}, {Name: "departure_day"}},
			DoNothing: true,
		}).Create(&departure)
		if result.Error != nil {
			log.Printf("[Open Trip] Gagal mencatat keberangkatan paket %d tanggal %s: %v",
				candidate.PackageID, candidate.DepartureDay, result.Error)
			continue
		}
		if result.RowsAffected == 0 {
			continue
		}

		created++
		s.notifyProviderOfShortfall(&departure)
	}

	if created > 0 {
		log.Printf("[Open Trip] %d keberangkatan kekurangan peserta diteruskan ke mitra untuk diputuskan.", created)
	}

	s.closeSettledDepartures()
	return nil
}

// closeSettledDepartures menutup permintaan keputusan yang sudah tidak relevan.
//
// Pesanan masih dapat masuk maupun dibatalkan setelah batas H-3 terlampaui, jadi
// keadaan setiap keberangkatan diperiksa ulang dari data booking terkini. Tanpa
// ini mitra terus ditanya apakah trip yang sebenarnya sudah penuh perlu
// dibatalkan, dan permintaan yang tanggalnya sudah lewat menggantung selamanya.
func (s *departureService) closeSettledDepartures() {
	var pending []models.TripDeparture
	if err := s.db.Where("status = ?", models.DepartureAwaitingProvider).Find(&pending).Error; err != nil {
		log.Printf("[Open Trip] Gagal memuat keberangkatan yang menunggu keputusan: %v", err)
		return
	}

	now := time.Now()
	closed := 0
	for _, departure := range pending {
		bookings, err := s.repo.FindActiveBookings(departure.PackageID, departure.DepartureDay)
		if err != nil {
			log.Printf("[Open Trip] Gagal memuat booking keberangkatan %d: %v", departure.ID, err)
			continue
		}

		seats := 0
		for _, booking := range bookings {
			seats += booking.Guests
		}

		var status, decision, notes string
		switch {
		case len(bookings) == 0:
			status, decision = models.DepartureResolved, ""
			notes = "Tidak ada pesanan aktif tersisa pada keberangkatan ini."
		case departure.Reason == models.DepartureReasonQuotaShortfall && seats >= departure.SeatsRequired:
			status, decision = models.DepartureContinued, models.DepartureDecisionContinue
			notes = "Kuota minimal terpenuhi sebelum keberangkatan; keputusan manual tidak diperlukan."
		case !now.Before(departure.DepartureAt):
			status, decision = models.DepartureResolved, ""
			notes = "Tanggal keberangkatan terlampaui tanpa keputusan mitra; trip berjalan sesuai jadwal semula."
		default:
			continue
		}

		if err := s.db.Model(&models.TripDeparture{}).
			Where("id = ? AND status = ?", departure.ID, models.DepartureAwaitingProvider).
			Updates(map[string]interface{}{
				"status":         status,
				"decision":       decision,
				"seats_booked":   seats,
				"booking_count":  len(bookings),
				"decision_notes": notes,
				"decided_at":     &now,
				"updated_at":     now,
			}).Error; err != nil {
			log.Printf("[Open Trip] Gagal menutup keberangkatan %d: %v", departure.ID, err)
			continue
		}
		closed++
	}

	if closed > 0 {
		log.Printf("[Open Trip] %d permintaan keputusan ditutup karena keadaannya sudah berubah.", closed)
	}
}

func (s *departureService) notifyProviderOfShortfall(departure *models.TripDeparture) {
	pkg, packageName := s.packageOf(departure.PackageID)

	if s.notifService != nil {
		message := fmt.Sprintf(
			"Open Trip %s tanggal %s baru terisi %d dari minimal %d kursi. Tentukan keputusan Anda: tetap berangkat, batalkan, atau ajukan jadwal pengganti.",
			packageName, departure.DepartureAt.Format("02 Jan 2006"),
			departure.SeatsBooked, departure.SeatsRequired,
		)
		if err := s.notifService.CreateNotification(
			departure.ProviderID, "PROVIDER",
			"Kuota Open Trip Belum Terpenuhi (H-3)",
			message, NotifTypeDeparture, "/provider/dashboard",
		); err != nil {
			log.Printf("[Open Trip] Gagal membuat notifikasi mitra %d: %v", departure.ProviderID, err)
		}
	}

	if s.emailService != nil && s.providerRepo != nil {
		provider, err := s.providerRepo.FindByID(departure.ProviderID)
		if err != nil {
			log.Printf("[Open Trip] Mitra %d tidak ditemukan untuk pengiriman email: %v", departure.ProviderID, err)
			return
		}
		if err := s.emailService.SendOpenTripQuotaAlertEmail(provider, departure, pkg); err != nil {
			log.Printf("[Open Trip] Gagal mengirim email peringatan kuota ke mitra %d: %v", departure.ProviderID, err)
		}
	}
}

func (s *departureService) notifyProviderOfWeather(departure *models.TripDeparture) {
	pkg, packageName := s.packageOf(departure.PackageID)
	riskLabel := "prakiraan cuaca"
	if departure.WeatherIsAdverse {
		riskLabel = "potensi cuaca kurang mendukung"
	}
	if s.notifService != nil {
		message := fmt.Sprintf(
			"%s untuk %s tanggal %s di %s: %s, peluang hujan %d%%. Informasi ini hanya bahan pertimbangan; pilih tetap berangkat, reschedule, atau batalkan bila diperlukan.",
			riskLabel, packageName, departure.DepartureAt.Format("02 Jan 2006"), departure.WeatherLocation,
			departure.WeatherCondition, departure.WeatherRainChance,
		)
		if err := s.notifService.CreateNotification(
			departure.ProviderID, "PROVIDER", "Prakiraan Cuaca Trip (H-3)", message,
			NotifTypeWeather, "/provider/dashboard",
		); err != nil {
			log.Printf("[Cuaca H-3] Gagal membuat notifikasi provider %d: %v", departure.ProviderID, err)
		}
	}
	if s.emailService == nil || s.providerRepo == nil {
		return
	}
	provider, err := s.providerRepo.FindByID(departure.ProviderID)
	if err != nil {
		log.Printf("[Cuaca H-3] Provider %d tidak ditemukan untuk email: %v", departure.ProviderID, err)
		return
	}
	if err := s.emailService.SendWeatherAdvisoryEmail(provider, departure, pkg); err != nil {
		log.Printf("[Cuaca H-3] Email prakiraan ke provider %d gagal: %v", departure.ProviderID, err)
	}
}

func (s *departureService) packageOf(packageID uint) (*models.Package, string) {
	var pkg models.Package
	if err := s.db.First(&pkg, packageID).Error; err != nil {
		return nil, "Paket Wisata"
	}
	if pkg.Name == "" {
		return &pkg, "Paket Wisata"
	}
	return &pkg, pkg.Name
}

func (s *departureService) ListForProvider(providerID uint) ([]models.TripDeparture, error) {
	departures, err := s.repo.ListByProvider(providerID, 50)
	if err != nil {
		return nil, err
	}
	// Daftar booking dilampirkan agar mitra tahu persis pesanan mana yang
	// terdampak sebelum memilih membatalkan atau menjadwalkan ulang.
	for i := range departures {
		bookings, err := s.repo.FindActiveBookings(departures[i].PackageID, departures[i].DepartureDay)
		if err != nil {
			log.Printf("[Keberangkatan] Gagal memuat booking keberangkatan %d: %v", departures[i].ID, err)
			continue
		}
		departures[i].Bookings = bookings
	}
	return departures, nil
}

func (s *departureService) SubmitDecision(departureID uint, providerID uint, req *models.DepartureDecisionRequest) (*models.TripDeparture, error) {
	departure, err := s.repo.FindByID(departureID)
	if err != nil {
		return nil, &DepartureInputError{Message: "keberangkatan tidak ditemukan"}
	}
	if departure.ProviderID != providerID {
		return nil, &DepartureInputError{Message: "keberangkatan tidak ditemukan"}
	}
	if departure.Status != models.DepartureAwaitingProvider {
		return nil, &DepartureInputError{Message: "keputusan untuk keberangkatan ini sudah pernah dikirim"}
	}
	if !time.Now().Before(departure.DepartureAt) {
		return nil, &DepartureInputError{Message: "tanggal keberangkatan sudah lewat; keputusan tidak dapat diubah lagi"}
	}

	bookings, err := s.repo.FindActiveBookings(departure.PackageID, departure.DepartureDay)
	if err != nil {
		return nil, err
	}
	if len(bookings) == 0 {
		return nil, &DepartureInputError{Message: "tidak ada pesanan aktif pada keberangkatan ini"}
	}

	switch req.Action {
	case models.DepartureDecisionContinue:
		return s.decideContinue(departure, bookings, req.Notes)
	case models.DepartureDecisionCancel:
		return s.decideCancel(departure, bookings, req.Notes)
	case models.DepartureDecisionReschedule:
		return s.decideReschedule(departure, bookings, req)
	default:
		return nil, &DepartureInputError{Message: "pilihan keputusan tidak dikenali"}
	}
}

func (s *departureService) decideContinue(departure *models.TripDeparture, bookings []models.Booking, notes string) (*models.TripDeparture, error) {
	if err := s.finalizeDecision(departure, models.DepartureDecisionContinue, models.DepartureContinued, nil, notes); err != nil {
		return nil, err
	}

	_, packageName := s.packageOf(departure.PackageID)
	for i := range bookings {
		booking := bookings[i]
		if booking.CustomerID == nil || *booking.CustomerID == 0 || s.notifService == nil {
			continue
		}
		_ = s.notifService.CreateNotification(
			*booking.CustomerID, "CUSTOMER",
			"Trip Dipastikan Berangkat",
			fmt.Sprintf("Pesanan #%s untuk %s tanggal %s dipastikan tetap berangkat oleh penyelenggara.",
				booking.BookingCode, packageName, departure.DepartureAt.Format("02 Jan 2006")),
			NotifTypeDeparture, "/riwayat-booking",
		)
	}
	return departure, nil
}

func (s *departureService) decideCancel(departure *models.TripDeparture, bookings []models.Booking, notes string) (*models.TripDeparture, error) {
	if err := s.finalizeDecision(departure, models.DepartureDecisionCancel, models.DepartureCancelled, nil, notes); err != nil {
		return nil, err
	}

	// Pembatalan dijalankan lewat alur status booking yang sudah ada supaya
	// pembalikan saldo mitra, pencatatan hak refund, notifikasi pelanggan, dan
	// notifikasi admin tetap memakai satu jalur yang sama. Sebabnya ikut
	// disimpan agar pelanggan tahu mengapa tripnya batal.
	failed := 0
	for i := range bookings {
		if _, err := s.bookingService.CancelBookingByProvider(
			bookings[i].ID, departure.ProviderID, causeText(departure),
		); err != nil {
			failed++
			log.Printf("[Keberangkatan] Booking %d gagal dibatalkan: %v", bookings[i].ID, err)
		}
	}
	if failed > 0 {
		return departure, fmt.Errorf("%d dari %d pesanan gagal dibatalkan dan perlu diperiksa manual", failed, len(bookings))
	}
	return departure, nil
}

func (s *departureService) decideReschedule(departure *models.TripDeparture, bookings []models.Booking, req *models.DepartureDecisionRequest) (*models.TripDeparture, error) {
	pkg, _ := s.packageOf(departure.PackageID)
	if pkg == nil {
		return nil, &DepartureInputError{Message: "paket tidak ditemukan"}
	}
	proposed, err := resolveProposedStart(departure, pkg, req.ProposedDate, time.Now())
	if err != nil {
		return nil, err
	}
	if err := s.checkExclusiveOffer(pkg, bookings, *proposed); err != nil {
		return nil, err
	}

	if err := s.finalizeDecision(departure, models.DepartureDecisionReschedule, models.DepartureRescheduleOffered, proposed, req.Notes); err != nil {
		return nil, err
	}

	s.dispatchRescheduleOffers(departure, bookings)
	return departure, nil
}

func (s *departureService) checkExclusiveOffer(pkg *models.Package, bookings []models.Booking, proposed time.Time) error {
	if models.IsOpenTrip(pkg.TripType) {
		guests := 0
		for _, booking := range bookings {
			if booking.RescheduleCount < 1 {
				guests += booking.Guests
			}
		}
		return asDepartureInputError(ensureOpenTripCapacityTx(s.db, pkg, proposed, guests, 0), "kuota tanggal pengganti tidak cukup untuk seluruh peserta; pilih tanggal lain")
	}
	for _, booking := range bookings {
		start, end := proposedTripRange(booking, proposed)
		if err := ensureNoExclusiveConflictTx(s.db, pkg.ProviderID, start, end, booking.ID); err != nil {
			return asDepartureInputError(err, "tanggal pengganti bentrok dengan pesanan lain Anda pada tanggal tersebut; pilih tanggal lain yang masih kosong")
		}
	}
	return nil
}

// proposedTripRange adalah rentang trip pengganti dengan durasi yang sama
// seperti jadwal semula.
func proposedTripRange(booking models.Booking, proposed time.Time) (time.Time, time.Time) {
	end := proposed
	if booking.TripEndDate.After(booking.TripDate) {
		end = proposed.Add(booking.TripEndDate.Sub(booking.TripDate))
	}
	return proposed, end
}

// resolveProposedStart memvalidasi tanggal pengganti dan mengembalikan waktu
// mulainya dengan jam keberangkatan semula (WIB) supaya durasi trip tidak
// bergeser.
func resolveProposedStart(departure *models.TripDeparture, pkg *models.Package, raw string, now time.Time) (*time.Time, error) {
	if raw == "" {
		return nil, &DepartureInputError{Message: "tanggal pengganti wajib diisi"}
	}
	parsed, err := time.ParseInLocation("2006-01-02", raw, models.BookingLocation)
	if err != nil {
		return nil, &DepartureInputError{Message: "format tanggal pengganti tidak valid (gunakan YYYY-MM-DD)"}
	}
	if raw == departure.DepartureDay {
		return nil, &DepartureInputError{Message: "tanggal pengganti harus berbeda dari tanggal keberangkatan semula"}
	}

	origin := departure.DepartureAt.In(models.BookingLocation)
	atDepartureHour := func(day time.Time) time.Time {
		return time.Date(day.Year(), day.Month(), day.Day(), origin.Hour(), origin.Minute(), origin.Second(), 0, models.BookingLocation)
	}
	aligned := atDepartureHour(parsed)

	// Pelanggan selalu punya waktu minimal 2x24 jam untuk menjawab sebelum
	// trip pengganti berangkat.
	if earliest := models.EarliestProposedStart(now); aligned.Before(earliest) {
		first := atDepartureHour(earliest.In(models.BookingLocation))
		if first.Before(earliest) {
			first = first.AddDate(0, 0, 1)
		}
		return nil, &DepartureInputError{Message: fmt.Sprintf("pilih tanggal pengganti paling cepat %s agar pelanggan punya waktu minimal 2×24 jam untuk menjawab", indonesianDate(first))}
	}

	// Periode operasional paket hanya mengikat keputusan peninjauan kuota dan
	// cuaca. Perubahan jadwal oleh mitra dan keadaan kahar adalah penanganan
	// darurat: paket berjadwal satu hari akan menolak semua tanggal pengganti
	// bila aturan ini tetap dipaksakan.
	if pkg != nil && departure.Reason != models.DepartureReasonForceMajeure && departure.Reason != models.DepartureReasonProviderReschedule {
		if pkg.StartDate != "" && raw < pkg.StartDate {
			return nil, &DepartureInputError{Message: "tanggal pengganti berada sebelum periode operasional paket"}
		}
		if pkg.EndDate != "" && raw > pkg.EndDate {
			return nil, &DepartureInputError{Message: "tanggal pengganti berada setelah periode operasional paket"}
		}
	}

	// Trip eksklusif memakai batas kalender tiga bulan yang sama dengan pemesanan.
	if pkg != nil && !models.IsOpenTrip(pkg.TripType) {
		if _, latest := models.AvailabilityWindow(now); raw > latest {
			latestDay, _ := time.ParseInLocation("2006-01-02", latest, models.BookingLocation)
			return nil, &DepartureInputError{Message: fmt.Sprintf("tanggal pengganti paling lambat %s (tiga bulan ke depan)", indonesianDate(latestDay))}
		}
	}
	return &aligned, nil
}

// finalizeDecision mengunci keputusan mitra. Pembaruan bersyarat pada status
// memastikan dua permintaan bersamaan tidak menghasilkan dua keputusan berbeda
// untuk satu keberangkatan.
func (s *departureService) finalizeDecision(departure *models.TripDeparture, decision, status string, proposed *time.Time, notes string) error {
	now := time.Now()
	updates := map[string]interface{}{
		"decision":       decision,
		"status":         status,
		"proposed_date":  proposed,
		"decision_notes": notes,
		"decided_at":     &now,
		"updated_at":     now,
	}
	var responseDeadline *time.Time
	if status == models.DepartureRescheduleOffered && proposed != nil {
		deadline := models.ResponseDeadlineFor(departure.DepartureAt, *proposed, now)
		responseDeadline = &deadline
		updates["response_deadline"] = &deadline
	}

	result := s.db.Model(&models.TripDeparture{}).
		Where("id = ? AND status = ?", departure.ID, models.DepartureAwaitingProvider).
		Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return &DepartureInputError{Message: "keputusan untuk keberangkatan ini sudah pernah dikirim"}
	}

	departure.Decision = decision
	departure.Status = status
	departure.ProposedDate = proposed
	departure.DecisionNotes = notes
	departure.DecidedAt = &now
	departure.ResponseDeadline = responseDeadline
	return nil
}

// causeText menerangkan kepada pelanggan mengapa jadwalnya berubah.
func causeText(departure *models.TripDeparture) string {
	if departure.Reason == models.DepartureReasonForceMajeure {
		cause := "Keadaan kahar (force majeure) di luar kendali penyelenggara"
		if notes := strings.TrimRight(departure.DecisionNotes, ".!? "); notes != "" {
			cause += ": " + notes
		}
		return cause
	}
	if departure.Reason == models.DepartureReasonProviderReschedule {
		cause := "Penyelenggara perlu mengubah jadwal perjalanan"
		if notes := strings.TrimRight(departure.DecisionNotes, ".!? "); notes != "" {
			cause += ": " + notes
		}
		return cause
	}
	if departure.Reason == models.DepartureReasonWeatherForecast {
		cause := "Pertimbangan kondisi cuaca berdasarkan prakiraan H-3"
		if notes := strings.TrimRight(departure.DecisionNotes, ".!? "); notes != "" {
			cause += ": " + notes
		}
		return cause
	}
	return "Jumlah peserta tidak mencapai kuota minimal keberangkatan"
}

func (s *departureService) offerRescheduleToBooking(booking *models.Booking, departure *models.TripDeparture, proposed time.Time) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Urutan kunci sama dengan pembuatan booking (mitra, paket, lalu
		// pesanan) agar tanggal pengganti trip eksklusif tidak dapat diambil
		// pesanan lain pada saat yang bersamaan.
		var pkg models.Package
		if err := lockBookingPackageTx(tx, booking.PackageID, &pkg); err != nil {
			return err
		}
		var locked models.Booking
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&locked, booking.ID).Error; err != nil {
			return err
		}
		if locked.Status != models.StatusPaid && locked.Status != models.StatusConfirmed {
			return fmt.Errorf("status booking %s tidak dapat ditawari jadwal pengganti", locked.Status)
		}
		if err := ensureOpenTripCapacityTx(tx, &pkg, proposed, locked.Guests, locked.ID); err != nil {
			return err
		}
		if !models.IsOpenTrip(pkg.TripType) {
			start, end := proposedTripRange(locked, proposed)
			if err := ensureNoExclusiveConflictTx(tx, pkg.ProviderID, start, end, locked.ID); err != nil {
				return err
			}
		}
		if err := tx.Model(&locked).Updates(map[string]interface{}{
			"status":              models.StatusRescheduleOffered,
			"reschedule_date":     proposed,
			"trip_departure_id":   departure.ID,
			"cancellation_reason": truncateText(causeText(departure), 255),
			"updated_at":          time.Now(),
		}).Error; err != nil {
			return err
		}
		// Kursi semula dilepas dan tanggal pengganti trip eksklusif ditahan
		// selama menunggu jawaban pelanggan, memakai perhitungan yang sama
		// dengan seluruh perubahan status booking lain.
		return recalculatePackageQuotaTx(tx, locked.PackageID)
	})
}

func (s *departureService) notifyCustomerOfRescheduleOffer(booking *models.Booking, departure *models.TripDeparture, proposed time.Time, packageName string) {
	deadline := proposed
	if departure.ResponseDeadline != nil {
		deadline = *departure.ResponseDeadline
	}
	if s.notifService != nil && booking.CustomerID != nil && *booking.CustomerID > 0 {
		_ = s.notifService.CreateNotification(
			*booking.CustomerID, "CUSTOMER",
			"Tawaran Jadwal Pengganti",
			fmt.Sprintf(
				"%s. Keberangkatan %s tanggal %s tidak dapat dijalankan dan penyelenggara menawarkan tanggal pengganti %s untuk pesanan #%s. Jawab sebelum %s: terima jadwal baru, atau tolak untuk mendapatkan refund penuh.",
				causeText(departure),
				packageName,
				indonesianDate(departure.DepartureAt),
				indonesianDate(proposed),
				booking.BookingCode,
				indonesianDateTime(deadline),
			),
			NotifTypeReschedule, "/riwayat-booking",
		)
	}

	if s.emailService != nil {
		if err := s.emailService.SendRescheduleOfferEmail(booking, proposed, departure.DepartureAt, deadline, causeText(departure)); err != nil {
			log.Printf("[Keberangkatan] Gagal mengirim email tawaran jadwal ke booking %d: %v", booking.ID, err)
		}
	}
}

// RespondToReschedule menerapkan jawaban pelanggan atas tanggal pengganti.
// Menerima berarti trip berjalan pada tanggal baru; menolak mengalirkan pesanan
// ke antrean refund admin.
func (s *departureService) RespondToReschedule(bookingID uint, customerID uint, accept bool) (*models.Booking, error) {
	var booking models.Booking
	if err := s.db.Preload("Package").
		Where("id = ? AND customer_id = ?", bookingID, customerID).
		First(&booking).Error; err != nil {
		return nil, &DepartureInputError{Message: "booking tidak ditemukan"}
	}
	if booking.Status != models.StatusRescheduleOffered {
		return nil, &DepartureInputError{Message: "tidak ada tawaran jadwal pengganti yang menunggu jawaban pada pesanan ini"}
	}
	if booking.RescheduleDate == nil {
		return nil, &DepartureInputError{Message: "tanggal pengganti belum ditetapkan penyelenggara"}
	}

	if !accept {
		return s.declineReschedule(&booking)
	}
	return s.acceptReschedule(&booking)
}

func (s *departureService) acceptReschedule(booking *models.Booking) (*models.Booking, error) {
	var proposed time.Time

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var lockedPackage models.Package
		if err := lockBookingPackageTx(tx, booking.PackageID, &lockedPackage); err != nil {
			return err
		}
		var locked models.Booking
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&locked, booking.ID).Error; err != nil {
			return err
		}
		if locked.Status != models.StatusRescheduleOffered || locked.RescheduleDate == nil {
			return &DepartureInputError{Message: "tawaran jadwal pengganti sudah tidak berlaku"}
		}
		if locked.TripDepartureID != nil {
			var departure models.TripDeparture
			if err := tx.Select("id", "response_deadline").First(&departure, *locked.TripDepartureID).Error; err == nil &&
				departure.ResponseDeadline != nil && time.Now().After(*departure.ResponseDeadline) {
				return &DepartureInputError{Message: "batas waktu menjawab tawaran ini sudah lewat; pesanan akan diteruskan ke proses pengembalian dana penuh"}
			}
		}
		locked.Package = lockedPackage
		proposed = *locked.RescheduleDate

		tripDuration := locked.TripEndDate.Sub(locked.TripDate)
		if tripDuration <= 0 {
			tripDuration = time.Duration(normalizedTripDuration(locked.Package.Duration)) * 24 * time.Hour
		}
		original := locked.TripDate
		newTripEnd := proposed.Add(tripDuration)
		if err := ensureOpenTripCapacityTx(tx, &lockedPackage, proposed, locked.Guests, locked.ID); err != nil {
			return asDepartureInputError(err, "kuota tanggal pengganti sudah tidak tersedia; hubungi penyelenggara")
		}
		// Tanggal pengganti sudah ditahan sejak tawaran dikirim. Pemeriksaan
		// ini tetap ada untuk tawaran lama yang dibuat sebelum penahanan.
		if !models.IsOpenTrip(lockedPackage.TripType) {
			if err := ensureNoExclusiveConflictTx(tx, lockedPackage.ProviderID, proposed, newTripEnd, locked.ID); err != nil {
				return asDepartureInputError(err, "tanggal pengganti sudah tidak tersedia; tolak tawaran ini untuk mendapatkan refund penuh atau hubungi penyelenggara")
			}
		}

		locked.OriginalTripDate = &original
		locked.TripDate = proposed
		locked.TripEndDate = newTripEnd
		locked.RescheduleCount++
		locked.Status = models.StatusConfirmed
		locked.CancellationReason = ""
		if err := tx.Save(&locked).Error; err != nil {
			return err
		}

		// Dana yang ditahan ikut bergeser: pelunasan baru boleh cair setelah
		// perjalanan pengganti benar-benar berakhir.
		if err := tx.Model(&models.HeldSettlement{}).
			Where("booking_id = ? AND status = ?", locked.ID, "HELD").
			Update("release_date", locked.TripEndDate).Error; err != nil {
			return err
		}
		if err := recalculatePackageQuotaTx(tx, locked.PackageID); err != nil {
			return err
		}

		booking = &locked
		return nil
	})
	if err != nil {
		return nil, err
	}

	s.recordCustomerResponse(booking.TripDepartureID, true)

	packageName := "Paket Wisata"
	if booking.Package.Name != "" {
		packageName = booking.Package.Name
	}
	if s.notifService != nil {
		_ = s.notifService.CreateNotification(
			booking.ProviderID, "PROVIDER",
			"Jadwal Pengganti Diterima",
			fmt.Sprintf("Pelanggan pesanan #%s menerima jadwal pengganti %s untuk %s.",
				booking.BookingCode, indonesianDate(proposed), packageName),
			NotifTypeReschedule, "/provider/booking",
		)
	}
	if s.emailService != nil {
		if err := s.emailService.SendRescheduleEmail(booking); err != nil {
			log.Printf("[Keberangkatan] Gagal mengirim email konfirmasi jadwal baru booking %d: %v", booking.ID, err)
		}
	}
	return booking, nil
}

func (s *departureService) declineReschedule(booking *models.Booking) (*models.Booking, error) {
	departureID := booking.TripDepartureID

	// Penolakan memakai jalur pembatalan oleh penyelenggara: pelanggan berhak
	// refund penuh karena pembatalan berasal dari kegagalan kuota, bukan dari
	// keputusan pelanggan sendiri.
	updated, err := s.bookingService.UpdateBookingStatus(
		booking.ID, booking.ProviderID, models.StatusCancelledByProvider,
	)
	if err != nil {
		return nil, err
	}

	s.recordCustomerResponse(departureID, false)

	if s.notifService != nil {
		_ = s.notifService.CreateNotification(
			booking.ProviderID, "PROVIDER",
			"Jadwal Pengganti Ditolak",
			fmt.Sprintf("Pelanggan pesanan #%s menolak jadwal pengganti. Pesanan diteruskan ke proses refund oleh admin.",
				booking.BookingCode),
			NotifTypeReschedule, "/provider/booking",
		)
	}
	return updated, nil
}

// recordCustomerResponse memperbarui rekap jawaban dan menutup keberangkatan
// ketika tidak ada lagi pesanan yang menunggu jawaban.
func (s *departureService) recordCustomerResponse(departureID *uint, accepted bool) {
	if departureID == nil || *departureID == 0 {
		return
	}

	column := "declined_count"
	if accepted {
		column = "accepted_count"
	}
	if err := s.db.Model(&models.TripDeparture{}).
		Where("id = ?", *departureID).
		Updates(map[string]interface{}{
			column:       gorm.Expr(column + " + 1"),
			"updated_at": time.Now(),
		}).Error; err != nil {
		log.Printf("[Open Trip] Gagal memperbarui rekap jawaban keberangkatan %d: %v", *departureID, err)
		return
	}

	var pending int64
	if err := s.db.Model(&models.Booking{}).
		Where("trip_departure_id = ? AND status = ?", *departureID, models.StatusRescheduleOffered).
		Count(&pending).Error; err != nil {
		log.Printf("[Open Trip] Gagal menghitung sisa tawaran keberangkatan %d: %v", *departureID, err)
		return
	}
	if pending > 0 {
		return
	}
	if err := s.db.Model(&models.TripDeparture{}).
		Where("id = ? AND status = ?", *departureID, models.DepartureRescheduleOffered).
		Updates(map[string]interface{}{
			"status":     models.DepartureResolved,
			"updated_at": time.Now(),
		}).Error; err != nil {
		log.Printf("[Open Trip] Gagal menutup keberangkatan %d: %v", *departureID, err)
	}
}

// ExpireStaleRescheduleOffers memperlakukan tawaran yang tidak dijawab sampai
// tanggal keberangkatan asli lewat sebagai penolakan, sehingga dana pelanggan
// tidak menggantung tanpa batas waktu.
func (s *departureService) ExpireStaleRescheduleOffers() error {
	bookings, err := s.repo.FindStaleRescheduleOffers(time.Now())
	if err != nil {
		return err
	}

	expired := 0
	for i := range bookings {
		booking := bookings[i]
		departureID := booking.TripDepartureID
		if _, err := s.bookingService.UpdateBookingStatus(
			booking.ID, booking.ProviderID, models.StatusCancelledByProvider,
		); err != nil {
			log.Printf("[Open Trip] Tawaran kedaluwarsa booking %d gagal diproses: %v", booking.ID, err)
			continue
		}
		s.recordCustomerResponse(departureID, false)
		if s.notifService != nil && booking.CustomerID != nil && *booking.CustomerID > 0 {
			_ = s.notifService.CreateNotification(
				*booking.CustomerID, "CUSTOMER",
				"Tawaran Jadwal Pengganti Kedaluwarsa",
				fmt.Sprintf("Tawaran jadwal pengganti untuk pesanan #%s tidak dijawab sampai batas waktu. Pesanan diteruskan ke proses pengembalian dana.",
					booking.BookingCode),
				NotifTypeReschedule, "/riwayat-booking",
			)
		}
		expired++
	}

	if expired > 0 {
		log.Printf("[Open Trip] %d tawaran jadwal pengganti kedaluwarsa dialihkan ke proses refund.", expired)
	}
	return nil
}

// ListUpcomingForProvider mendaftar keberangkatan mitra yang masih akan datang,
// termasuk hari berjalan, sebagai pilihan saat menyatakan keadaan kahar.
func (s *departureService) ListUpcomingForProvider(providerID uint) ([]repositories.DepartureCandidate, error) {
	now := time.Now().In(models.BookingLocation)
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, models.BookingLocation)
	return s.repo.FindUpcomingDepartures(providerID, startOfToday)
}

// DeclareForceMajeure membatalkan satu keberangkatan karena keadaan di luar
// kendali mitra, lalu menawarkan tanggal pengganti kepada seluruh pelanggannya.
//
// Berbeda dengan peninjauan kuota yang terikat batas H-3, pernyataan ini boleh
// dikirim kapan saja selama hari keberangkatan belum berakhir — termasuk pada
// hari-H, yang justru paling sering terjadi. Pilihan pelanggan tetap sama:
// menerima tanggal pengganti, atau menolak dan menerima pengembalian dana penuh.
func (s *departureService) DeclareForceMajeure(providerID uint, req *models.ForceMajeureRequest) (*models.TripDeparture, error) {
	pkg, err := s.packageOwnedBy(req.PackageID, providerID)
	if err != nil {
		return nil, err
	}

	departureDay, err := time.ParseInLocation("2006-01-02", req.DepartureDay, models.BookingLocation)
	if err != nil {
		return nil, &DepartureInputError{Message: "format tanggal keberangkatan tidak valid"}
	}
	// Hari keberangkatan masih boleh dinyatakan kahar sampai hari itu berakhir.
	if time.Now().After(departureDay.AddDate(0, 0, 1)) {
		return nil, &DepartureInputError{Message: "tanggal keberangkatan sudah lewat dan tidak dapat dibatalkan lagi"}
	}

	bookings, err := s.repo.FindActiveBookings(req.PackageID, req.DepartureDay)
	if err != nil {
		return nil, err
	}
	if len(bookings) == 0 {
		return nil, &DepartureInputError{Message: "tidak ada pesanan aktif pada tanggal keberangkatan tersebut"}
	}

	result, err := s.openRescheduleOffer(pkg, providerID, req.DepartureDay, bookings, req.ProposedDate, models.DepartureReasonForceMajeure, strings.TrimSpace(req.Reason))
	if err != nil {
		return nil, err
	}
	return result.Departure, nil
}

// OfferBookingReschedule adalah pilihan "Jadwalkan ulang" pada menu Booking
// mitra untuk tipe paket apa pun. Jadwal tidak langsung berubah: pelanggan
// menerima email dan notifikasi untuk menerima tanggal baru, atau menolak dan
// mendapat refund penuh.
//
// Open Trip berangkat bersama, jadi tawaran berlaku untuk seluruh pesanan pada
// keberangkatan yang sama. Tipe lain bersifat eksklusif sehingga hanya pesanan
// ini yang ditawari, dan tanggal penggantinya ditahan sampai pelanggan menjawab.
func (s *departureService) OfferBookingReschedule(bookingID uint, providerID uint, req *models.ProviderRescheduleRequest) (*RescheduleOfferResult, error) {
	var booking models.Booking
	if err := s.db.Preload("Package").Where("id = ? AND provider_id = ?", bookingID, providerID).First(&booking).Error; err != nil {
		return nil, &DepartureInputError{Message: "pesanan tidak ditemukan"}
	}
	switch {
	case booking.Status == models.StatusRescheduleOffered:
		return nil, &DepartureInputError{Message: "tawaran jadwal pengganti untuk pesanan ini masih menunggu jawaban pelanggan"}
	case booking.Status != models.StatusPaid && booking.Status != models.StatusConfirmed:
		return nil, &DepartureInputError{Message: "hanya pesanan yang sudah dibayar yang dapat dijadwalkan ulang"}
	case booking.RescheduleCount >= 1:
		return nil, &DepartureInputError{Message: "pesanan ini sudah pernah dijadwalkan ulang. Bila trip tetap tidak dapat berjalan, batalkan dengan refund penuh"}
	}

	departureDay := booking.TripDate.In(models.BookingLocation).Format("2006-01-02")
	dayStart, _ := time.ParseInLocation("2006-01-02", departureDay, models.BookingLocation)
	if time.Now().After(dayStart.AddDate(0, 0, 1)) {
		return nil, &DepartureInputError{Message: "tanggal keberangkatan sudah lewat sehingga jadwalnya tidak dapat diubah lagi"}
	}
	reason := strings.TrimSpace(req.Reason)
	if len([]rune(reason)) < 10 {
		return nil, &DepartureInputError{Message: "alasan perubahan jadwal wajib diisi minimal 10 karakter"}
	}

	bookings := []models.Booking{booking}
	if models.IsOpenTrip(booking.Package.TripType) {
		active, err := s.repo.FindActiveBookings(booking.PackageID, departureDay)
		if err != nil {
			return nil, err
		}
		if len(active) > 0 {
			bookings = active
		}
	}
	return s.openRescheduleOffer(&booking.Package, providerID, departureDay, bookings, req.NewTripDate, models.DepartureReasonProviderReschedule, reason)
}

// openRescheduleOffer membatalkan satu keberangkatan dan menawarkan tanggal
// pengganti kepada seluruh pesanannya. Dipakai oleh perubahan jadwal dari menu
// Booking maupun pernyataan keadaan kahar.
func (s *departureService) openRescheduleOffer(pkg *models.Package, providerID uint, departureDay string, bookings []models.Booking, rawDate, reason, notes string) (*RescheduleOfferResult, error) {
	now := time.Now()
	seats := 0
	departureAt := bookings[0].TripDate
	for _, booking := range bookings {
		seats += booking.Guests
		if booking.TripDate.Before(departureAt) {
			departureAt = booking.TripDate
		}
	}

	departure := models.TripDeparture{
		PackageID:      pkg.ID,
		ProviderID:     providerID,
		DepartureDay:   departureDay,
		DepartureAt:    departureAt,
		ReviewDeadline: now,
		Reason:         reason,
		SeatsBooked:    seats,
		SeatsRequired:  quotaMinimumForTripType(pkg.TripType, pkg.QuotaMin),
		BookingCount:   len(bookings),
		Status:         models.DepartureRescheduleOffered,
		Decision:       models.DepartureDecisionReschedule,
		DecisionNotes:  notes,
		DecidedAt:      &now,
	}

	proposed, err := resolveProposedStart(&departure, pkg, rawDate, now)
	if err != nil {
		return nil, err
	}
	if err := s.checkExclusiveOffer(pkg, bookings, *proposed); err != nil {
		return nil, err
	}
	departure.ProposedDate = proposed
	deadline := models.ResponseDeadlineFor(departureAt, *proposed, now)
	departure.ResponseDeadline = &deadline

	created, err := s.saveOfferDeparture(&departure)
	if err != nil {
		return nil, err
	}

	offered, refunded := s.dispatchRescheduleOffers(&departure, bookings)
	if offered == 0 && refunded == 0 {
		s.discardUnsentOffer(&departure, created)
		return nil, &DepartureInputError{Message: "tawaran jadwal pengganti gagal dikirim. Muat ulang halaman lalu coba lagi"}
	}
	return &RescheduleOfferResult{Departure: &departure, Offered: offered, Refunded: refunded}, nil
}

// saveOfferDeparture mencatat tawaran pada baris keberangkatan. Indeks unik
// (paket, tanggal) membuat satu keberangkatan hanya punya satu baris, jadi
// peninjauan yang belum atau sudah selesai (misalnya mitra sempat memilih tetap
// berangkat setelah prakiraan cuaca) dipakai ulang untuk tawaran baru.
func (s *departureService) saveOfferDeparture(departure *models.TripDeparture) (bool, error) {
	existing, err := s.repo.FindDeparture(departure.PackageID, departure.DepartureDay)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		result := s.db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "package_id"}, {Name: "departure_day"}},
			DoNothing: true,
		}).Create(departure)
		if result.Error != nil {
			return false, result.Error
		}
		if result.RowsAffected == 0 {
			return false, &DepartureInputError{Message: "keberangkatan ini baru saja diperbarui; muat ulang halaman lalu coba lagi"}
		}
		return true, nil
	}
	if err != nil {
		return false, err
	}
	if existing.Status == models.DepartureRescheduleOffered {
		return false, &DepartureInputError{Message: "tawaran jadwal pengganti untuk keberangkatan ini masih menunggu jawaban pelanggan"}
	}

	result := s.db.Model(&models.TripDeparture{}).
		Where("id = ? AND status = ?", existing.ID, existing.Status).
		Updates(map[string]interface{}{
			"departure_at":      departure.DepartureAt,
			"review_deadline":   departure.ReviewDeadline,
			"response_deadline": departure.ResponseDeadline,
			"reason":            departure.Reason,
			"seats_booked":      departure.SeatsBooked,
			"seats_required":    departure.SeatsRequired,
			"booking_count":     departure.BookingCount,
			"status":            departure.Status,
			"decision":          departure.Decision,
			"proposed_date":     departure.ProposedDate,
			"decision_notes":    departure.DecisionNotes,
			"decided_at":        departure.DecidedAt,
			"accepted_count":    0,
			"declined_count":    0,
			"updated_at":        time.Now(),
		})
	if result.Error != nil {
		return false, result.Error
	}
	if result.RowsAffected == 0 {
		return false, &DepartureInputError{Message: "keberangkatan ini baru saja diperbarui; muat ulang halaman lalu coba lagi"}
	}
	departure.ID = existing.ID
	departure.CreatedAt = existing.CreatedAt
	return false, nil
}

// discardUnsentOffer membersihkan catatan tawaran yang tidak sampai ke pesanan
// mana pun, agar keberangkatan tidak terkunci di status menunggu jawaban.
func (s *departureService) discardUnsentOffer(departure *models.TripDeparture, created bool) {
	var err error
	if created {
		err = s.db.Delete(&models.TripDeparture{}, departure.ID).Error
	} else {
		err = s.db.Model(&models.TripDeparture{}).Where("id = ?", departure.ID).
			Updates(map[string]interface{}{"status": models.DepartureResolved, "updated_at": time.Now()}).Error
	}
	if err != nil {
		log.Printf("[Keberangkatan] Gagal membersihkan tawaran %d yang tidak terkirim: %v", departure.ID, err)
	}
}

// dispatchRescheduleOffers menawarkan tanggal pengganti ke seluruh pesanan pada
// satu keberangkatan, dan mengalihkan ke refund pesanan yang jatah penjadwalan
// ulangnya sudah habis.
func (s *departureService) dispatchRescheduleOffers(departure *models.TripDeparture, bookings []models.Booking) (offered int, refunded int) {
	_, packageName := s.packageOf(departure.PackageID)

	for i := range bookings {
		booking := bookings[i]

		// Satu booking hanya boleh dijadwalkan ulang sekali. Pesanan yang sudah
		// memakai jatahnya tidak dapat ditawari lagi, dan membiarkannya menempel
		// pada keberangkatan yang batal akan membuat dananya menggantung.
		if booking.RescheduleCount >= 1 {
			if _, err := s.bookingService.CancelBookingByProvider(
				booking.ID, departure.ProviderID,
				causeText(departure)+". Pesanan ini sudah pernah dijadwalkan ulang sehingga dana dikembalikan penuh",
			); err != nil {
				log.Printf("[Keberangkatan] Booking %d gagal dialihkan ke refund: %v", booking.ID, err)
				continue
			}
			refunded++
			continue
		}

		if err := s.offerRescheduleToBooking(&booking, departure, *departure.ProposedDate); err != nil {
			log.Printf("[Keberangkatan] Booking %d gagal ditawari jadwal pengganti: %v", booking.ID, err)
			continue
		}
		offered++
		s.notifyCustomerOfRescheduleOffer(&booking, departure, *departure.ProposedDate, packageName)
	}

	if offered == 0 && refunded > 0 {
		// Tidak ada yang bisa ditawari; keberangkatan selesai sebagai pembatalan.
		if err := s.db.Model(departure).Updates(map[string]interface{}{
			"status":     models.DepartureResolved,
			"updated_at": time.Now(),
		}).Error; err != nil {
			log.Printf("[Keberangkatan] Gagal menutup keberangkatan %d: %v", departure.ID, err)
		} else {
			departure.Status = models.DepartureResolved
		}
	}
	return offered, refunded
}

// packageOwnedBy memastikan mitra hanya dapat menyatakan keadaan kahar atas
// paketnya sendiri.
func (s *departureService) packageOwnedBy(packageID uint, providerID uint) (*models.Package, error) {
	var pkg models.Package
	if err := s.db.Where("id = ? AND provider_id = ?", packageID, providerID).First(&pkg).Error; err != nil {
		return nil, &DepartureInputError{Message: "paket tidak ditemukan"}
	}
	return &pkg, nil
}
