package jobs

import (
	"context"
	"errors"
	"log"

	"tripkita-provider/services"
)

// ReviewTripDepartures menjalankan peninjauan H-3 untuk kuota Open Trip dan
// prakiraan cuaca trip non-Open-Trip, lalu menutup tawaran yang kedaluwarsa.
//
// Job dijalankan berkala, bukan dijadwalkan tepat pada satu waktu, supaya batas
// H-3 pukul 00:01 tetap tertangkap walaupun proses sempat mati atau di-deploy
// ulang tepat pada menit tersebut. Pemeriksaannya idempoten: satu keberangkatan
// hanya menghasilkan satu permintaan keputusan.
func (r *Runner) ReviewTripDepartures(ctx context.Context) {
	if ctx.Err() != nil {
		return
	}
	if err := r.container.DepartureService.ReviewDepartures(); err != nil {
		log.Printf("[Open Trip] Peninjauan kuota keberangkatan gagal: %v", err)
	}
	if err := r.container.DepartureService.ReviewWeatherAdvisories(ctx); err != nil && !errors.Is(err, services.ErrWeatherServiceDisabled) {
		log.Printf("[Cuaca H-3] Peninjauan prakiraan trip non-open-trip gagal: %v", err)
	}

	if ctx.Err() != nil {
		return
	}
	if err := r.container.DepartureService.ExpireStaleRescheduleOffers(); err != nil {
		log.Printf("[Open Trip] Pemeriksaan tawaran jadwal kedaluwarsa gagal: %v", err)
	}
}
