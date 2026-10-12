package controllers

import (
	"bytes"
	"encoding/json"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"tripkita-provider/models"
)

func profilePhotoContext(t *testing.T, content []byte) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "logo.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/provider/profile/photo", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = request
	ctx.Set("provider_id", uint(7))
	return ctx, response
}

func TestUploadProfilePhotoStoresPublicPhotoAndUpdatesProvider(t *testing.T) {
	gin.SetMode(gin.TestMode)
	png := []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}

	for _, dbFails := range []bool{false, true} {
		conn, mock, err := sqlmock.New()
		if err != nil {
			t.Fatal(err)
		}
		db, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
		if err != nil {
			t.Fatal(err)
		}
		uploadDir := t.TempDir()
		mock.ExpectBegin()
		update := mock.ExpectExec(`UPDATE "providers" SET "profile_photo"=\$1,"updated_at"=\$2 WHERE id = \$3`).
			WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), uint(7))
		if dbFails {
			update.WillReturnError(errors.New("db down"))
			mock.ExpectRollback()
		} else {
			update.WillReturnResult(sqlmock.NewResult(0, 1))
			mock.ExpectCommit()
		}

		ctx, response := profilePhotoContext(t, png)
		NewUploadController(db, uploadDir).UploadProfilePhoto(ctx)

		entries, _ := os.ReadDir(uploadDir)
		if dbFails {
			if response.Code != http.StatusInternalServerError || len(entries) != 0 {
				t.Fatalf("gagal simpan DB harus 500 tanpa berkas yatim: status=%d berkas=%d", response.Code, len(entries))
			}
		} else {
			var payload struct {
				ProfilePhoto string `json:"profilePhoto"`
			}
			_ = json.Unmarshal(response.Body.Bytes(), &payload)
			filename := strings.TrimPrefix(payload.ProfilePhoto, "/uploads/")
			if response.Code != http.StatusOK || !models.IsPackagePhotoName(filename) {
				t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
			}
			if _, err := os.Stat(filepath.Join(uploadDir, filename)); err != nil {
				t.Fatalf("foto tidak tersimpan: %v", err)
			}
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatal(err)
		}
		conn.Close()
	}
}

func TestUploadProfilePhotoRejectsNonImageWithoutTouchingProvider(t *testing.T) {
	gin.SetMode(gin.TestMode)
	conn, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}

	ctx, response := profilePhotoContext(t, []byte("%PDF-1.4 bukan foto"))
	NewUploadController(db, t.TempDir()).UploadProfilePhoto(ctx)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
