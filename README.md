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

## Tanggal keberangkatan per tipe paket

**Open Trip** berangkat bersama-sama pada jadwal yang ditetapkan mitra, sehingga
satu tanggal dibagi banyak pemesan dan dikendalikan `quotaMin`/`quotaMax`.

**Tipe lain** (Private Trip, Honeymoon, Family, Corporate) bersifat **eksklusif**:

- Mitra memilih sendiri tanggal mana saja yang dibuka, paling jauh **enam bulan**
  ke depan, lewat Partner Hub → Kelola Paket → edit paket.
- Pelanggan hanya dapat memilih dari tanggal tersebut; tanggal lain tidak dapat
  diklik di kalender dan ditolak backend.
- Begitu seorang pelanggan memesan, **seluruh rentang menginap terkunci** — paket
  4D3N menahan empat hari sekaligus, bukan hanya tanggal berangkat — dan tidak
  dapat dipilih pelanggan lain. Kunci ini juga berlaku selama pesanan masih
  menunggu pembayaran, dan terlepas kembali bila pesanan kedaluwarsa atau batal.
- Mitra tidak dapat menutup tanggal yang sudah terkunci pesanan.

Status tanggal adalah turunan dari tabel `bookings`, dihitung oleh fungsi yang
sama dengan `quota_used`, sehingga tidak ada dua sumber kebenaran yang bisa
menyimpang. Paket lama yang mitranya belum pernah mengatur tanggal tetap memakai
rentang `startDate`–`endDate` seperti sebelumnya, tetapi penguncian tanggal sudah
langsung berlaku.

## Keberangkatan yang tidak dapat dijalankan

Hanya paket bertipe **Open Trip** yang tunduk pada kuota minimal keberangkatan;
private trip, honeymoon, family, dan corporate berangkat atas permintaan pemesan.

Pada **H-3 pukul 00:01** terhadap tanggal jalan, bila kursi terisi masih di bawah
`quotaMin` paket, sistem mengirim notifikasi dan email ke mitra berisi tiga pilihan:

| Pilihan | Akibat |
| --- | --- |
| **Tetap berangkat** | Trip berjalan sesuai jadwal; pelanggan menerima notifikasi kepastian berangkat. |
| **Batalkan** | Seluruh pesanan menjadi `REFUND_REQUIRED` dengan hak refund penuh, saldo mitra dibalik, dan admin menerima notifikasi untuk memproses pengembalian dana. |
| **Jadwalkan ulang** | Mitra menetapkan tanggal pengganti. Setiap pelanggan menerima notifikasi dan email untuk **menerima** atau **menolak**. Menerima berarti jadwal diperbarui; menolak mengalirkan pesanan ke alur refund. |

Kuota dihitung per **keberangkatan** (kombinasi paket dan tanggal jalan), bukan
per paket, karena satu open trip dapat memiliki banyak tanggal jalan. Tawaran
jadwal pengganti yang tidak dijawab sampai tanggal keberangkatan semula otomatis
diperlakukan sebagai penolakan agar dana pelanggan tidak menggantung.

Pemeriksaan dijalankan oleh job latar belakang, sehingga `ENABLE_BACKGROUND_JOBS`
wajib bernilai `true` agar aturan ini berjalan.

### Pembatalan karena keadaan kahar (force majeure)

Berbeda dengan aturan kuota yang hanya berlaku untuk Open Trip dan terikat batas
H-3, mitra dapat menyatakan **keadaan kahar** untuk **seluruh tipe paket**, kapan
saja sampai hari keberangkatan berakhir — termasuk pada hari-H, yang justru
paling sering terjadi. Menu tersedia di Partner Hub → **Booking**.

Mitra wajib mengisi alasan (minimal 10 karakter) dan satu tanggal pengganti.
Alasan tersimpan sebagai jejak audit dan ikut dikirim ke pelanggan. Setiap
pelanggan pada keberangkatan itu lalu menerima notifikasi dan email berisi dua
pilihan yang sama seperti alur kuota:

- **Terima tanggal pengganti** — jadwal booking diperbarui dan jadwal pelepasan
  dana ikut bergeser mengikuti tanggal baru.
- **Tolak** — booking menjadi `REFUND_REQUIRED` dengan hak refund penuh dan admin
  menerima notifikasi untuk memprosesnya.

Pelanggan memiliki waktu menjawab minimal 48 jam sejak tawaran dikirim; tanpa
jawaban sampai batas itu, pesanan otomatis diteruskan ke pengembalian dana.
Tanggal pengganti untuk keadaan kahar tidak dibatasi periode operasional paket,
karena paket berjadwal satu hari akan menolak semua tanggal pengganti bila aturan
itu dipaksakan.

## Pencairan dana mitra

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
