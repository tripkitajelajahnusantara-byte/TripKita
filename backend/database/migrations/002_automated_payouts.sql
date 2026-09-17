-- Migrasi 002: dukungan pencairan otomatis lewat payment gateway.
--
-- Jalankan satu kali setelah backup database. Migrasi ini aman diulang.
-- Tidak ada kolom yang dihapus: kolom lama (dp_amount, payment_proof) sengaja
-- ditinggalkan agar rollback aplikasi tetap memungkinkan.

BEGIN;

-- 1. Kolom penelusuran pencairan otomatis.
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS xendit_payout_id VARCHAR(255);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS channel_code VARCHAR(50);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS failure_code VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_payouts_xendit_payout_id
    ON payouts (xendit_payout_id)
    WHERE xendit_payout_id IS NOT NULL;

-- Satu pengajuan hanya boleh punya satu instruksi pencairan di gateway.
CREATE UNIQUE INDEX IF NOT EXISTS ux_payouts_xendit_payout_id
    ON payouts (xendit_payout_id)
    WHERE xendit_payout_id IS NOT NULL AND xendit_payout_id <> '';

-- 2. Setiap provider dengan transaksi wajib punya baris buku besar, karena
--    pencairan kini memotong ProviderBalance dan akan gagal bila barisnya hilang.
INSERT INTO provider_balances (provider_id, available_balance, held_balance, total_earned, updated_at)
SELECT DISTINCT b.provider_id, 0, 0, 0, NOW()
FROM bookings b
WHERE NOT EXISTS (
    SELECT 1 FROM provider_balances pb WHERE pb.provider_id = b.provider_id
);

-- 3. Selaraskan buku besar dengan hak cair yang dihitung dari booking.
--
--    Sebelum versi ini, persetujuan pencairan tidak pernah mengurangi
--    provider_balances, sehingga available_balance kelebihan sebesar total
--    pencairan yang sudah disetujui. Nilai dihitung ulang dengan rumus yang
--    sama seperti aplikasi: (total_price - biaya layanan 5000) * 85%, dengan
--    50% tersedia langsung dan sisanya dilepas setelah trip selesai.
WITH earnings AS (
    SELECT
        b.provider_id,
        SUM(GREATEST(b.total_price - CASE WHEN b.total_price < 5000 THEN 0 ELSE 5000 END, 0) * 85 / 100) AS provider_net,
        SUM(
            CASE
                WHEN b.status = 'COMPLETED' OR b.trip_date < NOW() - INTERVAL '24 hours'
                THEN 0
                ELSE GREATEST(b.total_price - CASE WHEN b.total_price < 5000 THEN 0 ELSE 5000 END, 0) * 85 / 100
                     - (GREATEST(b.total_price - CASE WHEN b.total_price < 5000 THEN 0 ELSE 5000 END, 0) * 85 / 100) / 2
            END
        ) AS still_held
    FROM bookings b
    WHERE b.status IN ('PAID', 'CONFIRMED', 'COMPLETED')
    GROUP BY b.provider_id
),
settled AS (
    SELECT p.provider_id, COALESCE(SUM(p.amount), 0) AS disbursed
    FROM payouts p
    WHERE p.status = 'APPROVED'
    GROUP BY p.provider_id
)
UPDATE provider_balances pb
SET
    available_balance = GREATEST(
        COALESCE(e.provider_net, 0) - COALESCE(e.still_held, 0) - COALESCE(s.disbursed, 0),
        0
    ),
    held_balance = COALESCE(e.still_held, 0),
    total_earned = COALESCE(e.provider_net, 0),
    updated_at = NOW()
FROM (SELECT provider_id FROM provider_balances) AS target
LEFT JOIN earnings e ON e.provider_id = target.provider_id
LEFT JOIN settled s ON s.provider_id = target.provider_id
WHERE pb.provider_id = target.provider_id;

COMMIT;

-- Setelah migrasi, periksa log aplikasi untuk baris "[Rekonsiliasi Saldo]".
-- Seluruh provider harus dilaporkan konsisten. Provider yang masih berselisih
-- perlu ditelusuri manual sebelum pencairan otomatis diaktifkan.
