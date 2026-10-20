package models

import "fmt"

// Skema harga paket. PER_PERSON: harga x peserta. PER_UNIT: harga per unit
// (jeep/mobil/paket) berkapasitas UnitCapacity orang, sehingga satu orang yang
// memesan tetap membayar satu unit penuh dan biaya per orang turun seiring
// bertambahnya peserta.
const (
	PricingPerPerson = "PER_PERSON"
	PricingPerUnit   = "PER_UNIT"
	MaxPackageAddOns = 20
)

// PackageAddOn adalah fasilitas tambahan opsional yang ditawarkan mitra dan
// dapat dipilih customer saat checkout.
type PackageAddOn struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Price     int64  `json:"price"`
	PerPerson bool   `json:"perPerson"`
}

// BookingAddOn adalah snapshot add-on terpilih, agar perubahan harga add-on
// oleh mitra tidak mengubah rincian pesanan lama.
type BookingAddOn struct {
	PackageAddOn
	Subtotal int64 `json:"subtotal"`
}

// UnitsFor mengembalikan jumlah unit yang dibutuhkan; 0 untuk harga per orang.
func (p *Package) UnitsFor(guests int) int {
	if p.PricingMode != PricingPerUnit || p.UnitCapacity <= 0 || guests <= 0 {
		return 0
	}
	return (guests + p.UnitCapacity - 1) / p.UnitCapacity
}

// BasePrice adalah harga trip sebelum add-on dan biaya layanan.
func (p *Package) BasePrice(guests int) int64 {
	if units := p.UnitsFor(guests); units > 0 {
		return int64(units) * p.Price
	}
	return int64(guests) * p.Price
}

// SelectAddOns mencocokkan ID pilihan customer dengan katalog paket dan
// menghitung subtotalnya. ID ganda dihitung sekali; ID asing ditolak.
func (p *Package) SelectAddOns(ids []string, guests int) ([]BookingAddOn, int64, error) {
	if len(ids) == 0 {
		return nil, 0, nil
	}
	catalog := make(map[string]PackageAddOn, len(p.AddOns))
	for _, a := range p.AddOns {
		catalog[a.ID] = a
	}
	seen := make(map[string]bool, len(ids))
	var selected []BookingAddOn
	var total int64
	for _, id := range ids {
		if seen[id] {
			continue
		}
		seen[id] = true
		a, ok := catalog[id]
		if !ok {
			return nil, 0, fmt.Errorf("layanan tambahan tidak tersedia pada paket ini, muat ulang halaman paket")
		}
		subtotal := a.Price
		if a.PerPerson {
			subtotal *= int64(guests)
		}
		selected = append(selected, BookingAddOn{PackageAddOn: a, Subtotal: subtotal})
		total += subtotal
	}
	return selected, total, nil
}
