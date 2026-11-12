import 'package:flutter/widgets.dart';
import 'package:google_sign_in_web/web_only.dart' as gis;

/// Tombol resmi Google Identity Services (wajib di web; tombol buatan sendiri
/// tidak dapat memicu login GIS). Diatur semirip desain: garis, pil, logo di
/// tengah, teks "Masuk dengan Google".
Widget googleWebButton(double width) => gis.renderButton(
      configuration: gis.GSIButtonConfiguration(
        type: gis.GSIButtonType.standard,
        theme: gis.GSIButtonTheme.outline,
        size: gis.GSIButtonSize.large,
        text: gis.GSIButtonText.signinWith,
        shape: gis.GSIButtonShape.pill,
        logoAlignment: gis.GSIButtonLogoAlignment.center,
        // GIS membatasi lebar tombol maksimal 400 px.
        minimumWidth: width.clamp(200, 400).toDouble(),
        locale: 'id',
      ),
    );
