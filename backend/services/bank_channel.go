package services

import (
	"fmt"
	"sort"
	"strings"
)

// BankRouting adalah identitas bank yang dikirim ke Xendit Payouts v3.
// Payouts v3 tidak lagi menerima channel_code legacy seperti ID_BCA; rekening
// bank diidentifikasi menggunakan routing type dan routing value.
type BankRouting struct {
	Type  string
	Value string
}

// bankRoutings sengaja hanya berisi bank yang SWIFT/BIC-nya sudah dipastikan.
// Nama bank yang belum ada harus ditolak agar uang tidak pernah diarahkan ke
// routing value hasil tebakan. Tambahkan bank baru setelah dicocokkan dengan
// Payout Coverage/Dynamic Schema Xendit yang berlaku untuk akun merchant.
var bankRoutings = map[string]BankRouting{
	"bca":                    {Type: "SWIFT", Value: "CENAIDJA"},
	"bank central asia":      {Type: "SWIFT", Value: "CENAIDJA"},
	"mandiri":                {Type: "SWIFT", Value: "BMRIIDJA"},
	"bank mandiri":           {Type: "SWIFT", Value: "BMRIIDJA"},
	"bni":                    {Type: "SWIFT", Value: "BNINIDJA"},
	"bank negara indonesia":  {Type: "SWIFT", Value: "BNINIDJA"},
	"bri":                    {Type: "SWIFT", Value: "BRINIDJA"},
	"bank rakyat indonesia":  {Type: "SWIFT", Value: "BRINIDJA"},
	"btn":                    {Type: "SWIFT", Value: "BTANIDJA"},
	"cimb":                   {Type: "SWIFT", Value: "BNIAIDJA"},
	"cimb niaga":             {Type: "SWIFT", Value: "BNIAIDJA"},
	"permata":                {Type: "SWIFT", Value: "BBBAIDJA"},
	"bank permata":           {Type: "SWIFT", Value: "BBBAIDJA"},
	"danamon":                {Type: "SWIFT", Value: "BDINIDJA"},
	"panin":                  {Type: "SWIFT", Value: "PINBIDJA"},
	"maybank":                {Type: "SWIFT", Value: "IBBKIDJA"},
	"ocbc":                   {Type: "SWIFT", Value: "NISPIDJA"},
	"ocbc nisp":              {Type: "SWIFT", Value: "NISPIDJA"},
	"bsi":                    {Type: "SWIFT", Value: "BSMDIDJA"},
	"bank syariah indonesia": {Type: "SWIFT", Value: "BSMDIDJA"},
	"mega":                   {Type: "SWIFT", Value: "MEGAIDJA"},
	"bank mega":              {Type: "SWIFT", Value: "MEGAIDJA"},
	"bjb":                    {Type: "SWIFT", Value: "PDJBIDJA"},
	"sinarmas":               {Type: "SWIFT", Value: "SBJKIDJA"},
	"bukopin":                {Type: "SWIFT", Value: "BBUKIDJA"},
	"muamalat":               {Type: "SWIFT", Value: "MUABIDJA"},
}

// ResolveBankRouting menerjemahkan nama bank mitra menjadi routing Payouts v3.
func ResolveBankRouting(bankName string) (BankRouting, error) {
	normalized := strings.ToLower(strings.TrimSpace(bankName))
	normalized = strings.TrimPrefix(normalized, "pt ")
	normalized = strings.Join(strings.Fields(normalized), " ")

	if routing, ok := bankRoutings[normalized]; ok {
		return routing, nil
	}
	if strings.Contains(normalized, "syariah") {
		return BankRouting{}, fmt.Errorf("nama bank %q memerlukan routing syariah yang spesifik; jangan gunakan routing bank konvensional", bankName)
	}

	// Sebagian mitra menulis "Bank BCA" atau nama legal bank yang lebih panjang.
	// Cocokkan kata kunci terpanjang lebih dulu agar nama spesifik tidak kalah.
	keys := make([]string, 0, len(bankRoutings))
	for key := range bankRoutings {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool { return len(keys[i]) > len(keys[j]) })
	for _, key := range keys {
		if strings.Contains(normalized, key) {
			return bankRoutings[key], nil
		}
	}

	return BankRouting{}, fmt.Errorf("nama bank %q belum dipetakan ke routing payout Xendit v3; verifikasi routing bank sebelum memproses pencairan", bankName)
}
