import 'package:flutter/material.dart';

import 'package:customer_mobile/screens/trip_list_screen.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/common.dart';

enum _Popup { date, type }

/// Formulir pencarian trip (Destinasi, Tanggal, Tipe Trip) sesuai desain
/// Figma. Dipakai kartu pencarian beranda dan lembar "Ubah Pencarian Trip".
/// Tanggal dan tipe trip dipilih lewat popup yang menempel pada kolomnya.
class TripSearchForm extends StatefulWidget {
  final TripSearchParams initial;
  final String submitLabel;
  final ValueChanged<TripSearchParams> onSubmit;

  const TripSearchForm({super.key, required this.initial, required this.submitLabel, required this.onSubmit});

  @override
  State<TripSearchForm> createState() => _TripSearchFormState();
}

class _TripSearchFormState extends State<TripSearchForm> {
  late final _destination = TextEditingController(text: widget.initial.destination);
  final _destinationFocus = FocusNode();
  late DateTime? _date = parseIsoDate(widget.initial.date);
  late String? _type = widget.initial.hasType ? widget.initial.type : null;

  final _portal = OverlayPortalController();
  final _dateLink = LayerLink();
  final _typeLink = LayerLink();
  final _dateKey = GlobalKey();
  final _typeKey = GlobalKey();
  _Popup? _open;
  bool _openAbove = false;
  double _anchorWidth = 0;

  @override
  void initState() {
    super.initState();
    _destinationFocus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _destination.dispose();
    _destinationFocus.dispose();
    super.dispose();
  }

  void _toggle(_Popup popup, GlobalKey anchorKey) {
    _destinationFocus.unfocus();
    if (_open == popup) return _close();
    final box = anchorKey.currentContext!.findRenderObject()! as RenderBox;
    final bottom = box.localToGlobal(Offset(0, box.size.height)).dy;
    final screenBottom = MediaQuery.sizeOf(context).height - MediaQuery.paddingOf(context).bottom;
    final popupHeight = popup == _Popup.date ? 400 * box.size.width / _CalendarPopup.designWidth : 200;
    setState(() {
      _open = popup;
      _anchorWidth = box.size.width;
      // Di lembar bawah, kolom berada dekat tepi layar sehingga popup dibuka ke atas.
      _openAbove = bottom + popupHeight > screenBottom;
    });
    _portal.show();
  }

  void _close() {
    setState(() => _open = null);
    _portal.hide();
  }

  void _submit() {
    if (_open != null) _close();
    widget.onSubmit(widget.initial.copyWith(
      destination: _destination.text.trim(),
      date: _date == null ? '' : toIsoDate(_date!),
      type: _type ?? allTripTypesLabel,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return OverlayPortal(
      controller: _portal,
      overlayChildBuilder: _buildPopup,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _InputShell(
            focused: _destinationFocus.hasFocus,
            leading: 'magnifying_glass',
            label: 'Destinasi',
            onTap: _destinationFocus.requestFocus,
            child: TextField(
              controller: _destination,
              focusNode: _destinationFocus,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _submit(),
              cursorColor: AppColors.brand,
              style: figmaTextStyle.copyWith(fontSize: 16, color: AppColors.textDark),
              // Border kolom digambar _InputShell; border tema dimatikan.
              decoration: InputDecoration(
                isCollapsed: true,
                contentPadding: EdgeInsets.zero,
                filled: false,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                hintText: 'Pilih destinasi Anda',
                hintStyle: figmaTextStyle.copyWith(fontSize: 16, color: AppColors.textLight),
              ),
            ),
          ),
          const SizedBox(height: 12),
          CompositedTransformTarget(
            link: _dateLink,
            child: _InputShell(
              key: _dateKey,
              focused: _open == _Popup.date,
              leading: 'calendar_dots',
              label: 'Tanggal',
              onTap: () => _toggle(_Popup.date, _dateKey),
              child: _FieldValue(_date == null ? null : formatDateLong(_date), 'Pilih tanggal'),
            ),
          ),
          const SizedBox(height: 12),
          CompositedTransformTarget(
            link: _typeLink,
            child: _InputShell(
              key: _typeKey,
              focused: _open == _Popup.type,
              trailing: _open == _Popup.type ? 'caret_up' : 'caret_down',
              label: 'Tipe Trip',
              onTap: () => _toggle(_Popup.type, _typeKey),
              child: _FieldValue(_type, 'Pilih tipe trip'),
            ),
          ),
          const SizedBox(height: 16),
          BrandButton(label: widget.submitLabel, onPressed: _submit),
        ],
      ),
    );
  }

  Widget _buildPopup(BuildContext context) {
    final popup = _open;
    if (popup == null) return const SizedBox.shrink();
    final gap = popup == _Popup.date ? 8.0 : 10.0;
    return Stack(children: [
      Positioned.fill(child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: _close)),
      CompositedTransformFollower(
        link: popup == _Popup.date ? _dateLink : _typeLink,
        showWhenUnlinked: false,
        targetAnchor: _openAbove ? Alignment.topLeft : Alignment.bottomLeft,
        followerAnchor: _openAbove ? Alignment.bottomLeft : Alignment.topLeft,
        offset: Offset(0, _openAbove ? -gap : gap),
        child: Material(
          type: MaterialType.transparency,
          textStyle: Theme.of(context).textTheme.bodyMedium!.merge(figmaTextStyle),
          child: SizedBox(
            width: _anchorWidth,
            child: popup == _Popup.date
                ? _CalendarPopup(
                    width: _anchorWidth,
                    selected: _date,
                    onSelected: (d) {
                      setState(() => _date = d);
                      _close();
                    },
                  )
                : _TypeMenu(
                    selected: _type,
                    onSelected: (t) {
                      // Mengetuk tipe yang sedang dipilih mengembalikan ke semua tipe.
                      setState(() => _type = t == _type ? null : t);
                      _close();
                    },
                  ),
          ),
        ),
      ),
    ]);
  }
}

/// Kolom berlabel (komponen "Input with label" Figma), tinggi 58.
class _InputShell extends StatelessWidget {
  final bool focused;
  final String label;
  final Widget child;
  final String? leading;
  final String? trailing;
  final VoidCallback onTap;

  const _InputShell({
    super.key,
    required this.focused,
    required this.label,
    required this.child,
    required this.onTap,
    this.leading,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    // Border Figma berada di dalam kotak, jadi padding dikurangi tebal border.
    final border = focused ? 2.0 : 1.0;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12 - border, vertical: 8 - border),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: focused ? AppColors.brand : AppColors.borderStrong, width: border),
          boxShadow: focused
              ? const [BoxShadow(color: Color(0x4D0084C7), spreadRadius: 4)]
              : const [BoxShadow(color: Color(0x0D101828), offset: Offset(0, 1), blurRadius: 1)],
        ),
        child: SizedBox(
          height: 42,
          child: Row(children: [
            if (leading != null) ...[AppIcon(leading!), const SizedBox(width: 8)],
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label, style: TextStyle(fontSize: 12, color: focused ? AppColors.brand : AppColors.textMuted)),
                const SizedBox(height: 8),
                child,
              ]),
            ),
            if (trailing != null) ...[const SizedBox(width: 8), AppIcon(trailing!)],
          ]),
        ),
      ),
    );
  }
}

class _FieldValue extends StatelessWidget {
  final String? value;
  final String placeholder;

  const _FieldValue(this.value, this.placeholder);

  @override
  Widget build(BuildContext context) {
    return Text(value ?? placeholder,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 16, color: value == null ? AppColors.textLight : AppColors.textDark));
  }
}

/// Kalender satu bulan (komponen "Calendar Picker" Figma, Senin di kiri).
/// Ukuran mengikuti lebar kolom; komponen aslinya selebar [designWidth].
class _CalendarPopup extends StatefulWidget {
  static const designWidth = 328.0;

  final double width;
  final DateTime? selected;
  final ValueChanged<DateTime> onSelected;

  const _CalendarPopup({required this.width, required this.selected, required this.onSelected});

  @override
  State<_CalendarPopup> createState() => _CalendarPopupState();
}

class _CalendarPopupState extends State<_CalendarPopup> {
  late DateTime _month = () {
    final d = widget.selected ?? DateTime.now();
    return DateTime(d.year, d.month);
  }();

  void _shiftMonth(int delta) => setState(() => _month = DateTime(_month.year, _month.month + delta));

  @override
  Widget build(BuildContext context) {
    final s = widget.width / _CalendarPopup.designWidth;
    final today = dateOnly(DateTime.now());
    final lead = _month.weekday - 1;
    final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
    final rows = ((lead + daysInMonth) / 7).ceil();

    Widget day(DateTime date) {
      final inMonth = date.month == _month.month;
      final enabled = inMonth && !date.isBefore(today);
      final selected = widget.selected != null && dateOnly(widget.selected!) == date;
      return GestureDetector(
        onTap: enabled ? () => widget.onSelected(date) : null,
        child: Opacity(
          opacity: enabled ? 1 : 0.5,
          child: Container(
            width: 40 * s,
            height: 40 * s,
            alignment: Alignment.center,
            decoration:
                selected ? BoxDecoration(color: AppColors.brand, borderRadius: BorderRadius.circular(8 * s)) : null,
            child: Stack(alignment: Alignment.center, clipBehavior: Clip.none, children: [
              Text('${date.day}',
                  style: TextStyle(
                    fontSize: 16 * s,
                    height: 1.5,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                    color: selected
                        ? Colors.white
                        : enabled
                            ? AppColors.calendarDay
                            : AppColors.borderStrong,
                  )),
              if (date == today && !selected)
                Positioned(
                  // Teks setinggi 24 di tengah sel 40, titik berjarak 6 dari bawah sel.
                  bottom: -2 * s,
                  child: Container(
                    width: 4 * s,
                    height: 4 * s,
                    decoration: const BoxDecoration(color: AppColors.brand, shape: BoxShape.circle),
                  ),
                ),
            ]),
          ),
        ),
      );
    }

    Widget arrow(String icon, int delta) => GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => _shiftMonth(delta),
          child: AppIcon(icon, size: 20 * s),
        );

    return Container(
      padding: EdgeInsets.all(20 * s),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16 * s),
        boxShadow: [BoxShadow(color: const Color(0x29000000), offset: Offset(0, 8 * s), blurRadius: 16 * s)],
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          arrow('caret_left', -1),
          Row(mainAxisSize: MainAxisSize.min, children: [
            Text('${monthsFull[_month.month - 1]} ${_month.year}',
                style: TextStyle(
                  fontSize: 16 * s,
                  height: 1.5,
                  letterSpacing: 0.1 * s,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textDark,
                )),
            SizedBox(width: 2 * s),
            AppIcon('arrow_drop_down', size: 20 * s),
          ]),
          arrow('caret_right', 1),
        ]),
        SizedBox(height: 16 * s),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (final w in weekdaysShort)
            SizedBox(
              width: 40 * s,
              height: 32 * s,
              child: Center(
                child: Text(w,
                    style: TextStyle(
                      fontSize: 12 * s,
                      height: 16 / 12,
                      letterSpacing: 0.96 * s,
                      color: AppColors.calendarWeekday,
                    )),
              ),
            ),
        ]),
        SizedBox(height: 4 * s),
        for (var r = 0; r < rows; r++) ...[
          if (r > 0) SizedBox(height: 8 * s),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var c = 0; c < 7; c++) day(DateTime(_month.year, _month.month, 1 + r * 7 + c - lead)),
          ]),
        ],
      ]),
    );
  }
}

/// Daftar tipe trip (komponen "Dropdown Menu" Figma).
class _TypeMenu extends StatelessWidget {
  final String? selected;
  final ValueChanged<String> onSelected;

  const _TypeMenu({required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0x14000000)),
        boxShadow: const [
          BoxShadow(color: Color(0x140A0D12), offset: Offset(0, 12), blurRadius: 16, spreadRadius: -4),
          BoxShadow(color: Color(0x080A0D12), offset: Offset(0, 4), blurRadius: 6, spreadRadius: -2),
          BoxShadow(color: Color(0x0A0A0D12), offset: Offset(0, 2), blurRadius: 2, spreadRadius: -1),
        ],
      ),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (final type in officialTripTypes)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            child: Material(
              color: type == selected ? AppColors.brandSoft : Colors.transparent,
              borderRadius: BorderRadius.circular(6),
              child: InkWell(
                borderRadius: BorderRadius.circular(6),
                onTap: () => onSelected(type),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  child: Text(type,
                      style: TextStyle(
                        fontSize: 14,
                        height: 20 / 14,
                        fontWeight: type == selected ? FontWeight.w600 : FontWeight.w500,
                        color: type == selected ? AppColors.menuTextActive : AppColors.menuText,
                      )),
                ),
              ),
            ),
          ),
      ]),
    );
  }
}
