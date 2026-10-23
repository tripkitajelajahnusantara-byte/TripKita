/// Konfigurasi build aplikasi. Nilai dapat diganti saat build, misalnya:
/// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1`.
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://tripkita-production.up.railway.app/api/v1',
  );

  /// Host web (Flutter web di Firebase Hosting) untuk tautan "Bagikan Paket"
  /// `<webBaseUrl>/paket/<id>`. Di Android, tautan ini dibuka langsung oleh
  /// aplikasi (App Links, lihat `web/.well-known/assetlinks.json` dan
  /// `AndroidManifest.xml`); tanpa aplikasi, tautan membuka web.
  static const String webBaseUrl = String.fromEnvironment('WEB_BASE_URL', defaultValue: 'https://tementrip-app.web.app');

  /// `staging` menandai build uji: halaman pembayaran menampilkan petunjuk
  /// Midtrans Sandbox.
  static const String environment = String.fromEnvironment('APP_ENV', defaultValue: 'production');

  static bool get isStaging => environment == 'staging';

  /// Client ID OAuth tipe "Web application", sama dengan `GOOGLE_CLIENT_ID`
  /// backend. Google menerbitkan ID token untuk audiens ini. Kosong berarti
  /// tombol "Lanjutkan dengan Google" disembunyikan.
  static const String googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

  /// Origin backend tanpa `/api/v1`, dipakai untuk melengkapi path gambar
  /// relatif seperti `/uploads/paket.jpg`.
  static String get backendOrigin => apiBaseUrl.replaceFirst(RegExp(r'/api/v1/?$'), '');
}
