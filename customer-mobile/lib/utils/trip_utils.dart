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

const indonesiaProvinces = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
  'Jambi', 'Sumatera Selatan', 'Bangka Belitung', 'Bengkulu', 'Lampung',
  'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
  'Bali', 'Nusa Tenggara Barat (NTB)', 'Nusa Tenggara Timur (NTT)',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Maluku', 'Maluku Utara',
  'Papua', 'Papua Barat', 'Papua Barat Daya', 'Papua Tengah', 'Papua Pegunungan', 'Papua Selatan',
];

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

/// Tanggal paling awal untuk paket non-Open Trip (wajib H-7).
DateTime h7MinDate() => dateOnly(DateTime.now()).add(const Duration(days: 7));

class DepartureOption {
  final String dateIso;
  final String endIso;
  final String label;

  const DepartureOption(this.dateIso, this.endIso, this.label);
}

/// Keberangkatan Open Trip. Mitra menetapkan satu jadwal (tanggal mulai dan
/// selesai) pada Partner Hub, dan backend hanya menerima tanggal dalam
/// rentang itu. Mengembalikan null bila jadwal belum diisi atau sudah lewat.
DepartureOption? openTripDeparture(TripPackage pkg) {
  final start = parseIsoDate(pkg.startDate);
  if (start == null || !start.isAfter(dateOnly(DateTime.now()))) return null;
  final configuredEnd = parseIsoDate(pkg.endDate);
  final end = configuredEnd != null && !configuredEnd.isBefore(start)
      ? configuredEnd
      : start.add(Duration(days: pkg.durationDays - 1));
  final days = end.difference(start).inDays + 1;
  final label = start == end
      ? '${formatDateLong(start)} (1 Hari)'
      : '${start.day} ${monthsShort[start.month - 1]}–${end.day} ${monthsShort[end.month - 1]} ${end.year} ($days Hari)';
  return DepartureOption(toIsoDate(start), toIsoDate(end), label);
}
