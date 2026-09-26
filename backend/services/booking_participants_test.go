package services

import (
	"errors"
	"testing"
	"time"

	"tripkita-provider/models"
)

func validParticipant() models.BookingParticipant {
	return models.BookingParticipant{
		Name:      " Budi Santoso ",
		Phone:     "081234567890",
		Gender:    "Laki-laki",
		BirthDate: "1995-04-12",
	}
}

func TestNormalizeBookingParticipantsAcceptsLegacyClientsWithoutParticipants(t *testing.T) {
	booking := &models.Booking{Guests: 3}
	if err := normalizeBookingParticipants(booking); err != nil {
		t.Fatalf("booking tanpa data peserta harus tetap diterima: %v", err)
	}
}

func TestNormalizeBookingParticipantsSetsOrderAndTrims(t *testing.T) {
	second := validParticipant()
	second.Name = "Siti Aminah"
	second.Gender = "Perempuan"
	booking := &models.Booking{Guests: 2, Participants: []models.BookingParticipant{validParticipant(), second}}

	if err := normalizeBookingParticipants(booking); err != nil {
		t.Fatalf("data peserta valid ditolak: %v", err)
	}
	if booking.Participants[0].Position != 1 || booking.Participants[1].Position != 2 {
		t.Fatalf("urutan peserta tidak diisi: %+v", booking.Participants)
	}
	if booking.Participants[0].Name != "Budi Santoso" {
		t.Fatalf("nama peserta tidak dirapikan: %q", booking.Participants[0].Name)
	}
}

func TestNormalizeBookingParticipantsRejectsInvalidData(t *testing.T) {
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	cases := map[string]func(p *models.BookingParticipant){
		"nama berisi angka":    func(p *models.BookingParticipant) { p.Name = "Budi 123" },
		"nomor HP salah":       func(p *models.BookingParticipant) { p.Phone = "+6281234567890" },
		"jenis kelamin asing":  func(p *models.BookingParticipant) { p.Gender = "L" },
		"tanggal lahir besok":  func(p *models.BookingParticipant) { p.BirthDate = tomorrow },
		"tanggal lahir kosong": func(p *models.BookingParticipant) { p.BirthDate = "" },
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			p := validParticipant()
			mutate(&p)
			err := normalizeBookingParticipants(&models.Booking{Guests: 1, Participants: []models.BookingParticipant{p}})
			var inputErr *BookingInputError
			if !errors.As(err, &inputErr) {
				t.Fatalf("diharapkan BookingInputError, didapat %v", err)
			}
		})
	}
}

func TestNormalizeBookingParticipantsRequiresOnePerGuest(t *testing.T) {
	booking := &models.Booking{Guests: 2, Participants: []models.BookingParticipant{validParticipant()}}
	var inputErr *BookingInputError
	if err := normalizeBookingParticipants(booking); !errors.As(err, &inputErr) {
		t.Fatalf("jumlah peserta yang tidak sama dengan jumlah tamu harus ditolak, didapat %v", err)
	}
}
