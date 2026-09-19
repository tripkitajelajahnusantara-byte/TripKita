package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"
	"tripkita-provider/config"
	"tripkita-provider/database"
	"tripkita-provider/models"
	"tripkita-provider/repositories"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PayoutService interface {
	RequestPayout(providerID uint, req *models.CreatePayoutRequest) (*models.Payout, error)
	GetProviderPayoutSummary(providerID uint) (*models.PayoutSummary, error)
	GetAllPayouts() ([]models.Payout, error)
	ProcessPayout(payoutID uint, status string, notes string, proofPath string) (*models.Payout, error)
	HandlePayoutCallback(payoutID string, referenceID string, status string, failureCode string) error
	ReconcileProcessingPayouts(ctx context.Context)
}

type payoutService struct {
	payoutRepo    repositories.PayoutRepository
	providerRepo  repositories.ProviderRepository
	bookingRepo   repositories.BookingRepository
	emailService  *EmailService
	notifService  *NotificationService
	xenditService XenditService
	cfg           *config.Config
}

func NewPayoutService(payoutRepo repositories.PayoutRepository, providerRepo repositories.ProviderRepository, bookingRepo repositories.BookingRepository, emailService *EmailService, notifService *NotificationService, xenditService XenditService, cfg *config.Config) PayoutService {
	return &payoutService{
		payoutRepo:    payoutRepo,
		providerRepo:  providerRepo,
		bookingRepo:   bookingRepo,
		emailService:  emailService,
		notifService:  notifService,
		xenditService: xenditService,
		cfg:           cfg,
	}
}

func (s *payoutService) RequestPayout(providerID uint, req *models.CreatePayoutRequest) (*models.Payout, error) {
	provider, err := s.providerRepo.FindByID(providerID)
	if err != nil {
		return nil, errors.New("provider not found")
	}

	if req.Amount <= 0 {
		return nil, errors.New("nominal pencairan harus lebih dari 0")
	}
	if req.Type != "DP_50" && req.Type != "PELUNASAN_50" {
		return nil, errors.New("jenis pencairan tidak valid")
	}

	// Validate bank details exist
	bankName := provider.BankName
	bankAccount := provider.BankAccount
	bankAccountName := provider.BankAccountName

	if bankName == "" || bankAccount == "" || bankAccountName == "" {
		return nil, errors.New("rekening bank tujuan belum diatur. Silakan atur informasi bank di menu Profil Provider terlebih dahulu")
	}
	if s.cfg != nil && s.cfg.EnableAutoPayout {
		if _, err := ResolveBankRouting(bankName); err != nil {
			return nil, err
		}
	}

	payout := &models.Payout{
		ProviderID:      providerID,
		BookingID:       req.BookingID,
		Amount:          req.Amount,
		Type:            req.Type,
		Status:          "PENDING",
		BankName:        bankName,
		BankAccount:     bankAccount,
		BankAccountName: bankAccountName,
		Notes:           "Pengajuan pencairan dana oleh provider",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(providerID)+1_000_000_000).Error; err != nil {
			return err
		}
		lockedSummary, err := s.GetProviderPayoutSummary(providerID)
		if err != nil {
			return err
		}
		if req.Type == "PELUNASAN_50" && req.Amount > lockedSummary.AvailablePelunasan {
			return errors.New("pencairan pelunasan belum tersedia atau saldo tidak mencukupi")
		}
		if req.Type == "DP_50" && req.Amount > lockedSummary.AvailableDP {
			return errors.New("saldo DP belum mencukupi untuk dicairkan")
		}
		if req.BookingID != nil {
			var count int64
			if err := tx.Model(&models.Booking{}).Where("id = ? AND provider_id = ?", *req.BookingID, providerID).Count(&count).Error; err != nil || count != 1 {
				return fmt.Errorf("booking payout tidak valid")
			}
		}
		return tx.Create(payout).Error
	})
	if err != nil {
		return nil, err
	}

	return payout, nil
}

func (s *payoutService) GetProviderPayoutSummary(providerID uint) (*models.PayoutSummary, error) {
	bookings, err := s.bookingRepo.FindAllByProvider(providerID)
	if err != nil {
		return nil, err
	}
	payouts, err := s.payoutRepo.GetByProviderID(providerID)
	if err != nil {
		return nil, err
	}

	var grossOmset int64
	var totalPlatformFee int64
	var totalNetEarnings int64
	var dpEligible int64
	var pelunasanEligible int64
	var heldSettlement int64

	now := time.Now()

	for _, b := range bookings {
		if b.Status == "CONFIRMED" || b.Status == "PAID" || b.Status == "COMPLETED" {
			totalCustomerPaid := b.TotalPrice
			adminFee := int64(5000)
			if totalCustomerPaid < adminFee {
				adminFee = 0
			}

			packageGross := totalCustomerPaid - adminFee
			platformFee := packageGross*15/100 + adminFee
			netProviderEarning := packageGross * 85 / 100

			grossOmset += totalCustomerPaid
			totalPlatformFee += platformFee
			totalNetEarnings += netProviderEarning

			dpAmount := netProviderEarning / 2
			settlementAmount := netProviderEarning - dpAmount
			dpEligible += dpAmount

			// Pelunasan hanya tersedia setelah waktu akhir perjalanan, bukan
			// setelah 24 jam dari waktu mulai.
			isFinished := tripHasEnded(b, now)
			if isFinished {
				pelunasanEligible += settlementAmount
			} else {
				heldSettlement += settlementAmount
			}
		}
	}

	var dpPaidOut int64
	var pelunasanPaidOut int64
	var totalPaidOut int64
	var pendingPayout int64

	for _, p := range payouts {
		switch p.Status {
		case models.PayoutStatusApproved:
			totalPaidOut += p.Amount
		case models.PayoutStatusPending, models.PayoutStatusProcessing:
			// Dana sudah dipesan meski belum sampai ke rekening mitra.
			pendingPayout += p.Amount
		default:
			// REJECTED dan FAILED melepas kembali dananya.
			continue
		}
		if p.Type == "DP_50" {
			dpPaidOut += p.Amount
		} else {
			pelunasanPaidOut += p.Amount
		}
	}

	availableDP := dpEligible - dpPaidOut
	if availableDP < 0 {
		availableDP = 0
	}

	availablePelunasan := pelunasanEligible - pelunasanPaidOut
	if availablePelunasan < 0 {
		availablePelunasan = 0
	}

	ledger, err := GetLedgerBalance(database.DB, providerID)
	if err != nil {
		return nil, err
	}
	// Pengajuan PENDING sudah dipotong dari hak cair tetapi belum dari buku besar.
	expectedAvailable := availableDP + availablePelunasan + pendingPayout

	return &models.PayoutSummary{
		TotalEarnings:      grossOmset,
		PlatformFee:        totalPlatformFee,
		NetEarnings:        totalNetEarnings,
		AvailableDP:        availableDP,
		AvailablePelunasan: availablePelunasan,
		HeldSettlement:     heldSettlement,
		TotalPaidOut:       totalPaidOut,
		PendingPayout:      pendingPayout,
		Payouts:            payouts,
		LedgerAvailable:    ledger.Available,
		LedgerHeld:         ledger.Held,
		LedgerConsistent:   ledger.Available == expectedAvailable && ledger.Held == heldSettlement,
	}, nil
}

func (s *payoutService) GetAllPayouts() ([]models.Payout, error) {
	return s.payoutRepo.GetAll()
}

// ProcessPayout menindaklanjuti pengajuan pencairan dari admin.
//
// Saat ENABLE_AUTOMATIC_PAYOUT aktif, persetujuan mengirim instruksi transfer ke
// payment gateway dan pengajuan berhenti di status PROCESSING sampai callback
// menyatakan dana benar-benar sampai. Saat flag mati, perilakunya tetap seperti
// semula: admin mentransfer manual lalu mencatat buktinya.
func (s *payoutService) ProcessPayout(payoutID uint, status string, notes string, proofPath string) (*models.Payout, error) {
	automatic := s.cfg != nil && s.cfg.EnableAutoPayout && status == models.PayoutStatusApproved

	var payout models.Payout
	var routing BankRouting

	// Tahap 1: kunci pengajuan, potong buku besar, lalu tandai status transisi.
	// Dana dipesan sebelum instruksi dikirim supaya kegagalan di tengah jalan
	// tidak pernah menghasilkan transfer yang tidak tercatat.
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&payout, payoutID).Error; err != nil {
			return errors.New("payout request not found")
		}
		if payout.Status != models.PayoutStatusPending {
			return errors.New("payout sudah diproses dan tidak dapat diubah kembali")
		}
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(payout.ProviderID)+1_000_000_000).Error; err != nil {
			return err
		}

		updates := map[string]interface{}{
			"notes":      notes,
			"updated_at": time.Now(),
		}
		if proofPath != "" {
			updates["proof_path"] = proofPath
		}

		if status == models.PayoutStatusApproved {
			available, err := availablePayoutAmountTx(tx, &payout)
			if err != nil {
				return err
			}
			if payout.Amount > available {
				return errors.New("saldo payout berubah dan tidak lagi mencukupi; tolak pengajuan ini lalu minta provider mengajukan ulang")
			}
			// Buku besar wajib ikut berkurang. Tanpa ini ProviderBalance hanya
			// bertambah dan tidak pernah mencerminkan dana yang sudah dicairkan.
			if err := debitProviderBalanceTx(tx, payout.ProviderID, payout.Amount); err != nil {
				return err
			}

			if automatic {
				resolved, err := ResolveBankRouting(payout.BankName)
				if err != nil {
					return err
				}
				routing = resolved
				updates["status"] = models.PayoutStatusProcessing
				updates["routing_type"] = resolved.Type
				updates["routing_value"] = resolved.Value
			} else {
				updates["status"] = models.PayoutStatusApproved
			}
		} else {
			updates["status"] = status
		}

		return tx.Model(&payout).Updates(updates).Error
	})
	if err != nil {
		return nil, err
	}

	if !automatic {
		return s.payoutRepo.GetByID(payoutID)
	}

	// Tahap 2: kirim instruksi ke gateway di luar transaksi database, supaya
	// panggilan jaringan yang lambat tidak menahan lock baris pencairan.
	payout.RoutingType = routing.Type
	payout.RoutingValue = routing.Value
	result, sendErr := s.xenditService.CreatePayout(xenditPayoutRequest(&payout))
	if sendErr != nil {
		if errors.Is(sendErr, ErrPayoutStatusUnknown) {
			// Jangan kembalikan saldo pada timeout/5xx. Instruksi mungkin sudah
			// diterima Xendit; idempotency key yang sama akan direkonsiliasi job.
			_ = database.DB.Model(&models.Payout{}).
				Where("id = ? AND status = ?", payoutID, models.PayoutStatusProcessing).
				Updates(map[string]interface{}{
					"failure_code": "DELIVERY_STATUS_UNKNOWN",
					"updated_at":   time.Now(),
				}).Error
			log.Printf("[Payout] Status pengiriman payout %d belum pasti; tetap PROCESSING untuk rekonsiliasi: %v", payoutID, sendErr)
			return s.payoutRepo.GetByID(payoutID)
		}

		// Hanya penolakan definitif 4xx/validasi yang mengembalikan dana.
		if failErr := s.markPayoutFailed(payoutID, "", sendErr.Error()); failErr != nil {
			log.Printf("[Payout] Payout %d gagal dikirim dan gagal dikembalikan: %v", payoutID, failErr)
		}
		return nil, fmt.Errorf("pencairan tidak dapat dikirim: %w", sendErr)
	}

	expectedReferenceID := payoutReferenceID(payoutID)
	if result.ReferenceID != expectedReferenceID {
		// Respons yang tidak menunjuk pengajuan ini tidak boleh dianggap gagal
		// definitif karena Xendit mungkin tetap memproses instruksinya. Biarkan
		// PROCESSING agar job rekonsiliasi memeriksa ulang dengan idempotency key.
		_ = database.DB.Model(&models.Payout{}).
			Where("id = ? AND status = ?", payoutID, models.PayoutStatusProcessing).
			Updates(map[string]interface{}{
				"failure_code": "REFERENCE_MISMATCH",
				"updated_at":   time.Now(),
			}).Error
		log.Printf("[Payout] PENTING: reference payout %d tidak cocok (expected=%s actual=%s); tetap PROCESSING", payoutID, expectedReferenceID, result.ReferenceID)
		return s.payoutRepo.GetByID(payoutID)
	}

	if err := database.DB.Model(&models.Payout{}).
		Where("id = ? AND status = ?", payoutID, models.PayoutStatusProcessing).
		Updates(map[string]interface{}{
			"xendit_payout_id": result.ID,
			"failure_code":     "",
			"updated_at":       time.Now(),
		}).Error; err != nil {
		// Instruksi sudah terkirim; kehilangan id hanya menyulitkan penelusuran,
		// jadi dicatat keras dan tidak membatalkan pencairan.
		log.Printf("[Payout] PENTING: payout %d terkirim ke gateway (id=%s) tetapi id gagal disimpan: %v", payoutID, result.ID, err)
	}

	log.Printf("[Payout] Payout %d dikirim ke gateway id=%s status=%s", payoutID, result.ID, result.Status)
	return s.payoutRepo.GetByID(payoutID)
}

// HandlePayoutCallback menerapkan hasil akhir pencairan dari payment gateway.
// Operasi ini idempoten: callback yang sama dikirim ulang tidak mengubah apa pun.
func (s *payoutService) HandlePayoutCallback(gatewayPayoutID string, referenceID string, status string, failureCode string) error {
	payoutID, err := payoutIDFromReference(referenceID)
	if err != nil {
		return err
	}

	var existing models.Payout
	if err := database.DB.Select("id", "xendit_payout_id").First(&existing, payoutID).Error; err != nil {
		return err
	}
	if existing.XenditPayoutID != "" && gatewayPayoutID != "" && existing.XenditPayoutID != gatewayPayoutID {
		return fmt.Errorf("payout id gateway tidak cocok dengan reference id")
	}

	switch strings.ToUpper(status) {
	case "SUCCEEDED", "COMPLETED":
		result := database.DB.Model(&models.Payout{}).
			Where("id = ? AND status = ?", payoutID, models.PayoutStatusProcessing).
			Updates(map[string]interface{}{
				"status":           models.PayoutStatusApproved,
				"xendit_payout_id": gatewayPayoutID,
				"updated_at":       time.Now(),
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 1 {
			log.Printf("[Payout] Payout %d dikonfirmasi berhasil oleh gateway.", payoutID)
		}
		return nil

	case "FAILED", "REVERSED", "CANCELLED", "REJECTED", "EXPIRED":
		if strings.TrimSpace(failureCode) == "" {
			failureCode = strings.ToUpper(status)
		}
		return s.markPayoutFailed(payoutID, gatewayPayoutID, failureCode)

	default:
		// Status antara (mis. ACCEPTED/PENDING) tidak mengubah apa pun.
		return nil
	}
}

// ReconcileProcessingPayouts memastikan payout yang kehilangan callback atau
// respons Create Payout tidak menggantung selamanya. Create diulang hanya saat
// payout_id belum diketahui dan selalu memakai idempotency key yang sama.
func (s *payoutService) ReconcileProcessingPayouts(ctx context.Context) {
	if s.cfg == nil || !s.cfg.EnableAutoPayout {
		return
	}

	var payouts []models.Payout
	if err := database.DB.WithContext(ctx).
		Where("status = ? AND updated_at < ?", models.PayoutStatusProcessing, time.Now().Add(-5*time.Minute)).
		Order("id asc").Limit(100).Find(&payouts).Error; err != nil {
		log.Printf("[Payout Rekonsiliasi] Gagal memuat payout PROCESSING: %v", err)
		return
	}

	for i := range payouts {
		if ctx.Err() != nil {
			return
		}
		payout := &payouts[i]
		var result *XenditPayoutResult
		var err error
		creating := payout.XenditPayoutID == ""

		if !creating {
			result, err = s.xenditService.GetPayout(payout.XenditPayoutID)
		} else {
			if payout.RoutingType == "" || payout.RoutingValue == "" {
				routing, routeErr := ResolveBankRouting(payout.BankName)
				if routeErr != nil {
					log.Printf("[Payout Rekonsiliasi] Payout %d tidak memiliki routing valid: %v", payout.ID, routeErr)
					continue
				}
				payout.RoutingType, payout.RoutingValue = routing.Type, routing.Value
			}
			result, err = s.xenditService.CreatePayout(xenditPayoutRequest(payout))
		}
		if err != nil {
			if creating && !errors.Is(err, ErrPayoutStatusUnknown) {
				if failErr := s.markPayoutFailed(payout.ID, "", err.Error()); failErr != nil {
					log.Printf("[Payout Rekonsiliasi] Payout %d ditolak gateway dan saldo gagal dikembalikan: %v", payout.ID, failErr)
				}
				continue
			}
			log.Printf("[Payout Rekonsiliasi] Payout %d belum dapat dipastikan: %v", payout.ID, err)
			continue
		}
		if result.ReferenceID != payoutReferenceID(payout.ID) {
			log.Printf("[Payout Rekonsiliasi] Payout %d menerima reference gateway yang tidak cocok", payout.ID)
			continue
		}
		if err := database.DB.Model(&models.Payout{}).
			Where("id = ? AND status = ?", payout.ID, models.PayoutStatusProcessing).
			Updates(map[string]interface{}{
				"xendit_payout_id": result.ID,
				"routing_type":     payout.RoutingType,
				"routing_value":    payout.RoutingValue,
				"failure_code":     "",
				"updated_at":       time.Now(),
			}).Error; err != nil {
			log.Printf("[Payout Rekonsiliasi] Payout %d gagal menyimpan status gateway: %v", payout.ID, err)
			continue
		}
		if err := s.HandlePayoutCallback(result.ID, result.ReferenceID, result.Status, result.FailureCode); err != nil {
			log.Printf("[Payout Rekonsiliasi] Payout %d gagal menerapkan status %s: %v", payout.ID, result.Status, err)
		}
	}
}

func xenditPayoutRequest(payout *models.Payout) XenditPayoutRequest {
	return XenditPayoutRequest{
		ReferenceID:       payoutReferenceID(payout.ID),
		RoutingType:       payout.RoutingType,
		RoutingValue:      payout.RoutingValue,
		AccountNumber:     payout.BankAccount,
		AccountHolderName: payout.BankAccountName,
		Amount:            payout.Amount,
		Description:       fmt.Sprintf("Pencairan TemenTrip #%d (%s)", payout.ID, payout.Type),
	}
}

// markPayoutFailed mengembalikan dana yang sudah dipotong ke buku besar dan
// menandai pengajuan sebagai gagal, sekali saja.
func (s *payoutService) markPayoutFailed(payoutID uint, gatewayPayoutID string, failureCode string) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var payout models.Payout
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&payout, payoutID).Error; err != nil {
			return err
		}
		if payout.Status != models.PayoutStatusProcessing && !(payout.Status == models.PayoutStatusApproved && payout.XenditPayoutID != "") {
			// Sudah difinalkan sebelumnya; tidak ada yang perlu dikembalikan.
			return nil
		}
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(payout.ProviderID)+1_000_000_000).Error; err != nil {
			return err
		}
		if err := creditProviderBalanceTx(tx, payout.ProviderID, payout.Amount); err != nil {
			return err
		}

		updates := map[string]interface{}{
			"status":       models.PayoutStatusFailed,
			"failure_code": truncateText(failureCode, 100),
			"updated_at":   time.Now(),
		}
		if gatewayPayoutID != "" {
			updates["xendit_payout_id"] = gatewayPayoutID
		}
		if err := tx.Model(&payout).Updates(updates).Error; err != nil {
			return err
		}
		log.Printf("[Payout] Payout %d gagal (%s); saldo dikembalikan ke provider %d.", payoutID, failureCode, payout.ProviderID)
		return nil
	})
}

// ErrUnknownPayoutReference menandai callback yang tidak merujuk pencairan milik
// kita. Ini kesalahan permanen, sehingga pemanggil menjawab 4xx agar gateway
// berhenti mengirim ulang event yang tidak akan pernah berhasil.
var ErrUnknownPayoutReference = errors.New("reference id pencairan tidak dikenali")

const payoutReferencePrefix = "tementrip-payout-"

func payoutReferenceID(payoutID uint) string {
	return fmt.Sprintf("%s%d", payoutReferencePrefix, payoutID)
}

func payoutIDFromReference(referenceID string) (uint, error) {
	trimmed := strings.TrimSpace(referenceID)
	if !strings.HasPrefix(trimmed, payoutReferencePrefix) {
		return 0, ErrUnknownPayoutReference
	}
	value, err := strconv.ParseUint(strings.TrimPrefix(trimmed, payoutReferencePrefix), 10, 32)
	if err != nil || value == 0 {
		return 0, ErrUnknownPayoutReference
	}
	return uint(value), nil
}

func truncateText(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}

func availablePayoutAmountTx(tx *gorm.DB, current *models.Payout) (int64, error) {
	var bookings []models.Booking
	if err := tx.Where("provider_id = ? AND status IN ?", current.ProviderID, []string{"PAID", "CONFIRMED", "COMPLETED"}).Find(&bookings).Error; err != nil {
		return 0, err
	}

	var eligible int64
	now := time.Now()
	for _, booking := range bookings {
		adminFee := int64(5000)
		if booking.TotalPrice < adminFee {
			adminFee = 0
		}
		providerNet := (booking.TotalPrice - adminFee) * 85 / 100
		dpAmount := providerNet / 2
		if current.Type == "DP_50" {
			eligible += dpAmount
		} else if tripHasEnded(booking, now) {
			eligible += providerNet - dpAmount
		}
	}

	var reserved int64
	if err := tx.Model(&models.Payout{}).
		Where("provider_id = ? AND type = ? AND id <> ? AND status IN ?", current.ProviderID, current.Type, current.ID, models.PayoutReservedStatuses).
		Select("COALESCE(SUM(amount), 0)").Scan(&reserved).Error; err != nil {
		return 0, err
	}
	available := eligible - reserved
	if available < 0 {
		return 0, nil
	}
	return available, nil
}

// debitProviderBalanceTx mengurangi saldo tersedia provider saat pencairan
// disetujui. Pengurangan dijaga di level SQL (available_balance >= amount)
// sehingga dua persetujuan bersamaan tidak dapat menghasilkan saldo negatif.
func debitProviderBalanceTx(tx *gorm.DB, providerID uint, amount int64) error {
	result := tx.Model(&models.ProviderBalance{}).
		Where("provider_id = ? AND available_balance >= ?", providerID, amount).
		Updates(map[string]interface{}{
			"available_balance": gorm.Expr("available_balance - ?", amount),
			"updated_at":        time.Now(),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return fmt.Errorf("saldo buku besar provider tidak mencukupi untuk pencairan sebesar %d", amount)
	}
	return nil
}

// LedgerBalance adalah saldo provider menurut buku besar (ProviderBalance).
type LedgerBalance struct {
	Available int64
	Held      int64
	Earned    int64
}

// GetLedgerBalance membaca saldo buku besar provider. Nilai nol dikembalikan
// bila provider belum pernah memiliki transaksi.
func GetLedgerBalance(db *gorm.DB, providerID uint) (LedgerBalance, error) {
	var balance models.ProviderBalance
	err := db.Where("provider_id = ?", providerID).First(&balance).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return LedgerBalance{}, nil
	}
	if err != nil {
		return LedgerBalance{}, err
	}
	return LedgerBalance{
		Available: balance.AvailableBalance,
		Held:      balance.HeldBalance,
		Earned:    balance.TotalEarned,
	}, nil
}

// creditProviderBalanceTx mengembalikan dana ke saldo tersedia provider saat
// pencairan gagal di payment gateway.
func creditProviderBalanceTx(tx *gorm.DB, providerID uint, amount int64) error {
	result := tx.Model(&models.ProviderBalance{}).
		Where("provider_id = ?", providerID).
		Updates(map[string]interface{}{
			"available_balance": gorm.Expr("available_balance + ?", amount),
			"updated_at":        time.Now(),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return fmt.Errorf("saldo provider %d tidak ditemukan saat pengembalian dana", providerID)
	}
	return nil
}
