import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Alasan lokasi customer tidak tersedia.
enum LocationIssue { serviceDisabled, permissionDenied, unavailable }

class LocationResult {
  final Position? position;
  final LocationIssue? issue;

  const LocationResult.found(Position this.position) : issue = null;
  const LocationResult.failed(LocationIssue this.issue) : position = null;
}

/// Lokasi terkini customer untuk mengurutkan trip terdekat. Akurasi rendah
/// (setara izin lokasi perkiraan) sudah cukup untuk jarak antarkota.
class LocationService {
  static Position? _cached;
  static DateTime? _cachedAt;
  static const _maxAge = Duration(minutes: 5);

  /// Hapus posisi tersimpan (tes).
  @visibleForTesting
  static void debugReset() => _cached = null;

  static Future<LocationResult> current() async {
    final cached = _cached;
    if (cached != null && DateTime.now().difference(_cachedAt!) < _maxAge) return LocationResult.found(cached);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return const LocationResult.failed(LocationIssue.serviceDisabled);
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        return const LocationResult.failed(LocationIssue.permissionDenied);
      }
      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(accuracy: LocationAccuracy.low, timeLimit: Duration(seconds: 12)),
        );
      } catch (_) {
        // GPS lambat/tanpa sinyal: pakai posisi terakhir yang diketahui perangkat.
        position = await Geolocator.getLastKnownPosition();
      }
      if (position == null) return const LocationResult.failed(LocationIssue.unavailable);
      _cached = position;
      _cachedAt = DateTime.now();
      return LocationResult.found(position);
    } catch (_) {
      return const LocationResult.failed(LocationIssue.unavailable);
    }
  }

  /// Membuka pengaturan layanan lokasi perangkat.
  static Future<bool> openSettings() => Geolocator.openLocationSettings();
}
