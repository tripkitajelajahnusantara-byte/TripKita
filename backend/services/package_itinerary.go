package services

import (
	"encoding/json"
	"strings"
)

// Editing replaces the itinerary in its submitted order. Time labels may be
// ranges or local text (e.g. "08.00 - 10.00 WIB"), so they are not sorted.
func validatePackageItinerary(value string) error {
	if value == "" { // Omitted by older clients or a package without an itinerary.
		return nil
	}
	var days []struct {
		Day        int `json:"day"`
		Activities []struct {
			Time  string `json:"time"`
			Title string `json:"title"`
		} `json:"activities"`
	}
	if err := json.Unmarshal([]byte(value), &days); err != nil || days == nil {
		return packageValidationErrorf("itinerary harus berupa daftar hari dan kegiatan yang valid")
	}
	seen := map[int]bool{}
	for _, day := range days {
		if day.Day < 1 || seen[day.Day] {
			return packageValidationErrorf("nomor hari itinerary harus positif dan tidak boleh berulang")
		}
		seen[day.Day] = true
		if day.Activities == nil {
			return packageValidationErrorf("daftar kegiatan pada hari %d harus berupa array", day.Day)
		}
		for _, activity := range day.Activities {
			if strings.TrimSpace(activity.Time) == "" || strings.TrimSpace(activity.Title) == "" {
				return packageValidationErrorf("waktu dan judul setiap kegiatan pada hari %d wajib diisi", day.Day)
			}
		}
	}
	return nil
}
