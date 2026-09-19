package controllers

import (
	"net/http"
	"strconv"
	"time"

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

	c.JSON(http.StatusOK, gin.H{"reviewed": true})
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
		respondInternalError(c, "memuat ulasan paket", err)
		return
	}

	type publicReview struct {
		ID        uint      `json:"id"`
		PackageID uint      `json:"packageId"`
		Rating    int       `json:"rating"`
		Comment   string    `json:"comment"`
		CreatedAt time.Time `json:"createdAt"`
	}
	result := make([]publicReview, 0, len(reviews))
	for _, review := range reviews {
		result = append(result, publicReview{
			ID: review.ID, PackageID: review.PackageID, Rating: review.Rating,
			Comment: review.Comment, CreatedAt: review.CreatedAt,
		})
	}
	c.JSON(http.StatusOK, result)
}

// GetProviderReviews mengembalikan ulasan terbaru untuk mitra yang sedang masuk.
func (ctrl *ReviewController) GetProviderReviews(c *gin.Context) {
	providerIDVal, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	providerID, ok := providerIDVal.(uint)
	if !ok || providerID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limit := 10
	if raw := c.Query("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}

	reviews, err := ctrl.service.GetRecentProviderReviews(providerID, limit)
	if err != nil {
		respondInternalError(c, "memuat ulasan mitra", err)
		return
	}
	c.JSON(http.StatusOK, reviews)
}
