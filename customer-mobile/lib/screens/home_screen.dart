import 'package:flutter/material.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/screens/auth_screen.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/screens/trip_list_screen.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

/// Beranda customer, padanan `CustomerLandingPage` di web.
class HomeScreen extends StatefulWidget {
  final ValueChanged<TripSearchParams> onSearch;

  const HomeScreen({super.key, required this.onSearch});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _scrollController = ScrollController();
  final _tripsKey = GlobalKey();

  late Future<List<TripPackage>> _packages = PackageCatalog.load();

  String _destination = '';
  DateTime _date = dateOnly(DateTime.now());
  String _type = 'Open Trip';
  String _category = allCategoriesLabel;

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    final future = PackageCatalog.load(force: true);
    setState(() => _packages = future);
    await future.catchError((_) => <TripPackage>[]);
  }

  Future<void> _pickDate() async {
    final today = dateOnly(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: _date.isBefore(today) ? today : _date,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365 * 2)),
      helpText: 'Pilih tanggal',
    );
    if (picked != null) setState(() => _date = picked);
  }

  void _submitSearch() {
    widget.onSearch(TripSearchParams(
      destination: _destination,
      date: toIsoDate(_date),
      type: _type,
      category: _category,
    ));
  }

  void _openPackage(TripPackage pkg) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => TripDetailScreen(package: pkg, preferredDate: toIsoDate(_date)),
    ));
  }

  void _scrollToTrips() {
    final ctx = _tripsKey.currentContext;
    if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 400), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: const BrandLogo(),
        actions: [
          ListenableBuilder(
            listenable: AuthSession.instance,
            builder: (context, _) {
              final profile = AuthSession.instance.profile;
              if (profile != null) {
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => appShellKey.currentState?.selectTab(AppTab.akun),
                    child: CircleAvatar(
                      radius: 17,
                      backgroundColor: AppColors.accentLight,
                      child: Text(
                        profile.name.isNotEmpty ? profile.name[0].toUpperCase() : 'T',
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                );
              }
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: TextButton.icon(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuthScreen())),
                  icon: const Icon(Icons.person_outline, size: 18),
                  label: const Text('Masuk'),
                ),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          controller: _scrollController,
          padding: EdgeInsets.zero,
          children: [
            _buildHero(),
            Transform.translate(offset: const Offset(0, -30), child: _buildSearchWidget()),
            FutureBuilder<List<TripPackage>>(
              key: _tripsKey,
              future: _packages,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const LoadingView('Sedang memuat paket wisata terbaik...');
                }
                if (snapshot.hasError) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: EmptyState(
                      icon: Icons.wifi_off_outlined,
                      title: 'Paket Wisata Belum Dapat Dimuat',
                      message: '${snapshot.error}',
                      actions: [ElevatedButton(onPressed: _refresh, child: const Text('Coba Lagi'))],
                    ),
                  );
                }
                final packages = snapshot.data ?? const [];
                if (packages.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: EmptyState(
                      icon: Icons.travel_explore,
                      title: 'Paket Wisata Tidak Ditemukan',
                      message: 'Coba pilih tanggal lain atau gunakan filter destinasi yang berbeda.',
                    ),
                  );
                }
                return Column(children: [
                  _buildSection(
                    title: 'Trip Populer (Open Trip)',
                    marker: '✦',
                    markerColor: AppColors.accent,
                    subtitle: 'Paket wisata gabungan hemat & seru dengan jadwal teratur',
                    items: packages.where((p) => p.isOpenTrip).take(4).toList(),
                    seeAllTypes: const ['Open Trip'],
                  ),
                  _buildSection(
                    title: 'Private Trip & Honeymoon Spesial',
                    marker: '🌹',
                    markerColor: AppColors.honeymoon,
                    subtitle: 'Jadwal bebas pilih customer (Min 2 Orang) • Fasilitas eksklusif & privat',
                    items: packages.where((p) => p.tripType == 'Private Trip' || p.tripType == 'Honeymoon').take(4).toList(),
                    seeAllTypes: const ['Private Trip', 'Honeymoon'],
                  ),
                  _buildSection(
                    title: 'Family & Corporate Gathering',
                    marker: '🏢',
                    markerColor: AppColors.corporate,
                    subtitle: 'Family (Min 3 orang) • Corporate Gathering (Min 10 orang) • Tanggal Bebas Pilih',
                    items: packages.where((p) => p.tripType == 'Family' || p.tripType == 'Corporate').take(4).toList(),
                    seeAllTypes: const ['Family', 'Corporate'],
                  ),
                ]);
              },
            ),
            _buildFeatureRibbon(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              child: Text('© ${DateTime.now().year} TripKita. All rights reserved.',
                  textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textLight, fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHero() {
    return Container(
      height: 300,
      decoration: const BoxDecoration(
        image: DecorationImage(
          image: AssetImage('assets/images/hero.jpg'),
          fit: BoxFit.cover,
          alignment: Alignment(0, -0.4),
        ),
      ),
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xBF0F172A), Color(0x730F172A), Color(0x1A0F172A)],
            stops: [0, 0.45, 0.8],
          ),
        ),
        padding: const EdgeInsets.fromLTRB(20, 28, 20, 56),
        alignment: Alignment.centerLeft,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Cari Open Trip\nIndonesia dengan Mudah',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: Colors.white,
                height: 1.2,
                shadows: const [Shadow(color: Color(0x66000000), blurRadius: 10, offset: Offset(0, 2))],
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Temukan berbagai open trip seru dan tour guide terpercaya di seluruh Indonesia.',
              style: TextStyle(
                color: Color(0xFFF1F5F9),
                fontSize: 14,
                fontWeight: FontWeight.w600,
                height: 1.5,
                shadows: [Shadow(color: Color(0x80000000), blurRadius: 6, offset: Offset(0, 1))],
              ),
            ),
            const SizedBox(height: 18),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _scrollToTrips,
              child: const Text('Explore Trip'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchWidget() {
    InputDecoration deco() => const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12));

    Widget label(IconData icon, String text, {bool required = false}) => Padding(
          padding: const EdgeInsets.only(bottom: 7),
          child: Row(children: [
            Icon(icon, size: 16, color: AppColors.accent),
            const SizedBox(width: 6),
            Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMedium)),
            if (required) const Text(' *', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
          ]),
        );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 36, offset: Offset(0, 12))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            label(Icons.location_on_outlined, 'Destination'),
            DropdownButtonFormField<String>(
              value: _destination,
              isExpanded: true,
              decoration: deco(),
              items: [
                const DropdownMenuItem(value: '', child: Text('Pilih destinasi')),
                for (final p in indonesiaProvinces) DropdownMenuItem(value: p, child: Text(p)),
              ],
              onChanged: (v) => setState(() => _destination = v ?? ''),
            ),
            const SizedBox(height: 14),
            label(Icons.calendar_today_outlined, 'Tanggal', required: true),
            InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: _pickDate,
              child: InputDecorator(
                decoration: deco().copyWith(
                  suffixIcon: const Icon(Icons.calendar_today_outlined, size: 16, color: AppColors.accent),
                ),
                child: Text(formatDateLong(_date),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textDark)),
              ),
            ),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  label(Icons.groups_outlined, 'Type Trip'),
                  DropdownButtonFormField<String>(
                    value: _type,
                    isExpanded: true,
                    decoration: deco(),
                    items: [
                      for (final t in [allTripTypesLabel, ...officialTripTypes])
                        DropdownMenuItem(value: t, child: Text(t, overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: (v) => setState(() => _type = v ?? allTripTypesLabel),
                  ),
                ]),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  label(Icons.grid_view_outlined, 'Kategori'),
                  DropdownButtonFormField<String>(
                    value: _category,
                    isExpanded: true,
                    decoration: deco(),
                    items: [
                      for (final c in [allCategoriesLabel, ...officialCategories])
                        DropdownMenuItem(value: c, child: Text(c, overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: (v) => setState(() => _category = v ?? allCategoriesLabel),
                  ),
                ]),
              ),
            ]),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _submitSearch,
              icon: const Icon(Icons.search, size: 18),
              label: const Text('Cari Trip'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required String marker,
    required Color markerColor,
    required String subtitle,
    required List<TripPackage> items,
    required List<String> seeAllTypes,
  }) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text.rich(TextSpan(
                      text: '$title ',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textDark),
                      children: [TextSpan(text: marker, style: TextStyle(color: markerColor))],
                    )),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ]),
                ),
                TextButton(
                  style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 6)),
                  onPressed: () => widget.onSearch(seeAllTypes.length == 1
                      ? TripSearchParams(type: seeAllTypes.first)
                      : TripSearchParams(typeGroup: seeAllTypes)),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Text('Lihat semua', style: TextStyle(fontSize: 13)),
                    Icon(Icons.chevron_right, size: 16),
                  ]),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 372,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(width: 14),
              itemBuilder: (context, i) => Align(
                alignment: Alignment.topCenter,
                child: TripGridCard(pkg: items[i], onTap: () => _openPackage(items[i])),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureRibbon() {
    const features = [
      (Icons.verified_user_outlined, 'Aman & Terpercaya', 'Provider terverifikasi dan berpengalaman'),
      (Icons.headset_mic_outlined, 'Layanan 24/7', 'Customer service siap membantu kapan saja'),
      (Icons.credit_card_outlined, 'Pembayaran Mudah', 'Transfer & QR Code praktis dan aman'),
      (Icons.thumb_up_alt_outlined, 'Banyak Pilihan', 'Beragam destinasi menarik sesuai keinginanmu'),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
      child: SectionCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 20),
        child: GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 18,
          crossAxisSpacing: 8,
          childAspectRatio: 1.15,
          children: [
            for (final f in features)
              Column(children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: const BoxDecoration(color: AppColors.accentLight, shape: BoxShape.circle),
                  child: Icon(f.$1, color: AppColors.primary, size: 24),
                ),
                const SizedBox(height: 8),
                Text(f.$2,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                const SizedBox(height: 4),
                Text(f.$3,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted, height: 1.4)),
              ]),
          ],
        ),
      ),
    );
  }
}
