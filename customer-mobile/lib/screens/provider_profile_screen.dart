import 'package:flutter/material.dart';

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/models/review.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

/// Profil publik mitra beserta paketnya, padanan `ProviderPublicProfilePage`.
class ProviderProfileScreen extends StatefulWidget {
  final int providerId;
  final PublicProvider? initial;

  const ProviderProfileScreen({super.key, required this.providerId, this.initial});

  @override
  State<ProviderProfileScreen> createState() => _ProviderProfileScreenState();
}

class _ProviderProfileScreenState extends State<ProviderProfileScreen> {
  PublicProvider? _provider;
  List<TripPackage> _packages = const [];
  bool _loading = true;
  bool _descExpanded = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _provider = widget.initial;
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ApiService.fetchProvider(widget.providerId),
        PackageCatalog.load(),
      ]);
      if (!mounted) return;
      setState(() {
        _provider = results[0] as PublicProvider;
        _packages = (results[1] as List<TripPackage>).where((p) => p.providerId == widget.providerId).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '$e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _provider;
    return Scaffold(
      backgroundColor: Colors.white,
      extendBodyBehindAppBar: true,
      appBar: AppBar(backgroundColor: Colors.transparent, surfaceTintColor: Colors.transparent, scrolledUnderElevation: 0),
      body: RefreshIndicator(
        onRefresh: _load,
        child: DefaultTextStyle.merge(
          style: figmaTextStyle,
          child: ListView(
            padding: const EdgeInsets.only(bottom: 32),
            children: [
              Stack(clipBehavior: Clip.none, children: [
                Container(
                  height: 150,
                  color: AppColors.divider,
                  alignment: const Alignment(0, 0.1),
                  child: const Icon(Icons.image_outlined, size: 44, color: AppColors.borderStrong),
                ),
                if (p != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 110, 16, 0),
                    child: _header(p),
                  ),
              ]),
              if (_loading && p == null) const LoadingView('Memuat profil mitra...'),
              if (_error != null && p == null)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: EmptyState(
                    icon: Icons.storefront_outlined,
                    title: 'Profil Mitra Tidak Ditemukan',
                    message: _error!,
                    actions: [ElevatedButton(onPressed: _load, child: const Text('Coba Lagi'))],
                  ),
                ),
              if (!_loading || _packages.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    SectionTitle('Paket Wisata (${_packages.length})'),
                    const SizedBox(height: 12),
                    if (_packages.isEmpty && !_loading)
                      const Text('Mitra ini belum memiliki paket aktif.', style: TextStyle(color: AppColors.textMuted)),
                    for (final pkg in _packages) ...[
                      TripListCard(
                        pkg: pkg,
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TripDetailScreen(package: pkg))),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ]),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header(PublicProvider p) {
    final since = p.createdAt == null ? '' : 'Bergabung sejak ${p.createdAt!.year}';
    final city = p.operationalCity.isNotEmpty ? p.operationalCity : p.operationalProvince;
    Widget stat(IconData icon, Color color, String label, String value) => Expanded(
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(icon, size: 14, color: color),
                const SizedBox(width: 4),
                Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textDark)),
              ]),
              const SizedBox(height: 4),
              Text(value, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ]),
          ),
        );

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: const [BoxShadow(color: Color(0x14102A33), blurRadius: 12, offset: Offset(0, 4))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          ProviderLogo(provider: p, size: 52),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(
                  child: Text(p.businessName,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                ),
                if (p.isVerified) ...[
                  const SizedBox(width: 6),
                  const Icon(Icons.verified, size: 18, color: AppColors.accent),
                ],
              ]),
              if (since.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(since, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ],
              if (city.isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(children: [
                  const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMedium),
                  const SizedBox(width: 3),
                  Expanded(child: Text(city, style: const TextStyle(fontSize: 12, color: AppColors.textMedium))),
                ]),
              ],
            ]),
          ),
        ]),
        if (p.description.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(
            p.description,
            maxLines: _descExpanded ? null : 3,
            overflow: _descExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 13, height: 1.5, color: AppColors.textMuted),
          ),
          if (p.description.length > 140)
            Center(
              child: TextButton(
                onPressed: () => setState(() => _descExpanded = !_descExpanded),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(_descExpanded ? 'Lebih sedikit' : 'Selengkapnya', style: const TextStyle(fontSize: 13)),
                  Icon(_descExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded, size: 20),
                ]),
              ),
            ),
        ],
        const SizedBox(height: 12),
        Row(children: [
          stat(Icons.star_rounded, AppColors.star, 'Rating',
              p.rating > 0 ? '${p.rating.toStringAsFixed(1)} / 5.0' : 'Belum ada ulasan'),
          const SizedBox(width: 8),
          stat(Icons.favorite_rounded, AppColors.success, 'Peserta Trip',
              p.totalTravelers > 0 ? '${p.totalTravelers} orang' : '-'),
        ]),
      ]),
    );
  }
}
