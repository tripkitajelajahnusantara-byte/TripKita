BEGIN;

-- Piutang provider muncul bila DP sudah ditransfer tetapi booking kemudian
-- wajib direfund penuh. Nilainya tidak boleh hilang karena clamp saldo ke nol;
-- pendapatan berikutnya melunasi piutang ini sebelum menjadi saldo tersedia.
ALTER TABLE provider_balances
    ADD COLUMN IF NOT EXISTS debt_balance BIGINT NOT NULL DEFAULT 0;

-- Data lama yang pernah dibayar tetapi belum memiliki paid_at tetap dikenali
-- sebagai transaksi berbayar bila catatan pembagian dananya sudah terbentuk.
UPDATE bookings AS b
SET paid_at = COALESCE(b.updated_at, b.created_at, NOW())
WHERE b.paid_at IS NULL
  AND EXISTS (
      SELECT 1 FROM held_settlements hs WHERE hs.booking_id = b.id
  );

COMMIT;
