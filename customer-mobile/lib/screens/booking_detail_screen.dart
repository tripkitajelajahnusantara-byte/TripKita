import 'package:flutter/material.dart';

import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/screens/booking_list_screen.dart';
import 'package:customer_mobile/screens/booking_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/form_fields.dart';

/// "Detail Booking": kode, ajakan memberi ulasan (booking selesai), rincian
/// trip, data pemesan & peserta, dan ringkasan pembayaran.
class BookingDetailScreen extends StatefulWidget {
  final Booking booking;
  final String packageName;

  /// Data form pemesanan, dipakai sebelum backend mengembalikan peserta.
  final BookingDraft? draft;
  final BookerContact? booker;
  final List<Participant>? participants;
  final VoidCallback? onReviewed;

  const BookingDetailScreen({
    super.key,
    required this.booking,
    required this.packageName,
    this.draft,
    this.booker,
    this.participants,
    this.onReviewed,
  });

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  /// Null selama status ulasan belum diketahui.
  bool? _reviewed;

  Booking get _b => widget.booking;

  @override
  void initState() {
    super.initState();
    if (_b.status == BookingStatus.completed) {
      ApiService.isBookingReviewed(_b.id).then((v) {
        if (mounted) setState(() => _reviewed = v);
      }).catchError((_) {
        if (mounted) setState(() => _reviewed = false);
      });
    }
  }

  Future<void> _review(int stars) async {
    final sent = await showReviewSheet(context, _b, initialStars: stars);
    if (sent == true && mounted) {
      setState(() => _reviewed = true);
      widget.onReviewed?.call();
      showTopToast(context, 'Ulasan berhasil dikirim');
    }
  }

  @override
  Widget build(BuildContext context) {
    final pkg = _b.packageDetails ?? widget.draft?.package;
    final start = _b.tripDate ?? parseIsoDate(widget.draft?.startDate ?? '');
    final end = _b.tripEndDate ?? parseIsoDate(widget.draft?.endDate ?? '') ?? start;
    final people = _b.participants.isNotEmpty ? _b.participants : (widget.participants ?? const <Participant>[]);
    final guests = _b.guests > 0 ? _b.guests : people.length;
    final flexible = pkg?.isFlexiblePickup ?? people.any((p) => p.pickupPoint.isNotEmpty);
    return Scaffold(
      appBar: AppBar(titleSpacing: 0, title: const Text('Detail Booking')),
      body: DefaultTextStyle.merge(
        style: figmaTextStyle,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          children: [
            _codeCard(),
            if (_b.status == BookingStatus.completed && _reviewed == false) ...[
              const SizedBox(height: 16),
              _ratingCard(),
            ],
            const SizedBox(height: 16),
            _TripCard(
              photo: pkg == null || pkg.photos.isEmpty ? '' : pkg.photos.first,
              meta: pkg == null ? '' : tripMetaLabel(pkg),
              name: widget.packageName,
              date: start == null ? '-' : formatDateRange(start, end!),
              guests: guests,
            ),
            const SizedBox(height: 14),
            const SectionTitle('Data Pemesan'),
            const SizedBox(height: 10),
            _bookerCard(),
            if (people.isNotEmpty) ...[
              const SizedBox(height: 14),
              const SectionTitle('Data Peserta'),
              const SizedBox(height: 10),
              for (var i = 0; i < people.length; i++) ...[
                if (i > 0) const SizedBox(height: 8),
                _ParticipantCard(index: i, participant: people[i], showPickup: flexible),
              ],
            ],
            const SizedBox(height: 14),
            const SectionTitle('Ringkasan Pembayaran'),
            const SizedBox(height: 10),
            _summary(pkg == null
                ? null
                : BookingDraft(
                    package: pkg,
                    guests: guests,
                    startDate: '',
                    endDate: '',
                    scheduleLabel: '',
                    addOns: _b.addOns.isNotEmpty ? _b.addOns : widget.draft?.addOns ?? const [],
                  )),
          ],
        ),
      ),
    );
  }

  static final _cardDecoration = BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(8),
    border: Border.all(color: AppColors.border),
  );

  Widget _codeCard() {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 15),
      decoration: _cardDecoration,
      child: Row(children: [
        const Text('Kode Booking', style: TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
        const SizedBox(width: 12),
        Expanded(
          child: Text(_b.bookingCode,
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
        ),
      ]),
    );
  }

  Widget _ratingCard() {
    return Container(
      height: 126,
      padding: const EdgeInsets.fromLTRB(15, 15, 15, 0),
      decoration: _cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Bagaimana Trip Anda?',
            style: TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
        const SizedBox(height: 4),
        const Text('Ketuk bintang untuk memberikan penilaian',
            style: TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMuted)),
        const SizedBox(height: 12.5),
        Transform.translate(offset: const Offset(-2, 0), child: StarRow(value: 0, onChanged: _review)),
      ]),
    );
  }

  Widget _bookerCard() {
    final name = widget.booker?.name ?? _b.customerName;
    final email = widget.booker?.email ?? _b.customerEmail;
    final phone = widget.booker?.whatsapp ?? _b.customerPhone;
    const detail = TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMedium);
    return Container(
      constraints: const BoxConstraints(minHeight: 88),
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
      alignment: Alignment.centerLeft,
      decoration: _cardDecoration,
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(name.isEmpty ? '-' : name,
            style: const TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.textDark)),
        if (email.isNotEmpty) ...[const SizedBox(height: 4), Text(email, style: detail)],
        if (phone.isNotEmpty) ...[const SizedBox(height: 4), Text(displayPhone(phone), style: detail)],
      ]),
    );
  }

  Widget _summary(BookingDraft? draft) {
    final rows = draft == null ? <(String, String)>[] : priceRows(draft);
    if (draft != null) {
      final base =
          draft.package.basePrice(draft.guests) + draft.addOns.fold<int>(0, (s, a) => s + a.subtotalFor(draft.guests));
      final fee = _b.totalPrice - base;
      if (fee > 0) rows.add(('Biaya Layanan', formatPrice(fee)));
    }
    return PaymentSummaryCard(
      rows: rows.isEmpty ? [('Total Harga', formatPrice(_b.totalPrice))] : rows,
      totalLabel: 'Total Penjualan',
      total: formatPrice(_b.totalPrice),
      radius: 12,
    );
  }
}

/// Kartu rincian trip tanpa potongan tiket: foto, tipe, nama, tanggal,
/// jumlah peserta.
class _TripCard extends StatelessWidget {
  final String photo;
  final String meta;
  final String name;
  final String date;
  final int guests;

  const _TripCard(
      {required this.photo, required this.meta, required this.name, required this.date, required this.guests});

  @override
  Widget build(BuildContext context) {
    Widget labelValue(String label, String value) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMuted)),
          const SizedBox(height: 3.5),
          Text(value,
              style: const TextStyle(
                  fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: AppColors.textMedium)),
        ]);
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ClipRRect(borderRadius: BorderRadius.circular(8), child: NetworkPhoto(photo, width: 64, height: 64)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (meta.isNotEmpty)
                Text(meta,
                    style: const TextStyle(
                        fontSize: 12, height: 18 / 12, fontWeight: FontWeight.w500, color: AppColors.textMuted)),
              const SizedBox(height: 3),
              Text(name,
                  style: const TextStyle(
                      fontSize: 16, height: 22 / 16, fontWeight: FontWeight.w500, color: AppColors.textDark)),
            ]),
          ),
        ]),
        const SizedBox(height: 13.4),
        labelValue('Tanggal Keberangkatan', date),
        const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider(height: 1)),
        labelValue('Jumlah Peserta', '$guests orang'),
      ]),
    );
  }
}

/// Kartu peserta (radius 16): nomor, nama, kontak, titik jemput, riwayat.
class _ParticipantCard extends StatelessWidget {
  final int index;
  final Participant participant;
  final bool showPickup;

  const _ParticipantCard({required this.index, required this.participant, required this.showPickup});

  @override
  Widget build(BuildContext context) {
    final p = participant;
    const small = TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMedium);
    final medical = p.medicalHistory.trim();
    return Container(
      padding: const EdgeInsets.fromLTRB(15, 14, 15, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Peserta ${index + 1}', style: small.copyWith(color: AppColors.textMuted)),
        const SizedBox(height: 10),
        Text(p.name.trim().isEmpty ? '-' : p.name.trim(),
            style: const TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.textDark)),
        if (p.phone.isNotEmpty) ...[const SizedBox(height: 4), Text(displayPhone(p.phone), style: small)],
        if (showPickup) ...[
          const SizedBox(height: 8),
          Text('Titik jemput: ${p.pickupPoint.trim().isEmpty ? '-' : p.pickupPoint.trim()}', style: small),
        ],
        const SizedBox(height: 6),
        Text('Riwayat penyakit & alergi: ${medical.isEmpty ? '-' : medical}', style: small),
      ]),
    );
  }
}
