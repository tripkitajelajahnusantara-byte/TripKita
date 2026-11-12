import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:customer_mobile/config/app_config.dart';

/// Tautan `wa.me` untuk nomor mitra, atau null bila nomornya tidak valid.
Uri? whatsAppUri(String? phone) {
  if (phone == null || phone.isEmpty) return null;
  var digits = phone.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('0')) digits = '62${digits.substring(1)}';
  if (!digits.startsWith('62') || digits.length < 10 || digits.length > 15)
    return null;
  return Uri.parse('https://wa.me/$digits');
}

Uri mapsSearchUri(String query) => Uri.parse(
    'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}');

Future<bool> openExternal(Uri uri) async {
  try {
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    return false;
  }
}

/// Halaman pembayaran dibuka di browser dalam aplikasi (Custom Tabs) agar
/// customer kembali ke aplikasi begitu tab ditutup; bila tidak didukung,
/// dibuka di browser luar.
Future<bool> openInAppBrowser(Uri uri) async {
  try {
    if (await launchUrl(uri, mode: kIsWeb ? LaunchMode.platformDefault : LaunchMode.inAppBrowserView)) return true;
  } catch (_) {}
  return openExternal(uri);
}

/// Build staging hanya boleh membuka Midtrans Sandbox, supaya uji coba tidak
/// pernah menarik uang sungguhan bila server memakai key production.
bool isAllowedPaymentUrl(String url, {bool staging = AppConfig.isStagingBuild}) {
  final host = Uri.tryParse(url)?.host.toLowerCase() ?? '';
  if (!host.endsWith('.midtrans.com')) return false;
  return !staging || host.endsWith('.sandbox.midtrans.com');
}
