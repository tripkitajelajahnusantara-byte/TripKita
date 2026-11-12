package controllers

import (
	"strings"
	"testing"

	"tripkita-provider/models"
)

func TestValidatePlacement(t *testing.T) {
	if err := validatePlacement([]uint{1, 2, 3, 4, 5}, "Berita Utama"); err != nil {
		t.Fatalf("five distinct articles should pass: %v", err)
	}
	if err := validatePlacement(nil, "Berita Utama"); err != nil {
		t.Fatalf("empty placement should pass: %v", err)
	}
	for name, ids := range map[string][]uint{
		"more than five": {1, 2, 3, 4, 5, 6},
		"duplicate":      {1, 2, 1},
		"zero id":        {0},
	} {
		if err := validatePlacement(ids, "Berita Utama"); err == nil {
			t.Fatalf("%s should be rejected", name)
		}
	}
	rows := placementRows(models.NewsSlotEditorPick, []uint{9, 4})
	if len(rows) != 2 || rows[0].Position != 1 || rows[0].NewsID != 9 || rows[1].Position != 2 || rows[1].Slot != models.NewsSlotEditorPick {
		t.Fatalf("unexpected rows: %+v", rows)
	}
}

func TestNormalizeComment(t *testing.T) {
	body, name, err := normalizeComment(&models.SaveNewsCommentRequest{Body: "  Seru banget!  "}, "  Budi   Santoso ")
	if err != nil || body != "Seru banget!" || name != "Budi Santoso" {
		t.Fatalf("real name: %q %q %v", body, name, err)
	}
	_, name, err = normalizeComment(&models.SaveNewsCommentRequest{Body: "a", Anonymous: true, Alias: "  Pendaki   Malam "}, "Budi Santoso")
	if err != nil || name != "Pendaki Malam" {
		t.Fatalf("alias: %q %v", name, err)
	}
	for label, req := range map[string]models.SaveNewsCommentRequest{
		"empty body":        {Body: "   "},
		"body too long":     {Body: strings.Repeat("é", newsCommentMaxRunes+1)},
		"alias too short":   {Body: "a", Anonymous: true, Alias: "x"},
		"alias too long":    {Body: "a", Anonymous: true, Alias: strings.Repeat("a", newsAliasMaxRunes+1)},
		"alias equals real": {Body: "a", Anonymous: true, Alias: "budi santoso"},
		"alias only spaces": {Body: "a", Anonymous: true, Alias: "    "},
	} {
		if _, _, err := normalizeComment(&req, "Budi Santoso"); err == nil {
			t.Fatalf("%s should be rejected", label)
		}
	}
}

func TestVisibleCommentViewsHidesOrphanRepliesAndAuthor(t *testing.T) {
	root := uint(1)
	hiddenRoot := uint(7)
	rows := []models.NewsComment{
		{ID: 1, AuthorID: 10, DisplayName: "A", Body: "x"},
		{ID: 2, ParentID: &root, AuthorID: 11, DisplayName: "B", Body: "y"},
		// Komentar utama #7 disembunyikan admin sehingga tidak ada di hasil query.
		{ID: 8, ParentID: &hiddenRoot, AuthorID: 11, DisplayName: "B", Body: "z"},
	}
	views := visibleCommentViews(rows, 11)
	if len(views) != 2 || views[0].ID != 1 || views[1].ID != 2 {
		t.Fatalf("unexpected views: %+v", views)
	}
	if views[0].Mine || !views[1].Mine {
		t.Fatalf("mine flag wrong: %+v", views)
	}
	if visibleCommentViews(rows, 0)[1].Mine {
		t.Fatal("guest must never own a comment")
	}
}
