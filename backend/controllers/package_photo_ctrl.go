package controllers

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"

	"tripkita-provider/models"
)

// UploadPackagePhoto menyimpan foto paket yang memang ditujukan untuk publik.
// Nama berkas berprefiks "pkg_" sehingga tidak pernah dapat dipakai sebagai
// dokumen verifikasi mitra (validateManagedDocumentPaths mewajibkan "doc_"),
// dan path yang dikembalikan relatif supaya database tidak terikat host.
func (ctrl *UploadController) UploadPackagePhoto(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxDocumentSize+1024*1024)
	if err := c.Request.ParseMultipartForm(maxDocumentSize); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran unggahan melebihi batas 5 MB"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil || file.Size <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Foto wajib diunggah"})
		return
	}
	if file.Size > maxDocumentSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran foto maksimal 5 MB"})
		return
	}

	ext, err := validateDocumentContent(file)
	if err != nil || ext == ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Foto harus berupa JPG atau PNG yang valid"})
		return
	}
	filename, err := models.NewPackagePhotoName(ext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyiapkan penyimpanan foto"})
		return
	}

	savePath := filepath.Join(ctrl.uploadDir, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan foto"})
		return
	}
	if err := os.Chmod(savePath, 0o600); err != nil {
		_ = os.Remove(savePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengamankan foto"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Foto berhasil diunggah",
		"photoPath": "/uploads/" + filename,
	})
}

// ServePackagePhoto menyajikan foto paket pada /uploads/:filename. Hanya berkas
// "pkg_" yang dapat diakses; dokumen verifikasi dan bukti transfer ("doc_")
// tetap hanya lewat endpoint berotorisasi di semua environment.
func (ctrl *UploadController) ServePackagePhoto(c *gin.Context) {
	filename := c.Param("filename")
	if !models.IsPackagePhotoName(filename) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Berkas tidak ditemukan"})
		return
	}
	localPath := filepath.Join(ctrl.uploadDir, filename)
	if info, err := os.Stat(localPath); err != nil || info.IsDir() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Berkas tidak ditemukan"})
		return
	}
	// Nama berkas acak dan tidak pernah ditimpa, jadi aman di-cache lama.
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Header("X-Content-Type-Options", "nosniff")
	c.File(localPath)
}
