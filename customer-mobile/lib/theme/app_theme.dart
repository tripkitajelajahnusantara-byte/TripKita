import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Palet warna desain Figma "TemenTrip" (Final Design): teal sebagai warna
/// utama dan abu-abu kebiruan untuk teks. Nama token lama dipertahankan agar
/// seluruh layar ikut berganti warna.
class AppColors {
  static const accent = Color(0xFF039CA2); // Primary/500
  static const accentHover = Color(0xFF03858E);
  static const primary = Color(0xFF039CA2);
  static const primaryDark = Color(0xFF03858E); // teks harga & tautan aktif
  static const accentLight = Color(0xFFE6F7F8); // Primary/100
  static const accentSoft = Color(0xFFF2FBFB); // Primary/50
  static const accentBorder = Color(0xFFB3E1E3);

  static const textDark = Color(0xFF102A33); // Neutral/900
  static const textStrong = Color(0xFF1F343D);
  static const textBody = Color(0xFF344850);
  static const textMedium = Color(0xFF4A5D66);
  static const textMuted = Color(0xFF647780);
  static const textLight = Color(0xFF94A3AD);

  static const background = Color(0xFFF8FAFC);
  static const surface = Colors.white;
  static const border = Color(0xFFE2E8EC);
  static const borderStrong = Color(0xFFCBD5DB);
  static const divider = Color(0xFFF1F5F7);

  static const success = Color(0xFF16A34A);
  static const successDark = Color(0xFF15803D);
  static const successBg = Color(0xFFF0FDF4);
  static const star = Color(0xFFF5A41B);
  static const warning = Color(0xFFF59E0B);
  static const warningDark = Color(0xFFD97706);
  static const warningText = Color(0xFF92400E);
  static const warningBg = Color(0xFFFFFBEB);
  static const warningBorder = Color(0xFFFDE68A);
  static const danger = Color(0xFFEF4444);
  static const dangerDark = Color(0xFFDC2626);
  static const dangerText = Color(0xFF7F1D1D);
  static const dangerBg = Color(0xFFFEE2E2);
  static const dangerSoft = Color(0xFFFEF2F2);
  static const dangerBorder = Color(0xFFFCA5A5);
  static const info = Color(0xFF3B82F6);
  static const infoBg = Color(0xFFEFF6FF);
  static const whatsapp = Color(0xFF25D366);
  static const priceTeal = Color(0xFF00A896);

  static const honeymoon = Color(0xFFE11D48);
  static const corporate = Color(0xFF059669);
  static const family = Color(0xFFD97706);

  // Token desain Figma "Temen Trip" untuk beranda dan Cari Trip.
  static const brand = Color(0xFF039CA2); // Primary/500
  static const brandSoft = Color(0xFFE6F7F8); // Primary/100
  static const brandDeep = Color(0xFF03585C);
  static const heading = Color(0xFF181D27); // text-primary (900)
  static const ink = Color(0xFF131214);
  static const menuText = Color(0xFF414651);
  static const menuTextActive = Color(0xFF252B37);
  static const cardBorder = Color(0xFFE9EAEB);
  static const calendarDay = Color(0xFF5A5A5A);
  static const calendarWeekday = Color(0xFF666666);
  static const errorStrong = Color(0xFFB42318);
  static const favorite = Color(0xFFD92D20);

  // Token desain Figma alur Booking & Payment, Booking, Profil, Plan Trip, Login.
  static const sheetTitle = Color(0xFF0F172A);
  static const buttonOutline = Color(0xFF82C1CE);
  static const errorText = Color(0xFFB91C1C);
  static const icon = Color(0xFF647780);
  static const accentBright = Color(0xFF03B2B5);
}

/// Lapisan komponen "Buttons" Figma: bayangan 1px di luar, bayangan dalam 2px
/// di bawah, cincin gelap 1px, dan kilau putih 2px pada tombol isi.
class ButtonSkin extends StatelessWidget {
  final Widget child;
  final bool filled;
  final bool enabled;

  /// Sudut tumpul; bawaannya setengah tinggi (pil).
  final double? radius;

  /// Pengali ketebalan efek, mis. 1.375 untuk kotak ikon 44.
  final double scale;

  const ButtonSkin(
      {super.key, required this.child, this.filled = true, this.enabled = true, this.radius, this.scale = 1});

  @override
  Widget build(BuildContext context) =>
      CustomPaint(painter: enabled ? _ButtonSkinPainter(filled, radius, scale) : null, child: child);
}

class _ButtonSkinPainter extends CustomPainter {
  final bool filled;
  final double? radius;
  final double scale;

  const _ButtonSkinPainter(this.filled, this.radius, this.scale);

  static const _ink = Color(0xFF0A0D12);

  @override
  void paint(Canvas canvas, Size size) {
    final rrect = RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius ?? size.height / 2));
    final s = scale;
    final shape = Path()..addRRect(rrect);
    canvas
      ..save()
      ..clipPath(Path.combine(PathOperation.difference, Path()..addRect((Offset.zero & size).inflate(6)), shape))
      ..drawRRect(
        rrect.shift(Offset(0, s)),
        Paint()
          ..color = _ink.withValues(alpha: 0.05)
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, s),
      )
      ..restore()
      ..save()
      ..clipRRect(rrect)
      ..drawPath(
        Path.combine(PathOperation.difference, shape, Path()..addRRect(rrect.shift(Offset(0, -2 * s)))),
        Paint()..color = _ink.withValues(alpha: 0.05),
      );
    if (filled) {
      canvas.drawRRect(
        rrect.deflate(1),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..shader = const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0x1FFFFFFF), Color(0x00FFFFFF)],
          ).createShader(Offset.zero & size),
      );
    }
    canvas
      ..drawRRect(
        rrect.deflate(0.5 * s),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = s
          ..color = _ink.withValues(alpha: 0.18),
      )
      ..restore();
  }

  @override
  bool shouldRepaint(_ButtonSkinPainter oldDelegate) => oldDelegate.filled != filled;
}

class AppTheme {
  /// Ikon status bar terang di atas header biru; navigasi sistem putih.
  static const lightBars = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.white,
    systemNavigationBarIconBrightness: Brightness.dark,
  );

  /// Ikon status bar gelap di atas header putih.
  static const darkBars = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
    systemNavigationBarColor: Colors.white,
    systemNavigationBarIconBrightness: Brightness.dark,
  );

  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      fontFamily: 'Roboto',
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.accent,
        primary: AppColors.accent,
        secondary: AppColors.primary,
        surface: AppColors.surface,
        error: AppColors.danger,
      ),
      scaffoldBackgroundColor: AppColors.background,
    );

    // Seluruh teks memakai Roboto (aset lokal) mengikuti desain Figma. Figma
    // membagi ruang tinggi baris sama rata di atas dan bawah teks dan tidak
    // memakai tracking bawaan Material 3.
    TextStyle? even(TextStyle? s) => s?.copyWith(leadingDistribution: TextLeadingDistribution.even, letterSpacing: 0);
    final applied = base.textTheme.apply(
      bodyColor: AppColors.textDark,
      displayColor: AppColors.textDark,
    );
    final textTheme = applied.copyWith(
      displayLarge: even(applied.displayLarge),
      displayMedium: even(applied.displayMedium),
      displaySmall: even(applied.displaySmall),
      headlineLarge: even(applied.headlineLarge),
      headlineMedium: even(applied.headlineMedium),
      headlineSmall: even(applied.headlineSmall),
      titleLarge: even(applied.titleLarge),
      titleMedium: even(applied.titleMedium),
      titleSmall: even(applied.titleSmall),
      bodyLarge: even(applied.bodyLarge),
      bodyMedium: even(applied.bodyMedium),
      bodySmall: even(applied.bodySmall),
      labelLarge: even(applied.labelLarge),
      labelMedium: even(applied.labelMedium),
      labelSmall: even(applied.labelSmall),
    );
    OutlineInputBorder outline(Color color, [double width = 1]) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: color, width: width),
        );
    const pill = StadiumBorder();

    return base.copyWith(
      textTheme: textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: 'Roboto',
          color: AppColors.textDark,
          fontSize: 24,
          height: 1.17,
          fontWeight: FontWeight.w600,
        ),
      ),
      // Panah kembali Phosphor dari desain, abu-abu.
      actionIconTheme: ActionIconThemeData(
        backButtonIconBuilder: (_) => SvgPicture.asset(
          'assets/icons/arrow_left.svg',
          width: 24,
          height: 24,
          colorFilter: const ColorFilter.mode(AppColors.icon, BlendMode.srcIn),
        ),
      ),
      // Isian Figma: tinggi 40, teks 16, galat 14 merah tua di bawahnya.
      inputDecorationTheme: InputDecorationTheme(
        isDense: true,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        hintStyle: const TextStyle(color: AppColors.textLight, fontSize: 16, height: 1.5, letterSpacing: 0),
        border: outline(AppColors.borderStrong),
        enabledBorder: outline(AppColors.borderStrong),
        focusedBorder: outline(AppColors.accent, 1.5),
        errorBorder: outline(AppColors.dangerDark),
        focusedErrorBorder: outline(AppColors.dangerDark, 1.5),
        disabledBorder: outline(AppColors.border),
        errorStyle: const TextStyle(
          color: AppColors.errorText,
          fontSize: 14,
          height: 20 / 14,
          leadingDistribution: TextLeadingDistribution.even,
        ),
        errorMaxLines: 3,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.borderStrong,
          disabledForegroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(64, 44),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          shape: pill,
          textStyle: const TextStyle(fontFamily: 'Roboto', fontSize: 16, fontWeight: FontWeight.w600),
          backgroundBuilder: (context, states, child) =>
              ButtonSkin(enabled: !states.contains(WidgetState.disabled), child: child!),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.accent,
          backgroundColor: Colors.white,
          side: const BorderSide(color: AppColors.buttonOutline),
          minimumSize: const Size(64, 44),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          shape: pill,
          textStyle: const TextStyle(fontFamily: 'Roboto', fontSize: 16, fontWeight: FontWeight.w600),
          backgroundBuilder: (context, states, child) =>
              ButtonSkin(filled: false, enabled: !states.contains(WidgetState.disabled), child: child!),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.accent,
          textStyle: const TextStyle(fontFamily: 'Roboto', fontWeight: FontWeight.w600),
        ),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? AppColors.primary : Colors.white,
        ),
        side: const BorderSide(color: AppColors.borderStrong, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: const WidgetStatePropertyAll(Colors.white),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? AppColors.accent : AppColors.border,
        ),
        trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
      ),
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? AppColors.accent : AppColors.borderStrong,
        ),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1, space: 1),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      dialogTheme: DialogTheme(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      ),
    );
  }
}
