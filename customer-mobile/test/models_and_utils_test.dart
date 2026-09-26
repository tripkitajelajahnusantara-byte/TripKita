import 'package:flutter_test/flutter_test.dart';

import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/utils/validators.dart';

void main() {
  group('TripPackage.fromJson', () {
    test('membaca format backend: gambar berkoma, itinerary JSON, fasilitas per baris', () {
      final pkg = TripPackage.fromJson({
        'id': 7,
        'providerId': 3,
        'name': 'Private Trip Bromo',
        'destination': 'Probolinggo',
        'tripType': 'Private Trip',
        'price': 1250000,
        'quotaMax': 10,
        'quotaUsed': 4,
        'duration': 3,
        'minGuests': 2,
        'images': '/uploads/a.jpg, https://cdn.example.com/b.png, Sub 2',
        'itinerary': '[{"day":1,"activities":[{"time":"08:00","title":"Jemput","description":"Hotel"}]}]',
        'includedFacilities': 'Jeep\n\nGuide ',
        'availableDates': ['2026-10-01'],
        'bookedDates': null,
      });

      expect(pkg.isOpenTrip, isFalse);
      expect(pkg.availableSeats, 6);
      expect(pkg.photos.length, 2);
      expect(pkg.photos.first, endsWith('/uploads/a.jpg'));
      expect(pkg.itinerary.single.title, '08:00 — Jemput');
      expect(pkg.itinerary.single.day, 'Hari 1');
      expect(pkg.includedFacilities, ['Jeep', 'Guide']);
      expect(pkg.availableDates, ['2026-10-01']);
      expect(pkg.bookedDates, isEmpty);
    });

    test('toJson/fromJson mempertahankan data untuk penyimpanan favorit', () {
      final original = TripPackage.fromJson({'id': 1, 'name': 'A', 'destination': 'B', 'price': 10, 'images': 'x.jpg'});
      final restored = TripPackage.fromJson(original.toJson());
      expect(restored.id, 1);
      expect(restored.imagesRaw, 'x.jpg');
    });
  });

  group('Booking', () {
    test('pesanan menunggu pembayaran lewat 24 jam dianggap kedaluwarsa', () {
      final booking = Booking.fromJson({
        'id': 1,
        'bookingCode': 'TK-1',
        'status': 'PENDING_PAYMENT',
        'createdAt': DateTime.now().subtract(const Duration(hours: 25)).toUtc().toIso8601String(),
      });
      expect(booking.isPaymentExpired, isTrue);
    });

    test('nama paket memakai packageDetails dari respons pelacakan publik', () {
      final booking = Booking.fromJson({
        'bookingCode': 'TK-2',
        'status': 'PAID',
        'packageDetails': {'name': 'Bromo'},
      });
      expect(booking.packageName, 'Bromo');
      expect(booking.isPaidOrActive, isTrue);
    });
  });

  test('data peserta dikirim dalam format API backend', () {
    final json = Participant(
      name: ' Budi Santoso ',
      phone: '081234567890',
      gender: 'Laki-laki',
      birthDate: '1995-04-12',
      medicalHistory: 'Tidak Ada',
    ).toApiJson();
    expect(json, {
      'name': 'Budi Santoso',
      'phone': '081234567890',
      'gender': 'Laki-laki',
      'birthDate': '1995-04-12',
      'medicalNotes': '',
    });
  });

  group('tautan eksternal', () {
    test('hanya invoice HTTPS Xendit yang dipercaya', () {
      expect(trustedPaymentUri('https://checkout.xendit.co/web/abc'), isNotNull);
      expect(trustedPaymentUri('http://checkout.xendit.co/web/abc'), isNull);
      expect(trustedPaymentUri('https://xendit.co.evil.com/pay'), isNull);
      expect(trustedPaymentUri('https://example.com/xendit-mock-checkout/1'), isNull);
    });

    test('nomor WhatsApp dinormalisasi ke format 62', () {
      expect(whatsAppUri('0812-3456-7890').toString(), 'https://wa.me/6281234567890');
      expect(whatsAppUri('123'), isNull);
    });
  });

  group('validasi form (sama dengan web)', () {
    test('nama pemesan', () {
      expect(validateBookerName('Budi Santoso'), isNull);
      expect(validateBookerName('Bu'), isNotNull);
      expect(validateBookerName('Budi123'), isNotNull);
    });

    test('nomor HP pemesan', () {
      expect(validateBookerPhone('081234567890'), isNull);
      expect(validateBookerPhone('6281234567890'), isNull);
      expect(validateBookerPhone('+6281234567890'), isNotNull);
      expect(validateBookerPhone('0812'), isNotNull);
    });
  });

  group('jadwal & tanggal', () {
    test('Open Trip memakai satu jadwal dari mitra, dan jadwal lampau tidak dapat dipesan', () {
      final today = dateOnly(DateTime.now());
      TripPackage pkg(DateTime start) => TripPackage.fromJson({
            'id': 1,
            'name': 'Open Trip',
            'destination': 'X',
            'price': 1,
            'tripType': 'Open Trip',
            'duration': 3,
            'startDate': toIsoDate(start),
            'endDate': toIsoDate(start.add(const Duration(days: 2))),
          });
      final future = openTripDeparture(pkg(today.add(const Duration(days: 10))))!;
      expect(future.dateIso, toIsoDate(today.add(const Duration(days: 10))));
      expect(future.label, endsWith('(3 Hari)'));
      expect(openTripDeparture(pkg(today.subtract(const Duration(days: 1)))), isNull);
    });

    test('highlight berasal dari fasilitas mitra, bukan karangan dari nama paket', () {
      final pkg = TripPackage.fromJson({
        'id': 1,
        'name': 'Open Trip Gunung Bromo',
        'destination': 'X',
        'price': 1,
        'duration': 2,
        'includedFacilities': 'Transport PP',
      });
      final hl = highlightsFor(pkg);
      expect(hl.first, '✓ Transport PP');
      expect(hl.any((h) => h.contains('Jeep')), isFalse);
      expect(coverImageFor(pkg), isEmpty);
    });

    test('format rupiah dan tanggal Indonesia', () {
      expect(formatIDR(350000).replaceAll(' ', ' '), 'Rp 350.000');
      expect(formatIsoLong('2026-10-01'), '1 Oktober 2026');
    });
  });
}
