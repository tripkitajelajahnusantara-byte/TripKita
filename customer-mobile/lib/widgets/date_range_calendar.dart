import 'package:flutter/material.dart';

import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';

class DateRangeSelection {
  final String startIso;
  final String endIso;

  const DateRangeSelection(this.startIso, this.endIso);
}

/// Kalender pemilihan tanggal perjalanan untuk paket selain Open Trip,
/// padanan `TravelokaCalendarModal` di web: tanggal sebelum H-7, tanggal yang
/// tidak dibuka mitra, dan tanggal terbooking tidak dapat dipilih.
Future<DateRangeSelection?> showTripCalendarSheet(
  BuildContext context, {
  required String tripType,
  required int durationDays,
  required String startIso,
  required String endIso,
  required List<String> bookedDates,
  required List<String> availableDates,
  required DateTime minDate,
  DateTime? maxDate,
}) {
  return showModalBottomSheet<DateRangeSelection>(
    context: context,
    isScrollControlled: true,
    builder: (context) => _TripCalendar(
      tripType: tripType,
      durationDays: durationDays,
      startIso: startIso,
      endIso: endIso,
      bookedDates: bookedDates,
      availableDates: availableDates,
      minDate: minDate,
      maxDate: maxDate,
    ),
  );
}

class _TripCalendar extends StatefulWidget {
  final String tripType;
  final int durationDays;
  final String startIso;
  final String endIso;
  final List<String> bookedDates;
  final List<String> availableDates;
  final DateTime minDate;
  final DateTime? maxDate;

  const _TripCalendar({
    required this.tripType,
    required this.durationDays,
    required this.startIso,
    required this.endIso,
    required this.bookedDates,
    required this.availableDates,
    required this.minDate,
    this.maxDate,
  });

  @override
  State<_TripCalendar> createState() => _TripCalendarState();
}

class _TripCalendarState extends State<_TripCalendar> {
  static const _dayNames = ['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  late String _start = widget.startIso;
  late String _end = widget.endIso;
  late DateTime _month;
  late final DateTime _firstMonth = DateTime(widget.minDate.year, widget.minDate.month);
  late final String _minIso = toIsoDate(widget.minDate);
  late final String? _maxIso = widget.maxDate == null ? null : toIsoDate(widget.maxDate!);

  @override
  void initState() {
    super.initState();
    final selected = parseIsoDate(widget.startIso);
    final base = selected != null && !selected.isBefore(widget.minDate) ? selected : widget.minDate;
    _month = DateTime(base.year, base.month);
  }

  bool get _restricts => widget.availableDates.isNotEmpty;

  bool _isBooked(String iso) => widget.bookedDates.contains(iso);
  bool _isDisabled(String iso) =>
      iso.compareTo(_minIso) < 0 ||
      (_maxIso != null && iso.compareTo(_maxIso!) > 0) ||
      _isBooked(iso) || (_restricts && !widget.availableDates.contains(iso));

  void _select(String iso) {
    setState(() {
      if (widget.durationDays > 0) {
        final d = parseIsoDate(iso)!;
        _start = iso;
        _end = toIsoDate(d.add(Duration(days: widget.durationDays - 1)));
      } else if (_start.isNotEmpty && _start == _end && iso.compareTo(_start) >= 0) {
        _end = iso;
      } else {
        _start = iso;
        _end = iso;
      }
    });
  }

  String _header(String iso) {
    final d = parseIsoDate(iso);
    if (d == null) return '-';
    return '${_dayNames[d.weekday % 7]}, ${d.day} ${monthsShort[d.month - 1]} ${d.year}';
  }

  List<String> get _bookedInRange => widget.bookedDates
      .where((b) => _start.isNotEmpty && b.compareTo(_start) >= 0 && b.compareTo(_end) <= 0)
      .toList();

  @override
  Widget build(BuildContext context) {
    var lastMonth = DateTime(_firstMonth.year, _firstMonth.month + 7);
    final max = widget.maxDate;
    if (max != null && DateTime(max.year, max.month).isBefore(lastMonth)) lastMonth = DateTime(max.year, max.month);
    final canPrev = _month.isAfter(_firstMonth);
    final canNext = _month.isBefore(lastMonth);
    final booked = _bookedInRange;

    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 8, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 2),
                  child: Icon(Icons.calendar_month_outlined, color: AppColors.accent, size: 20),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Tanggal Perjalanan (${widget.tripType})',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      const Text(
                        'Pilih tanggal pada kalender. Tanggal tercoret (merah) adalah tanggal terbooking (FULL).',
                        style: TextStyle(fontSize: 12.5, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, size: 20)),
              ],
            ),
          ),
          Container(
            color: AppColors.background,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(children: [
              Expanded(child: _selectedBox('Tanggal Mulai', _header(_start))),
              const SizedBox(width: 12),
              Expanded(child: _selectedBox('Tanggal Selesai', _header(_end))),
            ]),
          ),
          if (booked.isNotEmpty)
            Container(
              width: double.infinity,
              color: AppColors.dangerSoft,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Text(
                '⚠️ Rentang tanggal pilihan Anda (${_header(_start)} - ${_header(_end)}) mengandung tanggal yang sudah terbooking (${booked.map(_header).join(', ')} FULL). Silakan pilih tanggal yang tersedia.',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF991B1B), height: 1.4),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(children: [
              IconButton(
                onPressed: canPrev ? () => setState(() => _month = DateTime(_month.year, _month.month - 1)) : null,
                icon: const Icon(Icons.chevron_left),
              ),
              Expanded(
                child: Text('${monthsFull[_month.month - 1]} ${_month.year}',
                    textAlign: TextAlign.center, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              ),
              IconButton(
                onPressed: canNext ? () => setState(() => _month = DateTime(_month.year, _month.month + 1)) : null,
                icon: const Icon(Icons.chevron_right),
              ),
            ]),
          ),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: _monthGrid()),
          Container(
            margin: const EdgeInsets.only(top: 12),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: const BoxDecoration(
              color: AppColors.background,
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Row(children: [
              _legend(AppColors.accent, null, 'Terpilih'),
              const SizedBox(width: 12),
              _legend(AppColors.dangerBg, AppColors.dangerBorder, 'FULL'),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: booked.isEmpty && _start.isNotEmpty
                    ? () => Navigator.pop(context, DateRangeSelection(_start, _end))
                    : null,
                icon: const Icon(Icons.check, size: 16),
                label: const Text('Terapkan Tanggal'),
              ),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _selectedBox(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.accent, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.accent)),
        ],
      ),
    );
  }

  Widget _legend(Color fill, Color? border, String label) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 12,
        height: 12,
        decoration: BoxDecoration(
          color: fill,
          borderRadius: BorderRadius.circular(3),
          border: border == null ? null : Border.all(color: border),
        ),
      ),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
    ]);
  }

  Widget _monthGrid() {
    final first = DateTime(_month.year, _month.month, 1);
    final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
    final leading = (first.weekday + 6) % 7; // Senin sebagai kolom pertama.
    final cells = <Widget>[
      for (var i = 0; i < 7; i++)
        Center(
          child: Text(weekdaysShort[i],
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: i == 6 ? AppColors.danger : AppColors.textMuted,
              )),
        ),
      for (var i = 0; i < leading; i++) const SizedBox.shrink(),
    ];

    for (var day = 1; day <= daysInMonth; day++) {
      final iso = toIsoDate(DateTime(_month.year, _month.month, day));
      final booked = _isBooked(iso);
      final disabled = _isDisabled(iso);
      final isEdge = iso == _start || iso == _end;
      final inRange = _start.isNotEmpty && iso.compareTo(_start) >= 0 && iso.compareTo(_end) <= 0;

      Widget cell;
      if (booked) {
        cell = Container(
          decoration: BoxDecoration(
            color: AppColors.dangerBg,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.dangerBorder),
          ),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text('$day',
                style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.danger,
                    decoration: TextDecoration.lineThrough)),
            const Text('FULL', style: TextStyle(fontSize: 7.5, fontWeight: FontWeight.w800, color: AppColors.dangerDark)),
          ]),
        );
      } else if (disabled) {
        cell = Center(
          child: Text('$day',
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.borderStrong)),
        );
      } else {
        cell = Material(
          color: isEdge ? AppColors.accent : (inRange ? AppColors.accentLight : Colors.transparent),
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: () => _select(iso),
            child: Center(
              child: Text('$day',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isEdge ? Colors.white : (inRange ? AppColors.accent : AppColors.textDark),
                  )),
            ),
          ),
        );
      }
      cells.add(cell);
    }

    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 4,
      crossAxisSpacing: 4,
      childAspectRatio: 1.05,
      children: cells,
    );
  }
}
