import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:customer_mobile/config/app_config.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/models/customer.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/models/review.dart';
import 'package:customer_mobile/services/checkout_config.dart';

/// Galat API yang membawa status HTTP, sama seperti `ApiError` di web.
class ApiException implements Exception {
  final String message;
  final int status;

  const ApiException(this.message, this.status);

  @override
  String toString() => message;
}

class AuthResult {
  final String token;
  final CustomerProfile profile;

  const AuthResult(this.token, this.profile);
}

/// Klien HTTP untuk backend TemenTrip. Token sesi dipasok oleh
/// [AuthSession]; respons 401 untuk token yang masih aktif memicu
/// [onSessionExpired] agar pengguna diarahkan untuk masuk kembali.
class ApiService {
  static const Duration _timeout = Duration(seconds: 30);

  static String? Function() tokenProvider = () => null;
  static void Function(String rejectedToken) onSessionExpired = (_) {};

  static Future<dynamic> _request(
    String method,
    String endpoint, {
    Object? body,
    bool withAuth = true,
    String? tokenOverride,
  }) async {
    final token = tokenOverride ?? (withAuth ? tokenProvider() : null);
    final client = HttpClient()..connectionTimeout = _timeout;
    try {
      final request = await client.openUrl(method, Uri.parse('${AppConfig.apiBaseUrl}$endpoint')).timeout(_timeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      if (token != null && token.isNotEmpty) {
        request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      }
      if (body != null) {
        request.headers.contentType = ContentType.json;
        request.add(utf8.encode(jsonEncode(body)));
      }

      final response = await request.close().timeout(_timeout);
      final text = await response.transform(utf8.decoder).join().timeout(_timeout);
      dynamic data;
      if (text.isNotEmpty) {
        try {
          data = jsonDecode(text);
        } catch (_) {
          data = null;
        }
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        final serverMessage = data is Map && data['error'] is String ? data['error'] as String : null;
        if (response.statusCode == 401 && token != null && token.isNotEmpty) {
          onSessionExpired(token);
          throw ApiException(serverMessage ?? 'Sesi Anda telah berakhir. Silakan masuk kembali.', 401);
        }
        throw ApiException(
          serverMessage ?? 'Terjadi gangguan pada server (${response.statusCode}).',
          response.statusCode,
        );
      }
      return data;
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw const ApiException('Permintaan terlalu lama. Periksa koneksi Anda lalu coba lagi.', 0);
    } catch (_) {
      throw const ApiException('Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.', 0);
    } finally {
      client.close(force: true);
    }
  }

  static Map<String, dynamic> _asMap(dynamic data) => data is Map<String, dynamic> ? data : <String, dynamic>{};
  static List<dynamic> _asList(dynamic data) => data is List ? data : const [];

  // ---------------------------------------------------------------- Paket

  static Future<List<TripPackage>> fetchPackages() async {
    final data = await _request('GET', '/public/packages', withAuth: false);
    return _asList(data).whereType<Map<String, dynamic>>().map(TripPackage.fromJson).toList();
  }

  static Future<PublicProvider> fetchProvider(int providerId) async {
    final data = await _request('GET', '/public/providers/$providerId', withAuth: false);
    return PublicProvider.fromJson(_asMap(data));
  }

  static Future<List<PackageReview>> fetchPackageReviews(int packageId) async {
    final data = await _request('GET', '/public/reviews/package/$packageId', withAuth: false);
    return _asList(data).whereType<Map<String, dynamic>>().map(PackageReview.fromJson).toList();
  }

  static Future<bool> isBookingReviewed(int bookingId) async {
    final data = await _request('GET', '/public/reviews/booking/$bookingId', withAuth: false);
    return _asMap(data)['reviewed'] == true;
  }

  // ----------------------------------------------------------------- Auth

  static Future<AuthResult> login(String email, String password) async {
    final data = _asMap(await _request(
      'POST',
      '/public/auth/login',
      body: {'email': email, 'password': password},
      withAuth: false,
    ));
    final token = data['token'];
    final provider = data['provider'];
    if (token is! String || token.isEmpty || provider is! Map<String, dynamic>) {
      throw const ApiException('Respons login tidak valid. Silakan coba kembali.', 0);
    }
    return AuthResult(token, CustomerProfile.fromJson(provider));
  }

  static Future<AuthResult> registerCustomer({
    required String name,
    required String email,
    required String password,
    required String whatsapp,
  }) async {
    final data = _asMap(await _request(
      'POST',
      '/public/auth/register-customer',
      body: {'name': name, 'email': email, 'password': password, 'whatsapp': whatsapp},
      withAuth: false,
    ));
    final token = data['token'];
    final profile = data['customer'] ?? data['provider'];
    if (token is! String || token.isEmpty || profile is! Map<String, dynamic>) {
      throw const ApiException('Pendaftaran gagal. Silakan coba kembali.', 0);
    }
    return AuthResult(token, CustomerProfile.fromJson(profile));
  }

  static Future<CustomerProfile> fetchProfile({String? token}) async {
    final data = await _request('GET', '/provider/profile', tokenOverride: token);
    return CustomerProfile.fromJson(_asMap(data));
  }

  static Future<CustomerProfile> updateProfile(Map<String, dynamic> fields) async {
    final data = await _request('PUT', '/provider/profile', body: fields);
    return CustomerProfile.fromJson(_asMap(data));
  }

  /// Best effort: logout lokal tetap berhasil walau jaringan terputus.
  static Future<void> revokeSession(String token) async {
    try {
      await _request('POST', '/public/auth/logout', tokenOverride: token);
    } catch (_) {}
  }

  // -------------------------------------------------------------- Booking

  static Future<Booking> createBooking({
    required int packageId,
    required BookerContact booker,
    required int guests,
    required String tripDateIso,
    required List<Participant> participants,
  }) async {
    final data = await _request('POST', '/public/bookings', body: {
      'packageId': packageId,
      'customerName': booker.name.isNotEmpty ? booker.name : 'Pelanggan TripKita',
      'customerEmail': booker.email,
      'customerPhone': booker.whatsapp,
      'customerInitial': (booker.name.isNotEmpty ? booker.name[0] : 'P').toUpperCase(),
      'guests': guests,
      'tripDate': '${tripDateIso}T00:00:00.000Z',
      'addOnIds': <String>[],
      'participants': [for (final p in participants) p.toApiJson()],
    });
    return Booking.fromJson(_asMap(data));
  }

  static Future<CheckoutConfig> fetchCheckoutConfig() async {
    final data = _asMap(await _request('GET', '/public/checkout-config', withAuth: false));
    final fee = data['serviceFee'];
    final window = data['paymentWindowSeconds'];
    if (fee is! num || window is! num) {
      throw const ApiException('Konfigurasi pembayaran dari server tidak valid.', 0);
    }
    return CheckoutConfig(serviceFee: fee.toInt(), paymentWindow: Duration(seconds: window.toInt()));
  }

  static Future<List<Booking>> fetchCustomerBookings() async {
    final data = await _request('GET', '/customer/bookings');
    return _asList(data).whereType<Map<String, dynamic>>().map(Booking.fromJson).toList();
  }

  static Future<Booking> cancelBooking(int bookingId) async {
    final data = await _request('PUT', '/customer/bookings/$bookingId/cancel', body: <String, dynamic>{});
    return Booking.fromJson(_asMap(data));
  }

  static Future<String> respondToReschedule(int bookingId, bool accept) async {
    final data = _asMap(await _request(
      'POST',
      '/customer/bookings/$bookingId/reschedule-response',
      body: {'accept': accept},
    ));
    return data['message'] is String ? data['message'] as String : 'Jawaban Anda telah tersimpan.';
  }

  static Future<void> submitReview({required int bookingId, required int rating, required String comment}) async {
    await _request('POST', '/customer/reviews', body: {
      'bookingId': bookingId,
      'rating': rating,
      'comment': comment,
    });
  }

  static Future<Booking> trackBooking(String bookingCode) async {
    final data = await _request('GET', '/public/bookings/status/${Uri.encodeComponent(bookingCode)}');
    return Booking.fromJson(_asMap(data));
  }
}
