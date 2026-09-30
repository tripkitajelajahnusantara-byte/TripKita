BEGIN;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_providers_deleted_at ON providers(deleted_at);
-- Recover the explicit legacy disable action without treating every rejection
-- as deletion. Booking, payout and audit records remain intact.
UPDATE providers SET status = 'DISABLED', deleted_at = updated_at
WHERE status = 'REJECTED' AND deleted_at IS NULL
  AND verification_notes = 'Akun dinonaktifkan oleh administrator';
UPDATE packages SET status = 'Nonaktif'
WHERE provider_id IN (SELECT id FROM providers WHERE deleted_at IS NOT NULL);
COMMIT;
