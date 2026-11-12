package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"tripkita-provider/models"
)

const (
	newsCommentMaxRunes   = 1000
	newsAliasMinRunes     = 2
	newsAliasMaxRunes     = 40
	newsDisplayNameMax    = 60
	newsCommentAdminPage  = 20
	newsCommentSearchMax  = 150
	newsCommentPublicSize = 500 // shortcut: komentar satu artikel dimuat sekaligus; tambahkan paginasi bila diskusi melewati 500 komentar.
)

// NewsCommentController melayani komentar artikel: pengunjung membaca,
// customer yang login menulis/mengubah/menghapus komentarnya sendiri, dan
// admin memoderasi (sembunyikan atau hapus).
type NewsCommentController struct{ db *gorm.DB }

func NewNewsCommentController(db *gorm.DB) *NewsCommentController {
	return &NewsCommentController{db: db}
}

func currentAccountID(c *gin.Context) uint {
	value, _ := c.Get("provider_id")
	id, _ := value.(uint)
	return id
}

func commentIDParam(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Komentar tidak ditemukan"})
		return 0, false
	}
	return uint(id), true
}

func (ctrl *NewsCommentController) requirePublishedNews(c *gin.Context, newsID uint) bool {
	var count int64
	if err := ctrl.db.Model(&models.News{}).Where("id = ? AND status = ?", newsID, models.NewsStatusPublished).Count(&count).Error; err != nil {
		respondInternalError(c, "memeriksa berita", err)
		return false
	}
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cerita tidak ditemukan"})
		return false
	}
	return true
}

// List mengembalikan komentar yang tampil, terlama lebih dulu; frontend
// menyusunnya menjadi komentar utama dan balasannya.
func (ctrl *NewsCommentController) List(c *gin.Context) {
	newsID, ok := newsIDParam(c)
	if !ok || !ctrl.requirePublishedNews(c, newsID) {
		return
	}
	var rows []models.NewsComment
	if err := ctrl.db.Where("news_id = ? AND hidden = ?", newsID, false).
		Order("created_at ASC, id ASC").Limit(newsCommentPublicSize).Find(&rows).Error; err != nil {
		respondInternalError(c, "memuat komentar", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": visibleCommentViews(rows, currentAccountID(c))})
}

// visibleCommentViews membuang balasan yang komentar utamanya disembunyikan
// admin (komentar tersembunyi sudah tersaring di query).
func visibleCommentViews(rows []models.NewsComment, viewer uint) []models.NewsCommentView {
	roots := map[uint]bool{}
	for _, row := range rows {
		if row.ParentID == nil {
			roots[row.ID] = true
		}
	}
	views := make([]models.NewsCommentView, 0, len(rows))
	for _, row := range rows {
		if row.ParentID != nil && !roots[*row.ParentID] {
			continue
		}
		views = append(views, commentView(row, viewer))
	}
	return views
}

func commentView(row models.NewsComment, viewer uint) models.NewsCommentView {
	return models.NewsCommentView{
		ID:          row.ID,
		ParentID:    row.ParentID,
		DisplayName: row.DisplayName,
		Anonymous:   row.Anonymous,
		Body:        row.Body,
		Mine:        viewer != 0 && row.AuthorID == viewer,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
}

// normalizeComment merapikan isi dan menentukan nama tampil. Nama asli
// diambil dari profil akun; nama samaran tidak boleh sama dengan nama asli
// agar identitas tidak terbuka tanpa sengaja.
func normalizeComment(req *models.SaveNewsCommentRequest, realName string) (body, displayName string, err error) {
	body = strings.TrimSpace(req.Body)
	if body == "" {
		return "", "", errors.New("Komentar tidak boleh kosong")
	}
	if utf8.RuneCountInString(body) > newsCommentMaxRunes {
		return "", "", fmt.Errorf("Komentar maksimal %d karakter", newsCommentMaxRunes)
	}
	realName = strings.Join(strings.Fields(realName), " ")
	if !req.Anonymous {
		if realName == "" {
			realName = "Pengguna TemenTrip"
		}
		if runes := []rune(realName); len(runes) > newsDisplayNameMax {
			realName = string(runes[:newsDisplayNameMax])
		}
		return body, realName, nil
	}
	alias := strings.Join(strings.Fields(req.Alias), " ")
	if length := utf8.RuneCountInString(alias); length < newsAliasMinRunes || length > newsAliasMaxRunes {
		return "", "", fmt.Errorf("Nama samaran harus %d-%d karakter", newsAliasMinRunes, newsAliasMaxRunes)
	}
	if strings.EqualFold(alias, realName) {
		return "", "", errors.New("Nama samaran tidak boleh sama dengan nama asli Anda")
	}
	return body, alias, nil
}

func (ctrl *NewsCommentController) bind(c *gin.Context) (*models.SaveNewsCommentRequest, string, string, bool) {
	var req models.SaveNewsCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Komentar wajib diisi (maks. %d karakter).", newsCommentMaxRunes)})
		return nil, "", "", false
	}
	var author models.Provider
	if err := ctrl.db.Select("id", "pic_name").First(&author, currentAccountID(c)).Error; err != nil {
		respondInternalError(c, "memuat akun penulis komentar", err)
		return nil, "", "", false
	}
	body, name, err := normalizeComment(&req, author.PicName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return nil, "", "", false
	}
	return &req, body, name, true
}

func (ctrl *NewsCommentController) Create(c *gin.Context) {
	newsID, ok := newsIDParam(c)
	if !ok {
		return
	}
	req, body, name, ok := ctrl.bind(c)
	if !ok || !ctrl.requirePublishedNews(c, newsID) {
		return
	}
	comment := models.NewsComment{NewsID: newsID, AuthorID: currentAccountID(c), Anonymous: req.Anonymous, DisplayName: name, Body: body}
	if req.ParentID != nil {
		var parent models.NewsComment
		err := ctrl.db.Select("id", "parent_id").Where("id = ? AND news_id = ? AND hidden = ?", *req.ParentID, newsID, false).First(&parent).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Komentar yang Anda balas sudah tidak tersedia"})
			return
		}
		if err != nil {
			respondInternalError(c, "memuat komentar induk", err)
			return
		}
		// Balasan satu tingkat: membalas sebuah balasan menempel ke komentar utamanya.
		root := parent.ID
		if parent.ParentID != nil {
			root = *parent.ParentID
		}
		comment.ParentID = &root
	}
	if err := ctrl.db.Omit(clause.Associations).Create(&comment).Error; err != nil {
		if errors.Is(err, gorm.ErrForeignKeyViolated) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Komentar yang Anda balas sudah tidak tersedia"})
			return
		}
		respondInternalError(c, "menyimpan komentar", err)
		return
	}
	c.JSON(http.StatusCreated, commentView(comment, comment.AuthorID))
}

// Update hanya untuk komentar milik sendiri yang tidak disembunyikan admin.
func (ctrl *NewsCommentController) Update(c *gin.Context) {
	id, ok := commentIDParam(c)
	if !ok {
		return
	}
	req, body, name, ok := ctrl.bind(c)
	if !ok {
		return
	}
	var comment models.NewsComment
	err := ctrl.db.Where("id = ? AND author_id = ? AND hidden = ?", id, currentAccountID(c), false).First(&comment).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Komentar tidak ditemukan"})
		return
	}
	if err != nil {
		respondInternalError(c, "memuat komentar", err)
		return
	}
	comment.Body, comment.DisplayName, comment.Anonymous, comment.UpdatedAt = body, name, req.Anonymous, time.Now()
	if err := ctrl.db.Model(&comment).Select("body", "display_name", "anonymous", "updated_at").Updates(&comment).Error; err != nil {
		respondInternalError(c, "memperbarui komentar", err)
		return
	}
	c.JSON(http.StatusOK, commentView(comment, comment.AuthorID))
}

// Delete menghapus komentar milik sendiri; balasannya ikut terhapus (ON DELETE CASCADE).
func (ctrl *NewsCommentController) Delete(c *gin.Context) {
	id, ok := commentIDParam(c)
	if !ok {
		return
	}
	ctrl.deleteWhere(c, ctrl.db.Where("id = ? AND author_id = ?", id, currentAccountID(c)))
}

func (ctrl *NewsCommentController) AdminDelete(c *gin.Context) {
	id, ok := commentIDParam(c)
	if !ok {
		return
	}
	ctrl.deleteWhere(c, ctrl.db.Where("id = ?", id))
}

func (ctrl *NewsCommentController) deleteWhere(c *gin.Context, scope *gorm.DB) {
	result := scope.Delete(&models.NewsComment{})
	if result.Error != nil {
		respondInternalError(c, "menghapus komentar", result.Error)
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Komentar tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Komentar dihapus"})
}

// AdminList: seluruh komentar terbaru, dapat dicari menurut judul artikel,
// nama tampil, nama akun, atau email penulis.
func (ctrl *NewsCommentController) AdminList(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 || page > 100000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Halaman tidak valid"})
		return
	}
	search := strings.TrimSpace(c.Query("q"))
	if utf8.RuneCountInString(search) > newsCommentSearchMax {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kata kunci terlalu panjang"})
		return
	}
	scope := func() *gorm.DB {
		query := ctrl.db.Table("news_comments AS nc").
			Joins("JOIN news AS n ON n.id = nc.news_id").
			Joins("LEFT JOIN providers AS p ON p.id = nc.author_id")
		if search != "" {
			// Wildcard LIKE di kata kunci diperlakukan sebagai teks biasa.
			like := "%" + strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(search) + "%"
			query = query.Where("(n.title ILIKE ? OR nc.display_name ILIKE ? OR p.pic_name ILIKE ? OR p.email ILIKE ?)", like, like, like, like)
		}
		return query
	}
	var total int64
	if err := scope().Count(&total).Error; err != nil {
		respondInternalError(c, "menghitung komentar", err)
		return
	}
	items := []models.AdminNewsComment{}
	if err := scope().Select(`nc.id, nc.news_id, n.title AS news_title, nc.parent_id, nc.display_name, nc.anonymous,
		COALESCE(p.pic_name, '') AS author_name, COALESCE(p.email, '') AS author_email,
		nc.body, nc.hidden, nc.created_at, nc.updated_at`).
		Order("nc.created_at DESC, nc.id DESC").
		Limit(newsCommentAdminPage).Offset((page - 1) * newsCommentAdminPage).Scan(&items).Error; err != nil {
		respondInternalError(c, "memuat komentar", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "pageSize": newsCommentAdminPage})
}

// AdminSetHidden menyembunyikan atau menampilkan kembali komentar. Kolom
// updated_at sengaja tidak disentuh agar komentar tidak tampak "diedit".
func (ctrl *NewsCommentController) AdminSetHidden(c *gin.Context) {
	id, ok := commentIDParam(c)
	if !ok {
		return
	}
	var req struct {
		Hidden *bool `json:"hidden" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status tampil komentar wajib diisi"})
		return
	}
	result := ctrl.db.Model(&models.NewsComment{}).Where("id = ?", id).UpdateColumn("hidden", *req.Hidden)
	if result.Error != nil {
		respondInternalError(c, "mengubah status komentar", result.Error)
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Komentar tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id, "hidden": *req.Hidden})
}
