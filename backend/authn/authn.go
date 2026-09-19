package authn

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"tripkita-provider/models"
)

const (
	argonMemory      = 19 * 1024
	argonIterations  = 2
	argonParallelism = 1
	argonSaltLength  = 16
	argonKeyLength   = 32

	sessionPrefix      = "tks_"
	sessionRandomBytes = 32
	SessionAbsoluteTTL = 8 * time.Hour
	SessionIdleTTL     = 60 * time.Minute
	sessionTouchWindow = 5 * time.Minute
)

var (
	ErrInvalidSession  = errors.New("invalid or expired session")
	ErrInactiveAccount = errors.New("account is not active")
)

type Principal struct {
	User     models.User
	Provider models.Provider
	Session  models.AuthSession
}

// HashPassword menggunakan parameter minimum Argon2id yang direkomendasikan
// OWASP. Format PHC membawa seluruh parameter agar dapat dinaikkan kemudian.
func HashPassword(password string) (string, error) {
	if len(password) < 12 || len(password) > 128 {
		return "", errors.New("password harus 12 sampai 128 karakter")
	}
	return hashPassword(password)
}

// HashPasswordForMigration hanya untuk menaikkan bcrypt akun lama yang dahulu
// diizinkan memakai password lebih pendek. Kebijakan password baru tetap
// diterapkan oleh HashPassword saat registrasi dan reset.
func HashPasswordForMigration(password string) (string, error) {
	if len(password) == 0 || len(password) > 128 {
		return "", errors.New("invalid legacy password length")
	}
	return hashPassword(password)
}

func hashPassword(password string) (string, error) {
	salt := make([]byte, argonSaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := argon2.IDKey([]byte(password), salt, argonIterations, argonMemory, argonParallelism, argonKeyLength)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
		argonMemory, argonIterations, argonParallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key)), nil
}

// VerifyPassword tetap menerima bcrypt lama. Setelah login berhasil, caller
// dapat memakai needsRehash untuk memindahkan hash ke Argon2id tanpa reset.
func VerifyPassword(encoded, password string) (matched bool, needsRehash bool, err error) {
	switch {
	case strings.HasPrefix(encoded, "$argon2id$"):
		memory, iterations, parallelism, salt, expected, parseErr := parseArgon2id(encoded)
		if parseErr != nil {
			return false, false, parseErr
		}
		actual := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(len(expected)))
		matched = subtle.ConstantTimeCompare(actual, expected) == 1
		needsRehash = memory != argonMemory || iterations != argonIterations || parallelism != argonParallelism || len(expected) != argonKeyLength
		return matched, needsRehash, nil
	case strings.HasPrefix(encoded, "$2a$") || strings.HasPrefix(encoded, "$2b$") || strings.HasPrefix(encoded, "$2y$"):
		err := bcrypt.CompareHashAndPassword([]byte(encoded), []byte(password))
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return false, false, nil
		}
		return err == nil, err == nil, err
	default:
		return false, false, errors.New("unsupported password hash")
	}
}

func parseArgon2id(encoded string) (uint32, uint32, uint8, []byte, []byte, error) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" || parts[2] != "v=19" {
		return 0, 0, 0, nil, nil, errors.New("invalid argon2id hash")
	}
	var memory, iterations uint32
	var parallelism uint8
	params := strings.Split(parts[3], ",")
	if len(params) != 3 {
		return 0, 0, 0, nil, nil, errors.New("invalid argon2id parameters")
	}
	for _, param := range params {
		pair := strings.SplitN(param, "=", 2)
		if len(pair) != 2 {
			return 0, 0, 0, nil, nil, errors.New("invalid argon2id parameters")
		}
		value, err := strconv.ParseUint(pair[1], 10, 32)
		if err != nil {
			return 0, 0, 0, nil, nil, errors.New("invalid argon2id parameters")
		}
		switch pair[0] {
		case "m":
			memory = uint32(value)
		case "t":
			iterations = uint32(value)
		case "p":
			if value > 255 {
				return 0, 0, 0, nil, nil, errors.New("invalid argon2id parameters")
			}
			parallelism = uint8(value)
		}
	}
	if memory == 0 || iterations == 0 || parallelism == 0 {
		return 0, 0, 0, nil, nil, errors.New("invalid argon2id parameters")
	}
	salt, err := base64.RawStdEncoding.Strict().DecodeString(parts[4])
	if err != nil || len(salt) < 8 {
		return 0, 0, 0, nil, nil, errors.New("invalid argon2id salt")
	}
	key, err := base64.RawStdEncoding.Strict().DecodeString(parts[5])
	if err != nil || len(key) < 16 {
		return 0, 0, 0, nil, nil, errors.New("invalid argon2id key")
	}
	return memory, iterations, parallelism, salt, key, nil
}

func IssueSession(ctx context.Context, db *gorm.DB, userID uint) (string, error) {
	raw := make([]byte, sessionRandomBytes)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	token := sessionPrefix + base64.RawURLEncoding.EncodeToString(raw)
	now := time.Now().UTC()
	session := models.AuthSession{
		UserID: userID, TokenHash: TokenHash(token),
		ExpiresAt: now.Add(SessionAbsoluteTTL), IdleExpiresAt: now.Add(SessionIdleTTL),
		LastSeenAt: now, CreatedAt: now,
	}
	if err := db.WithContext(ctx).Create(&session).Error; err != nil {
		return "", err
	}
	return token, nil
}

func TokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func ValidTokenFormat(token string) bool {
	if !strings.HasPrefix(token, sessionPrefix) {
		return false
	}
	raw, err := base64.RawURLEncoding.Strict().DecodeString(strings.TrimPrefix(token, sessionPrefix))
	return err == nil && len(raw) == sessionRandomBytes
}

func Authenticate(ctx context.Context, db *gorm.DB, token string) (*Principal, error) {
	if !ValidTokenFormat(token) {
		return nil, ErrInvalidSession
	}
	now := time.Now().UTC()
	var session models.AuthSession
	if err := db.WithContext(ctx).
		Where("token_hash = ? AND revoked_at IS NULL AND expires_at > ? AND idle_expires_at > ?", TokenHash(token), now, now).
		First(&session).Error; err != nil {
		return nil, ErrInvalidSession
	}

	var user models.User
	if err := db.WithContext(ctx).First(&user, session.UserID).Error; err != nil {
		return nil, ErrInvalidSession
	}
	var provider models.Provider
	if err := db.WithContext(ctx).First(&provider, user.ProviderID).Error; err != nil {
		return nil, ErrInvalidSession
	}
	if !accountMayAuthenticate(&provider) {
		return nil, ErrInactiveAccount
	}

	if now.Sub(session.LastSeenAt) >= sessionTouchWindow {
		idleExpiry := now.Add(SessionIdleTTL)
		if idleExpiry.After(session.ExpiresAt) {
			idleExpiry = session.ExpiresAt
		}
		_ = db.WithContext(ctx).Model(&models.AuthSession{}).
			Where("id = ? AND revoked_at IS NULL", session.ID).
			Updates(map[string]interface{}{"last_seen_at": now, "idle_expires_at": idleExpiry}).Error
		session.LastSeenAt = now
		session.IdleExpiresAt = idleExpiry
	}

	return &Principal{User: user, Provider: provider, Session: session}, nil
}

func accountMayAuthenticate(provider *models.Provider) bool {
	if provider == nil {
		return false
	}
	if provider.Role == "PROVIDER" {
		return provider.Status == "PENDING" || provider.Status == "APPROVED"
	}
	return provider.Status == "APPROVED"
}

func RevokeSession(ctx context.Context, db *gorm.DB, token string) error {
	if !ValidTokenFormat(token) {
		return nil
	}
	now := time.Now().UTC()
	return db.WithContext(ctx).Model(&models.AuthSession{}).
		Where("token_hash = ? AND revoked_at IS NULL", TokenHash(token)).
		Update("revoked_at", &now).Error
}

func RevokeAllUserSessions(ctx context.Context, tx *gorm.DB, userID uint) error {
	now := time.Now().UTC()
	return tx.WithContext(ctx).Model(&models.AuthSession{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", &now).Error
}

func RevokeAllProviderSessions(ctx context.Context, db *gorm.DB, providerID uint) error {
	var user models.User
	if err := db.WithContext(ctx).Where("provider_id = ?", providerID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	return RevokeAllUserSessions(ctx, db, user.ID)
}
