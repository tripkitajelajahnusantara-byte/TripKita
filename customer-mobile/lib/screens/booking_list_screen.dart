import 'package:flutter/material.dart';

import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/screens/auth_screen.dart';
import 'package:customer_mobile/screens/booking_detail_screen.dart';
import 'package:customer_mobile/screens/payment_verification_screen.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/form_fields.dart';

/// Booking yang masih berjalan tampil di tab Booking; yang sudah selesai,
/// gagal bayar, atau dibatalkan tampil di "Riwayat Booking".
bool isPastBooking(Booking b) =>
    b.isPaymentExpired ||
    const {
      BookingStatus.completed,
      BookingStatus.failed,
      BookingStatus.expired,
      BookingStatus.cancelledByCustomer,
      BookingStatus.cancelledByProvider,
      BookingStatus.refunded,
      'CANCELLED',
    }.contains(b.status);

/// Tab Booking: header teal dengan pencarian kode booking, lalu booking aktif
/// per bulan keberangkatan.
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
    // Kembali dari halaman pembayaran: muat ulang status terbaru.
    if (state == AppLifecycleState.resumed && widget.isActive) _fetch();
  }

  void _onAuthChanged() {
    final id = AuthSession.instance.profile?.id;
    if (id == _lastUserId) return;
    _lastUserId = id;
    _codeController.clear();
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
      for (final b in data.where((b) => b.status == BookingStatus.completed && !_reviewed.containsKey(b.id))) {
        ApiService.isBookingReviewed(b.id).then((reviewed) {
          if (mounted && reviewed) setState(() => _reviewed[b.id] = true);
        }).catchError((_) {});
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = '$e';
      });
    }
  }

  /// Cari booking dari kode lalu buka statusnya.
  Future<void> _track() async {
    FocusScope.of(context).unfocus();
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      showTopToast(context, 'Masukkan kode booking Anda terlebih dahulu.');
      return;
    }
    setState(() => _tracking = true);
    try {
      final result = await ApiService.trackBooking(code);
      if (mounted) {
        await openBooking(context, result, onRebook: () => rebookTrip(context, result, widget.onBrowseTrips));
      }
    } on ApiException catch (e) {
      if (mounted) {
        showTopToast(
          context,
          e.status == 401 || e.status == 403 ? e.message : 'Kode booking tidak ditemukan. Periksa kembali kodenya.',
        );
      }
    } finally {
      if (mounted) setState(() => _tracking = false);
    }
  }

  Future<void> _cancel(Booking booking) async {
    final ok = await showActionDialog(
      context,
      title: 'Batalkan Pesanan?',
      message: Text.rich(TextSpan(text: 'Pesanan ', children: [
        TextSpan(text: booking.bookingCode, style: const TextStyle(fontWeight: FontWeight.w700)),
        const TextSpan(text: ' akan dibatalkan dan kuotanya dilepas.'),
      ])),
      confirmLabel: 'Ya, Batalkan',
      cancelLabel: 'Kembali',
    );
    if (!ok || !mounted) return;
    setState(() => _busyBookingId = booking.id);
    try {
      await ApiService.cancelBooking(booking.id);
      await _fetch();
    } catch (e) {
      if (mounted) showTopToast(context, e is ApiException ? e.message : 'Pesanan belum dapat dibatalkan.');
    } finally {
      if (mounted) setState(() => _busyBookingId = null);
    }
  }

  Future<void> _respondReschedule(Booking booking, bool accept) async {
    final ok = await showActionDialog(
      context,
      title: accept ? 'Terima Jadwal Pengganti?' : 'Tolak Jadwal Pengganti?',
      message: Text(accept
          ? 'Jadwal trip Anda akan diperbarui ke tanggal pengganti.'
          : 'Pesanan Anda akan diteruskan ke proses pengembalian dana penuh.'),
      confirmLabel: accept ? 'Ya, Terima' : 'Ya, Tolak',
      cancelLabel: 'Kembali',
    );
    if (!ok || !mounted) return;
    setState(() => _busyBookingId = booking.id);
    try {
      final message = await ApiService.respondToReschedule(booking.id, accept);
      if (mounted) showTopToast(context, message);
      await _fetch();
    } catch (e) {
      if (mounted) {
        showTopToast(context, e is ApiException ? e.message : 'Jawaban Anda tidak dapat disimpan. Silakan coba lagi.');
      }
    } finally {
      if (mounted) setState(() => _busyBookingId = null);
    }
  }

  void _openHistory() {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => BookingHistoryScreen(
        bookings: _bookings.where(isPastBooking).toList(),
        reviewed: _reviewed,
        onBrowseTrips: widget.onBrowseTrips,
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    final active = _bookings.where((b) => !isPastBooking(b)).toList()
      ..sort((a, b) =>
          (a.tripDate ?? a.createdAt ?? DateTime(2100)).compareTo(b.tripDate ?? b.createdAt ?? DateTime(2100)));
    return Scaffold(
      backgroundColor: AppColors.accent,
      body: DefaultTextStyle.merge(
        style: figmaTextStyle,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          SizedBox(height: topInset),
          SizedBox(
            height: 56,
            child: Row(children: [
              const SizedBox(width: 16),
              const Expanded(
                child: Text('Booking',
                    style: TextStyle(fontSize: 24, height: 1.17, fontWeight: FontWeight.w600, color: Colors.white)),
              ),
              if (_isCustomer)
                IconButton(
                  tooltip: 'Riwayat Booking',
                  onPressed: _openHistory,
                  constraints: const BoxConstraints.tightFor(width: 40, height: 40),
                  padding: EdgeInsets.zero,
                  icon: const AppIcon('history', color: Colors.white),
                ),
              const SizedBox(width: 16.5),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: _SearchPill(controller: _codeController, busy: _tracking, onSubmit: _track),
          ),
          Expanded(
            child: Container(
              clipBehavior: Clip.antiAlias,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: RefreshIndicator(
                onRefresh: _fetch,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  children: _buildContent(active),
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  List<Widget> _buildContent(List<Booking> active) {
    if (_loading) return const [LoadingView('Sedang memuat booking...')];
    if (_loadError != null) {
      return [
        EmptyState(
          icon: Icons.wifi_off_outlined,
          title: 'Booking Belum Dapat Dimuat',
          message: _loadError!,
          actions: [ElevatedButton(onPressed: _fetch, child: const Text('Coba Lagi'))],
        ),
      ];
    }
    if (!_isCustomer) {
      return [
        EmptyState(
          icon: Icons.confirmation_number_outlined,
          title: 'Lacak Booking Anda',
          message: 'Masukkan kode booking pada kolom di atas, atau masuk untuk melihat semua booking Anda.',
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuthScreen())),
              child: const Text('Masuk ke Akun'),
            ),
          ],
        ),
      ];
    }
    if (active.isEmpty) {
      return [
        EmptyState(
          icon: Icons.confirmation_number_outlined,
          title: 'Belum Ada Booking Aktif',
          message: 'Booking yang sudah selesai atau gagal bayar ada di Riwayat Booking.',
          actions: [OutlinedButton(onPressed: widget.onBrowseTrips, child: const Text('Cari Trip'))],
        ),
      ];
    }
    final out = <Widget>[];
    String? month;
    for (final b in active) {
      final date = b.tripDate ?? b.createdAt;
      final label = date == null ? 'Tanpa Tanggal' : '${monthsFull[date.month - 1]} ${date.year}';
      if (label != month) {
        if (month != null) out.add(const SizedBox(height: 12));
        out
          ..add(SectionTitle(label))
          ..add(const SizedBox(height: 16));
        month = label;
      } else {
        out.add(const SizedBox(height: 12));
      }
      out.add(BookingCard(
        booking: b,
        busy: _busyBookingId == b.id,
        reviewed: _reviewed[b.id] == true,
        onOpen: () =>
            openBooking(context, b, onRebook: () => rebookTrip(context, b, widget.onBrowseTrips)).then((_) => _fetch()),
        onPay: () => Navigator.of(context)
            .push(MaterialPageRoute(builder: (_) => PaymentVerificationScreen(booking: b, packageName: b.packageName)))
            .then((_) => _fetch()),
        onCancel: () => _cancel(b),
        onReschedule: (accept) => _respondReschedule(b, accept),
        onReview: () {},
        onRebook: () => rebookTrip(context, b, widget.onBrowseTrips),
      ));
    }
    return out;
  }
}

/// Buka booking: selesai → Detail Booking, lainnya → Status Pembayaran.
Future<void> openBooking(BuildContext context, Booking booking, {VoidCallback? onRebook, VoidCallback? onReviewed}) {
  return Navigator.of(context).push(MaterialPageRoute(
    builder: (_) => booking.status == BookingStatus.completed
        ? BookingDetailScreen(booking: booking, packageName: booking.packageName, onReviewed: onReviewed)
        : PaymentVerificationScreen(
            booking: booking, packageName: booking.packageName, fromList: true, onRebook: onRebook),
  ));
}

/// Pesan ulang membuka paket yang sama bila datanya tersedia; bila paket
/// sudah tidak aktif, arahkan ke pencarian.
void rebookTrip(BuildContext context, Booking booking, VoidCallback onBrowseTrips) {
  final pkg = booking.packageDetails;
  if (pkg == null || pkg.id <= 0) {
    Navigator.of(context).popUntil((route) => route.isFirst);
    onBrowseTrips();
    return;
  }
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => TripDetailScreen(package: pkg)));
}

/// Kolom cari kode booking: pil 48 berlatar teal muda.
class _SearchPill extends StatelessWidget {
  final TextEditingController controller;
  final bool busy;
  final VoidCallback onSubmit;

  const _SearchPill({required this.controller, required this.busy, required this.onSubmit});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      decoration: BoxDecoration(color: AppColors.accentSoft, borderRadius: BorderRadius.circular(24)),
      child: Row(children: [
        const SizedBox(width: 10),
        busy
            ? const SizedBox(
                width: 24,
                height: 24,
                child: Padding(
                  padding: EdgeInsets.all(4),
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
                ),
              )
            : const AppIcon('search', color: AppColors.accent),
        const SizedBox(width: 7),
        Expanded(
          child: TextField(
            controller: controller,
            textCapitalization: TextCapitalization.characters,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => onSubmit(),
            style: const TextStyle(fontSize: 14, height: 20 / 14, letterSpacing: 0, color: AppColors.textDark),
            decoration: const InputDecoration(
              hintText: 'Masukkan kode booking Anda',
              hintStyle: TextStyle(fontSize: 14, height: 20 / 14, letterSpacing: 0, color: AppColors.textMuted),
              filled: false,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
        const SizedBox(width: 16),
      ]),
    );
  }
}

/// Riwayat Booking: booking selesai, gagal bayar, dan dibatalkan.
class BookingHistoryScreen extends StatefulWidget {
  final List<Booking> bookings;
  final Map<int, bool> reviewed;
  final VoidCallback onBrowseTrips;

  const BookingHistoryScreen({super.key, required this.bookings, required this.reviewed, required this.onBrowseTrips});

  @override
  State<BookingHistoryScreen> createState() => _BookingHistoryScreenState();
}

class _BookingHistoryScreenState extends State<BookingHistoryScreen> {
  Future<void> _review(Booking booking) async {
    final sent = await showReviewSheet(context, booking);
    if (sent == true && mounted) {
      setState(() => widget.reviewed[booking.id] = true);
      showTopToast(context, 'Ulasan berhasil dikirim');
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = [...widget.bookings]
      ..sort((a, b) => (b.tripDate ?? b.createdAt ?? DateTime(0)).compareTo(a.tripDate ?? a.createdAt ?? DateTime(0)));
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(titleSpacing: 0, title: const Text('Riwayat Booking')),
      body: DefaultTextStyle.merge(
        style: figmaTextStyle,
        child: items.isEmpty
            ? const Padding(
                padding: EdgeInsets.all(16),
                child: EmptyState(
                  icon: Icons.history,
                  title: 'Belum Ada Riwayat',
                  message: 'Booking yang selesai, gagal bayar, atau dibatalkan akan tampil di sini.',
                ),
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, i) {
                  final b = items[i];
                  return BookingCard(
                    booking: b,
                    reviewed: widget.reviewed[b.id] == true,
                    onOpen: () => openBooking(
                      context,
                      b,
                      onRebook: () => rebookTrip(context, b, widget.onBrowseTrips),
                      onReviewed: () => setState(() => widget.reviewed[b.id] = true),
                    ),
                    onReview: () => _review(b),
                    onRebook: () => rebookTrip(context, b, widget.onBrowseTrips),
                  );
                },
              ),
      ),
    );
  }
}

/// Gaya label status booking (kapsul 22, teks 12 Medium).
class BookingBadgeStyle {
  final String label;
  final Color background;
  final Color border;
  final Color text;

  const BookingBadgeStyle(this.label, this.background, this.border, this.text);
}

BookingBadgeStyle bookingBadge(Booking b) {
  const green = (Color(0xFFF0FDF4), Color(0xFFBBF7D0), AppColors.successDark);
  const amber = (AppColors.warningBg, AppColors.warningBorder, Color(0xFFB45309));
  const red = (AppColors.dangerSoft, Color(0xFFFECACA), AppColors.errorText);
  const teal = (AppColors.accentSoft, Color(0xFFC0ECEC), AppColors.primaryDark);
  const plain = (Colors.white, AppColors.border, AppColors.textBody);
  BookingBadgeStyle make(String label, (Color, Color, Color) c) => BookingBadgeStyle(label, c.$1, c.$2, c.$3);
  if (b.isPaymentExpired || b.status == BookingStatus.failed) return make('Gagal Bayar', red);
  return switch (b.status) {
    BookingStatus.pendingPayment => make('Belum Dibayar', amber),
    BookingStatus.paymentReview => make('Sedang Diverifikasi', teal),
    BookingStatus.paid || BookingStatus.confirmed => make('Lunas', green),
    BookingStatus.completed => make('Selesai', plain),
    BookingStatus.rescheduleOffered => make('Jadwal Pengganti', amber),
    BookingStatus.refundRequired => make('Proses Refund', teal),
    BookingStatus.refunded => make('Dana Dikembalikan', plain),
    _ => make('Dibatalkan', red),
  };
}

class _Badge extends StatelessWidget {
  final BookingBadgeStyle style;

  const _Badge(this.style);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 22,
      padding: const EdgeInsets.symmetric(horizontal: 8.1),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: style.background,
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: style.border, width: 0.875),
      ),
      child: Text(style.label,
          style: TextStyle(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w500, color: style.text)),
    );
  }
}

/// Kartu booking: kepala teal muda (kode + status), isi putih (paket,
/// jadwal, harga) dan tombol aksi sesuai status.
class BookingCard extends StatelessWidget {
  final Booking booking;
  final bool busy;
  final bool reviewed;
  final VoidCallback onOpen;
  final VoidCallback? onPay;
  final VoidCallback? onCancel;
  final ValueChanged<bool>? onReschedule;
  final VoidCallback onReview;
  final VoidCallback onRebook;

  const BookingCard({
    super.key,
    required this.booking,
    this.busy = false,
    this.reviewed = false,
    required this.onOpen,
    this.onPay,
    this.onCancel,
    this.onReschedule,
    required this.onReview,
    required this.onRebook,
  });

  @override
  Widget build(BuildContext context) {
    final b = booking;
    final start = b.tripDate;
    final end = b.tripEndDate ?? start;
    final days = start == null ? 0 : dateOnly(end!).difference(dateOnly(start)).inDays + 1;
    final pending = b.status == BookingStatus.pendingPayment && !b.isPaymentExpired;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.accentSoft,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SizedBox(
          height: 45,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 15),
            child: Row(children: [
              Expanded(
                child: Text(b.bookingCode,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w500, color: AppColors.textMedium)),
              ),
              _Badge(bookingBadge(b)),
            ]),
          ),
        ),
        Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: onOpen,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(15, 16, 15, 15),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text(b.packageName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                if (start != null) ...[
                  const SizedBox(height: 4),
                  SizedBox(
                    height: 17,
                    child: Row(children: [
                      const AppIcon('calendar_small', size: 16, color: AppColors.icon),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text('${formatDateRange(start, end!)} • $days hari',
                            style: const TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMuted)),
                      ),
                    ]),
                  ),
                ],
                const SizedBox(height: 7),
                Text(formatPrice(b.totalPrice),
                    style: const TextStyle(
                        fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
                if (pending && b.paymentDeadline != null) ...[
                  const SizedBox(height: 11),
                  Text.rich(
                    TextSpan(text: 'Bayar sebelum: ', children: [
                      TextSpan(
                        text: formatDateTimeWib(b.paymentDeadline!).split(', ').skip(1).join(', '),
                        style: const TextStyle(fontWeight: FontWeight.w500, color: AppColors.textBody),
                      ),
                    ]),
                    style: const TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMedium),
                  ),
                ],
                if (b.status == BookingStatus.rescheduleOffered && b.rescheduleDate != null) ...[
                  const SizedBox(height: 12),
                  NoteBox(
                    tone: NoteTone.warning,
                    text: 'Keberangkatan tidak dapat dijalankan. Mitra menawarkan tanggal pengganti '
                        '${formatDateLong(b.rescheduleDate)}. Bila ditolak, dana dikembalikan penuh.',
                  ),
                ],
                ..._actions(context),
              ]),
            ),
          ),
        ),
      ]),
    );
  }

  List<Widget> _actions(BuildContext context) {
    final b = booking;
    final buttons = <Widget>[];
    Widget ghost(String label, VoidCallback? onTap) => TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.textMedium,
            minimumSize: const Size(0, 36),
            padding: const EdgeInsets.symmetric(horizontal: 11.5),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            textStyle:
                const TextStyle(fontFamily: 'Roboto', fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600),
          ),
          child: Text(label),
        );
    Widget outlined(String label, VoidCallback? onTap) => OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(0, 36),
            padding: const EdgeInsets.symmetric(horizontal: 15),
            textStyle:
                const TextStyle(fontFamily: 'Roboto', fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600),
          ),
          child: Text(label),
        );
    Widget primary(String label, VoidCallback? onTap) => ElevatedButton(
          onPressed: onTap,
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(0, 36),
            padding: const EdgeInsets.symmetric(horizontal: 15),
            textStyle:
                const TextStyle(fontFamily: 'Roboto', fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600),
          ),
          child: Text(label),
        );
    final whatsapp = whatsAppUri(b.providerWhatsApp);
    if (b.isPaymentExpired || isPastBooking(b) && b.status != BookingStatus.completed) {
      buttons.add(primary('Pesan Ulang', onRebook));
    } else {
      switch (b.status) {
        case BookingStatus.pendingPayment:
          if (onCancel != null) buttons.add(ghost(busy ? 'Membatalkan...' : 'Batalkan', busy ? null : onCancel));
          buttons.add(primary('Bayar Sekarang', busy ? null : onPay));
        case BookingStatus.paid || BookingStatus.confirmed:
          buttons.add(ghost('Lihat Detail', onOpen));
          if (whatsapp != null) buttons.add(outlined('Hubungi Provider', () => openExternal(whatsapp)));
        case BookingStatus.completed:
          buttons.add(ghost('Lihat Detail', onOpen));
          if (!reviewed) buttons.add(outlined('Beri Ulasan', onReview));
        case BookingStatus.rescheduleOffered when onReschedule != null:
          buttons
            ..add(ghost('Tolak', busy ? null : () => onReschedule!(false)))
            ..add(primary('Terima Jadwal', busy ? null : () => onReschedule!(true)));
        default:
          buttons.add(ghost('Lihat Detail', onOpen));
      }
    }
    return [
      const SizedBox(height: 11),
      const Divider(height: 1),
      const SizedBox(height: 12),
      // Teks aksi berjarak 23 dari tombol berikutnya (padding 11.5 + 11.5).
      Row(mainAxisAlignment: MainAxisAlignment.end, children: [
        for (var i = 0; i < buttons.length; i++) ...[if (i > 0) const SizedBox(width: 11.5), buttons[i]],
      ]),
    ];
  }
}

/// Lembar "Beri Ulasan": paket, lima bintang, dan isian ulasan.
Future<bool?> showReviewSheet(BuildContext context, Booking booking, {int initialStars = 0}) {
  return showDesignSheet<bool>(
    context,
    title: 'Beri Ulasan',
    showClose: false,
    builder: (_) => _ReviewSheet(booking: booking, initialStars: initialStars),
  );
}

class _ReviewSheet extends StatefulWidget {
  final Booking booking;
  final int initialStars;

  const _ReviewSheet({required this.booking, required this.initialStars});

  @override
  State<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends State<_ReviewSheet> {
  final _comment = TextEditingController();
  late int _stars = widget.initialStars;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_stars == 0) {
      setState(() => _error = 'Pilih jumlah bintang terlebih dahulu.');
      return;
    }
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
          _error = e is ApiException ? e.message : 'Ulasan belum dapat dikirim.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final pkg = widget.booking.packageDetails;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Flexible(
        child: ListView(
          shrinkWrap: true,
          padding: EdgeInsets.zero,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Text('Bagikan pengalaman seru Anda mengikuti trip.',
                  style: TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 15, 16, 16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child:
                        NetworkPhoto(pkg == null || pkg.photos.isEmpty ? '' : pkg.photos.first, width: 64, height: 64),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      if (pkg != null)
                        Text(
                            '${pkg.tripType.isEmpty ? 'Open Trip' : pkg.tripType} • ${pkg.durationDays} hari'
                                .toUpperCase(),
                            style: const TextStyle(
                                fontSize: 12,
                                height: 18 / 12,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textMuted)),
                      const SizedBox(height: 3),
                      Text(widget.booking.packageName,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 16, height: 22 / 16, fontWeight: FontWeight.w500, color: AppColors.textDark)),
                    ]),
                  ),
                ]),
                const SizedBox(height: 20),
                StarRow(value: _stars, onChanged: (v) => setState(() => _stars = v), center: true),
                const SizedBox(height: 20),
                const Divider(height: 1),
                const SizedBox(height: 20),
                LabeledField(
                  label: 'Tulis Ulasan Anda',
                  error: _error,
                  child: TextAreaField(
                    controller: _comment,
                    maxLength: 1000,
                    hintText: 'Ceritakan keseruan trip, pelayanan tour guide, dan fasilitasnya',
                  ),
                ),
              ]),
            ),
          ],
        ),
      ),
      SheetFormFooter(onSave: _sending ? () {} : _send, saveLabel: _sending ? 'Mengirim...' : 'Kirim Ulasan'),
    ]);
  }
}

/// Lima bintang 40 (jarak antarpusat 44): kuning sampai [value], sisanya abu.
class StarRow extends StatelessWidget {
  final int value;
  final ValueChanged<int> onChanged;
  final bool center;

  const StarRow({super.key, required this.value, required this.onChanged, this.center = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: center ? MainAxisAlignment.center : MainAxisAlignment.start,
      children: [
        for (var s = 1; s <= 5; s++)
          Semantics(
            button: true,
            label: '$s bintang',
            child: GestureDetector(
              onTap: () => onChanged(s),
              child: SizedBox(
                width: 44,
                height: 40,
                child: Center(
                  child:
                      AppIcon('star_large', size: 40, color: s <= value ? AppColors.warning : AppColors.borderStrong),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
