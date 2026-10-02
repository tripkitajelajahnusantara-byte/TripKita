package controllers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"tripkita-provider/services"
)

type GeocodingController struct {
	service services.GeocodingService
}

func NewGeocodingController(service services.GeocodingService) *GeocodingController {
	return &GeocodingController{service: service}
}

func (ctrl *GeocodingController) Search(c *gin.Context) {
	result, err := ctrl.service.Search(c.Request.Context(), strings.TrimSpace(c.Query("q")))
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidGeocodingAddress):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Masukkan alamat minimal 3 karakter."})
		case errors.Is(err, services.ErrGeocodingResultNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Alamat tidak ditemukan. Tambahkan nama jalan, kota, atau provinsi."})
		default:
			respondInternalError(c, "mencari alamat", err)
		}
		return
	}
	c.JSON(http.StatusOK, result)
}
