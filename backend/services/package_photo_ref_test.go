package services

import "testing"

func TestPackagePhotoRefIsValid(t *testing.T) {
	valid := []string{
		"",
		"/uploads/pkg_0123456789abcdef0123456789abcdef.png",
		"https://images.example.com/bromo.jpg",
	}
	invalid := []string{
		"/uploads/doc_0123456789abcdef0123456789abcdef.jpg",
		"https://api.example.com/uploads/doc_0123456789abcdef0123456789abcdef.jpg",
		"http://localhost:8080/uploads/pkg_0123456789abcdef0123456789abcdef.png",
		"/uploads/../secret.jpg",
	}
	for _, ref := range valid {
		if !packagePhotoRefIsValid(ref) {
			t.Errorf("%q seharusnya valid", ref)
		}
	}
	for _, ref := range invalid {
		if packagePhotoRefIsValid(ref) {
			t.Errorf("%q seharusnya ditolak", ref)
		}
	}
}
