package controllers

import (
	"encoding/base64"
	"strings"
	"testing"

	"tripkita-provider/config"
)

func TestPKCEPair(t *testing.T) {
	verifier, challenge, err := newPKCE()
	if err != nil {
		t.Fatal(err)
	}
	if len(verifier) < 43 || len(verifier) > 128 || verifier == challenge {
		t.Fatalf("PKCE pair tidak valid: verifier=%d challenge=%d", len(verifier), len(challenge))
	}
	decoded, err := base64.RawURLEncoding.Strict().DecodeString(challenge)
	if err != nil || len(decoded) != 32 {
		t.Fatalf("challenge bukan SHA-256 base64url: %v", err)
	}
}

func TestOAuthStateIsSignedAndTyped(t *testing.T) {
	ctrl := &OAuthController{cfg: &config.Config{JWTSecret: strings.Repeat("a7", 32)}}
	state, err := ctrl.newOAuthState("provider")
	if err != nil {
		t.Fatal(err)
	}
	authType, ok := ctrl.verifyOAuthState(state)
	if !ok || authType != "provider" {
		t.Fatalf("state valid ditolak: type=%q ok=%v", authType, ok)
	}
	tampered := strings.Replace(state, "provider.", "customer.", 1)
	if _, ok := ctrl.verifyOAuthState(tampered); ok {
		t.Fatal("state yang dimodifikasi diterima")
	}
}
