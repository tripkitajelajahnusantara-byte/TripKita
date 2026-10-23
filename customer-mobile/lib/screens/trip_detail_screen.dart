import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/models/review.dart';
import 'package:customer_mobile/screens/booking_screen.dart';
import 'package:customer_mobile/screens/provider_profile_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/services/wishlist_store.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/schedule_sheets.dart';
import 'package:customer_mobile/widgets/share_package_sheet.dart';

const _heroHeight = 270.0;
const _tabs = ['Rencana Perjalanan', 'Fasilitas', 'Lokasi', 'Rating & Ulasan'];

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
  late TripPackage _pkg = widget.package;
  late int _guests = _pkg.minRequiredGuests;
  ScheduleChoice? _schedule;

  List<PackageReview> _reviews = const [];
  PublicProvider? _provider;
  bool _extrasFailed = false;
  int _photoIndex = 0;
  bool _descExpanded = false;

  final _scroll = ScrollController();
  final _sectionKeys = List.generate(_tabs.length, (_) => GlobalKey());
  bool _collapsed = false;
  int _activeTab = 0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _refreshPackage();
    _loadExtras();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  double get _headerHeight => MediaQuery.paddingOf(context).top + 56 + 44;

  void _onScroll() {
    final collapsed = _scroll.offset > _heroHeight - MediaQuery.paddingOf(context).top - 56;
    var active = 0;
    for (var i = 0; i < _sectionKeys.length; i++) {
      final box = _sectionKeys[i].currentContext?.findRenderObject() as RenderBox?;
      if (box != null && box.attached && box.localToGlobal(Offset.zero).dy <= _headerHeight + 8) active = i;
    }
    if (collapsed != _collapsed || active != _activeTab) {
      setState(() {
        _collapsed = collapsed;
        _activeTab = active;
      });
    }
  }

  void _scrollToSection(int index) {
    final box = _sectionKeys[index].currentContext?.findRenderObject() as RenderBox?;
    if (box == null) return;
    final target = _scroll.offset + box.localToGlobal(Offset.zero).dy - _headerHeight;
    _scroll.animateTo(target.clamp(0, _scroll.position.maxScrollExtent),
        duration: const Duration(milliseconds: 350), curve: Curves.easeOutCubic);
  }

  /// Memuat ulang kuota dan tanggal terbaru, karena data dari daftar atau
  /// favorit bisa sudah usang.
  Future<void> _refreshPackage() async {
    try {
      await PackageCatalog.load(force: true);
      final fresh = await PackageCatalog.findById(widget.package.id);
      if (fresh != null && mounted) setState(() => _pkg = fresh);
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

  /// Label tombol bawah; menjelaskan sendiri kenapa tombol nonaktif.
  String? get _blockedLabel {
    if (_isOpenTrip) {
      final upcoming = upcomingDepartures(_pkg);
      if (upcoming.isEmpty) return 'Jadwal Belum Ada';
      if (!upcoming.any((d) => !d.closed && d.seatsLeft >= _pkg.minRequiredGuests)) return 'Kuota Habis';
      return null;
    }
    if (_pkg.availableSeats < _pkg.minRequiredGuests) return 'Kuota Habis';
    final max = _maxCustomIso;
    if (max != null && max.compareTo(_minCustomIso) < 0) return 'Periode Berakhir';
    return null;
  }

  String? get _preferredStart => parseIsoDate(widget.preferredDate) == null ? null : widget.preferredDate;

  /// Pilih jadwal → jumlah peserta → (masuk) → Selesaikan Pesanan.
  Future<void> _chooseSchedule() async {
    final selectedIso = _schedule?.startIso ?? _preferredStart;
    final picked = await (_isOpenTrip
        ? showDepartureSheet(context, pkg: _pkg, selectedIso: selectedIso)
        : showDateSheet(context, pkg: _pkg, minIso: _minCustomIso, maxIso: _maxCustomIso, selectedIso: selectedIso));
    if (picked == null || !mounted) return;
    setState(() => _schedule = picked);
    final choice = await showGuestSheet(context, pkg: _pkg, schedule: picked, initialGuests: _guests);
    if (choice == null || !mounted) return;
    if (choice.changeDate) return _chooseSchedule();
    setState(() => _guests = choice.guests);
    if (!await ensureLoggedIn(context) || !mounted) return;
    final start = parseIsoDate(picked.startIso)!;
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => BookingScreen(
        draft: BookingDraft(
          package: _pkg,
          guests: _guests,
          startDate: picked.startIso,
          endDate: picked.endIso,
          scheduleLabel: formatDateRange(start, parseIsoDate(picked.endIso)!),
        ),
      ),
    ));
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

  void _openGallery() {
    final photos = _pkg.photos;
    showDesignSheet<void>(
      context,
      title: 'Galeri',
      expand: photos.isNotEmpty,
      builder: (sheetContext) => photos.isEmpty
          ? const _EmptyGallery()
          : GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 16 / 9,
              ),
              itemCount: photos.length,
              itemBuilder: (context, i) => GestureDetector(
                onTap: () => _openLightbox(photos, i),
                child: ClipRRect(borderRadius: BorderRadius.circular(6), child: NetworkPhoto(photos[i])),
              ),
            ),
    );
  }

  double get _rating {
    if (_reviews.isNotEmpty) return _reviews.fold<int>(0, (sum, r) => sum + r.rating) / _reviews.length;
    return _pkg.rating;
  }

  /// Periode paket: keberangkatan pertama–terakhir (Open Trip) atau tanggal
  /// yang dibuka mitra.
  String? get _periodLabel {
    if (_isOpenTrip) {
      final upcoming = upcomingDepartures(_pkg);
      if (upcoming.isEmpty) return null;
      return formatDateRange(parseIsoDate(upcoming.first.date)!, parseIsoDate(upcoming.last.endDate)!);
    }
    final start = parseIsoDate(_minCustomIso);
    final end = parseIsoDate(_maxCustomIso ?? '');
    if (_pkg.availableDates.isEmpty && start != null && end != null && !end.isBefore(start)) {
      return formatDateRange(start, end);
    }
    return tripDateLabel(_pkg);
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: _collapsed ? AppTheme.darkBars : AppTheme.lightBars,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Stack(children: [
          RefreshIndicator(
            edgeOffset: topInset,
            onRefresh: () async {
              await _refreshPackage();
              await _loadExtras();
            },
            child: DefaultTextStyle.merge(
              style: figmaTextStyle,
              child: ListView(
                controller: _scroll,
                padding: EdgeInsets.zero,
                children: [
                  _buildHero(),
                  _buildInfo(),
                  const _Band(),
                  KeyedSubtree(key: _sectionKeys[0], child: _buildItinerarySummary()),
                  const _Band(),
                  KeyedSubtree(key: _sectionKeys[1], child: _buildFacilities()),
                  const _Band(),
                  KeyedSubtree(key: _sectionKeys[2], child: _buildLocation()),
                  const _Band(),
                  _buildProviderCard(),
                  const _Band(),
                  KeyedSubtree(key: _sectionKeys[3], child: _buildReviews()),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          _buildTopBar(topInset),
        ]),
        bottomNavigationBar: _buildBottomBar(),
      ),
    );
  }

  Widget _buildTopBar(double topInset) {
    final iconColor = _collapsed ? AppColors.textMedium : Colors.white;
    return Positioned(
      left: 0,
      right: 0,
      top: 0,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        decoration: BoxDecoration(
          color: _collapsed ? Colors.white : Colors.transparent,
          border: _collapsed ? const Border(bottom: BorderSide(color: AppColors.border)) : null,
        ),
        padding: EdgeInsets.only(top: topInset),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          SizedBox(
            height: 56,
            child: Row(children: [
              const SizedBox(width: 4),
              IconButton(
                tooltip: 'Kembali',
                onPressed: () => Navigator.maybePop(context),
                icon: Icon(Icons.arrow_back_rounded, color: iconColor),
              ),
              const Spacer(),
              ListenableBuilder(
                listenable: WishlistStore.instance,
                builder: (context, _) {
                  final active = WishlistStore.instance.contains(_pkg.id);
                  return IconButton(
                    tooltip: active ? 'Hapus dari favorit' : 'Simpan ke favorit',
                    onPressed: () => WishlistStore.instance.toggle(_pkg, syncToAccount: AuthSession.instance.isLoggedIn),
                    icon: Icon(active ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                        color: active ? AppColors.favorite : iconColor),
                  );
                },
              ),
              IconButton(
                tooltip: 'Bagikan',
                onPressed: () => showSharePackageSheet(context, _pkg, rating: _rating, reviewCount: _reviews.length),
                icon: Icon(Icons.share_outlined, color: iconColor),
              ),
              const SizedBox(width: 4),
            ]),
          ),
          if (_collapsed)
            SizedBox(
              height: 44,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                itemCount: _tabs.length,
                itemBuilder: (context, i) {
                  final active = i == _activeTab;
                  return InkWell(
                    onTap: () => _scrollToSection(i),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border(bottom: BorderSide(color: active ? AppColors.accent : Colors.transparent, width: 2)),
                      ),
                      child: Text(_tabs[i],
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                            color: active ? AppColors.primaryDark : AppColors.textMuted,
                          )),
                    ),
                  );
                },
              ),
            ),
        ]),
      ),
    );
  }

  Widget _buildHero() {
    final photos = _pkg.photos;
    return SizedBox(
      height: _heroHeight,
      child: Stack(fit: StackFit.expand, children: [
        if (photos.isEmpty)
          const NetworkPhoto('')
        else
          PageView.builder(
            itemCount: photos.length,
            onPageChanged: (i) => setState(() => _photoIndex = i),
            itemBuilder: (context, i) => GestureDetector(
              onTap: () => _openLightbox(photos, i),
              child: NetworkPhoto(photos[i]),
            ),
          ),
        // Gradasi atas agar ikon putih tetap terbaca di foto terang.
        const IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment(0, -0.2),
                colors: [Color(0x66000000), Color(0x00000000)],
              ),
            ),
          ),
        ),
        if (photos.length > 1)
          Positioned(
            left: 0,
            right: 0,
            bottom: 12,
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              for (var i = 0; i < photos.length && i < 6; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: i == _photoIndex ? 12 : 5,
                  height: 5,
                  decoration: BoxDecoration(
                    color: i == _photoIndex ? AppColors.accent : Colors.white70,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
            ]),
          ),
        Positioned(
          right: 16,
          bottom: 12,
          child: Material(
            color: const Color(0x99102A33),
            borderRadius: BorderRadius.circular(6),
            child: InkWell(
              borderRadius: BorderRadius.circular(6),
              onTap: _openGallery,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.photo_camera_outlined, size: 16, color: Colors.white),
                  const SizedBox(width: 6),
                  Text(photos.isEmpty ? '0' : '${_photoIndex + 1}/${photos.length}',
                      style: const TextStyle(fontSize: 12, color: Colors.white)),
                ]),
              ),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _buildInfo() {
    final rating = _rating;
    final period = _periodLabel;
    final description = _pkg.description.trim();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(
            child: Text('${_pkg.tripType.isEmpty ? 'Open Trip' : _pkg.tripType} • ${_pkg.durationDays} hari',
                style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
          ),
          if (rating > 0) ...[
            const Icon(Icons.star_rounded, size: 16, color: AppColors.star),
            const SizedBox(width: 2),
            Text(rating.toStringAsFixed(1), style: const TextStyle(fontSize: 14, color: AppColors.textMedium)),
          ],
        ]),
        const SizedBox(height: 8),
        Text(_pkg.name,
            style: const TextStyle(fontSize: 20, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.textStrong)),
        const SizedBox(height: 6),
        if (_pkg.destination.isNotEmpty) _InfoLine(icon: Icons.location_on_outlined, text: _pkg.destination),
        if (period != null) ...[
          const SizedBox(height: 4),
          _InfoLine(icon: Icons.calendar_today_outlined, text: period),
        ],
        const Divider(height: 32),
        const SectionTitle('Deskripsi'),
        const SizedBox(height: 12),
        Text(
          description.isEmpty ? 'Deskripsi paket belum dilengkapi oleh provider.' : description,
          maxLines: _descExpanded ? null : 3,
          overflow: _descExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 13, height: 1.55, color: AppColors.textMuted),
        ),
        if (description.length > 140)
          Center(
            child: TextButton(
              onPressed: () => setState(() => _descExpanded = !_descExpanded),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(_descExpanded ? 'Lebih sedikit' : 'Selengkapnya', style: const TextStyle(fontSize: 13)),
                const SizedBox(width: 4),
                Icon(_descExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded, size: 20),
              ]),
            ),
          ),
      ]),
    );
  }

  /// Ringkasan destinasi dari judul kegiatan itinerary.
  String get _destinationsSummary {
    final seen = <String>{};
    final titles = [
      for (final item in _pkg.itinerary)
        if (item.activity.trim().isNotEmpty && seen.add(item.activity.trim().toLowerCase())) item.activity.trim(),
    ];
    return titles.take(4).join(', ');
  }

  String get _gatheringLine {
    if (_pkg.isFlexiblePickup) {
      return _pkg.pickupArea.isEmpty ? 'Penjemputan fleksibel sesuai rute' : 'Penjemputan di ${_pkg.pickupArea}';
    }
    final point = _pkg.meetingPoint.trim();
    return point.isEmpty ? 'Titik kumpul diinformasikan mitra' : 'Titik kumpul di $point';
  }

  Widget _buildItinerarySummary() {
    final destinations = _destinationsSummary;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Material(
        color: AppColors.accentSoft,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: AppColors.accentBorder),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: _openItinerary,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Row(children: [
                Expanded(
                  child: Text('Rencana Perjalanan',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                ),
                Icon(Icons.chevron_right_rounded, color: AppColors.accent),
              ]),
              const SizedBox(height: 10),
              _InfoLine(icon: Icons.location_on_outlined, text: _gatheringLine, iconColor: AppColors.primaryDark, size: 13),
              if (destinations.isNotEmpty) ...[
                const SizedBox(height: 6),
                _InfoLine(icon: Icons.route_outlined, text: 'Destinasi wisata: $destinations', iconColor: AppColors.primaryDark, size: 13),
              ],
            ]),
          ),
        ),
      ),
    );
  }

  void _openItinerary() {
    final items = _pkg.itinerary;
    final days = <String, List<ItineraryItem>>{};
    for (final item in items) {
      days.putIfAbsent(item.day, () => []).add(item);
    }
    final destinations = _destinationsSummary;
    showDesignSheet<void>(
      context,
      title: 'Rencana Perjalanan',
      expand: true,
      builder: (_) => ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.accentSoft,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.accentLight),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              _InfoLine(icon: Icons.location_on_outlined, text: _gatheringLine, iconColor: AppColors.primaryDark, size: 13),
              if (destinations.isNotEmpty) ...[
                const SizedBox(height: 6),
                _InfoLine(icon: Icons.route_outlined, text: 'Destinasi wisata: $destinations', iconColor: AppColors.primaryDark, size: 13),
              ],
            ]),
          ),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text('Itinerary belum dilengkapi oleh provider.',
                  textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
            ),
          for (final day in days.entries) ...[
            const SizedBox(height: 20),
            Row(children: [
              Expanded(
                child: Text(day.key, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
              ),
              Text('${day.value.length} kegiatan', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ]),
            const Divider(height: 20),
            for (var i = 0; i < day.value.length; i++)
              _TimelineItem(item: day.value[i], last: i == day.value.length - 1),
          ],
        ],
      ),
    );
  }

  Widget _buildFacilities() {
    final included = _pkg.includedFacilities;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SectionTitle('Fasilitas', trailing: _SeeAll(onTap: _openFacilities)),
        const SizedBox(height: 12),
        const _FacilityHeader(included: true),
        const SizedBox(height: 12),
        if (included.isEmpty)
          const Text('Belum diinformasikan.', style: TextStyle(fontSize: 13, color: AppColors.textMuted))
        else
          _FacilityGrid(items: included.take(8).toList(), included: true),
      ]),
    );
  }

  void _openFacilities() {
    showDesignSheet<void>(
      context,
      title: 'Fasilitas',
      builder: (_) => ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          const _FacilityHeader(included: true),
          const SizedBox(height: 12),
          _pkg.includedFacilities.isEmpty
              ? const Text('Belum diinformasikan.', style: TextStyle(fontSize: 13, color: AppColors.textMuted))
              : _FacilityGrid(items: _pkg.includedFacilities, included: true),
          const Divider(height: 32),
          const _FacilityHeader(included: false),
          const SizedBox(height: 12),
          _pkg.excludedFacilities.isEmpty
              ? const Text('Belum diinformasikan.', style: TextStyle(fontSize: 13, color: AppColors.textMuted))
              : _FacilityGrid(items: _pkg.excludedFacilities, included: false),
          if (_pkg.addOns.isNotEmpty) ...[
            const Divider(height: 32),
            const Text('Layanan Tambahan (Opsional)',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
            const SizedBox(height: 4),
            const Text('Dapat dipilih saat mengisi data pemesanan.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(height: 10),
            for (final a in _pkg.addOns)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(children: [
                  Expanded(child: Text(a.name, style: const TextStyle(fontSize: 13, color: AppColors.textMedium))),
                  Text('+${formatPrice(a.price)}${a.priceSuffix}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textDark)),
                ]),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildLocation() {
    final flexible = _pkg.isFlexiblePickup;
    final point = _pkg.meetingPoint.trim();
    final query = flexible ? _pkg.pickupArea : point;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SectionTitle(flexible ? 'Area Penjemputan' : 'Lokasi Titik Kumpul'),
        const SizedBox(height: 12),
        _InfoLine(
          icon: Icons.location_on_outlined,
          text: flexible
              ? (_pkg.pickupArea.isEmpty ? 'Area penjemputan diinformasikan mitra.' : _pkg.pickupArea)
              : (point.isEmpty ? 'Titik kumpul belum dilengkapi oleh provider.' : point),
          size: 14,
        ),
        if (flexible && _pkg.pickupPoints.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final p in _pkg.pickupPoints)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: AppColors.accentSoft, borderRadius: BorderRadius.circular(30)),
                child: Text(p, style: const TextStyle(fontSize: 12, color: AppColors.primaryDark)),
              ),
          ]),
        ],
        if (flexible && _pkg.pickupNotes.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(_pkg.pickupNotes, style: const TextStyle(fontSize: 12, height: 1.45, color: AppColors.textMuted)),
        ],
        if (query.trim().length > 3) ...[
          const SizedBox(height: 12),
          _MapPreview(onDirections: () => openExternal(mapsSearchUri(query))),
        ],
      ]),
    );
  }

  Widget _buildProviderCard() {
    // Selama profil mitra belum termuat (atau gagal dimuat), jangan tampilkan
    // nama karangan.
    final loaded = _provider != null && _provider!.businessName.isNotEmpty;
    final name = loaded ? _provider!.businessName : (_extrasFailed ? 'Info mitra belum dapat dimuat' : 'Memuat info mitra...');
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(children: [
          ProviderLogo(provider: _provider, size: 44),
          const SizedBox(width: 12),
          Expanded(
            child: Text(name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: loaded ? FontWeight.w500 : FontWeight.w400,
                  color: loaded ? AppColors.textBody : AppColors.textMuted,
                )),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 32),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              textStyle: const TextStyle(fontFamily: 'Roboto', fontSize: 13, fontWeight: FontWeight.w500),
            ),
            onPressed: _pkg.providerId > 0 ? _openProvider : null,
            child: const Text('Lihat Mitra'),
          ),
        ]),
      ),
    );
  }

  Widget _buildReviews() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SectionTitle('Rating & Ulasan', trailing: _reviews.length > 2 ? _SeeAll(onTap: _openReviews) : null),
        const SizedBox(height: 12),
        if (_reviews.isEmpty)
          const Text('Belum ada ulasan terverifikasi untuk paket ini.', style: TextStyle(fontSize: 13, color: AppColors.textMuted))
        else ...[
          _RatingHeadline(rating: _rating, count: _reviews.length),
          const SizedBox(height: 16),
          for (final r in _reviews.take(2)) ...[
            _ReviewCard(review: r, boxed: true),
            const SizedBox(height: 8),
          ],
        ],
      ]),
    );
  }

  void _openReviews() {
    showDesignSheet<void>(
      context,
      title: 'Rating & Ulasan',
      expand: true,
      builder: (_) => ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
            child: Row(children: [
              _RatingHeadline(rating: _rating, count: _reviews.length, compact: true),
              const SizedBox(width: 16),
              Expanded(child: _RatingBars(reviews: _reviews)),
            ]),
          ),
          const SizedBox(height: 20),
          const Text('Ulasan Peserta Trip', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
          for (final r in _reviews) ...[
            const SizedBox(height: 12),
            _ReviewCard(review: r),
            const Divider(height: 24),
          ],
        ],
      ),
    );
  }

  Widget _buildBottomBar() {
    final blocked = _blockedLabel;
    return BottomActionBar(
      child: Row(children: [
        Expanded(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Mulai dari', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
            const SizedBox(height: 2),
            Text.rich(TextSpan(
              text: formatPrice(_pkg.price),
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.primaryDark),
              children: [
                TextSpan(
                  text: _pkg.isPerUnit ? ' /${_pkg.unitLabel}' : ' /orang',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.textMuted),
                ),
              ],
            )),
          ]),
        ),
        const SizedBox(width: 12),
        SizedBox(
          width: 160,
          child: ElevatedButton(
            onPressed: blocked == null ? _chooseSchedule : null,
            child: Text(blocked ?? 'Pilih Jadwal'),
          ),
        ),
      ]),
    );
  }
}

/// Pita abu pemisah antarbagian halaman detail.
class _Band extends StatelessWidget {
  const _Band();

  @override
  Widget build(BuildContext context) => Container(height: 6, color: AppColors.divider);
}

class _InfoLine extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color iconColor;
  final double size;

  const _InfoLine({required this.icon, required this.text, this.iconColor = AppColors.textMedium, this.size = 14});

  @override
  Widget build(BuildContext context) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.only(top: 1), child: Icon(icon, size: size + 2, color: iconColor)),
      const SizedBox(width: 6),
      Expanded(child: Text(text, style: TextStyle(fontSize: size, height: 1.4, color: AppColors.textMedium))),
    ]);
  }
}

class _SeeAll extends StatelessWidget {
  final VoidCallback onTap;

  const _SeeAll({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      style: TextButton.styleFrom(
        minimumSize: const Size(0, 32),
        padding: const EdgeInsets.symmetric(horizontal: 4),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle: const TextStyle(fontFamily: 'Roboto', fontSize: 13, fontWeight: FontWeight.w500),
      ),
      onPressed: onTap,
      child: const Text('Lihat semua'),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final ItineraryItem item;
  final bool last;

  const _TimelineItem({required this.item, required this.last});

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SizedBox(
          width: 20,
          child: Column(children: [
            const SizedBox(height: 3),
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: AppColors.accent, width: 2)),
            ),
            if (!last) Expanded(child: Container(width: 1, color: AppColors.accentBorder)),
          ]),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (item.time.isNotEmpty)
                Text(item.time, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.primaryDark)),
              const SizedBox(height: 2),
              Text(item.activity, style: const TextStyle(fontSize: 14, height: 1.4, color: AppColors.textMedium)),
              if (item.description.trim().isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(item.description.trim(), style: const TextStyle(fontSize: 12, height: 1.4, color: AppColors.textMuted)),
              ],
            ]),
          ),
        ),
      ]),
    );
  }
}

class _FacilityHeader extends StatelessWidget {
  final bool included;

  const _FacilityHeader({required this.included});

  @override
  Widget build(BuildContext context) {
    final color = included ? AppColors.successDark : AppColors.dangerDark;
    return Row(children: [
      Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          color: included ? AppColors.successBg : AppColors.dangerSoft,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Icon(included ? Icons.check_rounded : Icons.close_rounded, size: 16, color: color),
      ),
      const SizedBox(width: 8),
      Text(included ? 'Termasuk (Include)' : 'Tidak Termasuk (Exclude)',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: color)),
    ]);
  }
}

class _FacilityGrid extends StatelessWidget {
  final List<String> items;
  final bool included;

  const _FacilityGrid({required this.items, required this.included});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, c) {
      final width = (c.maxWidth - 12) / 2;
      return Wrap(spacing: 12, runSpacing: 10, children: [
        for (final f in items)
          SizedBox(
            width: width,
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(included ? Icons.check_rounded : Icons.close_rounded,
                  size: 16, color: included ? AppColors.successDark : AppColors.dangerDark),
              const SizedBox(width: 8),
              Expanded(child: Text(f, style: const TextStyle(fontSize: 13, height: 1.35, color: AppColors.textMedium))),
            ]),
          ),
      ]);
    });
  }
}

/// Pratinjau peta sederhana tanpa API key; tombol membuka Google Maps.
class _MapPreview extends StatelessWidget {
  final VoidCallback onDirections;

  const _MapPreview({required this.onDirections});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        height: 110,
        child: Material(
          color: const Color(0xFFE9EEF0),
          child: InkWell(
            onTap: onDirections,
            child: Stack(children: [
              const Positioned.fill(child: CustomPaint(painter: _MapPainter())),
              const Align(
                alignment: Alignment(0, -0.35),
                child: Icon(Icons.location_on, size: 34, color: Color(0xFFEA4335)),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 10,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xCC102A33), borderRadius: BorderRadius.circular(30)),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Text('Petunjuk Arah', style: TextStyle(fontSize: 12, color: Colors.white)),
                      SizedBox(width: 4),
                      Icon(Icons.map_outlined, size: 14, color: Colors.white),
                    ]),
                  ),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

class _MapPainter extends CustomPainter {
  const _MapPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final road = Paint()
      ..color = Colors.white
      ..strokeWidth = 6;
    final minor = Paint()
      ..color = Colors.white.withValues(alpha: 0.7)
      ..strokeWidth = 3;
    final park = Paint()..color = const Color(0xFFD3EBD9);
    canvas.drawRRect(
        RRect.fromRectAndRadius(Rect.fromLTWH(size.width * 0.72, 0, size.width * 0.28, size.height * 0.55), const Radius.circular(6)),
        park);
    canvas.drawLine(Offset(0, size.height * 0.62), Offset(size.width, size.height * 0.4), road);
    canvas.drawLine(Offset(size.width * 0.3, 0), Offset(size.width * 0.42, size.height), road);
    for (var i = 1; i < 6; i++) {
      final x = size.width * i / 6;
      canvas.drawLine(Offset(x, 0), Offset(x - 20, size.height), minor);
    }
    canvas.drawLine(Offset(0, size.height * 0.2), Offset(size.width, size.height * 0.15), minor);
    canvas.drawLine(Offset(0, size.height * 0.88), Offset(size.width, size.height * 0.8), minor);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Logo mitra: foto profil bila ada, selain itu inisial nama.
class ProviderLogo extends StatelessWidget {
  final PublicProvider? provider;
  final double size;

  const ProviderLogo({super.key, required this.provider, this.size = 44});

  @override
  Widget build(BuildContext context) {
    final name = provider?.businessName ?? '';
    final photo = provider?.profilePhoto ?? '';
    final initial = Center(
      child: Text(name.isEmpty ? '·' : name[0].toUpperCase(),
          style: TextStyle(fontSize: size * 0.42, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
    );
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.accentSoft,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: photo.isEmpty
          ? initial
          : Image.network(photo, fit: BoxFit.cover, errorBuilder: (_, __, ___) => initial),
    );
  }
}

class _Stars extends StatelessWidget {
  final double rating;
  final double size;

  const _Stars({required this.rating, this.size = 14});

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      for (var i = 1; i <= 5; i++)
        Icon(
          rating >= i ? Icons.star_rounded : (rating >= i - 0.5 ? Icons.star_half_rounded : Icons.star_rounded),
          size: size,
          color: rating >= i - 0.5 ? AppColors.star : AppColors.border,
        ),
    ]);
  }
}

class _RatingHeadline extends StatelessWidget {
  final double rating;
  final int count;
  final bool compact;

  const _RatingHeadline({required this.rating, required this.count, this.compact = false});

  @override
  Widget build(BuildContext context) {
    final number = Text(rating.toStringAsFixed(1),
        style: TextStyle(fontSize: compact ? 28 : 34, fontWeight: FontWeight.w600, color: AppColors.textDark));
    final meta = Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      _Stars(rating: rating, size: compact ? 14 : 20),
      const SizedBox(height: 4),
      Text('$count ulasan', style: const TextStyle(fontSize: 12, color: AppColors.textMedium)),
    ]);
    if (compact) {
      return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [number, meta]);
    }
    return Row(children: [number, const SizedBox(width: 12), meta]);
  }
}

class _RatingBars extends StatelessWidget {
  final List<PackageReview> reviews;

  const _RatingBars({required this.reviews});

  @override
  Widget build(BuildContext context) {
    final total = reviews.isEmpty ? 1 : reviews.length;
    return Column(children: [
      for (var star = 5; star >= 1; star--)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(children: [
            SizedBox(width: 12, child: Text('$star', style: const TextStyle(fontSize: 11, color: AppColors.textMedium))),
            const Icon(Icons.star_rounded, size: 12, color: AppColors.star),
            const SizedBox(width: 6),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: reviews.where((r) => r.rating == star).length / total,
                  minHeight: 6,
                  color: AppColors.accent,
                  backgroundColor: AppColors.divider,
                ),
              ),
            ),
          ]),
        ),
    ]);
  }
}

String _relativeDate(DateTime? date) {
  if (date == null) return '';
  final days = dateOnly(DateTime.now()).difference(dateOnly(date)).inDays;
  if (days <= 0) return 'Hari ini';
  if (days == 1) return 'Kemarin';
  if (days < 30) return '$days hari lalu';
  return formatDateShort(date);
}

class _ReviewCard extends StatelessWidget {
  final PackageReview review;
  final bool boxed;

  const _ReviewCard({required this.review, this.boxed = false});

  @override
  Widget build(BuildContext context) {
    final content = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const CircleAvatar(
          radius: 16,
          backgroundColor: AppColors.divider,
          child: Icon(Icons.person_outline_rounded, size: 18, color: AppColors.textMuted),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Text('Peserta Trip', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textDark)),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.successBg,
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: const Color(0xFF86EFAC)),
                ),
                child: const Text('Terverifikasi', style: TextStyle(fontSize: 9, color: AppColors.successDark)),
              ),
            ]),
            const SizedBox(height: 2),
            _Stars(rating: review.rating.toDouble(), size: 12),
          ]),
        ),
      ]),
      const SizedBox(height: 10),
      Text(review.comment, style: const TextStyle(fontSize: 14, height: 1.45, color: AppColors.textMuted)),
      if (review.createdAt != null) ...[
        const SizedBox(height: 10),
        Text(_relativeDate(review.createdAt), style: const TextStyle(fontSize: 11, color: AppColors.textLight)),
      ],
    ]);
    if (!boxed) return content;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
      child: content,
    );
  }
}

class _EmptyGallery extends StatelessWidget {
  const _EmptyGallery();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(24, 48, 24, 64),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        CircleAvatar(
          radius: 56,
          backgroundColor: AppColors.divider,
          child: Icon(Icons.photo_library_outlined, size: 48, color: AppColors.textLight),
        ),
        SizedBox(height: 20),
        Text('Belum Ada Gambar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
        SizedBox(height: 4),
        Text('Belum ada foto yang dibagikan.', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
      ]),
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
      backgroundColor: const Color(0xF2102A33),
      body: SafeArea(
        child: Column(children: [
          Row(children: [
            const SizedBox(width: 16),
            Text('${_index + 1} / ${widget.photos.length}', style: const TextStyle(color: Colors.white, fontSize: 14)),
            const Spacer(),
            IconButton(
              tooltip: 'Tutup',
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close, color: Colors.white, size: 26),
            ),
          ]),
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

/// Membuka detail paket dari tautan bagikan: memuat paket berdasarkan ID lalu
/// berganti ke [TripDetailScreen].
class PackageLinkScreen extends StatefulWidget {
  final int packageId;

  const PackageLinkScreen({super.key, required this.packageId});

  @override
  State<PackageLinkScreen> createState() => _PackageLinkScreenState();
}

class _PackageLinkScreenState extends State<PackageLinkScreen> {
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final pkg = await PackageCatalog.findById(widget.packageId);
      if (!mounted) return;
      if (pkg == null) {
        setState(() => _error = 'Paket ini sudah tidak tersedia atau belum dipublikasikan.');
        return;
      }
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => TripDetailScreen(package: pkg)));
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiException ? e.message : 'Paket belum dapat dimuat.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: _error == null
            ? const LoadingView('Membuka paket wisata...')
            : EmptyState(
                icon: Icons.travel_explore,
                title: 'Paket Tidak Ditemukan',
                message: _error!,
                actions: [
                  OutlinedButton(onPressed: () => Navigator.maybePop(context), child: const Text('Kembali')),
                  ElevatedButton(onPressed: _load, child: const Text('Coba Lagi')),
                ],
              ),
      ),
    );
  }
}
