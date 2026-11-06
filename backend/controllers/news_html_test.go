package controllers

import (
	"strings"
	"testing"
	"time"

	"tripkita-provider/models"
)

func TestSanitizeNewsHTML(t *testing.T) {
	cases := []struct{ name, in, want string }{
		{"keeps allowed formatting", `<p>Halo <b>dunia</b> <i>indah</i></p>`, `<p>Halo <strong>dunia</strong> <em>indah</em></p>`},
		{"drops script with content", `<p>a</p><script>alert(1)</script>`, `<p>a</p>`},
		{"strips event and style attributes", `<p onclick="x()" style="color:red" class="c">a</p>`, `<p>a</p>`},
		{"unwraps unknown tags", `<p><span style="font-size:20px">teks</span></p>`, `<p>teks</p>`},
		{"normalizes headings", `<h1>A</h1><h4>B</h4>`, `<h2>A</h2><h3>B</h3>`},
		{"unwraps javascript link", `<a href="javascript:alert(1)">klik</a>`, `klik`},
		{"unwraps obfuscated javascript link", `<a href="jav&#x09;ascript:alert(1)">klik</a>`, `klik`},
		{"external link opens safely", `<a href="https://tementrip.id">x</a>`, `<a href="https://tementrip.id" target="_blank" rel="noopener noreferrer nofollow">x</a>`},
		{"in-app anchor stays in tab", `<a href="#/cari-trip">x</a>`, `<a href="#/cari-trip">x</a>`},
		{"drops data image", `<img src="data:image/png;base64,AAA" onerror="x()">`, ``},
		{"keeps uploaded image", `<img src="/uploads/pkg_0123456789abcdef0123456789abcdef.jpg" alt="Pantai">`, `<img src="/uploads/pkg_0123456789abcdef0123456789abcdef.jpg" alt="Pantai" loading="lazy">`},
		{"rejects private document path", `<img src="/uploads/doc_0123456789abcdef0123456789abcdef.jpg">`, ``},
		{"escapes text", `<p>&lt;script&gt;</p>`, `<p>&lt;script&gt;</p>`},
		{"drops iframe", `<iframe src="https://evil.test"></iframe><p>a</p>`, `<p>a</p>`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, _, err := sanitizeNewsHTML(tc.in)
			if err != nil {
				t.Fatal(err)
			}
			if got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestApplyNewsRequest(t *testing.T) {
	now := time.Date(2026, 11, 6, 9, 0, 0, 0, time.UTC)
	news := &models.News{}
	long := strings.Repeat("kata ", 60)
	err := applyNewsRequest(news, &models.SaveNewsRequest{Title: "  Judul   baru ", Content: "<p>" + long + "</p>", Status: models.NewsStatusPublished}, now)
	if err != nil {
		t.Fatal(err)
	}
	if news.Title != "Judul baru" || news.PublishedAt == nil || !news.PublishedAt.Equal(now) {
		t.Fatalf("unexpected news: %+v", news)
	}
	if !strings.HasSuffix(news.Excerpt, "…") || len([]rune(news.Excerpt)) > newsExcerptLength+1 {
		t.Fatalf("excerpt not truncated: %q", news.Excerpt)
	}

	// Menarik ke draf lalu menerbitkan ulang tidak mengubah tanggal terbit pertama.
	later := now.Add(48 * time.Hour)
	_ = applyNewsRequest(news, &models.SaveNewsRequest{Title: "x", Content: "<p>a</p>", Status: models.NewsStatusDraft}, later)
	_ = applyNewsRequest(news, &models.SaveNewsRequest{Title: "x", Content: "<p>a</p>", Status: models.NewsStatusPublished}, later)
	if !news.PublishedAt.Equal(now) {
		t.Fatalf("publishedAt changed to %v", news.PublishedAt)
	}

	if err := applyNewsRequest(&models.News{}, &models.SaveNewsRequest{Title: "x", Content: "<p> </p>", Status: models.NewsStatusPublished}, now); err == nil {
		t.Fatal("expected empty content to be rejected when publishing")
	}
	if err := applyNewsRequest(&models.News{}, &models.SaveNewsRequest{Title: "x", Content: "", Status: models.NewsStatusDraft}, now); err != nil {
		t.Fatalf("empty draft should be allowed: %v", err)
	}
	if err := applyNewsRequest(&models.News{}, &models.SaveNewsRequest{Title: "x", CoverImage: "javascript:alert(1)", Status: models.NewsStatusDraft}, now); err == nil {
		t.Fatal("expected invalid cover to be rejected")
	}

	// Sumber foto sampul wajib saat terbit; draf boleh belum lengkap.
	cover := "/uploads/pkg_0123456789abcdef0123456789abcdef.jpg"
	if err := applyNewsRequest(&models.News{}, &models.SaveNewsRequest{Title: "x", Content: "<p>a</p>", CoverImage: cover, Status: models.NewsStatusPublished}, now); err == nil {
		t.Fatal("expected missing cover source to block publishing")
	}
	draft := &models.News{}
	if err := applyNewsRequest(draft, &models.SaveNewsRequest{Title: "x", CoverImage: cover, CoverCaption: "  Pantai   Pink ", Status: models.NewsStatusDraft}, now); err != nil {
		t.Fatalf("draft without source should be allowed: %v", err)
	}
	if draft.CoverCaption != "Pantai Pink" {
		t.Fatalf("caption not normalized: %q", draft.CoverCaption)
	}
	// Tanpa foto sampul, keterangan dan sumber ikut dikosongkan.
	_ = applyNewsRequest(draft, &models.SaveNewsRequest{Title: "x", CoverCaption: "a", CoverSource: "b", Status: models.NewsStatusDraft}, now)
	if draft.CoverCaption != "" || draft.CoverSource != "" {
		t.Fatalf("caption/source should be cleared without cover: %+v", draft)
	}
}
