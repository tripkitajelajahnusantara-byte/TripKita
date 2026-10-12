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
	photoPath, ok := ctrl.savePublicPhoto(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":   "Foto berhasil diunggah",
		"photoPath": photoPath,
	})
}

// UploadProfilePhoto mengganti foto profil mitra. Foto profil sama publiknya
// dengan foto paket, jadi memakai penyimpanan dan endpoint sajian yang sama.
//
// shortcut: berkas foto lama tidak dihapus; tambahkan pembersihan bila ruang unggahan mulai penuh.
func (ctrl *UploadController) UploadProfilePhoto(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	photoPath, ok := ctrl.savePublicPhoto(c)
	if !ok {
		return
	}
	if err := ctrl.setProfilePhoto(providerID, photoPath); err != nil {
		_ = os.Remove(filepath.Join(ctrl.uploadDir, filepath.Base(photoPath)))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan foto profil"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":      "Foto profil berhasil diperbarui",
		"profilePhoto": photoPath,
	})
}

// DeleteProfilePhoto mengembalikan avatar mitra ke inisial nama bisnis.
func (ctrl *UploadController) DeleteProfilePhoto(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	if err := ctrl.setProfilePhoto(providerID, ""); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus foto profil"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Foto profil dihapus", "profilePhoto": ""})
}

func (ctrl *UploadController) setProfilePhoto(providerID any, photoPath string) error {
	return ctrl.db.Model(&models.Provider{}).Where("id = ?", providerID).Update("profile_photo", photoPath).Error
}

// savePublicPhoto memvalidasi dan menyimpan satu foto JPG/PNG publik dari
// field "file". Bila gagal, respons error sudah ditulis dan ok bernilai false.
func (ctrl *UploadController) savePublicPhoto(c *gin.Context) (photoPath string, ok bool) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxDocumentSize+1024*1024)
	if err := c.Request.ParseMultipartForm(maxDocumentSize); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran unggahan melebihi batas 5 MB"})
		return "", false
	}

	file, err := c.FormFile("file")
	if err != nil || file.Size <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Foto wajib diunggah"})
		return "", false
	}
	if file.Size > maxDocumentSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran foto maksimal 5 MB"})
		return "", false
	}

	ext, err := validateDocumentContent(file)
	if err != nil || ext == ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Foto harus berupa JPG atau PNG yang valid"})
		return "", false
	}
	filename, err := models.NewPackagePhotoName(ext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyiapkan penyimpanan foto"})
		return "", false
	}

	savePath := filepath.Join(ctrl.uploadDir, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan foto"})
		return "", false
	}
	if err := os.Chmod(savePath, 0o600); err != nil {
		_ = os.Remove(savePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengamankan foto"})
		return "", false
	}
	return "/uploads/" + filename, true
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
