package services

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"tripkita-provider/config"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type AuthService interface {
	Register(req *models.RegisterRequest) (*models.Provider, error)
	Login(req *models.LoginRequest) (*models.LoginResponse, error)
	GetProfile(providerID uint) (*models.Provider, error)
	UpdateProfile(providerID uint, req *models.UpdateProfileRequest) (*models.Provider, error)
}

type authService struct {
	repo repositories.ProviderRepository
	cfg  *config.Config
}

func NewAuthService(repo repositories.ProviderRepository, cfg *config.Config) AuthService {
	return &authService{repo: repo, cfg: cfg}
}

func (s *authService) Register(req *models.RegisterRequest) (*models.Provider, error) {
	// Check if email already exists
	existing, _ := s.repo.FindByEmail(req.Email)
	if existing != nil {
		return nil, errors.New("email is already registered")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	provider := &models.Provider{
		BusinessName:        req.BusinessName,
		BusinessCategory:     req.BusinessCategory,
		OperationalProvince: req.OperationalProvince,
		OperationalCity:     req.OperationalCity,
		Description:      req.Description,
		DocumentUploaded: req.DocumentUploaded,
		DocumentPath:     req.DocumentPath,
		KtpPath:          req.KtpPath,
		NibPath:          req.NibPath,
		NpwpPath:         req.NpwpPath,
		AktaPath:         req.AktaPath,
		SertifikatPath:   req.SertifikatPath,
		Instagram:        req.Instagram,
		TikTok:           req.TikTok,
		PicName:          req.PicName,
		Email:            req.Email,
		PasswordHash:     string(hashedPassword),
		WhatsApp:         req.WhatsApp,
		Role:             "PROVIDER",
		Status:           "PENDING",
		IsVerified:       false,
	}

	err = s.repo.Create(provider)
	if err != nil {
		return nil, err
	}

	// Create initial status history entry
	history := &models.ProviderStatusHistory{
		ProviderID: provider.ID,
		Status:     "PENDING",
		Notes:      "Pendaftaran akun baru via form registrasi.",
		CreatedAt:  time.Now(),
	}
	_ = s.repo.CreateStatusHistory(history)

	return provider, nil
}

func (s *authService) Login(req *models.LoginRequest) (*models.LoginResponse, error) {
	provider, err := s.repo.FindByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	err = bcrypt.CompareHashAndPassword([]byte(provider.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Check status for providers
	if provider.Role == "PROVIDER" && provider.Status != "APPROVED" {
		if provider.Status == "PENDING" {
			return nil, errors.New("pendaftaran Anda sedang menunggu verifikasi admin")
		}
		if provider.Status == "REJECTED" {
			return nil, errors.New("pendaftaran Anda ditolak oleh admin")
		}
		return nil, errors.New("akun Anda belum aktif")
	}

	// Generate JWT Token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"provider_id": provider.ID,
		"role":        provider.Role,
		"exp":         time.Now().Add(time.Hour * 72).Unix(), // 3 days
	})

	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}

	return &models.LoginResponse{
		Token:    tokenString,
		Provider: *provider,
	}, nil
}

func (s *authService) GetProfile(providerID uint) (*models.Provider, error) {
	return s.repo.FindByID(providerID)
}

func (s *authService) UpdateProfile(providerID uint, req *models.UpdateProfileRequest) (*models.Provider, error) {
	provider, err := s.repo.FindByID(providerID)
	if err != nil {
		return nil, err
	}

	// 1. Validation for Contact & Social Media changes (Max 1 update in 7 days)
	contactChanged := false
	if req.PicName != "" && req.PicName != provider.PicName {
		contactChanged = true
	}
	if req.WhatsApp != "" && req.WhatsApp != provider.WhatsApp {
		contactChanged = true
	}
	if req.Email != "" && req.Email != provider.Email {
		contactChanged = true
	}
	if req.Instagram != "" && req.Instagram != provider.Instagram {
		contactChanged = true
	}
	if req.TikTok != "" && req.TikTok != provider.TikTok {
		contactChanged = true
	}
	if req.Website != "" && req.Website != provider.Website {
		contactChanged = true
	}

	if contactChanged {
		if provider.ContactLastUpdatedAt != nil {
			if time.Since(*provider.ContactLastUpdatedAt) < 7*24*time.Hour {
				return nil, errors.New("perubahan kontak hanya dapat dilakukan 1 kali setiap 7 hari untuk menjaga keamanan akun dan kepercayaan pelanggan")
			}
		}

		// Update fields if allowed
		if req.PicName != "" {
			provider.PicName = req.PicName
		}
		if req.WhatsApp != "" {
			provider.WhatsApp = req.WhatsApp
		}
		if req.Email != "" {
			// Check if email already registered by other
			existing, _ := s.repo.FindByEmail(req.Email)
			if existing != nil && existing.ID != provider.ID {
				return nil, errors.New("email is already registered by another account")
			}
			provider.Email = req.Email
		}
		if req.Instagram != "" {
			provider.Instagram = req.Instagram
		}
		if req.TikTok != "" {
			provider.TikTok = req.TikTok
		}
		if req.Website != "" {
			provider.Website = req.Website
		}
		now := time.Now()
		provider.ContactLastUpdatedAt = &now
	}

	// 2. Data Legal & Rekening updates (Pending approval workflow)
	legalChanged := false
	if req.NPWP != "" && req.NPWP != provider.NPWP {
		legalChanged = true
	}
	if req.BankName != "" && req.BankName != provider.BankName {
		legalChanged = true
	}
	if req.BankAccount != "" && req.BankAccount != provider.BankAccount {
		legalChanged = true
	}
	if req.BankAccountName != "" && req.BankAccountName != provider.BankAccountName {
		legalChanged = true
	}

	if legalChanged {
		if req.NPWP != "" {
			provider.PendingNPWP = req.NPWP
		} else {
			provider.PendingNPWP = provider.NPWP
		}
		if req.BankName != "" {
			provider.PendingBankName = req.BankName
		} else {
			provider.PendingBankName = provider.BankName
		}
		if req.BankAccount != "" {
			provider.PendingBankAccount = req.BankAccount
		} else {
			provider.PendingBankAccount = provider.BankAccount
		}
		if req.BankAccountName != "" {
			provider.PendingBankAccountName = req.BankAccountName
		} else {
			provider.PendingBankAccountName = provider.BankAccountName
		}
		provider.LegalVerificationStatus = "PENDING"
		provider.LegalRejectionReason = ""
	}

	// 3. Document updates (Pending approval workflow)
	if req.KtpPath != "" && req.KtpPath != provider.KtpPath {
		provider.PendingKtpPath = req.KtpPath
		provider.KtpStatus = "PENDING"
		provider.KtpRejectionReason = ""
	}
	if req.NibPath != "" && req.NibPath != provider.NibPath {
		provider.PendingNibPath = req.NibPath
		provider.NibStatus = "PENDING"
		provider.NibRejectionReason = ""
	}
	if req.DocumentPath != "" && req.DocumentPath != provider.DocumentPath {
		provider.PendingDocumentPath = req.DocumentPath
		provider.SiupStatus = "PENDING"
		provider.SiupRejectionReason = ""
	}
	if req.NpwpPath != "" && req.NpwpPath != provider.NpwpPath {
		provider.PendingNpwpPath = req.NpwpPath
		provider.NpwpDocStatus = "PENDING"
		provider.NpwpDocRejectionReason = ""
	}
	if req.AktaPath != "" && req.AktaPath != provider.AktaPath {
		provider.PendingAktaPath = req.AktaPath
		provider.AktaStatus = "PENDING"
		provider.AktaRejectionReason = ""
	}
	if req.SertifikatPath != "" && req.SertifikatPath != provider.SertifikatPath {
		provider.PendingSertifikatPath = req.SertifikatPath
		provider.SertifikatStatus = "PENDING"
		provider.SertifikatRejectionReason = ""
	}

	// 4. Basic Profile fields
	if req.BusinessName != "" {
		provider.BusinessName = req.BusinessName
	}
	if req.BusinessCategory != "" {
		provider.BusinessCategory = req.BusinessCategory
	}
	if req.OperationalProvince != "" {
		provider.OperationalProvince = req.OperationalProvince
	}
	if req.OperationalCity != "" {
		provider.OperationalCity = req.OperationalCity
	}
	if req.Description != "" {
		provider.Description = req.Description
	}
	if req.DocumentUploaded != nil {
		provider.DocumentUploaded = *req.DocumentUploaded
	}

	err = s.repo.Update(provider)
	if err != nil {
		return nil, err
	}

	return provider, nil
}
