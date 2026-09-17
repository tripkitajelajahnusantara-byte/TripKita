package controllers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"tripkita-provider/middleware"
)

// respondInternalError mencatat penyebab asli di log server dan hanya
// mengembalikan pesan generik plus request id kepada klien, sehingga gangguan
// yang dilaporkan pengguna dapat ditelusuri tanpa membocorkan detail internal.
func respondInternalError(c *gin.Context, operation string, err error) {
	requestID := middleware.RequestIDOf(c)
	log.Printf("[Controller] request_id=%s %s gagal: %v", requestID, operation, err)
	c.JSON(http.StatusInternalServerError, gin.H{
		"error":      "Terjadi gangguan pada server. Silakan coba lagi.",
		"request_id": requestID,
	})
}
