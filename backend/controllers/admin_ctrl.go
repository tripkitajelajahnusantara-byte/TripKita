package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tripkita-provider/models"
	"tripkita-provider/services"
)

type AdminController struct {
	service services.AdminService
}

func NewAdminController(service services.AdminService) *AdminController {
	return &AdminController{service: service}
}

func (ctrl *AdminController) ListProviders(c *gin.Context) {
	providers, err := ctrl.service.ListProviders()
	if err != nil {
		respondInternalError(c, "memuat provider", err)
		return
	}

	c.JSON(http.StatusOK, providers)
}

func (ctrl *AdminController) UpdateProviderStatus(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid provider ID"})
		return
	}

	var req models.UpdateProviderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = ctrl.service.UpdateProviderStatus(uint(id), req.Status, req.VerificationNotes)
	switch {
	case errors.Is(err, services.ErrProviderStatusUnchanged):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	case errors.Is(err, services.ErrProviderRejectionReasonRequired):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Provider tidak ditemukan"})
		return
	case err != nil:
		respondInternalError(c, "memperbarui status provider", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Provider status updated successfully"})
}

func (ctrl *AdminController) UpdateProviderPlatformFee(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid provider ID"})
		return
	}

	var req models.UpdateProviderPlatformFeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Potongan platform harus berupa angka bulat antara 1 dan 100 persen"})
		return
	}
	if err := ctrl.service.UpdateProviderPlatformFee(uint(id), req.PlatformFeePercent); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":            "Potongan platform berhasil diperbarui",
		"platformFeePercent": req.PlatformFeePercent,
	})
}

func (ctrl *AdminController) DeleteProvider(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid provider ID"})
		return
	}

	err = ctrl.service.DeleteProvider(uint(id))
	if err != nil {
		respondInternalError(c, "menonaktifkan provider", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Provider berhasil dinonaktifkan; data transaksi tetap disimpan"})
}

func (ctrl *AdminController) GetStatusHistory(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid provider ID"})
		return
	}

	history, err := ctrl.service.GetProviderStatusHistory(uint(id))
	if err != nil {
		respondInternalError(c, "memuat riwayat provider", err)
		return
	}

	c.JSON(http.StatusOK, history)
}

type VerifyLegalRequest struct {
	Action string `json:"action" binding:"required,oneof=APPROVE REJECT APPROVED REJECTED"`
	Reason string `json:"reason"`
}

func (ctrl *AdminController) VerifyProviderLegal(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid provider ID"})
		return
	}

	var req VerifyLegalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = ctrl.service.VerifyProviderLegal(uint(id), req.Action, req.Reason)
	if respondVerificationError(c, "memverifikasi data legal provider", err) {
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Provider legal data verification processed"})
}

type VerifyDocumentRequest struct {
	DocType string `json:"docType" binding:"required,oneof=ktp nib siup npwp akta sertifikat"`
	Action  string `json:"action" binding:"required,oneof=APPROVE REJECT APPROVED REJECTED"`
	Reason  string `json:"reason"`
}

func (ctrl *AdminController) VerifyProviderDocument(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid provider ID"})
		return
	}

	var req VerifyDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = ctrl.service.VerifyProviderDocument(uint(id), req.DocType, req.Action, req.Reason)
	if respondVerificationError(c, "memverifikasi dokumen provider", err) {
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Provider document verification processed"})
}

// respondVerificationError memetakan penolakan bisnis verifikasi ke status 4xx
// agar klik kedua atau data yang sudah berubah tampil sebagai pesan jelas,
// bukan gangguan server. Mengembalikan true bila respons sudah dikirim.
func respondVerificationError(c *gin.Context, operation string, err error) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, services.ErrNothingToVerify):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrProviderRejectionReasonRequired):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Provider tidak ditemukan"})
	default:
		respondInternalError(c, operation, err)
	}
	return true
}
