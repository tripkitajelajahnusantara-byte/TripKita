# Availability paket non-Open Trip (web dan backend)

Perubahan hanya berlaku pada Private Trip, Honeymoon, Family/Family Trip, dan Corporate/Corporate Trip. Open Trip mempertahankan jadwal, kuota peserta bersama, timestamp checkout, dan perhitungan akhir perjalanan sebelumnya. Perubahan mobile dari iterasi awal telah ditarik kembali.

## Perilaku

- Provider membuka availability dengan memilih tanggal satu per satu atau beberapa rentang terpisah, sampai tiga bulan kalender ke depan. Hari yang tidak dibuka tidak dapat dipilih customer. Field Keterangan Jadwal Tambahan hanya tetap ada pada Open Trip.
- Daftar availability eksplisit disimpan bersama paket secara atomik. Tidak ada fallback yang menganggap semua tanggal terbuka jika daftar kosong. Rentang start/end adalah batas kalender, bukan pengganti daftar availability.
- Customer memilih awal perjalanan; akhir mengikuti durasi paket. Setiap hari perjalanan harus tersedia. Aturan pemesanan H+7 yang sudah ada tetap berlaku untuk non-Open Trip.
- Satu periode = satu booking eksklusif untuk provider. Jumlah peserta tetap mengikuti minimum/maksimum provider dan harga per peserta, tetapi tidak menghabiskan kapasitas periode lainnya.
- Jika Provider X menerima booking 15–17 Oktober, tanggal tersebut juga dikunci di seluruh paket non-Open Trip milik Provider X. Provider lain tetap tersedia. Tanggal 18–20 Oktober tetap bisa dipesan jika dibuka provider.
- Backend mengunci baris provider sebelum paket sehingga dua checkout pada paket berbeda tidak dapat menerima periode yang beririsan secara bersamaan. Pembayaran pending juga menahan tanggal; pembatalan/expired melepasnya melalui alur status yang sudah ada.
- Endpoint katalog menggabungkan booking aktif provider ke kalender setiap paket. Kalender berubah kembali ketika booking dibatalkan/expired atau dijadwalkan ulang.
- Checkout non-Open Trip menggunakan tanggal ISO dan WIB. Perjalanan N hari mengunci tepat N tanggal. Data booking historis tidak diubah otomatis.
- Tidak ada migrasi baru untuk kalender. Paket lama tanpa availability eksplisit perlu dibuka/diedit dan disimpan oleh provider.

## Validasi

`go test ./...`, build web, tes Node, serta lint komponen kalender. Tes regresi mencakup kuota Open Trip tetap sama, kapasitas non-Open Trip per booking, konflik lintas paket pada provider yang sama, provider lain tetap tersedia, dan transaksi penyimpanan kalender.

Belum dideploy dan tidak ada transaksi pembayaran produksi yang dijalankan.
