-- Kategori berita, susunan Berita Utama/Pilihan Redaksi, dan komentar pembaca.
-- Jalankan sebelum deploy backend. Aman dijalankan ulang. Nama constraint dan
-- index mengikuti GORM AutoMigrate agar keduanya tidak membuat objek ganda.
BEGIN;

-- Berita lama otomatis masuk kategori "lainnya"; admin dapat mengubahnya.
ALTER TABLE news ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'lainnya';
CREATE INDEX IF NOT EXISTS idx_news_category ON news (category);

-- slot: 'featured' (posisi 1 = berita utama, 2-5 = pendukung) atau 'editor_pick'.
CREATE TABLE IF NOT EXISTS news_placements (
    slot VARCHAR(20) NOT NULL,
    position BIGINT NOT NULL,
    news_id BIGINT NOT NULL,
    PRIMARY KEY (slot, position),
    CONSTRAINT fk_news_placements_news FOREIGN KEY (news_id) REFERENCES news (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_news_placements_news_id ON news_placements (news_id);

-- display_name adalah nama yang dipilih penulis (nama profil atau samaran).
-- parent_id selalu menunjuk komentar utama (balasan satu tingkat).
CREATE TABLE IF NOT EXISTS news_comments (
    id BIGSERIAL PRIMARY KEY,
    news_id BIGINT NOT NULL,
    parent_id BIGINT,
    author_id BIGINT NOT NULL,
    anonymous BOOLEAN NOT NULL DEFAULT false,
    display_name VARCHAR(60) NOT NULL,
    body TEXT NOT NULL,
    hidden BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_news_comments_news FOREIGN KEY (news_id) REFERENCES news (id) ON DELETE CASCADE,
    CONSTRAINT fk_news_comments_parent FOREIGN KEY (parent_id) REFERENCES news_comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_news_comments_author FOREIGN KEY (author_id) REFERENCES providers (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_news_comments_news_id ON news_comments (news_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_parent_id ON news_comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_author_id ON news_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_hidden ON news_comments (hidden);

ALTER TABLE news_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_comments ENABLE ROW LEVEL SECURITY;

COMMIT;
