// Package jobs menjalankan pekerjaan periodik yang menjaga siklus hidup booking
// dan saldo tetap konsisten. Paket ini terpisah dari database supaya dapat
// memakai service (payment gateway, booking) tanpa impor melingkar.
package jobs

import (
	"context"
	"log"
	"time"

	"gorm.io/gorm"

	"tripkita-provider/config"
	"tripkita-provider/models"
	"tripkita-provider/services"
)

const jobInterval = 1 * time.Hour

type Runner struct {
	db        *gorm.DB
	cfg       *config.Config
	container *services.Container
}

func NewRunner(db *gorm.DB, cfg *config.Config, container *services.Container) *Runner {
	return &Runner{db: db, cfg: cfg, container: container}
}

// Start menjalankan job berkala sampai ctx dibatalkan. Channel yang dikembalikan
// ditutup setelah job benar-benar berhenti, sehingga proses shutdown dapat
// menunggunya dan tidak memutus job di tengah transaksi.
func (r *Runner) Start(ctx context.Context) <-chan struct{} {
	done := make(chan struct{})
	if !r.cfg.EnableJobs {
		log.Println("[Job] ENABLE_BACKGROUND_JOBS=false; job latar belakang tidak dijalankan.")
		close(done)
		return done
	}
	go func() {
		defer close(done)
		r.runOnce(ctx)

		ticker := time.NewTicker(jobInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				log.Println("[Job] Dihentikan mengikuti shutdown server.")
				return
			case <-ticker.C:
				r.runOnce(ctx)
			}
		}
	}()
	return done
}

func (r *Runner) runOnce(ctx context.Context) {
	// Transaksi lama tidak pernah dihapus otomatis karena dibutuhkan untuk audit.
	r.ExpirePendingBookings(ctx)
	r.ReviewTripDepartures(ctx)
	r.AutoCompleteFinishedBookings(ctx)
	r.container.PayoutService.ReconcileProcessingPayouts(ctx)
	r.ReconcileProviderBalances(ctx)
	r.cleanupExpiredAuthData(ctx)
}

func (r *Runner) cleanupExpiredAuthData(ctx context.Context) {
	cutoff := time.Now().UTC().Add(-24 * time.Hour)
	if err := r.db.WithContext(ctx).Where("expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)", cutoff, cutoff).Delete(&models.AuthSession{}).Error; err != nil {
		log.Printf("[Auth Cleanup] gagal membersihkan sesi lama: %v", err)
	}
	if err := r.db.WithContext(ctx).Where("expires_at < ? OR (used_at IS NOT NULL AND used_at < ?)", cutoff, cutoff).Delete(&models.OAuthLoginCode{}).Error; err != nil {
		log.Printf("[Auth Cleanup] gagal membersihkan kode OAuth lama: %v", err)
	}
	now := time.Now().UTC()
	if err := r.db.WithContext(ctx).Model(&models.User{}).
		Where("reset_token_expires_at IS NOT NULL AND reset_token_expires_at < ?", now).
		Updates(map[string]interface{}{"reset_token_hash": "", "reset_token_expires_at": nil, "reset_attempts": 0}).Error; err != nil {
		log.Printf("[Auth Cleanup] gagal membersihkan token reset lama: %v", err)
	}
}
