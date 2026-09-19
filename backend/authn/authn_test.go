package authn

import (
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("Password-Uji-Yang-Kuat-123")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if !strings.HasPrefix(hash, "$argon2id$") {
		t.Fatalf("hash bukan Argon2id: %q", hash)
	}
	matched, rehash, err := VerifyPassword(hash, "Password-Uji-Yang-Kuat-123")
	if err != nil || !matched || rehash {
		t.Fatalf("hasil verifikasi matched=%v rehash=%v err=%v", matched, rehash, err)
	}
	matched, _, err = VerifyPassword(hash, "Password-Yang-Salah-123")
	if err != nil || matched {
		t.Fatalf("password salah diterima: matched=%v err=%v", matched, err)
	}
}

func TestVerifyLegacyBcryptRequestsRehash(t *testing.T) {
	legacy, err := bcrypt.GenerateFromPassword([]byte("lama1234"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	matched, rehash, err := VerifyPassword(string(legacy), "lama1234")
	if err != nil || !matched || !rehash {
		t.Fatalf("legacy hash matched=%v rehash=%v err=%v", matched, rehash, err)
	}
	upgraded, err := HashPasswordForMigration("lama1234")
	if err != nil {
		t.Fatalf("password legacy gagal dimigrasikan: %v", err)
	}
	matched, rehash, err = VerifyPassword(upgraded, "lama1234")
	if err != nil || !matched || rehash {
		t.Fatalf("hasil migrasi matched=%v rehash=%v err=%v", matched, rehash, err)
	}
}

func TestHashPasswordLengthPolicy(t *testing.T) {
	for _, password := range []string{"terlalu-pdk", strings.Repeat("x", 129)} {
		if _, err := HashPassword(password); err == nil {
			t.Fatalf("password dengan panjang %d seharusnya ditolak", len(password))
		}
	}
}

func TestTokenFormatAndHash(t *testing.T) {
	valid := "tks_YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE"
	if !ValidTokenFormat(valid) {
		t.Fatal("token 32 byte valid ditolak")
	}
	if ValidTokenFormat("a.b.c") || ValidTokenFormat("tks_short") {
		t.Fatal("token invalid diterima")
	}
	if TokenHash(valid) == valid || len(TokenHash(valid)) != 64 {
		t.Fatal("token hash tidak sesuai")
	}
}
