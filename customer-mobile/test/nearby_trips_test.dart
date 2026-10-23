import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/screens/trip_list_screen.dart';
import 'package:customer_mobile/services/location_service.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/trip_utils.dart';

class _FakeGeolocator extends GeolocatorPlatform {
  bool serviceEnabled = true;
  LocationPermission permission = LocationPermission.whileInUse;
  bool openedSettings = false;

  @override
  Future<bool> isLocationServiceEnabled() async => serviceEnabled;

  @override
  Future<LocationPermission> checkPermission() async => permission;

  @override
  Future<LocationPermission> requestPermission() async => permission;

  @override
  Future<bool> openLocationSettings() async => openedSettings = true;

  @override
  Future<Position?> getLastKnownPosition({bool forceLocationManager = false}) async => null;

  @override
  Future<Position> getCurrentPosition({LocationSettings? locationSettings}) async => Position(
        // Malang, Jawa Timur.
        latitude: -7.98,
        longitude: 112.63,
        timestamp: DateTime(2026),
        accuracy: 100,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        headingAccuracy: 0,
        speed: 0,
        speedAccuracy: 0,
      );
}

TripPackage _pkg(int id, String name, double? lat, double? lon) => TripPackage.fromJson({
      'id': id,
      'name': name,
      'destination': name,
      'price': 100000,
      'meetingPointLatitude': lat,
      'meetingPointLongitude': lon,
    });

void main() {
  late _FakeGeolocator geo;

  setUp(() {
    geo = _FakeGeolocator();
    GeolocatorPlatform.instance = geo;
    LocationService.debugReset();
    PackageCatalog.debugCache = [
      _pkg(1, 'Trip Jakarta', -6.2, 106.8),
      _pkg(2, 'Trip Tanpa Peta', null, null),
      _pkg(3, 'Trip Bromo', -7.94, 112.95),
    ];
  });

  Future<void> pump(WidgetTester tester, TripSearchParams params) async {
    tester.view.physicalSize = const Size(360 * 3, 800 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(theme: AppTheme.light(), home: TripListScreen(params: params)));
    await tester.pumpAndSettle();
  }

  List<String> titles(WidgetTester tester) => [
        for (final name in ['Trip Bromo', 'Trip Jakarta', 'Trip Tanpa Peta'])
          if (find.text(name).evaluate().isNotEmpty) name,
      ]..sort((a, b) => tester.getTopLeft(find.text(a).first).dy.compareTo(tester.getTopLeft(find.text(b).first).dy));

  test('urutan jarak: terdekat dulu, paket tanpa koordinat di belakang', () {
    final list = [_pkg(1, 'Jakarta', -6.2, 106.8), _pkg(2, 'Tanpa', null, null), _pkg(3, 'Bromo', -7.94, 112.95)];
    sortByDistance(list, -7.98, 112.63);
    expect(list.map((p) => p.name), ['Bromo', 'Jakarta', 'Tanpa']);
    expect(distanceKm(-6.2, 106.8, -7.98, 112.63), closeTo(672, 15));
  });

  testWidgets('dari navigasi bawah: trip terdekat dulu dengan label Lokasi Terdekat', (tester) async {
    await pump(tester, const TripSearchParams(nearMe: true));
    expect(find.text('Lokasi Terdekat'), findsOneWidget);
    expect(find.text('Ubah'), findsOneWidget);
    expect(titles(tester).first, 'Trip Bromo');
  });

  testWidgets('dari Beranda dengan filter: tanpa GPS, sesuai filter', (tester) async {
    geo.serviceEnabled = false;
    await pump(tester, const TripSearchParams(destination: 'Jakarta'));
    expect(find.text('Aktifkan Lokasi'), findsNothing, reason: 'filter Beranda tidak meminta lokasi');
    expect(find.text('Trip Jakarta'), findsWidgets);
    expect(find.text('Trip Bromo'), findsNothing);
  });

  testWidgets('GPS mati: tawarkan aktifkan, tetap bisa lihat semua trip', (tester) async {
    geo.serviceEnabled = false;
    await pump(tester, const TripSearchParams(nearMe: true));
    expect(find.text('Aktifkan Lokasi'), findsWidgets);
    await tester.tap(find.text('Lihat Semua Trip'));
    await tester.pumpAndSettle();
    expect(geo.openedSettings, isFalse);
    expect(find.text('Semua Trip'), findsOneWidget);
    expect(titles(tester), hasLength(greaterThanOrEqualTo(2)));
  });

  testWidgets('izin lokasi ditolak: semua trip tetap tampil', (tester) async {
    geo.permission = LocationPermission.deniedForever;
    await pump(tester, const TripSearchParams(nearMe: true));
    expect(find.text('Semua Trip'), findsOneWidget);
    expect(find.textContaining('Izin lokasi tidak diberikan'), findsOneWidget);
    expect(titles(tester), isNotEmpty);
  });
}
