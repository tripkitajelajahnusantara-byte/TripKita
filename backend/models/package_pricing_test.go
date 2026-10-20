package models

import "testing"

func TestBasePricePerUnitChargesFullUnit(t *testing.T) {
	jeep := Package{Price: 1_000_000, PricingMode: PricingPerUnit, UnitCapacity: 6}
	cases := map[int]int64{1: 1_000_000, 6: 1_000_000, 7: 2_000_000, 12: 2_000_000}
	for guests, want := range cases {
		if got := jeep.BasePrice(guests); got != want {
			t.Errorf("%d peserta: got %d, want %d", guests, got, want)
		}
	}
	perPerson := Package{Price: 200_000, PricingMode: PricingPerPerson, UnitCapacity: 6}
	if got := perPerson.BasePrice(5); got != 1_000_000 {
		t.Errorf("per orang: got %d", got)
	}
}

func TestSelectAddOns(t *testing.T) {
	pkg := Package{AddOns: []PackageAddOn{
		{ID: "drone", Name: "Dokumentasi drone", Price: 300_000},
		{ID: "makan", Name: "Makan siang", Price: 50_000, PerPerson: true},
	}}
	selected, total, err := pkg.SelectAddOns([]string{"makan", "drone", "makan"}, 4)
	if err != nil || len(selected) != 2 || total != 500_000 {
		t.Fatalf("got %v %d %v", selected, total, err)
	}
	if _, _, err := pkg.SelectAddOns([]string{"asing"}, 1); err == nil {
		t.Fatal("ID add-on asing harus ditolak")
	}
}
