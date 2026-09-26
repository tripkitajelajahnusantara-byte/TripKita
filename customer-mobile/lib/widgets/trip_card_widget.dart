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
  return '${pkg.tripType} • Min ${pkg.quotaMin} Orang';
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
      '💰 Harga: ${formatIDR(pkg.price)} / orang'
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
  final double fontSize;

  const _HighlightPill(this.text, this.color, this.background, {this.fontSize = 10});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(5)),
      child: Text(text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w600, color: color)),
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
                          child: Text(formatIDR(pkg.price),
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

/// Kartu paket memanjang pada halaman Cari Trip (`search-card-item` di web,
/// tampilan satu kolom pada layar kecil).
class TripListCard extends StatelessWidget {
  final TripPackage pkg;
  final VoidCallback onTap;

  const TripListCard({super.key, required this.pkg, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final seats = pkg.availableSeats;
    return SectionCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: onTap,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                height: 180,
                width: double.infinity,
                child: Stack(fit: StackFit.expand, children: [
                  NetworkPhoto(coverImageFor(pkg)),
                  Positioned(top: 10, right: 10, child: FavoriteButton(pkg)),
                ]),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(6)),
                  child: Text(
                    pkg.tripType.isNotEmpty ? '${pkg.tripType} • ${pkg.category}' : pkg.category,
                    maxLines: 2,
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Mulai dari', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  Text.rich(TextSpan(children: [
                    TextSpan(
                        text: formatIDR(pkg.price),
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.accent)),
                    const TextSpan(text: ' / orang', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  ])),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(pkg.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textDark)),
          const SizedBox(height: 4),
          Row(children: [
            const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textLight),
            const SizedBox(width: 4),
            Expanded(child: Text(pkg.destination, style: const TextStyle(fontSize: 13, color: AppColors.textMuted))),
          ]),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final hl in highlightsFor(pkg).take(3))
                _HighlightPill(hl, AppColors.primary, AppColors.accentLight, fontSize: 11),
            ],
          ),
          if (pkg.description.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(pkg.description,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, color: AppColors.textMuted, height: 1.4)),
          ],
          if (pkg.schedule.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.textLight),
              const SizedBox(width: 6),
              Expanded(
                child: Text.rich(TextSpan(
                  text: 'Jadwal tersedia: ',
                  style: const TextStyle(fontSize: 13, color: AppColors.textMedium),
                  children: [TextSpan(text: pkg.schedule, style: const TextStyle(fontWeight: FontWeight.w700))],
                )),
              ),
            ]),
          ],
          const Divider(height: 24),
          Row(children: [
            const Icon(Icons.star, size: 15, color: AppColors.warning),
            const SizedBox(width: 3),
            Text(ratingLabel(pkg), style: const TextStyle(color: AppColors.warning, fontWeight: FontWeight.w700, fontSize: 13)),
            const SizedBox(width: 8),
            const Text('|', style: TextStyle(color: AppColors.borderStrong)),
            const SizedBox(width: 8),
            Text('Sisa $seats seat',
                style: TextStyle(
                  color: seats < 5 ? AppColors.danger : AppColors.success,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                )),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  backgroundColor: AppColors.divider,
                  foregroundColor: AppColors.textBody,
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () => showSharePackageSheet(context, pkg),
                icon: const Icon(Icons.share_outlined, size: 16),
                label: const Text('Bagikan'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary, width: 1.5),
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: onTap,
                child: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text('Lihat Detail'),
                  SizedBox(width: 4),
                  Icon(Icons.chevron_right, size: 18),
                ]),
              ),
            ),
          ]),
        ],
      ),
    );
  }
}
