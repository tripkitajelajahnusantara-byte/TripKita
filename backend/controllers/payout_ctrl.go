package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
	"tripkita-provider/services"

	"github.com/gin-gonic/gin"
)

type PayoutController struct {
	service      services.PayoutService
	excelService *services.ExcelService
	pdfService   *services.PDFService
	providerRepo repositories.ProviderRepository
	bookingRepo  repositories.BookingRepository
	payoutRepo   repositories.PayoutRepository
}

func NewPayoutController(
	service services.PayoutService,
	excelService *services.ExcelService,
	pdfService *services.PDFService,
	providerRepo repositories.ProviderRepository,
	bookingRepo repositories.BookingRepository,
	payoutRepo repositories.PayoutRepository,
) *PayoutController {
	return &PayoutController{
		service:      service,
		excelService: excelService,
		pdfService:   pdfService,
		providerRepo: providerRepo,
		bookingRepo:  bookingRepo,
		payoutRepo:   payoutRepo,
	}
}

func (ctrl *PayoutController) RequestPayout(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.CreatePayoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payout, err := ctrl.service.RequestPayout(providerID.(uint), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, payout)
}

func (ctrl *PayoutController) GetProviderPayoutSummary(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	summary, err := ctrl.service.GetProviderPayoutSummary(providerID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

func (ctrl *PayoutController) ExportExcel(c *gin.Context) {
	providerIDVal, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	providerID := providerIDVal.(uint)

	provider, _ := ctrl.providerRepo.FindByID(providerID)
	bookings, _ := ctrl.bookingRepo.FindAllByProvider(providerID)
	payouts, _ := ctrl.payoutRepo.GetByProviderID(providerID)

	csvBytes, filename, err := ctrl.excelService.GenerateProviderFinanceCSV(provider, bookings, payouts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengekspor laporan"})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Data(http.StatusOK, "text/csv; charset=utf-8", csvBytes)
}

func (ctrl *PayoutController) GetPayoutPDFReceipt(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	payout, err := ctrl.payoutRepo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pencairan dana tidak ditemukan"})
		return
	}

	provider, _ := ctrl.providerRepo.FindByID(payout.ProviderID)
	pdfBytes, filename, err := ctrl.pdfService.GeneratePayoutReceiptPDF(payout, provider)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat PDF"})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

func (ctrl *PayoutController) AdminGetAllPayouts(c *gin.Context) {
	payouts, err := ctrl.service.GetAllPayouts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, payouts)
}

type ProcessPayoutRequest struct {
	Status    string `json:"status" binding:"required"` // APPROVED, REJECTED
	Notes     string `json:"notes"`
	ProofPath string `json:"proofPath"`
}

func (ctrl *PayoutController) AdminProcessPayout(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payout ID"})
		return
	}

	var req ProcessPayoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payout, err := ctrl.service.ProcessPayout(uint(id), req.Status, req.Notes, req.ProofPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, payout)
}
