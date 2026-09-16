import 'dart:convert';
import 'dart:io';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/models/booking.dart';

class ApiService {
  static const String baseUrl = 'https://tripkita-production.up.railway.app/api/v1';

  // Fetch live packages from Railway backend database
  static Future<List<TripPackage>> fetchPublicPackages() async {
    try {
      final client = HttpClient();
      final request = await client.getUrl(Uri.parse('$baseUrl/public/packages'));
      final response = await request.close().timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final bodyStr = await response.transform(utf8.decoder).join();
        final List<dynamic> data = jsonDecode(bodyStr);
        if (data.isNotEmpty) {
          final packages = data.map((json) => TripPackage.fromJson(json as Map<String, dynamic>)).toList();
          if (packages.isNotEmpty) {
            return packages;
          }
        }
      }
    } catch (e) {
      // Fallback to offline mock packages if network error occurs
    }
    return TripPackage.allPackages;
  }

  // Create booking via Railway Backend & Xendit Invoice Generator
  static Future<Booking?> createBooking({
    required int packageId,
    required TripPackage packageDetails,
    required String customerName,
    required int guests,
    required int totalPrice,
    required DateTime tripDate,
    required List<Participant> participants,
  }) async {
    final nowIso = DateTime.now().toIso8601String();
    final dateStr = nowIso.substring(0, 10).replaceAll('-', '');
    final randSuffix = (1000 + (DateTime.now().millisecond % 9000)).toString();
    final randomCode = 'TK-$dateStr-$randSuffix';

    final payload = {
      'packageId': packageId > 0 ? packageId : 1,
      'bookingCode': randomCode,
      'customerName': customerName.isNotEmpty ? customerName : 'Pelanggan TripKita',
      'customerInitial': customerName.isNotEmpty ? customerName[0].toUpperCase() : 'P',
      'guests': guests,
      'totalPrice': totalPrice,
      'tripDate': tripDate.toIso8601String(),
      'paymentMethod': 'Xendit Invoice',
      'participants': participants.map((p) => {
        'nama': p.fullName.isNotEmpty ? p.fullName : 'Peserta',
        'hp': p.whatsappNumber,
        'gender': p.gender,
        'tanggalLahir': p.dateOfBirth,
        'riwayatPenyakit': p.optionalNotes.isNotEmpty ? p.optionalNotes : 'Tidak Ada',
      }).toList(),
    };

    try {
      final client = HttpClient();
      final request = await client.postUrl(Uri.parse('$baseUrl/public/bookings'));
      request.headers.set('Content-Type', 'application/json');
      request.add(utf8.encode(jsonEncode(payload)));

      final response = await request.close().timeout(const Duration(seconds: 12));
      final bodyStr = await response.transform(utf8.decoder).join();

      if (response.statusCode == 200 || response.statusCode == 201) {
        final resJson = jsonDecode(bodyStr) as Map<String, dynamic>;
        final String paymentUrl = resJson['paymentUrl'] ?? resJson['payment_url'] ?? 'https://tripkita-production.up.railway.app/api/v1/public/xendit-mock-checkout/${resJson['id'] ?? 1}';
        final String bookingCode = resJson['bookingCode'] ?? resJson['booking_code'] ?? randomCode;
        final int id = (resJson['id'] as num? ?? DateTime.now().millisecondsSinceEpoch).toInt();

        final createdBooking = Booking(
          id: id,
          bookingCode: bookingCode,
          providerId: packageDetails.providerId,
          packageId: packageId,
          packageDetails: packageDetails,
          customerName: customerName,
          customerInitial: customerName.isNotEmpty ? customerName[0].toUpperCase() : 'P',
          tripDate: tripDate,
          guests: guests,
          totalPrice: totalPrice,
          dpAmount: 0,
          paymentMethod: 'Xendit Invoice',
          status: resJson['status'] as String? ?? 'PENDING_PAYMENT',
          paymentUrl: paymentUrl,
          createdAt: DateTime.now(),
          participants: participants,
        );

        Booking.mockBookings.insert(0, createdBooking);
        return createdBooking;
      }
    } catch (e) {
      // Local fallback in case network API is unreachable
    }

    // Fallback booking object with Xendit simulation URL
    final fallbackBooking = Booking(
      id: DateTime.now().millisecondsSinceEpoch,
      bookingCode: randomCode,
      providerId: packageDetails.providerId,
      packageId: packageId,
      packageDetails: packageDetails,
      customerName: customerName,
      customerInitial: customerName.isNotEmpty ? customerName[0].toUpperCase() : 'P',
      tripDate: tripDate,
      guests: guests,
      totalPrice: totalPrice,
      dpAmount: 0,
      paymentMethod: 'Xendit Invoice',
      status: 'PENDING_PAYMENT',
      paymentUrl: 'https://tripkita-production.up.railway.app/api/v1/public/xendit-mock-checkout/1',
      createdAt: DateTime.now(),
      participants: participants,
    );

    Booking.mockBookings.insert(0, fallbackBooking);
    return fallbackBooking;
  }

  // Check live status of booking from Railway backend (to verify Xendit Webhook updates)
  static Future<String?> checkBookingStatus(String bookingCode) async {
    try {
      final client = HttpClient();
      final request = await client.getUrl(Uri.parse('$baseUrl/public/bookings/status/$bookingCode'));
      final response = await request.close().timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final bodyStr = await response.transform(utf8.decoder).join();
        final resJson = jsonDecode(bodyStr) as Map<String, dynamic>;
        final String status = resJson['status'] as String? ?? 'PENDING_PAYMENT';
        return status;
      }
    } catch (e) {
      // Ignore network error
    }
    return null;
  }
}
