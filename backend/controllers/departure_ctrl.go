package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"tripkita-provider/models"
	"tripkita-provider/services"
)

type DepartureController struct {
	service services.DepartureService
}

func NewDepartureController(service services.DepartureService) *DepartureController {
	return &DepartureController{service: service}
}

// principalIDFromContext membaca identitas profil (providers.id) dari sesi.
// Kunci konteksnya bernama provider_id untuk seluruh peran, termasuk customer,
// mengikuti konvensi middleware autentikasi yang sudah ada.
func principalIDFromContext(c *gin.Context) (uint, bool) {
	value, exists := c.Get("provider_id")
	if !exists {
		return 0, false
	}
	id, ok := value.(uint)
	if !ok || id == 0 {
		return 0, false
	}
	return id, true
}

// GetProviderDepartures mengembalikan seluruh keberangkatan open trip milik
// mitra yang pernah ditinjau pada batas H-3, termasuk yang sudah diputuskan.
func (ctrl *DepartureController) GetProviderDepartures(c *gin.Context) {
	providerID, ok := principalIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	departures, err := ctrl.service.ListForProvider(providerID)
	if err != nil {
		respondInternalError(c, "memuat keberangkatan open trip", err)
		return
	}
	c.JSON(http.StatusOK, departures)
}

// SubmitDecision menerima keputusan mitra: tetap berangkat, batalkan, atau
// tawarkan jadwal pengganti.
func (ctrl *DepartureController) SubmitDecision(c *gin.Context) {
	providerID, ok := principalIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	departureID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID keberangkatan tidak valid"})
		return
	}

	var req models.DepartureDecisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pilihan keputusan tidak valid"})
		return
	}

	departure, err := ctrl.service.SubmitDecision(uint(departureID), providerID, &req)
	if err != nil {
		var inputErr *services.DepartureInputError
		if errors.As(err, &inputErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": inputErr.Message})
			return
		}
		respondInternalError(c, "menyimpan keputusan keberangkatan", err)
		return
	}
	c.JSON(http.StatusOK, departure)
}

// RespondToReschedule mencatat jawaban pelanggan atas tanggal pengganti.
func (ctrl *DepartureController) RespondToReschedule(c *gin.Context) {
	customerID, ok := principalIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	bookingID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID booking tidak valid"})
		return
	}

	var req models.RescheduleResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Accept == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Jawaban terima atau tolak wajib diisi"})
		return
	}

	booking, err := ctrl.service.RespondToReschedule(uint(bookingID), customerID, *req.Accept)
	if err != nil {
		var inputErr *services.DepartureInputError
		if errors.As(err, &inputErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": inputErr.Message})
			return
		}
		respondInternalError(c, "menyimpan jawaban penjadwalan ulang", err)
		return
	}

	message := "Tanggal pengganti ditolak. Pesanan diteruskan ke proses pengembalian dana."
	if *req.Accept {
		message = "Tanggal pengganti diterima. Jadwal trip Anda telah diperbarui."
	}
	c.JSON(http.StatusOK, gin.H{"message": message, "booking": booking})
}

// GetUpcomingDepartures mendaftar keberangkatan mitra yang masih akan datang,
// dipakai mitra untuk memilih trip mana yang dinyatakan terkena keadaan kahar.
func (ctrl *DepartureController) GetUpcomingDepartures(c *gin.Context) {
	providerID, ok := principalIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	candidates, err := ctrl.service.ListUpcomingForProvider(providerID)
	if err != nil {
		respondInternalError(c, "memuat jadwal keberangkatan", err)
		return
	}

	type upcomingDeparture struct {
		PackageID    uint      `json:"packageId"`
		DepartureDay string    `json:"departureDay"`
		DepartureAt  time.Time `json:"departureAt"`
		SeatsBooked  int       `json:"seatsBooked"`
		BookingCount int       `json:"bookingCount"`
	}

	result := make([]upcomingDeparture, 0, len(candidates))
	for _, candidate := range candidates {
		result = append(result, upcomingDeparture{
			PackageID:    candidate.PackageID,
			DepartureDay: candidate.DepartureDay,
			DepartureAt:  candidate.DepartureAt,
			SeatsBooked:  candidate.SeatsBooked,
			BookingCount: candidate.BookingCount,
		})
	}
	c.JSON(http.StatusOK, result)
}

// DeclareForceMajeure membatalkan satu keberangkatan karena keadaan di luar
// kendali mitra dan menawarkan tanggal pengganti kepada seluruh pelanggannya.
func (ctrl *DepartureController) DeclareForceMajeure(c *gin.Context) {
	providerID, ok := principalIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.ForceMajeureRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Paket, tanggal keberangkatan, tanggal pengganti, dan alasan (minimal 10 karakter) wajib diisi",
		})
		return
	}

	departure, err := ctrl.service.DeclareForceMajeure(providerID, &req)
	if err != nil {
		var inputErr *services.DepartureInputError
		if errors.As(err, &inputErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": inputErr.Message})
			return
		}
		respondInternalError(c, "menyatakan pembatalan keadaan kahar", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Pembatalan tercatat. Seluruh pelanggan telah dikirimi notifikasi dan email untuk menerima jadwal pengganti atau meminta pengembalian dana.",
		"departure": departure,
	})
}
