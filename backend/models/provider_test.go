package models

import (
	"testing"
	"time"
)

func TestSoftDeletedProviderCannotAuthenticate(t *testing.T) {
	now := time.Now()
	for _, status := range []string{"APPROVED", "PENDING", "DISABLED", "REJECTED"} {
		p := &Provider{Role: "PROVIDER", Status: status, DeletedAt: &now}
		if p.CanAuthenticate() {
			t.Fatalf("soft-deleted %s provider allowed to log in", status)
		}
	}
	if (&Provider{Role: "PROVIDER", Status: "DISABLED"}).CanAuthenticate() {
		t.Fatal("disabled provider can log in")
	}
	if !(&Provider{Role: "PROVIDER", Status: "PENDING"}).CanAuthenticate() {
		t.Fatal("pending onboarding blocked")
	}
	if !(&Provider{Role: "PROVIDER", Status: "REJECTED"}).CanAuthenticate() {
		t.Fatal("rejected provider cannot log in to read the admin notes")
	}
	if (&Provider{Role: "CUSTOMER", Status: "REJECTED"}).CanAuthenticate() {
		t.Fatal("rejected customer can log in")
	}
}
