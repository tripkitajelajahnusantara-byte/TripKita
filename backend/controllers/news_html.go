package controllers

import (
	"net/url"
	"regexp"
	"strings"

	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"

	"tripkita-provider/models"
)

// Tag yang boleh tersimpan di artikel. Nilai map adalah tag keluaran sehingga
// varian dari editor atau tempelan Google Docs/Word (b, i, div, h4) diseragamkan
// dan tampilan customer selalu sama dengan editor.
var newsAllowedTags = map[string]string{
	"p": "p", "div": "p", "br": "br", "hr": "hr",
	"h1": "h2", "h2": "h2", "h3": "h3", "h4": "h3", "h5": "h3", "h6": "h3",
	"strong": "strong", "b": "strong", "em": "em", "i": "em", "u": "u",
	"s": "s", "strike": "s", "del": "s",
	"blockquote": "blockquote", "ul": "ul", "ol": "ol", "li": "li",
	"a": "a", "img": "img", "figure": "figure", "figcaption": "figcaption",
}

// Tag yang dibuang beserta seluruh isinya. Tag lain di luar daftar izin hanya
// dilepas pembungkusnya agar teksnya tetap ada.
var newsDroppedTags = map[string]bool{
	"script": true, "style": true, "iframe": true, "object": true, "embed": true,
	"noscript": true, "template": true, "svg": true, "math": true, "form": true,
	"textarea": true, "select": true, "button": true, "head": true, "title": true,
}

var newsVoidTags = map[string]bool{"br": true, "hr": true, "img": true}

var newsBlockTags = map[string]bool{
	"p": true, "h2": true, "h3": true, "blockquote": true, "li": true, "figcaption": true, "br": true,
}

// sanitizeNewsHTML menyaring HTML dari editor admin menjadi subset aman
// (tanpa atribut style/class/event, tanpa URL javascript:) dan sekaligus
// mengembalikan teks polosnya untuk ringkasan.
func sanitizeNewsHTML(input string) (clean, text string, err error) {
	nodes, err := html.ParseFragment(strings.NewReader(input), &html.Node{Type: html.ElementNode, Data: "body", DataAtom: atom.Body})
	if err != nil {
		return "", "", err
	}
	var out, plain strings.Builder
	for _, n := range nodes {
		writeNewsNode(&out, &plain, n)
	}
	return strings.TrimSpace(out.String()), strings.Join(strings.Fields(plain.String()), " "), nil
}

func writeNewsNode(out, plain *strings.Builder, n *html.Node) {
	switch n.Type {
	case html.TextNode:
		out.WriteString(html.EscapeString(n.Data))
		plain.WriteString(n.Data)
		return
	case html.ElementNode:
	default:
		return
	}
	if newsDroppedTags[n.Data] {
		return
	}
	writeChildren := func() {
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			writeNewsNode(out, plain, child)
		}
	}
	tag, allowed := newsAllowedTags[n.Data]
	if !allowed {
		writeChildren()
		return
	}
	attrs, keep := newsAttributes(tag, n.Attr)
	if !keep {
		// Tautan tanpa URL aman tetap menyisakan teksnya; gambar dibuang.
		if !newsVoidTags[tag] {
			writeChildren()
		}
		return
	}
	out.WriteString("<" + tag + attrs + ">")
	if !newsVoidTags[tag] {
		writeChildren()
		out.WriteString("</" + tag + ">")
	}
	if newsBlockTags[tag] {
		plain.WriteString(" ")
	}
}

func newsAttributes(tag string, attrs []html.Attribute) (string, bool) {
	get := func(name string) string {
		for _, a := range attrs {
			if a.Namespace == "" && a.Key == name {
				return a.Val
			}
		}
		return ""
	}
	switch tag {
	case "a":
		href, ok := safeNewsURL(get("href"), false)
		if !ok {
			return "", false
		}
		result := ` href="` + html.EscapeString(href) + `"`
		if !strings.HasPrefix(href, "#") {
			result += ` target="_blank" rel="noopener noreferrer nofollow"`
		}
		return result, true
	case "img":
		src, ok := safeNewsURL(get("src"), true)
		if !ok {
			return "", false
		}
		return ` src="` + html.EscapeString(src) + `" alt="` + html.EscapeString(strings.TrimSpace(get("alt"))) + `" loading="lazy"`, true
	}
	return "", true
}

// safeNewsURL hanya menerima http(s), mailto (tautan), anchor halaman
// ("#/cari-trip"), dan foto unggahan publik "/uploads/pkg_...". Skema lain,
// termasuk javascript: dan data:, ditolak.
var newsCoverAsset = regexp.MustCompile(`^/news-covers/[a-z0-9-]+\.webp$`)

func safeNewsURL(raw string, image bool) (string, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" || strings.ContainsAny(raw, "\\\x00") {
		return "", false
	}
	if image && strings.HasPrefix(raw, "/uploads/") {
		return raw, models.IsPackagePhotoName(strings.TrimPrefix(raw, "/uploads/"))
	}
	// Foto bawaan seed berita (database/seed_news.sql) disajikan web app dari
	// provider-web/public/news-covers, bukan dari direktori unggahan backend.
	if image && strings.HasPrefix(raw, "/news-covers/") {
		return raw, newsCoverAsset.MatchString(raw)
	}
	if !image && strings.HasPrefix(raw, "#") {
		return raw, true
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", false
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		return raw, parsed.Host != ""
	case "mailto":
		return raw, !image
	}
	return "", false
}

// newsExcerpt memotong teks polos di batas kata terdekat.
func newsExcerpt(text string, limit int) string {
	runes := []rune(text)
	if len(runes) <= limit {
		return text
	}
	cut := string(runes[:limit])
	if i := strings.LastIndex(cut, " "); i > limit/2 {
		cut = cut[:i]
	}
	return strings.TrimRight(cut, " ,.;:") + "…"
}
