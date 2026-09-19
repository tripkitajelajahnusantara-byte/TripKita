package controllers

import (
	"net/http"
	"strconv"
	"tripkita-provider/services"

	"github.com/gin-gonic/gin"
)

type NotificationController struct {
	notifService *services.NotificationService
}

func NewNotificationController(notifService *services.NotificationService) *NotificationController {
	return &NotificationController{notifService: notifService}
}

// GetUserNotifications returns the notification list for logged-in user
func (ctrl *NotificationController) GetUserNotifications(c *gin.Context) {
	// Notification.user_id masih merujuk ke ID profil Provider/Customer
	// (providers.id), bukan ID identitas login baru (users.id). AuthMiddleware
	// menyediakan nilai tersebut dengan key provider_id.
	providerIDVal, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	providerID, ok := providerIDVal.(uint)
	if !ok || providerID == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Identitas pengguna tidak valid"})
		return
	}

	roleVal, _ := c.Get("role")
	role := "CUSTOMER"
	if roleVal != nil {
		role = roleVal.(string)
	}

	list, err := ctrl.notifService.GetUserNotifications(providerID, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil notifikasi"})
		return
	}

	// Daftar dipotong 50 baris terakhir, jadi jumlah belum dibaca dihitung
	// terpisah supaya badge tetap benar untuk akun yang menumpuk notifikasi.
	unread, err := ctrl.notifService.UnreadCount(providerID, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil notifikasi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":      "success",
		"data":        list,
		"unreadCount": unread,
	})
}

// MarkAllAsRead mengosongkan badge notifikasi dalam satu permintaan.
func (ctrl *NotificationController) MarkAllAsRead(c *gin.Context) {
	providerIDVal, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	providerID, ok := providerIDVal.(uint)
	if !ok || providerID == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Identitas pengguna tidak valid"})
		return
	}

	roleVal, _ := c.Get("role")
	role := "CUSTOMER"
	if roleVal != nil {
		role = roleVal.(string)
	}

	if err := ctrl.notifService.MarkAllAsRead(providerID, role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui notifikasi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Seluruh notifikasi ditandai dibaca",
	})
}

// MarkAsRead marks a notification as read
func (ctrl *NotificationController) MarkAsRead(c *gin.Context) {
	providerIDVal, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	providerID, ok := providerIDVal.(uint)
	if !ok || providerID == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Identitas pengguna tidak valid"})
		return
	}

	idStr := c.Param("id")
	notifID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	err = ctrl.notifService.MarkAsRead(uint(notifID), providerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui notifikasi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Notifikasi ditandai dibaca",
	})
}
