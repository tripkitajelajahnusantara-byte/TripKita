import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/models/customer.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/screens/booking_screen.dart';
import 'package:customer_mobile/screens/payment_verification_screen.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/services/checkout_config.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/schedule_sheets.dart';

String _day(int offset) => toIsoDate(dateOnly(DateTime.now()).add(Duration(days: offset)));

final _pkg = TripPackage.fromJson({
  'id': 1,
  'providerId': 0,
  'name': 'Gunung Prau 2.590mdpl via Patak Banteng Wonosobo (Jabodetabek)',
  'destination': 'Jawa Tengah',
  'tripType': 'Open Trip',
  'price': 775000,
  'duration': 3,
  'quotaMax': 15,
  'minAge': 17,
  'maxAge': 65,
  'pickupMode': 'FLEXIBLE',
  'pickupArea': 'Jabodetabek',
  'pickupPoints': ['Depok, Exit Tol Cisalak', 'Bekasi, Hotel Amarossa'],
  'includedFacilities': 'Transportasi Full AC\nDriver\nBBM & Toll\nTenda Toilet',
  'description': 'Open Trip Gunung Prau 2.590 MDPL via Patak Banteng, Wonosobo, Jawa Tengah dengan durasi perjalanan 3 hari 1 malam. ' * 2,
  'itinerary': '[{"day":1,"activities":[{"time":"19:00 - 21:00","title":"Berkumpul di meeting point"}]}]',
  'departures': [
    {'date': _day(12), 'endDate': _day(14), 'quotaUsed': 13, 'seatsLeft': 2},
    {'date': _day(20), 'endDate': _day(22), 'quotaUsed': 0, 'seatsLeft': 15},
  ],
});

/// ListView membangun anak secara malas: gulir sampai [finder] tampil.
Future<void> _scrollTo(WidgetTester tester, Finder finder) => tester.scrollUntilVisible(
      finder,
      300,
      scrollable: find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).first,
    );

Future<void> _pumpPhone(WidgetTester tester, Widget home) async {
  tester.view.physicalSize = const Size(360 * 3, 800 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(theme: AppTheme.light(), home: home));
  await tester.pump();
}

void main() {
  setUp(() {
    AuthSession.instance.debugSetSession(
      'token',
      const CustomerProfile(id: 1, role: 'CUSTOMER', name: 'Gellato', email: 'gellato@mail.com'),
    );
    CheckoutConfig.debugCached = const CheckoutConfig(
      serviceFee: 5000,
      paymentWindow: Duration(hours: 24),
      adminReviewWindow: Duration(hours: 24),
      bankName: 'OCBC NISP',
      accountNumber: '693800143473',
      accountHolder: 'PT TripKita Jelajah Nusantara',
    );
  });

  tearDown(() => AuthSession.instance.debugSetSession(null, null));

  testWidgets('Detail Trip muat di 360dp dan menampilkan CTA Pilih Jadwal', (tester) async {
    await _pumpPhone(tester, TripDetailScreen(package: _pkg));
    expect(find.text('Pilih Jadwal'), findsOneWidget);
    await _scrollTo(tester, find.text('Destinasi wisata: Berkumpul di meeting point'));
    await _scrollTo(tester, find.text('Area Penjemputan'));
    await _scrollTo(tester, find.text('Lihat Mitra'));

    await tester.tap(find.byTooltip('Bagikan'));
    await tester.pumpAndSettle();
    expect(find.text('Bagikan Paket'), findsOneWidget);
    expect(find.text('Salin Link'), findsOneWidget);
    expect(find.text('Highlight'), findsOneWidget, reason: 'kartu gambar memuat fasilitas unggulan');
  });

  testWidgets('Jadwal Tersedia menandai kuota menipis dan mewajibkan pilihan', (tester) async {
    late BuildContext ctx;
    await _pumpPhone(tester, Scaffold(body: Builder(builder: (c) {
      ctx = c;
      return const SizedBox();
    })));
    showDepartureSheet(ctx, pkg: _pkg);
    await tester.pumpAndSettle();
    final urgent = find.textContaining('2 kuota tersisa', findRichText: true);
    expect(urgent, findsOneWidget);
    final next = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Lanjutkan'));
    expect(next.onPressed, isNull, reason: 'belum ada jadwal dipilih');
    await tester.tap(urgent);
    await tester.pump();
    expect(tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Lanjutkan')).onPressed, isNotNull);
  });

  testWidgets('Selesaikan Pesanan: data kosong ditandai, form peserta meminta titik jemput', (tester) async {
    final draft = BookingDraft(package: _pkg, guests: 3, startDate: _day(12), endDate: _day(14), scheduleLabel: '');
    await _pumpPhone(tester, BookingScreen(draft: draft));
    expect(find.text('Selesaikan Pesanan'), findsOneWidget);
    await _scrollTo(tester, find.text('Rp2.330.000'));
    await tester.drag(find.byType(ListView).first, const Offset(0, 3000));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Konfirmasi & Bayar'));
    await tester.pumpAndSettle();
    expect(find.text('Lengkapi data pemesan untuk melanjutkan'), findsOneWidget);

    await tester.tap(find.text('Peserta 2'));
    await tester.pumpAndSettle();
    expect(find.text('Data Peserta 2'), findsOneWidget);
    expect(find.textContaining('Titik Jemput Peserta', findRichText: true), findsOneWidget);
    expect(find.textContaining('17–65 tahun'), findsOneWidget);
    await tester.tap(find.text('Simpan'));
    await tester.pumpAndSettle();
    expect(find.text('Wajib diisi.'), findsWidgets);
  });

  testWidgets('Pembayaran Midtrans menampilkan tombol bayar dan status berhasil', (tester) async {
    final pending = Booking(
      id: 1,
      bookingCode: 'TK-20261015-TSSJVQX5',
      totalPrice: 2330000,
      paymentMethod: 'Midtrans',
      createdAt: DateTime.now(),
      serverPaymentDeadline: DateTime.now().add(const Duration(hours: 23)),
    );
    await _pumpPhone(tester, PaymentVerificationScreen(booking: pending, packageName: _pkg.name));
    expect(find.text('Selesaikan Pembayaran'), findsOneWidget);
    expect(find.text('Bayar Sekarang'), findsOneWidget);
    expect(find.text('Unggah Bukti Transfer'), findsNothing);

    const paid = Booking(id: 1, bookingCode: 'TK-1', totalPrice: 2330000, status: BookingStatus.paid, paymentMethod: 'Midtrans');
    await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light(), home: PaymentVerificationScreen(key: const ValueKey('paid'), booking: paid, packageName: _pkg.name)));
    await tester.pump();
    expect(find.text('Pembayaran Berhasil'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
