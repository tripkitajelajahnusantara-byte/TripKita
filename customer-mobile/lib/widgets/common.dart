import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';

/// Kartu putih ber-border yang menjadi blok dasar halaman web customer.
class SectionCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final Color borderColor;
  final double radius;

  const SectionCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.color = Colors.white,
    this.borderColor = AppColors.border,
    this.radius = 16,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor),
        boxShadow: const [
          BoxShadow(
              color: Color(0x05000000), blurRadius: 6, offset: Offset(0, 2))
        ],
      ),
      child: child,
    );
  }
}

class SectionHeading extends StatelessWidget {
  final String text;
  final IconData? icon;
  final Color iconColor;
  final Widget? trailing;

  const SectionHeading(this.text,
      {super.key, this.icon, this.iconColor = AppColors.accent, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 18, color: iconColor),
          const SizedBox(width: 8)
        ],
        Expanded(
          child: Text(text,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textDark)),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}

/// Label form bergaya web: tebal abu-abu dengan tanda wajib merah.
class FieldLabel extends StatelessWidget {
  final String text;
  final bool required;
  final String? hint;

  const FieldLabel(this.text, {super.key, this.required = false, this.hint});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Text.rich(
        TextSpan(
          text: text,
          style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textMedium),
          children: [
            if (required)
              const TextSpan(
                  text: ' *', style: TextStyle(color: AppColors.danger)),
            if (hint != null)
              TextSpan(
                text: ' $hint',
                style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textMuted),
              ),
          ],
        ),
      ),
    );
  }
}

class ErrorText extends StatelessWidget {
  final String? message;

  const ErrorText(this.message, {super.key});

  @override
  Widget build(BuildContext context) {
    if (message == null || message!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, size: 14, color: AppColors.danger),
          const SizedBox(width: 4),
          Expanded(
            child: Text(message!,
                style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.danger)),
          ),
        ],
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final Color color;
  final IconData? icon;

  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.color = AppColors.accent,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(backgroundColor: color),
        onPressed: loading ? null : onPressed,
        child: loading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2.4, color: Colors.white))
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18),
                    const SizedBox(width: 8)
                  ],
                  Flexible(child: Text(label, textAlign: TextAlign.center)),
                ],
              ),
      ),
    );
  }
}

class StatusStyle {
  final String label;
  final Color color;
  final Color background;
  final IconData icon;

  const StatusStyle(this.label, this.color, this.background, this.icon);
}

/// Label dan warna status pesanan, sama dengan `getStatusBadge` di web.
StatusStyle bookingStatusStyle(String status) {
  switch (status) {
    case BookingStatus.completed:
      return const StatusStyle('Trip Selesai (Completed)', AppColors.success,
          AppColors.successBg, Icons.check_circle_outline);
    case BookingStatus.paid:
    case BookingStatus.confirmed:
      return const StatusStyle('Lunas & Aktif', AppColors.success,
          AppColors.successBg, Icons.check_circle_outline);
    case BookingStatus.expired:
      return const StatusStyle('Kadaluwarsa (Batas Waktu Habis)',
          AppColors.danger, AppColors.dangerBg, Icons.cancel_outlined);
    case BookingStatus.pendingPayment:
      return const StatusStyle('Menunggu Pembayaran', AppColors.warning,
          AppColors.warningBg, Icons.schedule);
    case BookingStatus.paymentReview:
      return const StatusStyle('Menunggu Konfirmasi Admin', AppColors.info,
          AppColors.infoBg, Icons.verified_user_outlined);
    case BookingStatus.rescheduleOffered:
      return const StatusStyle('Menunggu Jawaban Anda (Jadwal Pengganti)',
          AppColors.warningDark, AppColors.warningBg, Icons.error_outline);
    case BookingStatus.refundRequired:
      return const StatusStyle('Proses Refund', AppColors.info,
          AppColors.infoBg, Icons.error_outline);
    case BookingStatus.refunded:
      return const StatusStyle('Dana Dikembalikan', AppColors.info,
          AppColors.infoBg, Icons.check_circle_outline);
    case BookingStatus.cancelledByCustomer:
    case 'CANCELLED':
      return const StatusStyle('Pesanan Dibatalkan', AppColors.danger,
          AppColors.dangerBg, Icons.cancel_outlined);
    default:
      return const StatusStyle('Dibatalkan', AppColors.danger,
          AppColors.dangerBg, Icons.cancel_outlined);
  }
}

class StatusBadge extends StatelessWidget {
  final StatusStyle style;

  const StatusBadge(this.style, {super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
          color: style.background, borderRadius: BorderRadius.circular(30)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(style.icon, size: 13, color: style.color),
          const SizedBox(width: 4),
          Flexible(
            child: Text(style.label,
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: style.color),
                overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}

/// Kotak peringatan/informasi berwarna.
class InfoBanner extends StatelessWidget {
  final String? title;
  final String? message;
  final Widget? child;
  final IconData? icon;
  final Color color;
  final Color background;
  final Color border;
  final Color textColor;

  const InfoBanner({
    super.key,
    this.title,
    this.message,
    this.child,
    this.icon,
    this.color = AppColors.warningDark,
    this.background = AppColors.warningBg,
    this.border = AppColors.warningBorder,
    this.textColor = AppColors.warningText,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null) ...[
            Padding(
                padding: const EdgeInsets.only(top: 1),
                child: Icon(icon, size: 16, color: color)),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(title!,
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: color)),
                  ),
                if (message != null)
                  Text(message!,
                      style: TextStyle(fontSize: 12, color: textColor, height: 1.45)),
                if (child != null) child!,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Baris rincian harga trip: harga dasar (per orang atau per unit) diikuti
/// layanan tambahan terpilih. Dipakai detail paket, form, dan konfirmasi.
class TripPriceRows extends StatelessWidget {
  final TripPackage package;
  final int guests;
  final List<AddOn> addOns;

  const TripPriceRows(
      {super.key,
      required this.package,
      required this.guests,
      this.addOns = const []});

  @override
  Widget build(BuildContext context) {
    final units = package.unitsFor(guests);
    final base = package.basePrice(guests);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      PriceRow(
          units > 0
              ? '$units ${package.unitLabel} × ${formatPrice(package.price)}'
              : 'Harga (Paket ${guests}x)',
          formatPrice(base)),
      if (units > 0 && guests > 0)
        Text('≈ ${formatPrice((base / guests).round())}/orang untuk $guests peserta',
            style: const TextStyle(fontSize: 12, color: AppColors.textLight)),
      for (final a in addOns)
        PriceRow(
            a.perPerson ? '${a.name} (${guests}x)' : a.name,
            '+${formatPrice(a.subtotalFor(guests))}'),
    ]);
  }
}

class PriceRow extends StatelessWidget {
  final String label;
  final String value;
  final Color labelColor;
  final Color valueColor;
  final bool emphasize;

  const PriceRow(
    this.label,
    this.value, {
    super.key,
    this.labelColor = AppColors.textMedium,
    this.valueColor = AppColors.textDark,
    this.emphasize = false,
  });

  @override
  Widget build(BuildContext context) {
    final size = emphasize ? 16.0 : 14.0;
    final weight = emphasize ? FontWeight.w600 : FontWeight.w400;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(label,
                style: TextStyle(
                  fontSize: size,
                  color: emphasize ? AppColors.textDark : labelColor,
                  fontWeight: weight,
                )),
          ),
          const SizedBox(width: 12),
          Text(value,
              style: TextStyle(
                fontSize: size,
                color: valueColor,
                fontWeight: emphasize ? FontWeight.w600 : FontWeight.w500,
              )),
        ],
      ),
    );
  }
}

class NetworkPhoto extends StatelessWidget {
  final String url;
  final double? height;
  final double? width;
  final BoxFit fit;

  const NetworkPhoto(this.url,
      {super.key, this.height, this.width, this.fit = BoxFit.cover});

  @override
  Widget build(BuildContext context) {
    // Tanpa foto dari mitra, tampilkan placeholder alih-alih foto stok yang
    // bisa dikira foto asli destinasi.
    if (url.isEmpty) return _PhotoPlaceholder(height: height, width: width);
    return Image.network(
      url,
      height: height,
      width: width,
      fit: fit,
      errorBuilder: (_, __, ___) =>
          _PhotoPlaceholder(height: height, width: width),
      loadingBuilder: (context, child, progress) => progress == null
          ? child
          : Container(height: height, width: width, color: AppColors.divider),
    );
  }
}

class _PhotoPlaceholder extends StatelessWidget {
  final double? height;
  final double? width;

  const _PhotoPlaceholder({this.height, this.width});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.accentLight, AppColors.accentSoft],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: LayoutBuilder(builder: (context, c) {
        final compact = c.maxHeight < 110;
        return Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.landscape_outlined,
              size: compact ? 26 : 40,
              color: AppColors.primary.withValues(alpha: 0.55)),
          if (!compact) ...[
            const SizedBox(height: 6),
            Text('Foto belum tersedia',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary.withValues(alpha: 0.7))),
          ],
        ]);
      }),
    );
  }
}

class LoadingView extends StatelessWidget {
  final String message;

  const LoadingView(this.message, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 60),
      child: Column(
        children: [
          const CircularProgressIndicator(color: AppColors.accent),
          const SizedBox(height: 14),
          Text(message,
              style: const TextStyle(color: AppColors.textMuted),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final List<Widget> actions;

  const EmptyState(
      {super.key,
      required this.icon,
      required this.title,
      required this.message,
      this.actions = const []});

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
      child: Column(
        children: [
          Icon(icon, size: 44, color: AppColors.accent),
          const SizedBox(height: 12),
          Text(title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textDark)),
          const SizedBox(height: 6),
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 13.5, color: AppColors.textMuted, height: 1.5)),
          if (actions.isNotEmpty) ...[
            const SizedBox(height: 18),
            Wrap(
                spacing: 10,
                runSpacing: 10,
                alignment: WrapAlignment.center,
                children: actions),
          ],
        ],
      ),
    );
  }
}

/// Dialog pemberitahuan dengan satu tombol "OK, Mengerti".
Future<void> showNoticeDialog(BuildContext context,
    {required String title, required String message, bool isError = false}) {
  return showDialog<void>(
    context: context,
    builder: (context) => _CenteredDialog(
      icon: isError ? Icons.error_outline : Icons.check_circle_outline,
      iconColor: isError ? AppColors.danger : AppColors.successDark,
      iconBackground: isError ? AppColors.dangerBg : AppColors.successBg,
      title: title,
      message: Text(message,
          textAlign: TextAlign.center,
          style: const TextStyle(
              fontSize: 14, color: AppColors.textMuted, height: 1.6)),
      actions: [
        Expanded(
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor:
                    isError ? AppColors.danger : AppColors.primary),
            onPressed: () => Navigator.pop(context),
            child: const Text('OK, Mengerti'),
          ),
        ),
      ],
    ),
  );
}

/// Dialog Ya/Tidak bergaya modal web. Mengembalikan true bila dikonfirmasi.
Future<bool> showConfirmDialog(
  BuildContext context, {
  required IconData icon,
  required Color iconColor,
  required Color iconBackground,
  required String title,
  required Widget message,
  required String cancelLabel,
  required String confirmLabel,
  Color confirmColor = AppColors.primary,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => _CenteredDialog(
      icon: icon,
      iconColor: iconColor,
      iconBackground: iconBackground,
      title: title,
      message: message,
      actions: [
        Expanded(
          child: OutlinedButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(cancelLabel, textAlign: TextAlign.center)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: confirmColor),
            onPressed: () => Navigator.pop(context, true),
            child: Text(confirmLabel, textAlign: TextAlign.center),
          ),
        ),
      ],
    ),
  );
  return result ?? false;
}

class _CenteredDialog extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBackground;
  final String title;
  final Widget message;
  final List<Widget> actions;

  const _CenteredDialog({
    required this.icon,
    required this.iconColor,
    required this.iconBackground,
    required this.title,
    required this.message,
    required this.actions,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(20),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration:
                  BoxDecoration(color: iconBackground, shape: BoxShape.circle),
              child: Icon(icon, size: 30, color: iconColor),
            ),
            const SizedBox(height: 16),
            Text(title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textDark)),
            const SizedBox(height: 10),
            message,
            const SizedBox(height: 22),
            Row(children: actions),
          ],
        ),
      ),
    );
  }
}

/// Notifikasi Figma di atas layar: kotak gelap 48 radius 8, teks 14 putih,
/// hilang sendiri setelah 3 detik.
void showTopToast(BuildContext context, String message) {
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  if (overlay == null) return;
  late final OverlayEntry entry;
  entry = OverlayEntry(
    builder: (context) => Positioned(
      left: 16,
      right: 16,
      top: MediaQuery.paddingOf(context).top + 12,
      child: IgnorePointer(
        child: Material(
          color: AppColors.sheetTitle,
          borderRadius: BorderRadius.circular(8),
          elevation: 6,
          shadowColor: const Color(0x660F172A),
          child: Container(
            constraints: const BoxConstraints(minHeight: 48),
            alignment: Alignment.centerLeft,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text(message,
                style: const TextStyle(
                    fontSize: 14, height: 20 / 14, letterSpacing: 0, fontWeight: FontWeight.w500, color: Colors.white)),
          ),
        ),
      ),
    ),
  );
  overlay.insert(entry);
  Future<void>.delayed(const Duration(seconds: 3), () {
    if (entry.mounted) entry.remove();
  });
}

void showSnack(BuildContext context, String message, {bool isError = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: isError ? AppColors.dangerDark : AppColors.textDark,
    ));
}

/// Gaya teks dasar desain Figma: tanpa tracking dan tinggi baris "auto"
/// Roboto, menggantikan bawaan Material 3 (tracking 0.25, tinggi 1.43).
const figmaTextStyle = TextStyle(letterSpacing: 0, height: 1.17);

/// Ikon SVG dari desain Figma (`assets/icons/<name>.svg`). Tanpa [color],
/// warna bawaan SVG yang dipakai.
class AppIcon extends StatelessWidget {
  final String name;
  final double size;

  /// Tinggi bila ikon tidak persegi; bawaannya sama dengan [size].
  final double? height;
  final Color? color;

  const AppIcon(this.name, {super.key, this.size = 24, this.height, this.color});

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/icons/$name.svg',
      width: size,
      height: height ?? size,
      colorFilter: color == null ? null : ColorFilter.mode(color!, BlendMode.srcIn),
    );
  }
}

/// Potongan gambar seperti layer Figma yang di-crop: gambar selebar
/// `width * widthFactor` digeser `left`/`top` (pecahan ukuran bingkai).
class CroppedAsset extends StatelessWidget {
  final String asset;
  final double width;
  final double height;
  final double left;
  final double top;
  final double widthFactor;
  final double heightFactor;

  const CroppedAsset(
    this.asset, {
    super.key,
    required this.width,
    required this.height,
    required this.left,
    required this.top,
    required this.widthFactor,
    required this.heightFactor,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: Stack(clipBehavior: Clip.hardEdge, children: [
        Positioned(
          left: left * width,
          top: top * height,
          width: widthFactor * width,
          height: heightFactor * height,
          child: Image.asset(asset, fit: BoxFit.fill),
        ),
      ]),
    );
  }
}

/// Tombol utama berbentuk pil setinggi 44 (komponen "Buttons" Figma).
class BrandButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;

  const BrandButton({super.key, required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      decoration: const ShapeDecoration(
        color: AppColors.brand,
        shape: StadiumBorder(side: BorderSide(color: Color(0x1FFFFFFF), width: 2)),
        shadows: [BoxShadow(color: Color(0x0D0A0D12), offset: Offset(0, 1), blurRadius: 2)],
      ),
      foregroundDecoration: const ShapeDecoration(
        shape: StadiumBorder(side: BorderSide(color: Color(0x2E0A0D12))),
      ),
      child: Material(
        type: MaterialType.transparency,
        shape: const StadiumBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onPressed,
          child: Center(
            child: Text(label,
                style: const TextStyle(
                    fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: Colors.white)),
          ),
        ),
      ),
    );
  }
}

/// Chip filter setinggi 28 (komponen "Badge" Figma).
class BadgeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Widget? leading;
  final Widget? trailing;

  const BadgeChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.leading,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final shape = StadiumBorder(
        side: BorderSide(color: selected ? const Color(0xFFC0ECEC) : AppColors.border, width: 0.875));
    return DecoratedBox(
      decoration: const ShapeDecoration(
        shape: StadiumBorder(),
        shadows: [BoxShadow(color: Color(0x0D0A0D12), offset: Offset(0, 0.875), blurRadius: 0.875)],
      ),
      child: Material(
        color: selected ? AppColors.accentSoft : Colors.white,
        shape: shape,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            height: 28,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (leading != null) ...[leading!, const SizedBox(width: 4)],
              Text(label,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    fontWeight: FontWeight.w500,
                    color: selected ? AppColors.primaryDark : AppColors.textBody,
                  )),
              if (trailing != null) ...[const SizedBox(width: 4), trailing!],
            ]),
          ),
        ),
      ),
    );
  }
}

/// Lembar bawah bergaya Figma: pegangan, judul (dengan tombol tutup X
/// opsional), isi yang dapat digulir, dan [footer] tetap di bawah.
Future<T?> showDesignSheet<T>(
  BuildContext context, {
  required String title,
  required WidgetBuilder builder,
  String? subtitle,
  bool showClose = true,
  WidgetBuilder? footer,
  bool expand = false,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    barrierColor: const Color(0xB3000000),
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
    builder: (sheetContext) {
      // Lembar Figma paling tinggi sampai 32 dari tepi atas layar.
      final maxHeight =
          MediaQuery.sizeOf(sheetContext).height - 32 - MediaQuery.paddingOf(sheetContext).bottom;
      final body = builder(sheetContext);
      return Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(sheetContext).bottom),
        child: DefaultTextStyle.merge(
          style: figmaTextStyle,
          child: SafeArea(
            top: false,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxHeight: maxHeight),
              child: Column(
                mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 8),
                  Center(
                    child: Container(
                      width: 48,
                      height: 5,
                      decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2.5)),
                    ),
                  ),
                  // Judul 24/32 pada y 36; isi mulai y 96 tanpa subjudul.
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 23, 16, 0),
                    child: Row(children: [
                      if (showClose) ...[
                        IconButton(
                          tooltip: 'Tutup',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints.tightFor(width: 32, height: 32),
                          onPressed: () => Navigator.pop(sheetContext),
                          icon: const AppIcon('x', color: AppColors.textLight),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Expanded(
                        child: Text(title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 24, height: 32 / 24, fontWeight: FontWeight.w600, color: AppColors.sheetTitle)),
                      ),
                    ]),
                  ),
                  if (subtitle != null)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
                      child: Text(subtitle, style: const TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
                    ),
                  SizedBox(height: subtitle == null ? 20 : 16),
                  if (expand) Expanded(child: body) else Flexible(child: body),
                  if (footer != null) footer(sheetContext),
                ],
              ),
            ),
          ),
        ),
      );
    },
  );
}

/// Bilah aksi bawah berlatar putih dengan garis atas, dipakai CTA halaman
/// dan footer lembar bawah.
class BottomActionBar extends StatelessWidget {
  final Widget child;

  const BottomActionBar({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        // Garis atas 1px menumpang di dalam padding 16 (tinggi bilah 76).
        child: Padding(padding: const EdgeInsets.all(16), child: child),
      ),
    );
  }
}

/// Footer form lembar bawah: "Batal" (garis) dan "Simpan" (isi).
class SheetFormFooter extends StatelessWidget {
  final VoidCallback onSave;
  final String saveLabel;

  const SheetFormFooter({super.key, required this.onSave, this.saveLabel = 'Simpan'});

  @override
  Widget build(BuildContext context) {
    return BottomActionBar(
      child: Row(children: [
        Expanded(
          child: OutlinedButton(onPressed: () => Navigator.maybePop(context), child: const Text('Batal')),
        ),
        const SizedBox(width: 8),
        Expanded(child: ElevatedButton(onPressed: onSave, child: Text(saveLabel))),
      ]),
    );
  }
}

/// Indikator dua langkah checkout: "Data Peserta" lalu "Pembayaran".
class CheckoutSteps extends StatelessWidget {
  final int current;

  const CheckoutSteps({super.key, required this.current});

  @override
  Widget build(BuildContext context) {
    Widget step(String label, int index) {
      final done = index <= current;
      return Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            height: 3,
            decoration: BoxDecoration(
              color: done ? AppColors.accent : AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 6),
          Text(label,
              style: TextStyle(
                fontSize: 12,
                height: 16 / 12,
                fontWeight: FontWeight.w500,
                color: index == current ? AppColors.primaryDark : (done ? AppColors.textMedium : AppColors.textLight),
              )),
        ]),
      );
    }

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(children: [step('Data Peserta', 0), const SizedBox(width: 6), step('Pembayaran', 1)]),
    );
  }
}

/// Judul bagian halaman (18/28, SemiBold).
class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? trailing;

  const SectionTitle(this.text, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(
        child: Text(text,
            style: const TextStyle(fontSize: 18, height: 28 / 18, fontWeight: FontWeight.w600, color: AppColors.textDark)),
      ),
      if (trailing != null) trailing!,
    ]);
  }
}

/// Nada kotak catatan Figma: latar, lingkaran ikon, ikon, dan teks.
enum NoteTone {
  info(Color(0xFFF2FBFB), Color(0xFFC0ECEC), AppColors.accent, AppColors.primaryDark, 'info'),
  warning(AppColors.warningBg, AppColors.warningBorder, AppColors.warningDark, Color(0xFFB45309), 'info'),
  danger(AppColors.dangerSoft, Color(0xFFFECACA), AppColors.dangerDark, AppColors.errorText, 'warning'),
  plain(Colors.white, AppColors.accentLight, AppColors.accent, AppColors.textBody, 'info', AppColors.background);

  final Color background;
  final Color circle;
  final Color icon;
  final Color text;
  final String iconName;
  final Color? border;

  const NoteTone(this.background, this.circle, this.icon, this.text, this.iconName, [this.border]);
}

/// Kotak catatan: ikon dalam lingkaran 24 lalu teks 12/16.
class NoteBox extends StatelessWidget {
  final String? text;
  final InlineSpan? span;
  final NoteTone tone;
  final Color? background;
  final Color? textColor;
  final bool shadow;

  /// Padding vertikal 8 (bukan 12), seperti catatan usia di form peserta.
  final bool dense;

  const NoteBox({
    super.key,
    this.text,
    this.span,
    this.tone = NoteTone.info,
    this.background,
    this.textColor,
    this.shadow = true,
    this.dense = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      // Border 1px ikut menjorokkan isi, jadi padding dikurangi 1.
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: dense ? 8 : 12) -
          EdgeInsets.all(tone.border == null ? 0 : 1),
      decoration: BoxDecoration(
        color: background ?? tone.background,
        borderRadius: BorderRadius.circular(8),
        border: tone.border == null ? null : Border.all(color: tone.border!),
        boxShadow: shadow ? softShadow : null,
      ),
      // Teks satu baris di tengah ikon; teks panjang mulai sejajar atas ikon.
      child: Row(crossAxisAlignment: dense ? CrossAxisAlignment.center : CrossAxisAlignment.start, children: [
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: tone.circle, shape: BoxShape.circle),
          child: AppIcon(tone.iconName, size: 12, color: tone.icon),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Container(
            constraints: const BoxConstraints(minHeight: 24),
            alignment: Alignment.centerLeft,
            child: Text.rich(
              span ?? TextSpan(text: text),
              style: TextStyle(fontSize: 12, height: 16 / 12, color: textColor ?? tone.text),
            ),
          ),
        ),
      ]),
    );
  }
}

/// Bayangan tipis kotak catatan Figma (0,1,2 6% + 0,1,3 10%).
const softShadow = [
  BoxShadow(color: Color(0x0F101828), offset: Offset(0, 1), blurRadius: 2),
  BoxShadow(color: Color(0x1A101828), offset: Offset(0, 1), blurRadius: 3),
];

/// Sakelar Figma 36×20 dengan kenop 16.
class DesignSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;

  const DesignSwitch({super.key, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      toggled: value,
      child: GestureDetector(
        onTap: onChanged == null ? null : () => onChanged!(!value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 36,
          height: 20,
          padding: const EdgeInsets.all(2),
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          decoration: BoxDecoration(
            color: value ? AppColors.accent : AppColors.border,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Container(
            width: 16,
            height: 16,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: Color(0x1A0A0D12), offset: Offset(0, 1), blurRadius: 3),
                BoxShadow(color: Color(0x1A0A0D12), offset: Offset(0, 1), blurRadius: 2, spreadRadius: -1),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Kartu bergaya tiket: bagian atas dan bawah dipisah garis putus-putus
/// dengan takik setengah lingkaran di kedua sisi.
class TicketCard extends StatelessWidget {
  final Widget top;
  final Widget bottom;

  const TicketCard({super.key, required this.top, required this.bottom});

  @override
  Widget build(BuildContext context) {
    final notchColor = Theme.of(context).scaffoldBackgroundColor;
    Widget notch(bool left) => Positioned(
          left: left ? -8 : null,
          right: left ? null : -8,
          top: -8,
          child: Container(
            width: 16,
            height: 16,
            decoration: BoxDecoration(
              color: notchColor,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.borderStrong),
            ),
          ),
        );
    // Takik dipotong tepi kartu sehingga hanya setengah lingkaran di dalam.
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.fromLTRB(15, 15, 15, 20), child: top),
        Stack(clipBehavior: Clip.none, children: [
          const Padding(padding: EdgeInsets.symmetric(horizontal: 15), child: DashedLine()),
          notch(true),
          notch(false),
        ]),
        Padding(padding: const EdgeInsets.fromLTRB(15, 20, 15, 15), child: bottom),
      ]),
    );
  }
}

/// Garis putus Figma: ujung 2px, lalu putus 4 jarak 4 dari kedua sisi.
class DashedLine extends StatelessWidget {
  final Color color;

  const DashedLine({super.key, this.color = AppColors.borderStrong});

  @override
  Widget build(BuildContext context) =>
      SizedBox(height: 1, width: double.infinity, child: CustomPaint(painter: _DashPainter(color)));
}

class _DashPainter extends CustomPainter {
  final Color color;

  const _DashPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final w = size.width;
    canvas
      ..drawRect(const Rect.fromLTWH(0, 0, 2, 1), paint)
      ..drawRect(Rect.fromLTWH(w - 2, 0, 2, 1), paint);
    for (double x = 6; x + 4 <= w - 6; x += 8) {
      canvas.drawRect(Rect.fromLTWH(x, 0, 4, 1), paint);
    }
  }

  @override
  bool shouldRepaint(_DashPainter oldDelegate) => oldDelegate.color != color;
}

/// Tombol pil kecil "Salin" yang menyalin [text] ke clipboard.
class CopyChip extends StatelessWidget {
  final String text;
  final String message;

  const CopyChip(this.text, {super.key, this.message = 'Disalin.'});

  @override
  Widget build(BuildContext context) {
    // Pil 76x28: ikon salin 16, jarak 8, lalu "Salin" 14 SemiBold.
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(76, 28),
        fixedSize: const Size.fromHeight(28),
        padding: const EdgeInsets.fromLTRB(10, 0, 12, 0),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle: const TextStyle(fontFamily: 'Roboto', fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600),
      ),
      onPressed: () async {
        await Clipboard.setData(ClipboardData(text: text));
        if (context.mounted) showSnack(context, message);
      },
      icon: const AppIcon('copy', size: 16, color: AppColors.accent),
      label: const Text('Salin'),
    );
  }
}

/// Dialog konfirmasi bergaya Figma: judul, pesan, lalu tombol utama dan
/// tombol garis bertumpuk. Mengembalikan true bila dikonfirmasi.
Future<bool> showActionDialog(
  BuildContext context, {
  required String title,
  required Widget message,
  required String confirmLabel,
  required String cancelLabel,
}) async {
  final result = await showDialog<bool>(
    context: context,
    // Desain memusatkan dialog pada seluruh layar, bukan area aman.
    useSafeArea: false,
    builder: (context) => Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(title,
              style: const TextStyle(fontSize: 24, height: 28 / 24, fontWeight: FontWeight.w700, color: AppColors.sheetTitle)),
          const SizedBox(height: 14),
          DefaultTextStyle.merge(
            style: const TextStyle(fontSize: 16, height: 1.5, color: AppColors.textMedium),
            child: message,
          ),
          const SizedBox(height: 17),
          ElevatedButton(
            style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            onPressed: () => Navigator.pop(context, true),
            child: Text(confirmLabel),
          ),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: () => Navigator.pop(context, false), child: Text(cancelLabel)),
        ]),
      ),
    ),
  );
  return result ?? false;
}
