package services

import "strings"

const (
	maxPackageDestinations     = 30
	minPackageDestinationRunes = 2
	maxPackageDestinationRunes = 100
)

// normalizePackageDestinations merapikan daftar tempat yang dikunjungi trip.
// Urutan input dipertahankan karena mewakili rute perjalanan; nama yang sama
// (tanpa membedakan huruf besar/kecil) hanya disimpan sekali.
func normalizePackageDestinations(raw []string) ([]string, error) {
	destinations := make([]string, 0, len(raw))
	seen := map[string]bool{}
	for _, item := range raw {
		name := strings.Join(strings.Fields(item), " ")
		if length := len([]rune(name)); length < minPackageDestinationRunes || length > maxPackageDestinationRunes {
			return nil, packageValidationErrorf("nama destinasi wajib diisi %d–%d karakter", minPackageDestinationRunes, maxPackageDestinationRunes)
		}
		key := strings.ToLower(name)
		if seen[key] {
			continue
		}
		seen[key] = true
		destinations = append(destinations, name)
	}
	if len(destinations) > maxPackageDestinations {
		return nil, packageValidationErrorf("destinasi paket maksimal %d tempat", maxPackageDestinations)
	}
	return destinations, nil
}
