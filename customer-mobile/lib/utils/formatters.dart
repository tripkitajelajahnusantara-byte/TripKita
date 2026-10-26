import 'package:intl/intl.dart';

const monthsFull = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const weekdaysShort = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const weekdaysFull = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

final _idr = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

String formatIDR(num value) => _idr.format(value);

final _price = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp', decimalDigits: 0);

/// Harga pada kartu paket, tanpa spasi: `Rp999.000`.
String formatPrice(num value) => _price.format(value);

/// `2026-10-01` → `DateTime(2026, 10, 1)` pada zona lokal.
DateTime? parseIsoDate(String iso) {
  final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(iso.trim());
  if (match == null) return null;
  return DateTime(int.parse(match.group(1)!), int.parse(match.group(2)!), int.parse(match.group(3)!));
}

String toIsoDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

DateTime dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

/// `1 Oktober 2026`
String formatDateLong(DateTime? d) => d == null ? '-' : '${d.day} ${monthsFull[d.month - 1]} ${d.year}';

/// `1 Okt 2026`
String formatDateShort(DateTime? d) => d == null ? '-' : '${d.day} ${monthsShort[d.month - 1]} ${d.year}';

/// `1 Okt`
String formatDayMonth(DateTime? d) => d == null ? '' : '${d.day} ${monthsShort[d.month - 1]}';

/// Rentang tanggal ringkas: `25 – 27 Okt 2026`, `30 Okt – 2 Nov 2026`, atau
/// `30 Des 2026 – 2 Jan 2027`.
String formatDateRange(DateTime start, DateTime end) {
  if (dateOnly(start) == dateOnly(end)) return formatDateShort(start);
  if (start.year != end.year) return '${formatDateShort(start)} – ${formatDateShort(end)}';
  if (start.month != end.month) return '${formatDayMonth(start)} – ${formatDateShort(end)}';
  return '${start.day} – ${formatDateShort(end)}';
}

String formatIsoLong(String iso) {
  final d = parseIsoDate(iso);
  return d == null ? (iso.isEmpty ? 'Pilih Tanggal' : iso) : formatDateLong(d);
}

String twoDigits(int n) => n.toString().padLeft(2, '0');

/// Umur dalam tahun dari tanggal lahir ISO, `-` bila tidak valid.
String ageLabel(String birthIso) {
  final birth = parseIsoDate(birthIso);
  if (birth == null) return '-';
  final now = DateTime.now();
  var age = now.year - birth.year;
  if (now.month < birth.month || (now.month == birth.month && now.day < birth.day)) age--;
  return age > 0 ? '$age Tahun' : '0 Tahun';
}

/// Waktu dalam WIB terlepas dari zona perangkat: `Rabu, 16 Okt 2026, 14:56 WIB`.
String formatDateTimeWib(DateTime time) {
  final t = time.toUtc().add(const Duration(hours: 7));
  return '${weekdaysFull[t.weekday - 1]}, ${t.day} ${monthsShort[t.month - 1]} ${t.year}, '
      '${twoDigits(t.hour)}:${twoDigits(t.minute)} WIB';
}
