package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"tripkita-provider/models"
	"tripkita-provider/services"
)

type PackageController struct {
	service services.PackageService
}

func NewPackageController(service services.PackageService) *PackageController {
	return &PackageController{service: service}
}

func (ctrl *PackageController) Create(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.CreatePackageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pkg, err := ctrl.service.CreatePackage(providerID.(uint), &req)
	if err != nil {
		respondInternalError(c, "membuat paket", err)
		return
	}

	c.JSON(http.StatusCreated, pkg)
}

func (ctrl *PackageController) GetAll(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	packages, err := ctrl.service.GetAllPackages(providerID.(uint))
	if err != nil {
		respondInternalError(c, "memuat paket provider", err)
		return
	}

	c.JSON(http.StatusOK, packages)
}

func (ctrl *PackageController) GetAllPublic(c *gin.Context) {
	packages, err := ctrl.service.GetAllPublic()
	if err != nil {
		respondInternalError(c, "memuat paket publik", err)
		return
	}

	c.JSON(http.StatusOK, packages)
}

func (ctrl *PackageController) GetPublicProviderProfile(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID provider tidak valid"})
		return
	}

	profile, err := ctrl.service.GetPublicProviderProfile(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profil provider tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, profile)
}

func (ctrl *PackageController) GetByID(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	pkg, err := ctrl.service.GetPackageByID(uint(id), providerID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Package not found"})
		return
	}

	c.JSON(http.StatusOK, pkg)
}

func (ctrl *PackageController) Update(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req models.UpdatePackageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pkg, err := ctrl.service.UpdatePackage(uint(id), providerID.(uint), &req)
	if err != nil {
		respondInternalError(c, "memperbarui paket", err)
		return
	}

	c.JSON(http.StatusOK, pkg)
}

func (ctrl *PackageController) Delete(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	err = ctrl.service.DeletePackage(uint(id), providerID.(uint))
	if err != nil {
		respondInternalError(c, "menghapus paket", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Package deleted successfully"})
}

// GetPackageDates mengembalikan tanggal keberangkatan yang diatur mitra beserta
// statusnya, termasuk tanggal yang sudah terkunci pesanan.
func (ctrl *PackageController) GetPackageDates(c *gin.Context) {
	providerID, ok := principalIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	packageID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID paket tidak valid"})
		return
	}

	dates, err := ctrl.service.ListPackageDates(uint(packageID), providerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	earliest, latest := models.AvailabilityWindow(time.Now())
	c.JSON(http.StatusOK, gin.H{
		"dates":        dates,
		"earliestDate": earliest,
		"latestDate":   latest,
	})
}

// SetPackageDates mengganti seluruh tanggal yang dibuka mitra untuk satu paket.
func (ctrl *PackageController) SetPackageDates(c *gin.Context) {
	providerID, ok := principalIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	packageID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID paket tidak valid"})
		return
	}

	var req models.SetPackageDatesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Daftar tanggal tidak valid; gunakan format YYYY-MM-DD"})
		return
	}

	dates, err := ctrl.service.SetPackageDates(uint(packageID), providerID, req.Dates)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	earliest, latest := models.AvailabilityWindow(time.Now())
	c.JSON(http.StatusOK, gin.H{
		"message":      "Tanggal keberangkatan berhasil diperbarui",
		"dates":        dates,
		"earliestDate": earliest,
		"latestDate":   latest,
	})
}
