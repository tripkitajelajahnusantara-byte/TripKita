package controllers

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestServePackagePhotoOnlyServesPublicPhotos(t *testing.T) {
	gin.SetMode(gin.TestMode)
	uploadDir := t.TempDir()
	photo := "pkg_0123456789abcdef0123456789abcdef.jpg"
	document := "doc_0123456789abcdef0123456789abcdef.jpg"
	for _, name := range []string{photo, document} {
		if err := os.WriteFile(filepath.Join(uploadDir, name), []byte{0xff, 0xd8, 0xff}, 0o600); err != nil {
			t.Fatal(err)
		}
	}

	router := gin.New()
	router.GET("/uploads/:filename", NewUploadController(nil, uploadDir).ServePackagePhoto)

	cases := map[string]int{
		"/uploads/" + photo:                                 http.StatusOK,
		"/uploads/" + document:                              http.StatusNotFound,
		"/uploads/pkg_missing.jpg":                          http.StatusNotFound,
		"/uploads/..%2f" + document:                         http.StatusNotFound,
		"/uploads/pkg_0123456789abcdef0123456789abcdef.pdf": http.StatusNotFound,
	}
	for path, want := range cases {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != want {
			t.Errorf("%s: status=%d, want %d", path, response.Code, want)
		}
	}
}
