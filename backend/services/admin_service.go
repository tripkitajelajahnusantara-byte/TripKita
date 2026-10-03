package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"tripkita-provider/authn"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type AdminService interface {
	MonitorBookings(filter models.AdminBookingFilter) (*models.AdminBookingMonitor, error)
	ListProviders() ([]models.Provider, error)
	UpdateProviderStatus(id uint, status string, notes string) error
	UpdateProviderPlatformFee(id uint, platformFeePercent int64) error
	DeleteProvider(id uint) error
	GetProviderStatusHistory(providerID uint) ([]models.ProviderStatusHistory, error)
	VerifyProviderProfile(id uint, action string, reason string) error
	VerifyProviderLegal(id uint, action string, reason string) error
	VerifyProviderDocument(id uint, docType string, action string, reason string) error
}

type adminService struct {
	db           *gorm.DB
	repo         repositories.ProviderRepository
	notifService *NotificationService
	emailService *EmailService
}

func NewAdminService(db *gorm.DB, repo repositories.ProviderRepository, notifService *NotificationService, emailService *EmailService) AdminService {
	return &adminService{db: db, repo: repo, notifService: notifService, emailService: emailService}
}

func (s *adminService) ListProviders() ([]models.Provider, error) {
	return s.repo.FindAllProviders()
}

// ErrInvalidPlatformFee menandai input potongan yang ditolak aturan bisnis,
// sehingga controller dapat membedakannya dari gangguan database.
var ErrInvalidPlatformFee = errors.New("potongan platform harus berupa angka bulat antara 1% dan 100%")

// ErrPlatformFeeNotProvider mencegah potongan diatur pada akun admin/customer.
var ErrPlatformFeeNotProvider = errors.New("potongan platform hanya dapat diatur untuk provider")

func (s *adminService) UpdateProviderPlatformFee(id uint, platformFeePercent int64) error {
	if !models.IsAllowedProviderPlatformFeePercent(platformFeePercent) {
		return ErrInvalidPlatformFee
	}

	// Update bersyarat di bawah kunci baris: permintaan kedua dengan nilai sama
	// tidak mengubah apa pun sehingga notifikasi dan email tidak terkirim ganda.
	var provider models.Provider
	changed := false
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&provider, id).Error; err != nil {
			return err
		}
		if provider.Role != "PROVIDER" {
			return ErrPlatformFeeNotProvider
		}
		if provider.PlatformFeePercent == platformFeePercent {
			return nil
		}
		if err := tx.Model(&provider).Update("platform_fee_percent", platformFeePercent).Error; err != nil {
			return err
		}
		changed = true
		return nil
	})
	if err != nil || !changed {
		return err
	}

	title := "Potongan Platform Diperbarui"
	message := fmt.Sprintf("Potongan platform untuk transaksi baru akun Anda ditetapkan menjadi %d%%. Transaksi yang sudah dibuat tetap menggunakan tarif sebelumnya.", platformFeePercent)
	if s.notifService != nil {
		if err := s.notifService.CreateNotification(provider.ID, "PROVIDER", title, message, NotifTypeAccount, "/provider/keuangan"); err != nil {
			log.Printf("[Notifikasi] Gagal memberi tahu provider %d tentang perubahan potongan: %v", provider.ID, err)
		}
	}
	if s.emailService != nil {
		if err := s.emailService.SendProviderPlatformFeeChangedEmail(&provider, platformFeePercent); err != nil {
			log.Printf("[Email] Gagal memberi tahu provider %d tentang perubahan potongan: %v", provider.ID, err)
		}
	}
	return nil
}

// ErrProviderStatusUnchanged dikembalikan ketika admin menyetel status yang
// sudah berlaku, misalnya klik "Setujui" berulang kali. Menolaknya mencegah
// riwayat dan notifikasi ganda untuk keputusan yang sama.
var ErrProviderStatusUnchanged = errors.New("status provider sudah sesuai; tidak ada perubahan yang diproses")

// ErrProviderRejectionReasonRequired memastikan mitra yang ditolak selalu tahu
// apa yang harus diperbaiki tanpa membuat akun baru.
var ErrProviderRejectionReasonRequired = errors.New("alasan penolakan wajib diisi")

func (s *adminService) UpdateProviderStatus(id uint, status string, notes string) error {
	notes = strings.TrimSpace(notes)
	if status == "REJECTED" && notes == "" {
		return ErrProviderRejectionReasonRequired
	}

	historyNotes := notes
	if historyNotes == "" {
		switch status {
		case "APPROVED":
			historyNotes = "Persetujuan verifikasi oleh Administrator."
		case "REJECTED":
			historyNotes = "Penolakan verifikasi oleh Administrator."
		default:
			historyNotes = "Perubahan status akun oleh Administrator."
		}
	}

	// Baris provider dikunci agar dua permintaan bersamaan tidak sama-sama
	// lolos pemeriksaan status lalu masing-masing mencatat riwayat dan notifikasi.
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var provider models.Provider
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&provider, id).Error; err != nil {
			return err
		}
		if provider.Role != "PROVIDER" {
			return errors.New("cannot change status of non-provider account")
		}
		isVerified := status == "APPROVED"
		if provider.Status == status && provider.IsVerified == isVerified {
			return ErrProviderStatusUnchanged
		}
		if provider.DeletedAt != nil && status != "APPROVED" {
			return errors.New("provider dinonaktifkan; hanya admin dapat memulihkannya melalui persetujuan")
		}

		if err := tx.Model(&provider).Updates(map[string]interface{}{
			"status":             status,
			"verification_notes": notes,
			"is_verified":        isVerified,
			"deleted_at":         nil,
		}).Error; err != nil {
			return err
		}
		// Sesi dicabut dalam transaksi yang sama: bila gagal, status ikut batal
		// sehingga admin dapat mengulang tanpa terbentur "status sudah sesuai".
		if !isVerified {
			if err := tx.Model(&models.Package{}).Where("provider_id = ?", id).Update("status", "Nonaktif").Error; err != nil {
				return err
			}
			if err := authn.RevokeAllProviderSessions(context.Background(), tx, id); err != nil {
				return err
			}
		}
		return tx.Create(&models.ProviderStatusHistory{
			ProviderID: provider.ID,
			Status:     status,
			Notes:      historyNotes,
			CreatedAt:  time.Now(),
		}).Error
	})
	if err != nil {
		return err
	}

	// Keputusan admin harus sampai ke mitra. Tanpa ini, mitra yang ditolak atau
	// disetujui hanya bisa mengetahuinya dengan mencoba login berulang kali.
	if s.notifService != nil {
		title, message := providerStatusNotification(status, historyNotes)
		if title != "" {
			if err := s.notifService.CreateNotification(id, "PROVIDER", title, message, NotifTypeAccount, "/provider/profil"); err != nil {
				log.Printf("[Notifikasi] Gagal memberi tahu provider %d tentang status %s: %v", id, status, err)
			}
		}
	}

	return nil
}

// providerStatusNotification menyusun pesan yang dibaca mitra di lonceng
// notifikasi. Alasan penolakan ikut dibawa supaya mitra tahu apa yang harus
// diperbaiki tanpa menghubungi admin lebih dulu.
func providerStatusNotification(status, notes string) (string, string) {
	switch status {
	case "APPROVED":
		return "Akun Mitra Disetujui",
			"Verifikasi akun Anda telah disetujui. Seluruh menu Partner Hub kini dapat digunakan, termasuk membuat paket dan menerima booking."
	case "REJECTED":
		message := "Verifikasi akun Anda ditolak."
		if strings.TrimSpace(notes) != "" {
			message += " Catatan admin: " + notes
		}
		return "Akun Mitra Ditolak", message
	case "PENDING":
		return "Akun Mitra Kembali Ditinjau",
			"Status akun Anda dikembalikan ke peninjauan admin. Akses menu operasional ditutup sementara sampai verifikasi selesai."
	default:
		return "", ""
	}
}

func (s *adminService) DeleteProvider(id uint) error {
	return s.repo.Delete(id)
}

func (s *adminService) GetProviderStatusHistory(providerID uint) ([]models.ProviderStatusHistory, error) {
	return s.repo.GetStatusHistory(providerID)
}

// ErrNothingToVerify dikembalikan bila tidak ada pengajuan yang menunggu
// keputusan, misalnya klik "Setujui" kedua setelah pengajuan pertama selesai.
var ErrNothingToVerify = errors.New("tidak ada pengajuan yang menunggu verifikasi; muat ulang data provider")

func isApproveAction(action string) bool { return action == "APPROVED" || action == "APPROVE" }
func isRejectAction(action string) bool  { return action == "REJECTED" || action == "REJECT" }

// saveVerifiedProvider menyimpan hasil verifikasi pada baris yang sudah dikunci
// tanpa menyentuh status akun yang dikelola UpdateProviderStatus.
func saveVerifiedProvider(tx *gorm.DB, provider *models.Provider) error {
	return tx.Omit("status", "is_verified", "verification_notes", "platform_fee_percent").Save(provider).Error
}

func (s *adminService) VerifyProviderProfile(id uint, action string, reason string) error {
	reason = strings.TrimSpace(reason)
	if isRejectAction(action) && reason == "" {
		return ErrProviderRejectionReasonRequired
	}

	var provider models.Provider
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&provider, id).Error; err != nil {
			return err
		}
		if provider.ProfileVerificationStatus != "PENDING" {
			return ErrNothingToVerify
		}

		if isApproveAction(action) {
			var identity models.User
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("provider_id = ?", provider.ID).First(&identity).Error; err != nil {
				return err
			}
			var duplicateCount int64
			if err := tx.Model(&models.User{}).
				Where("provider_id <> ? AND LOWER(email) = LOWER(?)", provider.ID, provider.PendingEmail).
				Count(&duplicateCount).Error; err != nil {
				return err
			}
			if duplicateCount > 0 {
				return &AuthInputError{Message: "email pengajuan sudah digunakan akun lain"}
			}
			if err := tx.Model(&identity).Update("email", provider.PendingEmail).Error; err != nil {
				if errors.Is(err, gorm.ErrDuplicatedKey) {
					return &AuthInputError{Message: "email pengajuan sudah digunakan akun lain"}
				}
				return err
			}

			contactChanged := provider.PicName != provider.PendingPicName || provider.Email != provider.PendingEmail ||
				provider.WhatsApp != provider.PendingWhatsApp || provider.Instagram != provider.PendingInstagram ||
				provider.TikTok != provider.PendingTikTok || provider.Website != provider.PendingWebsite
			provider.BusinessName = provider.PendingBusinessName
			provider.BusinessCategory = provider.PendingBusinessCategory
			provider.OperationalProvince = provider.PendingOperationalProvince
			provider.OperationalCity = provider.PendingOperationalCity
			provider.Description = provider.PendingDescription
			provider.PicName = provider.PendingPicName
			provider.Email = provider.PendingEmail
			provider.WhatsApp = provider.PendingWhatsApp
			provider.Instagram = provider.PendingInstagram
			provider.TikTok = provider.PendingTikTok
			provider.Website = provider.PendingWebsite
			if contactChanged {
				now := time.Now()
				provider.ContactLastUpdatedAt = &now
			}
			provider.ProfileVerificationStatus = "APPROVED"
			provider.ProfileRejectionReason = ""
			provider.PendingBusinessName = ""
			provider.PendingBusinessCategory = ""
			provider.PendingOperationalProvince = ""
			provider.PendingOperationalCity = ""
			provider.PendingDescription = ""
			provider.PendingPicName = ""
			provider.PendingEmail = ""
			provider.PendingWhatsApp = ""
			provider.PendingInstagram = ""
			provider.PendingTikTok = ""
			provider.PendingWebsite = ""
		} else if isRejectAction(action) {
			provider.ProfileVerificationStatus = "REJECTED"
			provider.ProfileRejectionReason = reason
		}
		return saveVerifiedProvider(tx, &provider)
	})
	if err != nil {
		return err
	}

	if s.notifService != nil {
		title := "Perubahan Profil Disetujui"
		message := "Perubahan informasi bisnis dan kontak Anda telah disetujui dan sekarang sudah berlaku."
		if isRejectAction(action) {
			title = "Perubahan Profil Ditolak"
			message = "Perubahan informasi bisnis dan kontak Anda ditolak. Catatan admin: " + reason
		}
		if err := s.notifService.CreateNotification(provider.ID, "PROVIDER", title, message, NotifTypeAccount, "/provider/profil"); err != nil {
			log.Printf("[Notifikasi] Gagal memberi tahu provider %d tentang verifikasi profil: %v", provider.ID, err)
		}
	}
	return nil
}

func (s *adminService) VerifyProviderLegal(id uint, action string, reason string) error {
	reason = strings.TrimSpace(reason)
	if isRejectAction(action) && reason == "" {
		return ErrProviderRejectionReasonRequired
	}

	var provider models.Provider
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&provider, id).Error; err != nil {
			return err
		}
		if provider.LegalVerificationStatus != "PENDING" {
			return ErrNothingToVerify
		}

		if isApproveAction(action) {
			if provider.PendingNPWP != "" {
				provider.NPWP = provider.PendingNPWP
			}
			if provider.PendingBankName != "" {
				provider.BankName = provider.PendingBankName
			}
			if provider.PendingBankAccount != "" {
				provider.BankAccount = provider.PendingBankAccount
			}
			if provider.PendingBankAccountName != "" {
				provider.BankAccountName = provider.PendingBankAccountName
			}
			provider.LegalVerificationStatus = "APPROVED"
			provider.LegalRejectionReason = ""
			provider.PendingNPWP = ""
			provider.PendingBankName = ""
			provider.PendingBankAccount = ""
			provider.PendingBankAccountName = ""
		} else if isRejectAction(action) {
			provider.LegalVerificationStatus = "REJECTED"
			provider.LegalRejectionReason = reason
		}

		return saveVerifiedProvider(tx, &provider)
	})
	if err != nil {
		return err
	}
	if s.notifService != nil {
		title := "Data Legal & Rekening Disetujui"
		message := "Perubahan data legal dan rekening Anda telah disetujui dan sekarang sudah berlaku."
		if isRejectAction(action) {
			title = "Data Legal & Rekening Ditolak"
			message = "Perubahan data legal dan rekening Anda ditolak. Catatan admin: " + reason
		}
		if err := s.notifService.CreateNotification(provider.ID, "PROVIDER", title, message, NotifTypeAccount, "/provider/profil"); err != nil {
			log.Printf("[Notifikasi] Gagal memberi tahu provider %d tentang verifikasi legal: %v", provider.ID, err)
		}
	}
	return nil
}

// providerDocumentFields menunjuk kolom milik satu jenis dokumen sehingga
// persetujuan dan penolakan memakai aturan yang sama untuk semua dokumen.
func providerDocumentFields(p *models.Provider, docType string) (active, pending, status, rejection *string, ok bool) {
	switch docType {
	case "ktp":
		return &p.KtpPath, &p.PendingKtpPath, &p.KtpStatus, &p.KtpRejectionReason, true
	case "nib":
		return &p.NibPath, &p.PendingNibPath, &p.NibStatus, &p.NibRejectionReason, true
	case "siup":
		return &p.DocumentPath, &p.PendingDocumentPath, &p.SiupStatus, &p.SiupRejectionReason, true
	case "npwp":
		return &p.NpwpPath, &p.PendingNpwpPath, &p.NpwpDocStatus, &p.NpwpDocRejectionReason, true
	case "akta":
		return &p.AktaPath, &p.PendingAktaPath, &p.AktaStatus, &p.AktaRejectionReason, true
	case "sertifikat":
		return &p.SertifikatPath, &p.PendingSertifikatPath, &p.SertifikatStatus, &p.SertifikatRejectionReason, true
	}
	return nil, nil, nil, nil, false
}

func (s *adminService) VerifyProviderDocument(id uint, docType string, action string, reason string) error {
	reason = strings.TrimSpace(reason)
	if isRejectAction(action) && reason == "" {
		return ErrProviderRejectionReasonRequired
	}

	var provider models.Provider
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&provider, id).Error; err != nil {
			return err
		}
		active, pending, status, rejection, ok := providerDocumentFields(&provider, docType)
		if !ok {
			return fmt.Errorf("jenis dokumen %q tidak dikenal", docType)
		}
		if *pending == "" && *status != "PENDING" {
			return ErrNothingToVerify
		}

		if isApproveAction(action) {
			if *pending != "" {
				*active = *pending
			}
			if *active == "" {
				return ErrNothingToVerify
			}
			*status = "APPROVED"
			*pending = ""
			*rejection = ""
		} else if isRejectAction(action) {
			*status = "REJECTED"
			*rejection = reason
			// Berkas yang ditolak tidak lagi menunggu keputusan; mitra mengunggah ulang.
			*pending = ""
		}

		return saveVerifiedProvider(tx, &provider)
	})
	if err != nil {
		return err
	}
	if s.notifService != nil {
		title := "Dokumen Mitra Disetujui"
		message := fmt.Sprintf("Dokumen %s Anda telah disetujui.", strings.ToUpper(docType))
		if isRejectAction(action) {
			title = "Dokumen Mitra Ditolak"
			message = fmt.Sprintf("Dokumen %s Anda ditolak. Catatan admin: %s", strings.ToUpper(docType), reason)
		}
		if err := s.notifService.CreateNotification(provider.ID, "PROVIDER", title, message, NotifTypeAccount, "/provider/profil"); err != nil {
			log.Printf("[Notifikasi] Gagal memberi tahu provider %d tentang verifikasi dokumen: %v", provider.ID, err)
		}
	}
	return nil
}
