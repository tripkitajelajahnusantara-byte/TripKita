import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/screens/payment_verification_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/services/checkout_config.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/utils/validators.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/form_fields.dart';
import 'package:customer_mobile/widgets/legal_content.dart';

const _genders = ['Laki-laki', 'Perempuan'];

int _ageOnDate(DateTime birthDate, DateTime onDate) {
  var age = onDate.year - birthDate.year;
  if (onDate.month < birthDate.month ||
      (onDate.month == birthDate.month && onDate.day < birthDate.day)) {
    age--;
  }
  return age;
}

/// Data pemesan yang diisi pada lembar "Data Pemesan".
class _Booker {
  String name;
  String email;
  String phone;
  String gender;
  String birthDate;

  _Booker({this.name = '', this.email = '', this.phone = '', this.gender = '', this.birthDate = ''});
}

/// Galat data pemesan; kosong bila lengkap.
Map<String, String> _bookerErrors(_Booker b) {
  final errors = <String, String>{};
  void put(String key, String? message) {
    if (message != null) errors[key] = message;
  }

  put('name', b.name.trim().isEmpty ? 'Wajib diisi.' : validateBookerName(b.name));
  final email = b.email.trim();
  if (email.isEmpty) {
    errors['email'] = 'Wajib diisi.';
  } else if (validateEmail(email) != null) {
    errors['email'] = 'Format email tidak valid (contoh: pemesan@gmail.com).';
  }
  put('phone', b.phone.isEmpty ? 'Wajib diisi.' : validateBookerPhone(b.phone));
  if (!_genders.contains(b.gender)) errors['gender'] = 'Wajib diisi.';
  final birth = parseIsoDate(b.birthDate);
  if (birth == null) {
    errors['birth'] = 'Wajib diisi.';
  } else if (birth.isAfter(DateTime.now())) {
    errors['birth'] = 'Tanggal lahir tidak boleh berada di masa depan.';
  }
  return errors;
}

/// Galat data peserta ke-[index] (mulai 0); kosong bila lengkap.
Map<String, String> _participantErrors(Participant p, int index, TripPackage pkg, String tripDateIso) {
  final errors = <String, String>{};
  final n = index + 1;
  void put(String key, String? message) {
    if (message != null) errors[key] = message;
  }

  put('name', p.name.trim().isEmpty ? 'Wajib diisi.' : validateParticipantName(p.name, n));
  put('phone', p.phone.isEmpty ? 'Wajib diisi.' : validateParticipantPhone(p.phone, n));
  if (!_genders.contains(p.gender)) errors['gender'] = 'Wajib diisi.';
  final birth = parseIsoDate(p.birthDate);
  final tripDate = parseIsoDate(tripDateIso);
  if (birth == null) {
    errors['birth'] = 'Wajib diisi.';
  } else if (birth.isAfter(DateTime.now())) {
    errors['birth'] = 'Tanggal lahir tidak boleh berada di masa depan.';
  } else if (tripDate != null) {
    final age = _ageOnDate(birth, tripDate);
    if (pkg.minAge > 0 && age < pkg.minAge) {
      errors['birth'] = 'Berusia $age tahun saat trip; usia minimum paket ${pkg.minAge} tahun.';
    } else if (pkg.maxAge > 0 && age > pkg.maxAge) {
      errors['birth'] = 'Berusia $age tahun saat trip; usia maksimum paket ${pkg.maxAge} tahun.';
    }
  }
  // Sama dengan validasi web: titik jemput fleksibel wajib 5–500 karakter.
  if (pkg.isFlexiblePickup) {
    final pickup = p.pickupPoint.trim();
    if (pickup.isEmpty) {
      errors['pickup'] = 'Wajib diisi.';
    } else if (pickup.length < 5 || pickup.length > 500) {
      errors['pickup'] = 'Isi titik jemput 5–500 karakter, dengan alamat atau patokan yang jelas.';
    }
  }
  return errors;
}

/// "Selesaikan Pesanan": rincian pesanan, data pemesan & peserta, ringkasan
/// pembayaran, lalu konfirmasi yang membuat booking. Padanan
/// `CustomerBookingPage` + `CustomerConfirmationPage` di web.
class BookingScreen extends StatefulWidget {
  final BookingDraft draft;

  const BookingScreen({super.key, required this.draft});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  late final _Booker _booker;
  late final List<Participant> _participants;
  bool _sameAsBooker = false;
  final Set<String> _addOnIds = {};
  bool _showErrors = false;
  bool _submitting = false;
  CheckoutConfig? _config;
  String? _configError;

  final _bookerKey = GlobalKey();
  final _participantsKey = GlobalKey();

  late final TapGestureRecognizer _termsTap = TapGestureRecognizer()..onTap = () => showGeneralTerms(context);
  late final TapGestureRecognizer _policyTap = TapGestureRecognizer()..onTap = () => showCancellationPolicy(context);

  TripPackage get _pkg => widget.draft.package;

  /// Draft dengan layanan tambahan yang sedang dicentang.
  BookingDraft get _draft =>
      widget.draft.withAddOns(_pkg.addOns.where((a) => _addOnIds.contains(a.id)).toList());

  @override
  void initState() {
    super.initState();
    final profile = AuthSession.instance.profile;
    _booker = _Booker(
      name: profile?.name ?? '',
      email: profile?.email ?? '',
      phone: phoneFromLocal(profile?.whatsapp ?? ''),
      gender: _genders.contains(profile?.gender) ? profile!.gender : '',
      birthDate: parseIsoDate(profile?.birthDate ?? '') != null ? profile!.birthDate.substring(0, 10) : '',
    );
    _participants = List.generate(widget.draft.guests, (_) => Participant());
    _loadConfig();

    // Form ini hanya untuk customer yang sudah masuk, sama seperti web.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!AuthSession.instance.isLoggedIn && mounted) {
        final ok = await ensureLoggedIn(context);
        if (!ok && mounted) Navigator.pop(context);
      }
    });
  }

  @override
  void dispose() {
    _termsTap.dispose();
    _policyTap.dispose();
    super.dispose();
  }

  /// Biaya layanan diambil dari backend; tanpa angka itu total tidak
  /// ditampilkan dan pembayaran tidak dapat dilanjutkan, alih-alih menebak.
  Future<void> _loadConfig() async {
    setState(() => _configError = null);
    try {
      final config = await CheckoutConfig.load();
      if (mounted) setState(() => _config = config);
    } catch (e) {
      if (mounted) {
        setState(() => _configError = e is ApiException ? e.message : 'Rincian biaya belum dapat dimuat.');
      }
    }
  }

  void _copyBookerToFirst() {
    _participants[0]
      ..name = _booker.name
      ..phone = _booker.phone
      ..gender = _booker.gender
      ..birthDate = _booker.birthDate;
  }

  bool get _bookerComplete => _bookerErrors(_booker).isEmpty;
  bool _participantComplete(int i) => _participantErrors(_participants[i], i, _pkg, widget.draft.startDate).isEmpty;
  bool get _allParticipantsComplete => [for (var i = 0; i < _participants.length; i++) _participantComplete(i)].every((ok) => ok);

  Future<void> _editBooker() async {
    final saved = await showDesignSheet<_Booker>(
      context,
      title: 'Data Pemesan',
      showClose: false,
      builder: (_) => _BookerForm(initial: _booker),
    );
    if (saved == null || !mounted) return;
    setState(() {
      _booker
        ..name = saved.name
        ..email = saved.email
        ..phone = saved.phone
        ..gender = saved.gender
        ..birthDate = saved.birthDate;
      if (_sameAsBooker) _copyBookerToFirst();
    });
  }

  Future<void> _editParticipant(int index) async {
    final saved = await showDesignSheet<Participant>(
      context,
      title: 'Data Peserta ${index + 1}',
      showClose: false,
      builder: (_) => _ParticipantForm(
        index: index,
        initial: _participants[index],
        package: _pkg,
        tripDateIso: widget.draft.startDate,
        lockIdentity: index == 0 && _sameAsBooker,
        firstPickup: index > 0 ? _participants[0].pickupPoint : '',
      ),
    );
    if (saved == null || !mounted) return;
    setState(() => _participants[index] = saved);
  }

  Future<void> _toggleSameAsBooker(bool value) async {
    if (value && !_bookerComplete) {
      await _editBooker();
      if (!_bookerComplete) return;
    }
    setState(() {
      _sameAsBooker = value;
      if (value) {
        _copyBookerToFirst();
      } else {
        final pickup = _participants[0].pickupPoint;
        final medical = _participants[0].medicalHistory;
        _participants[0] = Participant(pickupPoint: pickup, medicalHistory: medical);
      }
    });
  }

  Future<void> _confirm() async {
    final config = _config;
    if (config == null) {
      await _loadConfig();
      return;
    }
    if (!_bookerComplete || !_allParticipantsComplete) {
      setState(() => _showErrors = true);
      final target = !_bookerComplete ? _bookerKey : _participantsKey;
      final ctx = target.currentContext;
      if (ctx != null) {
        Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 300), alignment: 0.1);
      }
      return;
    }
    final total = _draft.totalWithFee(config.serviceFee);
    final ok = await showActionDialog(
      context,
      title: 'Konfirmasi Pesanan',
      message: Text.rich(TextSpan(
        text: 'Pastikan data pemesan dan seluruh peserta sudah benar sebelum melanjutkan ke pembayaran sebesar ',
        children: [
          TextSpan(text: formatPrice(total), style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textDark)),
        ],
      )),
      confirmLabel: 'Lanjutkan',
      cancelLabel: 'Periksa Kembali',
    );
    if (ok) await _createBooking();
  }

  Future<void> _createBooking() async {
    setState(() => _submitting = true);
    try {
      final draft = _draft;
      if (_pkg.id <= 0) {
        throw const ApiException('Paket yang dipilih tidak valid. Silakan kembali dan pilih paket lagi.', 0);
      }
      final booker = BookerContact(name: _booker.name.trim(), email: _booker.email.trim(), whatsapp: _booker.phone);
      final participants = [for (final p in _participants) p.copy()];
      final booking = await ApiService.createBooking(
        packageId: _pkg.id,
        booker: booker,
        guests: draft.guests,
        tripDateIso: draft.startDate,
        participants: participants,
        addOnIds: [for (final a in draft.addOns) a.id],
      );
      if (booking.bookingCode.isEmpty) {
        throw const ApiException('Backend tidak mengembalikan kode booking', 0);
      }
      // Kuota paket berubah setelah pemesanan.
      PackageCatalog.load(force: true).ignore();
      if (!mounted) return;
      await Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => PaymentVerificationScreen(
            booking: booking,
            packageName: _pkg.name,
            draft: draft,
            booker: booker,
            participants: participants,
            openGatewayOnStart: true,
          ),
        ),
        (route) => route.isFirst,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      await showNoticeDialog(
        context,
        title: 'Gagal Membuat Booking',
        message: e is ApiException ? e.message : 'Booking belum dapat dibuat. Silakan coba lagi.',
        isError: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(titleSpacing: 0, title: const Text('Selesaikan Pesanan')),
      body: Column(children: [
        const CheckoutSteps(current: 0),
        Expanded(
          child: DefaultTextStyle.merge(
            style: figmaTextStyle,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
              children: [
                const SectionTitle('Rincian Pesanan'),
                const SizedBox(height: 12),
                OrderSummaryTicket(draft: widget.draft),
                const SizedBox(height: 24),
                _buildBookerSection(),
                if (_pkg.addOns.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  _buildAddOns(),
                ],
                const SizedBox(height: 24),
                _buildParticipants(),
                const SizedBox(height: 24),
                _buildPaymentSummary(),
                const SizedBox(height: 24),
                const CancellationPolicyBox(),
                const SizedBox(height: 16),
                Text.rich(
                  TextSpan(
                    text: 'Dengan mengklik Konfirmasi & Bayar, Anda menyetujui ',
                    children: [
                      TextSpan(text: 'Syarat & Ketentuan', style: _linkStyle, recognizer: _termsTap),
                      const TextSpan(text: ' serta '),
                      TextSpan(text: 'Kebijakan Pembatalan H-7', style: _linkStyle, recognizer: _policyTap),
                      const TextSpan(text: ' TemenTrip.'),
                    ],
                  ),
                  style: const TextStyle(fontSize: 12, height: 1.5, color: AppColors.textMedium),
                ),
              ],
            ),
          ),
        ),
      ]),
      bottomNavigationBar: BottomActionBar(
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _submitting || _config == null ? null : _confirm,
            child: _submitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                : const Text('Konfirmasi & Bayar'),
          ),
        ),
      ),
    );
  }

  static const _linkStyle = TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w500);

  Widget _buildBookerSection() {
    final invalid = _showErrors && !_bookerComplete;
    final filled = _booker.name.trim().isNotEmpty;
    return Column(key: _bookerKey, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SectionTitle('Data Pemesan'),
      const SizedBox(height: 12),
      Container(
        decoration: BoxDecoration(
          color: AppColors.accentSoft,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _TapCard(
            invalid: invalid,
            onTap: _editBooker,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(filled ? _booker.name.trim() : 'Isi data pemesan',
                  style: TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w500, color: filled ? AppColors.textDark : AppColors.textMuted)),
              if (_booker.email.isNotEmpty || _booker.phone.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  [if (_booker.email.isNotEmpty) _booker.email, if (_booker.phone.isNotEmpty) displayPhone(_booker.phone)]
                      .join('  •  '),
                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                ),
              ],
            ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 4, 0),
            child: Row(children: [
              const Expanded(
                child: Text('Tambahkan saya sebagai peserta', style: TextStyle(fontSize: 14, color: AppColors.textMedium)),
              ),
              Transform.scale(
                scale: 0.8,
                child: Switch(value: _sameAsBooker, onChanged: _toggleSameAsBooker),
              ),
            ]),
          ),
        ]),
      ),
      if (invalid) ...[
        const SizedBox(height: 8),
        const _ErrorNote('Lengkapi data pemesan untuk melanjutkan'),
      ],
    ]);
  }

  Widget _buildAddOns() {
    final guests = widget.draft.guests;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SectionTitle('Layanan Tambahan'),
      const SizedBox(height: 4),
      const Text('Opsional. Harga otomatis ditambahkan ke total.',
          style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
      const SizedBox(height: 12),
      for (final a in _pkg.addOns) ...[
        Material(
          color: _addOnIds.contains(a.id) ? AppColors.accentSoft : Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: _addOnIds.contains(a.id) ? AppColors.accent : AppColors.border),
          ),
          clipBehavior: Clip.antiAlias,
          child: CheckboxListTile(
            dense: true,
            value: _addOnIds.contains(a.id),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: const EdgeInsets.only(right: 12),
            title: Text(a.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textDark)),
            subtitle: Text(
                a.perPerson ? '${formatPrice(a.price)}/orang × $guests' : '${formatPrice(a.price)}/pesanan',
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            secondary: Text('+${formatPrice(a.subtotalFor(guests))}',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
            onChanged: (v) => setState(() => v == true ? _addOnIds.add(a.id) : _addOnIds.remove(a.id)),
          ),
        ),
        const SizedBox(height: 8),
      ],
    ]);
  }

  Widget _buildParticipants() {
    final anyInvalid = _showErrors && !_allParticipantsComplete;
    return Column(key: _participantsKey, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SectionTitle('Detail Peserta Trip'),
      const SizedBox(height: 12),
      for (var i = 0; i < _participants.length; i++) ...[
        _TapCard(
          invalid: _showErrors && !_participantComplete(i),
          onTap: () => _editParticipant(i),
          child: _ParticipantSummary(index: i, participant: _participants[i], showPickup: _pkg.isFlexiblePickup),
        ),
        const SizedBox(height: 8),
      ],
      if (anyInvalid) ...[
        const _ErrorNote('Lengkapi data setiap peserta untuk melanjutkan'),
        const SizedBox(height: 8),
      ],
      const InfoBanner(
        icon: Icons.info_outline,
        message: 'Data peserta yang diisi akan digunakan oleh mitra travel untuk asuransi dan pendaftaran.',
        color: AppColors.warningDark,
        textColor: Color(0xFFB45309),
        background: AppColors.warningBg,
        border: AppColors.warningBg,
      ),
    ]);
  }

  Widget _buildPaymentSummary() {
    final d = _draft;
    final config = _config;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SectionTitle('Ringkasan Pembayaran'),
      const SizedBox(height: 12),
      SectionCard(
        radius: 8,
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          TripPriceRows(package: d.package, guests: d.guests, addOns: d.addOns),
          PriceRow('Biaya Layanan',
              config == null ? (_configError == null ? 'Memuat...' : '-') : formatPrice(config.serviceFee)),
          if (_configError != null)
            Row(children: [
              Expanded(child: ErrorText(_configError)),
              TextButton(onPressed: _loadConfig, child: const Text('Coba Lagi')),
            ]),
          const Divider(height: 24),
          PriceRow('Total Pembayaran', config == null ? '-' : formatPrice(d.totalWithFee(config.serviceFee)),
              emphasize: true),
        ]),
      ),
    ]);
  }
}

/// Kartu "Rincian Pesanan": paket, tanggal keberangkatan, jumlah peserta.
class OrderSummaryTicket extends StatelessWidget {
  final BookingDraft draft;

  const OrderSummaryTicket({super.key, required this.draft});

  @override
  Widget build(BuildContext context) {
    final pkg = draft.package;
    final start = parseIsoDate(draft.startDate);
    final end = parseIsoDate(draft.endDate) ?? start;
    final photos = pkg.photos;
    return TicketCard(
      top: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: NetworkPhoto(photos.isEmpty ? '' : photos.first, width: 64, height: 56),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${pkg.tripType.isEmpty ? 'Open Trip' : pkg.tripType} • ${durationLabel(pkg.durationDays)}',
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(height: 4),
            Text(pkg.name,
                style: const TextStyle(fontSize: 16, height: 1.35, fontWeight: FontWeight.w500, color: AppColors.textDark)),
          ]),
        ),
      ]),
      bottom: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _labelValue('Tanggal Keberangkatan', start == null ? draft.scheduleLabel : formatDateRange(start, end!)),
        const Divider(height: 20),
        _labelValue('Jumlah Peserta', '${draft.guests} orang'),
      ]),
    );
  }

  static Widget _labelValue(String label, String value) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 14, color: AppColors.textMedium)),
      ]);
}

/// Kotak "Kebijakan Pembatalan H-7 TemenTrip".
class CancellationPolicyBox extends StatelessWidget {
  const CancellationPolicyBox({super.key});

  @override
  Widget build(BuildContext context) {
    const bold = TextStyle(fontWeight: FontWeight.w600, color: AppColors.textBody);
    Widget bullet(List<InlineSpan> spans) => Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(4, 6, 8, 0),
              child: CircleAvatar(radius: 2, backgroundColor: AppColors.textMedium),
            ),
            Expanded(
              child: Text.rich(TextSpan(children: spans),
                  style: const TextStyle(fontSize: 12, height: 1.45, color: AppColors.textMedium)),
            ),
          ]),
        );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.accentLight, borderRadius: BorderRadius.circular(8)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Row(children: [
          Icon(Icons.verified_user_outlined, size: 16, color: AppColors.primaryDark),
          SizedBox(width: 6),
          Text('Kebijakan Pembatalan H-7 TemenTrip',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
        ]),
        bullet(const [
          TextSpan(text: 'Pembatalan '),
          TextSpan(text: '≥7 hari', style: bold),
          TextSpan(text: ' sebelum trip berhak mendapatkan pengembalian dana '),
          TextSpan(text: '100% full refund', style: bold),
        ]),
        bullet(const [
          TextSpan(text: 'Pembatalan '),
          TextSpan(text: '< 7 hari', style: bold),
          TextSpan(text: ' sebelum trip dikenakan biaya pembatalan 100% '),
          TextSpan(text: '(0% refund / uang hangus)', style: bold),
        ]),
        bullet(const [
          TextSpan(text: 'Jika trip dibatalkan oleh provider/cuaca/kuota kurang, pemesan berhak atas '),
          TextSpan(text: '100% refund atau reschedule max. 1x', style: bold),
        ]),
      ]),
    );
  }
}

class _TapCard extends StatelessWidget {
  final Widget child;
  final VoidCallback onTap;
  final bool invalid;

  const _TapCard({required this.child, required this.onTap, this.invalid = false});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: invalid ? AppColors.dangerDark : AppColors.borderStrong),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 12, 16),
          child: Row(children: [
            Expanded(child: child),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ]),
        ),
      ),
    );
  }
}

class _ErrorNote extends StatelessWidget {
  final String text;

  const _ErrorNote(this.text);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: AppColors.dangerSoft, borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        const Icon(Icons.warning_amber_rounded, size: 18, color: AppColors.dangerDark),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: AppColors.dangerDark))),
      ]),
    );
  }
}

class _ParticipantSummary extends StatelessWidget {
  final int index;
  final Participant participant;
  final bool showPickup;

  const _ParticipantSummary({required this.index, required this.participant, required this.showPickup});

  @override
  Widget build(BuildContext context) {
    final p = participant;
    if (p.name.trim().isEmpty) {
      return Text('Peserta ${index + 1}',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: AppColors.textDark));
    }
    const detail = TextStyle(fontSize: 13, height: 1.4, color: AppColors.textMuted);
    final medical = p.medicalHistory.trim();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(p.name.trim(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: AppColors.textDark)),
      if (p.phone.isNotEmpty) ...[const SizedBox(height: 4), Text(displayPhone(p.phone), style: detail)],
      if (showPickup) ...[
        const SizedBox(height: 4),
        Text('Titik jemput: ${p.pickupPoint.trim().isEmpty ? '-' : p.pickupPoint.trim()}', style: detail),
      ],
      const SizedBox(height: 4),
      Text('Riwayat penyakit & alergi: ${medical.isEmpty ? '-' : medical}', style: detail),
    ]);
  }
}

/// Lembar "Data Pemesan".
class _BookerForm extends StatefulWidget {
  final _Booker initial;

  const _BookerForm({required this.initial});

  @override
  State<_BookerForm> createState() => _BookerFormState();
}

class _BookerFormState extends State<_BookerForm> {
  late final _name = TextEditingController(text: widget.initial.name);
  late final _email = TextEditingController(text: widget.initial.email);
  late final _phone = TextEditingController(text: phoneLocalPart(widget.initial.phone));
  late String _gender = widget.initial.gender;
  late String _birth = widget.initial.birthDate;
  Map<String, String> _errors = {};

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  _Booker get _value => _Booker(
        name: _name.text.trim(),
        email: _email.text.trim(),
        phone: phoneFromLocal(_phone.text),
        gender: _gender,
        birthDate: _birth,
      );

  void _save() {
    final errors = _bookerErrors(_value);
    if (errors.isNotEmpty) {
      setState(() => _errors = errors);
      return;
    }
    Navigator.pop(context, _value);
  }

  @override
  Widget build(BuildContext context) {
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Flexible(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          children: [
            LabeledField(
              label: 'Nama Lengkap',
              required: true,
              child: TextField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(hintText: 'Nama sesuai identitas', errorText: _errors['name']),
              ),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Alamat Email',
              required: true,
              child: TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  hintText: 'nama@email.com',
                  errorText: _errors['email'],
                  prefixIcon: const Icon(Icons.mail_outline, size: 20, color: AppColors.textMuted),
                ),
              ),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Nomor WhatsApp / HP',
              required: true,
              child: PhoneField(controller: _phone, errorText: _errors['phone']),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Jenis Kelamin',
              required: true,
              child: SelectField(
                value: _gender,
                options: _genders,
                hint: 'Pilih jenis kelamin',
                errorText: _errors['gender'],
                onChanged: (v) => setState(() => _gender = v ?? _gender),
              ),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Tanggal Lahir',
              required: true,
              child: BirthDateField(
                valueIso: _birth,
                errorText: _errors['birth'],
                onChanged: (v) => setState(() => _birth = v),
              ),
            ),
          ],
        ),
      ),
      SheetFormFooter(onSave: _save),
    ]);
  }
}

/// Lembar "Data Peserta N".
class _ParticipantForm extends StatefulWidget {
  final int index;
  final Participant initial;
  final TripPackage package;
  final String tripDateIso;

  /// Peserta 1 = pemesan: identitas mengikuti data pemesan.
  final bool lockIdentity;

  /// Titik jemput peserta 1, untuk tombol "Samakan dengan peserta 1".
  final String firstPickup;

  const _ParticipantForm({
    required this.index,
    required this.initial,
    required this.package,
    required this.tripDateIso,
    required this.lockIdentity,
    required this.firstPickup,
  });

  @override
  State<_ParticipantForm> createState() => _ParticipantFormState();
}

class _ParticipantFormState extends State<_ParticipantForm> {
  late final _name = TextEditingController(text: widget.initial.name);
  late final _phone = TextEditingController(text: phoneLocalPart(widget.initial.phone));
  late final _medical = TextEditingController(text: widget.initial.medicalHistory);
  final _pickupDetail = TextEditingController();
  late String _gender = widget.initial.gender;
  late String _birth = widget.initial.birthDate;

  /// Pilihan dropdown titik jemput: salah satu [_points], [_otherPickup],
  /// atau null bila belum dipilih.
  String? _pickupSelect;
  Map<String, String> _errors = {};

  List<String> get _points => widget.package.pickupPoints;

  @override
  void initState() {
    super.initState();
    _splitPickup(widget.initial.pickupPoint);
  }

  /// `Depok, Exit Tol Cisalak (lobby)` → pilihan daftar + detail.
  void _splitPickup(String value) {
    final v = value.trim();
    String? select = v.isEmpty ? null : _otherPickup;
    var detail = v;
    for (final point in _points) {
      if (v == point) {
        select = point;
        detail = '';
      } else if (v.startsWith('$point (') && v.endsWith(')')) {
        select = point;
        detail = v.substring(point.length + 2, v.length - 1);
      }
    }
    _pickupSelect = select;
    _pickupDetail.text = detail;
  }

  bool get _pointChosen => _pickupSelect != null && _pickupSelect != _otherPickup;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _medical.dispose();
    _pickupDetail.dispose();
    super.dispose();
  }

  String get _pickupValue {
    final detail = _pickupDetail.text.trim();
    if (!_pointChosen) return detail;
    return detail.isEmpty || detail == '-' ? _pickupSelect! : '$_pickupSelect ($detail)';
  }

  Participant get _value => Participant(
        name: _name.text.trim(),
        phone: phoneFromLocal(_phone.text),
        gender: _gender,
        birthDate: _birth,
        medicalHistory: _medical.text.trim(),
        pickupPoint: widget.package.isFlexiblePickup ? _pickupValue : '',
      );

  void _save() {
    final errors = _participantErrors(_value, widget.index, widget.package, widget.tripDateIso);
    if (widget.package.isFlexiblePickup && _points.isNotEmpty && _pickupSelect == null) {
      errors
        ..remove('pickup')
        ..['pickupSelect'] = 'Wajib diisi.';
    }
    if (errors.isNotEmpty) {
      setState(() => _errors = errors);
      return;
    }
    Navigator.pop(context, _value);
  }

  String? get _ageNote {
    final min = widget.package.minAge;
    final max = widget.package.maxAge;
    if (min > 0 && max > 0) return 'Usia peserta saat perjalanan harus berada dalam rentang $min–$max tahun.';
    if (min > 0) return 'Usia peserta saat perjalanan minimal $min tahun.';
    if (max > 0) return 'Usia peserta saat perjalanan maksimal $max tahun.';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final locked = widget.lockIdentity;
    final flexible = widget.package.isFlexiblePickup;
    final note = _ageNote;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Flexible(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          children: [
            if (note != null) ...[
              InfoBanner(
                icon: Icons.info_outline,
                message: note,
                color: AppColors.primaryDark,
                textColor: AppColors.primaryDark,
                background: AppColors.accentSoft,
                border: AppColors.accentLight,
              ),
              const SizedBox(height: 16),
            ],
            if (locked) ...[
              const InfoBanner(
                icon: Icons.person_outline,
                message: 'Peserta ini adalah Anda. Nama, nomor, jenis kelamin, dan tanggal lahir mengikuti data pemesan.',
                color: AppColors.textMedium,
                textColor: AppColors.textMedium,
                background: AppColors.background,
                border: AppColors.border,
              ),
              const SizedBox(height: 16),
            ],
            LabeledField(
              label: 'Nama Lengkap',
              required: true,
              child: TextField(
                controller: _name,
                enabled: !locked,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  hintText: 'Nama peserta ${widget.index + 1}',
                  errorText: _errors['name'],
                  fillColor: locked ? AppColors.divider : Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Nomor WhatsApp / HP',
              required: true,
              child: PhoneField(controller: _phone, errorText: _errors['phone'], enabled: !locked),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Tanggal Lahir',
              required: true,
              child: BirthDateField(
                valueIso: _birth,
                enabled: !locked,
                errorText: _errors['birth'],
                onChanged: (v) => setState(() => _birth = v),
              ),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Jenis Kelamin',
              required: true,
              child: SelectField(
                value: _gender,
                options: _genders,
                hint: 'Pilih jenis kelamin',
                errorText: _errors['gender'],
                onChanged: locked ? null : (v) => setState(() => _gender = v ?? _gender),
              ),
            ),
            if (flexible) ...[
              if (_points.isNotEmpty) ...[
                const SizedBox(height: 16),
                LabeledField(
                  label: 'Titik Jemput Peserta',
                  required: true,
                  child: SelectField(
                    value: _pickupSelect,
                    options: [..._points, _otherPickup],
                    hint: 'Pilih lokasi titik jemput',
                    errorText: _errors['pickupSelect'],
                    onChanged: (v) => setState(() => _pickupSelect = v),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              LabeledField(
                label: _pointChosen ? 'Detail Lainnya' : 'Alamat / Patokan Titik Jemput',
                required: !_pointChosen,
                child: TextField(
                  controller: _pickupDetail,
                  minLines: 3,
                  maxLines: 4,
                  maxLength: 400,
                  decoration: InputDecoration(
                    hintText: 'Patokan titik jemput (Contoh: depan pintu keluar Stasiun)',
                    errorText: _errors['pickup'],
                    counterText: '',
                  ),
                ),
              ),
              if (widget.package.pickupArea.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('Area penjemputan: ${widget.package.pickupArea}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ],
              if (widget.firstPickup.trim().isNotEmpty)
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    style: TextButton.styleFrom(padding: EdgeInsets.zero),
                    onPressed: () => setState(() => _splitPickup(widget.firstPickup)),
                    icon: const Icon(Icons.content_copy_rounded, size: 16),
                    label: const Text('Samakan dengan Peserta 1'),
                  ),
                ),
            ],
            const SizedBox(height: 16),
            LabeledField(
              label: 'Riwayat Penyakit & Alergi',
              child: TextField(
                controller: _medical,
                maxLength: 255,
                decoration: const InputDecoration(hintText: 'Contoh: Asma, Maag, dan lainnya', counterText: ''),
              ),
            ),
          ],
        ),
      ),
      SheetFormFooter(onSave: _save),
    ]);
  }

  static const _otherPickup = 'Lokasi lain dalam area penjemputan';
}
