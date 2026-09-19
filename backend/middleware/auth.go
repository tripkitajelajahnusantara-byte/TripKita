package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tripkita-provider/authn"
	"tripkita-provider/config"
)

func bearerToken(header string) (string, bool) {
	parts := strings.Fields(strings.TrimSpace(header))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || !authn.ValidTokenFormat(parts[1]) {
		return "", false
	}
	return parts[1], true
}

func setPrincipal(c *gin.Context, token string, principal *authn.Principal) {
	c.Set("user_id", principal.User.ID)
	c.Set("provider_id", principal.Provider.ID)
	c.Set("session_id", principal.Session.ID)
	c.Set("session_token", token)
	c.Set("role", principal.Provider.Role)
	c.Set("account_status", principal.Provider.Status)
	c.Set("is_verified", principal.Provider.IsVerified)
}

// AuthMiddleware validates an opaque, revocable server-side session. Role and
// status are loaded on every request, so stale tokens cannot retain access.
func AuthMiddleware(db *gorm.DB, _ *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, ok := bearerToken(c.GetHeader("Authorization"))
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing authorization"})
			return
		}
		principal, err := authn.Authenticate(c.Request.Context(), db, token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired session"})
			return
		}
		setPrincipal(c, token, principal)
		c.Next()
	}
}

func OptionalAuthMiddleware(db *gorm.DB, _ *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := strings.TrimSpace(c.GetHeader("Authorization"))
		if header == "" {
			c.Next()
			return
		}
		token, ok := bearerToken(header)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header"})
			return
		}
		principal, err := authn.Authenticate(c.Request.Context(), db, token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired session"})
			return
		}
		setPrincipal(c, token, principal)
		c.Next()
	}
}

func AdminRequired() gin.HandlerFunc {
	return requireRole("ADMIN", true, false)
}

func ProviderRequired() gin.HandlerFunc {
	return requireRole("PROVIDER", true, true)
}

// ProviderAccountRequired opens only onboarding/profile routes while a
// provider is pending. Operational routes still require full approval.
func ProviderAccountRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, roleOK := c.Get("role")
		status, statusOK := c.Get("account_status")
		if !roleOK || !statusOK || role != "PROVIDER" || (status != "PENDING" && status != "APPROVED") {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: Provider account required"})
			return
		}
		c.Next()
	}
}

func CustomerRequired() gin.HandlerFunc {
	return requireRole("CUSTOMER", true, false)
}

func requireRole(requiredRole string, approved, verified bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, roleOK := c.Get("role")
		status, statusOK := c.Get("account_status")
		isVerified, verifiedOK := c.Get("is_verified")
		allowed := roleOK && role == requiredRole
		if approved {
			allowed = allowed && statusOK && status == "APPROVED"
		}
		if verified {
			allowed = allowed && verifiedOK && isVerified == true
		}
		if !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		c.Next()
	}
}
