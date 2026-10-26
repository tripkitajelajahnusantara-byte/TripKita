import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/services/location_service.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';
import 'package:customer_mobile/widgets/trip_search_form.dart';

/// Parameter pencarian, sama dengan `searchParams` di NavigationContext web.
class TripSearchParams {
  final String destination;
  final String date;
  final String type;
  final String category;

  /// Dibuka dari navigasi bawah: trip diurutkan dari lokasi GPS customer.
  final bool nearMe;

  const TripSearchParams({
    this.destination = '',
    this.date = '',
    this.type = allTripTypesLabel,
    this.category = allCategoriesLabel,
    this.nearMe = false,
  });

  TripSearchParams copyWith({String? destination, String? date, String? type, String? category}) => TripSearchParams(
        destination: destination ?? this.destination,
        date: date ?? this.date,
        type: type ?? this.type,
        category: category ?? this.category,
        nearMe: nearMe,
      );

  bool get hasType => type.isNotEmpty && type != allTripTypesLabel;
  bool get hasCategory => category.isNotEmpty && category != allCategoriesLabel;
}

const _sortOptions = ['Rekomendasi', 'Terpopuler', 'Termurah', 'Termahal'];

/// Halaman Cari Trip sesuai desain Figma, padanan `CustomerSearchPage` di web.
class TripListScreen extends StatefulWidget {
  final TripSearchParams params;

  const TripListScreen({super.key, required this.params});

  @override
  State<TripListScreen> createState() => _TripListScreenState();
}

class _TripListScreenState extends State<TripListScreen> {
  /// Dialog "aktifkan lokasi" cukup sekali per sesi; berikutnya cukup pesan singkat.
  static bool _askedToEnableLocation = false;

  late TripSearchParams _params = widget.params;
  late Future<List<TripPackage>> _packages = PackageCatalog.load();
  final _scroll = ScrollController();
  String _sortBy = _sortOptions.first;

  /// Lokasi customer (mode terdekat); null berarti semua trip tanpa urutan jarak.
  ({double lat, double lon})? _origin;
  bool _locating = false;
  bool _waitingForSettings = false;
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    // Kembali dari pengaturan lokasi: coba ambil lokasi lagi.
    _lifecycle = AppLifecycleListener(onResume: () {
      if (_waitingForSettings) {
        _waitingForSettings = false;
        _locate();
      }
    });
    if (_params.nearMe) _locate();
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    _scroll.dispose();
    super.dispose();
  }

  /// Trip terdekat dulu. Bila lokasi tidak tersedia, daftar tetap menampilkan
  /// semua trip; layanan lokasi yang mati ditawarkan untuk diaktifkan.
  Future<void> _locate() async {
    setState(() => _locating = true);
    final result = await LocationService.current();
    if (!mounted) return;
    final position = result.position;
    setState(() {
      _locating = false;
      _origin = position == null ? null : (lat: position.latitude, lon: position.longitude);
    });
    switch (result.issue) {
      case null:
        return;
      case LocationIssue.serviceDisabled:
        if (_askedToEnableLocation) {
          showSnack(context, 'Lokasi perangkat mati. Menampilkan semua trip.');
          return;
        }
        _askedToEnableLocation = true;
        final enable = await showActionDialog(
          context,
          title: 'Aktifkan Lokasi',
          message: const Text('Nyalakan layanan lokasi (GPS) agar kami bisa menampilkan trip dengan titik kumpul '
              'terdekat dari posisi Anda.'),
          confirmLabel: 'Aktifkan Lokasi',
          cancelLabel: 'Lihat Semua Trip',
        );
        if (enable && mounted) {
          _waitingForSettings = true;
          await LocationService.openSettings();
        }
      case LocationIssue.permissionDenied:
        showSnack(context, 'Izin lokasi tidak diberikan. Menampilkan semua trip.');
      case LocationIssue.unavailable:
        showSnack(context, 'Lokasi belum dapat ditemukan. Menampilkan semua trip.');
    }
  }

  Future<void> _refresh() async {
    final future = PackageCatalog.load(force: true);
    setState(() => _packages = future);
    await future.catchError((_) => <TripPackage>[]);
  }

  List<TripPackage> _apply(List<TripPackage> all) {
    final dest = _params.destination.toLowerCase();
    final cat = _params.category.toLowerCase();
    final list = all.where((p) {
      final pkgDest = p.destination.toLowerCase();
      // Destinasi diketik bebas, mis. "Malang, Jawa Timur" tetap cocok dengan "Jawa Timur".
      if (dest.isNotEmpty && !pkgDest.contains(dest) && !(pkgDest.isNotEmpty && dest.contains(pkgDest))) return false;
      if (_params.hasCategory && !p.category.toLowerCase().contains(cat)) return false;
      if (_params.hasType && (p.tripType.isEmpty ? 'Open Trip' : p.tripType) != _params.type) return false;
      return true;
    }).toList();

    switch (_sortBy) {
      case 'Terpopuler':
        list.sort((a, b) => b.quotaUsed.compareTo(a.quotaUsed));
      case 'Termahal':
        list.sort((a, b) => b.price.compareTo(a.price));
      case 'Termurah':
        list.sort((a, b) => a.price.compareTo(b.price));
      default:
        final origin = _origin;
        final target = parseIsoDate(_params.date);
        if (origin != null && target == null) {
          sortByDistance(list, origin.lat, origin.lon);
        } else if (target != null) {
          int distance(TripPackage p) {
            final start = parseIsoDate(p.startDate);
            return start == null ? 1 << 30 : start.difference(target).inDays.abs();
          }

          list.sort((a, b) => distance(a).compareTo(distance(b)));
        }
    }
    return list;
  }

  void _open(TripPackage pkg) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => TripDetailScreen(
        package: pkg,
        preferredDate: _params.date.isNotEmpty ? _params.date : pkg.startDate,
      ),
    ));
  }

  Future<void> _editSearch() async {
    final result = await showDesignSheet<TripSearchParams>(
      context,
      title: 'Ubah Pencarian Trip',
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: TripSearchForm(
          initial: _params,
          submitLabel: 'Simpan',
          onSubmit: (params) => Navigator.pop(sheetContext, params),
        ),
      ),
    );
    if (result != null) setState(() => _params = result);
  }

  Future<void> _pickSort() async {
    final result = await showDesignSheet<String>(
      context,
      title: 'Urutkan',
      builder: (_) => _SortSheet(initial: _sortBy),
    );
    if (result != null) setState(() => _sortBy = result);
  }

  void _toggleCategory(String category) {
    setState(() => _params = _params.copyWith(category: _params.category == category ? allCategoriesLabel : category));
  }

  /// Judul kolom pencarian saat destinasi kosong.
  String get _placeholder {
    if (!_params.nearMe) return 'Semua Destinasi';
    if (_origin != null) return 'Lokasi Terdekat';
    return _locating ? 'Mencari lokasi terdekat...' : 'Semua Trip';
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return Scaffold(
      backgroundColor: Colors.white,
      body: DefaultTextStyle.merge(
        style: figmaTextStyle,
        child: RefreshIndicator(
          onRefresh: _refresh,
          edgeOffset: top + _SearchHeader.expandedBody,
          child: FutureBuilder<List<TripPackage>>(
            future: _packages,
            builder: (context, snapshot) {
              final loading = snapshot.connectionState != ConnectionState.done;
              final results = snapshot.hasData ? _apply(snapshot.data!) : const <TripPackage>[];
              return CustomScrollView(
                controller: _scroll,
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverPersistentHeader(
                    pinned: true,
                    delegate: _SearchHeader(
                      top: top,
                      params: _params,
                      placeholder: _placeholder,
                      onEdit: _editSearch,
                      onSort: _pickSort,
                      onCategory: _toggleCategory,
                    ),
                  ),
                  if (loading || snapshot.hasError || results.isEmpty)
                    SliverToBoxAdapter(
                      child: _SheetTop(
                        scroll: _scroll,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: loading
                              ? const LoadingView('Memuat daftar paket wisata...')
                              : snapshot.hasError
                                  ? EmptyState(
                                      icon: Icons.wifi_off_outlined,
                                      title: 'Daftar Paket Belum Dapat Dimuat',
                                      message: '${snapshot.error}',
                                      actions: [ElevatedButton(onPressed: _refresh, child: const Text('Coba Lagi'))],
                                    )
                                  : EmptyState(
                                      icon: Icons.travel_explore,
                                      title: 'Tidak Ada Paket Ditemukan',
                                      message: 'Coba cari destinasi atau tanggal yang lain.',
                                      actions: [
                                        OutlinedButton(onPressed: _editSearch, child: const Text('Ubah Pencarian')),
                                      ],
                                    ),
                        ),
                      ),
                    )
                  else
                    SliverList.builder(
                      itemCount: results.length,
                      itemBuilder: (context, i) {
                        final pkg = results[i];
                        final card = Padding(
                          padding: const EdgeInsets.all(16),
                          child: TripListCard(pkg: pkg, onTap: () => _open(pkg)),
                        );
                        return Column(children: [
                          i == 0 ? _SheetTop(scroll: _scroll, child: card) : card,
                          if (i < results.length - 1)
                            const SizedBox(height: 8, child: ColoredBox(color: AppColors.divider)),
                        ]);
                      },
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

/// Header biru "Cari Trip" yang menyusut menjadi putih saat daftar digulir:
/// judul menghilang, kolom pencarian dan chip tetap terlihat.
class _SearchHeader extends SliverPersistentHeaderDelegate {
  static const collapseRange = 64.0;

  /// Tinggi di bawah status bar saat terbuka: judul 56, jarak 8, kolom 48,
  /// jarak 16, chip 28, jarak 16.
  static const expandedBody = 172.0;

  final double top;
  final TripSearchParams params;
  final String placeholder;
  final VoidCallback onEdit;
  final VoidCallback onSort;
  final ValueChanged<String> onCategory;

  const _SearchHeader({
    required this.top,
    required this.params,
    required this.placeholder,
    required this.onEdit,
    required this.onSort,
    required this.onCategory,
  });

  @override
  double get maxExtent => top + expandedBody;

  @override
  double get minExtent => top + expandedBody - collapseRange;

  @override
  bool shouldRebuild(_SearchHeader oldDelegate) => true;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final t = (shrinkOffset / collapseRange).clamp(0.0, 1.0);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: t < 0.5 ? AppTheme.lightBars : AppTheme.darkBars,
      child: Container(
        color: Color.lerp(AppColors.brand, Colors.white, t),
        foregroundDecoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: AppColors.border.withValues(alpha: t))),
        ),
        padding: EdgeInsets.only(top: top),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          SizedBox(
            height: 56 * (1 - t),
            child: ClipRect(
              child: OverflowBox(
                alignment: Alignment.bottomLeft,
                minHeight: 56,
                maxHeight: 56,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Opacity(
                      opacity: 1 - t,
                      child: const Text('Cari Trip',
                          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: Colors.white)),
                    ),
                  ),
                ),
              ),
            ),
          ),
          SizedBox(height: lerpDouble(8, 4, t)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _SearchPill(params: params, placeholder: placeholder, t: t, onTap: onEdit),
          ),
          SizedBox(height: lerpDouble(16, 12, t)),
          // "Urutkan" tetap di tempat; hanya chip kategori yang bergulir.
          SizedBox(
            height: 28,
            child: Row(children: [
              const SizedBox(width: 16),
              BadgeChip(
                label: 'Urutkan',
                selected: true,
                onTap: onSort,
                leading: const AppIcon('sort_ascending', size: 16, color: AppColors.primaryDark),
                trailing: const AppIcon('caret_down', size: 16, color: AppColors.primaryDark),
              ),
              const SizedBox(width: 8),
              Container(
                width: 1,
                height: 28,
                color: Color.lerp(const Color(0x66FFFFFF), AppColors.border, t),
              ),
              Expanded(
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(8, 0, 16, 0),
                  children: [
                    for (final category in officialCategories) ...[
                      if (category != officialCategories.first) const SizedBox(width: 6),
                      BadgeChip(
                        label: category,
                        selected: params.category == category,
                        onTap: () => onCategory(category),
                      ),
                    ],
                  ],
                ),
              ),
            ]),
          ),
          const SizedBox(height: 16),
        ]),
      ),
    );
  }
}

/// Kolom ringkasan pencarian berbentuk pil (terang, ikon teal, "Ubah").
/// Tanpa tanggal/tipe hanya satu baris, mis. "Lokasi Terdekat".
class _SearchPill extends StatelessWidget {
  final TripSearchParams params;
  final String placeholder;
  final double t;
  final VoidCallback onTap;

  const _SearchPill({required this.params, required this.placeholder, required this.t, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final date = parseIsoDate(params.date);
    final hasDetail = date != null || params.hasType;
    const subtitleStyle = TextStyle(fontSize: 11, height: 16 / 11, color: AppColors.textMuted);
    final title = params.destination.isEmpty ? placeholder : params.destination;
    return Material(
      color: AppColors.accentSoft,
      shape: StadiumBorder(side: BorderSide(color: AppColors.border.withValues(alpha: t))),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: 48,
          padding: const EdgeInsets.only(left: 12, right: 16),
          child: Row(children: [
            const AppIcon('magnifying_glass', color: AppColors.accent),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: hasDetail
                          ? const TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600, color: AppColors.textDark)
                          : const TextStyle(fontSize: 15, height: 20 / 15, color: AppColors.textMedium)),
                  if (hasDetail)
                    Row(children: [
                      if (date != null) Text(formatDateLong(date), style: subtitleStyle),
                      if (date != null && params.hasType)
                        const SizedBox(
                          width: 14,
                          child: Text('•', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: AppColors.borderStrong)),
                        ),
                      if (params.hasType)
                        Flexible(child: Text(params.type, maxLines: 1, overflow: TextOverflow.ellipsis, style: subtitleStyle)),
                    ]),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Text('Ubah', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.accent)),
          ]),
        ),
      ),
    );
  }
}

/// Lembar putih bersudut 24 di awal daftar yang menutupi latar header.
/// Warna di balik sudutnya mengikuti warna header saat menyusut.
class _SheetTop extends StatelessWidget {
  final ScrollController scroll;
  final Widget child;

  const _SheetTop({required this.scroll, required this.child});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: scroll,
      builder: (context, sheet) {
        final t = scroll.hasClients ? (scroll.offset / _SearchHeader.collapseRange).clamp(0.0, 1.0) : 0.0;
        return ColoredBox(color: Color.lerp(AppColors.brand, Colors.white, t)!, child: sheet);
      },
      child: DecoratedBox(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: child,
      ),
    );
  }
}

/// Isi lembar "Urutkan": pilihan radio dan tombol Terapkan.
class _SortSheet extends StatefulWidget {
  final String initial;

  const _SortSheet({required this.initial});

  @override
  State<_SortSheet> createState() => _SortSheetState();
}

class _SortSheetState extends State<_SortSheet> {
  late String _value = widget.initial;

  @override
  Widget build(BuildContext context) {
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (final option in _sortOptions)
        Semantics(
          inMutuallyExclusiveGroup: true,
          checked: option == _value,
          child: InkWell(
            onTap: () => setState(() => _value = option),
            child: Container(
              height: 56,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(children: [
                Expanded(child: Text(option, style: const TextStyle(fontSize: 18, color: AppColors.ink))),
                Container(
                  width: 20,
                  height: 20,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: option == _value ? AppColors.brand : Colors.white,
                    border: option == _value ? null : Border.all(color: AppColors.border),
                  ),
                  child: option == _value
                      ? Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                        )
                      : null,
                ),
              ]),
            ),
          ),
        ),
      Padding(
        padding: const EdgeInsets.all(16),
        child: BrandButton(label: 'Terapkan', onPressed: () => Navigator.pop(context, _value)),
      ),
    ]);
  }
}
