package controllers

import (
	"errors"
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
var newsListColumns = []string{"id", "title", "excerpt", "cover_image", "status", "published_at", "created_at", "updated_at"}

// NewsController melayani berita: admin menulis, customer hanya membaca yang
// berstatus PUBLISHED.
type NewsController struct{ db *gorm.DB }

func NewNewsController(db *gorm.DB) *NewsController {
	return &NewsController{db: db}
}

func newsIDParam(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Berita tidak ditemukan"})
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
	var total int64
	if err := ctrl.published().Count(&total).Error; err != nil {
		respondInternalError(c, "menghitung berita", err)
		return
	}
	items := []models.News{}
	if err := ctrl.published().Select(newsListColumns).Order("published_at DESC, id DESC").
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
		c.JSON(http.StatusNotFound, gin.H{"error": "Berita tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berita dihapus"})
}

func (ctrl *NewsController) respondFindError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Berita tidak ditemukan"})
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
