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
      appBar: AppBar(title: const Text('Profil Mitra')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            if (p != null) _header(p),
            if (_loading && p == null) const LoadingView('Memuat profil mitra...'),
            if (_error != null && p == null)
              EmptyState(
                icon: Icons.storefront_outlined,
                title: 'Profil Mitra Tidak Ditemukan',
                message: _error!,
                actions: [ElevatedButton(onPressed: _load, child: const Text('Coba Lagi'))],
              ),
            const SizedBox(height: 20),
            if (!_loading || _packages.isNotEmpty) ...[
              Text('Paket dari ${p?.businessName ?? 'Mitra'} (${_packages.length})',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              const SizedBox(height: 12),
              if (_packages.isEmpty && !_loading)
                const Text('Mitra ini belum memiliki paket aktif.', style: TextStyle(color: AppColors.textMuted)),
              for (final pkg in _packages) ...[
                TripListCard(
                  pkg: pkg,
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TripDetailScreen(package: pkg))),
                ),
                const SizedBox(height: 14),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _header(PublicProvider p) {
    final location = [p.operationalCity, p.operationalProvince].where((s) => s.isNotEmpty).join(', ');
    Widget stat(String value, String label) => Expanded(
          child: Column(children: [
            Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textDark)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
          ]),
        );

    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 60,
            height: 60,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(16)),
            child: Text(p.businessName.isNotEmpty ? p.businessName[0].toUpperCase() : 'M',
                style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(
                  child: Text(p.businessName,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                ),
                if (p.isVerified) ...[
                  const SizedBox(width: 6),
                  const Icon(Icons.verified, size: 18, color: AppColors.accent),
                ],
              ]),
              if (p.businessCategory.isNotEmpty)
                Text(p.businessCategory, style: const TextStyle(fontSize: 12.5, color: AppColors.primary, fontWeight: FontWeight.w700)),
              if (location.isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(children: [
                  const Icon(Icons.location_on_outlined, size: 14, color: AppColors.accent),
                  const SizedBox(width: 3),
                  Expanded(child: Text(location, style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted))),
                ]),
              ],
            ]),
          ),
        ]),
        if (p.description.isNotEmpty) ...[
          const SizedBox(height: 14),
          Text(p.description, style: const TextStyle(fontSize: 13.5, color: AppColors.textMedium, height: 1.6)),
        ],
        const Divider(height: 28),
        Row(children: [
          stat(p.rating > 0 ? p.rating.toStringAsFixed(1) : '-', 'Rating'),
          stat('${p.totalTravelers}', 'Wisatawan'),
          stat('${_packages.length}', 'Paket Aktif'),
        ]),
      ]),
    );
  }
}
