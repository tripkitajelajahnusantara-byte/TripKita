import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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

    // Seluruh teks memakai Roboto (aset lokal) mengikuti desain Figma.
    final textTheme = base.textTheme.apply(
      bodyColor: AppColors.textDark,
      displayColor: AppColors.textDark,
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
          fontSize: 22,
          height: 1.3,
          fontWeight: FontWeight.w600,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        isDense: true,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        hintStyle: const TextStyle(color: AppColors.textLight, fontSize: 15),
        border: outline(AppColors.borderStrong),
        enabledBorder: outline(AppColors.borderStrong),
        focusedBorder: outline(AppColors.accent, 1.5),
        errorBorder: outline(AppColors.dangerDark),
        focusedErrorBorder: outline(AppColors.dangerDark, 1.5),
        disabledBorder: outline(AppColors.border),
        errorStyle: const TextStyle(color: AppColors.dangerDark, fontSize: 12),
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
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          shape: pill,
          textStyle: const TextStyle(fontFamily: 'Roboto', fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.accent,
          side: const BorderSide(color: AppColors.accent),
          minimumSize: const Size(64, 44),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          shape: pill,
          textStyle: const TextStyle(fontFamily: 'Roboto', fontSize: 16, fontWeight: FontWeight.w600),
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
