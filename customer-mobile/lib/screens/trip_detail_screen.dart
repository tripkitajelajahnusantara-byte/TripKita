import 'package:flutter/material.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/models/review.dart';
import 'package:customer_mobile/screens/booking_screen.dart';
import 'package:customer_mobile/screens/provider_profile_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/date_range_calendar.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

/// Detail paket, padanan `CustomerPackageDetailPage` di web.
class TripDetailScreen extends StatefulWidget {
  final TripPackage package;

  /// Tanggal yang dipilih pengguna pada pencarian (YYYY-MM-DD).
  final String preferredDate;

  const TripDetailScreen({super.key, required this.package, this.preferredDate = ''});

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> {
  static const _reviewsPerPage = 3;

  late TripPackage _pkg = widget.package;
  DepartureOption? _departure;
  late String _customStart;
  late String _customEnd;
  late int _guests;

  List<PackageReview> _reviews = const [];
  PublicProvider? _provider;
  int _reviewPage = 1;
  int _photoIndex = 0;
  bool _extrasFailed = false;

  @override
  void initState() {
    super.initState();
    _applyPackage(_pkg, initial: true);
    _refreshPackage();
    _loadExtras();
  }

  void _applyPackage(TripPackage pkg, {bool initial = false}) {
    _pkg = pkg;
    _departure = openTripDeparture(pkg);
    final preferred = widget.preferredDate;

    if (initial) {
      final minIso = _minCustomIso;
      var start = parseIsoDate(preferred) != null && preferred.compareTo(minIso) >= 0 ? preferred : minIso;
      final open = pkg.availableDates.where((d) => d.compareTo(minIso) >= 0 && !pkg.bookedDates.contains(d)).toList()
        ..sort();
      if (open.isNotEmpty && !open.contains(start)) start = open.first;
      _setCustomStart(start);
      _guests = pkg.minRequiredGuests;
    } else if (_guests < pkg.minRequiredGuests) {
      _guests = pkg.minRequiredGuests;
    }
  }

  void _setCustomStart(String startIso) {
    _customStart = startIso;
    final d = parseIsoDate(startIso)!;
    _customEnd = toIsoDate(d.add(Duration(days: _pkg.durationDays - 1)));
  }

  /// Memuat ulang kuota dan tanggal terbaru, karena data dari daftar atau
  /// favorit bisa sudah usang.
  Future<void> _refreshPackage() async {
    try {
      await PackageCatalog.load(force: true);
      final fresh = await PackageCatalog.findById(widget.package.id);
      if (fresh != null && mounted) setState(() => _applyPackage(fresh));
    } catch (_) {}
  }

  Future<void> _loadExtras() async {
    if (_pkg.id <= 0 || _pkg.providerId <= 0) {
      _extrasFailed = true;
      return;
    }
    try {
      final results = await Future.wait([
        ApiService.fetchPackageReviews(_pkg.id),
        ApiService.fetchProvider(_pkg.providerId),
      ]);
      if (!mounted) return;
      setState(() {
        _reviews = results[0] as List<PackageReview>;
        _provider = results[1] as PublicProvider;
      });
    } catch (_) {
      // Ulasan dan profil mitra bersifat pelengkap.
      if (mounted) setState(() => _extrasFailed = true);
    }
  }

  bool get _isOpenTrip => _pkg.isOpenTrip;

  /// Tanggal berangkat paling awal untuk paket non-Open Trip: H-7 dan tidak
  /// sebelum awal periode paket (backend menolak tanggal di luar periode).
  String get _minCustomIso {
    final h7 = toIsoDate(h7MinDate());
    final start = parseIsoDate(_pkg.startDate) == null ? '' : _pkg.startDate.substring(0, 10);
    return start.compareTo(h7) > 0 ? start : h7;
  }

  /// Tanggal berangkat paling akhir: akhir periode paket, bila diatur.
  String? get _maxCustomIso => parseIsoDate(_pkg.endDate) == null ? null : _pkg.endDate.substring(0, 10);

  bool get _isOutsidePeriod {
    if (_isOpenTrip) return false;
    final max = _maxCustomIso;
    return _customStart.compareTo(_minCustomIso) < 0 || (max != null && _customStart.compareTo(max) > 0);
  }
  int get _availableSeats => _pkg.availableSeats;
  int get _maxGuests {
    final byQuota = _availableSeats;
    return _pkg.maxGuests > 0 && _pkg.maxGuests < byQuota ? _pkg.maxGuests : byQuota;
  }

  List<String> get _bookedInRange => _pkg.bookedDates
      .where((b) => b.compareTo(_customStart) >= 0 && b.compareTo(_customEnd) <= 0)
      .toList();
  bool get _isRangeBooked => !_isOpenTrip && _bookedInRange.isNotEmpty;
  bool get _isSelectedDateClosed =>
      !_isOpenTrip && _pkg.availableDates.isNotEmpty && !_pkg.availableDates.contains(_customStart);

  bool get _bookingBlocked =>
      _availableSeats <= 0 || _guests > _availableSeats || _isSelectedDateClosed || _isRangeBooked ||
      _isOutsidePeriod || (_isOpenTrip && _departure == null);

  String get _ctaLabel {
    // Satu-satunya tombol pesan ada di bar bawah, jadi labelnya harus
    // menjelaskan sendiri kenapa tombol nonaktif.
    if (_availableSeats <= 0) return 'Kuota Habis';
    if (_guests > _availableSeats) return 'Melebihi Kuota';
    if (_isRangeBooked) return 'Tanggal Penuh';
    if (_isOpenTrip && _departure == null) return 'Jadwal Belum Ada';
    if (_isOutsidePeriod) return 'Ganti Tanggal';
    if (_isSelectedDateClosed) return 'Ganti Tanggal';
    return 'Pesan Sekarang';
  }

  int get _total => _pkg.price * _guests;

  Future<void> _warn(String title, String message) =>
      showNoticeDialog(context, title: title, message: message, isError: true);

  Future<void> _continueBooking() async {
    final typeLabel = _pkg.tripType.isEmpty ? 'ini' : _pkg.tripType;
    if (_availableSeats <= 0) {
      return _warn('Kuota Habis', 'Maaf, kuota untuk paket ini telah habis. Silakan pilih paket wisata lain.');
    }
    if (_guests < _pkg.minRequiredGuests) {
      return _warn('Jumlah Peserta Kurang', 'Minimal pemesanan untuk paket $typeLabel adalah ${_pkg.minRequiredGuests} orang.');
    }
    if (_guests > _availableSeats) {
      return _warn('Melebihi Sisa Kuota',
          'Jumlah peserta ($_guests orang) melebihi sisa kuota yang tersedia ($_availableSeats seat).');
    }
    if (_isRangeBooked) {
      return _warn('Jadwal Terbooking',
          'Rentang tanggal ${formatIsoLong(_customStart)} - ${formatIsoLong(_customEnd)} sudah TERBOOKING oleh pemesan lain. Silakan pilih rentang tanggal lain.');
    }
    if (_isSelectedDateClosed) {
      return _warn('Tanggal Tidak Dibuka',
          'Penyelenggara tidak membuka tanggal ${formatIsoLong(_customStart)} untuk paket ini. Silakan pilih salah satu tanggal yang tersedia pada kalender.');
    }
    final h7Iso = toIsoDate(h7MinDate());
    if (!_isOpenTrip && _customStart.compareTo(h7Iso) < 0) {
      return _warn('Pemesanan Wajib H-7',
          'Pemesanan paket $typeLabel wajib H-7 sebelum keberangkatan. Tanggal paling awal yang dapat dipesan adalah ${formatIsoLong(h7Iso)}.');
    }
    if (_isOutsidePeriod) {
      return _warn('Di Luar Periode Paket', _periodMessage);
    }

    final String startIso;
    final String endIso;
    final String label;
    if (_isOpenTrip) {
      final departure = _departure;
      if (departure == null) {
        return _warn('Jadwal Belum Tersedia',
            'Penyelenggara belum menetapkan jadwal keberangkatan yang akan datang untuk Open Trip ini.');
      }
      startIso = departure.dateIso;
      endIso = departure.endIso;
      label = departure.label;
    } else {
      startIso = _customStart;
      endIso = _customEnd;
      label = _customStart == _customEnd
          ? formatIsoLong(_customStart)
          : '${formatIsoLong(_customStart)} - ${formatIsoLong(_customEnd)}';
    }

    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => BookingScreen(
        draft: BookingDraft(package: _pkg, guests: _guests, startDate: startIso, endDate: endIso, scheduleLabel: label),
      ),
    ));
  }

  String get _periodMessage {
    final max = _maxCustomIso;
    return max == null
        ? 'Tanggal paling awal yang dapat dipesan untuk paket ini adalah ${formatIsoLong(_minCustomIso)}.'
        : 'Paket ini hanya dapat dipesan untuk keberangkatan ${formatIsoLong(_minCustomIso)} sampai ${formatIsoLong(max)}.';
  }

  Future<void> _bookNow() async {
    if (!await ensureLoggedIn(context)) return;
    if (!mounted) return;
    await _continueBooking();
  }

  Future<void> _openCalendar() async {
    final result = await showTripCalendarSheet(
      context,
      tripType: _pkg.tripType.isEmpty ? 'Private Trip' : _pkg.tripType,
      durationDays: _pkg.durationDays,
      startIso: _customStart,
      endIso: _customEnd,
      bookedDates: _pkg.bookedDates,
      availableDates: _pkg.availableDates,
      minDate: parseIsoDate(_minCustomIso)!,
      maxDate: parseIsoDate(_maxCustomIso ?? ''),
    );
    if (result != null) {
      setState(() {
        _customStart = result.startIso;
        _customEnd = result.endIso;
      });
    }
  }

  void _openProvider() {
    if (_pkg.providerId <= 0) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ProviderProfileScreen(providerId: _pkg.providerId, initial: _provider),
    ));
  }

  void _openLightbox(List<String> photos, int index) {
    Navigator.of(context).push(PageRouteBuilder(
      opaque: false,
      pageBuilder: (_, __, ___) => _PhotoLightbox(photos: photos, initialIndex: index),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final photos = _pkg.photos;
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await _refreshPackage();
          await _loadExtras();
        },
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 280,
              backgroundColor: Colors.white,
              foregroundColor: AppColors.textDark,
              leading: Padding(
                padding: const EdgeInsets.all(8),
                child: CircleAvatar(
                  backgroundColor: Colors.white.withValues(alpha: 0.92),
                  child: IconButton(
                    tooltip: 'Kembali ke Daftar Trip',
                    icon: const Icon(Icons.arrow_back, color: AppColors.textDark, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
              ),
              actions: [
                ShareButton(_pkg),
                const SizedBox(width: 8),
                FavoriteButton(_pkg),
                const SizedBox(width: 12),
              ],
              flexibleSpace: FlexibleSpaceBar(background: _buildGallery(photos)),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              sliver: SliverList.list(children: [
                _buildTitleCard(),
                const SizedBox(height: 16),
                _buildBookingCard(),
                const SizedBox(height: 16),
                _buildDescription(),
                const SizedBox(height: 16),
                _buildItinerary(),
                const SizedBox(height: 16),
                _buildFacilities(),
                const SizedBox(height: 16),
                _buildMeetingPoint(),
                const SizedBox(height: 16),
                _buildProviderCard(),
                const SizedBox(height: 16),
                _buildReviews(),
              ]),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildGallery(List<String> photos) {
    if (photos.isEmpty) return const NetworkPhoto('');
    return Stack(fit: StackFit.expand, children: [
      PageView.builder(
        itemCount: photos.length,
        onPageChanged: (i) => setState(() => _photoIndex = i),
        itemBuilder: (context, i) => GestureDetector(
          onTap: () => _openLightbox(photos, i),
          child: NetworkPhoto(photos[i]),
        ),
      ),
      Positioned(
        right: 12,
        bottom: 12,
        child: GestureDetector(
          onTap: () => _openLightbox(photos, _photoIndex),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: const Color(0x800F172A), borderRadius: BorderRadius.circular(8)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.layers_outlined, size: 15, color: Colors.white),
              const SizedBox(width: 6),
              Text('Lihat semua foto (${photos.length})',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
            ]),
          ),
        ),
      ),
      Positioned(
        left: 0,
        right: 0,
        bottom: 16,
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (var i = 0; i < photos.length; i++)
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: i == _photoIndex ? 18 : 7,
              height: 7,
              decoration: BoxDecoration(
                color: i == _photoIndex ? Colors.white : Colors.white54,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
        ]),
      ),
    ]);
  }

  Widget _buildTitleCard() {
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(_pkg.name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textDark)),
        const SizedBox(height: 10),
        Wrap(spacing: 16, runSpacing: 6, children: [
          Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.location_on_outlined, size: 16, color: AppColors.accent),
            const SizedBox(width: 4),
            Text(_pkg.destination, style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
          ]),
          Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.calendar_today_outlined, size: 15, color: AppColors.accent),
            const SizedBox(width: 4),
            Text.rich(TextSpan(
              text: 'Kategori: ',
              style: const TextStyle(fontSize: 14, color: AppColors.textMuted),
              children: [TextSpan(text: _pkg.category, style: const TextStyle(fontWeight: FontWeight.w700))],
            )),
          ]),
        ]),
      ]),
    );
  }

  Widget _buildBookingCard() {
    return SectionCard(
      radius: 20,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Harga per orang',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
              Text(formatIDR(_pkg.price),
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.accent)),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(color: AppColors.accentLight, borderRadius: BorderRadius.circular(20)),
            child: Text('${_pkg.tripType.isEmpty ? 'Open Trip' : _pkg.tripType} • Min. ${_pkg.minRequiredGuests} Pax',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary)),
          ),
        ]),
        const Divider(height: 26),
        _isOpenTrip ? _buildOpenTripSchedule() : _buildCalendarTrigger(),
        const SizedBox(height: 16),
        _buildGuestCounter(),
        const Divider(height: 26),
        PriceRow('Paket (${_guests}x)', formatIDR(_total)),
        const Divider(height: 14),
        PriceRow('Total Estimasi', formatIDR(_total), valueColor: AppColors.accent, emphasize: true),
      ]),
    );
  }

  Widget _buildOpenTripSchedule() {
    final quotaMin = _pkg.quotaMin < 1 ? 1 : _pkg.quotaMin;
    final used = _pkg.quotaUsed;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.accentSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.accentBorder),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('JADWAL KEBERANGKATAN (OPEN TRIP)',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.accent)),
        const SizedBox(height: 8),
        if (_departure == null)
          const Text('Belum ada jadwal keberangkatan yang akan datang untuk Open Trip ini.',
              style: TextStyle(fontSize: 13, color: AppColors.textMuted))
        else
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.accent, width: 1.5),
            ),
            child: Row(children: [
              const Icon(Icons.calendar_today_outlined, size: 16, color: AppColors.accent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(_departure!.label,
                    style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.textDark)),
              ),
            ]),
          ),
        // Keterangan jadwal tambahan yang ditulis mitra, bila berbeda dari
        // label tanggal otomatis.
        if (_pkg.schedule.isNotEmpty && !_pkg.schedule.contains(' s/d ')) ...[
          const SizedBox(height: 8),
          Text(_pkg.schedule, style: const TextStyle(fontSize: 12.5, color: AppColors.textMedium)),
        ],
        if (used < quotaMin) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.warningBg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.warningBorder),
            ),
            child: Column(children: [
              _quotaRow('Minimal Kuota Open Trip:', '$quotaMin Pax', AppColors.textDark),
              const SizedBox(height: 4),
              _quotaRow('Status Kuota Terisi:', '$used / $quotaMin Pax', AppColors.primary),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
                child: Text('Kurang ${quotaMin - used} orang lagi agar trip PASTI BERANGKAT!',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: AppColors.warningText)),
              ),
            ]),
          ),
        ],
      ]),
    );
  }

  Widget _quotaRow(String label, String value, Color valueColor) => Row(children: [
        Expanded(
          child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.warningText)),
        ),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: valueColor)),
      ]);

  Widget _buildCalendarTrigger() {
    final booked = _bookedInRange;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.accentSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.accentBorder),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Expanded(
            child: Text('PILIH JADWAL', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.accent)),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: AppColors.accentBorder, borderRadius: BorderRadius.circular(4)),
            child: const Text('Min. H-7', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.accent)),
          ),
        ]),
        const SizedBox(height: 10),
        Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: _openCalendar,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _isRangeBooked ? AppColors.danger : AppColors.accent, width: 2),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(children: [
                  const Icon(Icons.calendar_month_outlined, size: 15, color: AppColors.accent),
                  const SizedBox(width: 6),
                  const Expanded(
                    child: Text('Kalender Jadwal Perjalanan',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: AppColors.accent)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: AppColors.accentLight, borderRadius: BorderRadius.circular(4)),
                    child: const Text('Pilih Tanggal >',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.accent)),
                  ),
                ]),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
                  child: Row(children: [
                    Expanded(child: _dateCell('Tanggal Mulai', formatIsoLong(_customStart))),
                    Expanded(child: _dateCell('Tanggal Selesai', formatIsoLong(_customEnd))),
                  ]),
                ),
              ]),
            ),
          ),
        ),
        if (_isOutsidePeriod) ...[
          const SizedBox(height: 10),
          InfoBanner(message: '⚠️ $_periodMessage Silakan pilih tanggal lain pada kalender.'),
        ],
        if (_isSelectedDateClosed && !_isRangeBooked && !_isOutsidePeriod) ...[
          const SizedBox(height: 10),
          InfoBanner(
            message:
                '⚠️ Tanggal ${formatIsoLong(_customStart)} tidak dibuka penyelenggara untuk paket ini. Silakan pilih salah satu tanggal yang tersedia pada kalender.',
          ),
        ],
        if (_isRangeBooked) ...[
          const SizedBox(height: 10),
          InfoBanner(
            color: AppColors.dangerDark,
            background: AppColors.dangerSoft,
            border: AppColors.dangerBorder,
            textColor: const Color(0xFF991B1B),
            message:
                '❌ Dalam rentang tanggal yang Anda pilih (${_customStart == _customEnd ? formatIsoLong(_customStart) : '${formatIsoLong(_customStart)} - ${formatIsoLong(_customEnd)}'}), terdapat tanggal yang sudah terbooking (${booked.map(formatIsoLong).join(', ')} FULL). Silakan pilih rentang tanggal lain pada kalender.',
          ),
        ],
      ]),
    );
  }

  Widget _dateCell(String label, String value) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: AppColors.textDark)),
      ]);

  Widget _buildGuestCounter() {
    final seats = _availableSeats;
    final remaining = (seats - _guests) < 0 ? 0 : seats - _guests;
    final ok = seats > 0 && _guests <= seats;
    final seatLabel = seats <= 0
        ? 'Sisa 0 seat'
        : _guests > seats
            ? 'Melebihi Kuota ($seats seat)'
            : 'Sisa $remaining seat';
    final canDecrease = _guests > _pkg.minRequiredGuests && seats > 0;
    final canIncrease = _guests < _maxGuests && seats > 0;

    Widget stepButton(String symbol, bool enabled, VoidCallback onTap) => SizedBox(
          width: 34,
          height: 34,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              padding: EdgeInsets.zero,
              backgroundColor: enabled ? AppColors.background : AppColors.border,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
            ),
            onPressed: enabled ? onTap : null,
            child: Text(symbol, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ),
        );

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        const Expanded(
          child: Text('Jumlah Peserta', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.textMedium)),
        ),
        Text(seatLabel,
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: ok ? AppColors.success : AppColors.danger)),
      ]),
      const SizedBox(height: 6),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.borderStrong),
        ),
        child: Row(children: [
          const Icon(Icons.groups_outlined, size: 18, color: AppColors.textLight),
          const SizedBox(width: 12),
          Expanded(
            child: Text('$_guests Orang',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
          ),
          stepButton('-', canDecrease, () => setState(() => _guests--)),
          const SizedBox(width: 10),
          stepButton('+', canIncrease, () => setState(() => _guests++)),
        ]),
      ),
      if (_pkg.minRequiredGuests > 1)
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            '* Minimal pemesanan paket ${_pkg.tripType.isEmpty ? 'ini' : _pkg.tripType} adalah ${_pkg.minRequiredGuests} orang.',
            style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
          ),
        ),
    ]);
  }

  Widget _buildDescription() {
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SectionHeading('Deskripsi Paket Wisata'),
        const SizedBox(height: 10),
        Text(_pkg.description.isEmpty ? 'Deskripsi paket belum dilengkapi oleh provider.' : _pkg.description,
            style: const TextStyle(fontSize: 14, color: AppColors.textMedium, height: 1.7)),
      ]),
    );
  }

  Widget _buildItinerary() {
    final items = _pkg.itinerary;
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SectionHeading('Rencana Perjalanan (Itinerary)'),
        const SizedBox(height: 14),
        if (items.isEmpty)
          const Text('Itinerary belum dilengkapi oleh provider.', style: TextStyle(color: AppColors.textMuted)),
        for (final item in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: AppColors.accentLight, borderRadius: BorderRadius.circular(6)),
                child: Text(item.day,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.accent)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(item.title,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                  if (item.description.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(item.description, style: const TextStyle(fontSize: 13, color: AppColors.textMuted, height: 1.5)),
                  ],
                ]),
              ),
            ]),
          ),
      ]),
    );
  }

  Widget _buildFacilities() {
    Widget list(String title, IconData icon, Color color, List<String> items, Color textColor) =>
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color)),
          ]),
          const SizedBox(height: 10),
          if (items.isEmpty) const Text('Belum diinformasikan.', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
          for (final f in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Padding(padding: const EdgeInsets.only(top: 1), child: Icon(icon, size: 15, color: color)),
                const SizedBox(width: 8),
                Expanded(child: Text(f, style: TextStyle(fontSize: 13, color: textColor))),
              ]),
            ),
        ]);

    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SectionHeading('Fasilitas Paket'),
        const Divider(height: 24),
        list('Fasilitas Termasuk', Icons.check_circle_outline, AppColors.success, _pkg.includedFacilities, AppColors.textBody),
        const SizedBox(height: 14),
        list('Fasilitas Tidak Termasuk', Icons.cancel_outlined, AppColors.danger, _pkg.excludedFacilities, AppColors.textMuted),
      ]),
    );
  }

  Widget _buildMeetingPoint() {
    final point = _pkg.meetingPoint.trim();
    final hasPoint = point.length > 3;
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SectionHeading('Lokasi Titik Kumpul (Meeting Point)', icon: Icons.location_on_outlined, iconColor: AppColors.primary),
        const SizedBox(height: 12),
        if (!hasPoint)
          const Text('Titik kumpul belum dilengkapi oleh provider.', style: TextStyle(fontSize: 14, color: AppColors.textMuted))
        else ...[
          Text('📍 $point',
              style: const TextStyle(fontSize: 14, color: AppColors.textBody, fontWeight: FontWeight.w700, height: 1.6)),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
            ),
            onPressed: () => openExternal(mapsSearchUri(point)),
            icon: const Icon(Icons.map_outlined, size: 18),
            label: const Text('Buka di Google Maps'),
          ),
        ],
      ]),
    );
  }

  Widget _buildProviderCard() {
    // Selama profil mitra belum termuat (atau gagal dimuat), jangan tampilkan
    // nama/kota karangan.
    final loaded = _provider != null && _provider!.businessName.isNotEmpty;
    final name = loaded ? _provider!.businessName : (_extrasFailed ? 'Info mitra belum dapat dimuat' : 'Memuat info mitra...');
    final city = loaded ? _provider!.operationalCity : '';
    final rating = _provider?.rating ?? 0;
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('DISELENGGARAKAN OLEH MITRA PROVIDER',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.textMuted, letterSpacing: 0.5)),
        const SizedBox(height: 14),
        InkWell(
          onTap: _openProvider,
          child: Row(children: [
            Container(
              width: 56,
              height: 56,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(14)),
              child: Text(loaded ? name[0].toUpperCase() : '·',
                  style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(name,
                    style: TextStyle(
                      fontSize: loaded ? 16 : 14,
                      fontWeight: loaded ? FontWeight.w800 : FontWeight.w600,
                      color: loaded ? AppColors.textDark : AppColors.textMuted,
                    )),
                const SizedBox(height: 4),
                if (loaded)
                Wrap(spacing: 10, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
                  if (city.isNotEmpty)
                  Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.location_on_outlined, size: 13, color: AppColors.accent),
                    const SizedBox(width: 3),
                    Text(city, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ]),
                  Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(rating > 0 ? Icons.star : Icons.star_border, size: 13, color: AppColors.warning),
                    const SizedBox(width: 3),
                    Text(rating > 0 ? '${rating.toStringAsFixed(1)} / 5.0' : 'Belum ada rating',
                        style: const TextStyle(fontSize: 12, color: AppColors.warning, fontWeight: FontWeight.w700)),
                  ]),
                ]),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 14),
        OutlinedButton(
          style: OutlinedButton.styleFrom(
            backgroundColor: AppColors.accentSoft,
            foregroundColor: AppColors.accent,
            side: const BorderSide(color: Color(0xFFBFDBFE)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: _pkg.providerId > 0 ? _openProvider : null,
          child: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text('Lihat Profil & Paket'),
            SizedBox(width: 6),
            Icon(Icons.chevron_right, size: 16),
          ]),
        ),
      ]),
    );
  }

  Widget _buildReviews() {
    final totalPages = (_reviews.length / _reviewsPerPage).ceil();
    final page = _reviewPage.clamp(1, totalPages < 1 ? 1 : totalPages);
    final current = _reviews.skip((page - 1) * _reviewsPerPage).take(_reviewsPerPage).toList();
    final average = _reviews.isEmpty ? 0.0 : _reviews.fold<int>(0, (sum, r) => sum + r.rating) / _reviews.length;

    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SectionHeading('Ulasan & Rating Pengunjung', icon: Icons.chat_bubble_outline),
        const SizedBox(height: 6),
        Text.rich(TextSpan(
          text: 'Berdasarkan ',
          style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
          children: [
            TextSpan(text: '${_reviews.length}', style: const TextStyle(fontWeight: FontWeight.w800)),
            const TextSpan(text: ' ulasan wisatawan terverifikasi'),
          ],
        )),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.warningBg,
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: const Color(0xFFFEF3C7)),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(_reviews.isEmpty ? Icons.star_border : Icons.star, size: 18, color: AppColors.warning),
            const SizedBox(width: 6),
            Text(_reviews.isEmpty ? 'Belum ada rating' : '${average.toStringAsFixed(1)} / 5.0',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFFB45309))),
          ]),
        ),
        const Divider(height: 26),
        if (current.isEmpty)
          const Text('Belum ada ulasan terverifikasi untuk paket ini.', style: TextStyle(color: AppColors.textMuted)),
        for (final r in current)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const CircleAvatar(
                  radius: 18,
                  backgroundColor: AppColors.accent,
                  child: Text('W', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Wisatawan terverifikasi',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                    Row(children: [
                      Icon(Icons.check_circle_outline, size: 12, color: AppColors.success),
                      SizedBox(width: 4),
                      Text('Terverifikasi Pembeli',
                          style: TextStyle(fontSize: 11, color: AppColors.success, fontWeight: FontWeight.w600)),
                    ]),
                  ]),
                ),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Row(children: [
                    for (var i = 0; i < 5; i++)
                      Icon(i < r.rating ? Icons.star : Icons.star_border,
                          size: 13, color: i < r.rating ? AppColors.warning : AppColors.borderStrong),
                  ]),
                  Text(formatDateShort(r.createdAt), style: const TextStyle(fontSize: 11, color: AppColors.textLight)),
                ]),
              ]),
              const SizedBox(height: 8),
              Text('"${r.comment}"', style: const TextStyle(fontSize: 13.5, color: AppColors.textBody, height: 1.5)),
            ]),
          ),
        if (totalPages > 1) ...[
          const Divider(height: 20),
          Text('Halaman $page dari $totalPages (${_reviews.length} Ulasan)',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Row(children: [
            OutlinedButton.icon(
              onPressed: page > 1 ? () => setState(() => _reviewPage = page - 1) : null,
              icon: const Icon(Icons.chevron_left, size: 16),
              label: const Text('Sebelumnya'),
            ),
            const Spacer(),
            OutlinedButton(
              onPressed: page < totalPages ? () => setState(() => _reviewPage = page + 1) : null,
              child: const Row(mainAxisSize: MainAxisSize.min, children: [Text('Berikutnya'), Icon(Icons.chevron_right, size: 16)]),
            ),
          ]),
        ],
      ]),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.borderStrong)),
        boxShadow: [BoxShadow(color: Color(0x1A000000), blurRadius: 20, offset: Offset(0, -4))],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(children: [
            Expanded(
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Total (${_guests}x)',
                    style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
                Text(formatIDR(_total), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.accent)),
              ]),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
              onPressed: _bookingBlocked ? null : _bookNow,
              child: Text(_ctaLabel),
            ),
          ]),
        ),
      ),
    );
  }
}

class _PhotoLightbox extends StatefulWidget {
  final List<String> photos;
  final int initialIndex;

  const _PhotoLightbox({required this.photos, required this.initialIndex});

  @override
  State<_PhotoLightbox> createState() => _PhotoLightboxState();
}

class _PhotoLightboxState extends State<_PhotoLightbox> {
  late final _controller = PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xEB0F172A),
      body: SafeArea(
        child: Column(children: [
          Align(
            alignment: Alignment.centerRight,
            child: IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close, color: Colors.white, size: 26),
            ),
          ),
          Expanded(
            child: PageView.builder(
              controller: _controller,
              itemCount: widget.photos.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (context, i) => InteractiveViewer(
                child: Center(child: NetworkPhoto(widget.photos[i], fit: BoxFit.contain)),
              ),
            ),
          ),
          SizedBox(
            height: 64,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              itemCount: widget.photos.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, i) => GestureDetector(
                onTap: () => _controller.animateToPage(i, duration: const Duration(milliseconds: 250), curve: Curves.easeOut),
                child: Opacity(
                  opacity: i == _index ? 1 : 0.6,
                  child: Container(
                    width: 64,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: i == _index ? AppColors.accent : Colors.transparent, width: 2),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: NetworkPhoto(widget.photos[i]),
                  ),
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}
