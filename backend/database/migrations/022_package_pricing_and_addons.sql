-- Run before deploying the API. Adds per-unit pricing (e.g. price per jeep:
-- one customer still pays a full unit) and optional paid add-ons. Existing
-- packages stay priced per person with no add-ons.
BEGIN;
ALTER TABLE packages
    ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(20) NOT NULL DEFAULT 'PER_PERSON',
    ADD COLUMN IF NOT EXISTS unit_name VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS unit_capacity INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS add_ons TEXT;
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS unit_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit_name VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS add_ons TEXT;
COMMIT;
