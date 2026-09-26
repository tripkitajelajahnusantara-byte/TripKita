package controllers

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestUploadDocumentUsesConfiguredDirectory(t *testing.T) {
	gin.SetMode(gin.TestMode)
	uploadDir := t.TempDir()
	controller := NewUploadController(nil, uploadDir)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "ktp.png")
	if err != nil {
		t.Fatalf("gagal membuat multipart: %v", err)
	}
	// Signature PNG valid; DetectContentType does not require a complete image.
	if _, err := part.Write([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}); err != nil {
		t.Fatalf("gagal menulis dokumen: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("gagal menutup multipart: %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/upload", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = request

	controller.UploadDocument(ctx)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	var payload struct {
		DocumentPath string `json:"documentPath"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("respons tidak valid: %v", err)
	}
	filename := strings.TrimPrefix(payload.DocumentPath, "/uploads/")
	if filename == payload.DocumentPath || filename == "" {
		t.Fatalf("path dokumen tidak sesuai: %q", payload.DocumentPath)
	}
	if _, err := os.Stat(filepath.Join(uploadDir, filename)); err != nil {
		t.Fatalf("dokumen tidak tersimpan di UPLOAD_DIR: %v", err)
	}
}
