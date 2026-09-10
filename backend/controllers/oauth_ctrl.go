package controllers

import (
	"encoding/base64"
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

func parseGoogleIDToken(idToken string) (string, string) {
	if idToken == "" {
		return "", ""
	}
	parts := strings.Split(idToken, ".")
	if len(parts) < 2 {
		return "", ""
	}
	payloadSegment := parts[1]
	if l := len(payloadSegment) % 4; l > 0 {
		payloadSegment += strings.Repeat("=", 4-l)
	}
	decoded, err := base64.URLEncoding.DecodeString(payloadSegment)
	if err != nil {
		decoded, err = base64.StdEncoding.DecodeString(payloadSegment)
		if err != nil {
			return "", ""
		}
	}
	var claims struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	_ = json.Unmarshal(decoded, &claims)
	return claims.Email, claims.Name
}

func NewOAuthController(db *gorm.DB, cfg *config.Config) *OAuthController {
	return &OAuthController{db: db, cfg: cfg}
}

// RedirectToGoogle redirects the client to the Google OAuth Consent screen.
// If GOOGLE_CLIENT_ID is not configured, it acts in developer mock mode and redirects
// the user straight back to the frontend with a valid JWT for the seeded demo account.
func (ctrl *OAuthController) RedirectToGoogle(c *gin.Context) {
	authType := c.Query("type")
	if authType == "" {
		authType = "provider"
	}

	if ctrl.cfg.GoogleClientID == "" || ctrl.cfg.GoogleClientSecret == "" {
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

		tokenString, err := ctrl.generateJWT(provider.ID, provider.Role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate mock token: " + err.Error()})
			return
		}

		targetRoute := "dashboard"
		if provider.Role == "CUSTOMER" {
			targetRoute = "beranda"
		} else if provider.WhatsApp == "" || provider.OperationalProvince == "" {
			targetRoute = "profil-provider"
		}

		redirectURL := fmt.Sprintf("%s/?token=%s&route=%s", ctrl.cfg.FrontendURL, tokenString, targetRoute)
		log.Printf("[OAuth] Mock Redirecting to: %s\n", redirectURL)
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
		return
	}

	v := url.Values{}
	v.Set("client_id", ctrl.cfg.GoogleClientID)
	v.Set("redirect_uri", ctrl.cfg.GoogleRedirectURI)
	v.Set("response_type", "code")
	v.Set("scope", "openid email profile")
	v.Set("state", authType)
	v.Set("prompt", "select_account")

	googleAuthURL := "https://accounts.google.com/o/oauth2/v2/auth?" + v.Encode()

	c.Redirect(http.StatusTemporaryRedirect, googleAuthURL)
}

// GoogleCallback handles the callback redirect from Google.
func (ctrl *OAuthController) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	if state == "" {
		state = "provider"
	}

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
		IDToken     string `json:"id_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse token response"})
		return
	}

	// 2. Retrieve user info from id_token or fallback to Google v3 UserInfo endpoint
	var userEmail, userName string
	if tokenResponse.IDToken != "" {
		userEmail, userName = parseGoogleIDToken(tokenResponse.IDToken)
	}

	if userEmail == "" && tokenResponse.AccessToken != "" {
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
						Email string `json:"email"`
						Name  string `json:"name"`
					}
					if err := json.NewDecoder(userResp.Body).Decode(&googleProfile); err == nil {
						userEmail = googleProfile.Email
						if userName == "" {
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
			if state == "customer" {
				provider = models.Provider{
					BusinessName:        googleProfile.Name,
					BusinessCategory:     "customer",
					OperationalProvince: "Indonesia",
					OperationalCity:     "Indonesia",
					Description:          "Customer mendaftar via Google OAuth.",
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
					BusinessCategory:     "tour",
					OperationalProvince: "",
					OperationalCity:     "",
					Description:          "Mitra mendaftar via Google OAuth.",
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
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to auto-register user: " + err.Error()})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + result.Error.Error()})
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

	// 4. Generate JWT
	tokenString, err := ctrl.generateJWT(provider.ID, provider.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session token"})
		return
	}

	// 5. Redirect back to frontend with specific route
	redirectURL := fmt.Sprintf("%s/?token=%s&route=%s", ctrl.cfg.FrontendURL, tokenString, targetRoute)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func (ctrl *OAuthController) generateJWT(providerID uint, role string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"provider_id": providerID,
		"role":        role,
		"exp":         time.Now().Add(time.Hour * 24 * 30).Unix(), // 30 days persistent login
	})
	return token.SignedString([]byte(ctrl.cfg.JWTSecret))
}
