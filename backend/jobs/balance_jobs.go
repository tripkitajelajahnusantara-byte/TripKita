package jobs

import (
	"context"
	"log"

	"tripkita-provider/models"
	"tripkita-provider/services"
)

// ReconcileProviderBalances membandingkan buku besar saldo (ProviderBalance)
// dengan hak cair yang dihitung ulang dari tabel bookings.
//
// Kedua angka ini dipelihara oleh jalur kode yang berbeda, sehingga bug atau
// transaksi yang gagal separuh dapat membuatnya menyimpang tanpa ada yang tahu.
// Job ini tidak memperbaiki data secara otomatis: selisih saldo harus diperiksa
// manusia, bukan ditimpa diam-diam oleh salah satu sumber.
func (r *Runner) ReconcileProviderBalances(ctx context.Context) {
	var providers []models.Provider
	if err := r.db.WithContext(ctx).Select("id").
		Where("role = ? AND status = ?", "PROVIDER", "APPROVED").
		Find(&providers).Error; err != nil {
		log.Printf("[Rekonsiliasi Saldo] Gagal memuat daftar provider: %v", err)
		return
	}

	checked, mismatched := 0, 0
	for _, provider := range providers {
		if ctx.Err() != nil {
			return
		}

		summary, err := r.container.PayoutService.GetProviderPayoutSummary(provider.ID)
		if err != nil {
			log.Printf("[Rekonsiliasi Saldo] Provider %d gagal dihitung: %v", provider.ID, err)
			continue
		}
		ledger, err := services.GetLedgerBalance(r.db.WithContext(ctx), provider.ID)
		if err != nil {
			log.Printf("[Rekonsiliasi Saldo] Provider %d gagal dibaca dari buku besar: %v", provider.ID, err)
			continue
		}
		checked++

		// Pengajuan yang masih PENDING sudah dipotong dari hak cair, tetapi belum
		// dipotong dari buku besar (pemotongan terjadi saat disetujui).
		expectedAvailable := summary.AvailableDP + summary.AvailablePelunasan + summary.PendingPayout

		if ledger.Available != expectedAvailable || ledger.Held != summary.HeldSettlement {
			mismatched++
			log.Printf(
				"[Rekonsiliasi Saldo] SELISIH provider=%d buku_besar_tersedia=%d diharapkan=%d buku_besar_ditahan=%d diharapkan=%d",
				provider.ID, ledger.Available, expectedAvailable, ledger.Held, summary.HeldSettlement,
			)
		}
	}

	if mismatched > 0 {
		log.Printf("[Rekonsiliasi Saldo] %d dari %d provider memiliki selisih saldo dan perlu diperiksa manual.", mismatched, checked)
	} else if checked > 0 {
		log.Printf("[Rekonsiliasi Saldo] %d provider diperiksa, seluruh saldo konsisten.", checked)
	}
}
