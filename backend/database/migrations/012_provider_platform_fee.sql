BEGIN;

ALTER TABLE providers
    ADD COLUMN IF NOT EXISTS platform_fee_percent BIGINT;

UPDATE providers
SET platform_fee_percent = 10
WHERE platform_fee_percent IS NULL
   OR platform_fee_percent < 1
   OR platform_fee_percent > 100;

ALTER TABLE providers
    ALTER COLUMN platform_fee_percent SET DEFAULT 10,
    ALTER COLUMN platform_fee_percent SET NOT NULL;

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS platform_fee_percent BIGINT;

-- Booking yang belum memiliki snapshot dibuat oleh versi lama ketika komisi
-- masih hardcoded 15%. Nilai historisnya dipertahankan untuk rekonsiliasi.
UPDATE bookings
SET platform_fee_percent = 15
WHERE platform_fee_percent IS NULL
   OR platform_fee_percent = 0;

ALTER TABLE bookings
    ALTER COLUMN platform_fee_percent SET DEFAULT 10,
    ALTER COLUMN platform_fee_percent SET NOT NULL;

ALTER TABLE providers
    DROP CONSTRAINT IF EXISTS providers_platform_fee_percent_check;
ALTER TABLE providers
    ADD CONSTRAINT providers_platform_fee_percent_check
    CHECK (platform_fee_percent BETWEEN 1 AND 100);

ALTER TABLE bookings
    DROP CONSTRAINT IF EXISTS bookings_platform_fee_percent_check;
ALTER TABLE bookings
    ADD CONSTRAINT bookings_platform_fee_percent_check
    CHECK (platform_fee_percent BETWEEN 1 AND 100);

COMMIT;
