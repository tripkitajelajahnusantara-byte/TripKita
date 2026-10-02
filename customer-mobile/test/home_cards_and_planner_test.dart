import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/models/trip_plan.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

void main() {
  testWidgets('kartu grid muat di setengah lebar layar 360dp tanpa overflow', (tester) async {
    final pkg = TripPackage.fromJson({
      'id': 1,
      'name': 'Private Trip Wisata Raja Ampat 4D3N Lengkap dengan Snorkeling',
      'destination': 'Kabupaten Raja Ampat, Papua Barat Daya',
      'tripType': 'Private Trip',
      'price': 13850000,
      'duration': 4,
      'minGuests': 2,
      'includedFacilities': 'Speedboat private seharian penuh\nPenginapan resort tepi pantai',
    });
    await tester.binding.setSurfaceSize(const Size(360, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 158, child: TripGridCard(pkg: pkg, onTap: () {})),
          ]),
        ),
      ),
    ));
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.text('Private Trip'), findsOneWidget);
  });

  test('tonggak tabungan rencana trip tercentang otomatis sesuai progres', () {
    final now = DateTime.now();
    final plan = TripPlan(
      id: 'p1',
      destination: 'Bali',
      targetDate: '2027-01-01',
      targetDateLabel: '1 Januari 2027',
      participants: 2,
      targetBudget: 1000000,
      checklist: TripPlan.defaultChecklist(),
      savingsLogs: const [TripSavingsLog(id: 'l1', date: '1 Jan 2026', amount: 600000)],
      createdAt: now,
      updatedAt: now,
    );
    final done = {for (final c in plan.checklist) c.id: plan.isCompleted(c)};
    expect(plan.progressPercent, 60);
    expect(done['2'], isTrue);
    expect(done['3'], isTrue);
    expect(done['4'], isFalse);
    expect(done['6'], isFalse);

    final restored = TripPlan.fromJson(plan.toJson());
    expect(restored.savedAmount, 600000);
    expect(restored.checklist.length, 8);
  });
}
