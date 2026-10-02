import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:customer_mobile/models/customer.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/wishlist_store.dart';

/// Status login customer, padanan `NavigationContext` pada web.
class AuthSession extends ChangeNotifier {
  AuthSession._();
  static final AuthSession instance = AuthSession._();

  static const _tokenKey = 'tementrip_customer_token';
  static const _storage = FlutterSecureStorage();

  String? _token;
  CustomerProfile? _profile;
  bool _initializing = true;
  bool _sessionExpired = false;
  int _generation = 0;

  String? get token => _token;
  CustomerProfile? get profile => _profile;
  bool get isLoggedIn => _profile != null && _token != null;
  bool get initializing => _initializing;

  /// Bernilai true sekali setelah sesi dicabut server (401), agar UI dapat
  /// memberi tahu pengguna lalu mengarahkan ke halaman masuk.
  bool consumeSessionExpired() {
    final expired = _sessionExpired;
    _sessionExpired = false;
    return expired;
  }

  Future<void> init() async {
    ApiService.tokenProvider = () => _token;
    ApiService.onSessionExpired = _handleExpired;

    try {
      _token = await _storage.read(key: _tokenKey);
    } catch (_) {
      _token = null;
    }
    final generation = _generation;
    if (_token != null) {
      try {
        final profile = await ApiService.fetchProfile(token: _token);
        if (generation != _generation) return;
        if (profile.isCustomer) {
          _profile = profile;
          await WishlistStore.instance.adoptRemote(profile.wishlistData);
        } else {
          await _clearLocal();
        }
      } on ApiException catch (e) {
        if (generation != _generation) return;
        // Tanpa jaringan token tetap disimpan agar pengguna tidak keluar
        // sendiri; token yang ditolak server dibersihkan.
        if (e.status != 0) await _clearLocal();
      }
    }
    _initializing = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    _generation++;
    final result = await ApiService.login(email, password);
    if (!result.profile.isCustomer) {
      await ApiService.revokeSession(result.token);
      throw const ApiException(
        'Akun ini terdaftar sebagai mitra. Silakan masuk melalui Partner Hub di web TemenTrip.',
        403,
      );
    }
    final verified = await ApiService.fetchProfile(token: result.token);
    if (!verified.isCustomer) {
      await ApiService.revokeSession(result.token);
      throw const ApiException('Sesi customer tidak sesuai dengan akun yang masuk.', 403);
    }
    await _setSession(result.token, verified);
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    required String whatsapp,
  }) async {
    _generation++;
    final result = await ApiService.registerCustomer(
      name: name,
      email: email,
      password: password,
      whatsapp: whatsapp,
    );
    await _setSession(result.token, result.profile);
  }

  Future<void> updateProfile(Map<String, dynamic> fields) async {
    final updated = await ApiService.updateProfile(fields);
    _profile = updated;
    notifyListeners();
  }

  Future<void> logout() async {
    _generation++;
    final token = _token;
    await _clearLocal();
    notifyListeners();
    if (token != null) await ApiService.revokeSession(token);
  }

  Future<bool> hasAcceptedTerms() async {
    final id = _profile?.id;
    if (id == null) return true;
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('tementrip_customer_terms_accepted_$id') ?? false;
  }

  Future<void> acceptTerms() async {
    final id = _profile?.id;
    if (id == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('tementrip_customer_terms_accepted_$id', true);
  }

  Future<void> _setSession(String token, CustomerProfile profile) async {
    _token = token;
    _profile = profile;
    try {
      await _storage.write(key: _tokenKey, value: token);
    } catch (_) {
      // Sesi tetap berlaku selama aplikasi terbuka walau penyimpanan gagal.
    }
    await WishlistStore.instance.adoptRemote(profile.wishlistData);
    notifyListeners();
  }

  void _handleExpired(String rejectedToken) {
    // Respons dari sesi lama tidak boleh menghapus sesi yang lebih baru.
    if (_token != rejectedToken) return;
    _generation++;
    _sessionExpired = true;
    _clearLocal().then((_) => notifyListeners());
  }

  Future<void> _clearLocal() async {
    _token = null;
    _profile = null;
    try {
      await _storage.delete(key: _tokenKey);
    } catch (_) {}
  }
}
