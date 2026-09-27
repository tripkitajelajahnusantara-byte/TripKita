package services

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"tripkita-provider/authn"
	"tripkita-provider/config"
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
	Logout(ctx context.Context, token string) error
}

type authService struct {
	db           *gorm.DB
	repo         repositories.ProviderRepository
	cfg          *config.Config
	emailService *EmailService
	notifService *NotificationService
}

type AuthInputError struct{ Message string }

func (e *AuthInputError) Error() string { return e.Message }

func NewAuthService(db *gorm.DB, repo repositories.ProviderRepository, cfg *config.Config, emailService *EmailService, notifService *NotificationService) AuthService {
	_ = dummyPasswordHash()
	return &authService{db: db, repo: repo, cfg: cfg, emailService: emailService, notifService: notifService}
}

func (s *authService) Register(req *models.RegisterRequest) (*models.Provider, error) {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	normalizedPhone, err := normalizeIndonesianMobilePhone(req.WhatsApp)
	if err != nil {
		return nil, &AuthInputError{Message: err.Error()}
	}
	req.WhatsApp = normalizedPhone
	if req.KtpPath == "" {
		return nil, &AuthInputError{Message: "dokumen KTP wajib diunggah"}
	}
	if err := validateManagedDocumentPaths(s.cfg.DocumentUploadDir(), req.DocumentPath, req.KtpPath, req.NibPath, req.NpwpPath, req.AktaPath, req.SertifikatPath); err != nil {
		return nil, &AuthInputError{Message: err.Error()}
	}
	hashedPassword, err := authn.HashPassword(req.Password)
	if err != nil {
		return nil, &AuthInputError{Message: err.Error()}
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
		// Kredensial kanonik disimpan di users; kolom lama dibiarkan kosong
		// supaya tidak ada dua salinan password hash untuk akun baru.
		PasswordHash:       "",
		WhatsApp:           req.WhatsApp,
		Role:               "PROVIDER",
		Status:             "PENDING",
		IsVerified:         false,
		PlatformFeePercent: models.DefaultPlatformFeePercent,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := ensureEmailAvailable(tx, req.Email); err != nil {
			return err
		}
		if err := tx.Create(provider).Error; err != nil {
			return err
		}
		user := models.User{ProviderID: provider.ID, Email: req.Email, PasswordHash: hashedPassword}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		return tx.Create(&models.ProviderStatusHistory{
			ProviderID: provider.ID, Status: "PENDING",
			Notes: "Pendaftaran akun baru via form registrasi.", CreatedAt: time.Now(),
		}).Error
	})
	if err != nil {
		if errors.Is(err, errEmailUnavailable) || errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil, &AuthInputError{Message: "pendaftaran tidak dapat diproses dengan alamat email tersebut"}
		}
		return nil, err
	}

	// Pendaftaran mitra baru harus terlihat oleh admin tanpa perlu memuat ulang
	// daftar provider. Kegagalan mencatat notifikasi tidak boleh membatalkan
	// pendaftaran yang sudah tersimpan.
	if s.notifService != nil {
		if err := s.notifService.NotifyAdmins(
			"Pendaftaran Provider Baru",
			fmt.Sprintf("%s (%s) mendaftar dari %s dan menunggu verifikasi dokumen.", provider.BusinessName, provider.Email, provider.OperationalCity),
			NotifTypeRegistration,
			"/admin/providers",
		); err != nil {
			log.Printf("[Notifikasi] Gagal memberi tahu admin tentang pendaftaran provider %d: %v", provider.ID, err)
		}
	}

	return provider, nil
}

func (s *authService) RegisterCustomer(req *models.RegisterCustomerRequest) (*models.LoginResponse, error) {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	normalizedPhone, err := normalizeIndonesianMobilePhone(req.WhatsApp)
	if err != nil {
		return nil, &AuthInputError{Message: err.Error()}
	}
	req.WhatsApp = normalizedPhone
	hashedPassword, err := authn.HashPassword(req.Password)
	if err != nil {
		return nil, &AuthInputError{Message: err.Error()}
	}

	customer := &models.Provider{
		PicName:      req.Name,
		BusinessName: req.Name, // Default name as business name
		Email:        req.Email,
		PasswordHash: "",
		WhatsApp:     req.WhatsApp,
		Role:         "CUSTOMER",
		Status:       "APPROVED",
		IsVerified:   true,
	}

	var user models.User
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := ensureEmailAvailable(tx, req.Email); err != nil {
			return err
		}
		if err := tx.Create(customer).Error; err != nil {
			return err
		}
		user = models.User{ProviderID: customer.ID, Email: req.Email, PasswordHash: hashedPassword}
		return tx.Create(&user).Error
	})
	if err != nil {
		if errors.Is(err, errEmailUnavailable) || errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil, &AuthInputError{Message: "pendaftaran tidak dapat diproses dengan alamat email tersebut"}
		}
		return nil, err
	}

	tokenString, err := authn.IssueSession(context.Background(), s.db, user.ID)
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
	var user models.User
	var provider models.Provider
	invalidCredentials := false
	now := time.Now().UTC()
	loginErr := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("LOWER(email) = LOWER(?)", req.Email).First(&user).Error; err != nil {
			// Argon2 dummy menjaga waktu respons akun tak dikenal mendekati akun
			// yang memiliki password, sehingga enumerasi berbasis timing sulit.
			_, _, _ = authn.VerifyPassword(dummyPasswordHash(), req.Password)
			invalidCredentials = true
			return nil
		}
		hasPassword := user.PasswordHash != ""
		hashForVerification := user.PasswordHash
		if !hasPassword {
			hashForVerification = dummyPasswordHash()
		}
		if user.LockedUntil != nil && user.LockedUntil.After(now) {
			_, _, _ = authn.VerifyPassword(hashForVerification, req.Password)
			invalidCredentials = true
			return nil
		}

		matched, needsRehash, err := authn.VerifyPassword(hashForVerification, req.Password)
		matched = matched && hasPassword
		if err != nil || !matched {
			user.FailedLoginAttempts++
			updates := map[string]interface{}{"failed_login_attempts": user.FailedLoginAttempts, "updated_at": now}
			if user.FailedLoginAttempts >= 5 {
				lockedUntil := now.Add(15 * time.Minute)
				updates["locked_until"] = &lockedUntil
			}
			if updateErr := tx.Model(&user).Updates(updates).Error; updateErr != nil {
				return updateErr
			}
			invalidCredentials = true
			return nil
		}
		if err := tx.First(&provider, user.ProviderID).Error; err != nil {
			invalidCredentials = true
			return nil
		}
		if !loginStatusAllowed(&provider) {
			invalidCredentials = true
			return nil
		}

		updates := map[string]interface{}{
			"failed_login_attempts": 0, "locked_until": nil,
			"last_login_at": &now, "updated_at": now,
		}
		if needsRehash {
			newHash, err := authn.HashPasswordForMigration(req.Password)
			if err != nil {
				return err
			}
			updates["password_hash"] = newHash
			user.PasswordHash = newHash
		}
		return tx.Model(&user).Updates(updates).Error
	})
	if loginErr != nil {
		return nil, loginErr
	}
	if invalidCredentials {
		return nil, &AuthInputError{Message: "login tidak berhasil; periksa email dan password atau coba lagi nanti"}
	}

	tokenString, err := authn.IssueSession(context.Background(), s.db, user.ID)
	if err != nil {
		return nil, err
	}

	return &models.LoginResponse{
		Token:    tokenString,
		Provider: provider,
	}, nil
}

func generateOTP() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", value.Int64()), nil
}

func (s *authService) ForgotPassword(email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	var user models.User
	err := s.db.Where("LOWER(email) = LOWER(?)", email).First(&user).Error
	if err != nil {
		// Do not leak whether email exists
		return nil
	}

	otp, err := generateOTP()
	if err != nil {
		return err
	}

	expiry := time.Now().Add(15 * time.Minute)
	if err := s.db.Model(&user).Updates(map[string]interface{}{
		"reset_token_hash":       hashResetToken(s.cfg.JWTSecret, user.ID, otp),
		"reset_token_expires_at": &expiry,
		"reset_attempts":         0,
		"updated_at":             time.Now(),
	}).Error; err != nil {
		return err
	}

	if err := s.emailService.SendResetPasswordEmail(user.Email, otp); err != nil {
		// Respons tetap generik agar status pendaftaran email tidak dapat
		// disimpulkan dari perbedaan status HTTP.
		log.Printf("[Auth] gagal mengirim email reset password: %v", err)
	}
	return nil
}

func (s *authService) ResetPassword(email string, otp string, newPassword string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	hashedPassword, err := authn.HashPassword(newPassword)
	if err != nil {
		return &AuthInputError{Message: err.Error()}
	}

	invalidToken := false
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("LOWER(email) = LOWER(?)", email).First(&user).Error; err != nil {
			invalidToken = true
			return nil
		}
		now := time.Now().UTC()
		expected := hashResetToken(s.cfg.JWTSecret, user.ID, strings.TrimSpace(otp))
		valid := user.ResetTokenHash != "" && user.ResetTokenExpiresAt != nil && user.ResetTokenExpiresAt.After(now) &&
			hmac.Equal([]byte(user.ResetTokenHash), []byte(expected))
		if !valid {
			attempts := user.ResetAttempts + 1
			updates := map[string]interface{}{"reset_attempts": attempts, "updated_at": now}
			if attempts >= 5 {
				updates["reset_token_hash"] = ""
				updates["reset_token_expires_at"] = nil
			}
			if err := tx.Model(&user).Updates(updates).Error; err != nil {
				return err
			}
			invalidToken = true
			return nil
		}
		changedAt := now
		if err := tx.Model(&user).Updates(map[string]interface{}{
			"password_hash": hashedPassword, "password_changed_at": &changedAt,
			"reset_token_hash": "", "reset_token_expires_at": nil, "reset_attempts": 0,
			"failed_login_attempts": 0, "locked_until": nil, "updated_at": now,
		}).Error; err != nil {
			return err
		}
		// Hapus hash legacy agar rollback tidak menghidupkan kembali password lama.
		if err := tx.Model(&models.Provider{}).Where("id = ?", user.ProviderID).
			Updates(map[string]interface{}{"password_hash": "", "reset_token": "", "reset_token_expiry": nil}).Error; err != nil {
			return err
		}
		return authn.RevokeAllUserSessions(context.Background(), tx, user.ID)
	})
	if invalidToken {
		return &AuthInputError{Message: "invalid or expired reset token"}
	}
	return err
}

func (s *authService) Logout(ctx context.Context, token string) error {
	return authn.RevokeSession(ctx, s.db, token)
}

var (
	errEmailUnavailable = errors.New("email unavailable")
)

func ensureEmailAvailable(tx *gorm.DB, email string) error {
	var count int64
	if err := tx.Model(&models.User{}).Where("LOWER(email) = LOWER(?)", email).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errEmailUnavailable
	}
	return nil
}

func loginStatusAllowed(provider *models.Provider) bool {
	if provider.Role == "PROVIDER" {
		return provider.Status == "PENDING" || provider.Status == "APPROVED"
	}
	return provider.Status == "APPROVED"
}

func hashResetToken(secret string, userID uint, token string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = fmt.Fprintf(mac, "password-reset:%d:%s", userID, token)
	return hex.EncodeToString(mac.Sum(nil))
}

var (
	dummyHash     string
	dummyHashOnce sync.Once
)

func dummyPasswordHash() string {
	dummyHashOnce.Do(func() {
		// Nilai hanya dipakai untuk menyamakan biaya komputasi akun tak dikenal.
		dummyHash, _ = authn.HashPassword("not-a-real-password-value")
	})
	return dummyHash
}

func (s *authService) GetProfile(providerID uint) (*models.Provider, error) {
	return s.repo.FindByID(providerID)
}

func (s *authService) UpdateProfile(providerID uint, req *models.UpdateProfileRequest) (*models.Provider, error) {
	provider, err := s.repo.FindByID(providerID)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(req.WhatsApp) != "" {
		normalizedPhone, normalizeErr := normalizeIndonesianMobilePhone(req.WhatsApp)
		if normalizeErr != nil {
			return nil, &AuthInputError{Message: normalizeErr.Error()}
		}
		req.WhatsApp = normalizedPhone
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
	if err := validateManagedDocumentPaths(s.cfg.DocumentUploadDir(), req.DocumentPath, req.KtpPath, req.NibPath, req.NpwpPath, req.AktaPath, req.SertifikatPath); err != nil {
		return nil, err
	}

	// 1. Informasi bisnis, kontak, sosial media, dan email disimpan sebagai satu
	// snapshot pending. Data aktif tetap dipakai untuk login dan tampilan publik
	// sampai admin menyetujuinya. Ini menggantikan aturan lama yang menolak
	// perubahan email dan membatasi kontak sekali per tujuh hari.
	profileRequested := strings.TrimSpace(req.BusinessName) != "" ||
		strings.TrimSpace(req.BusinessCategory) != "" ||
		strings.TrimSpace(req.OperationalProvince) != "" ||
		strings.TrimSpace(req.OperationalCity) != "" ||
		strings.TrimSpace(req.PicName) != "" ||
		strings.TrimSpace(req.Email) != "" ||
		strings.TrimSpace(req.WhatsApp) != "" ||
		strings.TrimSpace(req.Description) != "" ||
		strings.TrimSpace(req.Website) != "" ||
		strings.TrimSpace(req.Instagram) != "" ||
		strings.TrimSpace(req.TikTok) != ""
	profileChanged := false
	if profileRequested {
		usePending := provider.ProfileVerificationStatus == "PENDING" || provider.ProfileVerificationStatus == "REJECTED"
		baseBusinessName, baseBusinessCategory := provider.BusinessName, provider.BusinessCategory
		baseProvince, baseCity, basePicName := provider.OperationalProvince, provider.OperationalCity, provider.PicName
		baseEmail, baseWhatsApp := provider.Email, provider.WhatsApp
		if usePending {
			baseBusinessName = provider.PendingBusinessName
			baseBusinessCategory = provider.PendingBusinessCategory
			baseProvince = provider.PendingOperationalProvince
			baseCity = provider.PendingOperationalCity
			basePicName = provider.PendingPicName
			baseEmail = provider.PendingEmail
			baseWhatsApp = provider.PendingWhatsApp
		}
		fallback := func(requested, current string) string {
			requested = strings.TrimSpace(requested)
			if requested == "" {
				return current
			}
			return requested
		}

		candidateBusinessName := fallback(req.BusinessName, baseBusinessName)
		candidateBusinessCategory := fallback(req.BusinessCategory, baseBusinessCategory)
		candidateProvince := fallback(req.OperationalProvince, baseProvince)
		candidateCity := fallback(req.OperationalCity, baseCity)
		candidatePicName := fallback(req.PicName, basePicName)
		candidateEmail := strings.ToLower(fallback(req.Email, baseEmail))
		candidateWhatsApp := fallback(req.WhatsApp, baseWhatsApp)
		if candidateBusinessName == "" || candidateBusinessCategory == "" || candidateProvince == "" || candidateCity == "" || candidatePicName == "" || candidateEmail == "" || candidateWhatsApp == "" {
			return nil, &AuthInputError{Message: "nama bisnis, kategori, wilayah operasional, PIC, email, dan WhatsApp wajib diisi"}
		}

		var duplicateIdentityCount int64
		if err := s.db.Model(&models.User{}).
			Where("provider_id <> ? AND LOWER(email) = ?", provider.ID, candidateEmail).
			Count(&duplicateIdentityCount).Error; err != nil {
			return nil, err
		}
		var duplicatePendingCount int64
		if err := s.db.Model(&models.Provider{}).
			Where("id <> ? AND profile_verification_status = ? AND LOWER(pending_email) = ?", provider.ID, "PENDING", candidateEmail).
			Count(&duplicatePendingCount).Error; err != nil {
			return nil, err
		}
		if duplicateIdentityCount > 0 || duplicatePendingCount > 0 {
			return nil, &AuthInputError{Message: "email sudah digunakan atau sedang diajukan oleh akun lain"}
		}

		candidateDescription := strings.TrimSpace(req.Description)
		candidateWebsite := strings.TrimSpace(req.Website)
		candidateInstagram := strings.TrimSpace(req.Instagram)
		candidateTikTok := strings.TrimSpace(req.TikTok)
		profileChanged = provider.ProfileVerificationStatus == "REJECTED" ||
			candidateBusinessName != baseBusinessName || candidateBusinessCategory != baseBusinessCategory ||
			candidateProvince != baseProvince || candidateCity != baseCity ||
			candidateDescription != func() string {
				if usePending {
					return provider.PendingDescription
				}
				return provider.Description
			}() ||
			candidatePicName != basePicName || candidateEmail != strings.ToLower(baseEmail) || candidateWhatsApp != baseWhatsApp ||
			candidateWebsite != func() string {
				if usePending {
					return provider.PendingWebsite
				}
				return provider.Website
			}() ||
			candidateInstagram != func() string {
				if usePending {
					return provider.PendingInstagram
				}
				return provider.Instagram
			}() ||
			candidateTikTok != func() string {
				if usePending {
					return provider.PendingTikTok
				}
				return provider.TikTok
			}()

		if profileChanged {
			provider.PendingBusinessName = candidateBusinessName
			provider.PendingBusinessCategory = candidateBusinessCategory
			provider.PendingOperationalProvince = candidateProvince
			provider.PendingOperationalCity = candidateCity
			provider.PendingDescription = candidateDescription
			provider.PendingPicName = candidatePicName
			provider.PendingEmail = candidateEmail
			provider.PendingWhatsApp = candidateWhatsApp
			provider.PendingWebsite = candidateWebsite
			provider.PendingInstagram = candidateInstagram
			provider.PendingTikTok = candidateTikTok
			provider.ProfileVerificationStatus = "PENDING"
			provider.ProfileRejectionReason = ""
		}
	}

	// 2. Data Legal & Rekening updates (Pending approval workflow)
	// Nilai dibandingkan dengan data yang sedang berlaku bagi mitra: pengajuan
	// pending bila ada, selain itu data aktif. Membandingkan dengan keduanya
	// sekaligus membuat setiap simpan profil mengembalikan verifikasi rekening
	// yang sudah disetujui ke PENDING walau datanya tidak berubah.
	legalNeedsReview := provider.LegalVerificationStatus == "" || provider.LegalVerificationStatus == "REJECTED"
	legalFieldChanged := func(requested, pending, current string) bool {
		if requested == "" {
			return false
		}
		effective := current
		if pending != "" {
			effective = pending
		}
		return requested != effective || legalNeedsReview
	}
	legalChanged := legalFieldChanged(req.NPWP, provider.PendingNPWP, provider.NPWP) ||
		legalFieldChanged(req.BankName, provider.PendingBankName, provider.BankName) ||
		legalFieldChanged(req.BankAccount, provider.PendingBankAccount, provider.BankAccount) ||
		legalFieldChanged(req.BankAccountName, provider.PendingBankAccountName, provider.BankAccountName)

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
	documentsChanged := false
	if req.KtpPath != "" && req.KtpPath != provider.KtpPath {
		documentsChanged = true
		provider.PendingKtpPath = req.KtpPath
		provider.KtpStatus = "PENDING"
		provider.KtpRejectionReason = ""
	}
	if req.NibPath != "" && req.NibPath != provider.NibPath {
		documentsChanged = true
		provider.PendingNibPath = req.NibPath
		provider.NibStatus = "PENDING"
		provider.NibRejectionReason = ""
	}
	if req.DocumentPath != "" && req.DocumentPath != provider.DocumentPath {
		documentsChanged = true
		provider.PendingDocumentPath = req.DocumentPath
		provider.SiupStatus = "PENDING"
		provider.SiupRejectionReason = ""
	}
	if req.NpwpPath != "" && req.NpwpPath != provider.NpwpPath {
		documentsChanged = true
		provider.PendingNpwpPath = req.NpwpPath
		provider.NpwpDocStatus = "PENDING"
		provider.NpwpDocRejectionReason = ""
	}
	if req.AktaPath != "" && req.AktaPath != provider.AktaPath {
		documentsChanged = true
		provider.PendingAktaPath = req.AktaPath
		provider.AktaStatus = "PENDING"
		provider.AktaRejectionReason = ""
	}
	if req.SertifikatPath != "" && req.SertifikatPath != provider.SertifikatPath {
		documentsChanged = true
		provider.PendingSertifikatPath = req.SertifikatPath
		provider.SertifikatStatus = "PENDING"
		provider.SertifikatRejectionReason = ""
	}

	if req.DocumentUploaded != nil {
		provider.DocumentUploaded = *req.DocumentUploaded
	}

	err = s.repo.Update(provider)
	if err != nil {
		return nil, err
	}

	if (profileChanged || legalChanged || documentsChanged) && s.notifService != nil {
		sections := make([]string, 0, 3)
		if profileChanged {
			sections = append(sections, "profil bisnis/kontak")
		}
		if legalChanged {
			sections = append(sections, "data legal/rekening")
		}
		if documentsChanged {
			sections = append(sections, "dokumen")
		}
		message := fmt.Sprintf("%s mengajukan perubahan %s. Data aktif tetap berlaku sampai pengajuan diputuskan.", provider.BusinessName, strings.Join(sections, ", "))
		if err := s.notifService.NotifyAdmins("Perubahan Data Mitra Menunggu Persetujuan", message, NotifTypeAccount, "/admin/dashboard"); err != nil {
			log.Printf("[Notifikasi] Gagal memberi tahu admin tentang perubahan provider %d: %v", provider.ID, err)
		}
	}

	return provider, nil
}

func validateManagedDocumentPaths(uploadDir string, paths ...string) error {
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
		if _, err := os.Stat(filepath.Join(uploadDir, filename)); err != nil {
			return errors.New("dokumen yang diunggah tidak ditemukan")
		}
	}
	return nil
}
