package models

import (
	"time"
)

type Provider struct {
	ID                  uint      `gorm:"primaryKey" json:"id"`
	BusinessName        string    `gorm:"size:255;not null" json:"businessName"`
	BusinessCategory    string    `gorm:"size:100;not null" json:"businessCategory"`
	OperationalProvince string    `gorm:"size:255;not null;default:''" json:"operationalProvince"`
	OperationalCity     string    `gorm:"size:255;not null;default:''" json:"operationalCity"`
	Description         string    `gorm:"type:text" json:"description"`
	DocumentUploaded    bool      `gorm:"default:false" json:"documentUploaded"`
	DocumentPath        string    `gorm:"size:500" json:"documentPath"` // SIUP document path
	KtpPath             string    `gorm:"size:500" json:"ktpPath"`      // KTP Pemilik path
	NibPath             string    `gorm:"size:500" json:"nibPath"`
	NpwpPath            string    `gorm:"size:500" json:"npwpPath"` // NPWP document path
	AktaPath            string    `gorm:"size:500" json:"aktaPath"`
	SertifikatPath      string    `gorm:"size:500" json:"sertifikatPath"`
	Instagram           string    `gorm:"size:255" json:"instagram"`
	TikTok              string    `gorm:"size:255" json:"tiktok"`
	PicName             string    `gorm:"size:255;not null" json:"picName"`
	Email               string    `gorm:"size:255;uniqueIndex;not null" json:"email"`
	PasswordHash        string    `gorm:"size:255;not null" json:"-"`
	WhatsApp            string    `gorm:"size:50;not null" json:"whatsapp"`
	IsVerified          bool      `gorm:"default:false" json:"isVerified"`
	Role                string    `gorm:"size:50;not null;default:'PROVIDER'" json:"role"`
	Status              string    `gorm:"size:50;not null;default:'PENDING'" json:"status"`
	VerificationNotes   string    `gorm:"type:text" json:"verificationNotes"`
	PlatformFeePercent  int64     `gorm:"not null;default:15" json:"platformFeePercent"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
	// Explicit soft delete keeps the provider available to historical bookings.
	// Only the admin status endpoint may clear this timestamp.
	DeletedAt *time.Time `gorm:"index" json:"deletedAt"`

	// New fields: Website, active bank details, NPWP number
	Website              string     `gorm:"size:255" json:"website"`
	NPWP                 string     `gorm:"size:100" json:"npwp"`
	BankName             string     `gorm:"size:100" json:"bankName"`
	BankAccount          string     `gorm:"size:100" json:"bankAccount"`
	BankAccountName      string     `gorm:"size:255" json:"bankAccountName"`
	Gender               string     `gorm:"size:20" json:"gender"`
	BirthDate            string     `gorm:"size:50" json:"birthDate"`
	WishlistData         string     `gorm:"type:text" json:"wishlistData"`
	ContactLastUpdatedAt *time.Time `json:"contactLastUpdatedAt"`

	// Perubahan profil bisnis dan kontak tidak langsung mengganti data yang
	// sedang tayang. Seluruh nilai di bawah ini merupakan satu snapshot lengkap
	// yang baru diterapkan setelah disetujui admin. Snapshot lengkap juga
	// memungkinkan kolom opsional (mis. website) sengaja dikosongkan.
	PendingBusinessName        string `gorm:"size:255" json:"pendingBusinessName"`
	PendingBusinessCategory    string `gorm:"size:100" json:"pendingBusinessCategory"`
	PendingOperationalProvince string `gorm:"size:255" json:"pendingOperationalProvince"`
	PendingOperationalCity     string `gorm:"size:255" json:"pendingOperationalCity"`
	PendingDescription         string `gorm:"type:text" json:"pendingDescription"`
	PendingPicName             string `gorm:"size:255" json:"pendingPicName"`
	PendingEmail               string `gorm:"size:255" json:"pendingEmail"`
	PendingWhatsApp            string `gorm:"size:50" json:"pendingWhatsapp"`
	PendingInstagram           string `gorm:"size:255" json:"pendingInstagram"`
	PendingTikTok              string `gorm:"size:255" json:"pendingTiktok"`
	PendingWebsite             string `gorm:"size:255" json:"pendingWebsite"`
	ProfileVerificationStatus  string `gorm:"size:50;default:''" json:"profileVerificationStatus"` // PENDING, APPROVED, REJECTED
	ProfileRejectionReason     string `gorm:"type:text" json:"profileRejectionReason"`

	// Pending bank details & legal verification status
	PendingNPWP             string `gorm:"size:100" json:"pendingNpwp"`
	PendingBankName         string `gorm:"size:100" json:"pendingBankName"`
	PendingBankAccount      string `gorm:"size:100" json:"pendingBankAccount"`
	PendingBankAccountName  string `gorm:"size:255" json:"pendingBankAccountName"`
	LegalVerificationStatus string `gorm:"size:50;default:''" json:"legalVerificationStatus"` // PENDING, APPROVED, REJECTED

	// Password Reset fields
	ResetToken           string     `gorm:"size:255;default:''" json:"-"`
	ResetTokenExpiry     *time.Time `json:"-"`
	LegalRejectionReason string     `gorm:"type:text" json:"legalRejectionReason"`

	// Pending documents & individual verification status
	PendingKtpPath        string `gorm:"size:500" json:"pendingKtpPath"`
	PendingNibPath        string `gorm:"size:500" json:"pendingNibPath"`
	PendingDocumentPath   string `gorm:"size:500" json:"pendingDocumentPath"` // Pending SIUP
	PendingNpwpPath       string `gorm:"size:500" json:"pendingNpwpPath"`
	PendingAktaPath       string `gorm:"size:500" json:"pendingAktaPath"`
	PendingSertifikatPath string `gorm:"size:500" json:"pendingSertifikatPath"`

	KtpStatus        string `gorm:"size:50;default:''" json:"ktpStatus"` // PENDING, APPROVED, REJECTED
	NibStatus        string `gorm:"size:50;default:''" json:"nibStatus"`
	SiupStatus       string `gorm:"size:50;default:''" json:"siupStatus"`
	NpwpDocStatus    string `gorm:"size:50;default:''" json:"npwpDocStatus"`
	AktaStatus       string `gorm:"size:50;default:''" json:"aktaStatus"`
	SertifikatStatus string `gorm:"size:50;default:''" json:"sertifikatStatus"`

	KtpRejectionReason        string `gorm:"type:text" json:"ktpRejectionReason"`
	NibRejectionReason        string `gorm:"type:text" json:"nibRejectionReason"`
	SiupRejectionReason       string `gorm:"type:text" json:"siupRejectionReason"`
	NpwpDocRejectionReason    string `gorm:"type:text" json:"npwpDocRejectionReason"`
	AktaRejectionReason       string `gorm:"type:text" json:"aktaRejectionReason"`
	SertifikatRejectionReason string `gorm:"type:text" json:"sertifikatRejectionReason"`
}

type ProviderStatusHistory struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ProviderID uint      `gorm:"not null;index" json:"providerId"`
	Status     string    `gorm:"size:50;not null" json:"status"`
	Notes      string    `json:"notes"`
	CreatedAt  time.Time `json:"createdAt"`
}

// CanAuthenticate menentukan siapa yang boleh memiliki sesi. Mitra yang
// ditolak tetap boleh masuk agar dapat membaca catatan admin dan memperbaiki
// dokumen; rute operasional tetap mewajibkan status APPROVED.
func (p *Provider) CanAuthenticate() bool {
	if p == nil || p.DeletedAt != nil {
		return false
	}
	return p.Status == "APPROVED" || (p.Role == "PROVIDER" && (p.Status == "PENDING" || p.Status == "REJECTED"))
}

type UpdateProviderStatusRequest struct {
	Status            string `json:"status" binding:"required,oneof=APPROVED REJECTED PENDING"`
	VerificationNotes string `json:"verificationNotes"`
}

type UpdateProviderPlatformFeeRequest struct {
	PlatformFeePercent int64 `json:"platformFeePercent" binding:"required,gte=1,lte=100"`
}

type RegisterRequest struct {
	BusinessName        string `json:"businessName" binding:"required"`
	BusinessCategory    string `json:"businessCategory" binding:"required"`
	OperationalProvince string `json:"operationalProvince" binding:"required"`
	OperationalCity     string `json:"operationalCity" binding:"required"`
	Description         string `json:"description"`
	DocumentUploaded    bool   `json:"documentUploaded"`
	DocumentPath        string `json:"documentPath"`
	KtpPath             string `json:"ktpPath"`        // Required at validation level
	NibPath             string `json:"nibPath"`        // Optional
	NpwpPath            string `json:"npwpPath"`       // Optional
	AktaPath            string `json:"aktaPath"`       // Optional
	SertifikatPath      string `json:"sertifikatPath"` // Optional
	Instagram           string `json:"instagram"`
	TikTok              string `json:"tiktok"`
	PicName             string `json:"picName" binding:"required"`
	Email               string `json:"email" binding:"required,email"`
	Password            string `json:"password" binding:"required,min=12,max=128"`
	WhatsApp            string `json:"whatsapp" binding:"required"`
}

type RegisterCustomerRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=12,max=128"`
	WhatsApp string `json:"whatsapp" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,max=128"`
}

type UpdateProfileRequest struct {
	BusinessName        string `json:"businessName"`
	BusinessCategory    string `json:"businessCategory"`
	OperationalProvince string `json:"operationalProvince"`
	OperationalCity     string `json:"operationalCity"`
	Description         string `json:"description"`
	PicName             string `json:"picName"`
	WhatsApp            string `json:"whatsapp"`
	DocumentUploaded    *bool  `json:"documentUploaded"`
	DocumentPath        string `json:"documentPath"`
	KtpPath             string `json:"ktpPath"`
	NibPath             string `json:"nibPath"`
	NpwpPath            string `json:"npwpPath"`
	AktaPath            string `json:"aktaPath"`
	SertifikatPath      string `json:"sertifikatPath"`
	Instagram           string `json:"instagram"`
	TikTok              string `json:"tiktok"`
	Email               string `json:"email" binding:"omitempty,email,max=255"`
	Website             string `json:"website"`
	NPWP                string `json:"npwp"`
	BankName            string `json:"bankName"`
	BankAccount         string `json:"bankAccount"`
	BankAccountName     string `json:"bankAccountName"`
	Name                string `json:"name"`
	Gender              string `json:"gender"`
	BirthDate           string `json:"birthDate"`
}

type LoginResponse struct {
	Token    string   `json:"token"`
	Provider Provider `json:"provider"`
}
