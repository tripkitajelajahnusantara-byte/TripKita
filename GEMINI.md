# Rules & Guidelines for TripKita Project

## 1. Fokus Hanya pada Perubahan Kode (Code Changes Only)
* **TIDAK BOLEH** menjalankan pengujian otomatis, membuka browser secara otomatis menggunakan subagent browser (`browser_subagent`), atau melakukan web testing sendiri kecuali diminta secara eksplisit oleh User.
* Pihak QA adalah User. User akan melakukan pengujian manual. Tugas Anda adalah mengubah kode dengan benar secara sintaksis dan struktur, lalu menyerahkannya ke User untuk ditest.

## 2. Batasan Waktu Proses (Maksimal 3 Menit)
* Jangan menjalankan perintah (command) atau proses yang memakan waktu lama.
* Setiap perintah/proses yang berjalan lebih dari 3 menit harus dibatalkan (cancel/kill) untuk memeriksa apa yang menyebabkan keterlambatan tersebut. Prioritaskan efisiensi kredit dan waktu.

## 3. Konsep dan Alur Migrasi Mobile ke Web
* Konsep, alur, dan logika fitur di website (`provider-web`) adalah **sama persis** dengan yang ada di aplikasi mobile (`customer-mobile`). Tidak ada perubahan konsep/alur.
* Rujukan utama untuk alur dan logika bisnis adalah kode Dart di folder `customer-mobile`. Gunakan logika tersebut sebagai panduan saat memindahkan fitur ke React/TypeScript di folder `provider-web`.
