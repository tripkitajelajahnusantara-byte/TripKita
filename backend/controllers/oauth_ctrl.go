package controllers

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"tripkita-provider/authn"
	"tripkita-provider/config"
	"tripkita-provider/models"
)

const oauthCookiePath = "/api/v1/public/auth/google"

type OAuthController struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewOAuthController(db *gorm.DB, cfg *config.Config) *OAuthController {
	return &OAuthController{db: db, cfg: cfg}
}

func (ctrl *OAuthController) RedirectToGoogle(c *gin.Context) {
	authType := c.Query("type")
	if authType != "customer" && authType != "provider" {
		authType = "provider"
	}

	if ctrl.cfg.GoogleClientID == "" || ctrl.cfg.GoogleClientSecret == "" {
		if !ctrl.cfg.EnableDevMocks {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Google OAuth belum dikonfigurasi"})
			return
		}
		ctrl.redirectDevMock(c, authType)
		return
	}

	state, err := ctrl.newOAuthState(authType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai sesi OAuth"})
		return
	}
	verifier, challenge, err := newPKCE()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai sesi OAuth"})
		return
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("tripkita_oauth_state", state, 600, oauthCookiePath, "", ctrl.cfg.IsProduction(), true)
	c.SetCookie("tripkita_oauth_pkce", verifier, 600, oauthCookiePath, "", ctrl.cfg.IsProduction(), true)

	v := url.Values{}
	v.Set("client_id", ctrl.cfg.GoogleClientID)
	v.Set("redirect_uri", ctrl.cfg.GoogleRedirectURI)
	v.Set("response_type", "code")
	v.Set("scope", "openid email profile")
	v.Set("state", state)
	v.Set("code_challenge", challenge)
	v.Set("code_challenge_method", "S256")
	v.Set("prompt", "select_account")
	c.Redirect(http.StatusTemporaryRedirect, "https://accounts.google.com/o/oauth2/v2/auth?"+v.Encode())
}

func (ctrl *OAuthController) redirectDevMock(c *gin.Context, authType string) {
	log.Println("[OAuth] Google credentials kosong; memakai developer mock mode.")
	var provider models.Provider
	if authType == "customer" {
		ctrl.db.Where("role = ?", "CUSTOMER").First(&provider)
		if provider.ID == 0 {
			provider = models.Provider{BusinessName: "Traveler Google Mock", PicName: "Traveler Mock", Email: "customer.mock@gmail.com", Role: "CUSTOMER", Status: "APPROVED", IsVerified: true}
			if err := ctrl.db.Create(&provider).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create mock account"})
				return
			}
		}
	} else if err := ctrl.db.Where("role = ?", "PROVIDER").First(&provider).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get mock provider"})
		return
	}

	user, err := ctrl.ensureUserForProvider(provider)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare mock account"})
		return
	}
	loginCode, err := ctrl.createLoginCode(user.ID, provider.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate mock login code"})
		return
	}
	ctrl.redirectFrontend(c, provider, loginCode)
}

func (ctrl *OAuthController) GoogleCallback(c *gin.Context) {
	code, state := c.Query("code"), c.Query("state")
	cookieState, stateErr := c.Cookie("tripkita_oauth_state")
	verifier, verifierErr := c.Cookie("tripkita_oauth_pkce")
	ctrl.clearOAuthCookies(c)
	if stateErr != nil || verifierErr != nil || !hmac.Equal([]byte(cookieState), []byte(state)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "OAuth state tidak valid atau sudah kedaluwarsa"})
		return
	}
	authType, ok := ctrl.verifyOAuthState(state)
	if !ok || code == "" || len(verifier) < 43 || len(verifier) > 128 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "OAuth request tidak valid"})
		return
	}

	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", ctrl.cfg.GoogleClientID)
	form.Set("client_secret", ctrl.cfg.GoogleClientSecret)
	form.Set("redirect_uri", ctrl.cfg.GoogleRedirectURI)
	form.Set("grant_type", "authorization_code")
	form.Set("code_verifier", verifier)
	tokenRequest, err := http.NewRequest(http.MethodPost, "https://oauth2.googleapis.com/token", strings.NewReader(form.Encode()))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare token exchange"})
		return
	}
	tokenRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpClient := &http.Client{Timeout: 10 * time.Second}
	resp, err := httpClient.Do(tokenRequest)
	if err != nil {
		log.Printf("[OAuth] token exchange request failed: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Google authentication sedang tidak tersedia"})
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Printf("[OAuth] token exchange rejected with status %d", resp.StatusCode)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Google authentication ditolak"})
		return
	}
	var tokenResponse struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil || tokenResponse.AccessToken == "" {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Google authentication tidak valid"})
		return
	}

	profile, err := fetchGoogleProfile(httpClient, tokenResponse.AccessToken)
	if err != nil {
		log.Printf("[OAuth] profile lookup failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Google authentication tidak mengembalikan identitas yang valid"})
		return
	}
	user, provider, err := ctrl.findOrCreateOAuthUser(authType, profile)
	if err != nil {
		log.Printf("[OAuth] account processing failed: %v", err)
		c.JSON(http.StatusForbidden, gin.H{"error": "Akun Google tidak dapat digunakan untuk login ini"})
		return
	}
	loginCode, err := ctrl.createLoginCode(user.ID, provider.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate login code"})
		return
	}
	ctrl.redirectFrontend(c, provider, loginCode)
}

type googleIdentity struct {
	Subject       string `json:"sub"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	EmailVerified bool   `json:"email_verified"`
}

func fetchGoogleProfile(client *http.Client, accessToken string) (googleIdentity, error) {
	req, err := http.NewRequest(http.MethodGet, "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	if err != nil {
		return googleIdentity{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := client.Do(req)
	if err != nil {
		return googleIdentity{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return googleIdentity{}, fmt.Errorf("userinfo status %d", resp.StatusCode)
	}
	var profile googleIdentity
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return googleIdentity{}, err
	}
	profile.Email = strings.ToLower(strings.TrimSpace(profile.Email))
	if profile.Subject == "" || profile.Email == "" || !profile.EmailVerified {
		return googleIdentity{}, errors.New("missing verified Google identity")
	}
	return profile, nil
}

func (ctrl *OAuthController) findOrCreateOAuthUser(authType string, profile googleIdentity) (models.User, models.Provider, error) {
	var user models.User
	var provider models.Provider
	err := ctrl.db.Transaction(func(tx *gorm.DB) error {
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("google_subject = ?", profile.Subject).First(&user).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			err = tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("LOWER(email) = ?", profile.Email).First(&user).Error
			if err == nil {
				if err := tx.First(&provider, user.ProviderID).Error; err != nil {
					return err
				}
				// Admin must be linked through a separately controlled process. Email
				// possession alone must never grant an administrative identity.
				if provider.Role == "ADMIN" && user.GoogleSubject == "" {
					return errors.New("automatic Google linking is disabled for admin")
				}
				if user.GoogleSubject != "" && user.GoogleSubject != profile.Subject {
					return errors.New("account is linked to another Google identity")
				}
				user.GoogleSubject = profile.Subject
				return tx.Model(&user).Update("google_subject", profile.Subject).Error
			}
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}

			provider = newOAuthProvider(authType, profile)
			if err := tx.Create(&provider).Error; err != nil {
				return err
			}
			user = models.User{ProviderID: provider.ID, Email: profile.Email, GoogleSubject: profile.Subject}
			return tx.Create(&user).Error
		}
		if err != nil {
			return err
		}
		return tx.First(&provider, user.ProviderID).Error
	})
	if err != nil {
		return user, provider, err
	}
	if provider.Status == "REJECTED" || (provider.Role != "PROVIDER" && provider.Status != "APPROVED") {
		return user, provider, errors.New("account is inactive")
	}
	return user, provider, nil
}

func newOAuthProvider(authType string, profile googleIdentity) models.Provider {
	if authType == "customer" {
		return models.Provider{BusinessName: profile.Name, BusinessCategory: "customer", OperationalProvince: "Indonesia", OperationalCity: "Indonesia", Description: "Customer mendaftar via Google OAuth.", PicName: profile.Name, Email: profile.Email, Role: "CUSTOMER", Status: "APPROVED", IsVerified: true}
	}
	return models.Provider{BusinessName: profile.Name, BusinessCategory: "tour", Description: "Mitra mendaftar via Google OAuth.", PicName: profile.Name, Email: profile.Email, Role: "PROVIDER", Status: "PENDING", IsVerified: false}
}

func (ctrl *OAuthController) ExchangeLoginCode(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required,len=64"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kode login tidak valid"})
		return
	}
	hash := sha256.Sum256([]byte(req.Code))
	var provider models.Provider
	var token string
	err := ctrl.db.Transaction(func(tx *gorm.DB) error {
		var code models.OAuthLoginCode
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code_hash = ? AND used_at IS NULL AND expires_at > ?", hex.EncodeToString(hash[:]), time.Now().UTC()).First(&code).Error; err != nil {
			return err
		}
		var user models.User
		if err := tx.First(&user, code.UserID).Error; err != nil {
			return err
		}
		if err := tx.First(&provider, user.ProviderID).Error; err != nil {
			return err
		}
		if provider.Status == "REJECTED" || (provider.Role != "PROVIDER" && provider.Status != "APPROVED") {
			return errors.New("account inactive")
		}
		now := time.Now().UTC()
		if err := tx.Model(&code).Update("used_at", &now).Error; err != nil {
			return err
		}
		var issueErr error
		token, issueErr = authn.IssueSession(c.Request.Context(), tx, user.ID)
		return issueErr
	})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kode login tidak valid atau sudah kedaluwarsa"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "provider": provider})
}

func (ctrl *OAuthController) createLoginCode(userID, providerID uint) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	loginCode := hex.EncodeToString(raw)
	hash := sha256.Sum256([]byte(loginCode))
	record := models.OAuthLoginCode{UserID: userID, ProviderID: providerID, CodeHash: hex.EncodeToString(hash[:]), ExpiresAt: time.Now().UTC().Add(5 * time.Minute), CreatedAt: time.Now().UTC()}
	if err := ctrl.db.Create(&record).Error; err != nil {
		return "", err
	}
	return loginCode, nil
}

func (ctrl *OAuthController) ensureUserForProvider(provider models.Provider) (models.User, error) {
	var user models.User
	err := ctrl.db.Where("provider_id = ?", provider.ID).First(&user).Error
	if err == nil {
		return user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return user, err
	}
	user = models.User{ProviderID: provider.ID, Email: strings.ToLower(strings.TrimSpace(provider.Email)), PasswordHash: provider.PasswordHash}
	return user, ctrl.db.Create(&user).Error
}

func (ctrl *OAuthController) redirectFrontend(c *gin.Context, provider models.Provider, loginCode string) {
	targetRoute := "dashboard"
	if provider.Role == "CUSTOMER" {
		targetRoute = "beranda"
	} else if provider.Role == "ADMIN" {
		targetRoute = "admin-dashboard"
	} else if provider.Status != "APPROVED" || provider.WhatsApp == "" || provider.OperationalProvince == "" || provider.OperationalCity == "" {
		targetRoute = "profil-provider"
	}
	redirectURL := fmt.Sprintf("%s/?oauth_code=%s&route=%s", ctrl.cfg.FrontendURL, url.QueryEscape(loginCode), url.QueryEscape(targetRoute))
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func newPKCE() (string, string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	verifier := base64.RawURLEncoding.EncodeToString(raw)
	digest := sha256.Sum256([]byte(verifier))
	return verifier, base64.RawURLEncoding.EncodeToString(digest[:]), nil
}

func (ctrl *OAuthController) clearOAuthCookies(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("tripkita_oauth_state", "", -1, oauthCookiePath, "", ctrl.cfg.IsProduction(), true)
	c.SetCookie("tripkita_oauth_pkce", "", -1, oauthCookiePath, "", ctrl.cfg.IsProduction(), true)
}

func (ctrl *OAuthController) newOAuthState(authType string) (string, error) {
	randomBytes := make([]byte, 24)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	payload := authType + "." + strconv.FormatInt(time.Now().UTC().Unix(), 10) + "." + hex.EncodeToString(randomBytes)
	mac := hmac.New(sha256.New, []byte(ctrl.cfg.JWTSecret))
	_, _ = mac.Write([]byte("oauth-state:" + payload))
	return payload + "." + hex.EncodeToString(mac.Sum(nil)), nil
}

func (ctrl *OAuthController) verifyOAuthState(state string) (string, bool) {
	parts := strings.Split(state, ".")
	if len(parts) != 4 || (parts[0] != "provider" && parts[0] != "customer") {
		return "", false
	}
	issuedAtUnix, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return "", false
	}
	issuedAt, now := time.Unix(issuedAtUnix, 0), time.Now().UTC()
	if issuedAt.After(now.Add(time.Minute)) || now.Sub(issuedAt) > 10*time.Minute {
		return "", false
	}
	payload := strings.Join(parts[:3], ".")
	mac := hmac.New(sha256.New, []byte(ctrl.cfg.JWTSecret))
	_, _ = mac.Write([]byte("oauth-state:" + payload))
	expected := hex.EncodeToString(mac.Sum(nil))
	return parts[0], hmac.Equal([]byte(expected), []byte(parts[3]))
}
