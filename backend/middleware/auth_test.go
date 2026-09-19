package middleware

import (
	"encoding/base64"
	"strings"
	"testing"
)

func validOpaqueToken() string {
	return "tks_" + base64.RawURLEncoding.EncodeToString([]byte(strings.Repeat("x", 32)))
}

func TestBearerToken(t *testing.T) {
	valid := validOpaqueToken()
	cases := []struct {
		name   string
		header string
		ok     bool
	}{
		{"valid", "Bearer " + valid, true},
		{"case insensitive scheme", "bearer " + valid, true},
		{"extra whitespace", "  Bearer   " + valid + "  ", true},
		{"missing", "", false},
		{"jwt lama", "Bearer a.b.c", false},
		{"malformed", "Bearer not-a-token", false},
		{"extra field", "Bearer " + valid + " other", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := bearerToken(tc.header)
			if ok != tc.ok {
				t.Fatalf("ok=%v, want %v", ok, tc.ok)
			}
			if ok && got != valid {
				t.Fatalf("token=%q, want %q", got, valid)
			}
		})
	}
}
