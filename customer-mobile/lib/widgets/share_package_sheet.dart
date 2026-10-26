import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/deep_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/common.dart';

/// Lebar kartu bagikan; gambar dirender 3× (1080 px) seperti kartu tiket.com.
const _cardWidth = 360.0;

/// Teks yang menyertai gambar kartu, dengan tautan yang membuka aplikasi
/// (bila terpasang) atau web.
String packageShareMessage(TripPackage pkg) =>
    'Lihat detailnya di TemenTrip, yuk. Buka link-nya, deh. 👇\n${packageShareUri(pkg.id)}';

/// Lembar "Bagikan Paket": pratinjau kartu paket, lalu dibagikan sebagai
/// gambar + teks bertautan ke WhatsApp/aplikasi lain.
Future<void> showSharePackageSheet(BuildContext context, TripPackage pkg, {double? rating, int reviewCount = 0}) {
  return showDesignSheet<void>(
    context,
    title: 'Bagikan Paket',
    builder: (_) => _SharePackageBody(pkg: pkg, rating: rating ?? pkg.rating, reviewCount: reviewCount),
  );
}

class _SharePackageBody extends StatefulWidget {
  final TripPackage pkg;
  final double rating;
  final int reviewCount;

  const _SharePackageBody({required this.pkg, required this.rating, required this.reviewCount});

  @override
  State<_SharePackageBody> createState() => _SharePackageBodyState();
}

class _SharePackageBodyState extends State<_SharePackageBody> {
  final _cardKey = GlobalKey();
  bool _photosReady = false;
  bool _sharing = false;
  bool _precached = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_precached) return;
    _precached = true;
    // Foto harus sudah termuat sebelum kartu diubah menjadi gambar.
    Future.wait([for (final url in widget.pkg.photos.take(4)) precacheImage(NetworkImage(url), context)])
        .timeout(const Duration(seconds: 6), onTimeout: () => const [])
        .whenComplete(() {
      if (mounted) setState(() => _photosReady = true);
    });
  }

  Future<Uint8List?> _renderCard() async {
    try {
      final boundary = _cardKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return null;
      final image = await boundary.toImage(pixelRatio: 3);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      return data?.buffer.asUint8List();
    } catch (_) {
      // Mis. foto lintas domain tanpa CORS di web: bagikan teks saja.
      return null;
    }
  }

  Future<void> _share() async {
    setState(() => _sharing = true);
    final pkg = widget.pkg;
    try {
      final bytes = kIsWeb ? null : await _renderCard();
      final text = packageShareMessage(pkg);
      if (bytes == null) {
        await Share.share('${pkg.name}\n\n$text', subject: pkg.name);
      } else {
        await Share.shareXFiles(
          [XFile.fromData(bytes, mimeType: 'image/png', name: 'tementrip-paket-${pkg.id}.png')],
          text: text,
          subject: pkg.name,
        );
      }
    } catch (_) {
      await _copyLink();
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  Future<void> _copyLink() async {
    await Clipboard.setData(ClipboardData(text: packageShareUri(widget.pkg.id).toString()));
    if (mounted) showSnack(context, 'Link paket disalin.');
  }

  @override
  Widget build(BuildContext context) {
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Flexible(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
              boxShadow: const [BoxShadow(color: Color(0x14102A33), blurRadius: 12, offset: Offset(0, 4))],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: FittedBox(
                child: SizedBox(
                  width: _cardWidth,
                  child: RepaintBoundary(
                    key: _cardKey,
                    child: PackageShareCard(pkg: widget.pkg, rating: widget.rating, reviewCount: widget.reviewCount),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      BottomActionBar(
        child: Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _copyLink,
              icon: const Icon(Icons.link_rounded, size: 20),
              label: const Text('Salin Link'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _sharing || !_photosReady ? null : _share,
              icon: _sharing || !_photosReady
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.share_rounded, size: 20),
              label: const Text('Bagikan'),
            ),
          ),
        ]),
      ),
    ]);
  }
}

/// Kartu paket yang dibagikan sebagai gambar: kolase foto, tipe & durasi,
/// nama, rating & lokasi, harga, dan fasilitas unggulan.
class PackageShareCard extends StatelessWidget {
  final TripPackage pkg;
  final double rating;
  final int reviewCount;

  const PackageShareCard({super.key, required this.pkg, required this.rating, this.reviewCount = 0});

  @override
  Widget build(BuildContext context) {
    final photos = pkg.photos;
    final highlights = pkg.includedFacilities.take(3).toList();
    final meta = <InlineSpan>[
      if (rating > 0) ...[
        TextSpan(
            text: rating.toStringAsFixed(1).replaceAll('.', ','),
            style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textDark)),
        const TextSpan(text: '/5'),
        if (reviewCount > 0) TextSpan(text: '  ($reviewCount ulasan)'),
        if (pkg.destination.isNotEmpty) const TextSpan(text: '  •  '),
      ],
      if (pkg.destination.isNotEmpty) TextSpan(text: pkg.destination),
    ];
    return DefaultTextStyle.merge(
      style: figmaTextStyle,
      child: ColoredBox(
        color: Colors.white,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _Collage(photos: photos),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.accentLight, borderRadius: BorderRadius.circular(4)),
                  child: Text(pkg.tripType.isEmpty ? 'Open Trip' : pkg.tripType,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.primaryDark)),
                ),
                const SizedBox(width: 8),
                Text(durationLabel(pkg.durationDays), style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ]),
              const SizedBox(height: 10),
              Text(pkg.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 19, height: 1.35, fontWeight: FontWeight.w600, color: AppColors.textDark)),
              if (meta.isNotEmpty) ...[
                const SizedBox(height: 6),
                Row(children: [
                  if (rating > 0) ...[
                    const Icon(Icons.star_rounded, size: 16, color: AppColors.star),
                    const SizedBox(width: 4),
                  ] else ...[
                    const Icon(Icons.location_on_outlined, size: 15, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                  ],
                  Expanded(
                    child: Text.rich(TextSpan(children: meta),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                  ),
                ]),
              ],
              const SizedBox(height: 10),
              Text.rich(TextSpan(
                text: 'Mulai dari ',
                style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                children: [
                  TextSpan(
                      text: formatPrice(pkg.price),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
                  TextSpan(text: pkg.isPerUnit ? ' /${pkg.unitLabel}' : ' /orang'),
                ],
              )),
            ]),
          ),
          if (highlights.isNotEmpty) ...[
            Container(height: 6, margin: const EdgeInsets.only(top: 12), color: AppColors.divider),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Highlight', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                const SizedBox(height: 10),
                for (final h in highlights)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(children: [
                      Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(color: AppColors.successBg, borderRadius: BorderRadius.circular(6)),
                        child: const Icon(Icons.check_rounded, size: 15, color: AppColors.successDark),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(h,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, color: AppColors.textMedium)),
                      ),
                    ]),
                  ),
              ]),
            ),
          ],
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Row(children: [
              Image.asset('assets/images/tementrip_mark.png', height: 18),
              const SizedBox(width: 6),
              const Text('TemenTrip', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
              const Spacer(),
              const Text('Travel Together', style: TextStyle(fontSize: 11, color: AppColors.textLight)),
            ]),
          ),
        ]),
      ),
    );
  }
}

/// Foto utama + hingga tiga foto kecil; foto kecil terakhir menampilkan
/// "+N foto lainnya".
class _Collage extends StatelessWidget {
  final List<String> photos;

  const _Collage({required this.photos});

  @override
  Widget build(BuildContext context) {
    if (photos.isEmpty) return const NetworkPhoto('', height: 200);
    final thumbs = photos.skip(1).take(3).toList();
    final extra = photos.length - 1 - thumbs.length;
    return Column(children: [
      NetworkPhoto(photos.first, height: 200, width: _cardWidth),
      if (thumbs.isNotEmpty) ...[
        const SizedBox(height: 2),
        SizedBox(
          height: 96,
          child: Row(children: [
            for (var i = 0; i < thumbs.length; i++) ...[
              if (i > 0) const SizedBox(width: 2),
              Expanded(
                child: Stack(fit: StackFit.expand, children: [
                  NetworkPhoto(thumbs[i]),
                  if (i == thumbs.length - 1 && extra > 0)
                    ColoredBox(
                      color: const Color(0x8C000000),
                      child: Center(
                        child: Text('+$extra foto lainnya',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                      ),
                    ),
                ]),
              ),
            ],
          ]),
        ),
      ],
    ]);
  }
}
