# Panduan Uji Pencairan DP & Pelunasan

Dokumen ini menjelaskan cara menguji alur pencairan dana mitra dari nol, memakai
data asli dari backend (tidak ada angka yang ditulis di kode antarmuka).

Untuk pengujian pencairan **otomatis** ke Xendit test mode, pakai
[`backend/scripts/test_staging_payout.sh`](backend/scripts/test_staging_payout.sh)
dan bagian "Pencairan otomatis" di [`PRODUCTION_RELEASE.md`](PRODUCTION_RELEASE.md).
Panduan di bawah ini menguji alur **manual** (default, `ENABLE_AUTOMATIC_PAYOUT=false`),
yaitu alur yang dipakai produksi saat ini.

---

## 1. Konsep uang yang diuji

Pelanggan membayar **penuh di muka** lewat satu invoice. Tidak ada uang muka
parsial dari sisi pelanggan. Istilah "DP" dan "pelunasan" mengacu pada pembagian
dana **milik mitra**, bukan cicilan pelanggan.

Dari setiap booking berbayar:

| Komponen | Rumus | Contoh (booking Rp 700.000) |
| --- | --- | --- |
| Biaya layanan tetap | Rp 5.000 | Rp 5.000 |
| Nilai paket | total − biaya layanan | Rp 695.000 |
| Komisi platform | 15% dari nilai paket | Rp 104.250 |
| **Total potongan platform** | komisi + biaya layanan | **Rp 109.250** |
| **Hak mitra (bersih)** | 85% dari nilai paket | **Rp 590.750** |
| **DP 50%** | hak mitra ÷ 2 | **Rp 295.375** — cair segera setelah lunas |
| **Pelunasan 50%** | sisanya | **Rp 295.375** — ditahan sampai trip selesai |

Rumus ini ada di satu tempat saja, yaitu `models.SplitBookingEarning` pada
[`backend/models/finance.go`](backend/models/finance.go). Ringkasan keuangan mitra,
buku besar saldo, dan data seed memakai fungsi yang sama.

**Kapan pelunasan terbuka:** saat `trip_end_date` booking sudah lewat. Job latar
belakang `AutoCompleteFinishedBookings` mengubah status booking menjadi
`COMPLETED` dan memindahkan saldo dari `held_balance` ke `available_balance`.

---

## 2. Menyiapkan lingkungan uji

```bash
cd TripKita
docker compose down -v          # WAJIB bila pernah menjalankan versi lama:
                                # skema booking berubah dan migrasi akan gagal
                                # di atas data lama
SEED_DB=true ENABLE_DEV_MOCKS=true ENABLE_BACKGROUND_JOBS=true docker compose up -d --build
```

- Web: <http://localhost:8081>
- API: <http://localhost:8080>

Akun bawaan seed (dari `DEV_ADMIN_PASSWORD` / `DEV_PROVIDER_PASSWORD` di
`docker-compose.yml`):

| Peran | Email | Password |
| --- | --- | --- |
| Admin | `admin@tementrip.id` | `TripKitaAdminLocal2026!` |
| Mitra | `partner@wisatanusantara.id` | `TripKitaProviderLocal2026!` |

Pastikan seed dan job berjalan:

```bash
curl -s http://localhost:8080/readyz
docker compose logs backend | grep "Rekonsiliasi Saldo"
# Harus: "8 provider diperiksa, seluruh saldo konsisten."
```

Kalimat "seluruh saldo konsisten" adalah pemeriksaan pertama Anda. Bila muncul
"SELISIH provider=...", buku besar dan hak cair tidak sepakat dan hasil uji di
bawah tidak dapat dipercaya.

---

## 3. Uji lewat antarmuka (cara paling mudah)

### Langkah 1 — Mitra mengisi rekening tujuan

1. Masuk sebagai mitra di <http://localhost:8081/#/provider/login>.
2. Buka **Profil Provider → Edit Profil → tab Legal & Rekening**.
3. Isi **Nama Bank**, **Nomor Rekening**, **Nama Pemilik Rekening**, lalu simpan.

Data rekening masuk sebagai **pending** dan rekening lama tetap dipakai sampai
admin menyetujuinya. Ini disengaja: perubahan rekening adalah titik rawan
penipuan.

> Uji negatif: coba ajukan pencairan sebelum rekening diisi. Harus ditolak dengan
> pesan "rekening bank tujuan belum diatur".

### Langkah 2 — Admin menyetujui data rekening

1. Masuk sebagai admin di <http://localhost:8081/#/admin/login>.
2. **Kelola Provider → Detail** pada mitra tersebut.
3. Pada blok data legal & rekening, tekan **Setujui**.

### Langkah 3 — Mitra melihat saldo

Buka **Keuangan & Saldo** pada panel mitra. Yang harus Anda lihat untuk data seed
mitra `partner@wisatanusantara.id` (satu booking Rp 700.000):

| Kolom | Nilai |
| --- | --- |
| Total Pendapatan (kotor) | Rp 700.000 |
| Potongan platform | Rp 109.250 |
| Pendapatan bersih | Rp 590.750 |
| **Saldo DP 50% siap cair** | **Rp 295.375** |
| **Pelunasan 50%** | **Rp 0** (masih ditahan, trip belum selesai) |
| Dana ditahan | Rp 295.375 |

### Langkah 4 — Mengajukan pencairan DP

1. Tekan **Ajukan Pencairan**, pilih jenis **DP 50%**, lalu kirim.
2. Pengajuan tersimpan dengan status `PENDING`.

Yang harus terjadi seketika:

- Saldo DP siap cair menjadi **Rp 0** (dana sudah dipesan, bukan hilang).
- Kolom "Pengajuan diproses" menjadi Rp 295.375.
- **Lonceng notifikasi admin bertambah satu**, berisi nama mitra, jenis
  pencairan, nominal, dan rekening tujuan.

> Uji negatif: ajukan pencairan DP kedua. Harus ditolak dengan
> "saldo DP belum mencukupi untuk dicairkan".

### Langkah 5 — Admin memproses pencairan

1. Pada panel admin, buka **Pencairan Dana Provider**.
2. Tekan **Setujui**, isi catatan berisi nomor referensi transfer sungguhan,
   misalnya `Transfer manual ref BCA-20260920-001`.

Yang harus terjadi:

- Status pengajuan menjadi `APPROVED`.
- `availableBalance` mitra **berkurang** sebesar nominal yang dicairkan.
- **Mitra menerima notifikasi** "Pencairan Dana Berhasil" beserta nominal dan
  rekening tujuan.
- Ringkasan keuangan mitra: "Total dicairkan" Rp 295.375, `ledgerConsistent`
  tetap `true`.

Coba juga jalur **Tolak**: saldo harus kembali utuh dan mitra menerima notifikasi
"Pengajuan Pencairan Ditolak" berisi alasan yang admin tulis.

### Langkah 6 — Membuka pelunasan 50%

Pelunasan baru tersedia setelah trip berakhir. Untuk memajukan waktu di
lingkungan lokal:

```bash
# Majukan tanggal trip mitra 2 ke masa lalu
docker compose exec -T postgres psql -U tripkita -d tripkita -c \
  "UPDATE bookings SET trip_date = NOW() - INTERVAL '3 days',
                       trip_end_date = NOW() - INTERVAL '1 day'
   WHERE provider_id = 2;"

# Job berjalan tiap jam; restart backend memicunya langsung
docker compose restart backend
sleep 12
docker compose logs backend | grep "Auto Complete"
# Harus: "1 booking diselesaikan dan settlement dilepas."
```

Muat ulang **Keuangan & Saldo**. Sekarang:

| Kolom | Nilai |
| --- | --- |
| Saldo DP 50% | Rp 0 (sudah dicairkan) |
| **Pelunasan 50% siap cair** | **Rp 295.375** |
| Dana ditahan | Rp 0 |

Ulangi Langkah 4–5 dengan jenis **Pelunasan 50%**.

---

## 4. Uji lewat API (untuk otomatisasi / CI)

```bash
API=http://localhost:8080/api/v1

# Token
PT=$(curl -s -X POST "$API/public/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"partner@wisatanusantara.id","password":"TripKitaProviderLocal2026!"}' \
  | python -c 'import sys,json;print(json.load(sys.stdin)["token"])')

AT=$(curl -s -X POST "$API/public/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@tementrip.id","password":"TripKitaAdminLocal2026!"}' \
  | python -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# 1. Ringkasan keuangan mitra
curl -s "$API/provider/payouts/summary" -H "Authorization: Bearer $PT"

# 2. Isi rekening, lalu admin menyetujuinya
curl -s -X PUT "$API/provider/profile" -H "Authorization: Bearer $PT" \
  -H 'Content-Type: application/json' \
  -d '{"bankName":"BCA","bankAccount":"1234567890","bankAccountName":"Wisata Bromo Nusantara"}'

curl -s -X POST "$API/admin/providers/2/verify-legal" -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' -d '{"action":"APPROVE","reason":""}'

# 3. Mitra mengajukan pencairan DP
curl -s -X POST "$API/provider/payouts/request" -H "Authorization: Bearer $PT" \
  -H 'Content-Type: application/json' -d '{"amount":295375,"type":"DP_50"}'

# 4. Admin melihat notifikasi dan daftar pengajuan
curl -s "$API/provider/notifications" -H "Authorization: Bearer $AT"
curl -s "$API/admin/payouts" -H "Authorization: Bearer $AT"

# 5. Admin memproses (ganti 1 dengan id pengajuan)
curl -s -X PUT "$API/admin/payouts/1/process" -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' \
  -d '{"status":"APPROVED","notes":"Transfer manual ref BCA-20260920-001"}'

# 6. Mitra memeriksa notifikasi dan saldo akhir
curl -s "$API/provider/notifications" -H "Authorization: Bearer $PT"
curl -s "$API/provider/payouts/summary" -H "Authorization: Bearer $PT"
```

Untuk pelunasan, ganti `"type":"DP_50"` menjadi `"type":"PELUNASAN_50"` setelah
menjalankan langkah "membuka pelunasan" di atas.

---

## 5. Daftar periksa

Uji dianggap lulus bila seluruh butir berikut benar.

**Perhitungan**

- [ ] Potongan platform = 15% nilai paket + Rp 5.000, bukan setengah harga kotor.
- [ ] DP dan pelunasan masing-masing tepat separuh hak mitra.
- [ ] `ledgerConsistent` bernilai `true` pada ringkasan keuangan.
- [ ] Log `[Rekonsiliasi Saldo]` melaporkan seluruh saldo konsisten.

**Aturan pencairan**

- [ ] Pencairan tanpa rekening tujuan ditolak.
- [ ] Pencairan melebihi saldo ditolak.
- [ ] Pencairan pelunasan sebelum trip berakhir ditolak.
- [ ] Pengajuan `PENDING` langsung mengurangi saldo siap cair (dana dipesan).
- [ ] Persetujuan admin mengurangi `availableBalance` di buku besar.
- [ ] Penolakan admin mengembalikan saldo utuh.
- [ ] Pengajuan yang sudah diproses tidak dapat diproses ulang.

**Notifikasi**

- [ ] Lonceng admin bertambah saat mitra mengajukan pencairan.
- [ ] Lonceng mitra bertambah saat admin menyetujui, menolak, atau pencairan gagal.
- [ ] Angka pada badge lonceng sesuai jumlah notifikasi belum dibaca.

**Jejak audit**

- [ ] Catatan admin (nomor referensi transfer) tersimpan pada pengajuan.
- [ ] Bukti PDF pencairan dapat diunduh mitra maupun admin.
- [ ] Ekspor Excel keuangan mitra berisi baris pencairan yang sama.

---

## 6. Masalah yang sering muncul

| Gejala | Sebab | Tindakan |
| --- | --- | --- |
| `docker compose up` gagal: `column "trip_end_date" ... contains null values` | Volume database berisi data dari skema lama | `docker compose down -v` lalu jalankan ulang |
| Pelunasan tidak pernah terbuka | `ENABLE_BACKGROUND_JOBS=false`, atau `trip_end_date` masih di masa depan | Aktifkan job, atau majukan `trip_end_date` seperti Langkah 6 |
| `ledgerConsistent: false` | Buku besar dan hak cair menyimpang | Jangan ditimpa manual; periksa log `[Rekonsiliasi Saldo]` dan telusuri pengajuan yang gagal separuh jalan |
| Pengajuan menetap di `PROCESSING` | Hanya terjadi saat pencairan otomatis aktif dan callback Xendit tidak sampai | Periksa delivery log callback Xendit dan log `[Payout Rekonsiliasi]` |
| Lonceng kosong padahal ada aktivitas | Sesi masuk sebagai peran lain | Lonceng mengambil notifikasi sesuai peran akun yang sedang masuk |

---

## 7. Sebelum menguji dengan uang sungguhan

Jangan pernah menyalakan `ENABLE_AUTOMATIC_PAYOUT=true` di production sebelum
`backend/scripts/test_staging_payout.sh` lulus seluruh skenario di staging dengan
kunci Xendit development. Saat flag itu aktif, persetujuan admin **langsung
memindahkan uang sungguhan**, dan test mode tidak memverifikasi nomor rekening ke
bank sungguhan — salah ketik rekening baru terlihat di production.
