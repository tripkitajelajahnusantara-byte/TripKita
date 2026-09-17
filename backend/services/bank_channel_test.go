package services

import "testing"

func TestResolveBankChannelCode(t *testing.T) {
	cases := map[string]string{
		"BCA":                      "ID_BCA",
		"bca":                      "ID_BCA",
		"  Bank Central Asia  ":    "ID_BCA",
		"PT Bank Mandiri":          "ID_MANDIRI",
		"Bank Negara Indonesia":    "ID_BNI",
		"BNI":                      "ID_BNI",
		"Bank  Rakyat   Indonesia": "ID_BRI",
		"CIMB Niaga":               "ID_CIMB",
		"OCBC NISP":                "ID_OCBC",
		"Bank Syariah Indonesia":   "ID_BSI",
		"Bank Jago":                "ID_JAGO",
	}
	for input, want := range cases {
		t.Run(input, func(t *testing.T) {
			got, err := ResolveBankChannelCode(input)
			if err != nil {
				t.Fatalf("nama bank %q ditolak: %v", input, err)
			}
			if got != want {
				t.Errorf("ResolveBankChannelCode(%q) = %q, diharapkan %q", input, got, want)
			}
		})
	}
}

// Nama bank yang tidak dikenali harus menghentikan pencairan otomatis, bukan
// dikirim ke channel code tebakan.
func TestResolveBankChannelCodeRejectsUnknown(t *testing.T) {
	for _, input := range []string{"", "   ", "Bank Antah Berantah", "kripto wallet"} {
		if code, err := ResolveBankChannelCode(input); err == nil {
			t.Errorf("nama bank %q seharusnya ditolak, malah menghasilkan %q", input, code)
		}
	}
}

func TestPayoutReferenceRoundTrip(t *testing.T) {
	for _, id := range []uint{1, 42, 999999} {
		reference := payoutReferenceID(id)
		got, err := payoutIDFromReference(reference)
		if err != nil {
			t.Fatalf("reference %q gagal dibaca: %v", reference, err)
		}
		if got != id {
			t.Errorf("payoutIDFromReference(%q) = %d, diharapkan %d", reference, got, id)
		}
	}
}

// Reference id dari sumber lain tidak boleh diterjemahkan menjadi payout milik
// kita, supaya callback asing tidak dapat menutup pencairan orang lain.
func TestPayoutReferenceRejectsForeignValues(t *testing.T) {
	for _, reference := range []string{
		"",
		"payout-1",
		"tementrip-payout-",
		"tementrip-payout-abc",
		"tementrip-payout-0",
		"lain-tementrip-payout-1",
	} {
		if id, err := payoutIDFromReference(reference); err == nil {
			t.Errorf("reference %q seharusnya ditolak, malah menghasilkan id %d", reference, id)
		}
	}
}

func TestTruncateText(t *testing.T) {
	if got := truncateText("abcdef", 3); got != "abc" {
		t.Errorf("truncateText memotong salah: %q", got)
	}
	if got := truncateText("ab", 5); got != "ab" {
		t.Errorf("truncateText tidak boleh mengubah teks pendek: %q", got)
	}
}
