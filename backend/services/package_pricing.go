package services

import (
	crand "crypto/rand"
	"encoding/hex"
	"strings"

	"tripkita-provider/models"
)

// normalizePackagePricing merapikan skema harga dan katalog add-on sebelum
// paket disimpan. Harga per unit hanya untuk paket eksklusif (selain Open
// Trip), karena kursi Open Trip dibagi beberapa pemesan berbeda.
func normalizePackagePricing(pkg *models.Package) error {
	if pkg.PricingMode == "" {
		pkg.PricingMode = models.PricingPerPerson
	}
	switch pkg.PricingMode {
	case models.PricingPerPerson:
		pkg.UnitName = ""
		pkg.UnitCapacity = 0
	case models.PricingPerUnit:
		if models.IsOpenTrip(pkg.TripType) {
			return packageValidationErrorf("harga per unit hanya tersedia untuk paket selain Open Trip")
		}
		pkg.UnitName = strings.Join(strings.Fields(pkg.UnitName), " ")
		if pkg.UnitName == "" {
			pkg.UnitName = "Unit"
		}
		if len([]rune(pkg.UnitName)) > 50 {
			return packageValidationErrorf("nama unit maksimal 50 karakter")
		}
		if pkg.UnitCapacity < 1 || pkg.UnitCapacity > 10_000 {
			return packageValidationErrorf("kapasitas per %s minimal 1 orang", pkg.UnitName)
		}
	default:
		return packageValidationErrorf("skema harga paket tidak valid")
	}

	if len(pkg.AddOns) > models.MaxPackageAddOns {
		return packageValidationErrorf("layanan tambahan maksimal %d item", models.MaxPackageAddOns)
	}
	seen := make(map[string]bool, len(pkg.AddOns))
	for i := range pkg.AddOns {
		a := &pkg.AddOns[i]
		a.Name = strings.Join(strings.Fields(a.Name), " ")
		if n := len([]rune(a.Name)); n < 2 || n > 100 {
			return packageValidationErrorf("nama layanan tambahan harus 2-100 karakter")
		}
		if a.Price <= 0 || a.Price > 1_000_000_000 {
			return packageValidationErrorf("harga layanan tambahan \"%s\" harus lebih besar dari 0", a.Name)
		}
		a.ID = strings.TrimSpace(a.ID)
		if a.ID == "" || len(a.ID) > 50 || seen[a.ID] {
			id, err := newAddOnID()
			if err != nil {
				return err
			}
			a.ID = id
		}
		seen[a.ID] = true
	}
	return nil
}

func newAddOnID() (string, error) {
	b := make([]byte, 6)
	if _, err := crand.Read(b); err != nil {
		return "", err
	}
	return "ao_" + hex.EncodeToString(b), nil
}
