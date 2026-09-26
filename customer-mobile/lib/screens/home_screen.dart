import 'package:flutter/material.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/screens/auth_screen.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/screens/trip_list_screen.dart';
import 'package:customer_mobile/screens/trip_planner_screen.dart';
import 'package:customer_mobile/screens/notification_screen.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

const _categoryIcons = <String, IconData>{
  'City Tour': Icons.location_city_outlined,
  'Diving & Snorkeling': Icons.scuba_diving_outlined,
  'Wisata Budaya & Sejarah': Icons.account_balance_outlined,
  'Pantai': Icons.beach_access_outlined,
  'Gunung': Icons.landscape_outlined,
  'Curug': Icons.water_outlined,
  'Keluarga Santai': Icons.family_restroom_outlined,
};

/// Beranda customer, padanan `CustomerLandingPage` di web, dengan tata letak
/// yang dipadatkan untuk layar ponsel: pencarian ringkas, pintasan kategori,
/// dan grid paket dua kolom.
class HomeScreen extends StatefulWidget {
  final ValueChanged<TripSearchParams> onSearch;

  const HomeScreen({super.key, required this.onSearch});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<TripPackage>> _packages = PackageCatalog.load();

  String _destination = '';
  DateTime _date = dateOnly(DateTime.now());
  String _type = allTripTypesLabel;

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
      helpText: 'Tanggal berangkat',
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickDestination() async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _DestinationSheet(current: _destination),
    );
    if (picked != null) setState(() => _destination = picked);
  }

  void _submitSearch() {
    widget.onSearch(TripSearchParams(
        destination: _destination, date: toIsoDate(_date), type: _type));
  }

  void _openPackage(TripPackage pkg) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) =>
          TripDetailScreen(package: pkg, preferredDate: toIsoDate(_date)),
    ));
  }

  Future<void> _openPlanner() async {
    if (!await ensureLoggedIn(context) || !context.mounted) return;
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const TripPlannerScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: const BrandLogo(height: 30),
        actions: [
          ListenableBuilder(
            listenable: AuthSession.instance,
            builder: (context, _) {
              final profile = AuthSession.instance.profile;
              if (profile != null) {
                return Row(mainAxisSize: MainAxisSize.min, children: [
                  IconButton(
                    tooltip: 'Notifikasi',
                    onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) => const NotificationScreen())),
                    icon: const Icon(Icons.notifications_none,
                        color: AppColors.primary),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () =>
                          appShellKey.currentState?.selectTab(AppTab.akun),
                      child: CircleAvatar(
                        radius: 17,
                        backgroundColor: AppColors.accentLight,
                        child: Text(
                          profile.name.isNotEmpty
                              ? profile.name[0].toUpperCase()
                              : 'T',
                          style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ),
                ]);
              }
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: TextButton.icon(
                  onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const AuthScreen())),
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
          padding: EdgeInsets.zero,
          children: [
            Stack(clipBehavior: Clip.none, children: [
              _buildHero(),
              Padding(
                  padding: const EdgeInsets.only(top: 132),
                  child: _buildSearchCard()),
            ]),
            const SizedBox(height: 20),
            _buildCategoryChips(),
            const SizedBox(height: 18),
            _buildPlannerBanner(),
            const SizedBox(height: 24),
            FutureBuilder<List<TripPackage>>(
              future: _packages,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const LoadingView(
                      'Sedang memuat paket wisata terbaik...');
                }
                if (snapshot.hasError) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: EmptyState(
                      icon: Icons.wifi_off_outlined,
                      title: 'Paket Wisata Belum Dapat Dimuat',
                      message: '${snapshot.error}',
                      actions: [
                        ElevatedButton(
                            onPressed: _refresh, child: const Text('Coba Lagi'))
                      ],
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
                      message:
                          'Belum ada paket wisata aktif saat ini. Coba lagi nanti.',
                    ),
                  );
                }
                return Column(children: [
                  _buildSection(
                    title: 'Trip Populer (Open Trip)',
                    marker: '✦',
                    markerColor: AppColors.accent,
                    subtitle:
                        'Paket gabungan hemat & seru dengan jadwal teratur',
                    items: packages.where((p) => p.isOpenTrip).take(4).toList(),
                    seeAllTypes: const ['Open Trip'],
                  ),
                  _buildSection(
                    title: 'Private Trip & Honeymoon',
                    marker: '🌹',
                    markerColor: AppColors.honeymoon,
                    subtitle:
                        'Jadwal bebas pilih • Fasilitas eksklusif & privat',
                    items: packages
                        .where((p) =>
                            p.tripType == 'Private Trip' ||
                            p.tripType == 'Honeymoon')
                        .take(4)
                        .toList(),
                    seeAllTypes: const ['Private Trip', 'Honeymoon'],
                  ),
                  _buildSection(
                    title: 'Family & Corporate',
                    marker: '🏢',
                    markerColor: AppColors.corporate,
                    subtitle:
                        'Liburan keluarga & gathering kantor • Tanggal bebas pilih',
                    items: packages
                        .where((p) =>
                            p.tripType == 'Family' || p.tripType == 'Corporate')
                        .take(4)
                        .toList(),
                    seeAllTypes: const ['Family', 'Corporate'],
                  ),
                ]);
              },
            ),
            _buildFeatureRibbon(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              child: Text(
                  '© ${DateTime.now().year} TripKita. All rights reserved.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: AppColors.textLight, fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHero() {
    return Container(
      height: 190,
      decoration: const BoxDecoration(
        image: DecorationImage(
          image: AssetImage('assets/images/hero.jpg'),
          fit: BoxFit.cover,
          alignment: Alignment(0, -0.35),
        ),
      ),
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xCC0F172A), Color(0x800F172A), Color(0x260F172A)],
            stops: [0, 0.5, 0.9],
          ),
        ),
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        alignment: Alignment.topLeft,
        child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Cari Open Trip\nIndonesia dengan Mudah',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                  shadows: [
                    Shadow(
                        color: Color(0x66000000),
                        blurRadius: 10,
                        offset: Offset(0, 2))
                  ],
                ),
              ),
              SizedBox(height: 6),
              Text(
                'Open trip seru & tour guide terpercaya di seluruh Indonesia.',
                style: TextStyle(
                    color: Color(0xFFF1F5F9),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600),
              ),
            ]),
      ),
    );
  }

  Widget _buildSearchCard() {
    Widget field(
        {required IconData icon,
        required String label,
        required String value,
        required VoidCallback onTap}) {
      return Material(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            child: Row(children: [
              Icon(icon, size: 18, color: AppColors.accent),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label,
                          style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textMuted,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(height: 1),
                      Text(value,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 14,
                              color: AppColors.textDark,
                              fontWeight: FontWeight.w700)),
                    ]),
              ),
            ]),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: const [
            BoxShadow(
                color: Color(0x14000000), blurRadius: 24, offset: Offset(0, 8))
          ],
        ),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          field(
            icon: Icons.location_on_outlined,
            label: 'Mau ke mana?',
            value: _destination.isEmpty ? 'Semua destinasi' : _destination,
            onTap: _pickDestination,
          ),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: field(
                icon: Icons.calendar_today_outlined,
                label: 'Berangkat',
                value: formatDateShort(_date),
                onTap: _pickDate,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: PopupMenuButton<String>(
                initialValue: _type,
                onSelected: (v) => setState(() => _type = v),
                itemBuilder: (_) => [
                  for (final t in [allTripTypesLabel, ...officialTripTypes])
                    PopupMenuItem(value: t, child: Text(t)),
                ],
                child: IgnorePointer(
                  child: field(
                      icon: Icons.groups_outlined,
                      label: 'Tipe Trip',
                      value: _type,
                      onTap: () {}),
                ),
              ),
            ),
          ]),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 13),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _submitSearch,
            icon: const Icon(Icons.search, size: 18),
            label: const Text('Cari Trip'),
          ),
        ]),
      ),
    );
  }

  Widget _buildCategoryChips() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: Text('Jelajahi Kategori',
            style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppColors.textDark)),
      ),
      const SizedBox(height: 10),
      SizedBox(
        height: 40,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: officialCategories.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (context, i) {
            final category = officialCategories[i];
            return ActionChip(
              avatar: Icon(_categoryIcons[category] ?? Icons.explore_outlined,
                  size: 16, color: AppColors.primary),
              label: Text(category),
              labelStyle: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textBody),
              backgroundColor: Colors.white,
              side: const BorderSide(color: AppColors.border),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              onPressed: () =>
                  widget.onSearch(TripSearchParams(category: category)),
            );
          },
        ),
      ),
    ]);
  }

  Widget _buildPlannerBanner() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Material(
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: _openPlanner,
          child: Ink(
            decoration: const BoxDecoration(
              gradient:
                  LinearGradient(colors: [AppColors.primary, AppColors.accent]),
            ),
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.savings_outlined, color: Colors.white),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Rencanakan Perjalananmu',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.w800)),
                      SizedBox(height: 2),
                      Text(
                          'Atur target budget, catat tabungan, dan checklist persiapan trip.',
                          style: TextStyle(
                              color: Color(0xE6FFFFFF), fontSize: 12)),
                    ]),
              ),
              const Icon(Icons.chevron_right, color: Colors.white),
            ]),
          ),
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
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text.rich(TextSpan(
                      text: '$title ',
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textDark),
                      children: [
                        TextSpan(
                            text: marker, style: TextStyle(color: markerColor))
                      ],
                    )),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textMuted)),
                  ]),
            ),
            TextButton(
              style: TextButton.styleFrom(
                padding: const EdgeInsets.only(left: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              onPressed: () => widget.onSearch(seeAllTypes.length == 1
                  ? TripSearchParams(type: seeAllTypes.first)
                  : TripSearchParams(typeGroup: seeAllTypes)),
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Text('Lihat semua', style: TextStyle(fontSize: 13)),
                Icon(Icons.chevron_right, size: 16),
              ]),
            ),
          ]),
          const SizedBox(height: 12),
          // Dua kartu per baris, lebarnya mengikuti layar agar tidak ada
          // kartu yang terpotong di tepi.
          LayoutBuilder(builder: (context, constraints) {
            const gap = 12.0;
            final width = (constraints.maxWidth - gap) / 2;
            return Wrap(
              spacing: gap,
              runSpacing: gap,
              children: [
                for (final pkg in items)
                  SizedBox(
                      width: width,
                      child: TripGridCard(
                          pkg: pkg, onTap: () => _openPackage(pkg))),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _buildFeatureRibbon() {
    const features = [
      (
        Icons.verified_user_outlined,
        'Aman & Terpercaya',
        'Provider terverifikasi'
      ),
      (Icons.headset_mic_outlined, 'Layanan 24/7', 'CS siap membantu'),
      (Icons.credit_card_outlined, 'Pembayaran Mudah', 'Transfer & QR Code'),
      (Icons.thumb_up_alt_outlined, 'Banyak Pilihan', 'Beragam destinasi'),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: SectionCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        child: Wrap(
          runSpacing: 14,
          children: [
            for (final f in features)
              FractionallySizedBox(
                widthFactor: 0.5,
                child: Row(children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                        color: AppColors.accentLight, shape: BoxShape.circle),
                    child: Icon(f.$1, color: AppColors.primary, size: 18),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(f.$2,
                              style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textDark)),
                          Text(f.$3,
                              style: const TextStyle(
                                  fontSize: 11, color: AppColors.textMuted)),
                        ]),
                  ),
                ]),
              ),
          ],
        ),
      ),
    );
  }
}

/// Pemilih destinasi dengan kolom pencarian, menggantikan dropdown panjang
/// 38 provinsi.
class _DestinationSheet extends StatefulWidget {
  final String current;

  const _DestinationSheet({required this.current});

  @override
  State<_DestinationSheet> createState() => _DestinationSheetState();
}

class _DestinationSheetState extends State<_DestinationSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final q = _query.toLowerCase();
    final results =
        indonesiaProvinces.where((p) => p.toLowerCase().contains(q)).toList();
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.75,
        child: Padding(
          padding:
              EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: Column(children: [
            const SizedBox(height: 16),
            const Text('Pilih Destinasi',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                autofocus: true,
                onChanged: (v) => setState(() => _query = v),
                decoration: const InputDecoration(
                  hintText: 'Cari provinsi, mis. Bali',
                  prefixIcon: Icon(Icons.search, size: 20),
                ),
              ),
            ),
            Expanded(
              child: ListView(children: [
                if (q.isEmpty)
                  ListTile(
                    leading: const Icon(Icons.public, color: AppColors.primary),
                    title: const Text('Semua destinasi'),
                    trailing: widget.current.isEmpty
                        ? const Icon(Icons.check, color: AppColors.accent)
                        : null,
                    onTap: () => Navigator.pop(context, ''),
                  ),
                for (final p in results)
                  ListTile(
                    leading: const Icon(Icons.location_on_outlined,
                        color: AppColors.textLight),
                    title: Text(p),
                    trailing: widget.current == p
                        ? const Icon(Icons.check, color: AppColors.accent)
                        : null,
                    onTap: () => Navigator.pop(context, p),
                  ),
                if (results.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Provinsi tidak ditemukan.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textMuted)),
                  ),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}
