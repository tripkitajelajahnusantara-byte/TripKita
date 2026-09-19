package jobs

import (
	"context"
	"log"
)

// ReviewTripDepartures menegakkan aturan kuota minimal open trip.
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

	if ctx.Err() != nil {
		return
	}
	if err := r.container.DepartureService.ExpireStaleRescheduleOffers(); err != nil {
		log.Printf("[Open Trip] Pemeriksaan tawaran jadwal kedaluwarsa gagal: %v", err)
	}
}
