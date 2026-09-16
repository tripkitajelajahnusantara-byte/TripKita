package middleware

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

	"tripkita-provider/config"
	"tripkita-provider/models"
)

func ParseToken(cfg *config.Config, tokenString string) (uint, string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWTSecret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithIssuer("tripkita-api"), jwt.WithAudience("tripkita-web"), jwt.WithExpirationRequired())
	if err != nil || !token.Valid {
		return 0, "", errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, "", errors.New("invalid token claims")
	}
	providerIDFloat, ok := claims["provider_id"].(float64)
	if !ok || providerIDFloat <= 0 {
		return 0, "", errors.New("token claims missing provider ID")
	}
	role, ok := claims["role"].(string)
	if !ok || role == "" {
		return 0, "", errors.New("token claims missing role")
	}
	return uint(providerIDFloat), role, nil
}

func loadAuthenticatedAccount(db *gorm.DB, providerID uint, tokenRole string) (*models.Provider, error) {
	var account models.Provider
	if err := db.Select("id", "role", "status", "is_verified").First(&account, providerID).Error; err != nil {
		return nil, err
	}
	if account.Role != tokenRole {
		return nil, errors.New("account role changed")
	}
	return &account, nil
}

func AuthMiddleware(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			c.Abort()
			return
		}

		providerID, role, err := ParseToken(cfg, parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		account, err := loadAuthenticatedAccount(db, providerID, role)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Account is no longer active"})
			c.Abort()
			return
		}

		// Set provider ID and role to context
		c.Set("provider_id", providerID)
		c.Set("role", account.Role)
		c.Set("account_status", account.Status)
		c.Set("is_verified", account.IsVerified)
		c.Next()
	}
}

func OptionalAuthMiddleware(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if authHeader == "" {
			c.Next()
			return
		}
		parts := strings.Fields(authHeader)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header"})
			return
		}
		providerID, role, err := ParseToken(cfg, parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		account, err := loadAuthenticatedAccount(db, providerID, role)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Account is no longer active"})
			return
		}
		c.Set("provider_id", providerID)
		c.Set("role", account.Role)
		c.Set("account_status", account.Status)
		c.Set("is_verified", account.IsVerified)
		c.Next()
	}
}

func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		status, _ := c.Get("account_status")
		if !exists || role != "ADMIN" || status != "APPROVED" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func ProviderRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		status, _ := c.Get("account_status")
		verified, _ := c.Get("is_verified")
		if !exists || role != "PROVIDER" || status != "APPROVED" || verified != true {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: Provider access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// ProviderAccountRequired allows a provider to complete onboarding while it is
// still pending, without opening operational package/booking routes.
func ProviderAccountRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role != "PROVIDER" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: Provider account required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func CustomerRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		status, _ := c.Get("account_status")
		if !exists || role != "CUSTOMER" || status != "APPROVED" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: Customer access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}
