import 'package:url_launcher/url_launcher.dart';

/// Hanya invoice HTTPS milik Xendit yang boleh dibuka sebagai halaman
/// pembayaran, sama dengan pemeriksaan di web.
Uri? trustedPaymentUri(String? value) {
  if (value == null || value.isEmpty) return null;
  final uri = Uri.tryParse(value);
  if (uri == null) return null;
  final host = uri.host.toLowerCase();
  final isXendit = host == 'xendit.co' || host.endsWith('.xendit.co');
  return uri.scheme == 'https' && isXendit ? uri : null;
}

/// Tautan `wa.me` untuk nomor mitra, atau null bila nomornya tidak valid.
Uri? whatsAppUri(String? phone) {
  if (phone == null || phone.isEmpty) return null;
  var digits = phone.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('0')) digits = '62${digits.substring(1)}';
  if (!digits.startsWith('62') || digits.length < 10 || digits.length > 15) return null;
  return Uri.parse('https://wa.me/$digits');
}

Uri mapsSearchUri(String query) =>
    Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}');

Future<bool> openExternal(Uri uri) async {
  try {
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    return false;
  }
}
