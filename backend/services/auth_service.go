package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"tripkita-provider/config"
	"tripkita-provider/database"
	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

type AuthService interface {
	Register(req *models.RegisterRequest) (*models.Provider, error)
	RegisterCustomer(req *models.RegisterCustomerRequest) (*models.LoginResponse, error)
	Login(req *models.LoginRequest) (*models.LoginResponse, error)
	GetProfile(providerID uint) (*models.Provider, error)
	UpdateProfile(providerID uint, req *models.UpdateProfileRequest) (*models.Provider, error)
	ForgotPassword(email string) error
	ResetPassword(email string, token string, newPassword string) error
}

type authService struct {
	repo         repositories.ProviderRepository
	cfg          *config.Config
	emailService *EmailService
}

type AuthInputError struct{ Message string }

func (e *AuthInputError) Error() string { return e.Message }

func NewAuthService(repo repositories.ProviderRepository, cfg *config.Config, emailService *EmailService) AuthService {
	return &authService{repo: repo, cfg: cfg, emailService: emailService}
}

func (s *authService) Register(req *models.RegisterRequest) (*models.Provider, error) {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.KtpPath == "" {
		return nil, &AuthInputError{Message: "dokumen KTP wajib diunggah"}
	}
	if err := validateManagedDocumentPaths(req.DocumentPath, req.KtpPath, req.NibPath, req.NpwpPath, req.AktaPath, req.SertifikatPath); err != nil {
		return nil, &AuthInputError{Message: err.Error()}
	}
	// Check if email already exists
	existing, _ := s.repo.FindByEmail(req.Email)
	if existing != nil {
		return nil, &AuthInputError{Message: "email is already registered"}
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	provider := &models.Provider{
		BusinessName:        req.BusinessName,
		BusinessCategory:    req.BusinessCategory,
		OperationalProvince: req.OperationalProvince,
		OperationalCity:     req.OperationalCity,
		Description:         req.Description,
		DocumentUploaded:    req.DocumentUploaded,
		DocumentPath:        req.DocumentPath,
		KtpPath:             req.KtpPath,
		NibPath:             req.NibPath,
		NpwpPath:            req.NpwpPath,
		AktaPath:            req.AktaPath,
		SertifikatPath:      req.SertifikatPath,
		Instagram:           req.Instagram,
		TikTok:              req.TikTok,
		PicName:             req.PicName,
		Email:               req.Email,
		PasswordHash:        string(hashedPassword),
		WhatsApp:            req.WhatsApp,
		Role:                "PROVIDER",
		Status:              "PENDING",
		IsVerified:          false,
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

func (s *authService) RegisterCustomer(req *models.RegisterCustomerRequest) (*models.LoginResponse, error) {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	// Check if email already exists
	existing, _ := s.repo.FindByEmail(req.Email)
	if existing != nil {
		return nil, &AuthInputError{Message: "email is already registered"}
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	customer := &models.Provider{
		PicName:      req.Name,
		BusinessName: req.Name, // Default name as business name
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		WhatsApp:     req.WhatsApp,
		Role:         "CUSTOMER",
		Status:       "APPROVED",
		IsVerified:   true,
	}

	err = s.repo.Create(customer)
	if err != nil {
		return nil, err
	}

	// Generate a short-lived JWT. The browser keeps it only for the current session.
	now := time.Now()
	tokenID, err := generateTokenID()
	if err != nil {
		return nil, err
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"provider_id": customer.ID,
		"role":        customer.Role,
		"iss":         "tripkita-api",
		"aud":         "tripkita-web",
		"iat":         now.Unix(),
		"jti":         tokenID,
		"exp":         now.Add(8 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}

	return &models.LoginResponse{
		Token:    tokenString,
		Provider: *customer,
	}, nil
}

func (s *authService) Login(req *models.LoginRequest) (*models.LoginResponse, error) {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	provider, err := s.repo.FindByEmail(req.Email)
	if err != nil {
		return nil, &AuthInputError{Message: "invalid email or password"}
	}

	err = bcrypt.CompareHashAndPassword([]byte(provider.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, &AuthInputError{Message: "invalid email or password"}
	}

	// Check status for providers
	if provider.Role == "PROVIDER" && provider.Status != "APPROVED" {
		if provider.Status == "PENDING" {
			return nil, &AuthInputError{Message: "pendaftaran Anda sedang menunggu verifikasi admin"}
		}
		if provider.Status == "REJECTED" {
			return nil, &AuthInputError{Message: "pendaftaran Anda ditolak oleh admin"}
		}
		return nil, &AuthInputError{Message: "akun Anda belum aktif"}
	}

	// Generate a short-lived JWT. The browser keeps it only for the current session.
	now := time.Now()
	tokenID, err := generateTokenID()
	if err != nil {
		return nil, err
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"provider_id": provider.ID,
		"role":        provider.Role,
		"iss":         "tripkita-api",
		"aud":         "tripkita-web",
		"iat":         now.Unix(),
		"jti":         tokenID,
		"exp":         now.Add(8 * time.Hour).Unix(),
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

func generateOTP() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", value.Int64()), nil
}

func generateTokenID() (string, error) {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw), nil
}

func hashResetToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func (s *authService) ForgotPassword(email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	provider, err := s.repo.FindByEmail(email)
	if err != nil {
		// Do not leak whether email exists
		return nil
	}

	otp, err := generateOTP()
	if err != nil {
		return err
	}

	// Save to provider
	expiry := time.Now().Add(15 * time.Minute)
	provider.ResetToken = hashResetToken(otp)
	provider.ResetTokenExpiry = &expiry

	if err := s.repo.Update(provider); err != nil {
		return err
	}

	// Send email
	return s.emailService.SendResetPasswordEmail(provider.Email, otp)
}

func (s *authService) ResetPassword(email string, otp string, newPassword string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	result := database.DB.Model(&models.Provider{}).
		Where("LOWER(email) = LOWER(?) AND reset_token = ? AND reset_token_expiry IS NOT NULL AND reset_token_expiry > ?", email, hashResetToken(strings.TrimSpace(otp)), time.Now()).
		Updates(map[string]interface{}{
			"password_hash":      string(hashedPassword),
			"reset_token":        "",
			"reset_token_expiry": nil,
			"updated_at":         time.Now(),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return &AuthInputError{Message: "invalid or expired reset token"}
	}
	return nil
}

func (s *authService) GetProfile(providerID uint) (*models.Provider, error) {
	return s.repo.FindByID(providerID)
}

func (s *authService) UpdateProfile(providerID uint, req *models.UpdateProfileRequest) (*models.Provider, error) {
	provider, err := s.repo.FindByID(providerID)
	if err != nil {
		return nil, err
	}

	if provider.Role == "CUSTOMER" {
		if req.PicName != "" {
			provider.PicName = req.PicName
		}
		if req.Name != "" {
			provider.PicName = req.Name
		}
		if req.WhatsApp != "" {
			provider.WhatsApp = req.WhatsApp
		}
		if req.Gender != "" {
			provider.Gender = req.Gender
		}
		if req.BirthDate != "" {
			provider.BirthDate = req.BirthDate
		}
		err = s.repo.Update(provider)
		return provider, err
	}
	if err := validateManagedDocumentPaths(req.DocumentPath, req.KtpPath, req.NibPath, req.NpwpPath, req.AktaPath, req.SertifikatPath); err != nil {
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
	if req.Email != "" && strings.ToLower(strings.TrimSpace(req.Email)) != provider.Email {
		return nil, errors.New("perubahan email harus dilakukan melalui layanan pelanggan agar kepemilikan alamat baru dapat diverifikasi")
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
	if req.NPWP != "" && (req.NPWP != provider.NPWP || req.NPWP != provider.PendingNPWP || provider.LegalVerificationStatus == "" || provider.LegalVerificationStatus == "REJECTED") {
		legalChanged = true
	}
	if req.BankName != "" && (req.BankName != provider.BankName || req.BankName != provider.PendingBankName || provider.LegalVerificationStatus == "" || provider.LegalVerificationStatus == "REJECTED") {
		legalChanged = true
	}
	if req.BankAccount != "" && (req.BankAccount != provider.BankAccount || req.BankAccount != provider.PendingBankAccount || provider.LegalVerificationStatus == "" || provider.LegalVerificationStatus == "REJECTED") {
		legalChanged = true
	}
	if req.BankAccountName != "" && (req.BankAccountName != provider.BankAccountName || req.BankAccountName != provider.PendingBankAccountName || provider.LegalVerificationStatus == "" || provider.LegalVerificationStatus == "REJECTED") {
		legalChanged = true
	}

	if legalChanged {
		if req.NPWP != "" {
			provider.PendingNPWP = req.NPWP
		} else if provider.PendingNPWP == "" {
			provider.PendingNPWP = provider.NPWP
		}
		if req.BankName != "" {
			provider.PendingBankName = req.BankName
		} else if provider.PendingBankName == "" {
			provider.PendingBankName = provider.BankName
		}
		if req.BankAccount != "" {
			provider.PendingBankAccount = req.BankAccount
		} else if provider.PendingBankAccount == "" {
			provider.PendingBankAccount = provider.BankAccount
		}
		if req.BankAccountName != "" {
			provider.PendingBankAccountName = req.BankAccountName
		} else if provider.PendingBankAccountName == "" {
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

func validateManagedDocumentPaths(paths ...string) error {
	for _, documentPath := range paths {
		if documentPath == "" {
			continue
		}
		filename := strings.TrimPrefix(documentPath, "/uploads/")
		if filename == documentPath || filepath.Base(filename) != filename {
			return errors.New("path dokumen tidak valid")
		}
		ext := strings.ToLower(filepath.Ext(filename))
		if ext != ".pdf" && ext != ".jpg" && ext != ".png" {
			return errors.New("format dokumen tidak valid")
		}
		identifier := strings.TrimSuffix(strings.TrimPrefix(filename, "doc_"), ext)
		decoded, err := hex.DecodeString(identifier)
		if !strings.HasPrefix(filename, "doc_") || err != nil || len(decoded) != 16 {
			return errors.New("identitas dokumen tidak valid")
		}
		if _, err := os.Stat(filepath.Join("uploads", filename)); err != nil {
			return errors.New("dokumen yang diunggah tidak ditemukan")
		}
	}
	return nil
}
