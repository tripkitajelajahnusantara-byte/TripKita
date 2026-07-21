package controllers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

type UploadController struct{}

func NewUploadController() *UploadController {
	return &UploadController{}
}

func (ctrl *UploadController) UploadDocument(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded or file parameter 'file' is missing"})
		return
	}

	// Validate file size (max 5MB)
	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds maximum limit of 5MB"})
		return
	}

	// Validate file extension
	ext := filepath.Ext(file.Filename)
	if ext != ".pdf" && ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only PDF, JPG, JPEG, and PNG files are allowed"})
		return
	}

	// Generate unique file name
	filename := fmt.Sprintf("doc_%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join("uploads", filename)

	// Save the file
	err = c.SaveUploadedFile(file, savePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to save file: %v", err)})
		return
	}

	// Return file URL/path
	fileURL := fmt.Sprintf("/uploads/%s", filename)
	c.JSON(http.StatusOK, gin.H{
		"message":      "File uploaded successfully",
		"documentPath": fileURL,
		"fileName":     file.Filename,
	})
}
