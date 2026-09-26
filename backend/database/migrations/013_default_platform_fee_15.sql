BEGIN;

-- Tarif 8%, 10%, atau nilai khusus lain yang sudah ditetapkan admin pada
-- provider lama tetap dipertahankan. Perubahan ini hanya mengubah default
-- provider/booking baru dan memperbaiki nilai invalid yang tidak dapat dipakai.
UPDATE providers
SET platform_fee_percent = 15
WHERE platform_fee_percent IS NULL
   OR platform_fee_percent < 1
   OR platform_fee_percent > 100;

ALTER TABLE providers
    ALTER COLUMN platform_fee_percent SET DEFAULT 15,
    ALTER COLUMN platform_fee_percent SET NOT NULL;

-- Booking selalu menyimpan snapshot tarif provider saat transaksi dibuat.
-- Snapshot lama tidak diubah agar laporan dan hak pencairan historis tetap sama.
UPDATE bookings
SET platform_fee_percent = 15
WHERE platform_fee_percent IS NULL
   OR platform_fee_percent < 1
   OR platform_fee_percent > 100;

ALTER TABLE bookings
    ALTER COLUMN platform_fee_percent SET DEFAULT 15,
    ALTER COLUMN platform_fee_percent SET NOT NULL;

COMMIT;
