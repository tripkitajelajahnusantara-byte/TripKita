import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Palet warna yang sama dengan web customer (`provider-web/src/index.css`
/// dan gaya inline halaman customer).
class AppColors {
  static const accent = Color(0xFF007BFF);
  static const accentHover = Color(0xFF0056B3);
  static const primary = Color(0xFF0284C7);
  static const primaryDark = Color(0xFF0369A1);
  static const accentLight = Color(0xFFE0F2FE);
  static const accentSoft = Color(0xFFF0F7FF);
  static const accentBorder = Color(0xFFDBEAFE);

  static const textDark = Color(0xFF0F172A);
  static const textStrong = Color(0xFF1E293B);
  static const textBody = Color(0xFF334155);
  static const textMedium = Color(0xFF475569);
  static const textMuted = Color(0xFF64748B);
  static const textLight = Color(0xFF94A3B8);

  static const background = Color(0xFFF8FAFC);
  static const surface = Colors.white;
  static const border = Color(0xFFE2E8F0);
  static const borderStrong = Color(0xFFCBD5E1);
  static const divider = Color(0xFFF1F5F9);

  static const success = Color(0xFF10B981);
  static const successDark = Color(0xFF16A34A);
  static const successBg = Color(0xFFDCFCE7);
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
}

class AppTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.accent,
        primary: AppColors.accent,
        secondary: AppColors.primary,
        surface: AppColors.surface,
        error: AppColors.danger,
      ),
      scaffoldBackgroundColor: AppColors.background,
    );

    final bodyText = GoogleFonts.interTextTheme(base.textTheme).apply(
      bodyColor: AppColors.textDark,
      displayColor: AppColors.textDark,
    );
    // Judul memakai Outfit seperti heading web.
    final textTheme = bodyText.copyWith(
      headlineLarge: GoogleFonts.outfit(textStyle: bodyText.headlineLarge, fontWeight: FontWeight.w800),
      headlineMedium: GoogleFonts.outfit(textStyle: bodyText.headlineMedium, fontWeight: FontWeight.w800),
      headlineSmall: GoogleFonts.outfit(textStyle: bodyText.headlineSmall, fontWeight: FontWeight.w800),
      titleLarge: GoogleFonts.outfit(textStyle: bodyText.titleLarge, fontWeight: FontWeight.w800),
    );

    return base.copyWith(
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: GoogleFonts.outfit(
          color: AppColors.textDark,
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
        shape: const Border(bottom: BorderSide(color: AppColors.border)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        isDense: true,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        hintStyle: const TextStyle(color: AppColors.textLight, fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.borderStrong),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.borderStrong),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        errorStyle: const TextStyle(color: AppColors.danger, fontSize: 11.5, fontWeight: FontWeight.w700),
        errorMaxLines: 3,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.textLight,
          disabledForegroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textMedium,
          side: const BorderSide(color: AppColors.borderStrong),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.accent,
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? AppColors.primary : Colors.white,
        ),
        side: const BorderSide(color: AppColors.borderStrong, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.divider, thickness: 1, space: 1),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      dialogTheme: DialogTheme(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      ),
    );
  }
}
