package controllers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"tripkita-provider/config"
	"tripkita-provider/models"
)

type payoutServiceRecorder struct {
	gatewayID string
	reference string
	status    string
	failure   string
}

func (s *payoutServiceRecorder) RequestPayout(uint, *models.CreatePayoutRequest) (*models.Payout, error) {
	return nil, nil
}
func (s *payoutServiceRecorder) GetProviderPayoutSummary(uint) (*models.PayoutSummary, error) {
	return nil, nil
}
func (s *payoutServiceRecorder) GetAllPayouts() ([]models.Payout, error) { return nil, nil }
func (s *payoutServiceRecorder) ProcessPayout(uint, string, string, string) (*models.Payout, error) {
	return nil, nil
}
func (s *payoutServiceRecorder) HandlePayoutCallback(gatewayID, reference, status, failure string) error {
	s.gatewayID, s.reference, s.status, s.failure = gatewayID, reference, status, failure
	return nil
}
func (s *payoutServiceRecorder) ReconcileProcessingPayouts(context.Context) {}

func TestIPaymuPayoutWebhookAcceptsPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &payoutServiceRecorder{}
	controller := &PayoutController{
		cfg:     &config.Config{},
		service: service,
	}
	router := gin.New()
	router.POST("/webhook", controller.IPaymuPayoutWebhook)

	body := `{
		"payout_id":"po-123",
		"reference_id":"tementrip-payout-42",
		"status":"SUCCEEDED"
	}`
	req := httptest.NewRequest(http.MethodPost, "/webhook", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("status webhook = %d, body=%s", res.Code, res.Body.String())
	}
	if service.gatewayID != "po-123" || service.reference != "tementrip-payout-42" || service.status != "SUCCEEDED" {
		t.Fatalf("payload tidak diteruskan dengan benar: %#v", service)
	}
}
