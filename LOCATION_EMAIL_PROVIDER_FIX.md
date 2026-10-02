# Pengaktifan perbaikan lokasi, email, dan provider

## Email

Pemeriksaan lokal menemukan `SMTP_PASS` masih berupa nilai contoh. Tidak ada
`EMAIL_API_KEY`, `BREVO_API_KEY`, atau `RESEND_API_KEY` di konfigurasi lokal.
Konfigurasi dan log hosting belum diverifikasi; pengiriman email nyata belum diuji.

Backend mendukung API HTTPS Brevo/Resend dan SMTP. Untuk hosting yang memblokir
SMTP, set `EMAIL_API_PROVIDER=brevo` atau `resend`, `EMAIL_API_KEY` yang valid,
dan `EMAIL_FROM` berupa pengirim terverifikasi. Alternatif: set `BREVO_API_KEY`
atau `RESEND_API_KEY`; aplikasi memilih layanan otomatis. Jika memakai keduanya,
pilih `EMAIL_API_PROVIDER` secara eksplisit. Jangan memasukkan secret ke Git.

API key tidak dikenal tanpa provider sekarang menghasilkan pesan konfigurasi;
tidak lagi diam-diam memakai SMTP. Password SMTP contoh yang tidak dipakai tidak
lagi menggagalkan startup ketika API HTTPS sudah dikonfigurasi.

Setelah deploy, gunakan kirim ulang email pada satu booking uji di panel admin,
lalu cek penerimaan dan log provider email. Jangan menggunakan booking customer
nyata untuk percobaan. Railway Free/Trial/Hobby memblokir outbound SMTP:
https://docs.railway.com/networking/outbound-networking

## Titik kumpul Google Maps

Untuk pencarian nama gedung/alamat dan peta Google di form, isi
`VITE_GOOGLE_MAPS_API_KEY` sebelum build frontend. Aktifkan Maps JavaScript API,
Places API (New), serta billing pada Google Cloud. Batasi key browser berdasarkan
HTTP referrer domain frontend dan API yang dipakai. Opsional:
`VITE_GOOGLE_MAPS_MAP_ID` untuk map ID produksi. Rebuild frontend setelah mengubah
variabel Vite; kredensial OAuth Google tidak dapat menggantikan Maps API key.

https://developers.google.com/maps/documentation/javascript/place-search

Tanpa key, peta OpenStreetMap tetap tersedia. Provider dapat membuka Google Maps,
klik kanan pada titik yang tepat, salin pasangan latitude/longitude, lalu pilih
**Gunakan Titik**. Tautan Google Maps lengkap yang memuat koordinat pin juga
didukung. Tautan pendek dan koordinat kamera `@` tidak dianggap sebagai pin.
Pencarian alamat selalu meminta pemilihan hasil, tidak langsung menganggap hasil
pertama benar. Provinsi destinasi tidak lagi otomatis ditambahkan ke alamat titik
kumpul karena keduanya bisa berbeda. Mengubah alamat membatalkan hasil pencarian
lama dan mengosongkan pin sampai pengguna memilih kembali.

## Soft delete provider

Jalankan `backend/database/migrations/018_provider_soft_delete.sql` pada database
target sebelum deploy backend. Dengan `RUN_MIGRATIONS=true`, startup menambah
kolom dan menjalankan backfill setara. Migrasi hanya mengonversi penonaktifan lama
yang memiliki catatan admin spesifik, bukan semua provider yang ditolak.

**Nonaktifkan Provider** menetapkan `DISABLED` dan `deleted_at`, mencabut sesi,
mengubah seluruh paket menjadi `Nonaktif`, serta mencatat riwayat dalam satu
transaksi. Paket tidak tampil di publik dan tidak bisa dipesan atau diterbitkan
provider yang dinonaktifkan. Login password dan Google sama-sama ditolak.
Data booking, keuangan, dan riwayat tetap disimpan.

Admin dapat melihat akun pada tab **Dinonaktifkan** dan memulihkan akun melalui
persetujuan. Paket tetap `Nonaktif` setelah akun dipulihkan; pemulihan akun tidak
otomatis menerbitkan kembali paket lama.
