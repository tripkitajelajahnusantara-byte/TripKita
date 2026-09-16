package controllers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func respondInternalError(c *gin.Context, operation string, err error) {
	log.Printf("[Controller] %s gagal: %v", operation, err)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Terjadi gangguan pada server. Silakan coba lagi."})
}
