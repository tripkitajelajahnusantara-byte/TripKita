package controllers

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"tripkita-provider/config"
	"tripkita-provider/models"
)

type OAuthController struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewOAuthController(db *gorm.DB, cfg *config.Config) *OAuthController {
	return &OAuthController{db: db, cfg: cfg}
}

// RedirectToGoogle redirects the client to the Google OAuth Consent screen.
// If GOOGLE_CLIENT_ID is not configured, it acts in developer mock mode and redirects
// the user straight back to the frontend with a valid JWT for the seeded demo account.
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
		log.Println("[OAuth] Google Client credentials not set in .env. Falling back to Developer Mock Mode.")

		var provider models.Provider
		if authType == "customer" {
			ctrl.db.Where("role = ?", "CUSTOMER").First(&provider)
			if provider.ID == 0 {
				provider = models.Provider{
					BusinessName: "Traveler Google Mock",
					PicName:      "Traveler Mock",
					Email:        "customer.mock@gmail.com",
					Role:         "CUSTOMER",
					Status:       "APPROVED",
				}
				ctrl.db.Create(&provider)
			}
		} else {
			if err := ctrl.db.Where("role = ?", "PROVIDER").First(&provider).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get mock provider: " + err.Error()})
				return
			}
		}

		loginCode, err := ctrl.createLoginCode(provider.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate mock login code"})
			return
		}

		targetRoute := "dashboard"
		if provider.Role == "CUSTOMER" {
			targetRoute = "beranda"
		} else if provider.WhatsApp == "" || provider.OperationalProvince == "" {
			targetRoute = "profil-provider"
		}

		redirectURL := fmt.Sprintf("%s/?oauth_code=%s&route=%s", ctrl.cfg.FrontendURL, loginCode, targetRoute)
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
		return
	}

	state, err := ctrl.newOAuthState(authType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai sesi OAuth"})
		return
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("tripkita_oauth_state", state, 600, "/api/v1/public/auth/google", "", ctrl.cfg.IsProduction(), true)

	v := url.Values{}
	v.Set("client_id", ctrl.cfg.GoogleClientID)
	v.Set("redirect_uri", ctrl.cfg.GoogleRedirectURI)
	v.Set("response_type", "code")
	v.Set("scope", "openid email profile")
	v.Set("state", state)
	v.Set("prompt", "select_account")

	googleAuthURL := "https://accounts.google.com/o/oauth2/v2/auth?" + v.Encode()

	c.Redirect(http.StatusTemporaryRedirect, googleAuthURL)
}

// GoogleCallback handles the callback redirect from Google.
func (ctrl *OAuthController) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	cookieState, cookieErr := c.Cookie("tripkita_oauth_state")
	if cookieErr != nil || !hmac.Equal([]byte(cookieState), []byte(state)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "OAuth state tidak valid atau sudah kedaluwarsa"})
		return
	}
	authType, ok := ctrl.verifyOAuthState(state)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "OAuth state tidak valid"})
		return
	}
	c.SetCookie("tripkita_oauth_state", "", -1, "/api/v1/public/auth/google", "", ctrl.cfg.IsProduction(), true)

	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Authorization code is missing"})
		return
	}

	// 1. Exchange authorization code for token
	tokenURL := "https://oauth2.googleapis.com/token"
	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", ctrl.cfg.GoogleClientID)
	form.Set("client_secret", ctrl.cfg.GoogleClientSecret)
	form.Set("redirect_uri", ctrl.cfg.GoogleRedirectURI)
	form.Set("grant_type", "authorization_code")

	tokenRequest, err := http.NewRequest(http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
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
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse token response"})
		return
	}

	// 2. Retrieve verified user information from Google over TLS.
	var userEmail, userName string
	if tokenResponse.AccessToken != "" {
		userInfoURL := "https://www.googleapis.com/oauth2/v3/userinfo"
		req, err := http.NewRequest("GET", userInfoURL, nil)
		if err == nil {
			req.Header.Set("Authorization", "Bearer "+tokenResponse.AccessToken)
			client := &http.Client{Timeout: 10 * time.Second}
			userResp, err := client.Do(req)
			if err == nil {
				defer userResp.Body.Close()
				if userResp.StatusCode == http.StatusOK {
					var googleProfile struct {
						Email         string `json:"email"`
						Name          string `json:"name"`
						EmailVerified bool   `json:"email_verified"`
					}
					if err := json.NewDecoder(userResp.Body).Decode(&googleProfile); err == nil {
						if googleProfile.EmailVerified {
							userEmail = strings.ToLower(strings.TrimSpace(googleProfile.Email))
							userName = googleProfile.Name
						}
					}
				}
			}
		}
	}

	if userEmail == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Google authentication did not return a valid user email address"})
		return
	}

	googleProfile := struct {
		Email string
		Name  string
	}{
		Email: userEmail,
		Name:  userName,
	}

	// 3. Find or register provider/customer by email
	var provider models.Provider
	targetRoute := "dashboard"

	result := ctrl.db.Where("email = ?", googleProfile.Email).First(&provider)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			if authType == "customer" {
				provider = models.Provider{
					BusinessName:        googleProfile.Name,
					BusinessCategory:    "customer",
					OperationalProvince: "Indonesia",
					OperationalCity:     "Indonesia",
					Description:         "Customer mendaftar via Google OAuth.",
					DocumentUploaded:    false,
					PicName:             googleProfile.Name,
					Email:               googleProfile.Email,
					WhatsApp:            "",
					Role:                "CUSTOMER",
					Status:              "APPROVED",
					IsVerified:          true,
				}
				targetRoute = "beranda"
			} else {
				// Register new Provider via Google (Pendaftaran Mitra via Google)
				provider = models.Provider{
					BusinessName:        googleProfile.Name,
					BusinessCategory:    "tour",
					OperationalProvince: "",
					OperationalCity:     "",
					Description:         "Mitra mendaftar via Google OAuth.",
					DocumentUploaded:    false,
					PicName:             googleProfile.Name,
					Email:               googleProfile.Email,
					WhatsApp:            "",
					Role:                "PROVIDER",
					Status:              "PENDING",
					IsVerified:          true,
				}
				targetRoute = "profil-provider" // Direct to complete profile & business info
			}
			if err := ctrl.db.Create(&provider).Error; err != nil {
				log.Printf("[OAuth] failed to create account: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Akun tidak dapat dibuat"})
				return
			}
		} else {
			log.Printf("[OAuth] account lookup failed: %v", result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Akun tidak dapat diproses"})
			return
		}
	} else {
		if provider.Role == "CUSTOMER" {
			targetRoute = "beranda"
		} else if provider.Role == "PROVIDER" {
			// If provider profile is missing key details, send to complete profile page
			if provider.WhatsApp == "" || provider.OperationalProvince == "" || provider.OperationalCity == "" {
				targetRoute = "profil-provider"
			} else {
				targetRoute = "dashboard"
			}
		} else if provider.Role == "ADMIN" {
			targetRoute = "admin-dashboard"
		}
	}

	// 4. Generate a one-time login code. The application JWT never appears in
	// browser history, proxy logs, or the OAuth redirect URL.
	loginCode, err := ctrl.createLoginCode(provider.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate login code"})
		return
	}

	// 5. Redirect back to frontend with specific route
	redirectURL := fmt.Sprintf("%s/?oauth_code=%s&route=%s", ctrl.cfg.FrontendURL, loginCode, targetRoute)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
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
	err := ctrl.db.Transaction(func(tx *gorm.DB) error {
		var code models.OAuthLoginCode
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code_hash = ? AND used_at IS NULL AND expires_at > ?", hex.EncodeToString(hash[:]), time.Now()).First(&code).Error; err != nil {
			return err
		}
		if err := tx.First(&provider, code.ProviderID).Error; err != nil {
			return err
		}
		now := time.Now()
		return tx.Model(&code).Update("used_at", &now).Error
	})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kode login tidak valid atau sudah kedaluwarsa"})
		return
	}
	token, err := ctrl.generateJWT(provider.ID, provider.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "provider": provider})
}

func (ctrl *OAuthController) createLoginCode(providerID uint) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	loginCode := hex.EncodeToString(raw)
	hash := sha256.Sum256([]byte(loginCode))
	record := models.OAuthLoginCode{
		CodeHash: hex.EncodeToString(hash[:]), ProviderID: providerID,
		ExpiresAt: time.Now().Add(5 * time.Minute), CreatedAt: time.Now(),
	}
	if err := ctrl.db.Create(&record).Error; err != nil {
		return "", err
	}
	return loginCode, nil
}

func (ctrl *OAuthController) generateJWT(providerID uint, role string) (string, error) {
	now := time.Now()
	randomID := make([]byte, 16)
	if _, err := rand.Read(randomID); err != nil {
		return "", err
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"provider_id": providerID,
		"role":        role,
		"iss":         "tripkita-api",
		"aud":         "tripkita-web",
		"iat":         now.Unix(),
		"jti":         hex.EncodeToString(randomID),
		"exp":         now.Add(8 * time.Hour).Unix(),
	})
	return token.SignedString([]byte(ctrl.cfg.JWTSecret))
}

func (ctrl *OAuthController) newOAuthState(authType string) (string, error) {
	randomBytes := make([]byte, 24)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	payload := authType + "." + hex.EncodeToString(randomBytes)
	mac := hmac.New(sha256.New, []byte(ctrl.cfg.JWTSecret))
	_, _ = mac.Write([]byte(payload))
	return payload + "." + hex.EncodeToString(mac.Sum(nil)), nil
}

func (ctrl *OAuthController) verifyOAuthState(state string) (string, bool) {
	parts := strings.Split(state, ".")
	if len(parts) != 3 || (parts[0] != "provider" && parts[0] != "customer") {
		return "", false
	}
	payload := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, []byte(ctrl.cfg.JWTSecret))
	_, _ = mac.Write([]byte(payload))
	expected := hex.EncodeToString(mac.Sum(nil))
	return parts[0], hmac.Equal([]byte(expected), []byte(parts[2]))
}
