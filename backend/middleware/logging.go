package middleware

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// AccessLogger logs the registered route template instead of raw URLs. This
// keeps OAuth codes and booking tracking codes out of application logs.
func AccessLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		startedAt := time.Now()
		c.Next()
		route := c.FullPath()
		if route == "" {
			route = "unmatched-route"
		}
		log.Printf("[HTTP] method=%s route=%s status=%d latency_ms=%d", c.Request.Method, route, c.Writer.Status(), time.Since(startedAt).Milliseconds())
	}
}

func SafeRecovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recover() != nil {
				route := c.FullPath()
				if route == "" {
					route = "unmatched-route"
				}
				log.Printf("[PANIC] method=%s route=%s", c.Request.Method, route)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Terjadi kesalahan internal"})
			}
		}()
		c.Next()
	}
}
