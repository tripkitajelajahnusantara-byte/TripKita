package controllers

import (
	"net/http"
	"strconv"
	"github.com/gin-gonic/gin"
	"tripkita-provider/models"
	"tripkita-provider/services"
)

type PayoutController struct {
	service services.PayoutService
}

func NewPayoutController(service services.PayoutService) *PayoutController {
	return &PayoutController{service: service}
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
