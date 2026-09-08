package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"tripkita-provider/models"
	"tripkita-provider/services"
)

type ReviewController struct {
	service services.ReviewService
}

func NewReviewController(service services.ReviewService) *ReviewController {
	return &ReviewController{service: service}
}

func (ctrl *ReviewController) CreateReview(c *gin.Context) {
	customerIDVal, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	customerID := customerIDVal.(uint)
	review, err := ctrl.service.CreateReview(customerID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Ulasan berhasil dikirim",
		"review":  review,
	})
}

func (ctrl *ReviewController) GetReviewByBooking(c *gin.Context) {
	bookingIDStr := c.Param("bookingId")
	bookingID, err := strconv.ParseUint(bookingIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid booking ID"})
		return
	}

	review, err := ctrl.service.GetReviewByBookingID(uint(bookingID))
	if err != nil || review == nil {
		c.JSON(http.StatusOK, gin.H{"reviewed": false, "review": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reviewed": true, "review": review})
}

func (ctrl *ReviewController) GetReviewsByPackage(c *gin.Context) {
	packageIDStr := c.Param("packageId")
	packageID, err := strconv.ParseUint(packageIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid package ID"})
		return
	}

	reviews, err := ctrl.service.GetReviewsByPackageID(uint(packageID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, reviews)
}
