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
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	roleVal, _ := c.Get("role")
	role := "CUSTOMER"
	if roleVal != nil {
		role = roleVal.(string)
	}

	list, err := ctrl.notifService.GetUserNotifications(userID, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil notifikasi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   list,
	})
}

// MarkAsRead marks a notification as read
func (ctrl *NotificationController) MarkAsRead(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	idStr := c.Param("id")
	notifID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	err = ctrl.notifService.MarkAsRead(uint(notifID), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui notifikasi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Notifikasi ditandai dibaca",
	})
}
