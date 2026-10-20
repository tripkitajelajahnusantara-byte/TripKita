import 'package:flutter_test/flutter_test.dart';

import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/models/package.dart';

void main() {
  test('harga per unit: 1 orang tetap bayar 1 jeep penuh', () {
    final jeep = TripPackage.fromJson({
      'id': 1,
      'name': 'Private Trip Banyuwangi',
      'price': 1000000,
      'pricingMode': 'PER_UNIT',
      'unitName': 'Jeep',
      'unitCapacity': 6,
    });
    expect(jeep.basePrice(1), 1000000);
    expect(jeep.basePrice(6), 1000000);
    expect(jeep.basePrice(7), 2000000);
    expect(jeep.unitsFor(12), 2);
    expect(jeep.priceUnitLabel, '/ Jeep');

    final perPerson = TripPackage.fromJson({'id': 2, 'name': 'Open', 'price': 200000});
    expect(perPerson.basePrice(5), 1000000);
    expect(perPerson.unitsFor(5), 0);
  });

  test('add-on per orang dikali peserta, per pesanan sekali', () {
    final pkg = TripPackage.fromJson({
      'id': 1,
      'name': 'Paket',
      'price': 100000,
      'addOns': [
        {'id': 'drone', 'name': 'Dokumentasi drone', 'price': 300000},
        {'id': 'makan', 'name': 'Makan siang', 'price': 50000, 'perPerson': true},
      ],
    });
    final draft = BookingDraft(
      package: pkg,
      guests: 4,
      startDate: '2026-11-01',
      endDate: '2026-11-01',
      scheduleLabel: '',
    ).withAddOns(pkg.addOns);
    expect(draft.addOnTotal, 500000);
    expect(draft.packageTotal, 900000);
    expect(draft.totalWithFee(5000), 905000);
  });
}
