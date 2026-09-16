package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateBucket struct {
	count   int
	resetAt time.Time
}

// RateLimit is an in-process safety limit. Production should also enforce limits
// at the edge/load balancer so limits remain effective across replicas.
func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	var mu sync.Mutex
	buckets := make(map[string]rateBucket)

	return func(c *gin.Context) {
		now := time.Now()
		key := c.ClientIP()

		mu.Lock()
		if len(buckets) > 10_000 {
			for bucketKey, candidate := range buckets {
				if now.After(candidate.resetAt) {
					delete(buckets, bucketKey)
				}
			}
		}
		bucket, exists := buckets[key]
		if !exists || now.After(bucket.resetAt) {
			bucket = rateBucket{resetAt: now.Add(window)}
		}
		bucket.count++
		buckets[key] = bucket
		remaining := limit - bucket.count
		mu.Unlock()

		if remaining < 0 {
			retryAfter := int(time.Until(bucket.resetAt).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Terlalu banyak permintaan. Silakan coba lagi beberapa saat."})
			return
		}
		c.Next()
	}
}
