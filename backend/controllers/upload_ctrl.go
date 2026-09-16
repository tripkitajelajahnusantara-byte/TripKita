package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tripkita-provider/models"
)

const maxDocumentSize = 5 * 1024 * 1024

type UploadController struct {
	db *gorm.DB
}

func NewUploadController(db *gorm.DB) *UploadController {
	return &UploadController{db: db}
}

func (ctrl *UploadController) UploadDocument(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxDocumentSize+1024*1024)
	if err := c.Request.ParseMultipartForm(maxDocumentSize); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran unggahan melebihi batas 5 MB"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil || file.Size <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dokumen wajib diunggah"})
		return
	}
	if file.Size > maxDocumentSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran dokumen maksimal 5 MB"})
		return
	}

	ext, err := validateDocumentContent(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	filename, err := randomDocumentName(ext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyiapkan penyimpanan dokumen"})
		return
	}

	savePath := filepath.Join("uploads", filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan dokumen"})
		return
	}
	if err := os.Chmod(savePath, 0o600); err != nil {
		_ = os.Remove(savePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengamankan dokumen"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Dokumen berhasil diunggah",
		"documentPath": "/uploads/" + filename,
	})
}

func validateDocumentContent(fileHeader *multipart.FileHeader) (string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", errors.New("dokumen tidak dapat dibaca")
	}
	defer file.Close()

	header := make([]byte, 512)
	n, err := file.Read(header)
	if err != nil && !errors.Is(err, io.EOF) {
		return "", errors.New("dokumen tidak dapat dibaca")
	}
	mimeType := http.DetectContentType(header[:n])
	extByMIME := map[string]string{
		"application/pdf": ".pdf",
		"image/jpeg":      ".jpg",
		"image/png":       ".png",
	}
	ext, ok := extByMIME[mimeType]
	if !ok {
		return "", errors.New("dokumen harus berupa PDF, JPG, atau PNG yang valid")
	}
	return ext, nil
}

func randomDocumentName(ext string) (string, error) {
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	return "doc_" + hex.EncodeToString(randomBytes) + ext, nil
}

func (ctrl *UploadController) GetProviderDocument(c *gin.Context) {
	providerIDValue, ok := c.Get("provider_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	providerID, ok := providerIDValue.(uint)
	if !ok || providerID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	ctrl.serveDocument(c, &providerID)
}

func (ctrl *UploadController) GetAdminDocument(c *gin.Context) {
	ctrl.serveDocument(c, nil)
}

func (ctrl *UploadController) serveDocument(c *gin.Context, providerID *uint) {
	documentPath := strings.TrimSpace(c.Query("path"))
	filename := filepath.Base(documentPath)
	if documentPath == "" || filename == "." || documentPath != "/uploads/"+filename {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Path dokumen tidak valid"})
		return
	}

	query := ctrl.db.Model(&models.Provider{}).Where(`
		document_path = ? OR ktp_path = ? OR nib_path = ? OR npwp_path = ? OR akta_path = ? OR sertifikat_path = ? OR
		pending_document_path = ? OR pending_ktp_path = ? OR pending_nib_path = ? OR pending_npwp_path = ? OR pending_akta_path = ? OR pending_sertifikat_path = ?`,
		documentPath, documentPath, documentPath, documentPath, documentPath, documentPath,
		documentPath, documentPath, documentPath, documentPath, documentPath, documentPath,
	)
	if providerID != nil {
		query = query.Where("id = ?", *providerID)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Dokumen tidak dapat diperiksa"})
		return
	}
	if count == 0 && providerID == nil {
		if err := ctrl.db.Model(&models.Booking{}).Where("payment_proof = ?", documentPath).Count(&count).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Dokumen tidak dapat diperiksa"})
			return
		}
	}
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dokumen tidak ditemukan"})
		return
	}

	localPath := filepath.Join("uploads", filename)
	if _, err := os.Stat(localPath); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dokumen tidak ditemukan"})
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, filename))
	c.File(localPath)
}
