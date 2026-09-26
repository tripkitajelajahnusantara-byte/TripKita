import 'dart:async';

import 'package:flutter/material.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';

/// Halaman pembayaran, padanan `CustomerPaymentInvoicePage` di web: membuka
/// checkout iPaymu di browser, lalu memperbarui status saat pengguna kembali.
/// Status lunas hanya diterima dari backend (webhook iPaymu), tidak dari
/// halaman ini.
class PaymentVerificationScreen extends StatefulWidget {
  final Booking booking;
  final String packageName;
  final bool openImmediately;

  const PaymentVerificationScreen({
    super.key,
    required this.booking,
    required this.packageName,
    this.openImmediately = false,
  });

  @override
  State<PaymentVerificationScreen> createState() => _PaymentVerificationScreenState();
}

class _PaymentVerificationScreenState extends State<PaymentVerificationScreen> with WidgetsBindingObserver {
  late Booking _booking = widget.booking;
  bool _checking = false;
  String _message = 'Mengarahkan ke halaman pembayaran aman iPaymu...';
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _booking.status == BookingStatus.pendingPayment) setState(() {});
    });
    if (widget.openImmediately) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _openInvoice());
    } else {
      _message = 'Selesaikan pembayaran melalui halaman aman iPaymu.';
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ticker?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _checkStatus();
  }

  Future<void> _openInvoice() async {
    final uri = trustedPaymentUri(_booking.paymentUrl);
    if (uri == null) {
      setState(() => _message = 'Tautan pembayaran tidak valid. Jangan melanjutkan pembayaran dan hubungi layanan pelanggan.');
      return;
    }
    final opened = await openExternal(uri);
    if (!mounted) return;
    setState(() => _message = opened
        ? 'Halaman pembayaran iPaymu telah dibuka. Setelah membayar, kembali ke aplikasi untuk melihat status pesanan.'
        : 'Halaman pembayaran tidak dapat dibuka otomatis. Ketuk tombol di bawah untuk membukanya.');
  }

  Future<void> _checkStatus() async {
    if (_checking || _booking.bookingCode.isEmpty) return;
    setState(() => _checking = true);
    try {
      final latest = await ApiService.trackBooking(_booking.bookingCode);
      if (!mounted) return;
      setState(() {
        _booking = Booking(
          id: _booking.id,
          bookingCode: _booking.bookingCode,
          packageId: _booking.packageId,
          packageDetails: _booking.packageDetails,
          packageNameFallback: _booking.packageNameFallback,
          customerName: _booking.customerName,
          tripDate: latest.tripDate ?? _booking.tripDate,
          guests: _booking.guests,
          totalPrice: latest.totalPrice > 0 ? latest.totalPrice : _booking.totalPrice,
          status: latest.status,
          paymentUrl: _booking.paymentUrl,
          createdAt: _booking.createdAt,
        );
      });
    } catch (_) {
      // Status akan tampil di riwayat booking.
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final paid = _booking.isPaidOrActive;
    final pending = _booking.status == BookingStatus.pendingPayment && !_booking.isPaymentExpired;
    final style = bookingStatusStyle(_booking.isPaymentExpired ? BookingStatus.expired : _booking.status);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pembayaran TripKita'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            tooltip: 'Tutup',
            onPressed: () => appShellKey.currentState?.showBookings(),
            icon: const Icon(Icons.close),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: paid ? AppColors.successBg : AppColors.accentLight,
                shape: BoxShape.circle,
              ),
              child: paid
                  ? const Icon(Icons.check_circle_outline, size: 38, color: AppColors.successDark)
                  : pending
                      ? const Padding(
                          padding: EdgeInsets.all(20),
                          child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.primary),
                        )
                      : Icon(style.icon, size: 36, color: style.color),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            paid ? 'Pembayaran Berhasil' : 'Pembayaran TripKita',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textDark),
          ),
          const SizedBox(height: 8),
          Text(
            paid ? 'Pesanan Anda telah lunas dan aktif. Detail trip tersedia di riwayat booking.' : _message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textMuted, height: 1.6),
          ),
          const SizedBox(height: 22),
          SectionCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                Expanded(
                  child: Text(_booking.bookingCode,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                ),
                StatusBadge(style),
              ]),
              const SizedBox(height: 12),
              Text(widget.packageName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('Tanggal: ${formatDateLong(_booking.tripDate)}  •  Peserta: ${_booking.guests} orang',
                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
              const Divider(height: 24),
              const Text('TOTAL HARGA', style: TextStyle(fontSize: 11, color: AppColors.textLight)),
              Text(formatIDR(_booking.totalPrice),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.priceTeal)),
              if (pending && _booking.paymentDeadline != null) ...[
                const SizedBox(height: 12),
                PaymentCountdown(deadline: _booking.paymentDeadline!),
              ],
              const SizedBox(height: 10),
              const Text(
                'Simpan kode booking ini. Anda dapat melacaknya kapan saja melalui menu Booking.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ]),
          ),
          const SizedBox(height: 20),
          if (pending) ...[
            PrimaryButton(
              label: 'Buka Halaman Pembayaran iPaymu',
              color: AppColors.primary,
              icon: Icons.open_in_new,
              onPressed: _openInvoice,
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _checking ? null : _checkStatus,
              icon: _checking
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.refresh, size: 18),
              label: const Text('Cek Status Pembayaran'),
            ),
            const SizedBox(height: 10),
          ],
          TextButton(
            onPressed: () => appShellKey.currentState?.showBookings(),
            child: const Text('Kembali ke riwayat booking'),
          ),
        ],
      ),
    );
  }
}

/// Hitung mundur batas transfer 24 jam, padanan `CountdownTimer` web.
class PaymentCountdown extends StatefulWidget {
  final DateTime deadline;
  final VoidCallback? onExpire;

  const PaymentCountdown({super.key, required this.deadline, this.onExpire});

  @override
  State<PaymentCountdown> createState() => _PaymentCountdownState();
}

class _PaymentCountdownState extends State<PaymentCountdown> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (DateTime.now().isAfter(widget.deadline)) {
        _timer?.cancel();
        widget.onExpire?.call();
      }
      setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    var left = widget.deadline.difference(DateTime.now());
    if (left.isNegative) left = Duration.zero;
    final text = '${twoDigits(left.inHours)}:${twoDigits(left.inMinutes % 60)}:${twoDigits(left.inSeconds % 60)}';
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF7ED),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: const Color(0xFFFFEDD5)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.schedule, size: 14, color: Color(0xFFEA580C)),
          const SizedBox(width: 6),
          Text('Batas Transfer: $text',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFFC2410C))),
        ]),
      ),
    );
  }
}
