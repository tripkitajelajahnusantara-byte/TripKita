package models

import "time"

const (
	NewsStatusDraft     = "DRAFT"
	NewsStatusPublished = "PUBLISHED"
)

// News adalah artikel berita yang ditulis admin. Content berisi HTML yang
// sudah disaring di server sehingga aman ditampilkan apa adanya ke customer.
// Excerpt selalu dibuat otomatis dari isi agar ringkasan tidak basi saat isi
// diubah. CoverCaption dan CoverSource memenuhi standar jurnalistik: foto
// sampul tampil dengan keterangan dan sumber foto.
type News struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	Title        string     `gorm:"size:200;not null" json:"title"`
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
	CoverImage   string `json:"coverImage" binding:"max=500"`
	CoverCaption string `json:"coverCaption" binding:"max=300"`
	CoverSource  string `json:"coverSource" binding:"max=150"`
	Content      string `json:"content" binding:"max=200000"`
	Status       string `json:"status" binding:"required,oneof=DRAFT PUBLISHED"`
}
