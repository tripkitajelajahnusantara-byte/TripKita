import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/checkout_config.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';

/// Pembayaran transfer manual. Kuota booking ditahan selama 24 jam; booking
/// baru terlihat oleh provider setelah bukti transfer disetujui admin.
class PaymentVerificationScreen extends StatefulWidget {
  final Booking booking;
  final String packageName;

  const PaymentVerificationScreen({
    super.key,
    required this.booking,
    required this.packageName,
  });

  @override
  State<PaymentVerificationScreen> createState() =>
      _PaymentVerificationScreenState();
}

class _PaymentVerificationScreenState extends State<PaymentVerificationScreen> {
  late Booking _booking = widget.booking;
  CheckoutConfig? _config;
  PlatformFile? _proof;
  bool _loading = false;
  String? _error;
  String? _message;
  Timer? _ticker;
  Timer? _statusTimer;

  @override
  void initState() {
    super.initState();
    _loadConfig();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
    _statusTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (_booking.status == BookingStatus.paymentReview) _checkStatus();
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _statusTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadConfig() async {
    try {
      final value = await CheckoutConfig.load();
      if (mounted) setState(() => _config = value);
    } catch (e) {
      if (mounted)
        setState(() => _error = e is ApiException
            ? e.message
            : 'Rekening pembayaran belum dapat dimuat.');
    }
  }

  Future<void> _checkStatus() async {
    if (_loading || _booking.bookingCode.isEmpty) return;
    try {
      final latest = await ApiService.trackBooking(_booking.bookingCode);
      if (mounted) setState(() => _booking = latest);
    } catch (_) {
      // Pengguna dapat mencoba ulang melalui menu Booking.
    }
  }

  Future<void> _selectProof() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'pdf'],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    final selected = result.files.single;
    if (selected.size > 5 * 1024 * 1024) {
      setState(() => _error = 'Ukuran bukti transfer maksimal 5 MB.');
      return;
    }
    setState(() {
      _proof = selected;
      _error = null;
    });
  }

  Future<void> _submitProof() async {
    final proof = _proof;
    if (_loading || proof?.bytes == null) return;
    setState(() {
      _loading = true;
      _error = null;
      _message = null;
    });
    try {
      final updated = await ApiService.submitPaymentProof(
          _booking.bookingCode, proof!.bytes!, proof.name);
      if (!mounted) return;
      setState(() {
        _booking = updated;
        _proof = null;
        _message =
            'Bukti berhasil dikirim. Admin akan mengonfirmasi maksimal 1×24 jam.';
      });
    } catch (e) {
      if (mounted)
        setState(() => _error = e is ApiException
            ? e.message
            : 'Bukti transfer belum dapat dikirim.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final paid = _booking.isPaidOrActive;
    final review = _booking.status == BookingStatus.paymentReview;
    final pending = _booking.status == BookingStatus.pendingPayment &&
        !_booking.isPaymentExpired;
    final style = bookingStatusStyle(
        _booking.isPaymentExpired ? BookingStatus.expired : _booking.status);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pembayaran TripKita'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
              tooltip: 'Tutup',
              onPressed: () => appShellKey.currentState?.showBookings(),
              icon: const Icon(Icons.close))
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
              child: Icon(
                  paid
                      ? Icons.check_circle_outline
                      : review
                          ? Icons.verified_user_outlined
                          : Icons.account_balance_outlined,
                  size: 52,
                  color: paid ? AppColors.success : AppColors.primary)),
          const SizedBox(height: 14),
          Text(
              paid
                  ? 'Pembayaran Dikonfirmasi'
                  : review
                      ? 'Menunggu Konfirmasi Admin'
                      : 'Transfer Manual',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textDark)),
          const SizedBox(height: 8),
          Text(
              review
                  ? 'Booking belum diteruskan ke provider. Admin wajib memeriksa bukti maksimal 1×24 jam.'
                  : 'Simpan Booking ID dan selesaikan transfer sebelum countdown berakhir.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted, height: 1.5)),
          const SizedBox(height: 20),
          SectionCard(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                Row(children: [
                  Expanded(
                      child: Text(_booking.bookingCode,
                          style: const TextStyle(fontWeight: FontWeight.w800))),
                  StatusBadge(style)
                ]),
                const SizedBox(height: 10),
                Text(widget.packageName,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                const Divider(height: 24),
                const Text('TOTAL TRANSFER',
                    style: TextStyle(fontSize: 11, color: AppColors.textLight)),
                Text(formatIDR(_booking.totalPrice),
                    style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.priceTeal)),
                if (pending && _booking.paymentDeadline != null) ...[
                  const SizedBox(height: 12),
                  PaymentCountdown(deadline: _booking.paymentDeadline!)
                ],
                if (review && _booking.paymentReviewDeadline != null) ...[
                  const SizedBox(height: 12),
                  PaymentCountdown(
                      deadline: _booking.paymentReviewDeadline!,
                      label: 'Batas Konfirmasi Admin')
                ],
              ])),
          if (pending) ...[
            const SizedBox(height: 16),
            SectionCard(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                  const Text('Rekening TemenTrip',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),
                  Text(_config?.bankName ?? 'Memuat...',
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  Row(children: [
                    Expanded(
                        child: Text(
                            _config?.accountNumber.isNotEmpty == true
                                ? _config!.accountNumber
                                : 'Belum dikonfigurasi',
                            style: const TextStyle(
                                fontSize: 21, fontWeight: FontWeight.w800))),
                    IconButton(
                        onPressed: _config?.accountNumber.isNotEmpty == true
                            ? () async {
                                await Clipboard.setData(ClipboardData(
                                    text: _config!.accountNumber));
                                if (mounted)
                                  setState(() =>
                                      _message = 'Nomor rekening disalin.');
                              }
                            : null,
                        icon: const Icon(Icons.copy_outlined)),
                  ]),
                  Text('a.n. ${_config?.accountHolder ?? '-'}',
                      style: const TextStyle(color: AppColors.textMuted)),
                ])),
            const SizedBox(height: 16),
            SectionCard(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                  const Text('Upload Bukti Transfer',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  if (_booking.paymentReviewNotes.isNotEmpty)
                    Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: ErrorText(
                            'Catatan admin: ${_booking.paymentReviewNotes}')),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                      onPressed: _loading ? null : _selectProof,
                      icon: const Icon(Icons.upload_file),
                      label: Text(_proof?.name ?? 'Pilih JPG, PNG, atau PDF')),
                  const SizedBox(height: 10),
                  PrimaryButton(
                      label:
                          _loading ? 'Mengirim...' : 'Kirim Bukti Pembayaran',
                      loading: _loading,
                      color: AppColors.primary,
                      onPressed: _proof?.bytes == null ||
                              _config?.accountNumber.isEmpty != false
                          ? null
                          : _submitProof),
                ])),
          ],
          if (_message != null)
            Padding(
                padding: const EdgeInsets.only(top: 14),
                child: Text(_message!,
                    style: const TextStyle(
                        color: AppColors.success,
                        fontWeight: FontWeight.w700))),
          if (_error != null)
            Padding(
                padding: const EdgeInsets.only(top: 14),
                child: ErrorText(_error)),
          const SizedBox(height: 12),
          TextButton(
              onPressed: () => appShellKey.currentState?.showBookings(),
              child: const Text('Kembali ke Cek Booking')),
        ],
      ),
    );
  }
}

class PaymentCountdown extends StatefulWidget {
  final DateTime deadline;
  final String label;
  final VoidCallback? onExpire;

  const PaymentCountdown(
      {super.key,
      required this.deadline,
      this.label = 'Batas Transfer',
      this.onExpire});

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
    final text =
        '${twoDigits(left.inHours)}:${twoDigits(left.inMinutes % 60)}:${twoDigits(left.inSeconds % 60)}';
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
            color: const Color(0xFFFFF7ED),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: const Color(0xFFFFEDD5))),
        child: Text('${widget.label}: $text',
            style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Color(0xFFC2410C))),
      ),
    );
  }
}
