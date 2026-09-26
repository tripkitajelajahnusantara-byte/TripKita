package models

import "testing"

func TestSplitBookingEarningIsExactlyTwoStage(t *testing.T) {
	split := SplitBookingEarning(1_005_001)
	if split.DPAmount+split.SettlementHeld != split.NetEarning {
		t.Fatalf("DP + pelunasan tidak sama dengan hak bersih mitra: %+v", split)
	}
	if split.SettlementHeld-split.DPAmount < 0 || split.SettlementHeld-split.DPAmount > 1 {
		t.Fatalf("pembagian dua tahap tidak 50/50 dengan toleransi pembulatan Rp1: %+v", split)
	}
	if split.PlatformFee+split.NetEarning != 1_005_001 {
		t.Fatalf("platform fee + hak mitra tidak sama dengan total pelanggan: %+v", split)
	}
}
