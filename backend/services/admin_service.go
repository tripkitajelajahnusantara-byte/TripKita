package services

import (
	"errors"
	"time"
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
	repo repositories.ProviderRepository
}

func NewAdminService(repo repositories.ProviderRepository) AdminService {
	return &adminService{repo: repo}
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

	return nil
}

func (s *adminService) DeleteProvider(id uint) error {
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
