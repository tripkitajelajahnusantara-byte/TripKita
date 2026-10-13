import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

void main() {
  test('harga kartu tanpa spasi dan rentang tanggal ringkas', () {
    expect(formatPrice(999000), 'Rp999.000');
    expect(formatDateRange(DateTime(2026, 10, 25), DateTime(2026, 10, 27)), '25 – 27 Okt 2026');
    expect(formatDateRange(DateTime(2026, 10, 30), DateTime(2026, 11, 2)), '30 Okt – 2 Nov 2026');
    expect(formatDateRange(DateTime(2026, 12, 30), DateTime(2027, 1, 2)), '30 Des 2026 – 2 Jan 2027');
    expect(formatDateRange(DateTime(2026, 10, 25), DateTime(2026, 10, 25)), '25 Okt 2026');
  });

  testWidgets('kartu Trip Populer dan Cari Trip muat di layar 360dp tanpa overflow', (tester) async {
    final start = DateTime.now().add(const Duration(days: 10));
    final pkg = TripPackage.fromJson({
      'id': 1,
      'name': 'Gunung Prau 2.590mdpl via Patak Banteng Wonosobo (Jabodetabek) Edisi Spesial',
      'destination': 'Jawa Tengah',
      'category': 'Gunung',
      'tripType': 'Open Trip',
      'price': 775000,
      'duration': 3,
      'quotaMax': 20,
      'quotaUsed': 15,
      'startDate': toIsoDate(start),
      'endDate': toIsoDate(start.add(const Duration(days: 2))),
      'includedFacilities': 'Transportasi PP Full AC\nDriver\nBBM & Toll\nMakan 3x',
    });
    await tester.binding.setSurfaceSize(const Size(360, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: Column(children: [
            Align(alignment: Alignment.centerLeft, child: TripPopularCard(pkg: pkg, onTap: () {})),
            Padding(padding: const EdgeInsets.all(16), child: TripListCard(pkg: pkg, onTap: () {})),
          ]),
        ),
      ),
    ));
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.text('Rp775.000 / orang'), findsNWidgets(2));
    expect(find.text('mulai dari'), findsNWidgets(2));
    expect(find.text('5 kuota tersisa'), findsOneWidget);
    expect(find.text('Open Trip • 3 hari'), findsNWidgets(2));
  });

  testWidgets('kartu Trip Populer sama tinggi walau judul & fasilitas beda panjang', (tester) async {
    final short = TripPackage.fromJson({'id': 1, 'name': 'Trip Baturaden', 'price': 250000, 'duration': 2});
    final long = TripPackage.fromJson({
      'id': 2,
      'name': 'Trip Wisata Kepulauan Banggai Laut dan Pantai Pasir Putih Edisi Liburan Panjang',
      'price': 1250000,
      'duration': 4,
      'includedFacilities': 'Transportasi pulang pergi dari Luwuk\nPenginapan 3 malam\nMakan 3x sehari\nDokumentasi',
    });
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          TripPopularCard(key: const Key('short'), pkg: short, onTap: () {}),
          TripPopularCard(key: const Key('long'), pkg: long, onTap: () {}),
        ]),
      ),
    ));
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(tester.getSize(find.byKey(const Key('short'))).height,
        tester.getSize(find.byKey(const Key('long'))).height);
  });
}
