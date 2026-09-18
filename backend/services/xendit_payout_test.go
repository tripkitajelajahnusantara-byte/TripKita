package services

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"

	"tripkita-provider/config"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func TestCreatePayoutUsesV3Contract(t *testing.T) {
	service := &xenditService{
		cfg: &config.Config{XenditAPIKey: "xnd_development_test"},
		client: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.Method != http.MethodPost || req.URL.String() != "https://api.xendit.co/v3/payouts" {
				t.Fatalf("request payout salah: %s %s", req.Method, req.URL.String())
			}
			if got := req.Header.Get("API-VERSION"); got != "2025-09-01" {
				t.Fatalf("API-VERSION = %q", got)
			}
			if got := req.Header.Get("Idempotency-key"); got != "tementrip-payout-42" {
				t.Fatalf("idempotency key = %q", got)
			}

			var payload map[string]interface{}
			if err := json.NewDecoder(req.Body).Decode(&payload); err != nil {
				t.Fatalf("payload tidak valid: %v", err)
			}
			if payload["source_of_fund"] != "BUSINESS_REVENUE" || payload["purpose_code"] != "TRAVEL" {
				t.Fatalf("klasifikasi payout salah: %#v", payload)
			}
			recipient := payload["recipient"].(map[string]interface{})
			account := recipient["account_details"].(map[string]interface{})
			if account["routing_type_1"] != "SWIFT" || account["routing_value_1"] != "CENAIDJA" {
				t.Fatalf("routing payout salah: %#v", account)
			}
			details := payload["payout_details"].(map[string]interface{})
			if details["source_currency"] != "IDR" || details["destination_currency"] != "IDR" || details["source_amount"] != float64(425000) {
				t.Fatalf("nominal payout salah: %#v", details)
			}

			return &http.Response{
				StatusCode: http.StatusOK,
				Header:     make(http.Header),
				Body:       io.NopCloser(strings.NewReader(`{"payout_id":"po-test","reference_id":"tementrip-payout-42","status":"ACCEPTED"}`)),
			}, nil
		})},
	}

	result, err := service.CreatePayout(XenditPayoutRequest{
		ReferenceID:       "tementrip-payout-42",
		RoutingType:       "SWIFT",
		RoutingValue:      "CENAIDJA",
		AccountNumber:     "1234567890",
		AccountHolderName: "PT Mitra Wisata",
		Amount:            425000,
		Description:       "Pencairan TemenTrip #42 (DP_50)",
	})
	if err != nil {
		t.Fatalf("CreatePayout gagal: %v", err)
	}
	if result.ID != "po-test" || result.ReferenceID != "tementrip-payout-42" || result.Status != "ACCEPTED" {
		t.Fatalf("respons payout salah: %#v", result)
	}
}

func TestCreatePayoutMarksNetworkFailureAsUnknown(t *testing.T) {
	service := &xenditService{
		cfg: &config.Config{XenditAPIKey: "xnd_development_test"},
		client: &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			return nil, errors.New("connection reset")
		})},
	}

	_, err := service.CreatePayout(XenditPayoutRequest{
		ReferenceID:       "tementrip-payout-7",
		RoutingType:       "SWIFT",
		RoutingValue:      "BMRIIDJA",
		AccountNumber:     "1234567890123",
		AccountHolderName: "PT Mitra",
		Amount:            100000,
		Description:       "Pencairan",
	})
	if !errors.Is(err, ErrPayoutStatusUnknown) {
		t.Fatalf("error jaringan harus berstatus belum pasti, got %v", err)
	}
}

func TestGetPayoutReadsV3Response(t *testing.T) {
	service := &xenditService{
		cfg: &config.Config{XenditAPIKey: "xnd_development_test"},
		client: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.Method != http.MethodGet || req.URL.Path != "/v3/payouts/po-test" {
				t.Fatalf("request status salah: %s %s", req.Method, req.URL.Path)
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Header:     make(http.Header),
				Body:       io.NopCloser(strings.NewReader(`{"payout_id":"po-test","reference_id":"tementrip-payout-7","status":"SUCCEEDED"}`)),
			}, nil
		})},
	}

	result, err := service.GetPayout("po-test")
	if err != nil {
		t.Fatalf("GetPayout gagal: %v", err)
	}
	if result.ID != "po-test" || result.Status != "SUCCEEDED" {
		t.Fatalf("status payout salah: %#v", result)
	}
}

func TestPayoutRecipientSupportsIndividualAccount(t *testing.T) {
	recipient := payoutRecipient(XenditPayoutRequest{
		RoutingType:       "SWIFT",
		RoutingValue:      "CENAIDJA",
		AccountNumber:     "1234567890",
		AccountHolderName: "Siti Aminah",
	})
	if recipient["type"] != "INDIVIDUAL" || recipient["given_name"] != "Siti" || recipient["surname"] != "Aminah" {
		t.Fatalf("recipient individu salah: %#v", recipient)
	}
}
