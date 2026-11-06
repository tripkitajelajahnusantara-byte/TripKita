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

/// `3 hari • 7 kuota tersisa` (12 Medium, titik pemisah abu-abu).
class _QuotaLine extends StatelessWidget {
  final int days;
  final int seatsLeft;
  final String? overrideText;

  const _QuotaLine({required this.days, required this.seatsLeft, this.overrideText});

  @override
  Widget build(BuildContext context) {
    final urgent = overrideText == null && seatsLeft <= _urgentSeats;
    const style = TextStyle(fontSize: 12, height: 20 / 12, fontWeight: FontWeight.w500, color: AppColors.textMuted);
    return Row(children: [
      Text('$days hari', style: style),
      Container(
        width: 2.8,
        height: 2.8,
        margin: const EdgeInsets.only(left: 6, right: 5, top: 1),
        decoration: const BoxDecoration(color: AppColors.borderStrong, shape: BoxShape.circle),
      ),
      Flexible(
        child: Text(
          overrideText ?? (urgent ? '$seatsLeft kuota tersisa' : '$seatsLeft kuota tersedia'),
          overflow: TextOverflow.ellipsis,
          style: style.copyWith(color: urgent || overrideText != null ? AppColors.errorText : AppColors.textMedium),
        ),
      ),
    ]);
  }
}

String _rangeArrow(String startIso, String endIso) =>
    '${formatDateShort(parseIsoDate(startIso))} → ${formatDateShort(parseIsoDate(endIso))}';

const _rangeStyle = TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w500, color: AppColors.textDark);

/// Kotak "Tanggal Dipilih" setinggi 92.
class SelectedScheduleBox extends StatelessWidget {
  final ScheduleChoice choice;
  final bool highlighted;
  final VoidCallback? onChange;

  const SelectedScheduleBox({super.key, required this.choice, this.highlighted = false, this.onChange});

  @override
  Widget build(BuildContext context) {
    final border = highlighted ? 2.0 : 1.0;
    return Container(
      height: 92,
      padding: EdgeInsets.only(left: 16 - border, right: 16.9 - border),
      decoration: BoxDecoration(
        color: highlighted ? AppColors.accentSoft : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: highlighted ? AppColors.accent : AppColors.borderStrong, width: border),
      ),
      child: Row(children: [
        const AppIcon('calendar_check', color: AppColors.accent),
        const SizedBox(width: 8),
        Expanded(
          child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Tanggal Dipilih',
                style: TextStyle(fontSize: 10, height: 14 / 10, fontWeight: FontWeight.w500, color: AppColors.primaryDark)),
            const SizedBox(height: 4),
            Text(_rangeArrow(choice.startIso, choice.endIso), style: _rangeStyle),
            _QuotaLine(days: choice.days, seatsLeft: choice.seatsLeft),
          ]),
        ),
        if (onChange != null)
          GestureDetector(
            onTap: onChange,
            child: const Text('Ubah',
                style: TextStyle(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w600, color: AppColors.accent)),
          ),
      ]),
    );
  }
}

/// Footer harga lembar jadwal: "Mulai dari Rp…/orang" + tombol 160.
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
        Expanded(child: PriceCaption(caption: caption, amount: amount, suffix: suffix)),
        const SizedBox(width: 12),
        SizedBox(width: 160, child: ElevatedButton(onPressed: onPressed, child: Text(buttonLabel))),
      ]),
    );
  }
}

/// "Mulai dari" (14 Medium) di atas harga 20 Bold teal dan akhiran 16 abu.
class PriceCaption extends StatelessWidget {
  final String caption;
  final int amount;
  final String suffix;

  const PriceCaption({super.key, required this.caption, required this.amount, this.suffix = ''});

  @override
  Widget build(BuildContext context) {
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(caption,
          style: const TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: AppColors.textMuted)),
      Text.rich(
        TextSpan(
          text: formatPrice(amount),
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.primaryDark),
          children: [
            if (suffix.isNotEmpty)
              TextSpan(
                text: ' $suffix',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: AppColors.textLight),
              ),
          ],
        ),
        style: const TextStyle(height: 26 / 20),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    ]);
  }
}

String _priceSuffix(TripPackage pkg) => pkg.isPerUnit ? '/${pkg.unitLabel}' : '/orang';

/// Subjudul lembar jadwal.
const _scheduleSubtitle = 'Pilih tanggal keberangkatan yang tersedia.';

/// Lembar "Jadwal Tersedia" untuk Open Trip: daftar keberangkatan per bulan.
Future<ScheduleChoice?> showDepartureSheet(BuildContext context, {required TripPackage pkg, String? selectedIso}) {
  return showDesignSheet<ScheduleChoice>(
    context,
    title: 'Jadwal Tersedia',
    subtitle: _scheduleSubtitle,
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
          height: 43,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 15),
            children: [
              for (final m in _months) ...[
                _MonthChip(
                  label: '${monthsFull[int.parse(m.substring(5)) - 1]} ${m.substring(0, 4)}',
                  selected: m == _month,
                  onTap: () => setState(() => _month = m),
                ),
                const SizedBox(width: 6),
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
        buttonLabel: 'Pilih Jadwal',
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
          child: SizedBox(
            height: 72,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(children: [
                Expanded(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(_rangeArrow(d.date, d.endDate), style: _rangeStyle),
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
                _RadioDot(selected: selected),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// Radio Figma 20: lingkaran bergaris, isi teal saat terpilih.
class _RadioDot extends StatelessWidget {
  final bool selected;

  const _RadioDot({required this.selected});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20,
      height: 20,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: selected ? AppColors.accent : AppColors.borderStrong, width: selected ? 6 : 1),
      ),
    );
  }
}

/// Chip bulan 28 (14 Medium): terpilih berlatar teal muda.
class _MonthChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _MonthChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.accentSoft : Colors.white,
      shape: StadiumBorder(
        side: BorderSide(color: selected ? const Color(0xFFC0ECEC) : AppColors.border, width: 0.875),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: 28,
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 9),
          child: Text(label,
              style: TextStyle(
                fontSize: 14,
                height: 20 / 14,
                fontWeight: FontWeight.w500,
                color: selected ? AppColors.primaryDark : AppColors.textBody,
              )),
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
    subtitle: _scheduleSubtitle,
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
    Widget arrow(String icon, String tooltip, bool enabled, int delta) => IconButton(
          tooltip: tooltip,
          onPressed: enabled ? () => setState(() => _month = DateTime(_month.year, _month.month + delta)) : null,
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints.tightFor(width: 24, height: 24),
          icon: AppIcon(icon, color: enabled ? AppColors.icon : AppColors.borderStrong),
        );
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Flexible(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          children: [
            SizedBox(
              height: 24,
              child: Row(children: [
                Expanded(
                  child: Text('${monthsFull[_month.month - 1]} ${_month.year}',
                      style: const TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w500, color: AppColors.textDark)),
                ),
                arrow('caret_left_thin', 'Bulan sebelumnya', canPrev, -1),
                const SizedBox(width: 21.26),
                arrow('caret_right_thin', 'Bulan berikutnya', canNext, 1),
                const SizedBox(width: 5.37),
              ]),
            ),
            const SizedBox(height: 23.25),
            Row(children: [
              for (final w in weekdaysShort)
                Expanded(
                  child: Text(w,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontSize: 12, height: 16 / 12, letterSpacing: 0.96, color: AppColors.calendarWeekday)),
                ),
            ]),
            const SizedBox(height: 12.75),
            ..._weeks(),
          ],
        ),
      ),
      const SizedBox(height: 15.5),
      const Divider(height: 1),
      if (start != null)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: SelectedScheduleBox(
            highlighted: true,
            choice: ScheduleChoice(start, _endOf(start), widget.pkg.availableSeats),
          ),
        ),
      const SizedBox(height: 16),
      _PriceFooter(
        caption: 'Mulai dari',
        amount: widget.pkg.price,
        suffix: _priceSuffix(widget.pkg),
        buttonLabel: 'Pilih Jadwal',
        onPressed: start == null
            ? null
            : () => Navigator.pop(context, ScheduleChoice(start, _endOf(start), widget.pkg.availableSeats)),
      ),
    ]);
  }

  /// Baris minggu: sel 40 tinggi berjarak 8; angka 16, titik 4 di bawahnya
  /// untuk tanggal yang dapat dipilih.
  List<Widget> _weeks() {
    final first = DateTime(_month.year, _month.month, 1);
    final leading = (first.weekday + 6) % 7; // Senin sebagai kolom pertama.
    final rows = ((leading + DateTime(_month.year, _month.month + 1, 0).day) / 7).ceil();
    return [
      for (var r = 0; r < rows; r++) ...[
        if (r > 0) const SizedBox(height: 8),
        Row(children: [
          for (var c = 0; c < 7; c++) Expanded(child: _day(first.add(Duration(days: r * 7 + c - leading)))),
        ]),
      ],
    ];
  }

  Widget _day(DateTime day) {
    final inMonth = day.month == _month.month;
    final iso = toIsoDate(day);
    final selectable = inMonth && _selectable(iso);
    final selected = iso == _start;
    final color = selected ? Colors.white : (selectable ? AppColors.textMedium : AppColors.textLight);
    return Semantics(
      button: selectable,
      selected: selected,
      label: formatDateLong(day),
      child: Material(
        color: selected ? AppColors.accent : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: selectable ? () => setState(() => _start = iso) : null,
          child: SizedBox(
            height: 40,
            child: Stack(alignment: Alignment.topCenter, children: [
              Positioned(
                top: 10,
                child: Text('${day.day}',
                    style: TextStyle(
                      fontSize: 16,
                      height: 1.17,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                      color: color,
                    )),
              ),
              if (selectable)
                Positioned(
                  top: 30,
                  child: Container(
                    width: 4,
                    height: 4,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: selected ? Colors.white : AppColors.accentBright,
                    ),
                  ),
                ),
            ]),
          ),
        ),
      ),
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
    Widget step(String icon, String tooltip, bool enabled, VoidCallback onTap) => Material(
          color: enabled ? AppColors.accentLight : AppColors.divider,
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: enabled ? onTap : null,
            child: SizedBox(
              width: 40,
              height: 40,
              child: Center(
                child: Semantics(
                  label: tooltip,
                  child: AppIcon(icon, size: 16, color: enabled ? AppColors.accent : AppColors.borderStrong),
                ),
              ),
            ),
          ),
        );
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Flexible(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
          children: [
            SelectedScheduleBox(
              choice: widget.schedule,
              onChange: () => Navigator.pop(context, const GuestChoice.changeDate()),
            ),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Jumlah Peserta',
                      style: TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w500, color: AppColors.textDark)),
                  const SizedBox(height: 2),
                  Text(
                    [
                      'Min. $_min peserta',
                      if (pkg.maxGuests > 0) 'maks. ${pkg.maxGuests}',
                    ].join(', '),
                    style: const TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMuted),
                  ),
                ]),
              ),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.borderStrong),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  step('minus', 'Kurangi peserta', enough && _guests > _min, () => setState(() => _guests--)),
                  SizedBox(
                    width: 46,
                    child: Text('$_guests',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 20, height: 1.4, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                  ),
                  step('plus', 'Tambah peserta', enough && _guests < _max, () => setState(() => _guests++)),
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
              NoteBox(
                tone: NoteTone.danger,
                text: 'Sisa kuota tanggal ini (${widget.schedule.seatsLeft}) kurang dari minimal $_min peserta. '
                    'Silakan pilih tanggal lain.',
              ),
            ],
          ],
        ),
      ),
      Container(height: 4, color: AppColors.divider),
      _PriceFooter(
        caption: 'Total Estimasi',
        amount: pkg.basePrice(_guests),
        suffix: '',
        buttonLabel: 'Pilih Jadwal',
        onPressed: enough ? () => Navigator.pop(context, GuestChoice(_guests)) : null,
      ),
    ]);
  }
}
