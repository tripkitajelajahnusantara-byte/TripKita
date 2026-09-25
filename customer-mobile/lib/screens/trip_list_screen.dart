import 'package:flutter/material.dart';

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

/// Parameter pencarian, sama dengan `searchParams` di NavigationContext web.
class TripSearchParams {
  final String destination;
  final String date;
  final String type;
  final String category;

  /// Beberapa tipe sekaligus, dipakai tombol "Lihat semua" pada seksi
  /// beranda yang menggabungkan dua tipe (mis. Private Trip & Honeymoon).
  final List<String> typeGroup;

  const TripSearchParams({
    this.destination = '',
    this.date = '',
    this.type = allTripTypesLabel,
    this.category = allCategoriesLabel,
    this.typeGroup = const [],
  });

  /// Mengganti tipe tunggal menghapus grup tipe agar filter tidak bertumpuk.
  TripSearchParams copyWith({String? destination, String? date, String? type, String? category}) => TripSearchParams(
        destination: destination ?? this.destination,
        date: date ?? this.date,
        type: type ?? this.type,
        category: category ?? this.category,
        typeGroup: type != null ? const [] : typeGroup,
      );

  bool get hasTypeGroup => typeGroup.isNotEmpty;
  bool get hasType => !hasTypeGroup && type.isNotEmpty && type != allTripTypesLabel;
  bool get hasCategory => category.isNotEmpty && category != allCategoriesLabel;
}

const _sortOptions = {
  'Rekomendasi': 'Rekomendasi',
  'Terpopuler': 'Terpopuler (Paling Sering Dipesan)',
  'Rating Tertinggi': 'Rating Tertinggi',
  'Termurah': 'Termurah',
  'Termahal': 'Termahal',
};

/// Halaman hasil pencarian, padanan `CustomerSearchPage` di web.
class TripListScreen extends StatefulWidget {
  final TripSearchParams params;

  const TripListScreen({super.key, required this.params});

  @override
  State<TripListScreen> createState() => _TripListScreenState();
}

class _TripListScreenState extends State<TripListScreen> {
  late TripSearchParams _params = widget.params;
  late Future<List<TripPackage>> _packages = PackageCatalog.load();
  String _sortBy = 'Rekomendasi';

  Future<void> _refresh() async {
    final future = PackageCatalog.load(force: true);
    setState(() => _packages = future);
    await future.catchError((_) => <TripPackage>[]);
  }

  List<TripPackage> _apply(List<TripPackage> all) {
    final dest = _params.destination.toLowerCase();
    final cat = _params.category.toLowerCase();
    final list = all.where((p) {
      if (dest.isNotEmpty && !p.destination.toLowerCase().contains(dest)) return false;
      if (_params.hasCategory && !p.category.toLowerCase().contains(cat)) return false;
      if (_params.hasType && p.tripType != _params.type) return false;
      if (_params.hasTypeGroup && !_params.typeGroup.contains(p.tripType)) return false;
      return true;
    }).toList();

    switch (_sortBy) {
      case 'Terpopuler':
        list.sort((a, b) => b.quotaUsed.compareTo(a.quotaUsed));
      case 'Rating Tertinggi':
        list.sort((a, b) => b.rating.compareTo(a.rating));
      case 'Termahal':
        list.sort((a, b) => b.price.compareTo(a.price));
      case 'Termurah':
        list.sort((a, b) => a.price.compareTo(b.price));
      default:
        final target = parseIsoDate(_params.date);
        if (target != null) {
          int distance(TripPackage p) {
            final start = parseIsoDate(p.startDate);
            return start == null ? 1 << 30 : start.difference(target).inDays.abs();
          }

          list.sort((a, b) => distance(a).compareTo(distance(b)));
        }
    }
    return list;
  }

  String get _title {
    if (_params.hasTypeGroup) return 'Daftar Paket ${_params.typeGroup.join(' & ')}';
    if (_params.hasType) return 'Daftar Paket ${_params.type}';
    if (_params.hasCategory) return 'Daftar Paket ${_params.category}';
    return 'Daftar Paket Wisata';
  }

  void _open(TripPackage pkg) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => TripDetailScreen(
        package: pkg,
        preferredDate: _params.date.isNotEmpty ? _params.date : pkg.startDate,
      ),
    ));
  }

  Future<void> _editFilters() async {
    final result = await showModalBottomSheet<TripSearchParams>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _FilterSheet(initial: _params),
    );
    if (result != null) setState(() => _params = result);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cari Trip'),
        actions: [
          IconButton(tooltip: 'Ubah pencarian', onPressed: _editFilters, icon: const Icon(Icons.tune)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<TripPackage>>(
          future: _packages,
          builder: (context, snapshot) {
            final loading = snapshot.connectionState != ConnectionState.done;
            final results = snapshot.hasData ? _apply(snapshot.data!) : const <TripPackage>[];
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                _buildHeader(loading ? null : results.length),
                const SizedBox(height: 18),
                if (loading)
                  const LoadingView('Memuat daftar paket wisata...')
                else if (snapshot.hasError)
                  EmptyState(
                    icon: Icons.wifi_off_outlined,
                    title: 'Daftar Paket Belum Dapat Dimuat',
                    message: '${snapshot.error}',
                    actions: [ElevatedButton(onPressed: _refresh, child: const Text('Coba Lagi'))],
                  )
                else if (results.isEmpty)
                  EmptyState(
                    icon: Icons.travel_explore,
                    title: 'Tidak Ada Paket Ditemukan',
                    message: 'Coba cari destinasi atau tanggal yang lain.',
                    actions: [OutlinedButton(onPressed: _editFilters, child: const Text('Ubah Pencarian'))],
                  )
                else
                  for (final pkg in results) ...[
                    TripListCard(pkg: pkg, onTap: () => _open(pkg)),
                    const SizedBox(height: 16),
                  ],
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildHeader(int? count) {
    final chips = <String>[
      if (_params.destination.isNotEmpty) _params.destination,
      if (parseIsoDate(_params.date) != null) formatIsoLong(_params.date),
      if (_params.hasType) _params.type,
      ..._params.typeGroup,
      if (_params.hasCategory) _params.category,
    ];
    return SectionCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textDark)),
          const SizedBox(height: 2),
          if (count != null)
            Text.rich(TextSpan(
              text: 'Menampilkan ',
              style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
              children: [
                TextSpan(text: '$count', style: const TextStyle(fontWeight: FontWeight.w800)),
                TextSpan(text: ' paket wisata${_params.destination.isNotEmpty ? ' untuk "${_params.destination}"' : ''}'),
              ],
            )),
          if (chips.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final c in chips)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.accentLight, borderRadius: BorderRadius.circular(20)),
                  child: Text(c, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.primary)),
                ),
            ]),
          ],
          const SizedBox(height: 14),
          const Text('Urutkan berdasarkan:',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMedium)),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            value: _sortBy,
            isExpanded: true,
            decoration: InputDecoration(
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
              ),
            ),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDark),
            items: [
              for (final e in _sortOptions.entries) DropdownMenuItem(value: e.key, child: Text(e.value)),
            ],
            onChanged: (v) => setState(() => _sortBy = v ?? 'Rekomendasi'),
          ),
        ],
      ),
    );
  }
}

class _FilterSheet extends StatefulWidget {
  final TripSearchParams initial;

  const _FilterSheet({required this.initial});

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late TripSearchParams _p = widget.initial;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Ubah Pencarian', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            const FieldLabel('Destination'),
            DropdownButtonFormField<String>(
              value: indonesiaProvinces.contains(_p.destination) ? _p.destination : '',
              isExpanded: true,
              items: [
                const DropdownMenuItem(value: '', child: Text('Semua destinasi')),
                for (final p in indonesiaProvinces) DropdownMenuItem(value: p, child: Text(p)),
              ],
              onChanged: (v) => setState(() => _p = _p.copyWith(destination: v ?? '')),
            ),
            const SizedBox(height: 14),
            const FieldLabel('Type Trip'),
            DropdownButtonFormField<String>(
              value: !_p.hasTypeGroup && officialTripTypes.contains(_p.type) ? _p.type : allTripTypesLabel,
              isExpanded: true,
              items: [
                for (final t in [allTripTypesLabel, ...officialTripTypes]) DropdownMenuItem(value: t, child: Text(t)),
              ],
              onChanged: (v) => setState(() => _p = _p.copyWith(type: v)),
            ),
            const SizedBox(height: 14),
            const FieldLabel('Kategori'),
            DropdownButtonFormField<String>(
              value: [allCategoriesLabel, ...officialCategories].contains(_p.category) ? _p.category : allCategoriesLabel,
              isExpanded: true,
              items: [
                for (final c in [allCategoriesLabel, ...officialCategories]) DropdownMenuItem(value: c, child: Text(c)),
              ],
              onChanged: (v) => setState(() => _p = _p.copyWith(category: v)),
            ),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context, TripSearchParams(date: _p.date)),
                  child: const Text('Reset'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  onPressed: () => Navigator.pop(context, _p),
                  child: const Text('Terapkan'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
