package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

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
	if ctrl.cfg.GoogleClientID == "" || ctrl.cfg.GoogleClientSecret == "" {
		log.Println("[OAuth] Google Client credentials not set in .env. Falling back to Developer Mock Mode.")
		
		// Find first provider in DB (which is seeded by default)
		var provider models.Provider
		if err := ctrl.db.First(&provider).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get mock provider: " + err.Error()})
			return
		}

		tokenString, err := ctrl.generateJWT(provider.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate mock token: " + err.Error()})
			return
		}

		redirectURL := fmt.Sprintf("%s/?token=%s", ctrl.cfg.FrontendURL, tokenString)
		log.Printf("[OAuth] Mock Redirecting to: %s\n", redirectURL)
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
		return
	}

	scope := "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
	googleAuthURL := fmt.Sprintf(
		"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=%s",
		ctrl.cfg.GoogleClientID,
		url.QueryEscape(ctrl.cfg.GoogleRedirectURI),
		url.QueryEscape(scope),
	)

	c.Redirect(http.StatusTemporaryRedirect, googleAuthURL)
}

// GoogleCallback handles the callback redirect from Google.
func (ctrl *OAuthController) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
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

	resp, err := http.Post(tokenURL, "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange token: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Token exchange failed with code %d: %s", resp.StatusCode, string(bodyBytes))})
		return
	}

	var tokenResponse struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse token response"})
		return
	}

	// 2. Fetch UserInfo from Google
	userInfoURL := "https://www.googleapis.com/oauth2/v2/userinfo"
	req, err := http.NewRequest("GET", userInfoURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request for user info"})
		return
	}
	req.Header.Set("Authorization", "Bearer "+tokenResponse.AccessToken)

	client := &http.Client{}
	userResp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to request user info: " + err.Error()})
		return
	}
	defer userResp.Body.Close()

	if userResp.StatusCode != http.StatusOK {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch user info: status %d", userResp.StatusCode)})
		return
	}

	var googleProfile struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(userResp.Body).Decode(&googleProfile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Google user profile"})
		return
	}

	if googleProfile.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Google profile did not contain an email address"})
		return
	}

	// 3. Find or register provider by email
	var provider models.Provider
	result := ctrl.db.Where("email = ?", googleProfile.Email).First(&provider)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Register a new provider auto-filled with Google details
			provider = models.Provider{
				BusinessName:        googleProfile.Name,
				BusinessCategory:     "tour",
				OperationalProvince: "Provinsi Belum Diatur",
				OperationalCity:     "Kota Belum Diatur",
				Description:          "Penyedia Wisata yang mendaftar melalui Google OAuth.",
				DocumentUploaded: false,
				PicName:          googleProfile.Name,
				Email:            googleProfile.Email,
				WhatsApp:         "+62 000 000 000",
				IsVerified:       true, // Google accounts verified
			}
			if err := ctrl.db.Create(&provider).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to auto-register provider: " + err.Error()})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + result.Error.Error()})
			return
		}
	}

	// 4. Generate JWT
	tokenString, err := ctrl.generateJWT(provider.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session token"})
		return
	}

	// 5. Redirect back to frontend
	redirectURL := fmt.Sprintf("%s/?token=%s", ctrl.cfg.FrontendURL, tokenString)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func (ctrl *OAuthController) generateJWT(providerID uint) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"provider_id": providerID,
		"exp":         time.Now().Add(time.Hour * 72).Unix(), // 3 days
	})
	return token.SignedString([]byte(ctrl.cfg.JWTSecret))
}
