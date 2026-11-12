package models

import "time"

const (
	NewsStatusDraft     = "DRAFT"
	NewsStatusPublished = "PUBLISHED"
)

// Kategori disimpan sebagai slug agar dapat langsung dipakai sebagai filter
// di URL halaman Berita. Daftar ini juga dipakai validasi binding di bawah.
var NewsCategories = []string{"destinasi", "kuliner", "wisata-budaya", "tips-travel", "mistis", "lainnya"}

func IsNewsCategory(value string) bool {
	for _, category := range NewsCategories {
		if category == value {
			return true
		}
	}
	return false
}

// News adalah artikel berita yang ditulis admin. Content berisi HTML yang
// sudah disaring di server sehingga aman ditampilkan apa adanya ke customer.
// Excerpt selalu dibuat otomatis dari isi agar ringkasan tidak basi saat isi
// diubah. CoverCaption dan CoverSource memenuhi standar jurnalistik: foto
// sampul tampil dengan keterangan dan sumber foto.
type News struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	Title        string     `gorm:"size:200;not null" json:"title"`
	Category     string     `gorm:"size:30;not null;default:'lainnya';index" json:"category"`
	Excerpt      string     `gorm:"size:400;not null;default:''" json:"excerpt"`
	CoverImage   string     `gorm:"size:500;not null;default:''" json:"coverImage"`
	CoverCaption string     `gorm:"size:300;not null;default:''" json:"coverCaption"`
	CoverSource  string     `gorm:"size:150;not null;default:''" json:"coverSource"`
	Content      string     `gorm:"type:text;not null;default:''" json:"content,omitempty"`
	Status       string     `gorm:"size:20;not null;default:'DRAFT';index:idx_news_status_published,priority:1" json:"status"`
	PublishedAt  *time.Time `gorm:"index:idx_news_status_published,priority:2" json:"publishedAt"`
	AuthorID     uint       `gorm:"not null" json:"-"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

func (News) TableName() string { return "news" }

type SaveNewsRequest struct {
	Title        string `json:"title" binding:"required,max=200"`
	Category     string `json:"category" binding:"required,oneof=destinasi kuliner wisata-budaya tips-travel mistis lainnya"`
	CoverImage   string `json:"coverImage" binding:"max=500"`
	CoverCaption string `json:"coverCaption" binding:"max=300"`
	CoverSource  string `json:"coverSource" binding:"max=150"`
	Content      string `json:"content" binding:"max=200000"`
	Status       string `json:"status" binding:"required,oneof=DRAFT PUBLISHED"`
}

// Slot susunan artikel pilihan admin di halaman Berita customer.
const (
	NewsSlotFeatured   = "featured"
	NewsSlotEditorPick = "editor_pick"
	NewsSlotSize       = 5
)

// NewsPlacement menyimpan urutan Berita Utama (posisi 1 = berita utama,
// 2-5 = pendukung) dan Pilihan Redaksi. Artikel yang dihapus ikut keluar dari
// susunan lewat ON DELETE CASCADE; artikel yang ditarik ke draf disaring saat dibaca.
type NewsPlacement struct {
	Slot     string `gorm:"size:20;primaryKey"`
	Position int    `gorm:"primaryKey;autoIncrement:false"`
	NewsID   uint   `gorm:"not null;index"`
	News     News   `gorm:"constraint:OnDelete:CASCADE"`
}

type SaveNewsPlacementsRequest struct {
	Featured    []uint `json:"featured"`
	EditorPicks []uint `json:"editorPicks"`
}

// NewsComment adalah komentar pembaca pada artikel. DisplayName adalah nama
// yang dipilih saat menulis (nama profil atau nama samaran) sehingga identitas
// asli tidak pernah dikirim ke pengunjung lain. Balasan hanya satu tingkat:
// ParentID selalu menunjuk komentar utama.
type NewsComment struct {
	ID          uint         `gorm:"primaryKey"`
	NewsID      uint         `gorm:"not null;index"`
	News        News         `gorm:"constraint:OnDelete:CASCADE"`
	ParentID    *uint        `gorm:"index"`
	Parent      *NewsComment `gorm:"constraint:OnDelete:CASCADE"`
	AuthorID    uint         `gorm:"not null;index"`
	Author      Provider     `gorm:"foreignKey:AuthorID;constraint:OnDelete:CASCADE"`
	Anonymous   bool         `gorm:"not null;default:false"`
	DisplayName string       `gorm:"size:60;not null"`
	Body        string       `gorm:"type:text;not null"`
	Hidden      bool         `gorm:"not null;default:false;index"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type SaveNewsCommentRequest struct {
	Body      string `json:"body" binding:"required,max=8000"`
	Anonymous bool   `json:"anonymous"`
	Alias     string `json:"alias" binding:"max=200"`
	ParentID  *uint  `json:"parentId"`
}

// NewsCommentView adalah bentuk komentar untuk pengunjung: tanpa id penulis
// agar komentar bernama samaran tidak dapat dikaitkan ke akun mana pun.
type NewsCommentView struct {
	ID          uint      `json:"id"`
	ParentID    *uint     `json:"parentId"`
	DisplayName string    `json:"displayName"`
	Anonymous   bool      `json:"anonymous"`
	Body        string    `json:"body"`
	Mine        bool      `json:"mine"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// AdminNewsComment adalah baris moderasi; admin melihat nama akun asli.
type AdminNewsComment struct {
	ID          uint      `json:"id"`
	NewsID      uint      `json:"newsId"`
	NewsTitle   string    `json:"newsTitle"`
	ParentID    *uint     `json:"parentId"`
	DisplayName string    `json:"displayName"`
	Anonymous   bool      `json:"anonymous"`
	AuthorName  string    `json:"authorName"`
	AuthorEmail string    `json:"authorEmail"`
	Body        string    `json:"body"`
	Hidden      bool      `json:"hidden"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
