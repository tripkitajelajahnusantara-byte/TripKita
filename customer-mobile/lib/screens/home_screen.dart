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

/// Beranda customer sesuai desain Figma: kartu pencarian di atas latar biru
/// dan daftar "Trip Populer" per tipe trip.
class HomeScreen extends StatefulWidget {
  final ValueChanged<TripSearchParams> onSearch;

  const HomeScreen({super.key, required this.onSearch});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<TripPackage>> _packages = PackageCatalog.load();
  final _scroll = ScrollController();
  bool _scrolled = false;
  String _popularType = officialTripTypes.first;

  @override
  void initState() {
    super.initState();
    // Header menjadi biru solid begitu konten digulir ke bawahnya.
    _scroll.addListener(() {
      final scrolled = _scroll.offset > 0;
      if (scrolled != _scrolled) setState(() => _scrolled = scrolled);
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
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
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        const CroppedAsset(
          'assets/images/logo_white.png',
          width: 120.11,
          height: 32,
          left: -0.1606,
          top: -0.0959,
          widthFactor: 1.3139,
          heightFactor: 1.2877,
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

  Widget _buildHero(double top) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
      child: Stack(children: [
        const Positioned.fill(child: ColoredBox(color: AppColors.brand)),
        Positioned(
          left: -70,
          right: -70,
          top: 0,
          child: Image.asset('assets/images/hero_gradient.png', fit: BoxFit.fitWidth),
        ),
        Padding(
          // Frame "Top" Figma tingginya tetap 316: 8 + kartu 290 + 18.
          padding: EdgeInsets.fromLTRB(16, top + 56 + 8, 16, 18),
          child: Container(
            // Padding 16 dikurangi border 1.
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
              boxShadow: const [BoxShadow(color: Color(0x0D0A0D12), offset: Offset(0, 1), blurRadius: 1)],
            ),
            child: TripSearchForm(
              initial: const TripSearchParams(),
              submitLabel: 'Cari Trip',
              onSubmit: widget.onSearch,
            ),
          ),
        ),
      ]),
    );
  }

  Widget _buildPopular() {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
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
                  style: TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.brand)),
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
