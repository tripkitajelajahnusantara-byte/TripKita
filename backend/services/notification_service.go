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

// Tipe notifikasi yang dikenali antarmuka. Nilai ini menentukan ikon dan tujuan
// navigasi saat notifikasi diklik, jadi jangan mengirim status mentah ke sini.
const (
	NotifTypePayment      = "PAYMENT"
	NotifTypeRefund       = "REFUND"
	NotifTypeReschedule   = "RESCHEDULE"
	NotifTypePayout       = "PAYOUT"
	NotifTypeRegistration = "REGISTRATION"
	NotifTypeAccount      = "ACCOUNT"
	NotifTypeGeneral      = "GENERAL"
)

// NotifyAdmins menyimpan satu notifikasi untuk setiap akun administrator aktif.
//
// Notifikasi admin tidak boleh bergantung pada satu baris admin tertentu: siapa
// pun yang berjaga harus melihat pekerjaan yang masuk, sehingga catatannya
// digandakan per akun admin.
func (s *NotificationService) NotifyAdmins(title, message, notifType, link string) error {
	var adminIDs []uint
	if err := s.db.Model(&models.Provider{}).
		Where("role = ? AND status = ?", "ADMIN", "APPROVED").
		Pluck("id", &adminIDs).Error; err != nil {
		return err
	}
	if len(adminIDs) == 0 {
		return nil
	}

	notifs := make([]models.Notification, 0, len(adminIDs))
	for _, id := range adminIDs {
		notifs = append(notifs, models.Notification{
			UserID:  id,
			Role:    "ADMIN",
			Title:   title,
			Message: message,
			Type:    notifType,
			Link:    link,
		})
	}
	return s.db.Create(&notifs).Error
}

// UnreadCount dipakai lonceng notifikasi agar jumlah tidak perlu dihitung ulang
// dari daftar yang sudah dipotong 50 baris terakhir.
func (s *NotificationService) UnreadCount(userID uint, role string) (int64, error) {
	var count int64
	err := s.db.Model(&models.Notification{}).
		Where("user_id = ? AND role = ? AND is_read = ?", userID, role, false).
		Count(&count).Error
	return count, err
}

// MarkAllAsRead menandai seluruh notifikasi milik pengguna sebagai sudah dibaca.
func (s *NotificationService) MarkAllAsRead(userID uint, role string) error {
	return s.db.Model(&models.Notification{}).
		Where("user_id = ? AND role = ? AND is_read = ?", userID, role, false).
		Update("is_read", true).Error
}
