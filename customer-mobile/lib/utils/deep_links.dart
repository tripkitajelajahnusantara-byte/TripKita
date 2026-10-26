import 'package:customer_mobile/config/app_config.dart';

/// Tautan bagikan paket: `https://tementrip-app.web.app/paket/12`.
Uri packageShareUri(int packageId) => Uri.parse('${AppConfig.webBaseUrl}/paket/$packageId');

/// ID paket dari tautan/rute `/paket/<id>`, atau null bila bukan tautan paket.
int? packageIdFromUri(Uri uri) {
  final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.length != 2 || segments[0] != 'paket') return null;
  final id = int.tryParse(segments[1]);
  return id != null && id > 0 ? id : null;
}
