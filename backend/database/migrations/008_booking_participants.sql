-- Migrasi 008: data peserta per booking.
--
-- Sebelumnya form checkout web dan mobile mengumpulkan nama, nomor HP, jenis
-- kelamin, tanggal lahir, dan riwayat penyakit setiap peserta, tetapi backend
-- tidak menyimpannya sehingga mitra tidak pernah menerimanya. Tabel ini
-- menyimpan data tersebut untuk keperluan pendaftaran dan asuransi perjalanan.
--
-- Aman dijalankan sebelum backend baru dideploy (backend lama tidak menyentuh
-- tabel ini) dan aman diulang.

BEGIN;

CREATE TABLE IF NOT EXISTS booking_participants (
    id            BIGSERIAL PRIMARY KEY,
    booking_id    BIGINT       NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    position      INTEGER      NOT NULL,
    name          VARCHAR(255) NOT NULL,
    phone         VARCHAR(50)  NOT NULL,
    gender        VARCHAR(20)  NOT NULL,
    birth_date    VARCHAR(10)  NOT NULL,
    medical_notes VARCHAR(255) NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_booking_participants_booking_id
    ON booking_participants (booking_id);

-- Berisi data kesehatan peserta: tidak boleh terbaca lewat API Supabase publik.
ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;

COMMIT;
