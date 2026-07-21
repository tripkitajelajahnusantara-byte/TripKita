package models

import (
	"time"
)

type Provider struct {
	ID                      uint       `gorm:"primaryKey" json:"id"`
	BusinessName            string     `gorm:"size:255;not null" json:"businessName"`
	BusinessCategory        string     `gorm:"size:100;not null" json:"businessCategory"`
	OperationalProvince     string     `gorm:"size:255;not null;default:''" json:"operationalProvince"`
	OperationalCity         string     `gorm:"size:255;not null;default:''" json:"operationalCity"`
	Description             string     `gorm:"type:text" json:"description"`
	DocumentUploaded        bool       `gorm:"default:false" json:"documentUploaded"`
	DocumentPath            string     `gorm:"size:500" json:"documentPath"` // SIUP document path
	KtpPath                 string     `gorm:"size:500" json:"ktpPath"`      // KTP Pemilik path
	NibPath                 string     `gorm:"size:500" json:"nibPath"`
	NpwpPath                string     `gorm:"size:500" json:"npwpPath"`     // NPWP document path
	AktaPath                string     `gorm:"size:500" json:"aktaPath"`
	SertifikatPath          string     `gorm:"size:500" json:"sertifikatPath"`
	Instagram               string     `gorm:"size:255" json:"instagram"`
	TikTok                  string     `gorm:"size:255" json:"tiktok"`
	PicName                 string     `gorm:"size:255;not null" json:"picName"`
	Email                   string     `gorm:"size:255;uniqueIndex;not null" json:"email"`
	PasswordHash            string     `gorm:"size:255;not null" json:"-"`
	WhatsApp                string     `gorm:"size:50;not null" json:"whatsapp"`
	IsVerified              bool       `gorm:"default:false" json:"isVerified"`
	Role                    string     `gorm:"size:50;not null;default:'PROVIDER'" json:"role"`
	Status                  string     `gorm:"size:50;not null;default:'PENDING'" json:"status"`
	VerificationNotes       string     `gorm:"type:text" json:"verificationNotes"`
	CreatedAt               time.Time  `json:"createdAt"`
	UpdatedAt               time.Time  `json:"updatedAt"`

	// New fields: Website, active bank details, NPWP number
	Website                 string     `gorm:"size:255" json:"website"`
	NPWP                    string     `gorm:"size:100" json:"npwp"`
	BankName                string     `gorm:"size:100" json:"bankName"`
	BankAccount             string     `gorm:"size:100" json:"bankAccount"`
	BankAccountName         string     `gorm:"size:255" json:"bankAccountName"`
	ContactLastUpdatedAt    *time.Time `json:"contactLastUpdatedAt"`

	// Pending bank details & legal verification status
	PendingNPWP             string     `gorm:"size:100" json:"pendingNpwp"`
	PendingBankName         string     `gorm:"size:100" json:"pendingBankName"`
	PendingBankAccount      string     `gorm:"size:100" json:"pendingBankAccount"`
	PendingBankAccountName  string     `gorm:"size:255" json:"pendingBankAccountName"`
	LegalVerificationStatus string     `gorm:"size:50;default:''" json:"legalVerificationStatus"` // PENDING, APPROVED, REJECTED
	LegalRejectionReason    string     `gorm:"type:text" json:"legalRejectionReason"`

	// Pending documents & individual verification status
	PendingKtpPath          string     `gorm:"size:500" json:"pendingKtpPath"`
	PendingNibPath          string     `gorm:"size:500" json:"pendingNibPath"`
	PendingDocumentPath     string     `gorm:"size:500" json:"pendingDocumentPath"` // Pending SIUP
	PendingNpwpPath         string     `gorm:"size:500" json:"pendingNpwpPath"`
	PendingAktaPath         string     `gorm:"size:500" json:"pendingAktaPath"`
	PendingSertifikatPath   string     `gorm:"size:500" json:"pendingSertifikatPath"`

	KtpStatus               string     `gorm:"size:50;default:''" json:"ktpStatus"` // PENDING, APPROVED, REJECTED
	NibStatus               string     `gorm:"size:50;default:''" json:"nibStatus"`
	SiupStatus              string     `gorm:"size:50;default:''" json:"siupStatus"`
	NpwpDocStatus           string     `gorm:"size:50;default:''" json:"npwpDocStatus"`
	AktaStatus              string     `gorm:"size:50;default:''" json:"aktaStatus"`
	SertifikatStatus        string     `gorm:"size:50;default:''" json:"sertifikatStatus"`

	KtpRejectionReason      string     `gorm:"type:text" json:"ktpRejectionReason"`
	NibRejectionReason      string     `gorm:"type:text" json:"nibRejectionReason"`
	SiupRejectionReason     string     `gorm:"type:text" json:"siupRejectionReason"`
	NpwpDocRejectionReason  string     `gorm:"type:text" json:"npwpDocRejectionReason"`
	AktaRejectionReason     string     `gorm:"type:text" json:"aktaRejectionReason"`
	SertifikatRejectionReason string   `gorm:"type:text" json:"sertifikatRejectionReason"`
}

type ProviderStatusHistory struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ProviderID uint      `gorm:"not null;index" json:"providerId"`
	Status     string    `gorm:"size:50;not null" json:"status"`
	Notes      string    `json:"notes"`
	CreatedAt  time.Time `json:"createdAt"`
}

type UpdateProviderStatusRequest struct {
	Status            string `json:"status" binding:"required,oneof=APPROVED REJECTED PENDING"`
	VerificationNotes string `json:"verificationNotes"`
}

type RegisterRequest struct {
	BusinessName     string `json:"businessName" binding:"required"`
	BusinessCategory string `json:"businessCategory" binding:"required"`
	OperationalProvince string `json:"operationalProvince" binding:"required"`
	OperationalCity  string `json:"operationalCity" binding:"required"`
	Description      string `json:"description"`
	DocumentUploaded bool   `json:"documentUploaded"`
	DocumentPath     string `json:"documentPath"`
	KtpPath          string `json:"ktpPath"` // Required at validation level
	NibPath          string `json:"nibPath"` // Optional
	NpwpPath         string `json:"npwpPath"` // Optional
	AktaPath         string `json:"aktaPath"` // Optional
	SertifikatPath   string `json:"sertifikatPath"` // Optional
	Instagram        string `json:"instagram"`
	TikTok           string `json:"tiktok"`
	PicName          string `json:"picName" binding:"required"`
	Email            string `json:"email" binding:"required,email"`
	Password         string `json:"password" binding:"required,min=8"`
	WhatsApp         string `json:"whatsapp" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
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
	Email               string `json:"email"`
	Website             string `json:"website"`
	NPWP                string `json:"npwp"`
	BankName            string `json:"bankName"`
	BankAccount         string `json:"bankAccount"`
	BankAccountName     string `json:"bankAccountName"`
}

type LoginResponse struct {
	Token    string   `json:"token"`
	Provider Provider `json:"provider"`
}
