import 'package:flutter/material.dart';

import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/screens/auth_screen.dart';
import 'package:customer_mobile/screens/payment_verification_screen.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';

/// Riwayat & pelacakan pesanan, padanan `CustomerHistoryPage` di web.
class BookingListScreen extends StatefulWidget {
  /// Berubah setiap kali tab Booking dibuka agar daftar dimuat ulang.
  final int refreshToken;
  final bool isActive;
  final VoidCallback onBrowseTrips;

  const BookingListScreen({super.key, required this.refreshToken, required this.isActive, required this.onBrowseTrips});

  @override
  State<BookingListScreen> createState() => _BookingListScreenState();
}

class _BookingListScreenState extends State<BookingListScreen> with WidgetsBindingObserver {
  final _codeController = TextEditingController();

  List<Booking> _bookings = [];
  bool _loading = true;
  String? _loadError;
  final Map<int, bool> _reviewed = {};

  Booking? _tracked;
  String? _trackingError;
  bool _tracking = false;

  int? _busyBookingId;
  int? _lastUserId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    AuthSession.instance.addListener(_onAuthChanged);
    _lastUserId = AuthSession.instance.profile?.id;
    _fetch();
  }

  @override
  void didUpdateWidget(covariant BookingListScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshToken != widget.refreshToken) _fetch();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    AuthSession.instance.removeListener(_onAuthChanged);
    _codeController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Kembali dari halaman pembayaran iPaymu: muat ulang status terbaru.
    if (state == AppLifecycleState.resumed && widget.isActive) _fetch();
  }

  void _onAuthChanged() {
    final id = AuthSession.instance.profile?.id;
    if (id == _lastUserId) return;
    _lastUserId = id;
    setState(() {
      _tracked = null;
      _trackingError = null;
      _codeController.clear();
    });
    _fetch();
  }

  bool get _isCustomer => AuthSession.instance.isLoggedIn;

  Future<void> _fetch() async {
    if (!_isCustomer) {
      setState(() {
        _bookings = [];
        _loading = false;
        _loadError = null;
      });
      return;
    }
    setState(() {
      _loading = _bookings.isEmpty;
      _loadError = null;
    });
    try {
      final data = await ApiService.fetchCustomerBookings();
      if (!mounted) return;
      setState(() {
        _bookings = data;
        _loading = false;
      });
      _loadReviewedFlags(data);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = '$e';
      });
    }
  }

  void _loadReviewedFlags(List<Booking> bookings) {
    for (final b in bookings.where((b) => b.isPaidOrActive && !_reviewed.containsKey(b.id))) {
      ApiService.isBookingReviewed(b.id).then((reviewed) {
        if (mounted && reviewed) setState(() => _reviewed[b.id] = true);
      }).catchError((_) {});
    }
  }

  Future<void> _track() async {
    FocusScope.of(context).unfocus();
    final code = _codeController.text.trim();
    setState(() {
      _trackingError = null;
      _tracked = null;
    });
    if (code.isEmpty) {
      setState(() => _trackingError = 'Silakan masukkan Kode Booking Anda terlebih dahulu.');
      return;
    }
    setState(() => _tracking = true);
    try {
      final result = await ApiService.trackBooking(code);
      if (mounted) setState(() => _tracked = result);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _trackingError = e.status == 401 || e.status == 403
          ? e.message
          : 'Kode booking tidak ditemukan. Mohon masukkan Kode Booking secara lengkap dan tepat (contoh: TK-2824-1889).');
    } finally {
      if (mounted) setState(() => _tracking = false);
    }
  }

  void _pay(Booking booking) {
    if (trustedPaymentUri(booking.paymentUrl) == null) {
      showNoticeDialog(
        context,
        title: 'Tautan Tidak Ditemukan',
        message: 'Tautan pembayaran iPaymu tidak ditemukan. Silakan lakukan pemesanan ulang.',
        isError: true,
      );
      return;
    }
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => PaymentVerificationScreen(booking: booking, packageName: booking.packageName, openImmediately: true),
    ));
  }

  Future<void> _cancel(Booking booking) async {
    if (!_isCustomer) {
      await showNoticeDialog(
        context,
        title: 'Pembatalan Tidak Tersedia',
        message: 'Pembatalan booking tamu harus dilakukan melalui layanan pelanggan untuk verifikasi identitas.',
        isError: true,
      );
      return;
    }
    final ok = await showConfirmDialog(
      context,
      icon: Icons.cancel_outlined,
      iconColor: AppColors.dangerDark,
      iconBackground: AppColors.dangerBg,
      title: 'Konfirmasi Pembatalan Pesanan',
      message: Text.rich(
        TextSpan(text: 'Apakah Anda yakin ingin membatalkan pesanan ', children: [
          TextSpan(text: booking.bookingCode, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark)),
          const TextSpan(text: '? Status pesanan akan diubah menjadi '),
          const TextSpan(text: 'Dibatalkan', style: TextStyle(fontWeight: FontWeight.w800)),
          const TextSpan(text: '.'),
        ]),
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.6),
      ),
      cancelLabel: 'Tidak (Kembali)',
      confirmLabel: 'Ya, Batalkan',
      confirmColor: AppColors.dangerDark,
    );
    if (!ok || !mounted) return;
    setState(() => _busyBookingId = booking.id);
    try {
      await ApiService.cancelBooking(booking.id);
      await _fetch();
      if (_tracked?.bookingCode == booking.bookingCode) _track();
    } catch (e) {
      if (mounted) {
        await showNoticeDialog(context, title: 'Gagal Membatalkan', message: 'Gagal membatalkan pesanan: $e', isError: true);
      }
    } finally {
      if (mounted) setState(() => _busyBookingId = null);
    }
  }

  Future<void> _respondReschedule(Booking booking, bool accept) async {
    final ok = await showConfirmDialog(
      context,
      icon: accept ? Icons.event_available_outlined : Icons.event_busy_outlined,
      iconColor: accept ? AppColors.successDark : AppColors.dangerDark,
      iconBackground: accept ? AppColors.successBg : AppColors.dangerBg,
      title: accept ? 'Terima Jadwal Pengganti?' : 'Tolak Jadwal Pengganti?',
      message: Text(
        accept
            ? 'Terima tanggal pengganti ini? Jadwal trip Anda akan diperbarui.'
            : 'Tolak tanggal pengganti ini? Pesanan Anda akan diteruskan ke proses pengembalian dana penuh.',
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.6),
      ),
      cancelLabel: 'Batal',
      confirmLabel: accept ? 'Ya, Terima' : 'Ya, Tolak',
      confirmColor: accept ? AppColors.successDark : AppColors.dangerDark,
    );
    if (!ok || !mounted) return;
    setState(() => _busyBookingId = booking.id);
    try {
      final message = await ApiService.respondToReschedule(booking.id, accept);
      if (mounted) {
        await showNoticeDialog(
          context,
          title: accept ? 'Jadwal Pengganti Diterima' : 'Jadwal Pengganti Ditolak',
          message: message,
          isError: !accept,
        );
      }
      await _fetch();
    } catch (e) {
      if (mounted) {
        await showNoticeDialog(
          context,
          title: 'Jawaban Gagal Dikirim',
          message: e is ApiException ? e.message : 'Jawaban Anda tidak dapat disimpan. Silakan coba lagi.',
          isError: true,
        );
      }
    } finally {
      if (mounted) setState(() => _busyBookingId = null);
    }
  }

  Future<void> _review(Booking booking) async {
    if (booking.status != BookingStatus.completed) {
      await showNoticeDialog(
        context,
        title: 'Ulasan Belum Aktif',
        message: 'Fitur ulasan dan penilaian bintang akan otomatis aktif setelah jadwal perjalanan (trip) Anda selesai dilaksanakan.',
      );
      return;
    }
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ReviewSheet(booking: booking),
    );
    if (sent == true && mounted) {
      setState(() => _reviewed[booking.id] = true);
      await showNoticeDialog(
        context,
        title: 'Ulasan Berhasil Terkirim!',
        message: 'Terima kasih! Ulasan dan penilaian bintang Anda telah berhasil dikirim dan tersimpan di database.',
      );
    }
  }

  /// Pesan ulang membuka paket yang sama bila datanya tersedia; bila paket
  /// sudah tidak aktif, arahkan ke pencarian.
  void _rebook(Booking booking) {
    final pkg = booking.packageDetails;
    if (pkg == null || pkg.id <= 0) {
      widget.onBrowseTrips();
      return;
    }
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => TripDetailScreen(package: pkg)));
  }

  Future<void> _openLogin() async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuthScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Booking Saya')),
      body: RefreshIndicator(
        onRefresh: () async {
          await _fetch();
          if (_tracked != null) await _track();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            _buildTracker(),
            const SizedBox(height: 24),
            Text(_isCustomer ? 'Riwayat Pemesanan Akun Anda' : 'Detail Status Pemesanan Tiket',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textDark)),
            const SizedBox(height: 14),
            if (_loading)
              const LoadingView('Sedang memuat riwayat pesanan...')
            else if (_loadError != null)
              EmptyState(
                icon: Icons.wifi_off_outlined,
                title: 'Riwayat Belum Dapat Dimuat',
                message: _loadError!,
                actions: [ElevatedButton(onPressed: _fetch, child: const Text('Coba Lagi'))],
              )
            else if (_bookings.isEmpty)
              EmptyState(
                icon: Icons.calendar_month_outlined,
                title: _isCustomer ? 'Belum Ada Pemesanan Terdaftar' : 'Melacak Tiket Pesanan (Mode Tamu)',
                message: _isCustomer
                    ? 'Anda belum memiliki riwayat transaksi di akun ini.'
                    : 'Anda saat ini mengakses tanpa akun. Masukkan Kode Booking yang telah Anda salin pada kolom pencarian di atas untuk melacak pesanan Anda.',
                actions: [
                  if (!_isCustomer)
                    ElevatedButton.icon(
                      onPressed: _openLogin,
                      icon: const Icon(Icons.key_outlined, size: 18),
                      label: const Text('Masuk ke Akun Saya'),
                    ),
                  OutlinedButton(onPressed: widget.onBrowseTrips, child: const Text('Cari Paket Wisata')),
                ],
              )
            else
              for (final b in _bookings) ...[
                _BookingCard(
                  booking: b,
                  busy: _busyBookingId == b.id,
                  reviewed: _reviewed[b.id] == true,
                  onPay: () => _pay(b),
                  onCancel: () => _cancel(b),
                  onReschedule: (accept) => _respondReschedule(b, accept),
                  onReview: () => _review(b),
                  onRebook: () => _rebook(b),
                  onExpire: () => setState(() {}),
                ),
                const SizedBox(height: 16),
              ],
          ],
        ),
      ),
    );
  }

  Widget _buildTracker() {
    final tracked = _tracked;
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Lacak Tiket Pesanan Anda',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
        const SizedBox(height: 6),
        const Text(
          'Ingin mencari pesanan Anda yang hilang? Masukkan Kode Booking (Contoh: TK-2824-xxxx) di bawah ini.',
          style: TextStyle(fontSize: 13, color: AppColors.textMuted),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _codeController,
          textCapitalization: TextCapitalization.characters,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => _track(),
          decoration: const InputDecoration(hintText: 'Masukkan Kode Booking Anda...'),
        ),
        const SizedBox(height: 10),
        ElevatedButton(
          onPressed: _tracking ? null : _track,
          style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
          child: Text(_tracking ? 'Melacak...' : 'Cari Tiket'),
        ),
        if (_trackingError != null) ...[
          const SizedBox(height: 10),
          Text(_trackingError!, style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600)),
        ],
        if (tracked != null) ...[
          const Divider(height: 32),
          const Text('Hasil Pencarian Tiket', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                Expanded(
                  child: Text(tracked.bookingCode, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                ),
                Flexible(child: StatusBadge(bookingStatusStyle(tracked.status))),
              ]),
              const SizedBox(height: 12),
              Text(tracked.packageName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('Tanggal: ${formatDateLong(tracked.tripDate)}   Peserta: ${tracked.guests} orang',
                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
              const Divider(height: 24),
              const Text('TOTAL HARGA', style: TextStyle(fontSize: 11, color: AppColors.textLight)),
              Text(formatIDR(tracked.totalPrice),
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.priceTeal)),
              if (tracked.status == BookingStatus.pendingPayment && !tracked.isPaymentExpired) ...[
                const SizedBox(height: 12),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  onPressed: () => _pay(tracked),
                  child: const Text('Selesaikan Pembayaran'),
                ),
              ],
              if (tracked.isPaidOrActive && whatsAppUri(_providerPhoneFor(tracked)) != null) ...[
                const SizedBox(height: 12),
                _WhatsAppButton(phone: _providerPhoneFor(tracked)),
              ],
            ]),
          ),
        ],
      ]),
    );
  }

  String _providerPhoneFor(Booking tracked) {
    if (tracked.providerWhatsApp.isNotEmpty) return tracked.providerWhatsApp;
    for (final b in _bookings) {
      if (b.bookingCode == tracked.bookingCode) return b.providerWhatsApp;
    }
    return '';
  }
}

class _BookingCard extends StatelessWidget {
  final Booking booking;
  final bool busy;
  final bool reviewed;
  final VoidCallback onPay;
  final VoidCallback onCancel;
  final ValueChanged<bool> onReschedule;
  final VoidCallback onReview;
  final VoidCallback onRebook;
  final VoidCallback onExpire;

  const _BookingCard({
    required this.booking,
    required this.busy,
    required this.reviewed,
    required this.onPay,
    required this.onCancel,
    required this.onReschedule,
    required this.onReview,
    required this.onRebook,
    required this.onExpire,
  });

  @override
  Widget build(BuildContext context) {
    final b = booking;
    final expired = b.isPaymentExpired;
    final style = bookingStatusStyle(expired ? BookingStatus.expired : b.status);
    final tripDate = formatDateLong(b.tripDate);

    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Text(b.bookingCode, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textDark)),
          const SizedBox(width: 8),
          Text(formatDayMonth(b.createdAt), style: const TextStyle(fontSize: 12, color: AppColors.textLight)),
          const SizedBox(width: 8),
          Expanded(child: Align(alignment: Alignment.centerRight, child: StatusBadge(style))),
        ]),
        const SizedBox(height: 12),
        Text(b.packageName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
        const SizedBox(height: 4),
        Text('Tanggal: $tripDate   Peserta: ${b.guests} orang',
            style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
        if (b.status == BookingStatus.rescheduleOffered && b.rescheduleDate != null) ...[
          const SizedBox(height: 14),
          _rescheduleBlock(tripDate),
        ],
        if (b.status == BookingStatus.pendingPayment) ...[
          const SizedBox(height: 14),
          expired ? _expiredBlock() : _pendingBlock(),
        ],
        if (b.status == BookingStatus.cancelledByCustomer || b.status == 'CANCELLED') ...[
          const SizedBox(height: 14),
          _cancelledBlock(),
        ],
        const SizedBox(height: 14),
        const Divider(height: 1),
        const SizedBox(height: 12),
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('TOTAL HARGA', style: TextStyle(fontSize: 10, color: AppColors.textLight)),
            Text(formatIDR(b.totalPrice),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.priceTeal)),
          ]),
        ]),
        if (b.isPaidOrActive) ...[
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [
            if (whatsAppUri(b.providerWhatsApp) != null) _WhatsAppButton(phone: b.providerWhatsApp),
            _reviewButton(),
          ]),
        ],
      ]),
    );
  }

  Widget _reviewButton() {
    if (reviewed) {
      return OutlinedButton(
        onPressed: null,
        style: OutlinedButton.styleFrom(
          disabledBackgroundColor: AppColors.divider,
          disabledForegroundColor: AppColors.textMuted,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        child: const Text('✓ Sudah Diulas'),
      );
    }
    final finished = booking.status == BookingStatus.completed;
    return OutlinedButton(
      onPressed: onReview,
      style: OutlinedButton.styleFrom(
        backgroundColor: finished ? Colors.white : AppColors.background,
        foregroundColor: finished ? AppColors.warningDark : AppColors.textLight,
        side: BorderSide(color: finished ? AppColors.warning : AppColors.borderStrong, width: finished ? 1.5 : 1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: Text('⭐ Beri Ulasan ${finished ? '(Aktif)' : '(Terkunci)'}'),
    );
  }

  Widget _rescheduleBlock(String tripDate) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.warningBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.warningBorder, width: 1.5),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Row(children: [
          Icon(Icons.error_outline, size: 16, color: AppColors.warningDark),
          SizedBox(width: 6),
          Expanded(
            child: Text('Penyelenggara Menawarkan Tanggal Pengganti',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFFB45309))),
          ),
        ]),
        const SizedBox(height: 10),
        Text.rich(
          TextSpan(
            text: 'Keberangkatan ',
            children: [
              TextSpan(text: tripDate, style: const TextStyle(fontWeight: FontWeight.w800)),
              const TextSpan(text: ' tidak dapat dijalankan. Penyelenggara menawarkan tanggal pengganti '),
              TextSpan(
                text: formatDateLong(booking.rescheduleDate),
                style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFB45309)),
              ),
              const TextSpan(text: '.'),
            ],
          ),
          style: const TextStyle(fontSize: 13, color: Color(0xFF7C2D12), height: 1.6),
        ),
        if (booking.cancellationReason.isNotEmpty) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.warningBorder),
            ),
            child: Text.rich(
              TextSpan(text: 'Sebab: ', style: const TextStyle(fontWeight: FontWeight.w800), children: [
                TextSpan(text: booking.cancellationReason, style: const TextStyle(fontWeight: FontWeight.w400)),
              ]),
              style: const TextStyle(fontSize: 12.5, color: Color(0xFF7C2D12), height: 1.5),
            ),
          ),
        ],
        const SizedBox(height: 10),
        const Text('Jika Anda menolak, pesanan akan diteruskan ke proses pengembalian dana penuh.',
            style: TextStyle(fontSize: 12.5, color: AppColors.warningText, height: 1.5)),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.successDark,
                padding: const EdgeInsets.symmetric(vertical: 11),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
              onPressed: busy ? null : () => onReschedule(true),
              child: const Text('Terima Jadwal Pengganti', textAlign: TextAlign.center),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.dangerDark,
                backgroundColor: Colors.white,
                side: const BorderSide(color: AppColors.dangerBorder, width: 1.5),
                padding: const EdgeInsets.symmetric(vertical: 11),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
              onPressed: busy ? null : () => onReschedule(false),
              child: const Text('Tolak & Minta Refund', textAlign: TextAlign.center),
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _expiredBlock() {
    return _redBlock(
      title: 'Batas Waktu Pembayaran Habis (Kadaluwarsa)',
      tag: 'KADALUWARSA',
      message:
          'Batas waktu pembayaran 24 jam untuk transaksi ini telah kadaluwarsa. Silakan lakukan pemesanan ulang jika Anda ingin mengikuti trip ini.',
      action: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.dangerDark,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
        ),
        onPressed: onRebook,
        child: const Text('Pesan Ulang Trip Ini'),
      ),
    );
  }

  Widget _cancelledBlock() {
    return _redBlock(
      title: 'Pesanan Dibatalkan oleh Pelanggan',
      tag: 'DIBATALKAN',
      message:
          'Pesanan ini telah Anda batalkan. Jika Anda ingin mengikuti trip ini kembali, Anda dapat melakukan pemesanan ulang.',
    );
  }

  Widget _redBlock({required String title, required String tag, required String message, Widget? action}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.dangerSoft,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.dangerBorder, width: 1.5),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Padding(
            padding: EdgeInsets.only(top: 1),
            child: Icon(Icons.cancel_outlined, size: 16, color: AppColors.dangerDark),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(title,
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFFB91C1C))),
          ),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(20)),
            child: Text(tag, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.dangerDark)),
          ),
        ]),
        const SizedBox(height: 8),
        Text(message, style: const TextStyle(fontSize: 13, color: AppColors.dangerText, height: 1.5)),
        if (action != null) ...[const SizedBox(height: 12), action],
      ]),
    );
  }

  Widget _pendingBlock() {
    final b = booking;
    Widget info(String label, String value) => Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text.rich(TextSpan(
            text: '$label ',
            style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            children: [TextSpan(text: value, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textStrong))],
          )),
        );

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F9FF),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary, width: 1.5),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Informasi Pembayaran iPaymu:',
            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: AppColors.primaryDark)),
        if (b.paymentDeadline != null) ...[
          const SizedBox(height: 8),
          PaymentCountdown(deadline: b.paymentDeadline!, onExpire: onExpire),
        ],
        const SizedBox(height: 10),
        Text.rich(
          TextSpan(text: 'Silakan lakukan pembayaran sebesar ', children: [
            TextSpan(
              text: formatIDR(b.totalPrice),
              style: const TextStyle(color: AppColors.primary, fontSize: 15, fontWeight: FontWeight.w800),
            ),
            const TextSpan(text: ' melalui checkout resmi iPaymu.'),
          ]),
          style: const TextStyle(fontSize: 13, color: AppColors.textDark),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBAE6FD)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (b.packageDetails != null) ...[
              info('Tipe Trip:', b.packageDetails!.tripType.isNotEmpty ? b.packageDetails!.tripType : 'Open Trip'),
              if (b.packageDetails!.category.isNotEmpty) info('Kategori:', b.packageDetails!.category),
            ],
            info('Tujuan Trip:', b.packageDetails?.destination.isNotEmpty == true ? b.packageDetails!.destination : b.packageName),
            info('Nama Pemesan:', b.customerName.isNotEmpty ? b.customerName : 'Pelanggan TripKita'),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    backgroundColor: AppColors.dangerBg,
                    foregroundColor: AppColors.dangerDark,
                    side: const BorderSide(color: AppColors.dangerBorder),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  onPressed: busy ? null : onCancel,
                  child: Text(busy ? 'Membatalkan...' : 'Batalkan'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  onPressed: busy ? null : onPay,
                  child: const Text('Selesaikan Pembayaran'),
                ),
              ),
            ]),
          ]),
        ),
      ]),
    );
  }
}

class _WhatsAppButton extends StatelessWidget {
  final String phone;

  const _WhatsAppButton({required this.phone});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.whatsapp,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
      ),
      onPressed: () {
        final uri = whatsAppUri(phone);
        if (uri != null) openExternal(uri);
      },
      icon: const Icon(Icons.chat_bubble_outline, size: 15),
      label: const Text('Hubungi Provider'),
    );
  }
}

class _ReviewSheet extends StatefulWidget {
  final Booking booking;

  const _ReviewSheet({required this.booking});

  @override
  State<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends State<_ReviewSheet> {
  final _comment = TextEditingController();
  int _stars = 5;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ApiService.submitReview(bookingId: widget.booking.id, rating: _stars, comment: _comment.text.trim());
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _sending = false;
          _error = e is ApiException ? e.message : 'Gagal menyimpan ulasan ke database.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Beri Ulasan & Rating', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text.rich(
            TextSpan(text: 'Bagikan pengalaman seru Anda mengikuti trip ', children: [
              TextSpan(text: widget.booking.packageName, style: const TextStyle(fontWeight: FontWeight.w800)),
              const TextSpan(text: '!'),
            ]),
            style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
          ),
          const SizedBox(height: 16),
          const FieldLabel('Pilih Bintang Rating:'),
          Row(children: [
            for (var s = 1; s <= 5; s++)
              IconButton(
                onPressed: () => setState(() => _stars = s),
                icon: Icon(s <= _stars ? Icons.star : Icons.star_border,
                    size: 32, color: s <= _stars ? AppColors.warning : AppColors.borderStrong),
              ),
          ]),
          const SizedBox(height: 10),
          const FieldLabel('Tulis Ulasan Anda:'),
          TextField(
            controller: _comment,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Ceritakan keseruan trip, pelayanan tour guide, dan fasilitasnya...',
            ),
          ),
          ErrorText(_error),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(
              child: OutlinedButton(onPressed: _sending ? null : () => Navigator.pop(context), child: const Text('Batal')),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                onPressed: _sending ? null : _send,
                child: Text(_sending ? 'Mengirim...' : 'Kirim Ulasan'),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}
