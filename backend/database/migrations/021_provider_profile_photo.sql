-- Foto profil publik mitra (path "/uploads/pkg_..."). Kosong berarti avatar
-- memakai inisial nama bisnis.
ALTER TABLE providers ADD COLUMN IF NOT EXISTS profile_photo varchar(500) NOT NULL DEFAULT '';
