# TemenTrip

Platform pemesanan open trip yang menghubungkan wisatawan dengan penyedia wisata
terverifikasi di Indonesia.

## Struktur repository

| Direktori | Isi |
| --- | --- |
| `backend/` | API Go (Gin + GORM + PostgreSQL) |
| `provider-web/` | Aplikasi web React + TypeScript (Vite) untuk customer, mitra, dan admin |
| `customer-mobile/` | Aplikasi Flutter untuk customer |

## Menjalankan stack lokal

```bash
docker compose up --build
```

- Web: <http://localhost:8081>
- API: <http://localhost:8080>
- PostgreSQL: `localhost:5432`

Database dan direktori unggahan disimpan pada named volume sehingga data tetap ada
setelah container dihentikan. Untuk mengisi data demo, jalankan dengan `SEED_DB=true`
beserta `DEV_ADMIN_PASSWORD` dan `DEV_PROVIDER_PASSWORD`. Seeding tidak pernah dapat
aktif saat `APP_ENV=production`.

## Pengembangan tanpa Docker

Backend:

```bash
cd backend
cp .env.example .env   # lalu isi nilainya
go run .
```

Web:

```bash
cd provider-web
npm ci
npm run dev
```

## Perintah kualitas

Seluruh perintah di bawah ini dijalankan juga oleh CI (`.github/workflows/ci.yml`)
pada setiap push dan pull request; jalankan secara lokal sebelum membuka PR.

```bash
# Backend
cd backend
gofmt -l .        # tidak boleh ada keluaran
go vet ./...
go test ./...

# Web
cd provider-web
npm run lint
npm run build
```

## Konfigurasi

Seluruh konfigurasi backend dibaca dari environment variable; daftar lengkap beserta
nilai contoh ada di [`backend/.env.example`](backend/.env.example). Konfigurasi
divalidasi saat startup dan proses akan berhenti bila nilai untuk production tidak
aman (secret lemah, database tanpa TLS, URL non-HTTPS, origin CORS dengan path).

Frontend membaca `VITE_API_BASE_URL` saat build. Bila kosong, aplikasi memakai
`/api/v1` pada host non-localhost, sehingga cocok untuk deployment di belakang
reverse proxy.

## Alur uang

Pelanggan membayar **penuh di muka** melalui satu invoice Xendit; tidak ada uang muka parsial.
Dari nominal yang dibayar, platform mengambil biaya layanan tetap dan komisi, lalu sisa bagian
mitra dibagi dua: separuh tersedia untuk dicairkan segera, separuhnya ditahan sampai trip selesai.

Pencairan ke mitra berjalan manual secara default (admin mentransfer lalu mencatat bukti) dan
dapat dialihkan ke Xendit Payouts API lewat `ENABLE_AUTOMATIC_PAYOUT`. Refund selalu manual,
tetapi wajib dicatat beserta nominal, metode, referensi transfer, dan admin pemrosesnya.

Langkah menguji pencairan DP dan pelunasan secara lokal, beserta daftar periksanya,
ada di [`PANDUAN_UJI_PENCAIRAN.md`](PANDUAN_UJI_PENCAIRAN.md).

Untuk menguji pencairan otomatis, pakai [`backend/.env.staging.example`](backend/.env.staging.example)
dan jalankan [`backend/scripts/test_staging_payout.sh`](backend/scripts/test_staging_payout.sh)
terhadap Xendit test mode. Rinciannya ada di [`PRODUCTION_RELEASE.md`](PRODUCTION_RELEASE.md).

## Endpoint operasional

| Endpoint | Kegunaan |
| --- | --- |
| `GET /healthz` | Liveness; proses hidup |
| `GET /readyz` | Readiness; koneksi database dapat dipakai |

Gunakan `/readyz` sebagai health check load balancer agar trafik tidak diarahkan ke
instance yang databasenya belum siap. Setiap respons membawa header `X-Request-ID`
yang juga tercatat di log server, sehingga laporan gangguan dari pengguna dapat
ditelusuri ke baris log yang tepat.

## Deploy production

Langkah rilis, nilai environment yang wajib, dan pemeriksaan setelah deploy ada di
[`PRODUCTION_RELEASE.md`](PRODUCTION_RELEASE.md). Baca dokumen tersebut sebelum
melakukan deploy pertama.
