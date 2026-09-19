package controllers

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

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
	// Format lama tidak memiliki timestamp dan tidak boleh diterima kembali,
	// karena dapat digunakan tanpa batas waktu.
	if _, ok := ctrl.verifyOAuthState("provider.nonce.signature"); ok {
		t.Fatal("state legacy tanpa masa berlaku diterima")
	}
}

func TestGoogleCallbackRequiresBrowserStateAndPKCECookies(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := &OAuthController{cfg: &config.Config{JWTSecret: strings.Repeat("a7", 32)}}
	state, err := ctrl.newOAuthState("customer")
	if err != nil {
		t.Fatal(err)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/public/auth/google/callback?code=fake&state="+state, nil)

	ctrl.GoogleCallback(ctx)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("callback tanpa cookie harus ditolak: got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "OAuth state tidak valid") {
		t.Fatalf("respons callback tidak menjelaskan state invalid: %s", recorder.Body.String())
	}
}

func TestGoogleRedirectSetsBoundStateAndPKCECookies(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := &OAuthController{cfg: &config.Config{
		AppEnv:             "production",
		JWTSecret:          strings.Repeat("a7", 32),
		GoogleClientID:     "client.apps.googleusercontent.com",
		GoogleClientSecret: "client-secret",
		GoogleRedirectURI:  "https://api.example.com/api/v1/public/auth/google/callback",
	}}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/public/auth/google?type=customer", nil)
	ctrl.RedirectToGoogle(ctx)

	if recorder.Code != http.StatusTemporaryRedirect {
		t.Fatalf("redirect OAuth gagal: got %d body=%s", recorder.Code, recorder.Body.String())
	}
	location, err := url.Parse(recorder.Header().Get("Location"))
	if err != nil {
		t.Fatal(err)
	}
	if location.Query().Get("state") == "" || location.Query().Get("code_challenge") == "" || location.Query().Get("code_challenge_method") != "S256" {
		t.Fatalf("redirect tidak membawa state/PKCE yang lengkap: %s", location.String())
	}

	cookies := recorder.Result().Cookies()
	if len(cookies) != 2 {
		t.Fatalf("diharapkan dua cookie OAuth, got %d", len(cookies))
	}
	for _, cookie := range cookies {
		if cookie.Path != oauthCookiePath || !cookie.Secure || !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode {
			t.Fatalf("atribut cookie OAuth tidak aman: %+v", cookie)
		}
	}
}
