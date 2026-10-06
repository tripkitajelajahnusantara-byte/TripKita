package models

import "time"

// PaymentWindow adalah batas waktu transfer dan unggah bukti sejak booking dibuat.
// Setelah lewat, booking yang belum mengirim bukti dibatalkan oleh job.
const PaymentWindow = 24 * time.Hour

// RejectedProofReuploadWindow adalah waktu minimal yang selalu dimiliki customer
// untuk mentransfer/mengunggah ulang setelah admin menolak bukti. Tanpa ini,
// lamanya admin memeriksa ikut memakan batas bayar dan penolakan dapat langsung
// membuat booking kedaluwarsa tanpa kesempatan memperbaiki bukti.
const RejectedProofReuploadWindow = 6 * time.Hour

// PaymentDeadline mengembalikan batas akhir pembayaran booking PENDING_PAYMENT:
// 24 jam sejak dibuat, diperpanjang bila bukti sebelumnya ditolak admin.
func PaymentDeadline(b *Booking) time.Time {
	deadline := b.CreatedAt.Add(PaymentWindow)
	if b.PaymentReviewedAt != nil {
		if extended := b.PaymentReviewedAt.Add(RejectedProofReuploadWindow); extended.After(deadline) {
			deadline = extended
		}
	}
	return deadline
}

// CancellationFullRefundWindow adalah batas minimal pembatalan customer untuk
// memperoleh refund penuh. Dipakai backend sebagai sumber kebenaran kebijakan.
const CancellationFullRefundWindow = 7 * 24 * time.Hour

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
	PickupPoint  string    `gorm:"size:500;not null;default:''" json:"pickupPoint"`
	CreatedAt    time.Time `json:"createdAt"`
}

// BookingParticipantInput adalah data peserta yang dikirim saat checkout.
type BookingParticipantInput struct {
	PickupPoint  string `json:"pickupPoint" binding:"max=500"`
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
