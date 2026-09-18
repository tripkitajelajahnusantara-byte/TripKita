package services

import "testing"

func TestResolveBankRouting(t *testing.T) {
	cases := map[string]string{
		"BCA":                      "CENAIDJA",
		"bca":                      "CENAIDJA",
		"  Bank Central Asia  ":    "CENAIDJA",
		"PT Bank Mandiri":          "BMRIIDJA",
		"Bank Negara Indonesia":    "BNINIDJA",
		"BNI":                      "BNINIDJA",
		"Bank  Rakyat   Indonesia": "BRINIDJA",
		"CIMB Niaga":               "BNIAIDJA",
		"OCBC NISP":                "NISPIDJA",
		"Bank Syariah Indonesia":   "BSMDIDJA",
	}
	for input, want := range cases {
		t.Run(input, func(t *testing.T) {
			got, err := ResolveBankRouting(input)
			if err != nil {
				t.Fatalf("nama bank %q ditolak: %v", input, err)
			}
			if got.Type != "SWIFT" || got.Value != want {
				t.Errorf("ResolveBankRouting(%q) = %#v, diharapkan SWIFT/%s", input, got, want)
			}
		})
	}
}

// Nama bank yang tidak dikenali harus menghentikan pencairan otomatis, bukan
// dikirim ke channel code tebakan.
func TestResolveBankRoutingRejectsUnknown(t *testing.T) {
	for _, input := range []string{"", "   ", "Bank Antah Berantah", "kripto wallet", "Bank Jago", "BCA Syariah"} {
		if routing, err := ResolveBankRouting(input); err == nil {
			t.Errorf("nama bank %q seharusnya ditolak, malah menghasilkan %#v", input, routing)
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
