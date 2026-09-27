package services

import "testing"

func TestNormalizeIndonesianMobilePhone(t *testing.T) {
	tests := map[string]string{
		"081234567890":      "+6281234567890",
		"6281234567890":     "+6281234567890",
		"+62 812-3456-7890": "+6281234567890",
		"812 3456 7890":     "+6281234567890",
	}
	for input, expected := range tests {
		t.Run(input, func(t *testing.T) {
			actual, err := normalizeIndonesianMobilePhone(input)
			if err != nil {
				t.Fatalf("nomor valid ditolak: %v", err)
			}
			if actual != expected {
				t.Fatalf("hasil normalisasi %q, ingin %q", actual, expected)
			}
		})
	}
}

func TestNormalizeIndonesianMobilePhoneRejectsInvalidValues(t *testing.T) {
	for _, input := range []string{"", "12345", "+621234567890", "08123", "6281234567890123"} {
		t.Run(input, func(t *testing.T) {
			if _, err := normalizeIndonesianMobilePhone(input); err == nil {
				t.Fatalf("nomor tidak valid %q diterima", input)
			}
		})
	}
}
