import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:customer_mobile/config/app_config.dart';
import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/screens/booking_detail_screen.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/checkout_config.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:customer_mobile/widgets/common.dart';

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

  /// Dibuka dari tab Booking: kode booking di bawah judul, tombol
  /// "Hubungi Provider" atau "Pesan Ulang" alih-alih kembali ke beranda.
  final bool fromList;
  final VoidCallback? onRebook;

  const PaymentVerificationScreen({
    super.key,
    required this.booking,
    required this.packageName,
    this.draft,
    this.booker,
    this.participants,
    this.openGatewayOnStart = false,
    this.fromList = false,
    this.onRebook,
  });

  @override
  State<PaymentVerificationScreen> createState() => _PaymentVerificationScreenState();
}

class _PaymentVerificationScreenState extends State<PaymentVerificationScreen> with WidgetsBindingObserver {
  late Booking _booking = widget.booking;
  CheckoutConfig? _config;
  PlatformFile? _proof;
  bool _loading = false;

  /// Perkiraan progres unggah bukti (0-1) selama permintaan dikirim.
  double _uploadProgress = 0;
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

  /// Customer kembali dari halaman Midtrans: status langsung dicocokkan ulang
  /// ke Midtrans agar pembayaran yang notifikasinya terlambat tetap tercatat.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    if (_booking.usesMidtrans && _booking.status == BookingStatus.pendingPayment && _paymentStarted) {
      _checkOnlinePayment(silent: true);
    } else {
      _checkStatus();
    }
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
  Future<void> _checkOnlinePayment({bool silent = false}) async {
    if (_loading || _checking) return;
    setState(() {
      _checking = true;
      if (!silent) _error = null;
    });
    try {
      await ApiService.startMidtransPayment(_booking.bookingCode);
      final latest = await ApiService.trackBooking(_booking.bookingCode);
      if (!mounted) return;
      if (!silent && latest.status == BookingStatus.pendingPayment) {
        showTopToast(context, 'Pembayaran belum kami terima. Bila sudah membayar, tunggu sebentar lalu cek lagi.');
      }
      setState(() => _booking = latest);
    } catch (e) {
      if (mounted && !silent) {
        setState(() => _error = e is ApiException ? e.message : 'Status pembayaran belum dapat diperiksa.');
      }
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
      if (url.isNotEmpty && !isAllowedPaymentUrl(url)) {
        if (mounted) {
          setState(() => _error = 'Mode uji hanya boleh memakai Midtrans Sandbox, tetapi server mengirim halaman '
              'pembayaran sungguhan. Pembayaran tidak dibuka agar tidak ada uang yang ditarik. Hubungi tim TemenTrip.');
        }
        return;
      }
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
    if (_loading) return;
    if (proof?.bytes == null) {
      setState(() => _error = 'Pilih file bukti transfer terlebih dahulu.');
      return;
    }
    setState(() {
      _loading = true;
      _uploadProgress = 0;
      _error = null;
    });
    // shortcut: progres diperkirakan dari waktu (mendekati 90%) karena klien http
    // tidak melaporkan byte terkirim; ganti dengan progres nyata bila API mendukung.
    final progress = Timer.periodic(const Duration(milliseconds: 120), (_) {
      if (mounted) setState(() => _uploadProgress += (0.9 - _uploadProgress) * 0.08);
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
      progress.cancel();
      if (mounted) setState(() => _loading = false);
    }
  }

  void _goHome() {
    navigatorKey.currentState?.popUntil((route) => route.isFirst);
    appShellKey.currentState?.selectTab(AppTab.beranda);
  }

  void _showBookingDetail() {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => BookingDetailScreen(
        booking: _booking,
        packageName: widget.packageName,
        draft: widget.draft,
        booker: widget.booker,
        participants: widget.participants,
      ),
    ));
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
          'Pilih virtual account bank, QRIS, atau e-wallet, lalu ikuti petunjuknya sebelum batas waktu.',
          'Setelah membayar, tutup halaman Midtrans. Status pesanan diperbarui otomatis.',
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
        // Ikon bantuan berpusat di x 338 agar judul tidak terpotong.
        actions: [
          IconButton(
            tooltip: 'Cara membayar',
            onPressed: _showHelp,
            constraints: const BoxConstraints.tightFor(width: 40, height: 40),
            padding: EdgeInsets.zero,
            icon: const AppIcon('question', color: AppColors.accentBright),
          ),
          const SizedBox(width: 1.7),
        ],
      ),
      body: Column(children: [
        // Saat digulir, langkah checkout diganti bilah hitung mundur.
        if (_showStickyTimer && deadline != null)
          Container(
            width: double.infinity,
            height: 34,
            color: AppColors.accent,
            alignment: Alignment.center,
            child: Text.rich(
              TextSpan(text: 'Selesaikan pembayaran dalam  ', children: [
                TextSpan(
                  text: _remaining(deadline),
                  style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
                ),
              ]),
              style: const TextStyle(
                  fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w500, color: AppColors.accentLight),
            ),
          )
        else
          const CheckoutSteps(current: 1),
        Expanded(
          child: DefaultTextStyle.merge(
            style: figmaTextStyle,
            child: ListView(
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
              children: [
                _buildBookingCard(deadline),
                const SizedBox(height: 24),
                online ? _buildOnlineCard() : _buildTransferCard(),
                if (!online) ...[
                  const SizedBox(height: 24),
                  const SectionTitle('Unggah Bukti Transfer'),
                  const SizedBox(height: 12),
                  _buildUpload(),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  NoteBox(text: _error, tone: NoteTone.danger, shadow: false),
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
                const SizedBox(height: 8),
                TextButton(
                  style: TextButton.styleFrom(foregroundColor: AppColors.accent, minimumSize: const Size.fromHeight(36)),
                  onPressed: _loading || _checking ? null : _checkOnlinePayment,
                  child: Text(_checking ? 'Memeriksa pembayaran...' : 'Sudah bayar? Cek status pembayaran',
                      style: const TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600)),
                ),
              ])
            : ElevatedButton(
                onPressed: _loading || _config?.accountNumber.isEmpty != false ? null : _submitProof,
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
          Row(children: [
            const Expanded(child: Text('Selesaikan pembayaran', style: _label)),
            _CountdownBoxes(text: _remaining(deadline)),
          ]),
          const SizedBox(height: 3),
          Text(formatDateTimeWib(deadline),
              style:
                  const TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w500, color: AppColors.textDark)),
          const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: DashedLine(color: AppColors.border)),
        ],
        const Text('Kode Booking', style: _label),
        SizedBox(
          height: 28,
          child: Row(children: [
            Expanded(
              child: Text(_booking.bookingCode,
                  style: const TextStyle(
                      fontSize: 16, height: 1.5, fontWeight: FontWeight.w700, color: AppColors.textDark)),
            ),
            CopyChip(_booking.bookingCode, message: 'Kode booking disalin.'),
          ]),
        ),
        const SizedBox(height: 12),
        _PackageLines(name: widget.packageName, schedule: _scheduleLine),
      ]),
    );
  }

  static const _label = TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted);

  /// `25 – 27 Okt 2026 • 3 hari`
  String? get _scheduleLine {
    final start = _booking.tripDate ?? parseIsoDate(widget.draft?.startDate ?? '');
    if (start == null) return null;
    final end = _booking.tripEndDate ?? parseIsoDate(widget.draft?.endDate ?? '') ?? start;
    final days = dateOnly(end).difference(dateOnly(start)).inDays + 1;
    return '${formatDateRange(start, end)} • $days hari';
  }

  Widget _buildOnlineCard() {
    return _Card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Total Pembayaran', style: _label),
        const SizedBox(height: 2),
        Text(formatPrice(_booking.totalPrice),
            style: const TextStyle(
                fontSize: 24, height: 32 / 24, fontWeight: FontWeight.w700, color: AppColors.primaryDark)),
        const Padding(padding: EdgeInsets.symmetric(vertical: 15), child: Divider(height: 1)),
        SizedBox(
          height: 24,
          child: Row(children: [
            const Expanded(child: Text('Metode Pembayaran', style: _label)),
            // Snap mengunci metode setelah dipilih; tagihan lama perlu dihentikan dulu.
            if (_paymentStarted)
              InkWell(
                borderRadius: BorderRadius.circular(4),
                onTap: _loading || _checking ? null : () => _payOnline(changeMethod: true),
                child: const Text('Ganti Metode',
                    style: TextStyle(
                        fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600, color: AppColors.accent)),
              ),
          ]),
        ),
        const SizedBox(height: 8),
        const Wrap(spacing: 8, runSpacing: 8, children: [
          _MethodPill('Virtual Account'),
          _MethodPill('QRIS'),
          _MethodPill('E-wallet'),
        ]),
        const SizedBox(height: 16),
        const NoteBox(
          text: 'Pembayaran diproses aman oleh Midtrans. Pesanan terkonfirmasi otomatis setelah bayar, '
              'tanpa unggah bukti transfer.',
          tone: NoteTone.plain,
        ),
        if (AppConfig.isStaging) ...[
          const SizedBox(height: 8),
          const NoteBox(
            span: TextSpan(children: [
              TextSpan(text: 'Mode uji (Midtrans Sandbox). ', style: TextStyle(fontWeight: FontWeight.w600)),
              TextSpan(
                  text: 'Tidak ada uang sungguhan yang ditarik. Bayar lewat simulator.sandbox.midtrans.com '
                      'memakai nomor VA atau kode QRIS yang tampil di halaman Midtrans.'),
            ]),
            tone: NoteTone.warning,
            shadow: false,
          ),
        ],
        const SizedBox(height: 16),
        _buildStepsToggle(),
      ]),
    );
  }

  Widget _buildTransferCard() {
    final config = _config;
    final account = config?.accountNumber ?? '';
    final bank = config?.bankName ?? 'Memuat...';
    return _Card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Total yang Harus Ditransfer', style: _label),
        const SizedBox(height: 2),
        Text(formatPrice(_booking.totalPrice),
            style: const TextStyle(
                fontSize: 24, height: 32 / 24, fontWeight: FontWeight.w700, color: AppColors.primaryDark)),
        const Padding(padding: EdgeInsets.symmetric(vertical: 15), child: Divider(height: 1)),
        const Text('Transfer ke:', style: _label),
        const SizedBox(height: 9),
        // Blok bank setinggi 50: nama, jarak 4, pemilik rekening; logo di tengah.
        SizedBox(
          height: 50,
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(bank,
                    style: const TextStyle(
                        fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.textBody)),
                const SizedBox(height: 4),
                Text('a.n. ${config?.accountHolder ?? '-'}',
                    style: const TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMedium)),
              ]),
            ),
            if (bank.toUpperCase().contains('OCBC')) const AppIcon('bank_ocbc', size: 46, height: 32),
          ]),
        ),
        const SizedBox(height: 8),
        Container(
          height: 48,
          padding: const EdgeInsets.only(left: 12, right: 2),
          decoration: BoxDecoration(color: AppColors.accentSoft, borderRadius: BorderRadius.circular(8)),
          child: Row(children: [
            Expanded(
              child: Text(account.isEmpty ? 'Belum dikonfigurasi' : account,
                  style: const TextStyle(
                      fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.textDark)),
            ),
            IconButton(
              tooltip: 'Salin nomor rekening',
              onPressed: account.isEmpty
                  ? null
                  : () async {
                      await Clipboard.setData(ClipboardData(text: account));
                      if (mounted) showTopToast(context, 'Nomor rekening disalin.');
                    },
              icon: const AppIcon('copy', size: 16, color: AppColors.accent),
            ),
          ]),
        ),
        const SizedBox(height: 16),
        const NoteBox(
          text: 'Cantumkan kode booking pada berita transfer agar pembayaran lebih cepat diverifikasi.',
          tone: NoteTone.plain,
        ),
        if (_booking.paymentReviewNotes.isNotEmpty) ...[
          const SizedBox(height: 8),
          ErrorText('Catatan admin: ${_booking.paymentReviewNotes}'),
        ],
        const SizedBox(height: 16),
        _buildStepsToggle(),
      ]),
    );
  }

  Widget _buildStepsToggle() {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      InkWell(
        onTap: () => setState(() => _stepsOpen = !_stepsOpen),
        child: SizedBox(
          height: 24,
          child: Row(children: [
            const Expanded(
              child: Text('Cara Membayar',
                  style: TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.textDark)),
            ),
            AppIcon(_stepsOpen ? 'chevron_up' : 'chevron_down', color: AppColors.icon),
          ]),
        ),
      ),
      if (_stepsOpen) ...[
        const SizedBox(height: 8),
        _PaymentSteps(steps: _steps),
      ],
    ]);
  }

  Widget _buildUpload() {
    final proof = _proof;
    if (proof == null) {
      return _Card(
        child: InkWell(
          onTap: _loading ? null : _selectProof,
          child: CustomPaint(
            painter: _DashedBorderPainter(),
            child: SizedBox(
              height: 134,
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Container(
                  width: 32,
                  height: 32,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors.border),
                    boxShadow: const [BoxShadow(color: Color(0x0D0A0D12), offset: Offset(0, 1), blurRadius: 2)],
                  ),
                  child: const AppIcon('upload', size: 16, color: AppColors.textMedium),
                ),
                const SizedBox(height: 12),
                const Text('Pilih file bukti transfer',
                    style:
                        TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600, color: AppColors.accent)),
                const SizedBox(height: 4),
                const Text('JPG, PNG, atau PDF (max. 5MB)',
                    style: TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMuted)),
              ]),
            ),
          ),
        ),
      );
    }
    final sizeMb = '${(proof.size / (1024 * 1024)).toStringAsFixed(1)} MB';
    const name = TextStyle(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w500, color: AppColors.textDark);
    const size = TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMedium);
    final delete = IconButton(
      tooltip: 'Hapus file',
      onPressed: _loading ? null : () => setState(() => _proof = null),
      icon: const AppIcon('trash', size: 20, color: AppColors.dangerDark),
    );
    return _Card(
      child: Container(
        padding: const EdgeInsets.fromLTRB(15, 15, 3, 15),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border),
        ),
        child: _loading
            // Sedang dikirim: nama diganti "Uploading..." dan bilah progres.
            ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Uploading...', style: name),
                      const SizedBox(height: 2),
                      Text(sizeMb, style: size),
                    ]),
                  ),
                  delete,
                ]),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: _uploadProgress,
                        minHeight: 8,
                        color: AppColors.accent,
                        backgroundColor: AppColors.background,
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 58,
                    child: Text('${(_uploadProgress * 100).round()}%',
                        textAlign: TextAlign.right,
                        style: const TextStyle(
                            fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: AppColors.textMedium)),
                  ),
                  const SizedBox(width: 13),
                ]),
              ])
            : Row(children: [
                const SizedBox(width: 5),
                _FileBadge(extension: proof.extension ?? ''),
                const SizedBox(width: 17),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(proof.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: name),
                    const SizedBox(height: 2),
                    Text(sizeMb, style: size),
                  ]),
                ),
                delete,
              ]),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Status Pembayaran

  Widget _buildStatus() {
    final paid = _booking.isPaidOrActive;
    final review = _booking.status == BookingStatus.paymentReview;
    final expired = _booking.isPaymentExpired;
    final StatusKind kind;
    final String title;
    final String subtitle;
    if (paid) {
      kind = StatusKind.success;
      title = 'Pembayaran Berhasil';
      subtitle = 'Pesanan Anda sudah diteruskan provider.';
    } else if (review) {
      kind = StatusKind.pending;
      title = 'Pembayaran sedang Diverifikasi';
      subtitle = 'Diperiksa maksimal 1 × 24 jam. Notifikasi dikirim setelah selesai.';
    } else {
      kind = StatusKind.failed;
      title = expired ? 'Pembayaran Gagal' : bookingStatusStyle(_booking.status).label;
      subtitle = expired ? 'Batas waktu pembayaran sudah terlewati.' : 'Lihat detail pesanan di menu Booking.';
    }

    final failed = kind == StatusKind.failed;
    final whatsapp = whatsAppUri(_booking.providerWhatsApp);
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: widget.fromList
          ? AppBar(
              leadingWidth: 72,
              titleSpacing: -7,
              toolbarHeight: 56,
              title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Status Pembayaran',
                    style: TextStyle(
                        fontSize: 20, height: 28 / 20, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                const SizedBox(height: 6),
                Text('Kode Booking: ${_booking.bookingCode}',
                    style: const TextStyle(
                        fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w500, color: Color(0xFF667085))),
              ]),
            )
          : AppBar(titleSpacing: 0, title: const Text('Status Pembayaran')),
      body: DefaultTextStyle.merge(
        style: figmaTextStyle,
        child: RefreshIndicator(
          onRefresh: _checkStatus,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
            children: [
              StatusHero(
                kind: kind,
                title: title,
                subtitle: subtitle,
                deadline: review ? _booking.paymentReviewDeadline : null,
              ),
              SizedBox(height: failed ? 24 : 16),
              BookingTicketSummary(
                booking: _booking,
                packageName: widget.packageName,
                schedule: _scheduleLine,
                onDetail: _showBookingDetail,
                showCode: !failed,
              ),
              if (failed && widget.fromList) ...[
                const SizedBox(height: 24),
                const NoteBox(
                  text:
                      'Pesan ulang untuk mengisi trip dan tanggal yang sama. Ketersediaan kuota dicek sebelum memesan.',
                ),
              ],
            ],
          ),
        ),
      ),
      bottomNavigationBar: BottomActionBar(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (widget.fromList && failed)
            ElevatedButton(onPressed: widget.onRebook, child: const Text('Pesan Ulang'))
          else if (widget.fromList) ...[
            if (whatsapp != null)
              OutlinedButton(onPressed: () => openExternal(whatsapp), child: const Text('Hubungi Provider'))
            else
              OutlinedButton(onPressed: _goHome, child: const Text('Kembali ke Beranda')),
          ] else ...[
            if (review) ...[
              ElevatedButton(
                  onPressed: () => appShellKey.currentState?.showBookings(), child: const Text('Cek Booking')),
              const SizedBox(height: 8),
            ],
            OutlinedButton(onPressed: _goHome, child: const Text('Kembali ke Beranda')),
          ],
        ]),
      ),
    );
  }
}

enum StatusKind {
  pending(Color(0xFFFEF3C7), AppColors.warningBg, AppColors.warningDark, 'hourglass'),
  success(Color(0xFFDCFCE7), AppColors.successBg, AppColors.success, 'check'),
  failed(Color(0xFFFEE2E2), AppColors.dangerSoft, AppColors.dangerDark, 'x_bold');

  final Color fill;
  final Color halo;
  final Color icon;
  final String iconName;

  const StatusKind(this.fill, this.halo, this.icon, this.iconName);
}

/// Kartu status: ikon dalam lingkaran 80 berhalo, judul 20, keterangan 14,
/// dan pil batas waktu verifikasi.
class StatusHero extends StatelessWidget {
  final StatusKind kind;
  final String title;
  final String subtitle;
  final DateTime? deadline;

  const StatusHero({super.key, required this.kind, required this.title, required this.subtitle, this.deadline});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 9.33, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: softShadow,
      ),
      child: Column(children: [
        Container(
          width: 93.33,
          height: 93.33,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: kind.halo, shape: BoxShape.circle),
          child: Container(
            width: 66.67,
            height: 66.67,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: kind.fill, shape: BoxShape.circle),
            child: AppIcon(kind.iconName, size: 40, color: kind.icon),
          ),
        ),
        const SizedBox(height: 9.33),
        Text(title,
            textAlign: TextAlign.center,
            style:
                const TextStyle(fontSize: 20, height: 28 / 20, fontWeight: FontWeight.w600, color: AppColors.textDark)),
        const SizedBox(height: 3),
        Text(subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, height: 23 / 14, color: AppColors.textMuted)),
        if (deadline != null) ...[
          const SizedBox(height: 15),
          Container(
            height: 28,
            padding: const EdgeInsets.symmetric(horizontal: 8.5),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border, width: 0.875),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const AppIcon('clock', size: 16, color: AppColors.icon),
              const SizedBox(width: 4),
              Flexible(
                child: Text('Selesai sebelum ${formatDateTimeWib(deadline!).split(', ').skip(1).join(', ')}',
                    style: const TextStyle(
                        fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: AppColors.textBody)),
              ),
            ]),
          ),
        ],
      ]),
    );
  }
}

/// Kartu tiket booking: kepala kode booking + Salin, nama paket & jadwal,
/// total pembayaran, lalu baris "Detail Booking".
class BookingTicketSummary extends StatelessWidget {
  final Booking booking;
  final String packageName;
  final String? schedule;
  final VoidCallback onDetail;

  /// Tanpa kepala kode booking (radius 8), seperti pada pembayaran gagal.
  final bool showCode;

  const BookingTicketSummary({
    super.key,
    required this.booking,
    required this.packageName,
    required this.schedule,
    required this.onDetail,
    this.showCode = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(showCode ? 16 : 8),
        border: Border.all(color: AppColors.border),
        boxShadow: showCode ? softShadow : null,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (showCode)
          Container(
            height: 73,
            color: AppColors.accentSoft,
            padding: const EdgeInsets.fromLTRB(12, 0, 15, 0),
            child: Row(children: [
              // Ikon tiket desain memakai mask SVG, jadi dipakai sebagai PNG 3x.
              Image.asset('assets/images/ticket_booking.png', width: 37, height: 30),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Kode Booking',
                          style: TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMuted)),
                      const SizedBox(height: 4),
                      Text(booking.bookingCode,
                          style: const TextStyle(
                              fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                    ]),
              ),
              CopyChip(booking.bookingCode, message: 'Kode booking disalin.'),
            ]),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(15, 16, 15, 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            _PackageLines(name: packageName, schedule: schedule),
            const Padding(padding: EdgeInsets.symmetric(vertical: 15), child: DashedLine(color: AppColors.border)),
            SizedBox(
              height: 24,
              child: Row(children: [
                const Expanded(
                  child: Text('Total Pembayaran',
                      style: TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
                ),
                Text(formatPrice(booking.totalPrice),
                    style: const TextStyle(
                        fontSize: 18, height: 24 / 18, fontWeight: FontWeight.w700, color: AppColors.primaryDark)),
              ]),
            ),
          ]),
        ),
        const Divider(height: 1),
        InkWell(
          onTap: onDetail,
          child: const SizedBox(
            height: 55,
            child: Padding(
              padding: EdgeInsets.fromLTRB(15, 0, 17.4, 0),
              child: Row(children: [
                Expanded(
                  child: Text('Detail Booking',
                      style:
                          TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.accent)),
                ),
                AppIcon('chevron_right', color: AppColors.accent),
              ]),
            ),
          ),
        ),
      ]),
    );
  }
}

/// Nama paket (16/24, dua baris) lalu baris jadwal berikon kalender.
class _PackageLines extends StatelessWidget {
  final String name;
  final String? schedule;

  const _PackageLines({required this.name, required this.schedule});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(name,
          style: const TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w500, color: AppColors.textMedium)),
      if (schedule != null)
        SizedBox(
          height: 24,
          child: Row(children: [
            const AppIcon('calendar_small', size: 16, color: AppColors.icon),
            const SizedBox(width: 4),
            Expanded(
              child: Text(schedule!, style: const TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
            ),
          ]),
        ),
    ]);
  }
}

/// Ikon berkas 27×36 dengan sudut terlipat dan label ekstensi.
class _FileBadge extends StatelessWidget {
  final String extension;

  const _FileBadge({required this.extension});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 27,
      height: 36,
      child: CustomPaint(
        painter: _FilePainter(),
        child: Padding(
          padding: const EdgeInsets.only(top: 21),
          child: Text(extension.toUpperCase(),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 9, height: 1.17, fontWeight: FontWeight.w700, color: Color(0xFF475467))),
        ),
      ),
    );
  }
}

class _FilePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const fold = 7.8;
    final page = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width - fold, 0)
      ..lineTo(size.width, fold)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(page, Paint()..color = AppColors.divider);
    final corner = Path()
      ..moveTo(size.width - fold, 0)
      ..lineTo(size.width - fold, fold * 0.92)
      ..lineTo(size.width, fold * 0.92)
      ..close();
    canvas.drawPath(corner, Paint()..color = const Color(0xFFD0D5DD));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Kartu putih radius 12 berbingkai (padding 16 dari tepi luar).
class _Card extends StatelessWidget {
  final Widget child;

  const _Card({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}

/// Hitung mundur `HH : MM : SS` dalam kotak merah 24×26.
class _CountdownBoxes extends StatelessWidget {
  final String text;

  const _CountdownBoxes({required this.text});

  @override
  Widget build(BuildContext context) {
    final parts = text.split(':');
    Widget box(String v) => Container(
          constraints: const BoxConstraints(minWidth: 24),
          height: 26,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: AppColors.dangerDark, borderRadius: BorderRadius.circular(4)),
          child: Text(v,
              style: const TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: Colors.white)),
        );
    const colon = SizedBox(
      width: 8,
      child: Text(':',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: AppColors.dangerDark)),
    );
    return Semantics(
      label: 'Sisa waktu pembayaran $text',
      child: Row(mainAxisSize: MainAxisSize.min, children: [box(parts[0]), colon, box(parts[1]), colon, box(parts[2])]),
    );
  }
}

/// Pil metode pembayaran Midtrans (hanya informasi; dipilih di halaman Snap).
class _MethodPill extends StatelessWidget {
  final String label;

  const _MethodPill(this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.accentSoft,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.accentLight),
      ),
      child: Text(label,
          style: const TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: AppColors.textMedium)),
    );
  }
}

class _PaymentSteps extends StatelessWidget {
  final List<String> steps;

  const _PaymentSteps({required this.steps});

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(fontSize: 14, height: 1.6, color: AppColors.textMuted);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (var i = 0; i < steps.length; i++)
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 16, child: Text('${i + 1}.', textAlign: TextAlign.right, style: style)),
          const SizedBox(width: 4.7),
          Expanded(child: Text(steps[i], style: style)),
        ]),
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
      ..color = const Color(0xFF9AE0E1)
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;
    final path = Path()..addRect((Offset.zero & size).deflate(0.5));
    for (final metric in path.computeMetrics()) {
      for (double d = 0; d < metric.length; d += 12) {
        canvas.drawPath(metric.extractPath(d, d + 6), paint);
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
