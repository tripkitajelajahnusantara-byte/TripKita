package services

import (
	"fmt"
	"sort"
	"strings"
)

// bankChannelCodes memetakan nama bank yang diisi mitra ke channel code Xendit.
// Nama bank disimpan sebagai teks bebas, sedangkan payout gateway menuntut kode
// baku, jadi pemetaan ini yang menjembatani keduanya.
var bankChannelCodes = map[string]string{
	"bca":                    "ID_BCA",
	"bank central asia":      "ID_BCA",
	"mandiri":                "ID_MANDIRI",
	"bank mandiri":           "ID_MANDIRI",
	"bni":                    "ID_BNI",
	"bank negara indonesia":  "ID_BNI",
	"bri":                    "ID_BRI",
	"bank rakyat indonesia":  "ID_BRI",
	"btn":                    "ID_BTN",
	"cimb":                   "ID_CIMB",
	"cimb niaga":             "ID_CIMB",
	"permata":                "ID_PERMATA",
	"bank permata":           "ID_PERMATA",
	"danamon":                "ID_DANAMON",
	"panin":                  "ID_PANIN",
	"maybank":                "ID_MAYBANK",
	"ocbc":                   "ID_OCBC",
	"ocbc nisp":              "ID_OCBC",
	"bsi":                    "ID_BSI",
	"bank syariah indonesia": "ID_BSI",
	"mega":                   "ID_MEGA",
	"bank mega":              "ID_MEGA",
	"bjb":                    "ID_BJB",
	"sinarmas":               "ID_SINARMAS",
	"bukopin":                "ID_BUKOPIN",
	"jago":                   "ID_JAGO",
	"bank jago":              "ID_JAGO",
	"seabank":                "ID_SEABANK",
	"neo commerce":           "ID_BNC",
	"bnc":                    "ID_BNC",
	"allo bank":              "ID_ALLO",
	"muamalat":               "ID_MUAMALAT",
}

// ResolveBankChannelCode menerjemahkan nama bank mitra menjadi channel code
// Xendit. Error dikembalikan bila nama tidak dikenali, supaya pencairan otomatis
// berhenti sebelum dana dikirim ke kode channel yang salah.
func ResolveBankChannelCode(bankName string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(bankName))
	normalized = strings.TrimPrefix(normalized, "pt ")
	normalized = strings.Join(strings.Fields(normalized), " ")

	if code, ok := bankChannelCodes[normalized]; ok {
		return code, nil
	}
	// Sebagian mitra menulis "Bank BCA" atau "BCA Syariah"; cocokkan kata kunci
	// terpanjang lebih dulu agar "bank negara indonesia" tidak kalah oleh "bni".
	keys := make([]string, 0, len(bankChannelCodes))
	for key := range bankChannelCodes {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool { return len(keys[i]) > len(keys[j]) })
	for _, key := range keys {
		if strings.Contains(normalized, key) {
			return bankChannelCodes[key], nil
		}
	}
	return "", fmt.Errorf("nama bank %q belum dipetakan ke channel payout; lengkapi pemetaan atau proses pencairan ini secara manual", bankName)
}
