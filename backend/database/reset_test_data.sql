-- ============================================================
-- SCRIPT RESET DATA TESTING TRIPKITA (PRODUKSI / STAGING READY)
-- Perintah ini menghapus semua data transaksi percobaan/testing,
-- membersihkan duplikat paket & akun tes, dan mempertahankan Master Data.
-- ============================================================

-- 1. Bersihkan semua tabel transaksi & riwayat pengujian
TRUNCATE TABLE 
    bookings, 
    reviews, 
    payouts, 
    held_settlements, 
    notifications, 
    provider_balances, 
    provider_status_histories 
RESTART IDENTITY CASCADE;

-- 2. Reset quota_used pada seluruh paket wisata kembali ke 0
UPDATE packages SET quota_used = 0;

-- 3. Reset saldo provider balance ke 0
UPDATE provider_balances SET available_balance = 0, held_balance = 0;

-- 4. Hapus paket duplikat (menyimpan hanya 1 paket unik untuk setiap nama)
DELETE FROM packages WHERE id NOT IN (SELECT MIN(id) FROM packages GROUP BY name);

-- 5. Hapus akun pendaftaran tes pada tabel providers (menyimpan 8 Mitra Resmi & Admin)
DELETE FROM providers WHERE (role = 'CUSTOMER' OR business_name LIKE 'tes%' OR business_name = 'abc' OR business_category = 'EMPTY') AND role != 'ADMIN' AND email NOT LIKE 'partner%';

-- Selesai: Database sekarang bersih total dari duplikat dan data testing!
