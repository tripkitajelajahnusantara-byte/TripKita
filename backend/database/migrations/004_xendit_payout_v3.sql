-- Migrasi 004: metadata routing Xendit Payouts v3.
--
-- Aman diulang. Kolom channel_code legacy dipertahankan untuk audit payout lama.

BEGIN;

ALTER TABLE payouts ADD COLUMN IF NOT EXISTS routing_type VARCHAR(50);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS routing_value VARCHAR(100);

COMMIT;
