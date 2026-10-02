package models

import (
	"crypto/rand"
	"encoding/hex"
	"regexp"
)

// Foto paket bersifat publik dan dibedakan dari dokumen privat ("doc_") lewat
// prefiks nama berkas.
var packagePhotoNamePattern = regexp.MustCompile(`^pkg_[0-9a-f]{32}\.(jpg|png)$`)

func IsPackagePhotoName(filename string) bool {
	return packagePhotoNamePattern.MatchString(filename)
}

func NewPackagePhotoName(ext string) (string, error) {
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	return "pkg_" + hex.EncodeToString(randomBytes) + ext, nil
}
