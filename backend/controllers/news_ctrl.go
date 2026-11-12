package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tripkita-provider/models"
)

const (
	newsPageSize      = 12
	newsExcerptLength = 180
)

// Kolom daftar sengaja tanpa content agar respons daftar tetap ringan.
var newsListColumns = []string{"id", "title", "category", "excerpt", "cover_image", "status", "published_at", "created_at", "updated_at"}

// NewsController melayani berita: admin menulis, customer hanya membaca yang
// berstatus PUBLISHED.
type NewsController struct{ db *gorm.DB }

func NewNewsController(db *gorm.DB) *NewsController {
	return &NewsController{db: db}
}

func newsIDParam(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cerita tidak ditemukan"})
		return 0, false
	}
	return uint(id), true
}

func (ctrl *NewsController) published() *gorm.DB {
	return ctrl.db.Model(&models.News{}).Where("status = ?", models.NewsStatusPublished)
}

func (ctrl *NewsController) PublicList(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	category := c.Query("category")
	if category != "" && !models.IsNewsCategory(category) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kategori berita tidak dikenal"})
		return
	}
	scope := func() *gorm.DB {
		if category == "" {
			return ctrl.published()
		}
		return ctrl.published().Where("category = ?", category)
	}
	var total int64
	if err := scope().Count(&total).Error; err != nil {
		respondInternalError(c, "menghitung berita", err)
		return
	}
	items := []models.News{}
	if err := scope().Select(newsListColumns).Order("published_at DESC, id DESC").
		Limit(newsPageSize).Offset((page - 1) * newsPageSize).Find(&items).Error; err != nil {
		respondInternalError(c, "memuat berita", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "pageSize": newsPageSize})
}

func (ctrl *NewsController) PublicGet(c *gin.Context) {
	id, ok := newsIDParam(c)
	if !ok {
		return
	}
	var news models.News
	if err := ctrl.published().Where("id = ?", id).First(&news).Error; err != nil {
		ctrl.respondFindError(c, err)
		return
	}
	c.JSON(http.StatusOK, news)
}

// Highlights mengembalikan Berita Utama dan Pilihan Redaksi sesuai urutan
// admin. Hanya artikel PUBLISHED yang ikut, jadi artikel yang ditarik ke draf
// langsung hilang dari halaman customer. Admin memakai endpoint yang sama.
func (ctrl *NewsController) Highlights(c *gin.Context) {
	featured, err := ctrl.placed(models.NewsSlotFeatured)
	if err != nil {
		respondInternalError(c, "memuat berita utama", err)
		return
	}
	picks, err := ctrl.placed(models.NewsSlotEditorPick)
	if err != nil {
		respondInternalError(c, "memuat pilihan redaksi", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"featured": featured, "editorPicks": picks})
}

func (ctrl *NewsController) placed(slot string) ([]models.News, error) {
	items := []models.News{}
	err := ctrl.published().Select("news."+strings.Join(newsListColumns, ", news.")).
		Joins("JOIN news_placements ON news_placements.news_id = news.id AND news_placements.slot = ?", slot).
		Order("news_placements.position").Find(&items).Error
	return items, err
}

// SavePlacements mengganti seluruh susunan Berita Utama dan Pilihan Redaksi
// dalam satu transaksi agar halaman customer tidak pernah melihat susunan setengah jadi.
func (ctrl *NewsController) SavePlacements(c *gin.Context) {
	var req models.SaveNewsPlacementsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Susunan berita tidak valid"})
		return
	}
	if err := validatePlacement(req.Featured, "Berita Utama"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validatePlacement(req.EditorPicks, "Pilihan Redaksi"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ids := append(append([]uint{}, req.Featured...), req.EditorPicks...)
	if len(ids) > 0 {
		var published int64
		if err := ctrl.published().Where("id IN ?", ids).Count(&published).Error; err != nil {
			respondInternalError(c, "memeriksa berita pilihan", err)
			return
		}
		if int(published) != countDistinct(ids) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ada artikel yang belum terbit atau sudah dihapus. Muat ulang halaman lalu pilih lagi."})
			return
		}
	}
	rows := placementRows(models.NewsSlotFeatured, req.Featured)
	rows = append(rows, placementRows(models.NewsSlotEditorPick, req.EditorPicks)...)
	err := ctrl.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("1 = 1").Delete(&models.NewsPlacement{}).Error; err != nil {
			return err
		}
		if len(rows) == 0 {
			return nil
		}
		return tx.Omit("News").Create(&rows).Error
	})
	if err != nil {
		respondInternalError(c, "menyimpan susunan berita", err)
		return
	}
	ctrl.Highlights(c)
}

func validatePlacement(ids []uint, label string) error {
	if len(ids) > models.NewsSlotSize {
		return fmt.Errorf("%s maksimal %d artikel", label, models.NewsSlotSize)
	}
	for _, id := range ids {
		if id == 0 {
			return fmt.Errorf("%s berisi artikel yang tidak valid", label)
		}
	}
	if countDistinct(ids) != len(ids) {
		return fmt.Errorf("Artikel yang sama dipilih dua kali di %s", label)
	}
	return nil
}

func countDistinct(ids []uint) int {
	seen := map[uint]bool{}
	for _, id := range ids {
		seen[id] = true
	}
	return len(seen)
}

func placementRows(slot string, ids []uint) []models.NewsPlacement {
	rows := make([]models.NewsPlacement, 0, len(ids))
	for index, id := range ids {
		rows = append(rows, models.NewsPlacement{Slot: slot, Position: index + 1, NewsID: id})
	}
	return rows
}

// shortcut: daftar admin tanpa paginasi; tambahkan bila berita sudah ratusan.
func (ctrl *NewsController) AdminList(c *gin.Context) {
	items := []models.News{}
	if err := ctrl.db.Select(newsListColumns).Order("updated_at DESC").Find(&items).Error; err != nil {
		respondInternalError(c, "memuat berita admin", err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (ctrl *NewsController) AdminGet(c *gin.Context) {
	id, ok := newsIDParam(c)
	if !ok {
		return
	}
	var news models.News
	if err := ctrl.db.First(&news, id).Error; err != nil {
		ctrl.respondFindError(c, err)
		return
	}
	c.JSON(http.StatusOK, news)
}

func (ctrl *NewsController) Create(c *gin.Context) {
	authorID, _ := c.Get("provider_id")
	id, _ := authorID.(uint)
	news := models.News{AuthorID: id}
	if !ctrl.bindAndApply(c, &news) {
		return
	}
	if err := ctrl.db.Create(&news).Error; err != nil {
		respondInternalError(c, "menyimpan berita", err)
		return
	}
	c.JSON(http.StatusCreated, news)
}

func (ctrl *NewsController) Update(c *gin.Context) {
	id, ok := newsIDParam(c)
	if !ok {
		return
	}
	var news models.News
	if err := ctrl.db.First(&news, id).Error; err != nil {
		ctrl.respondFindError(c, err)
		return
	}
	if !ctrl.bindAndApply(c, &news) {
		return
	}
	if err := ctrl.db.Save(&news).Error; err != nil {
		respondInternalError(c, "memperbarui berita", err)
		return
	}
	c.JSON(http.StatusOK, news)
}

// shortcut: foto di dalam berita yang dihapus tetap tersimpan di direktori unggahan.
func (ctrl *NewsController) Delete(c *gin.Context) {
	id, ok := newsIDParam(c)
	if !ok {
		return
	}
	result := ctrl.db.Delete(&models.News{}, id)
	if result.Error != nil {
		respondInternalError(c, "menghapus berita", result.Error)
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cerita tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berita dihapus"})
}

func (ctrl *NewsController) respondFindError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cerita tidak ditemukan"})
		return
	}
	respondInternalError(c, "memuat berita", err)
}

func (ctrl *NewsController) bindAndApply(c *gin.Context, news *models.News) bool {
	var req models.SaveNewsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data berita tidak valid. Judul wajib diisi (maks. 200 karakter)."})
		return false
	}
	if err := applyNewsRequest(news, &req, time.Now()); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return false
	}
	return true
}

func applyNewsRequest(news *models.News, req *models.SaveNewsRequest, now time.Time) error {
	title := strings.Join(strings.Fields(req.Title), " ")
	if title == "" {
		return errors.New("Judul berita wajib diisi")
	}
	content, text, err := sanitizeNewsHTML(req.Content)
	if err != nil {
		return errors.New("Isi berita tidak dapat dibaca")
	}
	if req.Status == models.NewsStatusPublished && text == "" && !strings.Contains(content, "<img") {
		return errors.New("Isi berita masih kosong. Tulis isinya sebelum menerbitkan.")
	}
	cover := strings.TrimSpace(req.CoverImage)
	caption := strings.Join(strings.Fields(req.CoverCaption), " ")
	source := strings.Join(strings.Fields(req.CoverSource), " ")
	if cover == "" {
		caption, source = "", ""
	} else if _, ok := safeNewsURL(cover, true); !ok {
		return errors.New("Foto sampul tidak valid")
	} else if req.Status == models.NewsStatusPublished && source == "" {
		return errors.New("Sumber foto sampul wajib diisi sebelum menerbitkan, contoh: Dok. Istimewa.")
	}
	news.Title = title
	news.Category = req.Category
	news.Content = content
	news.Excerpt = newsExcerpt(text, newsExcerptLength)
	news.CoverImage = cover
	news.CoverCaption = caption
	news.CoverSource = source
	news.Status = req.Status
	// Tanggal terbit pertama dipertahankan walau berita sempat ditarik ke draf.
	if req.Status == models.NewsStatusPublished && news.PublishedAt == nil {
		news.PublishedAt = &now
	}
	return nil
}
