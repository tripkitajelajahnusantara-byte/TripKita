/// Konfigurasi build aplikasi. Nilai dapat diganti saat build, misalnya:
/// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1`.
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://tripkita-production.up.railway.app/api/v1',
  );

  /// URL web customer untuk tautan "Bagikan Paket". Kosong berarti pesan yang
  /// dibagikan tidak menyertakan tautan.
  static const String webBaseUrl = String.fromEnvironment('WEB_BASE_URL', defaultValue: '');

  /// Origin backend tanpa `/api/v1`, dipakai untuk melengkapi path gambar
  /// relatif seperti `/uploads/paket.jpg`.
  static String get backendOrigin => apiBaseUrl.replaceFirst(RegExp(r'/api/v1/?$'), '');
}
