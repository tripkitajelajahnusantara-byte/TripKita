-- Membuat atau memperbarui akun admin utama TemenTrip.
--
-- Cara pakai di Supabase SQL Editor:
-- 1. Ganti nilai v_password di bawah dengan password kuat milik Anda.
-- 2. Bila perlu, ubah v_email, v_name, dan v_whatsapp.
-- 3. Jalankan seluruh script sekaligus.
--
-- Script aman dijalankan ulang. Password disimpan sebagai bcrypt dan akan
-- otomatis ditingkatkan menjadi Argon2id setelah login pertama berhasil.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_email       TEXT := 'admin@tementrip.id';
    v_password    TEXT := '123123123123';
    v_name        TEXT := 'TemenTrip Admin';
    v_whatsapp    TEXT := '080000000000';
    v_hash        TEXT;
    v_provider_id BIGINT;
    v_user_id     BIGINT;
BEGIN
    IF to_regclass('public.providers') IS NULL
       OR to_regclass('public.users') IS NULL THEN
        RAISE EXCEPTION 'Tabel providers/users belum tersedia. Deploy backend atau jalankan migrasi schema terlebih dahulu.';
    END IF;

    IF v_password LIKE 'GANTI\_%' ESCAPE '\'
       OR length(v_password) < 12 THEN
        RAISE EXCEPTION 'Ganti v_password dengan password minimal 12 karakter sebelum menjalankan script.';
    END IF;

    v_email := lower(trim(v_email));
    v_hash := crypt(v_password, gen_salt('bf', 12));

    SELECT id
    INTO v_provider_id
    FROM providers
    WHERE lower(email) = v_email
    ORDER BY id
    LIMIT 1
    FOR UPDATE;

    IF v_provider_id IS NULL THEN
        INSERT INTO providers (
            business_name,
            business_category,
            operational_province,
            operational_city,
            description,
            document_uploaded,
            pic_name,
            email,
            password_hash,
            whats_app,
            is_verified,
            role,
            status,
            verification_notes,
            created_at,
            updated_at
        ) VALUES (
            v_name,
            'admin',
            'Indonesia',
            'Indonesia',
            'System Administrator',
            TRUE,
            v_name,
            v_email,
            v_hash,
            v_whatsapp,
            TRUE,
            'ADMIN',
            'APPROVED',
            'Akun administrator utama.',
            NOW(),
            NOW()
        )
        RETURNING id INTO v_provider_id;
    ELSE
        UPDATE providers
        SET business_name = v_name,
            business_category = 'admin',
            pic_name = v_name,
            email = v_email,
            password_hash = v_hash,
            whats_app = v_whatsapp,
            is_verified = TRUE,
            role = 'ADMIN',
            status = 'APPROVED',
            verification_notes = 'Akun administrator utama.',
            updated_at = NOW()
        WHERE id = v_provider_id;
    END IF;

    INSERT INTO users (
        provider_id,
        email,
        password_hash,
        failed_login_attempts,
        locked_until,
        password_changed_at,
        created_at,
        updated_at
    ) VALUES (
        v_provider_id,
        v_email,
        v_hash,
        0,
        NULL,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (provider_id) DO UPDATE
    SET email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        failed_login_attempts = 0,
        locked_until = NULL,
        password_changed_at = NOW(),
        reset_token_hash = '',
        reset_token_expires_at = NULL,
        reset_attempts = 0,
        updated_at = NOW()
    RETURNING id INTO v_user_id;

    -- Password berubah, jadi seluruh sesi lama dicabut untuk keamanan.
    DELETE FROM auth_sessions WHERE user_id = v_user_id;

    RAISE NOTICE 'Admin % berhasil dibuat/diperbarui dengan provider_id=% dan user_id=%',
        v_email, v_provider_id, v_user_id;
END $$;
