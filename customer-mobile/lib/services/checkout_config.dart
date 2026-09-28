import 'package:customer_mobile/services/api_service.dart';

/// Angka checkout dari `GET /public/checkout-config`, satu sumber dengan
/// perhitungan total booking di backend.
class CheckoutConfig {
  final int serviceFee;
  final Duration paymentWindow;
  final Duration adminReviewWindow;
  final String bankName;
  final String accountNumber;
  final String accountHolder;

  const CheckoutConfig({
    required this.serviceFee,
    required this.paymentWindow,
    required this.adminReviewWindow,
    required this.bankName,
    required this.accountNumber,
    required this.accountHolder,
  });

  static CheckoutConfig? _cached;
  static Future<CheckoutConfig>? _pending;

  /// Masa berlaku transfer untuk hitung mundur. Sebelum konfigurasi termuat
  /// dipakai 24 jam, nilai yang sama dengan `models.PaymentWindow` backend;
  /// status kedaluwarsa yang sebenarnya tetap ditentukan backend.
  static Duration get currentPaymentWindow =>
      _cached?.paymentWindow ?? const Duration(hours: 24);

  static Future<CheckoutConfig> load() {
    final cached = _cached;
    if (cached != null) return Future.value(cached);
    return _pending ??= ApiService.fetchCheckoutConfig().then((config) {
      _cached = config;
      return config;
    }).whenComplete(() => _pending = null);
  }
}
