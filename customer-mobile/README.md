# Customer Mobile (Flutter)

Aplikasi customer TemenTrip. Alur dan tampilannya mengikuti web customer
(`provider-web`) dan memakai API backend yang sama.

## Menjalankan

```bash
cd customer-mobile
flutter pub get
flutter run --flavor staging --dart-define-from-file=env/staging.json
```

Flavor Android (`android/app/build.gradle`):

| Flavor | Package | Nama app | File env |
| --- | --- | --- | --- |
| `staging` | `com.tementrip.mobileapp.staging` | TemenTrip Staging | `env/staging.json` |
| `production` | `com.tementrip.mobileapp` | TemenTrip | `env/production.json` |

Tanpa `--flavor`, build memakai `staging` (`default-flavor` di `pubspec.yaml`).
Build production selalu lewat `--flavor production`.

Konfigurasi build lewat `--dart-define`:

| Nama | Default | Keterangan |
| --- | --- | --- |
| `API_BASE_URL` | `https://tripkita-production.up.railway.app/api/v1` | Base URL backend. Emulator Android ke backend lokal: `http://10.0.2.2:8080/api/v1`. |
| `WEB_BASE_URL` | `https://tementrip-app.web.app` | Host tautan "Bagikan Paket" (`/paket/<id>`). Di Android tautan dibuka langsung oleh aplikasi (App Links, `web/.well-known/assetlinks.json` berisi SHA-256 `android/app/key.jks`); tanpa aplikasi, tautan membuka web. |
| `APP_ENV` | `production` | `staging` menampilkan petunjuk Midtrans Sandbox di halaman pembayaran. |

Nilai staging tersimpan di `env/staging.json` dan dipakai dengan
`--dart-define-from-file=env/staging.json`.

## Padanan layar dengan web

| Mobile | Web |
| --- | --- |
| `screens/home_screen.dart` (tab Beranda) | `CustomerLandingPage` |
| `screens/trip_list_screen.dart` (tab Cari Trip) | `CustomerSearchPage` |
| `screens/trip_detail_screen.dart` | `CustomerPackageDetailPage` |
| `screens/booking_screen.dart` (Selesaikan Pesanan) | `CustomerBookingPage` + `CustomerConfirmationPage` |
| `screens/payment_verification_screen.dart` | `CustomerPaymentInvoicePage` |
| `screens/booking_list_screen.dart` (tab Booking) | `CustomerHistoryPage` |
| `screens/profile_screen.dart` (tab Akun) | `CustomerSettingsPage` |
| `screens/auth_screen.dart` | `CustomerLoginPage` |
| `screens/provider_profile_screen.dart` | `ProviderPublicProfilePage` |

Alur pemesanan (desain Figma "TemenTrip"): Detail paket → Pilih Jadwal
(daftar keberangkatan Open Trip atau kalender) → Jumlah Peserta → (masuk bila
belum) → Selesaikan Pesanan (data pemesan, peserta, titik jemput, ringkasan) →
Konfirmasi → halaman Midtrans Snap terbuka langsung di Custom Tab → status
diperbarui saat kembali ke aplikasi. Status lunas hanya berasal dari backend
(notifikasi Midtrans). Bila backend tidak memakai Midtrans, layar yang sama
menampilkan transfer manual + unggah bukti.

## Build staging (Midtrans Sandbox)

Backend staging: `https://tripkita-production.up.railway.app`. Pastikan
variabel Railway berisi `MIDTRANS_SERVER_KEY=SB-Mid-server-...` dan
`MIDTRANS_IS_PRODUCTION=false`, lalu isi Payment Notification URL di
dashboard.sandbox.midtrans.com dengan
`https://tripkita-production.up.railway.app/api/v1/public/webhooks/midtrans`.

```bash
flutter build apk --release --flavor staging --dart-define-from-file=env/staging.json
# hasil: build/app/outputs/flutter-apk/app-staging-release.apk

flutter build web --release --dart-define-from-file=env/staging.json
firebase deploy --only hosting --project tementrip-app-80ecc
```

## Pengujian

```bash
flutter analyze
flutter test
```
