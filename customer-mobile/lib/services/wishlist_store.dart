import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/services/api_service.dart';

/// Daftar paket favorit. Disimpan lokal dan, bila customer sedang masuk,
/// disinkronkan ke `wishlistData` profil seperti `utils/wishlist.ts` di web.
class WishlistStore extends ChangeNotifier {
  WishlistStore._();
  static final WishlistStore instance = WishlistStore._();

  static const _key = 'tripkita_customer_wishlist';

  List<TripPackage> _items = [];
  List<TripPackage> get items => List.unmodifiable(_items);

  bool contains(int packageId) => _items.any((p) => p.id == packageId);

  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _items = _decode(prefs.getString(_key));
    } catch (_) {
      _items = [];
    }
    notifyListeners();
  }

  /// Memakai daftar favorit yang tersimpan di akun (dipanggil saat masuk).
  Future<void> adoptRemote(String raw) async {
    if (raw.trim().isEmpty) return;
    final remote = _decode(raw);
    _items = remote;
    await _persist();
    notifyListeners();
  }

  Future<void> toggle(TripPackage pkg, {required bool syncToAccount}) async {
    if (contains(pkg.id)) {
      _items = _items.where((p) => p.id != pkg.id).toList();
    } else {
      _items = [pkg, ..._items];
    }
    notifyListeners();
    await _persist();
    if (syncToAccount) {
      try {
        await ApiService.updateProfile({'wishlistData': _encode()});
      } catch (_) {
        // Sinkronisasi akun bersifat best effort, sama seperti web.
      }
    }
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key, _encode());
    } catch (_) {}
  }

  String _encode() => jsonEncode(_items.map((p) => p.toJson()).toList());

  static List<TripPackage> _decode(String? raw) {
    if (raw == null || raw.isEmpty) return [];
    try {
      final parsed = jsonDecode(raw);
      if (parsed is! List) return [];
      return parsed.whereType<Map<String, dynamic>>().map(TripPackage.fromJson).where((p) => p.id > 0).toList();
    } catch (_) {
      return [];
    }
  }
}
