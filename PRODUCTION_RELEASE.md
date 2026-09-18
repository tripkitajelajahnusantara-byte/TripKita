# Checklist Rilis Production TripKita

## Menjalankan stack lokal dengan Docker

Jalankan dari root repository:

```bash
docker compose up --build
```

Web tersedia di `http://localhost:8081`, API di `http://localhost:8080`, dan PostgreSQL di `localhost:5432`. Database dan upload disimpan di named volume agar tetap ada setelah container dihentikan. Untuk mengisi data demo lokal, jalankan dengan `SEED_DB=true`; seeding tetap tidak dapat aktif saat `APP_ENV=production`.

Konfigurasi production dipisahkan ke `docker-compose.prod.yml` dan tetap membutuhkan `backend/.env` serta `VITE_API_BASE_URL` yang eksplisit.

## Wajib sebelum deploy

0. **Bersihkan riwayat Git.** Berkas berikut pernah ter-commit dan sudah dilepas dari
   index, tetapi masih ada di dalam riwayat Git sehingga tetap dapat diambil siapa pun
   yang memiliki akses repository:
   - `backend/uploads/*.pdf` dan `backend/uploads/*.png` — dokumen verifikasi mitra
     (KTP/SIUP) berisi data pribadi.
   - `ktp.jpg` di root repository.
   - `backend/tripkita-provider.exe` dan `backend/tripkita-provider-test.exe` (±79 MB).

   Lakukan pembersihan riwayat (`git filter-repo` atau BFG), paksa push, dan minta
   seluruh kontributor melakukan clone ulang. Perlakukan dokumen identitas tersebut
   sebagai sudah terekspos: lakukan penggantian dokumen melalui prosedur yang
   disetujui pemilik data, dan catat sebagai insiden data pribadi.
1. Rotasi seluruh secret yang pernah tersimpan di source/repository: database, JWT, Xendit, Google OAuth, dan SMTP.
2. Isi environment production dari `backend/.env.example`. Pastikan `APP_ENV=production`, `SEED_DB=false`, dan `ENABLE_DEV_MOCKS=false`.
3. Jalankan backup database, lalu terapkan migrasi berikut satu kali, berurutan:
   - `backend/database/migrations/001_production_hardening.sql`
   - `backend/database/migrations/003_refund_audit_trail.sql` — tabel jejak audit refund.
     Booking yang sudah berstatus `REFUNDED` sebelum migrasi **tidak** dibuatkan catatan
     otomatis, karena nominal dan bukti transfernya tidak diketahui sistem dan menebaknya
     akan menciptakan jejak palsu. Query untuk mendaftar refund lama yang perlu
     direkonsiliasi manual ada di bagian akhir berkas migrasi tersebut.
   - `backend/database/migrations/002_automated_payouts.sql` — menambahkan kolom penelusuran
     pencairan dan **menyelaraskan ulang `provider_balances`**. Sebelum versi ini, persetujuan
     pencairan tidak pernah memotong buku besar, sehingga `available_balance` menggelembung
     sebesar total pencairan yang sudah disetujui. Setelah migrasi, periksa log
     `[Rekonsiliasi Saldo]`; seluruh provider harus dilaporkan konsisten sebelum lanjut.
   - `backend/database/migrations/004_xendit_payout_v3.sql` — menambahkan metadata routing
     Xendit Payouts v3. Kolom `channel_code` lama tetap dipertahankan untuk audit.
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

`DB_MAX_OPEN_CONNS` dan `DB_MAX_IDLE_CONNS` menentukan ukuran connection pool. Bagi batas koneksi penyedia database dengan jumlah replica aplikasi sebelum menetapkan nilainya, agar replica tambahan tidak menghabiskan kuota koneksi.

Gunakan `/readyz` sebagai health check load balancer (bukan `/healthz`) supaya trafik tidak diarahkan ke instance yang belum dapat menghubungi database. Beri waktu shutdown minimal 30 detik pada orchestrator; proses menyelesaikan permintaan yang berjalan, menghentikan job latar belakang, lalu menutup koneksi database.

### Pencairan otomatis (opsional, default mati)

`ENABLE_AUTOMATIC_PAYOUT` menentukan cara dana mitra dikirim:

- **`false` (default)** — admin menyetujui pengajuan, lalu mentransfer sendiri lewat bank dan
  mencatat buktinya. Ini perilaku yang sudah berjalan selama ini.
- **`true`** — persetujuan admin langsung mengirim instruksi ke Xendit Payouts API v3. Pengajuan
  berhenti di status `PROCESSING` sampai callback menyatakan dana sampai (`APPROVED`) atau gagal
  (`FAILED`, saldo otomatis dikembalikan ke mitra).

#### Uji di staging lebih dulu

Gunakan `backend/.env.staging.example` sebagai dasar konfigurasi staging. Berkas itu sudah
menyalakan `ENABLE_AUTOMATIC_PAYOUT` dan **wajib** memakai Development API Key Xendit
(`xnd_development_...`); dengan kunci tersebut permintaan tidak pernah menyentuh jaringan bank.

Jalankan skrip uji integrasi:

```bash
export API_BASE_URL="https://staging-api.example.com/api/v1"
export DATABASE_URL="postgres://user:pass@host:5432/tripkita_staging?sslmode=require"
export ADMIN_EMAIL="admin@tementrip.id"
export ADMIN_PASSWORD="..."
bash backend/scripts/test_staging_payout.sh
```

Skrip menjalankan lima skenario Xendit test mode (satu sukses, empat ragam kegagalan) dan
memeriksa status pengajuan **serta saldo buku besar** setelah tiap skenario. Yang dibuktikan
bukan sekadar API tidak error, melainkan bahwa dana yang gagal dikirim benar-benar kembali ke
saldo mitra. Skrip keluar dengan kode 1 bila ada satu saja skenario gagal.

Bila pencairan lama menggantung di `PROCESSING`, periksa delivery log callback Xendit dan log
`[Payout Rekonsiliasi]`; job akan menanyakan ulang status gateway selama background jobs aktif.

#### Sebelum menyalakan di production

1. Skrip uji staging lulus seluruhnya (5 dari 5).
2. Aktifkan produk Payouts dan izin API key **MONEY-OUT** di dashboard Xendit, lalu siapkan **saldo mengendap** yang cukup —
   pencairan ditarik dari saldo Xendit, bukan dari kas bank Anda. Tetapkan siapa yang memantau
   dan mengisi ulang saldo, serta ambang peringatannya.
3. Arahkan callback payout Xendit production ke `/api/v1/public/webhooks/xendit/payout` dan isi
   `XENDIT_PAYOUT_WEBHOOK_TOKEN` dengan token production (berbeda dari staging).
4. Pastikan `[Rekonsiliasi Saldo]` melaporkan seluruh provider konsisten. Selisih apa pun harus
   dituntaskan lebih dulu; pencairan otomatis akan memindahkan uang berdasarkan angka ini.
5. Periksa data rekening seluruh mitra aktif. **Test mode tidak memvalidasi nomor rekening ke
   bank sungguhan**, sehingga kesalahan ketik hanya akan terlihat di production. Selama Bank
   Account Validation API belum dipasang, verifikasi manual adalah satu-satunya pengaman.
6. Pastikan nama bank seluruh mitra dikenali oleh `backend/services/bank_channel.go` dan routing
   SWIFT/BIC-nya cocok dengan Dynamic Schema Xendit untuk akun production. Nama yang tidak
   terpetakan akan menolak pencairan otomatis, bukan menebak. Query pemeriksaan:

   ```sql
   SELECT DISTINCT bank_name FROM providers
   WHERE role = 'PROVIDER' AND status = 'APPROVED' AND bank_name <> '';
   ```

7. Pastikan `ENABLE_BACKGROUND_JOBS="true"`; job ini merekonsiliasi payout `PROCESSING` ketika
   respons API atau callback tidak sampai.
8. Baru setelah semuanya terpenuhi, set `ENABLE_AUTOMATIC_PAYOUT="true"` pada environment
   production. Default di kode maupun di `.env.example` sengaja dibiarkan `false`, sehingga
   pencairan otomatis tidak pernah menyala hanya karena deploy.
9. Lakukan satu pencairan nyata bernilai kecil ke rekening yang Anda kuasai, lalu cocokkan mutasi
   bank dengan status pengajuan di aplikasi sebelum melayani mitra sungguhan.

#### Bila perlu dimatikan kembali

Set `ENABLE_AUTOMATIC_PAYOUT="false"` lalu deploy ulang. Pengajuan yang masih `PROCESSING` tetap
menunggu callback dan akan selesai sendiri; pengajuan baru kembali ke jalur transfer manual.
Tidak ada data yang hilang, dan saldo tidak perlu disesuaikan.

Nama bank mitra diterjemahkan ke routing SWIFT/BIC Xendit v3 oleh `backend/services/bank_channel.go`.
Nama yang tidak dikenali **menolak** pencairan otomatis alih-alih menebak, jadi tambahkan
pemetaannya atau proses pengajuan tersebut secara manual.

### Refund

Refund masih dikirim manual, tetapi kini **wajib dicatat**. Admin harus mengisi nominal yang
benar-benar dikembalikan, metodenya, dan nomor referensi transfer; sistem mencatat email admin
pemroses beserta waktunya, dan satu booking hanya dapat dicatat sekali. Nominal tidak boleh
melebihi hak refund pelanggan.

Otomatisasi refund hanya mungkin sebagian. `POST /refunds` di Xendit menerima `invoice_id`, yang
sudah tersimpan pada setiap booking, sehingga kanal kartu, e-wallet, dan QRIS dapat dikembalikan
lewat API tanpa data tambahan. Transaksi **Virtual Account dan retail outlet tidak dapat
di-refund** lewat API; pengembalian untuk kanal tersebut harus dikirim sebagai payout ke rekening
pelanggan, dan rekening pelanggan belum dikumpulkan di alur pembatalan.

`ENABLE_BACKGROUND_JOBS` menjalankan expiry invoice, pelepasan kuota, penyelesaian trip, pelepasan settlement, dan rekonsiliasi saldo secara idempoten menggunakan lock database. Jangan menonaktifkannya tanpa worker pengganti, karena lifecycle booking dan saldo akan berhenti.

Sebelum mengedaluwarsakan booking yang belum dibayar, job memastikan dulu status invoice ke Xendit. Ini mencegah kasus pembayaran diterima tetapi webhook tidak pernah sampai, yang sebelumnya membuat booking terbayar ikut dikedaluwarsakan. Bila gateway tidak dapat dihubungi, booking ditahan (tidak dikedaluwarsakan) sampai statusnya bisa dipastikan.

## Pemeriksaan manual setelah deploy

- `/healthz` merespons 200 dan `/readyz` merespons 200.
- Login admin/provider/customer bekerja dan akun provider yang belum approved ditolak dari endpoint operasional.
- Harga checkout tidak berubah saat nilai harga dimanipulasi dari browser.
- Booking baru hanya menjadi paid setelah callback Xendit tervalidasi.
- Dokumen legal tidak dapat dibuka tanpa token admin/provider pemilik.
- Penyelesaian refund menolak permintaan tanpa nominal, metode, dan nomor referensi transfer; catatan yang tersimpan memuat email admin pemroses.
- Payout kedua yang melebihi saldo ditolak.
- Setelah satu pencairan disetujui, `availableBalance` pada ringkasan keuangan mitra ikut berkurang, dan `ledgerConsistent` bernilai `true`.
- Bila pencairan otomatis aktif: pengajuan yang disetujui masuk status `PROCESSING`, lalu berubah menjadi `APPROVED` setelah callback Xendit tiba. Pengajuan yang menetap di `PROCESSING` lebih dari beberapa menit menandakan callback tidak sampai.
- Pastikan checkout tidak menawarkan add-on; fitur ini sengaja dinonaktifkan sampai katalog dan harga add-on disimpan di database.
- Setiap respons membawa header `X-Request-ID`. Cocokkan nilai yang dilaporkan pengguna dengan baris `[HTTP] request_id=...` di log server saat menelusuri gangguan.
- Muat ulang halaman web setelah deploy dan pastikan aset yang diambil adalah versi baru; `index.html` disajikan dengan `Cache-Control: no-cache` sedangkan berkas di `/assets/` bersifat immutable.
- Buka halaman detail paket lalu buka pemilih tanggal minimal satu kali untuk memastikan modal kalender tampil (sebelumnya modal ini melanggar aturan hook React dan dapat menggagalkan render halaman).

## Catatan risiko operasional

- File lama di `backend/uploads` yang pernah masuk Git harus dihapus dari history Git dan dianggap telah terekspos. Lakukan rotasi/penggantian dokumen identitas terkait melalui prosedur yang disetujui pemilik data.
- Rate limit aplikasi hanya perlindungan lapis kedua. Tambahkan WAF/rate limit di reverse proxy untuk login, upload, booking, dan webhook.
- Sebelum menerima transaksi nyata, lakukan satu booking nominal kecil end-to-end dan cocokkan nilai Xendit, booking, settlement, payout summary, pembatalan, serta refund.
