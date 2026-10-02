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
	if booking.Participants[0].Phone != "+6281234567890" {
		t.Fatalf("nomor peserta tidak dinormalisasi: %q", booking.Participants[0].Phone)
	}
}

func TestNormalizeBookingParticipantsRejectsInvalidData(t *testing.T) {
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	cases := map[string]func(p *models.BookingParticipant){
		"nama berisi angka":    func(p *models.BookingParticipant) { p.Name = "Budi 123" },
		"nomor HP salah":       func(p *models.BookingParticipant) { p.Phone = "12345" },
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

func TestValidateParticipantAgesUsesTripDate(t *testing.T) {
	tripDate := time.Date(2027, time.March, 10, 0, 0, 0, 0, time.UTC)
	pkg := &models.Package{MinAge: 18, MaxAge: 65}

	cases := []struct {
		name      string
		birthDate string
		wantError bool
	}{
		{name: "ulang tahun tepat saat trip", birthDate: "2009-03-10"},
		{name: "sehari sebelum cukup umur", birthDate: "2009-03-11", wantError: true},
		{name: "tepat usia maksimum", birthDate: "1962-03-10"},
		{name: "melewati usia maksimum", birthDate: "1961-03-10", wantError: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			booking := &models.Booking{
				TripDate: tripDate,
				Participants: []models.BookingParticipant{{
					BirthDate: tc.birthDate,
				}},
			}
			err := validateParticipantAges(booking, pkg)
			if tc.wantError && err == nil {
				t.Fatal("usia di luar batas seharusnya ditolak")
			}
			if !tc.wantError && err != nil {
				t.Fatalf("usia pada batas yang diizinkan ditolak: %v", err)
			}
		})
	}
}

func TestValidateParticipantAgesAllowsUnboundedLegacyPackage(t *testing.T) {
	booking := &models.Booking{
		TripDate:     time.Date(2027, time.January, 1, 0, 0, 0, 0, time.UTC),
		Participants: []models.BookingParticipant{{BirthDate: "2020-01-01"}},
	}
	if err := validateParticipantAges(booking, &models.Package{}); err != nil {
		t.Fatalf("paket lama tanpa batas usia seharusnya tetap diterima: %v", err)
	}
}

func TestValidateParticipantAgesCannotBeBypassedWithoutParticipants(t *testing.T) {
	booking := &models.Booking{TripDate: time.Date(2027, time.January, 1, 0, 0, 0, 0, time.UTC)}
	var inputErr *BookingInputError
	if err := validateParticipantAges(booking, &models.Package{MinAge: 18, MaxAge: 65}); !errors.As(err, &inputErr) {
		t.Fatalf("paket berbatas usia tanpa data peserta harus ditolak, didapat %v", err)
	}
}
