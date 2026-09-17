package models

import (
	"reflect"
	"strings"
	"testing"
)

// Daftar metode yang sah ditulis di dua tempat: konstanta Go dan tag validasi
// `oneof` pada CompleteRefundRequest. Menambah metode baru tanpa memperbarui tag
// akan membuat metode itu selalu ditolak di API, dan sebaliknya tag yang lebih
// longgar akan meloloskan nilai yang tidak dikenali ke basis data.
func TestRefundMethodsMatchValidationTag(t *testing.T) {
	field, ok := reflect.TypeOf(CompleteRefundRequest{}).FieldByName("Method")
	if !ok {
		t.Fatal("field Method tidak ditemukan pada CompleteRefundRequest")
	}

	binding := field.Tag.Get("binding")
	var allowed []string
	for _, rule := range strings.Split(binding, ",") {
		if value, found := strings.CutPrefix(rule, "oneof="); found {
			allowed = strings.Fields(value)
		}
	}
	if len(allowed) == 0 {
		t.Fatal("tag binding Method wajib memuat daftar oneof")
	}

	if len(allowed) != len(RefundMethods) {
		t.Fatalf("jumlah metode berbeda: tag=%v konstanta=%v", allowed, RefundMethods)
	}
	valid := make(map[string]struct{}, len(RefundMethods))
	for _, method := range RefundMethods {
		valid[method] = struct{}{}
	}
	for _, method := range allowed {
		if _, ok := valid[method]; !ok {
			t.Errorf("metode %q ada di tag validasi tetapi tidak terdaftar sebagai konstanta", method)
		}
	}
}

// Nominal dan referensi wajib diisi; tanpa keduanya catatan refund kehilangan
// nilai auditnya.
func TestCompleteRefundRequestRequiresEvidence(t *testing.T) {
	requestType := reflect.TypeOf(CompleteRefundRequest{})
	for _, name := range []string{"Amount", "Method", "Reference"} {
		field, ok := requestType.FieldByName(name)
		if !ok {
			t.Fatalf("field %s tidak ditemukan", name)
		}
		if !strings.Contains(field.Tag.Get("binding"), "required") {
			t.Errorf("field %s wajib ditandai required", name)
		}
	}
}
