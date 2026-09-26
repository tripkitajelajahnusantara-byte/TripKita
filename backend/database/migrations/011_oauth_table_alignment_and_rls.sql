-- Samakan nama tabel OAuth yang sebelumnya dapat dibuat GORM sebagai
-- o_auth_login_codes dengan nama kanonik yang dipakai migrasi dan RLS.

BEGIN;

CREATE TABLE IF NOT EXISTS oauth_login_codes (
    id BIGSERIAL PRIMARY KEY,
    code_hash VARCHAR(64) NOT NULL,
    provider_id BIGINT NOT NULL,
    user_id BIGINT,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_oauth_login_codes_code_hash
    ON oauth_login_codes (code_hash);

DO $$
BEGIN
    IF to_regclass('public.o_auth_login_codes') IS NOT NULL THEN
        INSERT INTO oauth_login_codes (
            code_hash, provider_id, user_id, expires_at, used_at, created_at
        )
        SELECT legacy.code_hash,
               legacy.provider_id,
               COALESCE(legacy.user_id, users.id),
               legacy.expires_at,
               legacy.used_at,
               COALESCE(legacy.created_at, NOW())
        FROM o_auth_login_codes AS legacy
        LEFT JOIN users ON users.provider_id = legacy.provider_id
        WHERE COALESCE(legacy.user_id, users.id) IS NOT NULL
        ON CONFLICT (code_hash) DO NOTHING;

        DROP TABLE o_auth_login_codes;
    END IF;
END $$;

ALTER TABLE oauth_login_codes
    ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_oauth_login_codes_provider_id
    ON oauth_login_codes (provider_id);
CREATE INDEX IF NOT EXISTS ix_oauth_login_codes_user_id
    ON oauth_login_codes (user_id);
CREATE INDEX IF NOT EXISTS ix_oauth_login_codes_expires_at
    ON oauth_login_codes (expires_at);

ALTER TABLE oauth_login_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_departures ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_dates ENABLE ROW LEVEL SECURITY;

COMMIT;
