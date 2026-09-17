-- Migrasi 003: jejak audit pengembalian dana.
--
-- Sebelum ini, penyelesaian refund hanya membalik status booking menjadi
-- REFUNDED. Tidak ada catatan nominal yang benar-benar dikirim, metodenya,
-- nomor referensi transfer, maupun siapa yang memprosesnya. Tabel ini
-- menjadikan setiap refund dapat diaudit.
--
-- Jalankan satu kali setelah backup database. Migrasi ini aman diulang.

BEGIN;

CREATE TABLE IF NOT EXISTS refund_records (
    id                 BIGSERIAL PRIMARY KEY,
    booking_id         BIGINT      NOT NULL,
    entitled_amount    BIGINT      NOT NULL,
    amount             BIGINT      NOT NULL,
    method             VARCHAR(50) NOT NULL,
    reference          VARCHAR(255) NOT NULL,
    notes              TEXT,
    processed_by_id    BIGINT      NOT NULL,
    processed_by_email VARCHAR(255) NOT NULL,
    processed_at       TIMESTAMPTZ NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Satu booking hanya boleh punya satu catatan refund, sehingga pencatatan ganda
-- ditolak oleh database walau dua admin menekan tombol bersamaan.
CREATE UNIQUE INDEX IF NOT EXISTS ux_refund_records_booking_id
    ON refund_records (booking_id);

CREATE INDEX IF NOT EXISTS idx_refund_records_processed_by
    ON refund_records (processed_by_id);

-- Nominal tidak boleh nol/negatif dan tidak boleh melebihi hak refund.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_refund_records_amount'
    ) THEN
        ALTER TABLE refund_records
            ADD CONSTRAINT ck_refund_records_amount
            CHECK (amount > 0 AND amount <= entitled_amount);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_refund_records_method'
    ) THEN
        ALTER TABLE refund_records
            ADD CONSTRAINT ck_refund_records_method
            CHECK (method IN ('MANUAL_TRANSFER', 'GATEWAY_REFUND', 'GATEWAY_PAYOUT'));
    END IF;
END $$;

ALTER TABLE refund_records ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Booking yang sudah berstatus REFUNDED sebelum migrasi ini TIDAK dibuatkan
-- catatan otomatis: nominal dan bukti transfernya tidak diketahui sistem, dan
-- menebaknya justru menciptakan jejak audit palsu. Rekonsiliasi refund lama
-- harus dilakukan manual terhadap mutasi bank. Query untuk mendaftarnya:
--
--   SELECT b.id, b.booking_code, b.refund_amount, b.updated_at
--   FROM bookings b
--   LEFT JOIN refund_records r ON r.booking_id = b.id
--   WHERE b.status = 'REFUNDED' AND r.id IS NULL
--   ORDER BY b.updated_at DESC;
