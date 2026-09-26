package models

import "testing"

func TestSplitBookingEarningIsExactlyTwoStage(t *testing.T) {
	split := SplitBookingEarning(1_005_001, 10)
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

func TestSplitBookingEarningUsesProviderPlatformFee(t *testing.T) {
	const total = int64(1_005_000)

	eightPercent := SplitBookingEarning(total, 8)
	tenPercent := SplitBookingEarning(total, 10)

	if eightPercent.PlatformFee != 85_000 || eightPercent.NetEarning != 920_000 {
		t.Fatalf("potongan 8%% salah: %+v", eightPercent)
	}
	if tenPercent.PlatformFee != 105_000 || tenPercent.NetEarning != 900_000 {
		t.Fatalf("potongan 10%% salah: %+v", tenPercent)
	}
	if eightPercent.NetEarning <= tenPercent.NetEarning {
		t.Fatalf("provider dengan potongan 8%% seharusnya menerima lebih besar")
	}
}

func TestProviderPlatformFeeOptions(t *testing.T) {
	if !IsAllowedProviderPlatformFeePercent(8) || !IsAllowedProviderPlatformFeePercent(10) || !IsAllowedProviderPlatformFeePercent(12) {
		t.Fatal("persentase bulat dalam rentang harus diterima")
	}
	if IsAllowedProviderPlatformFeePercent(0) || IsAllowedProviderPlatformFeePercent(101) {
		t.Fatal("persentase di luar 1-100 harus ditolak")
	}
}
