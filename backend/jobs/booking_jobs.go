package jobs

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"tripkita-provider/models"
	"tripkita-provider/services"
)

// ExpirePendingBookings menutup booking yang tidak dibayar dalam 24 jam.
//
// Sebelum mengedaluwarsakan, status invoice dipastikan dulu ke payment gateway.
// Status pembayaran sebelumnya hanya bergantung pada webhook; bila webhook hilang
// permanen, booking yang sudah dibayar pelanggan ikut dikedaluwarsakan padahal
// dananya sudah diterima.
func (r *Runner) ExpirePendingBookings(ctx context.Context) {
	cutoff := time.Now().Add(-24 * time.Hour)
	var candidates []models.Booking
	if err := r.db.WithContext(ctx).Select("id", "xendit_invoice_id").
		Where("status = ? AND created_at < ?", models.StatusPendingPayment, cutoff).
		Find(&candidates).Error; err != nil {
		log.Printf("[Auto Expire] Gagal mencari booking kedaluwarsa: %v", err)
		return
	}

	expired, settled, deferred := 0, 0, 0
	for _, candidate := range candidates {
		if ctx.Err() != nil {
			return
		}

		// Jaring pengaman: booking yang ternyata sudah dibayar diselesaikan,
		// bukan dikedaluwarsakan.
		switch r.checkInvoiceBeforeExpiry(candidate) {
		case invoiceSettled:
			settled++
			continue
		case invoiceUnverified:
			deferred++
			continue
		}

		if err := r.expireOne(ctx, candidate.ID, cutoff); err != nil {
			if err != gorm.ErrRecordNotFound {
				log.Printf("[Auto Expire] Booking %d gagal diproses: %v", candidate.ID, err)
			}
			continue
		}
		expired++
	}

	if expired > 0 {
		log.Printf("[Auto Expire] %d booking kedaluwarsa dan kuota dilepas.", expired)
	}
	if settled > 0 {
		log.Printf("[Auto Expire] %d booking diselesaikan: pembayaran terkonfirmasi ke gateway meski webhook tidak diterima.", settled)
	}
	if deferred > 0 {
		log.Printf("[Auto Expire] %d booking ditunda: status pembayaran belum dapat dipastikan ke gateway. Perlu diperiksa bila berulang.", deferred)
	}
}

// invoiceCheckResult membedakan ketiga kemungkinan hasil pemeriksaan invoice,
// karena "sudah dibayar" dan "tidak dapat dipastikan" menuntut tindakan operator
// yang berbeda meski sama-sama menunda pengedaluwarsaan.
type invoiceCheckResult int

const (
	// invoiceUnpaid: gateway memastikan invoice belum dibayar; aman dikedaluwarsakan.
	invoiceUnpaid invoiceCheckResult = iota
	// invoiceSettled: invoice sudah dibayar dan booking berhasil diselesaikan.
	invoiceSettled
	// invoiceUnverified: status tidak dapat dipastikan; booking ditahan.
	invoiceUnverified
)

// checkInvoiceBeforeExpiry memastikan status invoice ke payment gateway sebelum
// booking dikedaluwarsakan.
func (r *Runner) checkInvoiceBeforeExpiry(booking models.Booking) invoiceCheckResult {
	// Tanpa invoice, tidak ada dana yang mungkin sudah diterima.
	if strings.TrimSpace(booking.XenditInvoiceID) == "" {
		return invoiceUnpaid
	}

	invoice, err := r.container.XenditService.GetInvoice(booking.XenditInvoiceID)
	if err != nil {
		// Gateway tidak dapat dihubungi: booking ditahan supaya pembayaran yang
		// sah tidak hilang karena gangguan sementara.
		log.Printf("[Rekonsiliasi] Booking %d tidak dapat diverifikasi ke gateway, ditunda: %v", booking.ID, err)
		return invoiceUnverified
	}

	status := strings.ToUpper(invoice.Status)
	if status != "PAID" && status != "SETTLED" {
		return invoiceUnpaid
	}

	// Jalur penyelesaian sama persis dengan webhook, termasuk verifikasi nominal
	// dan penjagaan idempotensi.
	if err := r.container.BookingService.UpdateStatusByWebhook(
		invoice.ID, invoice.ExternalID, invoice.Status,
		invoice.PaymentMethod, invoice.Amount, invoice.Currency,
	); err != nil {
		log.Printf("[Rekonsiliasi] Booking %d terbayar di gateway tetapi gagal diselesaikan: %v", booking.ID, err)
		return invoiceUnverified
	}
	log.Printf("[Rekonsiliasi] Booking %d diselesaikan dari status invoice gateway (webhook tidak diterima).", booking.ID)
	return invoiceSettled
}

func (r *Runner) expireOne(ctx context.Context, bookingID uint, cutoff time.Time) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var booking models.Booking
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND status = ? AND created_at < ?", bookingID, models.StatusPendingPayment, cutoff).
			First(&booking).Error; err != nil {
			return err
		}
		if err := tx.Model(&booking).Update("status", "EXPIRED").Error; err != nil {
			return err
		}
		return services.RecalculatePackageAvailability(tx, booking.PackageID)
	})
}

// AutoCompleteFinishedBookings menandai trip yang sudah lewat sebagai selesai dan
// melepas settlement yang ditahan ke saldo tersedia provider.
func (r *Runner) AutoCompleteFinishedBookings(ctx context.Context) {
	now := time.Now()
	var candidates []models.Booking
	if err := r.db.WithContext(ctx).Select("id").
		Where("status IN ? AND trip_end_date <= ?", []string{models.StatusPaid, models.StatusConfirmed}, now).
		Find(&candidates).Error; err != nil {
		log.Printf("[Auto Complete] Gagal mencari booking selesai: %v", err)
		return
	}

	completed := 0
	for _, candidate := range candidates {
		if ctx.Err() != nil {
			return
		}
		err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			var booking models.Booking
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("id = ? AND status IN ? AND trip_end_date <= ?", candidate.ID, []string{models.StatusPaid, models.StatusConfirmed}, now).
				First(&booking).Error; err != nil {
				return err
			}
			if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(booking.ProviderID)+1_000_000_000).Error; err != nil {
				return err
			}

			var settlement models.HeldSettlement
			err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("booking_id = ? AND status = ?", booking.ID, "HELD").First(&settlement).Error
			if err == nil {
				result := tx.Model(&models.ProviderBalance{}).
					Where("provider_id = ? AND held_balance >= ?", booking.ProviderID, settlement.Amount).
					Updates(map[string]interface{}{
						"available_balance": gorm.Expr("available_balance + ?", settlement.Amount),
						"held_balance":      gorm.Expr("held_balance - ?", settlement.Amount),
						"updated_at":        time.Now(),
					})
				if result.Error != nil || result.RowsAffected != 1 {
					return fmt.Errorf("saldo provider %d tidak konsisten", booking.ProviderID)
				}
				settlement.Status = "RELEASED"
				if err := tx.Save(&settlement).Error; err != nil {
					return err
				}
			} else if err != gorm.ErrRecordNotFound {
				return err
			}

			return tx.Model(&booking).Update("status", models.StatusCompleted).Error
		})
		if err != nil {
			if err != gorm.ErrRecordNotFound {
				log.Printf("[Auto Complete] Booking %d gagal diproses: %v", candidate.ID, err)
			}
			continue
		}
		completed++
	}
	if completed > 0 {
		log.Printf("[Auto Complete] %d booking diselesaikan dan settlement dilepas.", completed)
	}
}
