BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT LOWER(email)
        FROM providers
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Migrasi dihentikan: terdapat akun dengan email duplikat tanpa membedakan huruf besar/kecil';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_providers_lower_email
    ON providers (LOWER(email));

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM payouts WHERE amount <> TRUNC(amount)) THEN
        RAISE EXCEPTION 'Migrasi dihentikan: terdapat nominal payout pecahan rupiah';
    END IF;
END $$;

ALTER TABLE payouts
    ALTER COLUMN amount TYPE BIGINT USING amount::BIGINT;

CREATE TABLE IF NOT EXISTS oauth_login_codes (
    id BIGSERIAL PRIMARY KEY,
    code_hash VARCHAR(64) NOT NULL,
    provider_id BIGINT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_oauth_login_codes_code_hash
    ON oauth_login_codes (code_hash);
CREATE INDEX IF NOT EXISTS ix_oauth_login_codes_provider_id
    ON oauth_login_codes (provider_id);
CREATE INDEX IF NOT EXISTS ix_oauth_login_codes_expires_at
    ON oauth_login_codes (expires_at);

DO $$
BEGIN
    IF EXISTS (
        SELECT booking_id
        FROM held_settlements
        GROUP BY booking_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Migrasi dihentikan: terdapat held_settlements duplikat untuk booking yang sama';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_held_settlements_booking_id
    ON held_settlements (booking_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT xendit_invoice_id
        FROM bookings
        WHERE xendit_invoice_id <> ''
        GROUP BY xendit_invoice_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Migrasi dihentikan: terdapat xendit_invoice_id duplikat';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_xendit_invoice_id
    ON bookings (xendit_invoice_id)
    WHERE xendit_invoice_id <> '';

COMMIT;
