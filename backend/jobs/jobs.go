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
	r.AutoCompleteFinishedBookings(ctx)
	r.container.PayoutService.ReconcileProcessingPayouts(ctx)
	r.ReconcileProviderBalances(ctx)
}
