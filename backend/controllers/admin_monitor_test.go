package controllers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"tripkita-provider/middleware"
	"tripkita-provider/models"
	"tripkita-provider/services"
)

type monitorAdminStub struct {
	services.AdminService
	filter models.AdminBookingFilter
	called bool
}

func (s *monitorAdminStub) MonitorBookings(filter models.AdminBookingFilter) (*models.AdminBookingMonitor, error) {
	s.called, s.filter = true, filter
	return &models.AdminBookingMonitor{Items: []models.AdminBookingItem{}, Page: filter.Page, PageSize: filter.PageSize}, nil
}

func TestMonitorRejectsInvalidFiltersBeforeQuerying(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, query := range []string{"page=0", "page=-1", "page=1000001", "pageSize=0", "pageSize=101", "providerId=-1", "providerId=x", "status=UNKNOWN", "q=" + strings.Repeat("a", 151)} {
		t.Run(query, func(t *testing.T) {
			stub := &monitorAdminStub{}
			r := gin.New()
			r.GET("/monitor", NewAdminController(stub).MonitorBookings)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", "/monitor?"+query, nil))
			if w.Code != http.StatusBadRequest || stub.called {
				t.Fatalf("unsafe query accepted: %d %s", w.Code, w.Body.String())
			}
		})
	}
}

func TestMonitorRequiresAdminAndUsesBoundedDefaults(t *testing.T) {
	for _, role := range []string{"", "CUSTOMER", "PROVIDER", "ADMIN"} {
		t.Run(role, func(t *testing.T) {
			stub := &monitorAdminStub{}
			r := gin.New()
			r.Use(func(c *gin.Context) { c.Set("role", role); c.Set("account_status", "APPROVED"); c.Next() }, middleware.AdminRequired())
			r.GET("/monitor", NewAdminController(stub).MonitorBookings)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", "/monitor", nil))
			if role != "ADMIN" {
				if w.Code != http.StatusForbidden || stub.called {
					t.Fatalf("non-admin admitted: %d", w.Code)
				}
			} else if w.Code != http.StatusOK || stub.filter.Page != 1 || stub.filter.PageSize != 20 {
				t.Fatalf("admin defaults: %d %+v", w.Code, stub.filter)
			}
		})
	}
}
