import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/screens/notification_screen.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/screens/trip_list_screen.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';
import 'package:customer_mobile/widgets/trip_search_form.dart';

/// Beranda customer sesuai desain Figma: foto hero dengan kartu pencarian,
/// kartu "Plan Trip", dan daftar "Trip Populer" per tipe trip.
class HomeScreen extends StatefulWidget {
  final ValueChanged<TripSearchParams> onSearch;
  final VoidCallback onPlanTrip;

  const HomeScreen({super.key, required this.onSearch, required this.onPlanTrip});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<TripPackage>> _packages = PackageCatalog.load();
  final _scroll = ScrollController();
  final _headerSearch = TextEditingController();
  bool _scrolled = false;
  String _popularType = officialTripTypes.first;

  @override
  void initState() {
    super.initState();
    // Header menjadi teal solid begitu konten digulir ke bawahnya.
    _scroll.addListener(() {
      final scrolled = _scroll.offset > 0;
      if (scrolled != _scrolled) setState(() => _scrolled = scrolled);
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    _headerSearch.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    final future = PackageCatalog.load(force: true);
    setState(() => _packages = future);
    await future.catchError((_) => <TripPackage>[]);
  }

  void _openPackage(TripPackage pkg) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => TripDetailScreen(package: pkg)));
  }

  Future<void> _openNotifications() async {
    if (!await ensureLoggedIn(context) || !mounted) return;
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AppTheme.lightBars,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: DefaultTextStyle.merge(
          style: figmaTextStyle,
          child: Stack(children: [
            RefreshIndicator(
              onRefresh: _refresh,
              edgeOffset: top + 56,
              child: SingleChildScrollView(
                controller: _scroll,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  _buildHero(top),
                  const SizedBox(height: 24),
                  _PlanTripCard(onTap: widget.onPlanTrip),
                  const SizedBox(height: 24),
                  _buildPopular(),
                ]),
              ),
            ),
            Positioned(left: 0, top: 0, right: 0, child: _buildTopBar(top)),
          ]),
        ),
      ),
    );
  }

  Widget _buildTopBar(double top) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      height: top + 56,
      color: _scrolled ? AppColors.brand : Colors.transparent,
      padding: EdgeInsets.fromLTRB(16, top + 4, 16, 4),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        // Saat digulir, logo & lonceng diganti kolom pencarian sesuai desain Figma.
        child: _scrolled ? _buildHeaderSearch() : _buildBrandRow(),
      ),
    );
  }

  Widget _buildHeaderSearch() {
    const border = OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(9999)),
      borderSide: BorderSide.none,
    );
    return Center(
      child: TextField(
        controller: _headerSearch,
        textInputAction: TextInputAction.search,
        onSubmitted: (q) => widget.onSearch(TripSearchParams(destination: q.trim())),
        cursorColor: AppColors.accent,
        style: figmaTextStyle.copyWith(fontSize: 14, color: AppColors.textDark),
        decoration: InputDecoration(
          isDense: true,
          filled: true,
          fillColor: AppColors.accentSoft,
          contentPadding: const EdgeInsets.fromLTRB(0, 16, 16, 16),
          prefixIcon: const Padding(
            padding: EdgeInsets.only(left: 12, right: 8),
            child: AppIcon('magnifying_glass', size: 20, color: AppColors.accent),
          ),
          prefixIconConstraints: const BoxConstraints(minWidth: 40),
          hintText: 'Cari destinasi, nama trip (Contoh: Dieng)',
          hintStyle: figmaTextStyle.copyWith(fontSize: 14, color: AppColors.textMedium),
          border: border,
          enabledBorder: border,
          focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(9999)),
            borderSide: BorderSide(color: Colors.white),
          ),
        ),
      ),
    );
  }

  Widget _buildBrandRow() {
    // Turun 4 dari tengah bar: logo y=64 dan lonceng y=60 pada frame Figma.
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Container(
          padding: const EdgeInsets.symmetric(vertical: 4),
          decoration: const BoxDecoration(boxShadow: [_heroGlow]),
          child: Image.asset('assets/images/logo_color.png', width: 122.23, height: 32),
        ),
        Semantics(
          button: true,
          label: 'Notifikasi',
          child: ClipOval(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
              child: Material(
                color: const Color(0x80FFFFFF),
                shape: const CircleBorder(side: BorderSide(color: Color(0x4DFFFFFF))),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: _openNotifications,
                  child: const Padding(padding: EdgeInsets.all(10), child: AppIcon('bell', size: 20)),
                ),
              ),
            ),
          ),
        ),
      ]),
    );
  }

  /// Frame Figma (status bar 48): foto setinggi 290, judul y=121, kartu
  /// pencarian mulai y=241. Jarak mengikuti tinggi status bar perangkat.
  Widget _buildHero(double top) {
    // Foto Figma 450×300 di x=-35 dengan dasar y=290, tanpa bergantung tinggi
    // status bar; layar lebih lebar dari 360 memperbesarnya proporsional.
    final width = MediaQuery.sizeOf(context).width;
    final k = width > 360 ? width / 360 : 1.0;
    return Stack(children: [
      Positioned(
        left: -35 * k,
        top: top + 242 - 300 * k,
        width: 450 * k,
        height: 300 * k,
        child: Image.asset('assets/images/home_hero.jpg', fit: BoxFit.fill),
      ),
      // Lapisan blur Figma di belakang teks: putih 80% (blur σ10) untuk judul,
      // biru 80% (blur σ8) untuk subjudul.
      Positioned(
        left: 12,
        top: top + 72,
        width: 180,
        height: 50,
        child: const DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.all(Radius.circular(16)),
            boxShadow: [BoxShadow(color: Color(0xCCFFFFFF), blurRadius: 16.45)],
          ),
        ),
      ),
      Positioned(
        left: 12,
        top: top + 124,
        width: 180,
        height: 34,
        child: const DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.all(Radius.circular(16)),
            boxShadow: [BoxShadow(color: Color(0xCC439ACC), blurRadius: 12.99)],
          ),
        ),
      ),
      Positioned(
        left: 22,
        top: top + 73,
        child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Booking Nyaman,\nLiburan Tenang',
              style: TextStyle(fontSize: 20, height: 24 / 20, fontWeight: FontWeight.w700, color: AppColors.brand)),
          SizedBox(height: 4),
          Text('Pilih trip favoritmu dan\nbooking dengan mudah',
              style: TextStyle(fontSize: 12, height: 16 / 12, color: Colors.white)),
        ]),
      ),
      Padding(
        padding: EdgeInsets.fromLTRB(16, top + 193, 16, 0),
        child: Container(
          // Padding 16 dikurangi border 1.
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.cardBorder),
            boxShadow: const [
              BoxShadow(color: Color(0x1A000000), offset: Offset(0, 1), blurRadius: 3),
              BoxShadow(color: Color(0x0F000000), offset: Offset(0, 1), blurRadius: 2),
            ],
          ),
          child: TripSearchForm(
            initial: const TripSearchParams(),
            submitLabel: 'Cari Trip',
            onSubmit: widget.onSearch,
          ),
        ),
      ),
    ]);
  }

  Widget _buildPopular() {
    return Padding(
      padding: EdgeInsets.zero,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(children: [
            const Expanded(
              child: Text('Trip Populer',
                  style:
                      TextStyle(fontSize: 20, height: 28 / 20, fontWeight: FontWeight.w600, color: AppColors.heading)),
            ),
            InkWell(
              borderRadius: BorderRadius.circular(6),
              onTap: () => widget.onSearch(TripSearchParams(type: _popularType)),
              child: const Text('Lihat Semua',
                  style: TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.accent)),
            ),
          ]),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(children: [
            for (final type in officialTripTypes) ...[
              if (type != officialTripTypes.first) const SizedBox(width: 6),
              BadgeChip(
                label: type,
                selected: type == _popularType,
                onTap: () => setState(() => _popularType = type),
              ),
            ],
          ]),
        ),
        const SizedBox(height: 12),
        FutureBuilder<List<TripPackage>>(
          future: _packages,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const LoadingView('Sedang memuat paket wisata terbaik...');
            }
            if (snapshot.hasError) {
              return Padding(
                padding: const EdgeInsets.all(16),
                child: EmptyState(
                  icon: Icons.wifi_off_outlined,
                  title: 'Paket Wisata Belum Dapat Dimuat',
                  message: '${snapshot.error}',
                  actions: [ElevatedButton(onPressed: _refresh, child: const Text('Coba Lagi'))],
                ),
              );
            }
            final popular = (snapshot.data ?? const <TripPackage>[])
                .where((p) => (p.tripType.isEmpty ? 'Open Trip' : p.tripType) == _popularType)
                .toList()
              ..sort((a, b) => b.quotaUsed.compareTo(a.quotaUsed));
            if (popular.isEmpty) {
              return Padding(
                padding: const EdgeInsets.all(16),
                child: EmptyState(
                  icon: Icons.travel_explore,
                  title: 'Belum Ada Paket $_popularType',
                  message: 'Coba pilih tipe trip yang lain.',
                ),
              );
            }
            return SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              // Jarak 4 di atas & bawah memberi ruang bayangan kartu.
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                for (final pkg in popular.take(10)) ...[
                  if (pkg != popular.first) const SizedBox(width: 16),
                  TripPopularCard(pkg: pkg, onTap: () => _openPackage(pkg)),
                ],
              ]),
            );
          },
        ),
      ]),
    );
  }
}

/// Teal gelap judul & subjudul beranda (Figma #024254).
const _deepTeal = Color(0xFF024254);

/// Cahaya putih buram di belakang logo agar terbaca di atas foto (layer blur
/// Figma: kotak putih 70%, σ 22.6; sigma Flutter = blurRadius × 0.577 + 0.5).
const _heroGlow = BoxShadow(color: Color(0xB3FFFFFF), blurRadius: 38.26);

/// Kartu "Plan Trip" menuju fitur Rencana Trip, dengan foto traveler yang
/// memudar ke kiri di sisi kanan kartu.
class _PlanTripCard extends StatelessWidget {
  final VoidCallback onTap;

  const _PlanTripCard({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          boxShadow: const [BoxShadow(color: Color(0x14000000), offset: Offset(0, 2), blurRadius: 12)],
        ),
        child: Material(
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: const BorderSide(color: AppColors.border),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: SizedBox(
              height: 147,
              child: Stack(children: [
                Positioned(
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 144,
                  child: Image.asset('assets/images/plan_trip_photo.jpg', fit: BoxFit.cover),
                ),
                const Positioned(
                  left: 177,
                  top: 0,
                  bottom: 0,
                  width: 91,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [Colors.white, Color(0x80FFFFFF), Color(0x00FFFFFF)]),
                    ),
                  ),
                ),
                const Positioned(
                  left: 0,
                  top: 16.5,
                  width: 184,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Padding(
                      padding: EdgeInsets.only(left: 16),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Plan Trip',
                            style: TextStyle(fontSize: 20, height: 28 / 20, fontWeight: FontWeight.w600, color: _deepTeal)),
                        SizedBox(height: 4),
                        Text('Atur destinasi, jadwal, dan budget dalam satu rencana',
                            style: TextStyle(fontSize: 12, height: 18 / 12, color: AppColors.textMedium)),
                      ]),
                    ),
                    SizedBox(height: 12),
                    ColoredBox(color: AppColors.background, child: SizedBox(height: 1)),
                    SizedBox(height: 12),
                    Padding(
                      padding: EdgeInsets.only(left: 16),
                      child: Text('Buat Plan Sekarang',
                          style: TextStyle(
                              fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600, color: AppColors.accent)),
                    ),
                  ]),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
