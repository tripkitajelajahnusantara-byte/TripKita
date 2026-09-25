package models

import "time"

// PaymentWindow adalah masa berlaku invoice Xendit sejak booking dibuat.
// Setelah lewat, booking yang belum dibayar dikedaluwarsakan oleh job.
const PaymentWindow = 24 * time.Hour

// BookingParticipant menyimpan data setiap peserta pada satu booking. Data
// ini dipakai mitra untuk pendaftaran dan asuransi perjalanan, sehingga hanya
// dimuat untuk mitra pemilik paket dan customer pemilik booking.
type BookingParticipant struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	BookingID    uint      `gorm:"not null;index" json:"-"`
	Position     int       `gorm:"not null" json:"position"`
	Name         string    `gorm:"size:255;not null" json:"name"`
	Phone        string    `gorm:"size:50;not null" json:"phone"`
	Gender       string    `gorm:"size:20;not null" json:"gender"`
	BirthDate    string    `gorm:"size:10;not null" json:"birthDate"`
	MedicalNotes string    `gorm:"size:255;not null;default:''" json:"medicalNotes"`
	CreatedAt    time.Time `json:"createdAt"`
}

// BookingParticipantInput adalah data peserta yang dikirim saat checkout.
type BookingParticipantInput struct {
	Name         string `json:"name" binding:"required,max=255"`
	Phone        string `json:"phone" binding:"required,max=50"`
	Gender       string `json:"gender" binding:"required,oneof=Laki-laki Perempuan"`
	BirthDate    string `json:"birthDate" binding:"required,datetime=2006-01-02"`
	MedicalNotes string `json:"medicalNotes" binding:"max=255"`
}

// BookingServiceFee adalah biaya layanan tetap per pesanan. Satu sumber yang
// dipakai perhitungan total booking, pembagian dana mitra, dan endpoint
// konfigurasi checkout untuk web serta aplikasi mobile.
const BookingServiceFee int64 = 5000
