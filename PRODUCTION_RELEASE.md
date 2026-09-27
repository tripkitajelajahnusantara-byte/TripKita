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
   - `backend/database/migrations/005_auth_identity_sessions.sql` — memisahkan kredensial ke
     tabel `users`, memindahkan akun lama, dan membuat sesi server-side yang dapat dicabut.
     Deploy backend dan frontend baru segera setelah migrasi. JWT versi lama sengaja tidak lagi
     diterima, sehingga seluruh pengguna harus login ulang satu kali setelah rilis ini. Kode reset
     password lama juga sengaja tidak dimigrasikan dan pengguna dapat meminta kode baru.
   - `backend/database/migrations/007_departures_and_package_dates.sql` — tabel `trip_departures`
     (keputusan mitra atas keberangkatan yang batal karena kuota atau keadaan kahar) dan
     `package_dates` (tanggal yang dibuka mitra untuk paket selain Open Trip, sekaligus
     penguncian satu tanggal satu pesanan). **Wajib dijalankan sebelum backend versi ini
     menerima trafik**: `package_dates` disentuh pada setiap perubahan status booking, sehingga
     tanpa tabel tersebut pembuatan booking dan daftar paket publik akan gagal. Migrasi ini juga
     memindahkan penamaan lama `open_trip_departures` bila ada, dan mengisi tanggal yang sudah
     terpakai pesanan berjalan agar kalender pelanggan langsung akurat.
   - `backend/database/migrations/008_booking_participants.sql` — tabel `booking_participants`
     berisi data setiap peserta (nama, HP, jenis kelamin, tanggal lahir, riwayat penyakit) yang
     diisi saat checkout. **Wajib dijalankan sebelum backend versi ini menerima trafik**: daftar
     booking mitra dan riwayat booking customer memuat tabel ini, sehingga tanpa tabel tersebut
     kedua halaman gagal dimuat. Tabel berisi data kesehatan, jadi RLS diaktifkan.
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

### Pencairan provider

Gunakan `ENABLE_AUTOMATIC_PAYOUT="false"` di staging dan production. Payout otomatis belum
didukung oleh integrasi iPaymu yang aktif dan aplikasi sengaja menolak startup bila flag ini
dinyalakan. Admin harus menyelesaikan transfer melalui bank, lalu mengunggah bukti transfer
sebelum pengajuan dapat ditandai `APPROVED`. Status tersebut langsung mengurangi buku besar,
jadi jangan menekan persetujuan sebelum mutasi bank benar-benar berhasil.

Sebelum melayani pencairan, pastikan data rekening mitra telah diverifikasi dan
`[Rekonsiliasi Saldo]` tidak melaporkan selisih. Jika booking wajib direfund setelah DP sudah
dicairkan, selisih dicatat sebagai penyesuaian saldo provider dan otomatis dipotong dari
pendapatan berikutnya.

### Refund

Refund masih dikirim manual, tetapi kini **wajib dicatat**. Admin harus mengisi nominal yang
benar-benar dikembalikan, metodenya, dan nomor referensi transfer; sistem mencatat email admin
pemroses beserta waktunya, dan satu booking hanya dapat dicatat sekali. Nominal wajib sama
dengan hak refund pelanggan; refund parsial tidak menutup status booking.

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
- Logout membuat token lama langsung mendapat 401, reset password mencabut seluruh sesi akun,
  dan lima percobaan password salah mengunci login akun selama 15 menit.
- Login Google berhasil dengan akun customer/provider, sedangkan email admin tidak dapat tertaut
  otomatis ke identitas Google baru.
- Harga checkout tidak berubah saat nilai harga dimanipulasi dari browser.
- Booking baru hanya menjadi paid setelah callback Xendit tervalidasi.
- Dokumen legal tidak dapat dibuka tanpa token admin/provider pemilik.
- Penyelesaian refund menolak permintaan tanpa nominal, metode, dan nomor referensi transfer; catatan yang tersimpan memuat email admin pemroses.
- Payout kedua yang melebihi saldo ditolak.
- Setelah satu pencairan disetujui, `availableBalance` pada ringkasan keuangan mitra ikut berkurang, dan `ledgerConsistent` bernilai `true`.
- Pencairan production saat ini wajib manual. Pengajuan hanya dapat disetujui setelah admin mengunggah bukti transfer; jangan menyalakan `ENABLE_AUTOMATIC_PAYOUT`.
- Pastikan checkout tidak menawarkan add-on; fitur ini sengaja dinonaktifkan sampai katalog dan harga add-on disimpan di database.
- Setiap respons membawa header `X-Request-ID`. Cocokkan nilai yang dilaporkan pengguna dengan baris `[HTTP] request_id=...` di log server saat menelusuri gangguan.
- Muat ulang halaman web setelah deploy dan pastikan aset yang diambil adalah versi baru; `index.html` disajikan dengan `Cache-Control: no-cache` sedangkan berkas di `/assets/` bersifat immutable.
- Buka halaman detail paket lalu buka pemilih tanggal minimal satu kali untuk memastikan modal kalender tampil (sebelumnya modal ini melanggar aturan hook React dan dapat menggagalkan render halaman).

## Catatan risiko operasional

- File lama di `backend/uploads` yang pernah masuk Git harus dihapus dari history Git dan dianggap telah terekspos. Lakukan rotasi/penggantian dokumen identitas terkait melalui prosedur yang disetujui pemilik data.
- Rate limit aplikasi hanya perlindungan lapis kedua. Tambahkan WAF/rate limit di reverse proxy untuk login, upload, booking, dan webhook.
- Sebelum menerima transaksi nyata, lakukan satu booking nominal kecil end-to-end dan cocokkan nilai Xendit, booking, settlement, payout summary, pembatalan, serta refund.
