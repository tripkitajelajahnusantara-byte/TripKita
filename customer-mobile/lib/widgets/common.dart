import 'package:flutter/material.dart';

import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/theme/app_theme.dart';

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
        boxShadow: const [BoxShadow(color: Color(0x05000000), blurRadius: 6, offset: Offset(0, 2))],
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

  const SectionHeading(this.text, {super.key, this.icon, this.iconColor = AppColors.accent, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (icon != null) ...[Icon(icon, size: 18, color: iconColor), const SizedBox(width: 8)],
        Expanded(
          child: Text(text, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
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
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textMedium),
          children: [
            if (required) const TextSpan(text: ' *', style: TextStyle(color: AppColors.danger)),
            if (hint != null)
              TextSpan(
                text: ' $hint',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w400, color: AppColors.textMuted),
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
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.danger)),
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
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          shadowColor: color.withValues(alpha: 0.35),
          elevation: onPressed == null || loading ? 0 : 3,
        ),
        onPressed: loading ? null : onPressed,
        child: loading
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 8)],
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
      return const StatusStyle('Trip Selesai (Completed)', AppColors.success, AppColors.successBg, Icons.check_circle_outline);
    case BookingStatus.paid:
    case BookingStatus.confirmed:
      return const StatusStyle('Lunas & Aktif', AppColors.success, AppColors.successBg, Icons.check_circle_outline);
    case BookingStatus.expired:
      return const StatusStyle('Kadaluwarsa (Batas Waktu Habis)', AppColors.danger, AppColors.dangerBg, Icons.cancel_outlined);
    case BookingStatus.pendingPayment:
      return const StatusStyle('Menunggu Pembayaran', AppColors.warning, AppColors.warningBg, Icons.schedule);
    case BookingStatus.rescheduleOffered:
      return const StatusStyle(
          'Menunggu Jawaban Anda (Jadwal Pengganti)', AppColors.warningDark, AppColors.warningBg, Icons.error_outline);
    case BookingStatus.refundRequired:
      return const StatusStyle('Proses Refund', AppColors.info, AppColors.infoBg, Icons.error_outline);
    case BookingStatus.refunded:
      return const StatusStyle('Dana Dikembalikan', AppColors.info, AppColors.infoBg, Icons.check_circle_outline);
    case BookingStatus.cancelledByCustomer:
    case 'CANCELLED':
      return const StatusStyle('Pesanan Dibatalkan', AppColors.danger, AppColors.dangerBg, Icons.cancel_outlined);
    default:
      return const StatusStyle('Dibatalkan', AppColors.danger, AppColors.dangerBg, Icons.cancel_outlined);
  }
}

class StatusBadge extends StatelessWidget {
  final StatusStyle style;

  const StatusBadge(this.style, {super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: style.background, borderRadius: BorderRadius.circular(30)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(style.icon, size: 13, color: style.color),
          const SizedBox(width: 4),
          Flexible(
            child: Text(style.label,
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: style.color),
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
            Padding(padding: const EdgeInsets.only(top: 1), child: Icon(icon, size: 16, color: color)),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(title!, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color)),
                  ),
                if (message != null)
                  Text(message!, style: TextStyle(fontSize: 12, color: textColor, height: 1.5, fontWeight: FontWeight.w600)),
                if (child != null) child!,
              ],
            ),
          ),
        ],
      ),
    );
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
    this.labelColor = AppColors.textMuted,
    this.valueColor = AppColors.textDark,
    this.emphasize = false,
  });

  @override
  Widget build(BuildContext context) {
    final size = emphasize ? 16.0 : 13.5;
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
                  fontWeight: emphasize ? FontWeight.w800 : FontWeight.w500,
                )),
          ),
          const SizedBox(width: 12),
          Text(value,
              style: TextStyle(
                fontSize: emphasize ? 18 : size,
                color: valueColor,
                fontWeight: emphasize ? FontWeight.w800 : FontWeight.w600,
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

  const NetworkPhoto(this.url, {super.key, this.height, this.width, this.fit = BoxFit.cover});

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
      errorBuilder: (_, __, ___) => _PhotoPlaceholder(height: height, width: width),
      loadingBuilder: (context, child, progress) =>
          progress == null ? child : Container(height: height, width: width, color: AppColors.divider),
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
          Icon(Icons.landscape_outlined, size: compact ? 26 : 40, color: AppColors.primary.withValues(alpha: 0.55)),
          if (!compact) ...[
            const SizedBox(height: 6),
            Text('Foto belum tersedia',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary.withValues(alpha: 0.7))),
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
          Text(message, style: const TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center),
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

  const EmptyState({super.key, required this.icon, required this.title, required this.message, this.actions = const []});

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
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
          const SizedBox(height: 6),
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted, height: 1.5)),
          if (actions.isNotEmpty) ...[
            const SizedBox(height: 18),
            Wrap(spacing: 10, runSpacing: 10, alignment: WrapAlignment.center, children: actions),
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
          textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.6)),
      actions: [
        Expanded(
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: isError ? AppColors.danger : AppColors.primary),
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
          child: OutlinedButton(onPressed: () => Navigator.pop(context, false), child: Text(cancelLabel, textAlign: TextAlign.center)),
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
              decoration: BoxDecoration(color: iconBackground, shape: BoxShape.circle),
              child: Icon(icon, size: 30, color: iconColor),
            ),
            const SizedBox(height: 16),
            Text(title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: AppColors.textDark)),
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

void showSnack(BuildContext context, String message, {bool isError = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: isError ? AppColors.dangerDark : AppColors.textDark,
    ));
}

/// Logo resmi TemenTrip, sama dengan header web.
class BrandLogo extends StatelessWidget {
  final double height;

  const BrandLogo({super.key, this.height = 34});

  @override
  Widget build(BuildContext context) {
    return Image.asset('assets/images/tementrip_official_logo.png', height: height, fit: BoxFit.contain);
  }
}
