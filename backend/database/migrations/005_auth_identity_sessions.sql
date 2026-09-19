-- Migrasi 005: pisahkan identitas login dari profil bisnis dan gunakan sesi
-- opaque yang dapat dicabut di server.
--
-- Aman diulang. Hash bcrypt lama disalin apa adanya dan akan ditingkatkan ke
-- Argon2id ketika pemilik akun berhasil login.

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    google_subject VARCHAR(255) NOT NULL DEFAULT '',
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    reset_token_hash VARCHAR(64) NOT NULL DEFAULT '',
    reset_token_expires_at TIMESTAMPTZ,
    reset_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_users_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_provider_id ON users(provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_lower ON users(LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_google_subject
    ON users(google_subject) WHERE google_subject <> '';

INSERT INTO users (provider_id, email, password_hash, created_at, updated_at)
SELECT p.id, LOWER(TRIM(p.email)), COALESCE(p.password_hash, ''), NOW(), NOW()
FROM providers p
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.provider_id = p.id)
ON CONFLICT (provider_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS auth_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    idle_expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_sessions_token_hash ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS ix_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS ix_auth_sessions_idle_expires_at ON auth_sessions(idle_expires_at);
CREATE INDEX IF NOT EXISTS ix_auth_sessions_revoked_at ON auth_sessions(revoked_at);

ALTER TABLE oauth_login_codes ADD COLUMN IF NOT EXISTS user_id BIGINT;
UPDATE oauth_login_codes c
SET user_id = u.id
FROM users u
WHERE c.user_id IS NULL AND u.provider_id = c.provider_id;
DELETE FROM oauth_login_codes WHERE user_id IS NULL;
ALTER TABLE oauth_login_codes ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_oauth_login_codes_user_id ON oauth_login_codes(user_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_oauth_login_codes_user'
    ) THEN
        ALTER TABLE oauth_login_codes
            ADD CONSTRAINT fk_oauth_login_codes_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_login_codes ENABLE ROW LEVEL SECURITY;

COMMIT;
