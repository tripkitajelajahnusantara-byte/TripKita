package services

import (
	"errors"
	"io"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"gorm.io/gorm"

	"tripkita-provider/models"
)

// Unggahan foto paket lama memakai endpoint dokumen, sehingga tersimpan sebagai
// "doc_" (privat) dan sering berupa URL absolut ber-host (mis. localhost).
var legacyUploadRef = regexp.MustCompile(`^(?:https?://[^/]+)?/uploads/((?:doc|pkg)_[0-9a-f]{32}\.(?:jpg|png))$`)

// MigrateLegacyPackagePhotos menyalin foto paket lama "doc_" menjadi "pkg_"
// publik dan menulis ulang kolom image/images menjadi path relatif. Berkas yang
// juga tercatat sebagai dokumen mitra atau bukti transfer tidak pernah disalin
// dan referensinya dibuang. Idempoten: paket yang sudah bersih dilewati.
func MigrateLegacyPackagePhotos(db *gorm.DB, uploadDir string) error {
	var packages []models.Package
	if err := db.Select("id", "image", "images").
		Where("image LIKE ? OR images LIKE ? OR image LIKE ? OR images LIKE ?", "%/uploads/doc_%", "%/uploads/doc_%", "http%/uploads/pkg_%", "%http%/uploads/pkg_%").
		Find(&packages).Error; err != nil {
		return err
	}
	if len(packages) == 0 {
		return nil
	}

	converted := map[string]string{}
	var fatal error
	resolve := func(ref string) string {
		ref = strings.TrimSpace(ref)
		match := legacyUploadRef.FindStringSubmatch(ref)
		if match == nil {
			return ref
		}
		filename := match[1]
		if models.IsPackagePhotoName(filename) {
			return "/uploads/" + filename
		}
		if done, ok := converted[filename]; ok {
			return done
		}
		newPath, err := copyLegacyPhoto(db, uploadDir, filename)
		if err != nil {
			var skip *skipPhotoError
			if !errors.As(err, &skip) {
				if fatal == nil {
					fatal = err
				}
				return ref
			}
			log.Printf("[Migrasi Foto] %s dibuang dari paket: %v", filename, err)
			newPath = ""
		}
		converted[filename] = newPath
		return newPath
	}

	updated := 0
	for _, pkg := range packages {
		var images []string
		for _, ref := range strings.Split(pkg.Images, ",") {
			if next := resolve(ref); next != "" {
				images = append(images, next)
			}
		}
		image := resolve(pkg.Image)
		if image == "" && len(images) > 0 {
			image = images[0]
		}
		if fatal != nil {
			return fatal
		}
		joined := strings.Join(images, ",")
		if joined == pkg.Images && image == pkg.Image {
			continue
		}
		if err := db.Model(&models.Package{}).Where("id = ?", pkg.ID).
			Updates(map[string]interface{}{"image": image, "images": joined}).Error; err != nil {
			return err
		}
		updated++
	}
	if updated > 0 {
		log.Printf("[Migrasi Foto] %d paket dipindahkan ke foto publik.", updated)
	}
	return nil
}

// skipPhotoError menandai foto lama yang memang tidak boleh/tidak dapat
// dipindahkan, sehingga referensinya dibuang dari paket.
type skipPhotoError struct{ reason string }

func (e *skipPhotoError) Error() string { return e.reason }

func copyLegacyPhoto(db *gorm.DB, uploadDir, filename string) (string, error) {
	documentPath := "/uploads/" + filename
	var privateCount int64
	if err := db.Model(&models.Provider{}).Where(`
		document_path = ? OR ktp_path = ? OR nib_path = ? OR npwp_path = ? OR akta_path = ? OR sertifikat_path = ? OR
		pending_document_path = ? OR pending_ktp_path = ? OR pending_nib_path = ? OR pending_npwp_path = ? OR pending_akta_path = ? OR pending_sertifikat_path = ?`,
		documentPath, documentPath, documentPath, documentPath, documentPath, documentPath,
		documentPath, documentPath, documentPath, documentPath, documentPath, documentPath,
	).Count(&privateCount).Error; err != nil {
		return "", err
	}
	if privateCount == 0 {
		if err := db.Model(&models.Booking{}).Where("payment_proof = ?", documentPath).Count(&privateCount).Error; err != nil {
			return "", err
		}
	}
	if privateCount > 0 {
		return "", &skipPhotoError{"berkas juga dipakai sebagai dokumen privat"}
	}

	source, err := os.Open(filepath.Join(uploadDir, filename))
	if errors.Is(err, os.ErrNotExist) {
		return "", &skipPhotoError{"berkas tidak ada di penyimpanan"}
	}
	if err != nil {
		return "", err
	}
	defer source.Close()

	newName, err := models.NewPackagePhotoName(filepath.Ext(filename))
	if err != nil {
		return "", err
	}
	targetPath := filepath.Join(uploadDir, newName)
	target, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return "", err
	}
	if _, err := io.Copy(target, source); err != nil {
		target.Close()
		_ = os.Remove(targetPath)
		return "", err
	}
	if err := target.Close(); err != nil {
		_ = os.Remove(targetPath)
		return "", err
	}
	return "/uploads/" + newName, nil
}

// packagePhotoRefIsValid dipakai saat simpan paket: foto hanya boleh berupa
// foto paket publik atau URL HTTPS eksternal, bukan dokumen privat.
func packagePhotoRefIsValid(ref string) bool {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return true
	}
	if strings.HasPrefix(ref, "/uploads/") {
		return models.IsPackagePhotoName(strings.TrimPrefix(ref, "/uploads/"))
	}
	parsed, err := url.Parse(ref)
	return err == nil && parsed.Scheme == "https" && parsed.Host != "" && !strings.HasPrefix(parsed.Path, "/uploads/doc_")
}
