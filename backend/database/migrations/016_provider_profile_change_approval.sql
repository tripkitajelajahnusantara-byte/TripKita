-- Provider profile changes must be reviewed without replacing the active,
-- customer-facing values before an administrator approves them.
BEGIN;

ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_business_name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_business_category VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_operational_province VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_operational_city VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_description TEXT NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_pic_name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_whats_app VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_instagram VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_tik_tok VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS pending_website VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS profile_verification_status VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS profile_rejection_reason TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_providers_profile_verification_status
    ON providers (profile_verification_status);

CREATE INDEX IF NOT EXISTS idx_providers_pending_email_lower
    ON providers (LOWER(pending_email))
    WHERE profile_verification_status = 'PENDING' AND pending_email <> '';

COMMIT;
