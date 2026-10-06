package controllers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"tripkita-provider/middleware"
	"tripkita-provider/models"
	"tripkita-provider/services"
)

type duplicatePackageStub struct {
	services.PackageService
	id, providerID uint
	called         bool
	err            error
}

func (s *duplicatePackageStub) DuplicatePackage(id, providerID uint) (*models.Package, error) {
	s.called, s.id, s.providerID = true, id, providerID
	return &models.Package{ID: 4, ProviderID: providerID, Status: "Draft"}, s.err
}

func TestDuplicatePackageHTTPResponses(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name, id string
		authed   bool
		err      error
		status   int
		called   bool
	}{
		{"no session", "3", false, nil, http.StatusUnauthorized, false},
		{"invalid id", "abc", true, nil, http.StatusBadRequest, false},
		{"zero id", "0", true, nil, http.StatusBadRequest, false},
		{"negative id", "-1", true, nil, http.StatusBadRequest, false},
		{"overflow id", "4294967296", true, nil, http.StatusBadRequest, false},
		{"not owned or missing", "3", true, gorm.ErrRecordNotFound, http.StatusNotFound, true},
		{"database failure", "3", true, errors.New("database unavailable"), http.StatusInternalServerError, true},
		{"created draft", "3", true, nil, http.StatusCreated, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			stub := &duplicatePackageStub{err: tc.err}
			r := gin.New()
			if tc.authed {
				r.Use(func(c *gin.Context) { c.Set("provider_id", uint(7)); c.Next() })
			}
			r.POST("/packages/:id/duplicate", NewPackageController(stub).Duplicate)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/packages/"+tc.id+"/duplicate", nil))
			if w.Code != tc.status || stub.called != tc.called {
				t.Fatalf("got %d %s, called %v", w.Code, w.Body.String(), stub.called)
			}
			if stub.called && (stub.id != 3 || stub.providerID != 7) {
				t.Fatalf("incorrect ownership context: %+v", stub)
			}
		})
	}
}

func TestDuplicateRequiresApprovedVerifiedProvider(t *testing.T) {
	for _, role := range []string{"CUSTOMER", "ADMIN", "PROVIDER"} {
		for _, approved := range []bool{false, true} {
			for _, verified := range []bool{false, true} {
				stub := &duplicatePackageStub{}
				r := gin.New()
				r.Use(func(c *gin.Context) {
					c.Set("provider_id", uint(7))
					c.Set("role", role)
					c.Set("account_status", map[bool]string{true: "APPROVED", false: "PENDING"}[approved])
					c.Set("is_verified", verified)
					c.Next()
				}, middleware.ProviderRequired())
				r.POST("/packages/:id/duplicate", NewPackageController(stub).Duplicate)
				w := httptest.NewRecorder()
				r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/packages/3/duplicate", nil))
				want := http.StatusForbidden
				if role == "PROVIDER" && approved && verified {
					want = http.StatusCreated
				}
				if w.Code != want || stub.called != (want == http.StatusCreated) {
					t.Fatalf("role %s approved %v verified %v: %d", role, approved, verified, w.Code)
				}
			}
		}
	}
}
