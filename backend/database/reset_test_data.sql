-- ============================================================
-- SCRIPT RESET DATA TESTING TRIPKITA (PRODUKSI / STAGING READY)
-- Perintah ini menghapus semua data transaksi percobaan/testing
-- dan mempertahankan Master Data (Admin, Provider, Paket Wisata).
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

-- 3. Reset saldo provider balance ke 0 jika ada record
UPDATE provider_balances SET available_balance = 0, held_balance = 0;

-- Selesai: Database sekarang bersih dari data transaksi testing dan siap untuk pengujian QA!
