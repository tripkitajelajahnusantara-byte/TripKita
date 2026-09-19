package services

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"

	"tripkita-provider/authn"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type AdminService interface {
	ListProviders() ([]models.Provider, error)
	UpdateProviderStatus(id uint, status string, notes string) error
	DeleteProvider(id uint) error
	GetProviderStatusHistory(providerID uint) ([]models.ProviderStatusHistory, error)
	VerifyProviderLegal(id uint, action string, reason string) error
	VerifyProviderDocument(id uint, docType string, action string, reason string) error
}

type adminService struct {
	db           *gorm.DB
	repo         repositories.ProviderRepository
	notifService *NotificationService
}

func NewAdminService(db *gorm.DB, repo repositories.ProviderRepository, notifService *NotificationService) AdminService {
	return &adminService{db: db, repo: repo, notifService: notifService}
}

func (s *adminService) ListProviders() ([]models.Provider, error) {
	return s.repo.FindAllProviders()
}

func (s *adminService) UpdateProviderStatus(id uint, status string, notes string) error {
	provider, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	if provider.Role != "PROVIDER" {
		return errors.New("cannot change status of non-provider account")
	}

	provider.Status = status
	provider.VerificationNotes = notes
	if status == "APPROVED" {
		provider.IsVerified = true
	} else {
		provider.IsVerified = false
	}

	err = s.repo.Update(provider)
	if err != nil {
		return err
	}
	if status != "APPROVED" {
		if err := authn.RevokeAllProviderSessions(context.Background(), s.db, id); err != nil {
			return err
		}
	}

	// Log status history transition
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

	history := &models.ProviderStatusHistory{
		ProviderID: provider.ID,
		Status:     status,
		Notes:      historyNotes,
		CreatedAt:  time.Now(),
	}
	_ = s.repo.CreateStatusHistory(history)

	// Keputusan admin harus sampai ke mitra. Tanpa ini, mitra yang ditolak atau
	// disetujui hanya bisa mengetahuinya dengan mencoba login berulang kali.
	if s.notifService != nil {
		title, message := providerStatusNotification(status, historyNotes)
		if title != "" {
			if err := s.notifService.CreateNotification(provider.ID, "PROVIDER", title, message, NotifTypeAccount, "/provider/profil"); err != nil {
				log.Printf("[Notifikasi] Gagal memberi tahu provider %d tentang status %s: %v", provider.ID, status, err)
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
	if err := authn.RevokeAllProviderSessions(context.Background(), s.db, id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

func (s *adminService) GetProviderStatusHistory(providerID uint) ([]models.ProviderStatusHistory, error) {
	return s.repo.GetStatusHistory(providerID)
}

func (s *adminService) VerifyProviderLegal(id uint, action string, reason string) error {
	provider, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	if action == "APPROVED" || action == "APPROVE" {
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
		// Clear pending fields
		provider.PendingNPWP = ""
		provider.PendingBankName = ""
		provider.PendingBankAccount = ""
		provider.PendingBankAccountName = ""
	} else if action == "REJECTED" || action == "REJECT" {
		provider.LegalVerificationStatus = "REJECTED"
		provider.LegalRejectionReason = reason
	}

	return s.repo.Update(provider)
}

func (s *adminService) VerifyProviderDocument(id uint, docType string, action string, reason string) error {
	provider, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	if action == "APPROVED" || action == "APPROVE" {
		switch docType {
		case "ktp":
			if provider.PendingKtpPath != "" {
				provider.KtpPath = provider.PendingKtpPath
			}
			provider.KtpStatus = "APPROVED"
			provider.PendingKtpPath = ""
			provider.KtpRejectionReason = ""
		case "nib":
			if provider.PendingNibPath != "" {
				provider.NibPath = provider.PendingNibPath
			}
			provider.NibStatus = "APPROVED"
			provider.PendingNibPath = ""
			provider.NibRejectionReason = ""
		case "siup":
			if provider.PendingDocumentPath != "" {
				provider.DocumentPath = provider.PendingDocumentPath
			}
			provider.SiupStatus = "APPROVED"
			provider.PendingDocumentPath = ""
			provider.SiupRejectionReason = ""
		case "npwp":
			if provider.PendingNpwpPath != "" {
				provider.NpwpPath = provider.PendingNpwpPath
			}
			provider.NpwpDocStatus = "APPROVED"
			provider.PendingNpwpPath = ""
			provider.NpwpDocRejectionReason = ""
		case "akta":
			if provider.PendingAktaPath != "" {
				provider.AktaPath = provider.PendingAktaPath
			}
			provider.AktaStatus = "APPROVED"
			provider.PendingAktaPath = ""
			provider.AktaRejectionReason = ""
		case "sertifikat":
			if provider.PendingSertifikatPath != "" {
				provider.SertifikatPath = provider.PendingSertifikatPath
			}
			provider.SertifikatStatus = "APPROVED"
			provider.PendingSertifikatPath = ""
			provider.SertifikatRejectionReason = ""
		}
	} else if action == "REJECTED" || action == "REJECT" {
		switch docType {
		case "ktp":
			provider.KtpStatus = "REJECTED"
			provider.KtpRejectionReason = reason
		case "nib":
			provider.NibStatus = "REJECTED"
			provider.NibRejectionReason = reason
		case "siup":
			provider.SiupStatus = "REJECTED"
			provider.SiupRejectionReason = reason
		case "npwp":
			provider.NpwpDocStatus = "REJECTED"
			provider.NpwpDocRejectionReason = reason
		case "akta":
			provider.AktaStatus = "REJECTED"
			provider.AktaRejectionReason = reason
		case "sertifikat":
			provider.SertifikatStatus = "REJECTED"
			provider.SertifikatRejectionReason = reason
		}
	}

	return s.repo.Update(provider)
}
