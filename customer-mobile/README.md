# Customer Mobile (Flutter)

Aplikasi customer TemenTrip. Alur dan tampilannya mengikuti web customer
(`provider-web`) dan memakai API backend yang sama.

## Menjalankan

```bash
cd customer-mobile
flutter pub get
flutter run
```

Konfigurasi build lewat `--dart-define`:

| Nama | Default | Keterangan |
| --- | --- | --- |
| `API_BASE_URL` | `https://tripkita-production.up.railway.app/api/v1` | Base URL backend. Emulator Android ke backend lokal: `http://10.0.2.2:8080/api/v1`. |
| `WEB_BASE_URL` | kosong | URL web customer untuk tautan "Bagikan Paket". Kosong berarti pesan dibagikan tanpa tautan. |

## Padanan layar dengan web

| Mobile | Web |
| --- | --- |
| `screens/home_screen.dart` (tab Beranda) | `CustomerLandingPage` |
| `screens/trip_list_screen.dart` (tab Cari Trip) | `CustomerSearchPage` |
| `screens/trip_detail_screen.dart` | `CustomerPackageDetailPage` |
| `screens/booking_screen.dart` | `CustomerBookingPage` (data pemesan & peserta) |
| `screens/payment_screen.dart` | `CustomerConfirmationPage` |
| `screens/payment_verification_screen.dart` | `CustomerPaymentInvoicePage` |
| `screens/booking_list_screen.dart` (tab Booking) | `CustomerHistoryPage` |
| `screens/profile_screen.dart` (tab Akun) | `CustomerSettingsPage` |
| `screens/auth_screen.dart` | `CustomerLoginPage` |
| `screens/provider_profile_screen.dart` | `ProviderPublicProfilePage` |

Alur pemesanan: Detail paket → (masuk bila belum) → Data pemesan & peserta →
Konfirmasi & persetujuan S&K → invoice Xendit dibuka di browser → status
diperbarui saat kembali ke aplikasi. Status lunas hanya berasal dari backend
(webhook Xendit).

## Pengujian

```bash
flutter analyze
flutter test
```
