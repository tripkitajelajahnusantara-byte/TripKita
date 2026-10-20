import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:customer_mobile/config/app_config.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/services/wishlist_store.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/common.dart';

/// Warna badge & highlight per bagian beranda, sama dengan web.
class TripCardTone {
  final Color badge;
  final Color pillText;
  final Color pillBg;

  const TripCardTone(this.badge, this.pillText, this.pillBg);

  static const openTrip = TripCardTone(AppColors.accent, AppColors.primary, AppColors.accentLight);

  static TripCardTone forPackage(TripPackage pkg) {
    switch (pkg.tripType) {
      case 'Honeymoon':
        return const TripCardTone(AppColors.honeymoon, Color(0xFFBE123C), Color(0xFFFFE4E6));
      case 'Private Trip':
        return const TripCardTone(AppColors.primary, AppColors.primary, AppColors.accentLight);
      case 'Corporate':
        return const TripCardTone(AppColors.corporate, Color(0xFF047857), Color(0xFFD1FAE5));
      case 'Family':
        return const TripCardTone(AppColors.family, Color(0xFFB45309), Color(0xFFFEF3C7));
      default:
        return openTrip;
    }
  }
}

String tripBadgeLabel(TripPackage pkg) {
  if (pkg.isOpenTrip) return pkg.tripType.isNotEmpty ? '${pkg.tripType} • ${pkg.category}' : pkg.category;
  return '${pkg.tripType} • Min ${pkg.minRequiredGuests} Orang';
}

String ratingLabel(TripPackage pkg) => pkg.rating > 0 ? pkg.rating.toStringAsFixed(1) : 'Baru';

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _RoundIconButton({required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.95),
      shape: const CircleBorder(),
      elevation: 2,
      shadowColor: Colors.black26,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(width: 32, height: 32, child: Icon(icon, size: 16, color: color)),
      ),
    );
  }
}

class FavoriteButton extends StatelessWidget {
  final TripPackage pkg;

  const FavoriteButton(this.pkg, {super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: WishlistStore.instance,
      builder: (context, _) {
        final active = WishlistStore.instance.contains(pkg.id);
        return _RoundIconButton(
          icon: active ? Icons.favorite : Icons.favorite_border,
          color: active ? AppColors.danger : AppColors.textMuted,
          onTap: () => WishlistStore.instance.toggle(pkg, syncToAccount: AuthSession.instance.isLoggedIn),
        );
      },
    );
  }
}

class ShareButton extends StatelessWidget {
  final TripPackage pkg;

  const ShareButton(this.pkg, {super.key});

  @override
  Widget build(BuildContext context) {
    return _RoundIconButton(icon: Icons.share_outlined, color: AppColors.textBody, onTap: () => showSharePackageSheet(context, pkg));
  }
}

/// Lembar "Bagikan Paket", padanan `ShareModal` web.
Future<void> showSharePackageSheet(BuildContext context, TripPackage pkg) {
  final link = AppConfig.webBaseUrl.isEmpty ? '' : '${AppConfig.webBaseUrl}/#/paket-detail?id=${pkg.id}';
  final message = 'Halo! Cek paket wisata "${pkg.name}" di TripKita!\n\n'
      '📍 Destinasi: ${pkg.destination.isEmpty ? 'Indonesia' : pkg.destination}\n'
      '💰 Harga: ${formatIDR(pkg.price)} ${pkg.priceUnitLabel}'
      '${link.isEmpty ? '' : '\n\nLihat detail paket selengkapnya di sini:\n$link'}';

  return showModalBottomSheet<void>(
    context: context,
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Bagikan Paket', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(pkg.name, style: const TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.whatsapp),
              onPressed: () {
                Navigator.pop(sheetContext);
                openExternal(Uri.parse('https://wa.me/?text=${Uri.encodeComponent(message)}'));
              },
              icon: const Icon(Icons.chat_outlined),
              label: const Text('Bagikan ke WhatsApp'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: message));
                if (sheetContext.mounted) {
                  Navigator.pop(sheetContext);
                  showSnack(context, 'Info paket berhasil disalin.');
                }
              },
              icon: const Icon(Icons.copy_outlined),
              label: const Text('Salin Info Paket'),
            ),
          ],
        ),
      ),
    ),
  );
}

class _HighlightPill extends StatelessWidget {
  final String text;
  final Color color;
  final Color background;

  const _HighlightPill(this.text, this.color, this.background);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(5)),
      child: Text(text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
    );
  }
}

/// Kartu paket ringkas untuk grid 2 kolom di beranda. Tinggi setiap bagian
/// dibuat tetap supaya kartu dalam satu baris selalu sama tinggi.
class TripGridCard extends StatelessWidget {
  final TripPackage pkg;
  final VoidCallback onTap;

  const TripGridCard({super.key, required this.pkg, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final tone = TripCardTone.forPackage(pkg);
    final highlights = highlightsFor(pkg).take(2).toList();
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: 4 / 3,
                child: Stack(fit: StackFit.expand, children: [
                  NetworkPhoto(coverImageFor(pkg)),
                  Positioned(top: 8, right: 8, child: FavoriteButton(pkg)),
                  Positioned(
                    left: 8,
                    bottom: 8,
                    right: 8,
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(color: tone.badge, borderRadius: BorderRadius.circular(6)),
                        child: Text(pkg.tripType.isEmpty ? 'Open Trip' : pkg.tripType,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      height: 34,
                      child: Text(pkg.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDark, height: 1.3)),
                    ),
                    const SizedBox(height: 4),
                    Row(children: [
                      const Icon(Icons.location_on_outlined, size: 12, color: AppColors.textLight),
                      const SizedBox(width: 3),
                      Expanded(
                        child: Text(pkg.destination,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      ),
                    ]),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 50,
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        for (var i = 0; i < highlights.length; i++) ...[
                          if (i > 0) const SizedBox(height: 4),
                          _HighlightPill(highlights[i], tone.pillText, tone.pillBg),
                        ],
                      ]),
                    ),
                    const Divider(height: 12),
                    Row(children: [
                      Expanded(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Text('${formatIDR(pkg.price)}${pkg.isPerUnit ? ' ${pkg.priceUnitLabel}' : ''}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.accent)),
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.star, size: 12, color: AppColors.warning),
                      const SizedBox(width: 2),
                      Text(ratingLabel(pkg),
                          style: const TextStyle(fontSize: 11, color: AppColors.warning, fontWeight: FontWeight.w700)),
                    ]),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---- Kartu desain Figma "Temen Trip" (beranda & Cari Trip) ----

const _cardShadow = [
  BoxShadow(color: Color(0x1A0A0D12), offset: Offset(0, 1), blurRadius: 3),
  BoxShadow(color: Color(0x1A0A0D12), offset: Offset(0, 1), blurRadius: 2, spreadRadius: -1),
];

/// Bingkai kartu paket: putih, border Neutral/200, sudut 12, bayangan kecil.
class _TripCardFrame extends StatelessWidget {
  final VoidCallback onTap;
  final Widget child;

  const _TripCardFrame({required this.onTap, required this.child});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), boxShadow: _cardShadow),
      child: Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(onTap: onTap, child: DefaultTextStyle.merge(style: figmaTextStyle, child: child)),
      ),
    );
  }
}

/// Label kategori biru di kiri atas foto.
class _CategoryLabel extends StatelessWidget {
  final String text;

  const _CategoryLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 21.37,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: AppColors.brand,
        borderRadius: BorderRadius.horizontal(right: Radius.circular(9999)),
      ),
      child: Text(text,
          style: const TextStyle(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w500, color: Colors.white)),
    );
  }
}

/// Badge putih di kiri bawah foto: "Baru" atau rating paket.
class _RatingBadge extends StatelessWidget {
  final TripPackage pkg;
  final bool large;

  const _RatingBadge(this.pkg, {this.large = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: large ? 8 : 6, vertical: large ? 3 : 2),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(pkg.rating > 0 ? '★ ${ratingLabel(pkg)}' : 'Baru',
          style: TextStyle(
            fontSize: large ? 14 : 12,
            height: large ? 20 / 14 : 18 / 12,
            fontWeight: FontWeight.w500,
            color: AppColors.textMedium,
          )),
    );
  }
}

/// Ikon hati favorit di kanan atas foto.
class _FavoriteHeart extends StatelessWidget {
  final TripPackage pkg;
  final double size;

  const _FavoriteHeart(this.pkg, {required this.size});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: WishlistStore.instance,
      builder: (context, _) {
        final active = WishlistStore.instance.contains(pkg.id);
        return Semantics(
          button: true,
          label: active ? 'Hapus dari favorit' : 'Tambah ke favorit',
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => WishlistStore.instance.toggle(pkg, syncToAccount: AuthSession.instance.isLoggedIn),
            child: AppIcon(active ? 'heart_active' : 'heart', size: size),
          ),
        );
      },
    );
  }
}

/// Isi teks kartu: tipe & durasi, nama, lokasi, dan fasilitas.
class _TripSummary extends StatelessWidget {
  final TripPackage pkg;

  /// Tinggi tetap judul (3 baris) & fasilitas (2 baris) agar kartu sejajar di
  /// daftar mendatar.
  final bool fixedHeight;

  const _TripSummary(this.pkg, {required this.fixedHeight});

  @override
  Widget build(BuildContext context) {
    final facilities = pkg.includedFacilities.take(3).toList();
    final title = Text(pkg.name,
        maxLines: 3,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 18, height: 26 / 18, fontWeight: FontWeight.w600, color: AppColors.heading));
    final facilityText = Text.rich(
      TextSpan(children: [
        for (var i = 0; i < facilities.length; i++) ...[
          if (i > 0)
            const TextSpan(text: ' • ', style: TextStyle(fontSize: 14, height: 18 / 14, color: AppColors.borderStrong)),
          TextSpan(text: facilities[i]),
        ],
      ]),
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
      style: const TextStyle(fontSize: 12, height: 18 / 12, color: AppColors.textLight),
    );
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('${pkg.tripType.isEmpty ? 'Open Trip' : pkg.tripType} • ${pkg.durationDays} hari',
          style: const TextStyle(fontSize: 12, height: 18 / 12, fontWeight: FontWeight.w500, color: AppColors.textMuted)),
      const SizedBox(height: 2),
      fixedHeight ? SizedBox(height: 78, child: title) : title,
      Row(children: [
        const AppIcon('map_pin', size: 14),
        const SizedBox(width: 4),
        Expanded(
          child: Text(pkg.destination,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMedium)),
        ),
      ]),
      if (fixedHeight) ...[
        const SizedBox(height: 8),
        SizedBox(height: 36, child: facilityText),
      ] else if (facilities.isNotEmpty) ...[
        const SizedBox(height: 8),
        facilityText,
      ],
    ]);
  }
}

/// Harga "mulai dari ... / orang" rata kanan.
class _PriceTag extends StatelessWidget {
  final TripPackage pkg;

  const _PriceTag(this.pkg);

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
      const Text('mulai dari',
          textAlign: TextAlign.right,
          style: TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textLight)),
      Text.rich(
        TextSpan(children: [
          TextSpan(
              text: formatPrice(pkg.price),
              style: const TextStyle(fontSize: 20, height: 24 / 20, fontWeight: FontWeight.w700, color: AppColors.brand)),
          TextSpan(
              text: ' ${pkg.priceUnitLabel}', style: const TextStyle(fontSize: 14, height: 24 / 14, color: AppColors.textLight)),
        ]),
        textAlign: TextAlign.right,
      ),
    ]);
  }
}

/// Kartu "Trip Populer" selebar 242 pada daftar mendatar beranda.
class TripPopularCard extends StatelessWidget {
  final TripPackage pkg;
  final VoidCallback onTap;

  const TripPopularCard({super.key, required this.pkg, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 242,
      child: _TripCardFrame(
        onTap: onTap,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          SizedBox(
            height: 136,
            child: Stack(fit: StackFit.expand, children: [
              NetworkPhoto(coverImageFor(pkg)),
              if (pkg.category.isNotEmpty) Positioned(left: 0, top: 12, child: _CategoryLabel(pkg.category)),
              Positioned(right: 12, top: 12, child: _FavoriteHeart(pkg, size: 20)),
              Positioned(left: 12, bottom: 12, child: _RatingBadge(pkg)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              _TripSummary(pkg, fixedHeight: true),
              const SizedBox(height: 8),
              _PriceTag(pkg),
            ]),
          ),
        ]),
      ),
    );
  }
}

/// Kartu paket satu kolom pada halaman Cari Trip.
class TripListCard extends StatelessWidget {
  final TripPackage pkg;
  final VoidCallback onTap;

  const TripListCard({super.key, required this.pkg, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final dateLabel = tripDateLabel(pkg);
    final seats = pkg.availableSeats;
    final lowQuota = pkg.quotaMax > 0 && seats > 0 && seats <= 5;
    return _TripCardFrame(
      onTap: onTap,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SizedBox(
          height: 185,
          child: _PhotoCarousel(pkg),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _TripSummary(pkg, fixedHeight: false),
            if (dateLabel != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: AppColors.divider, borderRadius: BorderRadius.circular(6)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const AppIcon('calendar_blank', size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(dateLabel, style: const TextStyle(fontSize: 12, height: 18 / 12, color: AppColors.textMedium)),
                ]),
              ),
            ],
            const SizedBox(height: 8),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(
                child: lowQuota
                    ? Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text('$seats kuota tersisa',
                            style: const TextStyle(
                                fontSize: 14,
                                height: 20 / 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.errorStrong)),
                      )
                    : const SizedBox.shrink(),
              ),
              _PriceTag(pkg),
            ]),
          ]),
        ),
      ]),
    );
  }
}

/// Foto paket yang bisa digeser, dengan label, favorit, badge, dan titik
/// penanda halaman.
class _PhotoCarousel extends StatefulWidget {
  final TripPackage pkg;

  const _PhotoCarousel(this.pkg);

  @override
  State<_PhotoCarousel> createState() => _PhotoCarouselState();
}

class _PhotoCarouselState extends State<_PhotoCarousel> {
  int _page = 0;

  @override
  Widget build(BuildContext context) {
    final pkg = widget.pkg;
    final photos = pkg.photos;
    return Stack(fit: StackFit.expand, children: [
      photos.length > 1
          ? PageView.builder(
              itemCount: photos.length,
              onPageChanged: (i) => setState(() => _page = i),
              itemBuilder: (_, i) => NetworkPhoto(photos[i]),
            )
          : NetworkPhoto(coverImageFor(pkg)),
      if (pkg.category.isNotEmpty) Positioned(left: 0, top: 12, child: _CategoryLabel(pkg.category)),
      Positioned(right: 12, top: 12, child: _FavoriteHeart(pkg, size: 24)),
      Positioned(left: 12, bottom: 12, child: _RatingBadge(pkg, large: true)),
      if (photos.length > 1)
        Positioned(
          left: 0,
          right: 0,
          bottom: 12,
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var i = 0; i < photos.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: i == _page ? 12 : 4,
                height: 4,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color: i == _page ? AppColors.brandDeep : AppColors.borderStrong,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
          ]),
        ),
    ]);
  }
}
