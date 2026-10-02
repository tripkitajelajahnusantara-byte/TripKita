import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/services/api_service.dart';

/// Cache daftar paket publik yang dipakai bersama oleh Beranda, Cari Trip,
/// dan profil mitra.
class PackageCatalog {
  static Future<List<TripPackage>>? _pending;
  static List<TripPackage>? _cache;
  static DateTime? _fetchedAt;
  static const _maxAge = Duration(minutes: 2);

  static Future<List<TripPackage>> load({bool force = false}) {
    final fresh = _fetchedAt != null && DateTime.now().difference(_fetchedAt!) < _maxAge;
    if (!force && _cache != null && fresh) return Future.value(_cache);
    return _pending ??= ApiService.fetchPackages().then((all) {
      final active = all.where((p) => p.isActive).toList();
      _cache = active;
      _fetchedAt = DateTime.now();
      return active;
    }).whenComplete(() => _pending = null);
  }

  static Future<TripPackage?> findById(int id) async {
    final all = await load();
    for (final p in all) {
      if (p.id == id) return p;
    }
    return null;
  }
}
