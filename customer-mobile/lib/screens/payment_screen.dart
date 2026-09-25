import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/screens/payment_verification_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/checkout_config.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/legal_content.dart';

/// Konfirmasi pesanan sebelum invoice Xendit dibuat, padanan
/// `CustomerConfirmationPage` di web.
class PaymentScreen extends StatefulWidget {
  final BookingDraft draft;
  final BookerContact booker;
  final List<Participant> participants;

  const PaymentScreen({super.key, required this.draft, required this.booker, required this.participants});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  bool _agreed = false;
  String? _agreementError;
  bool _submitting = false;
  CheckoutConfig? _config;
  String? _configError;

  late final TapGestureRecognizer _termsTap = TapGestureRecognizer()..onTap = () => showGeneralTerms(context);
  late final TapGestureRecognizer _policyTap = TapGestureRecognizer()..onTap = () => showCancellationPolicy(context);

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  /// Biaya layanan diambil dari backend; tanpa angka itu total tidak
  /// ditampilkan dan pembayaran tidak dapat dilanjutkan, alih-alih menebak.
  Future<void> _loadConfig() async {
    setState(() => _configError = null);
    try {
      final config = await CheckoutConfig.load();
      if (mounted) setState(() => _config = config);
    } catch (e) {
      if (mounted) setState(() => _configError = e is ApiException ? e.message : 'Rincian biaya belum dapat dimuat.');
    }
  }

  @override
  void dispose() {
    _termsTap.dispose();
    _policyTap.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    if (!_agreed) {
      setState(() => _agreementError = 'Anda wajib menyetujui Syarat & Ketentuan untuk melanjutkan.');
      return;
    }
    setState(() => _agreementError = null);
    final config = _config;
    if (config == null) return;
    final total = widget.draft.totalWithFee(config.serviceFee);
    final ok = await showConfirmDialog(
      context,
      icon: Icons.help_outline,
      iconColor: AppColors.primary,
      iconBackground: AppColors.accentLight,
      title: 'Konfirmasi Pemesanan',
      message: Text.rich(
        TextSpan(
          text: 'Apakah Anda yakin data pemesanan dan seluruh peserta sudah benar dan ingin melanjutkan ke pembayaran sebesar ',
          children: [
            TextSpan(text: formatIDR(total), style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark)),
            const TextSpan(text: '?'),
          ],
        ),
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.5),
      ),
      cancelLabel: 'Batal (No)',
      confirmLabel: 'Ya, Bayar Sekarang',
    );
    if (ok) await _createInvoice();
  }

  Future<void> _createInvoice() async {
    setState(() => _submitting = true);
    try {
      final draft = widget.draft;
      if (draft.package.id <= 0) {
        throw const ApiException('Paket yang dipilih tidak valid. Silakan kembali dan pilih paket lagi.', 0);
      }
      final booking = await ApiService.createBooking(
        packageId: draft.package.id,
        booker: widget.booker,
        guests: draft.guests,
        tripDateIso: draft.startDate,
        participants: widget.participants,
      );
      final paymentUri = trustedPaymentUri(booking.paymentUrl);
      if (paymentUri == null) {
        throw const ApiException('Backend tidak mengembalikan Invoice URL Xendit yang valid', 0);
      }
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
            packageName: draft.package.name,
            openImmediately: true,
          ),
        ),
        (route) => route.isFirst,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      await showNoticeDialog(
        context,
        title: 'Gagal Membuat Invoice',
        message: 'Gagal membuat Invoice Xendit: ${e is ApiException ? e.message : 'Terjadi kesalahan sistem'}',
        isError: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.draft;
    return Scaffold(
      appBar: AppBar(title: const Text('Konfirmasi & Pembayaran Trip')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              style: TextButton.styleFrom(foregroundColor: AppColors.primary, padding: EdgeInsets.zero),
              onPressed: _submitting ? null : () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back, size: 18),
              label: const Text('Ubah Data Pemesan & Peserta'),
            ),
          ),
          const SizedBox(height: 8),
          SectionCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('Daftar Peserta Trip (${widget.participants.length} Orang)',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              const SizedBox(height: 14),
              for (var i = 0; i < widget.participants.length; i++) ...[
                _participantCard(i, widget.participants[i]),
                if (i < widget.participants.length - 1) const SizedBox(height: 12),
              ],
            ]),
          ),
          const SizedBox(height: 16),
          SectionCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Text('Ringkasan Pembayaran',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              const SizedBox(height: 14),
              Text(d.package.category.toUpperCase(),
                  style: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary, letterSpacing: 0.5)),
              const SizedBox(height: 4),
              Text(d.package.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              const SizedBox(height: 8),
              _iconLine(Icons.calendar_today_outlined, d.scheduleLabel),
              const SizedBox(height: 4),
              _iconLine(Icons.groups_outlined, '${d.guests} Peserta'),
              const Divider(height: 26),
              PriceRow('Harga (${d.guests}x)', formatIDR(d.packageTotal)),
              PriceRow('Biaya Admin', _config == null ? (_configError == null ? 'Memuat...' : '-') : formatIDR(_config!.serviceFee)),
              if (_configError != null) ...[
                const SizedBox(height: 6),
                Row(children: [
                  Expanded(child: ErrorText(_configError)),
                  TextButton(onPressed: _loadConfig, child: const Text('Coba Lagi')),
                ]),
              ],
              const SizedBox(height: 10),
              const _DashedDivider(),
              const SizedBox(height: 12),
              Row(children: [
                const Expanded(
                  child: Text('TOTAL PEMBAYARAN',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                ),
                Text(_config == null ? '-' : formatIDR(d.totalWithFee(_config!.serviceFee)),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary)),
              ]),
            ]),
          ),
          const SizedBox(height: 16),
          const InfoBanner(
            icon: Icons.verified_user_outlined,
            title: 'Kebijakan Pembatalan Strict H-7 TripKita',
            color: AppColors.primaryDark,
            background: Color(0xFFF0F9FF),
            border: Color(0xFFBAE6FD),
            textColor: Color(0xFF0C4A6E),
            message: '• Pembatalan ≥ 7 hari sebelum trip berhak pengembalian dana 100% Full Refund.\n'
                '• Pembatalan < 7 hari sebelum trip (H-6 s/d Hari H) dikenakan biaya pembatalan 100% (0% Refund / Uang Hangus).\n'
                '• Jika trip dibatalkan oleh Provider/Cuaca/Kuota Kurang, Pemesan berhak atas 100% Refund atau Reschedule Maks 1x.',
          ),
          const SizedBox(height: 16),
          SectionCard(
            padding: const EdgeInsets.fromLTRB(8, 10, 16, 12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Checkbox(
                  value: _agreed,
                  onChanged: (v) => setState(() {
                    _agreed = v ?? false;
                    if (_agreed) _agreementError = null;
                  }),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text.rich(
                      TextSpan(
                        text: 'Saya telah membaca dan menyetujui ',
                        style: const TextStyle(fontSize: 13, color: AppColors.textBody, height: 1.5),
                        children: [
                          TextSpan(text: 'Syarat & Ketentuan', style: _linkStyle, recognizer: _termsTap),
                          const TextSpan(text: ' serta '),
                          TextSpan(text: 'Kebijakan Pembatalan Strict H-7 TripKita', style: _linkStyle, recognizer: _policyTap),
                          const TextSpan(text: '. Seluruh data peserta yang diisikan adalah benar.'),
                        ],
                      ),
                    ),
                  ),
                ),
              ]),
              Padding(padding: const EdgeInsets.only(left: 12), child: ErrorText(_agreementError)),
            ]),
          ),
          const SizedBox(height: 20),
          PrimaryButton(
            label: _submitting ? 'Memproses Booking...' : 'Konfirmasi & Bayar Sekarang',
            loading: _submitting,
            color: AppColors.primary,
            onPressed: _config == null ? null : _confirm,
          ),
        ],
      ),
    );
  }

  static const _linkStyle = TextStyle(
    color: AppColors.primary,
    fontWeight: FontWeight.w700,
    decoration: TextDecoration.underline,
  );

  Widget _iconLine(IconData icon, String text) => Row(children: [
        Icon(icon, size: 14, color: AppColors.textLight),
        const SizedBox(width: 6),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: AppColors.textMuted))),
      ]);

  Widget _participantCard(int index, Participant p) {
    final hasMedical = p.medicalHistory.trim().isNotEmpty && p.medicalHistory.trim() != 'Tidak Ada' && p.medicalHistory.trim() != '-';
    Widget field(String label, String value) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(value.isEmpty ? '-' : value,
              style: const TextStyle(fontSize: 13.5, color: AppColors.textDark, fontWeight: FontWeight.w600)),
        ]);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Peserta ${index + 1}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.primary)),
        const Divider(height: 20),
        field('Nama Lengkap', p.name),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: field('Nomor HP / WhatsApp', p.phone)),
          Expanded(child: field('Jenis Kelamin', p.gender)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: field('Tanggal Lahir', formatIsoLong(p.birthDate))),
          Expanded(child: field('Umur', ageLabel(p.birthDate))),
        ]),
        const Divider(height: 20),
        const Text('Riwayat Penyakit & Alergi',
            style: TextStyle(fontSize: 11.5, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
        const SizedBox(height: 2),
        Text(hasMedical ? p.medicalHistory : 'Tidak Ada',
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
              color: hasMedical ? AppColors.danger : AppColors.success,
            )),
      ]),
    );
  }
}

class _DashedDivider extends StatelessWidget {
  const _DashedDivider();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final count = (constraints.maxWidth / 8).floor();
      return Row(
        children: List.generate(
          count,
          (_) => Expanded(child: Container(height: 1.5, margin: const EdgeInsets.symmetric(horizontal: 2), color: AppColors.borderStrong)),
        ),
      );
    });
  }
}
