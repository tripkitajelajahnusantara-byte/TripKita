import 'package:flutter/material.dart';

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/common.dart';

/// Jadwal terpilih: tanggal mulai/selesai (YYYY-MM-DD) dan sisa kursinya.
class ScheduleChoice {
  final String startIso;
  final String endIso;
  final int seatsLeft;

  const ScheduleChoice(this.startIso, this.endIso, this.seatsLeft);

  int get days => parseIsoDate(endIso)!.difference(parseIsoDate(startIso)!).inDays + 1;
}

/// Sisa kursi ≤ 10 ditampilkan merah agar customer segera memesan.
const _urgentSeats = 10;

/// `3 hari, 2 malam • 7 kuota tersisa`
class _QuotaLine extends StatelessWidget {
  final int days;
  final int seatsLeft;
  final String? overrideText;

  const _QuotaLine({required this.days, required this.seatsLeft, this.overrideText});

  @override
  Widget build(BuildContext context) {
    final urgent = overrideText == null && seatsLeft <= _urgentSeats;
    return Text.rich(
      TextSpan(text: durationLabel(days), children: [
        const TextSpan(text: '  •  ', style: TextStyle(color: AppColors.borderStrong)),
        TextSpan(
          text: overrideText ?? (urgent ? '$seatsLeft kuota tersisa' : '$seatsLeft kuota tersedia'),
          style: TextStyle(color: urgent || overrideText != null ? AppColors.dangerDark : AppColors.textMuted),
        ),
      ]),
      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
    );
  }
}

String _rangeArrow(String startIso, String endIso) =>
    '${formatDateShort(parseIsoDate(startIso))} → ${formatDateShort(parseIsoDate(endIso))}';

/// Kotak "Tanggal Dipilih".
class SelectedScheduleBox extends StatelessWidget {
  final ScheduleChoice choice;
  final bool highlighted;
  final VoidCallback? onChange;

  const SelectedScheduleBox({super.key, required this.choice, this.highlighted = false, this.onChange});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
      decoration: BoxDecoration(
        color: highlighted ? AppColors.accentSoft : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: highlighted ? AppColors.accent : AppColors.borderStrong, width: highlighted ? 1.5 : 1),
      ),
      child: Row(children: [
        const Icon(Icons.event_available_outlined, color: AppColors.accent, size: 22),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Tanggal Dipilih', style: TextStyle(fontSize: 11, color: AppColors.primaryDark)),
            const SizedBox(height: 4),
            Text(_rangeArrow(choice.startIso, choice.endIso),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textDark)),
            const SizedBox(height: 4),
            _QuotaLine(days: choice.days, seatsLeft: choice.seatsLeft),
          ]),
        ),
        if (onChange != null)
          TextButton(onPressed: onChange, child: const Text('Ubah')),
      ]),
    );
  }
}

/// Footer harga lembar jadwal: "Mulai dari Rp…/orang" + tombol.
class _PriceFooter extends StatelessWidget {
  final String caption;
  final int amount;
  final String suffix;
  final String buttonLabel;
  final VoidCallback? onPressed;

  const _PriceFooter({
    required this.caption,
    required this.amount,
    required this.suffix,
    required this.buttonLabel,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return BottomActionBar(
      child: Row(children: [
        Expanded(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(caption, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
            const SizedBox(height: 2),
            Text.rich(TextSpan(
              text: formatPrice(amount),
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.primaryDark),
              children: [
                if (suffix.isNotEmpty)
                  TextSpan(text: ' $suffix', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.textMuted)),
              ],
            )),
          ]),
        ),
        const SizedBox(width: 12),
        SizedBox(width: 160, child: ElevatedButton(onPressed: onPressed, child: Text(buttonLabel))),
      ]),
    );
  }
}

String _priceSuffix(TripPackage pkg) => pkg.isPerUnit ? '/${pkg.unitLabel}' : '/orang';

/// Lembar "Jadwal Tersedia" untuk Open Trip: daftar keberangkatan per bulan.
Future<ScheduleChoice?> showDepartureSheet(BuildContext context, {required TripPackage pkg, String? selectedIso}) {
  return showDesignSheet<ScheduleChoice>(
    context,
    title: 'Jadwal Tersedia',
    subtitle: 'Pilih tanggal keberangkatan yang tersedia.',
    showClose: false,
    builder: (_) => _DepartureList(pkg: pkg, selectedIso: selectedIso),
  );
}

class _DepartureList extends StatefulWidget {
  final TripPackage pkg;
  final String? selectedIso;

  const _DepartureList({required this.pkg, this.selectedIso});

  @override
  State<_DepartureList> createState() => _DepartureListState();
}

class _DepartureListState extends State<_DepartureList> {
  late final List<Departure> _all = upcomingDepartures(widget.pkg);
  late String? _selected = _all.any((d) => d.date == widget.selectedIso && _bookable(d)) ? widget.selectedIso : null;
  late String _month = (_selected ?? (_all.isEmpty ? '' : _all.first.date)).padRight(7).substring(0, 7);

  bool _bookable(Departure d) => !d.closed && d.seatsLeft >= widget.pkg.minRequiredGuests;

  List<String> get _months => _all.map((d) => d.date.substring(0, 7)).toSet().toList();

  @override
  Widget build(BuildContext context) {
    final visible = _all.where((d) => d.date.startsWith(_month)).toList();
    final chosen = _all.where((d) => d.date == _selected).firstOrNull;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (_months.length > 1)
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            children: [
              for (final m in _months) ...[
                BadgeChip(
                  label: '${monthsFull[int.parse(m.substring(5)) - 1]} ${m.substring(0, 4)}',
                  selected: m == _month,
                  onTap: () => setState(() => _month = m),
                ),
                const SizedBox(width: 8),
              ],
            ],
          ),
        ),
      const Divider(height: 1),
      Flexible(
        child: _all.isEmpty
            ? const Padding(
                padding: EdgeInsets.all(24),
                child: Text('Belum ada jadwal keberangkatan yang akan datang untuk Open Trip ini.',
                    textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: AppColors.textMuted)),
              )
            : ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.all(16),
                itemCount: visible.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, i) => _departureTile(visible[i]),
              ),
      ),
      _PriceFooter(
        caption: 'Mulai dari',
        amount: widget.pkg.price,
        suffix: _priceSuffix(widget.pkg),
        buttonLabel: 'Lanjutkan',
        onPressed: chosen == null
            ? null
            : () => Navigator.pop(context, ScheduleChoice(chosen.date, chosen.endDate, chosen.seatsLeft)),
      ),
    ]);
  }

  Widget _departureTile(Departure d) {
    final bookable = _bookable(d);
    final selected = d.date == _selected;
    final days = parseIsoDate(d.endDate)!.difference(parseIsoDate(d.date)!).inDays + 1;
    return Material(
      color: selected ? AppColors.accentSoft : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: selected ? AppColors.accent : AppColors.borderStrong, width: selected ? 1.5 : 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: bookable ? () => setState(() => _selected = d.date) : null,
        child: Opacity(
          opacity: bookable ? 1 : 0.55,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 4, 12),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(_rangeArrow(d.date, d.endDate),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textDark)),
                  const SizedBox(height: 4),
                  _QuotaLine(
                    days: days,
                    seatsLeft: d.seatsLeft,
                    overrideText: d.closed
                        ? 'Jadwal ditutup'
                        : d.seatsLeft <= 0
                            ? 'Kuota penuh'
                            : !bookable
                                ? 'Sisa ${d.seatsLeft}, min. ${widget.pkg.minRequiredGuests} peserta'
                                : null,
                  ),
                ]),
              ),
              Radio<String>(
                value: d.date,
                groupValue: _selected,
                onChanged: bookable ? (v) => setState(() => _selected = v) : null,
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Lembar "Jadwal Tersedia" untuk paket non-Open Trip: kalender tanggal
/// mulai. Tanggal sebelum [minIso] (H-7), di luar periode, tidak dibuka mitra,
/// atau yang rentangnya mengenai tanggal terpesan tidak dapat dipilih.
Future<ScheduleChoice?> showDateSheet(
  BuildContext context, {
  required TripPackage pkg,
  required String minIso,
  String? maxIso,
  String? selectedIso,
}) {
  return showDesignSheet<ScheduleChoice>(
    context,
    title: 'Jadwal Tersedia',
    subtitle: 'Pilih tanggal keberangkatan yang tersedia.',
    showClose: false,
    builder: (_) => _DateCalendar(pkg: pkg, minIso: minIso, maxIso: maxIso, selectedIso: selectedIso),
  );
}

class _DateCalendar extends StatefulWidget {
  final TripPackage pkg;
  final String minIso;
  final String? maxIso;
  final String? selectedIso;

  const _DateCalendar({required this.pkg, required this.minIso, this.maxIso, this.selectedIso});

  @override
  State<_DateCalendar> createState() => _DateCalendarState();
}

class _DateCalendarState extends State<_DateCalendar> {
  late String? _start = widget.selectedIso != null && _selectable(widget.selectedIso!) ? widget.selectedIso : null;
  late DateTime _month;
  late final DateTime _firstMonth;
  late final DateTime _lastMonth;

  @override
  void initState() {
    super.initState();
    final min = parseIsoDate(widget.minIso)!;
    _firstMonth = DateTime(min.year, min.month);
    var last = DateTime(_firstMonth.year, _firstMonth.month + 11);
    final max = parseIsoDate(widget.maxIso ?? '');
    if (max != null && DateTime(max.year, max.month).isBefore(last)) last = DateTime(max.year, max.month);
    _lastMonth = last;
    final base = parseIsoDate(_start ?? '') ?? _firstAvailable ?? min;
    _month = DateTime(base.year, base.month);
  }

  DateTime? get _firstAvailable {
    final open = widget.pkg.availableDates.where(_selectable).toList()..sort();
    return open.isEmpty ? null : parseIsoDate(open.first);
  }

  String _endOf(String iso) => toIsoDate(parseIsoDate(iso)!.add(Duration(days: widget.pkg.durationDays - 1)));

  bool _selectable(String iso) {
    final pkg = widget.pkg;
    if (iso.compareTo(widget.minIso) < 0) return false;
    if (widget.maxIso != null && iso.compareTo(widget.maxIso!) > 0) return false;
    if (pkg.availableDates.isNotEmpty && !pkg.availableDates.contains(iso)) return false;
    final end = _endOf(iso);
    return !pkg.bookedDates.any((b) => b.compareTo(iso) >= 0 && b.compareTo(end) <= 0);
  }

  @override
  Widget build(BuildContext context) {
    final canPrev = _month.isAfter(_firstMonth);
    final canNext = _month.isBefore(_lastMonth);
    final start = _start;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Flexible(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          children: [
            Row(children: [
              Expanded(
                child: Text('${monthsFull[_month.month - 1]} ${_month.year}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textDark)),
              ),
              IconButton(
                tooltip: 'Bulan sebelumnya',
                onPressed: canPrev ? () => setState(() => _month = DateTime(_month.year, _month.month - 1)) : null,
                icon: const Icon(Icons.chevron_left_rounded),
              ),
              IconButton(
                tooltip: 'Bulan berikutnya',
                onPressed: canNext ? () => setState(() => _month = DateTime(_month.year, _month.month + 1)) : null,
                icon: const Icon(Icons.chevron_right_rounded),
              ),
            ]),
            const SizedBox(height: 4),
            _grid(),
            if (start != null) ...[
              const SizedBox(height: 16),
              SelectedScheduleBox(
                highlighted: true,
                choice: ScheduleChoice(start, _endOf(start), widget.pkg.availableSeats),
              ),
            ],
          ],
        ),
      ),
      _PriceFooter(
        caption: 'Mulai dari',
        amount: widget.pkg.price,
        suffix: _priceSuffix(widget.pkg),
        buttonLabel: 'Lanjutkan',
        onPressed: start == null
            ? null
            : () => Navigator.pop(context, ScheduleChoice(start, _endOf(start), widget.pkg.availableSeats)),
      ),
    ]);
  }

  Widget _grid() {
    final first = DateTime(_month.year, _month.month, 1);
    final leading = (first.weekday + 6) % 7; // Senin sebagai kolom pertama.
    final rows = ((leading + DateTime(_month.year, _month.month + 1, 0).day) / 7).ceil();
    final cells = <Widget>[
      for (final w in weekdaysShort)
        Center(child: Text(w, style: const TextStyle(fontSize: 12, color: AppColors.textMuted))),
    ];
    for (var i = 0; i < rows * 7; i++) {
      final day = first.add(Duration(days: i - leading));
      final inMonth = day.month == _month.month;
      final iso = toIsoDate(day);
      final selectable = inMonth && _selectable(iso);
      final selected = iso == _start;
      final inRange = _start != null && iso.compareTo(_start!) > 0 && iso.compareTo(_endOf(_start!)) <= 0;
      final color = selected
          ? Colors.white
          : inRange
              ? AppColors.primaryDark
              : selectable
                  ? AppColors.textDark
                  : AppColors.borderStrong;
      cells.add(Semantics(
        button: selectable,
        selected: selected,
        label: formatDateLong(day),
        child: Material(
          color: selected ? AppColors.accent : (inRange && inMonth ? AppColors.accentLight : Colors.transparent),
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: selectable ? () => setState(() => _start = iso) : null,
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('${day.day}', style: TextStyle(fontSize: 16, color: inMonth ? color : AppColors.border)),
              const SizedBox(height: 3),
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selectable ? (selected ? Colors.white : AppColors.accent) : Colors.transparent,
                ),
              ),
            ]),
          ),
        ),
      ));
    }
    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 4,
      crossAxisSpacing: 4,
      childAspectRatio: 1,
      children: cells,
    );
  }
}

/// Hasil lembar "Jumlah Peserta": jumlah, atau [changeDate] bila customer
/// ingin mengganti tanggal.
class GuestChoice {
  final int guests;
  final bool changeDate;

  const GuestChoice(this.guests) : changeDate = false;
  const GuestChoice.changeDate()
      : guests = 0,
        changeDate = true;
}

/// Lembar "Jumlah Peserta" dengan total estimasi.
Future<GuestChoice?> showGuestSheet(
  BuildContext context, {
  required TripPackage pkg,
  required ScheduleChoice schedule,
  required int initialGuests,
}) {
  return showDesignSheet<GuestChoice>(
    context,
    title: 'Jumlah Peserta',
    showClose: false,
    builder: (_) => _GuestPicker(pkg: pkg, schedule: schedule, initialGuests: initialGuests),
  );
}

class _GuestPicker extends StatefulWidget {
  final TripPackage pkg;
  final ScheduleChoice schedule;
  final int initialGuests;

  const _GuestPicker({required this.pkg, required this.schedule, required this.initialGuests});

  @override
  State<_GuestPicker> createState() => _GuestPickerState();
}

class _GuestPickerState extends State<_GuestPicker> {
  late int _guests = widget.initialGuests.clamp(_min, _max < _min ? _min : _max);

  int get _min => widget.pkg.minRequiredGuests;

  int get _max {
    final seats = widget.schedule.seatsLeft;
    final cap = widget.pkg.maxGuests;
    return cap > 0 && cap < seats ? cap : seats;
  }

  @override
  Widget build(BuildContext context) {
    final pkg = widget.pkg;
    final enough = _max >= _min;
    final units = pkg.unitsFor(_guests);
    Widget step(IconData icon, String tooltip, bool enabled, VoidCallback onTap) => Material(
          color: enabled ? AppColors.accentLight : AppColors.divider,
          borderRadius: BorderRadius.circular(6),
          child: InkWell(
            borderRadius: BorderRadius.circular(6),
            onTap: enabled ? onTap : null,
            child: SizedBox(
              width: 36,
              height: 36,
              child: Icon(icon, size: 20, color: enabled ? AppColors.accent : AppColors.borderStrong, semanticLabel: tooltip),
            ),
          ),
        );
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Flexible(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          children: [
            SelectedScheduleBox(
              choice: widget.schedule,
              onChange: () => Navigator.pop(context, const GuestChoice.changeDate()),
            ),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Jumlah Peserta', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textDark)),
                  const SizedBox(height: 4),
                  Text(
                    [
                      'Min. $_min peserta',
                      if (pkg.maxGuests > 0) 'maks. ${pkg.maxGuests}',
                    ].join(', '),
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                ]),
              ),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  step(Icons.remove_rounded, 'Kurangi peserta', enough && _guests > _min, () => setState(() => _guests--)),
                  SizedBox(
                    width: 44,
                    child: Text('$_guests',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: AppColors.textDark)),
                  ),
                  step(Icons.add_rounded, 'Tambah peserta', enough && _guests < _max, () => setState(() => _guests++)),
                ]),
              ),
            ]),
            if (units > 0) ...[
              const SizedBox(height: 10),
              Text('$units ${pkg.unitLabel} × ${formatPrice(pkg.price)} (maks. ${pkg.unitCapacity} orang per ${pkg.unitLabel})',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ],
            if (!enough) ...[
              const SizedBox(height: 12),
              InfoBanner(
                icon: Icons.error_outline,
                message: 'Sisa kuota tanggal ini (${widget.schedule.seatsLeft}) kurang dari minimal $_min peserta. Silakan pilih tanggal lain.',
                color: AppColors.dangerDark,
                textColor: AppColors.dangerDark,
                background: AppColors.dangerSoft,
                border: AppColors.dangerSoft,
              ),
            ],
          ],
        ),
      ),
      _PriceFooter(
        caption: 'Total estimasi',
        amount: pkg.basePrice(_guests),
        suffix: '',
        buttonLabel: 'Pesan Sekarang',
        onPressed: enough ? () => Navigator.pop(context, GuestChoice(_guests)) : null,
      ),
    ]);
  }
}
