# Checklist Rilis Production TripKita

## Menjalankan stack lokal dengan Docker

Jalankan dari root repository:

```bash
docker compose up --build
```

Web tersedia di `http://localhost:8081`, API di `http://localhost:8080`, dan PostgreSQL di `localhost:5432`. Database dan upload disimpan di named volume agar tetap ada setelah container dihentikan. Untuk mengisi data demo lokal, jalankan dengan `SEED_DB=true`; seeding tetap tidak dapat aktif saat `APP_ENV=production`.

Konfigurasi production dipisahkan ke `docker-compose.prod.yml` dan tetap membutuhkan `backend/.env` serta `VITE_API_BASE_URL` yang eksplisit.

## Wajib sebelum deploy

1. Rotasi seluruh secret yang pernah tersimpan di source/repository: database, JWT, Xendit, Google OAuth, dan SMTP.
2. Isi environment production dari `backend/.env.example`. Pastikan `APP_ENV=production`, `SEED_DB=false`, dan `ENABLE_DEV_MOCKS=false`.
3. Jalankan backup database, lalu terapkan `backend/database/migrations/001_production_hardening.sql` satu kali.
4. Atur callback Xendit ke `/api/v1/public/webhooks/xendit` dan samakan verification token dengan `XENDIT_WEBHOOK_TOKEN`.
5. Gunakan persistent private volume/object storage untuk direktori `/app/uploads`. Jangan expose direktori ini langsung dari CDN atau web server.
6. Pastikan frontend menggunakan `VITE_API_BASE_URL=https://<api-domain>/api/v1` bila tidak memakai reverse proxy `/api/v1`.
7. Set `ALLOWED_ORIGINS` hanya ke domain frontend resmi dan isi `TRUSTED_PROXIES` hanya dengan CIDR proxy milik platform deployment.

## Nilai aman untuk rollout pertama

```env
APP_ENV=production
RUN_MIGRATIONS=false
SEED_DB=false
ENABLE_DEV_MOCKS=false
ENABLE_BACKGROUND_JOBS=true
DB_SSLMODE=require
```

`ENABLE_BACKGROUND_JOBS` menjalankan expiry invoice, pelepasan kuota, penyelesaian trip, dan pelepasan settlement secara idempoten menggunakan lock database. Jangan menonaktifkannya tanpa worker pengganti, karena lifecycle booking dan saldo akan berhenti.

## Pemeriksaan manual setelah deploy

- `/healthz` merespons 200 dan `/readyz` merespons 200.
- Login admin/provider/customer bekerja dan akun provider yang belum approved ditolak dari endpoint operasional.
- Harga checkout tidak berubah saat nilai harga dimanipulasi dari browser.
- Booking baru hanya menjadi paid setelah callback Xendit tervalidasi.
- Dokumen legal tidak dapat dibuka tanpa token admin/provider pemilik.
- Payout kedua yang melebihi saldo ditolak.
- Pastikan checkout tidak menawarkan add-on; fitur ini sengaja dinonaktifkan sampai katalog dan harga add-on disimpan di database.

## Catatan risiko operasional

- File lama di `backend/uploads` yang pernah masuk Git harus dihapus dari history Git dan dianggap telah terekspos. Lakukan rotasi/penggantian dokumen identitas terkait melalui prosedur yang disetujui pemilik data.
- Rate limit aplikasi hanya perlindungan lapis kedua. Tambahkan WAF/rate limit di reverse proxy untuk login, upload, booking, dan webhook.
- Sebelum menerima transaksi nyata, lakukan satu booking nominal kecil end-to-end dan cocokkan nilai Xendit, booking, settlement, payout summary, pembatalan, serta refund.
