-- Migrasi 007: peninjauan keberangkatan dan tanggal keberangkatan per paket.
--
-- Menambahkan dua tabel baru yang dipakai rilis ini:
--   * trip_departures — keputusan mitra atas keberangkatan yang tidak dapat
--     dijalankan, baik karena kuota minimal Open Trip tidak terpenuhi pada H-3
--     maupun karena keadaan kahar yang dinyatakan mitra.
--   * package_dates   — tanggal keberangkatan yang dibuka mitra untuk paket
--     selain Open Trip, sekaligus penanda tanggal yang sudah terkunci pesanan.
--
-- WAJIB dijalankan sebelum atau bersamaan dengan deploy backend versi ini.
-- Backend baru menyentuh package_dates pada setiap perubahan status booking,
-- sehingga tanpa tabel ini pembuatan booking dan daftar paket publik akan gagal.
--
-- Migrasi ini aman diulang dan aman dijalankan pada database yang belum pernah
-- memakai penamaan lama (open_trip_departures).
--
-- Dapat dijalankan utuh lewat psql maupun SQL editor (Supabase/pgAdmin): seluruh
-- pernyataannya boleh berada di dalam satu transaksi, dan tidak ada perintah
-- yang menuntut dijalankan di luar blok transaksi.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Penamaan lama -> baru
--
-- Versi pengembangan sempat memakai nama open_trip_departures sebelum fitur
-- diperluas ke seluruh tipe paket. Blok ini hanya berjalan bila nama lama itu
-- benar-benar ada, dan memindahkan datanya tanpa kehilangan satu baris pun.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('open_trip_departures') IS NOT NULL
       AND to_regclass('trip_departures') IS NULL THEN
        ALTER TABLE open_trip_departures RENAME TO trip_departures;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_attribute
               WHERE attrelid = to_regclass('bookings')
                 AND attname = 'open_trip_departure_id'
                 AND NOT attisdropped)
       AND NOT EXISTS (SELECT 1 FROM pg_attribute
               WHERE attrelid = to_regclass('bookings')
                 AND attname = 'trip_departure_id'
                 AND NOT attisdropped) THEN
        ALTER TABLE bookings RENAME COLUMN open_trip_departure_id TO trip_departure_id;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Tabel peninjauan keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_departures (
    id                BIGSERIAL PRIMARY KEY,
    package_id        BIGINT       NOT NULL,
    provider_id       BIGINT       NOT NULL,
    departure_day     VARCHAR(10)  NOT NULL,
    departure_at      TIMESTAMPTZ  NOT NULL,
    review_deadline   TIMESTAMPTZ  NOT NULL,
    response_deadline TIMESTAMPTZ,
    reason            VARCHAR(50)  NOT NULL DEFAULT 'QUOTA_SHORTFALL',
    seats_booked      BIGINT       NOT NULL DEFAULT 0,
    seats_required    BIGINT       NOT NULL DEFAULT 0,
    booking_count     BIGINT       NOT NULL DEFAULT 0,
    status            VARCHAR(50)  NOT NULL DEFAULT 'AWAITING_PROVIDER',
    decision          VARCHAR(50)  NOT NULL DEFAULT '',
    proposed_date     TIMESTAMPTZ,
    decision_notes    TEXT,
    decided_at        TIMESTAMPTZ,
    accepted_count    BIGINT       NOT NULL DEFAULT 0,
    declined_count    BIGINT       NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Kolom yang ditambahkan setelah penamaan lama dibuat, agar database yang
-- sempat memakai versi awal ikut lengkap.
ALTER TABLE trip_departures
    ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reason VARCHAR(50) NOT NULL DEFAULT 'QUOTA_SHORTFALL';

-- Satu keberangkatan (paket + tanggal jalan) hanya boleh punya satu baris
-- peninjauan. Indeks inilah yang membuat job berkala tetap idempoten walau
-- dijalankan dua instance sekaligus.
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_departure
    ON trip_departures (package_id, departure_day);

CREATE INDEX IF NOT EXISTS idx_trip_departures_provider_id
    ON trip_departures (provider_id);

-- ---------------------------------------------------------------------------
-- 3. Tautan booking ke peninjauan keberangkatan
-- ---------------------------------------------------------------------------
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS trip_departure_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_bookings_trip_departure_id
    ON bookings (trip_departure_id);

-- ---------------------------------------------------------------------------
-- 4. Tanggal keberangkatan per paket
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_dates (
    id         BIGSERIAL PRIMARY KEY,
    package_id BIGINT      NOT NULL,
    date       VARCHAR(10) NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    origin     VARCHAR(20) NOT NULL DEFAULT 'PROVIDER',
    booking_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Satu tanggal hanya boleh muncul sekali per paket. Inilah penegakan aturan
-- "satu tanggal satu pesanan" di tingkat database.
CREATE UNIQUE INDEX IF NOT EXISTS idx_package_date_day
    ON package_dates (package_id, date);

CREATE INDEX IF NOT EXISTS idx_package_dates_booking_id
    ON package_dates (booking_id);

-- ---------------------------------------------------------------------------
-- 5. Backfill tanggal yang sudah terpakai pesanan berjalan
--
-- Pencegahan pemesanan ganda dibaca langsung dari tabel bookings, jadi tanpa
-- blok ini pun tanggal tetap tidak dapat dipesan dua kali. Backfill dibutuhkan
-- agar kalender pelanggan langsung menandai tanggal tersebut penuh, tanpa
-- menunggu status pesanan berubah lebih dulu.
--
-- Rentang menginap dijabarkan per hari karena paket 4D3N menahan empat hari,
-- bukan hanya tanggal berangkat.
-- ---------------------------------------------------------------------------
INSERT INTO package_dates (package_id, date, status, origin, booking_id, created_at, updated_at)
SELECT DISTINCT ON (b.package_id, d.day)
       b.package_id,
       to_char(d.day, 'YYYY-MM-DD'),
       'BOOKED',
       'AUTO',
       b.id,
       NOW(),
       NOW()
FROM bookings b
JOIN packages p ON p.id = b.package_id AND p.deleted_at IS NULL
CROSS JOIN LATERAL generate_series(
    date_trunc('day', b.trip_date),
    date_trunc('day', GREATEST(b.trip_end_date, b.trip_date)),
    INTERVAL '1 day'
) AS d(day)
WHERE lower(replace(p.trip_type, ' ', '')) <> 'opentrip'
  AND b.status IN ('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'COMPLETED')
ORDER BY b.package_id, d.day, b.id
ON CONFLICT (package_id, date) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- Pemeriksaan setelah migrasi (jalankan terpisah, tidak mengubah data):
--
--   SELECT COUNT(*) FROM trip_departures;   -- 0 pada pemasangan baru
--   SELECT status, origin, COUNT(*) FROM package_dates GROUP BY 1, 2;
--   SELECT COUNT(*) FROM information_schema.columns
--    WHERE table_name = 'bookings' AND column_name = 'trip_departure_id';  -- 1
--
-- Tabel lama tidak boleh tersisa:
--   SELECT table_name FROM information_schema.tables
--    WHERE table_name = 'open_trip_departures';  -- tidak ada baris
-- ---------------------------------------------------------------------------
