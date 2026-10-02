package services

import (
	"sort"
	"time"
	"tripkita-provider/models"
)

// buildBookingPayouts menghitung hak dan status pencairan DP serta pelunasan
// untuk setiap booking. Pencairan dilakukan per trip, sehingga setiap tahap
// hanya dapat diajukan sekali dengan nominal sisa hak booking tersebut.
//
// Pengajuan lama yang dibuat sebelum pencairan per trip (tanpa booking_id)
// dialokasikan berurutan ke booking terlama agar booking yang dananya sudah
// ikut dicairkan secara gabungan tidak tampil seolah masih dapat diajukan.
func buildBookingPayouts(bookings []models.Booking, payouts []models.Payout, now time.Time) []models.BookingPayout {
	type stageKey struct {
		bookingID uint
		payoutTyp string
	}
	type stageAgg struct {
		reserved  int64
		pending   bool
		payoutID  *uint
		proofPath string
	}
	assigned := map[stageKey]*stageAgg{}
	legacy := map[string]int64{}

	for i := range payouts {
		p := payouts[i]
		reserved := p.Status == models.PayoutStatusPending || p.Status == models.PayoutStatusProcessing || p.Status == models.PayoutStatusApproved
		if !reserved {
			continue
		}
		if p.BookingID == nil {
			legacy[p.Type] += p.Amount
			continue
		}
		key := stageKey{*p.BookingID, p.Type}
		agg := assigned[key]
		if agg == nil {
			agg = &stageAgg{}
			assigned[key] = agg
		}
		agg.reserved += p.Amount
		if p.Status != models.PayoutStatusApproved {
			agg.pending = true
		}
		// Payout terbaru menjadi rujukan bukti transfer yang ditampilkan.
		if agg.payoutID == nil || p.ID > *agg.payoutID {
			id := p.ID
			agg.payoutID = &id
			agg.proofPath = p.ProofPath
		}
	}

	ordered := make([]models.Booking, 0, len(bookings))
	for _, b := range bookings {
		_, hasDP := assigned[stageKey{b.ID, "DP_50"}]
		_, hasSettlement := assigned[stageKey{b.ID, "PELUNASAN_50"}]
		if bookingGeneratesProviderEarning(b) || hasDP || hasSettlement {
			ordered = append(ordered, b)
		}
	}
	sort.SliceStable(ordered, func(i, j int) bool { return ordered[i].ID < ordered[j].ID })

	stage := func(b models.Booking, payoutType string, amount int64, unlocked bool) models.BookingPayoutStage {
		result := models.BookingPayoutStage{Amount: amount}
		availableAt := b.TripEndDate
		if payoutType == "DP_50" {
			availableAt = dpAvailableAt(b)
		}
		if !availableAt.IsZero() {
			result.AvailableAt = &availableAt
		}
		covered := int64(0)
		pending := false
		if agg := assigned[stageKey{b.ID, payoutType}]; agg != nil {
			covered = agg.reserved
			pending = agg.pending
			result.PayoutID = agg.payoutID
			result.ProofPath = agg.proofPath
		}
		if remaining := amount - covered; remaining > 0 && legacy[payoutType] > 0 {
			take := remaining
			if legacy[payoutType] < take {
				take = legacy[payoutType]
			}
			legacy[payoutType] -= take
			covered += take
		}
		result.Remaining = amount - covered
		if result.Remaining < 0 {
			result.Remaining = 0
		}

		switch {
		case pending:
			result.Status = models.BookingPayoutRequested
		case result.Remaining == 0 && covered > 0:
			result.Status = models.BookingPayoutPaid
		case result.Remaining == 0:
			result.Status = models.BookingPayoutNone
		case !unlocked:
			result.Status = models.BookingPayoutLocked
			if payoutType == "DP_50" {
				result.BlockedReason = "DP dapat diajukan mulai H-3 sebelum trip dimulai, setelah pembayaran lunas."
			} else {
				result.BlockedReason = "Pelunasan dapat diajukan setelah waktu selesai perjalanan."
			}
			if availableAt.IsZero() {
				result.BlockedReason = "Jadwal perjalanan belum tersedia. Hubungi admin untuk memperbarui jadwal."
			}
		default:
			result.Status = models.BookingPayoutAvailable
		}
		return result
	}

	items := make([]models.BookingPayout, 0, len(ordered))
	for _, b := range ordered {
		var split models.EarningSplit
		if bookingGeneratesProviderEarning(b) {
			split = models.SplitBookingEarning(b.TotalPrice, b.PlatformFeePercent)
		}
		items = append(items, models.BookingPayout{
			BookingID:     b.ID,
			BookingCode:   b.BookingCode,
			PackageName:   b.Package.Name,
			CustomerName:  b.CustomerName,
			Guests:        b.Guests,
			TripDate:      b.TripDate,
			TripEndDate:   b.TripEndDate,
			BookingStatus: b.Status,
			NetEarning:    split.NetEarning,
			DP:            stage(b, "DP_50", split.DPAmount, dpCanBePaid(b, now)),
			Settlement:    stage(b, "PELUNASAN_50", split.SettlementHeld, settlementCanBePaid(b, now)),
		})
	}

	// Trip terdekat/terbaru tampil paling atas.
	sort.SliceStable(items, func(i, j int) bool { return items[i].TripDate.After(items[j].TripDate) })
	return items
}

// findBookingPayoutStage mengambil tahap pencairan booking tertentu.
func findBookingPayoutStage(items []models.BookingPayout, bookingID uint, payoutType string) (*models.BookingPayoutStage, bool) {
	for i := range items {
		if items[i].BookingID != bookingID {
			continue
		}
		if payoutType == "DP_50" {
			return &items[i].DP, true
		}
		return &items[i].Settlement, true
	}
	return nil, false
}
