package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/gin-gonic/gin"
)

// RequestIDHeader dikirim kembali ke klien supaya laporan pengguna dapat
// dicocokkan dengan baris log tanpa perlu membocorkan detail internal.
const RequestIDHeader = "X-Request-ID"

const requestIDContextKey = "request_id"

// RequestID memberi setiap permintaan identifier acak. Nilai dari klien tidak
// pernah dipercaya agar log tidak dapat dipalsukan atau disuntik.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		buf := make([]byte, 8)
		id := ""
		if _, err := rand.Read(buf); err == nil {
			id = hex.EncodeToString(buf)
		}
		c.Set(requestIDContextKey, id)
		c.Header(RequestIDHeader, id)
		c.Next()
	}
}

// RequestIDOf mengembalikan request id yang dipasang oleh RequestID().
func RequestIDOf(c *gin.Context) string {
	if value, ok := c.Get(requestIDContextKey); ok {
		if id, ok := value.(string); ok {
			return id
		}
	}
	return ""
}

func routeOf(c *gin.Context) string {
	if route := c.FullPath(); route != "" {
		return route
	}
	return "unmatched-route"
}

// AccessLogger logs the registered route template instead of raw URLs. This
// keeps OAuth codes and booking tracking codes out of application logs.
// Probe health check tidak dicatat agar log produksi tetap terbaca.
func AccessLogger() gin.HandlerFunc {
	silent := map[string]struct{}{"/healthz": {}, "/readyz": {}}

	return func(c *gin.Context) {
		startedAt := time.Now()
		c.Next()
		if _, skip := silent[c.Request.URL.Path]; skip && c.Writer.Status() < http.StatusBadRequest {
			return
		}
		log.Printf("[HTTP] request_id=%s method=%s route=%s status=%d latency_ms=%d",
			RequestIDOf(c), c.Request.Method, routeOf(c), c.Writer.Status(), time.Since(startedAt).Milliseconds())
	}
}

// SafeRecovery mencatat nilai panic beserta stack trace ke log server supaya
// insiden production dapat ditelusuri, sementara klien hanya menerima pesan
// generik tanpa detail internal.
func SafeRecovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recovered := recover(); recovered != nil {
				requestID := RequestIDOf(c)
				log.Printf("[PANIC] request_id=%s method=%s route=%s panic=%v\n%s",
					requestID, c.Request.Method, routeOf(c), recovered, debug.Stack())
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error":      "Terjadi kesalahan internal",
					"request_id": requestID,
				})
			}
		}()
		c.Next()
	}
}
