package services

import (
	"fmt"
	"regexp"
	"strings"
)

var nonPhoneDigitPattern = regexp.MustCompile(`\D`)
var indonesianMobileLocalPattern = regexp.MustCompile(`^8\d{8,11}$`)

// normalizeIndonesianMobilePhone menerima format lama (08..., 62..., +62...)
// dan menyimpannya dalam satu bentuk kanonis agar web, mobile, WhatsApp, dan
// payment gateway membaca nilai yang sama.
func normalizeIndonesianMobilePhone(value string) (string, error) {
	digits := nonPhoneDigitPattern.ReplaceAllString(strings.TrimSpace(value), "")
	switch {
	case strings.HasPrefix(digits, "62"):
		digits = strings.TrimPrefix(digits, "62")
	case strings.HasPrefix(digits, "0"):
		digits = strings.TrimPrefix(digits, "0")
	}
	if !indonesianMobileLocalPattern.MatchString(digits) {
		return "", fmt.Errorf("nomor seluler harus berisi 9–12 digit setelah +62 dan diawali angka 8")
	}
	return "+62" + digits, nil
}
