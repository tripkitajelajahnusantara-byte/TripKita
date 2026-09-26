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

type TripPlanController struct{ service services.TripPlanService }

func NewTripPlanController(service services.TripPlanService) *TripPlanController {
	return &TripPlanController{service: service}
}

func tripPlanCustomerID(c *gin.Context) (uint, bool) {
	value, exists := c.Get("provider_id")
	id, ok := value.(uint)
	if !exists || !ok || id == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return 0, false
	}
	return id, true
}

func tripPlanID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID rencana trip tidak valid"})
		return 0, false
	}
	return uint(id), true
}

func (ctrl *TripPlanController) List(c *gin.Context) {
	customerID, ok := tripPlanCustomerID(c)
	if !ok {
		return
	}
	plans, err := ctrl.service.List(customerID)
	if err != nil {
		respondInternalError(c, "memuat rencana trip", err)
		return
	}
	c.JSON(http.StatusOK, plans)
}

func (ctrl *TripPlanController) Create(c *gin.Context) {
	customerID, ok := tripPlanCustomerID(c)
	if !ok {
		return
	}
	var req models.SaveTripPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data rencana trip tidak valid"})
		return
	}
	plan, err := ctrl.service.Create(customerID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, plan)
}

func (ctrl *TripPlanController) Update(c *gin.Context) {
	customerID, ok := tripPlanCustomerID(c)
	if !ok {
		return
	}
	planID, ok := tripPlanID(c)
	if !ok {
		return
	}
	var req models.SaveTripPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data rencana trip tidak valid"})
		return
	}
	plan, err := ctrl.service.Update(customerID, planID, &req)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, plan)
}

func (ctrl *TripPlanController) Delete(c *gin.Context) {
	customerID, ok := tripPlanCustomerID(c)
	if !ok {
		return
	}
	planID, ok := tripPlanID(c)
	if !ok {
		return
	}
	if err := ctrl.service.Delete(customerID, planID); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Rencana trip berhasil dihapus"})
}
