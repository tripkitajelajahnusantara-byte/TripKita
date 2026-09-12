package services

import (
	"tripkita-provider/models"

	"gorm.io/gorm"
)

type NotificationService struct {
	db *gorm.DB
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{db: db}
}

// CreateNotification inserts a new notification record for a logged-in user
func (s *NotificationService) CreateNotification(userID uint, role, title, message, notifType, link string) error {
	notif := models.Notification{
		UserID:  userID,
		Role:    role,
		Title:   title,
		Message: message,
		Type:    notifType,
		Link:    link,
		IsRead:  false,
	}
	return s.db.Create(&notif).Error
}

// GetUserNotifications fetches notifications for a logged-in user sorted by latest first
func (s *NotificationService) GetUserNotifications(userID uint, role string) ([]models.Notification, error) {
	var list []models.Notification
	err := s.db.Where("user_id = ? AND role = ?", userID, role).Order("created_at desc").Limit(50).Find(&list).Error
	return list, err
}

// MarkAsRead marks a specific notification as read
func (s *NotificationService) MarkAsRead(notifID uint, userID uint) error {
	return s.db.Model(&models.Notification{}).Where("id = ? AND user_id = ?", notifID, userID).Update("is_read", true).Error
}
