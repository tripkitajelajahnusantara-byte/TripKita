import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:customer_mobile/config/app_config.dart';
import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/checkout_config.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/form_fields.dart';

/// Pembayaran booking. Selama menunggu pembayaran tampil "Selesaikan
/// Pembayaran": online lewat Midtrans Snap (VA, QRIS, e-wallet), atau
/// transfer manual + unggah bukti bila backend belum memakai Midtrans.
/// Setelah itu tampil "Status Pembayaran" (diverifikasi, berhasil, atau
/// berakhir). Kuota booking ditahan selama masa bayar.
class PaymentVerificationScreen extends StatefulWidget {
  final Booking booking;
  final String packageName;

  /// Data dari form pemesanan, untuk lembar "Detail Booking" sebelum
  /// backend mengembalikan data peserta.
  final BookingDraft? draft;
  final BookerContact? booker;
  final List<Participant>? participants;

  /// Langsung membuka halaman Midtrans begitu layar tampil (setelah booking
  /// baru dibuat).
  final bool openGatewayOnStart;

  const PaymentVerificationScreen({
    super.key,
    required this.booking,
    required this.packageName,
    this.draft,
    this.booker,
    this.participants,
    this.openGatewayOnStart = false,
  });

  @override
  State<PaymentVerificationScreen> createState() => _PaymentVerificationScreenState();
}

class _PaymentVerificationScreenState extends State<PaymentVerificationScreen> with WidgetsBindingObserver {
  late Booking _booking = widget.booking;
  CheckoutConfig? _config;
  PlatformFile? _proof;
  bool _loading = false;
  bool _checking = false;
  bool _gatewayOpened = false;
  bool _stepsOpen = true;
  bool _showStickyTimer = false;
  String? _error;
  Timer? _ticker;
  Timer? _statusTimer;
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadConfig();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
    _statusTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (_booking.status == BookingStatus.paymentReview ||
          (_booking.usesMidtrans && _booking.status == BookingStatus.pendingPayment)) {
        _checkStatus();
      }
    });
    _scroll.addListener(() {
      final show = _scroll.hasClients && _scroll.offset > 120;
      if (show != _showStickyTimer) setState(() => _showStickyTimer = show);
    });
    if (widget.openGatewayOnStart && _booking.usesMidtrans) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _payOnline());
    }
  }

  /// Customer kembali dari halaman Midtrans: status langsung diperbarui.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _checkStatus();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ticker?.cancel();
    _statusTimer?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadConfig() async {
    try {
      final value = await CheckoutConfig.load();
      if (mounted) setState(() => _config = value);
    } catch (e) {
      // Booking Midtrans tidak memakai rekening dari konfigurasi ini.
      if (mounted && !_booking.usesMidtrans) {
        setState(() => _error = e is ApiException ? e.message : 'Informasi pembayaran belum dapat dimuat.');
      }
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

  /// Endpoint pembayaran juga mencocokkan ulang status ke Midtrans, sehingga
  /// pembayaran yang notifikasinya terlambat langsung tercatat.
  Future<void> _checkOnlinePayment() async {
    if (_loading || _checking) return;
    setState(() {
      _checking = true;
      _error = null;
    });
    try {
      await ApiService.startMidtransPayment(_booking.bookingCode);
      final latest = await ApiService.trackBooking(_booking.bookingCode);
      if (!mounted) return;
      if (latest.status == BookingStatus.pendingPayment) {
        showSnack(context, 'Pembayaran belum kami terima. Bila sudah membayar, tunggu sebentar lalu cek lagi.');
      }
      setState(() => _booking = latest);
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiException ? e.message : 'Status pembayaran belum dapat diperiksa.');
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Future<void> _payOnline({bool changeMethod = false}) async {
    if (_loading) return;
    if (changeMethod) {
      final ok = await showConfirmDialog(
        context,
        icon: Icons.swap_horiz_rounded,
        iconColor: AppColors.primary,
        iconBackground: AppColors.accentLight,
        title: 'Ganti Metode Pembayaran?',
        message: const Text(
          'Kode QRIS atau nomor virtual account yang sudah dibuat akan dibatalkan, lalu Anda dapat memilih metode baru.\n\n'
          'Sudah terlanjur membayar? Ketuk Kembali, lalu "Cek status pembayaran".',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.6),
        ),
        cancelLabel: 'Kembali',
        confirmLabel: 'Ya, Ganti',
      );
      if (!ok || !mounted) return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final url = await ApiService.startMidtransPayment(_booking.bookingCode, changeMethod: changeMethod);
      if (url.isEmpty) {
        // Bukan _checkStatus(): fungsi itu berhenti selama _loading masih true.
        final latest = await ApiService.trackBooking(_booking.bookingCode);
        if (mounted) setState(() => _booking = latest);
      } else if (await openInAppBrowser(Uri.parse(url))) {
        if (mounted) setState(() => _gatewayOpened = true);
      } else if (mounted) {
        setState(() => _error = 'Halaman pembayaran tidak dapat dibuka.');
      }
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiException ? e.message : 'Halaman pembayaran belum dapat dibuka.');
    } finally {
      if (mounted) setState(() => _loading = false);
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
    });
    try {
      final updated = await ApiService.submitPaymentProof(_booking.bookingCode, proof!.bytes!, proof.name);
      if (!mounted) return;
      setState(() {
        _booking = updated;
        _proof = null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiException ? e.message : 'Bukti transfer belum dapat dikirim.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _goHome() {
    navigatorKey.currentState?.popUntil((route) => route.isFirst);
    appShellKey.currentState?.selectTab(AppTab.beranda);
  }

  void _showBookingDetail() {
    showDesignSheet<void>(
      context,
      title: 'Detail Booking',
      showClose: false,
      builder: (_) => BookingDetailSheet(
        booking: _booking,
        packageName: widget.packageName,
        draft: widget.draft,
        booker: widget.booker,
        participants: widget.participants,
      ),
    );
  }

  void _showHelp() {
    showDesignSheet<void>(
      context,
      title: 'Cara Membayar',
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        child: _PaymentSteps(steps: _steps),
      ),
    );
  }

  /// Halaman Midtrans sudah pernah dibuka, jadi metode mungkin sudah terkunci.
  bool get _paymentStarted => _gatewayOpened || _booking.paymentUrl.isNotEmpty;

  List<String> get _steps => _booking.usesMidtrans
      ? const [
          'Ketuk "Bayar Sekarang" untuk membuka halaman pembayaran Midtrans.',
          'Pilih metode: virtual account bank, QRIS, atau e-wallet.',
          'Selesaikan pembayaran sebelum batas waktu. Status pesanan diperbarui otomatis tanpa unggah bukti.',
        ]
      : [
          'Buka aplikasi bank atau ATM Anda.',
          'Pilih transfer ke rekening ${_config?.bankName ?? 'TemenTrip'} yang tertera di atas.',
          'Masukkan nominal sesuai tagihan, lalu simpan bukti transfer.',
        ];

  @override
  Widget build(BuildContext context) {
    final pending = _booking.status == BookingStatus.pendingPayment && !_booking.isPaymentExpired;
    return pending ? _buildPayment() : _buildStatus();
  }

  // ---------------------------------------------------------------------------
  // Selesaikan Pembayaran

  Widget _buildPayment() {
    final online = _booking.usesMidtrans;
    final deadline = _booking.paymentDeadline;
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: const Text('Selesaikan Pembayaran'),
        actions: [
          IconButton(
            tooltip: 'Cara membayar',
            onPressed: _showHelp,
            icon: const Icon(Icons.help_outline_rounded, color: AppColors.accent),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(children: [
        const CheckoutSteps(current: 1),
        if (_showStickyTimer && deadline != null)
          Container(
            width: double.infinity,
            color: AppColors.accent,
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Text('Selesaikan pembayaran dalam  ${_remaining(deadline)}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white)),
          ),
        Expanded(
          child: DefaultTextStyle.merge(
            style: figmaTextStyle,
            child: ListView(
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                _buildBookingCard(deadline),
                const SizedBox(height: 16),
                online ? _buildOnlineCard() : _buildTransferCard(),
                if (!online) ...[
                  const SizedBox(height: 24),
                  const SectionTitle('Unggah Bukti Transfer'),
                  const SizedBox(height: 12),
                  _buildUpload(),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  ErrorText(_error),
                ],
              ],
            ),
          ),
        ),
      ]),
      bottomNavigationBar: BottomActionBar(
        child: online
            ? Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                ElevatedButton(
                  onPressed: _loading || _checking ? null : _payOnline,
                  child: _loading
                      ? const _ButtonSpinner()
                      : Text(_paymentStarted ? 'Lanjutkan Pembayaran' : 'Bayar Sekarang'),
                ),
                const SizedBox(height: 4),
                TextButton(
                  onPressed: _loading || _checking ? null : _checkOnlinePayment,
                  child: Text(_checking ? 'Memeriksa pembayaran...' : 'Sudah bayar? Cek status pembayaran'),
                ),
              ])
            : ElevatedButton(
                onPressed: _loading || _proof?.bytes == null || _config?.accountNumber.isEmpty != false ? null : _submitProof,
                child: _loading ? const _ButtonSpinner() : const Text('Kirim Bukti Pembayaran'),
              ),
      ),
    );
  }

  String _remaining(DateTime deadline) {
    var left = deadline.difference(DateTime.now());
    if (left.isNegative) left = Duration.zero;
    return '${twoDigits(left.inHours)}:${twoDigits(left.inMinutes % 60)}:${twoDigits(left.inSeconds % 60)}';
  }

  Widget _buildBookingCard(DateTime? deadline) {
    return _Card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (deadline != null) ...[
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Selesaikan pembayaran', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                const SizedBox(height: 4),
                Text(formatDateTimeWib(deadline),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textDark)),
              ]),
            ),
            _CountdownBoxes(text: _remaining(deadline)),
          ]),
          const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: DashedLine(color: AppColors.border)),
        ],
        const Text('Kode Booking', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
        const SizedBox(height: 2),
        Row(children: [
          Expanded(
            child: Text(_booking.bookingCode,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textDark)),
          ),
          CopyChip(_booking.bookingCode, message: 'Kode booking disalin.'),
        ]),
        const SizedBox(height: 12),
        Text(widget.packageName,
            style: const TextStyle(fontSize: 16, height: 1.4, fontWeight: FontWeight.w500, color: AppColors.textMedium)),
        if (_scheduleLine != null) ...[
          const SizedBox(height: 4),
          _IconLine(icon: Icons.calendar_today_outlined, text: _scheduleLine!),
        ],
      ]),
    );
  }

  /// `25 – 27 Okt 2026 • 3 hari, 2 malam`
  String? get _scheduleLine {
    final start = _booking.tripDate ?? parseIsoDate(widget.draft?.startDate ?? '');
    if (start == null) return null;
    final end = _booking.tripEndDate ?? parseIsoDate(widget.draft?.endDate ?? '') ?? start;
    final days = dateOnly(end).difference(dateOnly(start)).inDays + 1;
    return '${formatDateRange(start, end)} • ${durationLabel(days)}';
  }

  Widget _buildOnlineCard() {
    return _Card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Total Pembayaran', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
        const SizedBox(height: 4),
        Text(formatPrice(_booking.totalPrice),
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
        const Divider(height: 28),
        Row(children: [
          const Expanded(child: Text('Metode Pembayaran', style: TextStyle(fontSize: 13, color: AppColors.textMuted))),
          // Snap mengunci metode setelah dipilih; tagihan lama perlu dihentikan dulu.
          if (_paymentStarted)
            TextButton.icon(
              onPressed: _loading || _checking ? null : () => _payOnline(changeMethod: true),
              icon: const Icon(Icons.swap_horiz_rounded, size: 18),
              label: const Text('Ganti Metode'),
              style: TextButton.styleFrom(
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
        ]),
        SizedBox(height: _paymentStarted ? 4 : 8),
        const Wrap(spacing: 6, runSpacing: 6, children: [
          _MethodChip(icon: Icons.account_balance_outlined, label: 'Virtual Account'),
          _MethodChip(icon: Icons.qr_code_2_rounded, label: 'QRIS'),
          _MethodChip(icon: Icons.account_balance_wallet_outlined, label: 'E-wallet'),
        ]),
        const SizedBox(height: 12),
        const InfoBanner(
          icon: Icons.verified_user_outlined,
          message: 'Pembayaran diproses aman oleh Midtrans. Pesanan terkonfirmasi otomatis setelah bayar, tanpa unggah bukti transfer.',
          color: AppColors.primaryDark,
          textColor: AppColors.textMedium,
          background: AppColors.accentSoft,
          border: AppColors.accentLight,
        ),
        if (AppConfig.isStaging) ...[
          const SizedBox(height: 8),
          const InfoBanner(
            icon: Icons.science_outlined,
            title: 'Mode uji (Midtrans Sandbox)',
            message: 'Tidak ada uang sungguhan yang ditarik. Bayar memakai simulator di simulator.sandbox.midtrans.com '
                'sesuai metode yang dipilih (mis. nomor VA atau QRIS).',
          ),
        ],
        const SizedBox(height: 4),
        _buildStepsToggle(),
      ]),
    );
  }

  Widget _buildTransferCard() {
    final config = _config;
    final account = config?.accountNumber ?? '';
    return _Card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Total yang Harus Ditransfer', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
        const SizedBox(height: 4),
        Text(formatPrice(_booking.totalPrice),
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
        const Divider(height: 28),
        const Text('Transfer ke:', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
        const SizedBox(height: 6),
        Text(config?.bankName ?? 'Memuat...',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textBody)),
        const SizedBox(height: 2),
        Text('a.n. ${config?.accountHolder ?? '-'}', style: const TextStyle(fontSize: 13, color: AppColors.textMedium)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
          decoration: BoxDecoration(color: AppColors.accentSoft, borderRadius: BorderRadius.circular(8)),
          child: Row(children: [
            Expanded(
              child: Text(account.isEmpty ? 'Belum dikonfigurasi' : account,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
            ),
            IconButton(
              tooltip: 'Salin nomor rekening',
              onPressed: account.isEmpty
                  ? null
                  : () async {
                      await Clipboard.setData(ClipboardData(text: account));
                      if (mounted) showSnack(context, 'Nomor rekening disalin.');
                    },
              icon: const Icon(Icons.copy_rounded, size: 20, color: AppColors.accent),
            ),
          ]),
        ),
        const SizedBox(height: 12),
        const InfoBanner(
          icon: Icons.info_outline,
          message: 'Cantumkan kode booking pada berita transfer agar pembayaran lebih cepat diverifikasi.',
          color: AppColors.primaryDark,
          textColor: AppColors.textMedium,
          background: Colors.white,
          border: AppColors.border,
        ),
        if (_booking.paymentReviewNotes.isNotEmpty) ...[
          const SizedBox(height: 8),
          ErrorText('Catatan admin: ${_booking.paymentReviewNotes}'),
        ],
        const SizedBox(height: 4),
        _buildStepsToggle(),
      ]),
    );
  }

  Widget _buildStepsToggle() {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      InkWell(
        onTap: () => setState(() => _stepsOpen = !_stepsOpen),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(children: [
            const Expanded(
              child: Text('Cara Membayar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
            ),
            Icon(_stepsOpen ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded, color: AppColors.textMedium),
          ]),
        ),
      ),
      if (_stepsOpen) _PaymentSteps(steps: _steps),
    ]);
  }

  Widget _buildUpload() {
    final proof = _proof;
    if (proof == null) {
      return _Card(
        child: InkWell(
          onTap: _loading ? null : _selectProof,
          borderRadius: BorderRadius.circular(8),
          child: CustomPaint(
            painter: _DashedBorderPainter(),
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              child: Column(children: [
                Icon(Icons.upload_file_rounded, color: AppColors.textMedium),
                SizedBox(height: 10),
                Text('Pilih file bukti transfer', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
                SizedBox(height: 4),
                Text('JPG, PNG, atau PDF (maks. 5 MB)', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ]),
            ),
          ),
        ),
      );
    }
    final sizeMb = (proof.size / (1024 * 1024)).toStringAsFixed(1);
    return _Card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Container(
            width: 36,
            height: 44,
            alignment: Alignment.bottomCenter,
            padding: const EdgeInsets.only(bottom: 6),
            decoration: BoxDecoration(color: AppColors.divider, borderRadius: BorderRadius.circular(4)),
            child: Text((proof.extension ?? '').toUpperCase(),
                style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: AppColors.textMedium)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_loading ? 'Mengunggah...' : proof.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textDark)),
              const SizedBox(height: 2),
              Text('$sizeMb MB', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ]),
          ),
          IconButton(
            tooltip: 'Hapus file',
            onPressed: _loading ? null : () => setState(() => _proof = null),
            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.dangerDark),
          ),
        ]),
        if (_loading) ...[
          const SizedBox(height: 10),
          const ClipRRect(
            borderRadius: BorderRadius.all(Radius.circular(4)),
            child: LinearProgressIndicator(minHeight: 6, color: AppColors.accent, backgroundColor: AppColors.accentLight),
          ),
        ],
      ]),
    );
  }

  // ---------------------------------------------------------------------------
  // Status Pembayaran

  Widget _buildStatus() {
    final paid = _booking.isPaidOrActive;
    final review = _booking.status == BookingStatus.paymentReview;
    final expired = _booking.isPaymentExpired;
    final IconData icon;
    final Color color;
    final Color tint;
    final Color halo;
    final String title;
    final String subtitle;
    if (paid) {
      icon = Icons.check_rounded;
      color = AppColors.success;
      tint = const Color(0xFFDCFCE7);
      halo = AppColors.successBg;
      title = 'Pembayaran Berhasil';
      subtitle = 'Pesanan Anda sudah diteruskan ke provider.';
    } else if (review) {
      icon = Icons.hourglass_bottom_rounded;
      color = AppColors.warningDark;
      tint = const Color(0xFFFEF3C7);
      halo = AppColors.warningBg;
      title = 'Pembayaran sedang Diverifikasi';
      subtitle = 'Diperiksa maksimal 1 × 24 jam. Notifikasi dikirim setelah selesai.';
    } else {
      icon = Icons.close_rounded;
      color = AppColors.dangerDark;
      tint = AppColors.dangerBg;
      halo = AppColors.dangerSoft;
      title = expired ? 'Waktu Pembayaran Habis' : bookingStatusStyle(_booking.status).label;
      subtitle = expired
          ? 'Kuota sudah dilepas. Silakan buat pesanan baru bila masih ingin berangkat.'
          : 'Lihat detail pesanan di menu Booking.';
    }

    return Scaffold(
      appBar: AppBar(titleSpacing: 0, title: const Text('Status Pembayaran')),
      body: DefaultTextStyle.merge(
        style: figmaTextStyle,
        child: RefreshIndicator(
          onRefresh: _checkStatus,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              _Card(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                child: Column(children: [
                  Container(
                    width: 92,
                    height: 92,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: halo, shape: BoxShape.circle),
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(color: tint, shape: BoxShape.circle),
                      child: Icon(icon, size: 34, color: color),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                  const SizedBox(height: 6),
                  Text(subtitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 13, height: 1.45, color: AppColors.textMuted)),
                  if (review && _booking.paymentReviewDeadline != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.schedule_rounded, size: 14, color: AppColors.textMedium),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text('Selesai sebelum ${formatDateTimeWib(_booking.paymentReviewDeadline!).split(', ').skip(1).join(', ')}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textBody)),
                        ),
                      ]),
                    ),
                  ],
                ]),
              ),
              const SizedBox(height: 16),
              _buildTicketSummary(),
            ],
          ),
        ),
      ),
      bottomNavigationBar: BottomActionBar(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (review) ...[
            ElevatedButton(onPressed: () => appShellKey.currentState?.showBookings(), child: const Text('Cek Booking')),
            const SizedBox(height: 8),
          ],
          OutlinedButton(onPressed: _goHome, child: const Text('Kembali ke Beranda')),
        ]),
      ),
    );
  }

  Widget _buildTicketSummary() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: const [BoxShadow(color: Color(0x0F102A33), blurRadius: 8, offset: Offset(0, 2))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          color: AppColors.accentSoft,
          padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
          child: Row(children: [
            const Icon(Icons.confirmation_number_outlined, color: AppColors.accent, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Kode Booking', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                const SizedBox(height: 2),
                Text(_booking.bookingCode,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textDark)),
              ]),
            ),
            CopyChip(_booking.bookingCode, message: 'Kode booking disalin.'),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(widget.packageName,
                style: const TextStyle(fontSize: 16, height: 1.4, fontWeight: FontWeight.w500, color: AppColors.textMedium)),
            if (_scheduleLine != null) ...[
              const SizedBox(height: 4),
              _IconLine(icon: Icons.calendar_today_outlined, text: _scheduleLine!),
            ],
            const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: DashedLine(color: AppColors.border)),
            Row(children: [
              const Expanded(child: Text('Total Pembayaran', style: TextStyle(fontSize: 13, color: AppColors.textMuted))),
              Text(formatPrice(_booking.totalPrice),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
            ]),
          ]),
        ),
        const SizedBox(height: 14),
        const Divider(height: 1),
        InkWell(
          onTap: _showBookingDetail,
          child: const Padding(
            padding: EdgeInsets.fromLTRB(16, 14, 12, 14),
            child: Row(children: [
              Expanded(
                child: Text('Detail Booking', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
              ),
              Icon(Icons.chevron_right_rounded, color: AppColors.accent),
            ]),
          ),
        ),
      ]),
    );
  }
}

/// Isi lembar "Detail Booking": rincian trip, data pemesan, dan peserta.
class BookingDetailSheet extends StatelessWidget {
  final Booking booking;
  final String packageName;
  final BookingDraft? draft;
  final BookerContact? booker;
  final List<Participant>? participants;

  const BookingDetailSheet({
    super.key,
    required this.booking,
    required this.packageName,
    this.draft,
    this.booker,
    this.participants,
  });

  @override
  Widget build(BuildContext context) {
    final pkg = booking.packageDetails ?? draft?.package;
    final start = booking.tripDate ?? parseIsoDate(draft?.startDate ?? '');
    final end = booking.tripEndDate ?? parseIsoDate(draft?.endDate ?? '') ?? start;
    final people = booking.participants.isNotEmpty ? booking.participants : (participants ?? const <Participant>[]);
    final name = booker?.name ?? booking.customerName;
    final email = booker?.email ?? booking.customerEmail;
    final phone = booker?.whatsapp ?? booking.customerPhone;
    final flexible = pkg?.isFlexiblePickup ?? people.any((p) => p.pickupPoint.isNotEmpty);
    const label = TextStyle(fontSize: 12, color: AppColors.textMuted);
    const value = TextStyle(fontSize: 14, color: AppColors.textMedium);
    const detail = TextStyle(fontSize: 12, height: 1.45, color: AppColors.textMuted);

    Widget card(Widget child) => Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.border),
          ),
          child: child,
        );

    return ListView(
      shrinkWrap: true,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        card(Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: NetworkPhoto(pkg == null || pkg.photos.isEmpty ? '' : pkg.photos.first, width: 56, height: 48),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (pkg != null)
                  Text('${pkg.tripType.isEmpty ? 'Open Trip' : pkg.tripType} • ${durationLabel(pkg.durationDays)}', style: label),
                const SizedBox(height: 2),
                Text(packageName, style: const TextStyle(fontSize: 15, height: 1.35, fontWeight: FontWeight.w500, color: AppColors.textDark)),
              ]),
            ),
          ]),
          const Divider(height: 24),
          const Text('Tanggal Keberangkatan', style: label),
          const SizedBox(height: 2),
          Text(start == null ? '-' : formatDateRange(start, end!), style: value),
          const Divider(height: 20),
          const Text('Jumlah Peserta', style: label),
          const SizedBox(height: 2),
          Text('${booking.guests > 0 ? booking.guests : people.length} orang', style: value),
        ])),
        const SizedBox(height: 16),
        const SectionTitle('Data Pemesan'),
        const SizedBox(height: 8),
        card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name.isEmpty ? '-' : name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: AppColors.textDark)),
          if (email.isNotEmpty) ...[const SizedBox(height: 4), Text(email, style: detail)],
          if (phone.isNotEmpty) Text(displayPhone(phone), style: detail),
        ])),
        if (people.isNotEmpty) ...[
          const SizedBox(height: 16),
          const SectionTitle('Data Peserta'),
          const SizedBox(height: 8),
          for (var i = 0; i < people.length; i++) ...[
            card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Peserta ${i + 1}', style: label),
              const SizedBox(height: 4),
              Text(people[i].name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: AppColors.textDark)),
              if (people[i].phone.isNotEmpty) ...[const SizedBox(height: 4), Text(displayPhone(people[i].phone), style: detail)],
              if (flexible) Text('Titik jemput: ${people[i].pickupPoint.isEmpty ? '-' : people[i].pickupPoint}', style: detail),
              Text('Riwayat penyakit & alergi: ${people[i].medicalHistory.trim().isEmpty ? '-' : people[i].medicalHistory.trim()}',
                  style: detail),
            ])),
            const SizedBox(height: 8),
          ],
        ],
      ],
    );
  }
}

class _Card extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const _Card({required this.child, this.padding = const EdgeInsets.all(16)});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}

class _IconLine extends StatelessWidget {
  final IconData icon;
  final String text;

  const _IconLine({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, size: 14, color: AppColors.textMuted),
      const SizedBox(width: 6),
      Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: AppColors.textMuted))),
    ]);
  }
}

/// Hitung mundur `HH : MM : SS` dalam kotak merah.
class _CountdownBoxes extends StatelessWidget {
  final String text;

  const _CountdownBoxes({required this.text});

  @override
  Widget build(BuildContext context) {
    final parts = text.split(':');
    Widget box(String v) => Container(
          constraints: const BoxConstraints(minWidth: 24),
          height: 24,
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(color: AppColors.dangerDark, borderRadius: BorderRadius.circular(4)),
          child: Text(v, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
        );
    const colon = Padding(
      padding: EdgeInsets.symmetric(horizontal: 3),
      child: Text(':', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.dangerDark)),
    );
    return Semantics(
      label: 'Sisa waktu pembayaran $text',
      child: Row(mainAxisSize: MainAxisSize.min, children: [box(parts[0]), colon, box(parts[1]), colon, box(parts[2])]),
    );
  }
}

class _MethodChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MethodChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: AppColors.accent),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textBody)),
      ]),
    );
  }
}

class _PaymentSteps extends StatelessWidget {
  final List<String> steps;

  const _PaymentSteps({required this.steps});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (var i = 0; i < steps.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 20, child: Text('${i + 1}.', style: const TextStyle(fontSize: 14, color: AppColors.textMedium))),
            Expanded(child: Text(steps[i], style: const TextStyle(fontSize: 14, height: 1.45, color: AppColors.textMedium))),
          ]),
        ),
    ]);
  }
}

class _ButtonSpinner extends StatelessWidget {
  const _ButtonSpinner();

  @override
  Widget build(BuildContext context) =>
      const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white));
}

class _DashedBorderPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.accentBorder
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;
    final path = Path()..addRRect(RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(8)));
    for (final metric in path.computeMetrics()) {
      for (double d = 0; d < metric.length; d += 9) {
        canvas.drawPath(metric.extractPath(d, d + 5), paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Hitung mundur berbentuk pil, dipakai daftar Booking.
class PaymentCountdown extends StatefulWidget {
  final DateTime deadline;
  final String label;
  final VoidCallback? onExpire;

  const PaymentCountdown({super.key, required this.deadline, this.label = 'Batas Transfer', this.onExpire});

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
            color: AppColors.dangerSoft,
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: const Color(0xFFFECACA))),
        child: Text('${widget.label}: $text',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.dangerDark)),
      ),
    );
  }
}
