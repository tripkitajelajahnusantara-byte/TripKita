package controllers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"tripkita-provider/config"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
	"tripkita-provider/services"

	"github.com/gin-gonic/gin"
)

type PayoutController struct {
	cfg          *config.Config
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
	cfg *config.Config,
) *PayoutController {
	return &PayoutController{
		cfg:          cfg,
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
		respondInternalError(c, "memuat ringkasan payout", err)
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
	if payout.Status != "APPROVED" {
		c.JSON(http.StatusConflict, gin.H{"error": "Bukti pencairan hanya tersedia setelah transfer disetujui"})
		return
	}
	role, _ := c.Get("role")
	requesterID, _ := c.Get("provider_id")
	if role != "ADMIN" && (role != "PROVIDER" || requesterID == nil || payout.ProviderID != requesterID.(uint)) {
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
		respondInternalError(c, "memuat payout admin", err)
		return
	}
	c.JSON(http.StatusOK, payouts)
}

type ProcessPayoutRequest struct {
	Status    string `json:"status" binding:"required,oneof=APPROVED REJECTED"`
	Notes     string `json:"notes" binding:"required,min=10,max=1000"`
	ProofPath string `json:"proofPath" binding:"max=500"`
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
	req.Notes = strings.TrimSpace(req.Notes)
	if len(req.Notes) < 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Catatan proses payout minimal 10 karakter"})
		return
	}

	payout, err := ctrl.service.ProcessPayout(uint(id), req.Status, req.Notes, req.ProofPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, payout)
}

// XenditPayoutWebhook menerima status akhir pencairan dari payment gateway.
//
// Token callback dibandingkan constant-time seperti webhook pembayaran, dan
// respons non-2xx sengaja dikembalikan saat pemrosesan gagal agar gateway
// mengirim ulang eventnya.
func (ctrl *PayoutController) IPaymuPayoutWebhook(c *gin.Context) {
	payoutID := c.PostForm("payout_id")
	referenceID := c.PostForm("reference_id")
	status := c.PostForm("status")
	failureCode := c.PostForm("failure_code")

	if payoutID == "" {
		var req struct {
			PayoutID    string `json:"payout_id"`
			ReferenceID string `json:"reference_id"`
			Status      string `json:"status"`
			FailureCode string `json:"failure_code"`
		}
		if err := c.ShouldBindJSON(&req); err == nil {
			payoutID = req.PayoutID
			referenceID = req.ReferenceID
			status = req.Status
			failureCode = req.FailureCode
		}
	}

	if strings.TrimSpace(payoutID) == "" || strings.TrimSpace(referenceID) == "" {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
		return
	}

	if err := ctrl.service.HandlePayoutCallback(payoutID, referenceID, status, failureCode); err != nil {
		if errors.Is(err, services.ErrUnknownPayoutReference) {
			log.Printf("[Payout Webhook] Callback dengan reference tidak dikenali diabaikan")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Reference pencairan tidak dikenali"})
			return
		}
		respondInternalError(c, "memproses callback pencairan", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
