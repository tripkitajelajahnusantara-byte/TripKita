import 'dart:math' as math;

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/utils/formatters.dart';

// Konstanta dan helper tampilan paket. Kategori & tipe trip sama dengan
// `provider-web/src/utils/tripImages.ts`; highlight, foto, dan jadwal diambil
// dari data yang diisi mitra, bukan dikarang dari nama paket.

const officialCategories = [
  'City Tour',
  'Diving & Snorkeling',
  'Wisata Budaya & Sejarah',
  'Pantai',
  'Gunung',
  'Curug',
  'Keluarga Santai',
];

const officialTripTypes = ['Open Trip', 'Private Trip', 'Honeymoon', 'Family', 'Corporate'];

const allTripTypesLabel = 'Semua Tipe';
const allCategoriesLabel = 'Semua Kategori';

/// Tiga poin singkat untuk kartu paket: fasilitas termasuk yang diisi mitra,
/// dilengkapi fakta paket (durasi, minimal peserta, titik kumpul).
List<String> highlightsFor(TripPackage pkg) {
  final items = <String>[
    for (final f in pkg.includedFacilities.take(3)) '✓ $f',
  ];
  final facts = <String>[
    '🗓️ ${pkg.durationDays} Hari',
    if (pkg.minRequiredGuests > 1) '👥 Min. ${pkg.minRequiredGuests} Orang',
    if (pkg.meetingPoint.trim().length > 3) '📍 ${pkg.meetingPoint.trim()}',
  ];
  for (final f in facts) {
    if (items.length >= 3) break;
    items.add(f);
  }
  return items;
}

/// Foto sampul paket, atau string kosong bila mitra belum mengunggah foto.
String coverImageFor(TripPackage pkg) {
  final photos = pkg.photos;
  return photos.isEmpty ? '' : photos.first;
}

/// Label tanggal pada kartu Cari Trip: keberangkatan Open Trip terdekat, atau
/// rentang tanggal yang dibuka mitra untuk paket lain. Null bila tidak ada.
String? tripDateLabel(TripPackage pkg) {
  if (pkg.isOpenTrip) {
    final dep = nextDeparture(pkg);
    return dep == null ? null : departureRangeLabel(dep);
  }
  final today = dateOnly(DateTime.now());
  final dates = pkg.availableDates.map(parseIsoDate).whereType<DateTime>().where((d) => !d.isBefore(today)).toList()
    ..sort();
  return dates.isEmpty ? null : formatDateRange(dates.first, dates.last);
}

/// Tanggal paling awal untuk paket non-Open Trip (wajib H-7).
DateTime h7MinDate() => dateOnly(DateTime.now()).add(const Duration(days: 7));

/// Keberangkatan Open Trip mulai hari ini, urut tanggal; padanan
/// `upcomingDepartures` di web. Backend lama tanpa `departures` memakai satu
/// jadwal dari `startDate`.
List<Departure> upcomingDepartures(TripPackage pkg) {
  if (!pkg.isOpenTrip) return const [];
  final today = toIsoDate(DateTime.now());
  final list = pkg.departures;
  if (list != null) {
    return list.where((d) => parseIsoDate(d.date) != null && d.date.compareTo(today) >= 0).toList()
      ..sort((a, b) => a.date.compareTo(b.date));
  }
  final start = parseIsoDate(pkg.startDate);
  if (start == null || toIsoDate(start).compareTo(today) < 0) return const [];
  return [
    Departure(
      date: toIsoDate(start),
      endDate: toIsoDate(start.add(Duration(days: pkg.durationDays - 1))),
      quotaUsed: pkg.quotaUsed,
      seatsLeft: pkg.availableSeats,
    ),
  ];
}

/// Keberangkatan terdekat yang masih bisa dipesan, atau null.
Departure? nextDeparture(TripPackage pkg) {
  for (final d in upcomingDepartures(pkg)) {
    if (!d.closed && d.seatsLeft > 0) return d;
  }
  return null;
}

/// `25 – 27 Okt 2026`
String departureRangeLabel(Departure d) {
  final start = parseIsoDate(d.date)!;
  return formatDateRange(start, parseIsoDate(d.endDate) ?? start);
}

/// `3 hari, 2 malam` atau `1 hari`.
String durationLabel(int days) => days <= 1 ? '1 hari' : '$days hari, ${days - 1} malam';

/// Jarak lingkaran besar (haversine) dalam kilometer.
double distanceKm(double lat1, double lon1, double lat2, double lon2) {
  const earthRadiusKm = 6371.0;
  double rad(double deg) => deg * math.pi / 180;
  final dLat = rad(lat2 - lat1);
  final dLon = rad(lon2 - lon1);
  final a = math.pow(math.sin(dLat / 2), 2) + math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.pow(math.sin(dLon / 2), 2);
  return 2 * earthRadiusKm * math.asin(math.sqrt(a));
}

/// Urutkan paket dari titik kumpul terdekat ke [lat]/[lon]. Paket tanpa
/// koordinat tetap tampil di belakang dengan urutan semula.
void sortByDistance(List<TripPackage> packages, double lat, double lon) {
  double key(TripPackage p) {
    final pLat = p.meetingPointLatitude;
    final pLon = p.meetingPointLongitude;
    return pLat == null || pLon == null ? double.infinity : distanceKm(lat, lon, pLat, pLon);
  }

  final keys = {for (final p in packages) p: key(p)};
  // List.sort tidak stabil; indeks asal menjaga urutan paket tanpa koordinat.
  final index = {for (var i = 0; i < packages.length; i++) packages[i]: i};
  packages.sort((a, b) {
    final c = keys[a]!.compareTo(keys[b]!);
    return c != 0 ? c : index[a]!.compareTo(index[b]!);
  });
}
