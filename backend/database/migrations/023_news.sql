-- Berita yang ditulis admin dan ditampilkan di menu Berita customer.
-- content berisi HTML yang sudah disaring backend (lihat controllers/news_html.go).
CREATE TABLE IF NOT EXISTS news (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    excerpt VARCHAR(400) NOT NULL DEFAULT '',
    cover_image VARCHAR(500) NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ,
    author_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_news_status_published ON news (status, published_at);

-- Keterangan dan sumber foto sampul (standar jurnalistik). ADD COLUMN IF NOT
-- EXISTS agar file ini aman dijalankan ulang pada tabel yang sudah dibuat.
ALTER TABLE news
    ADD COLUMN IF NOT EXISTS cover_caption VARCHAR(300) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS cover_source VARCHAR(150) NOT NULL DEFAULT '';
