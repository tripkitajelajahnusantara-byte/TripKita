import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';

/// Label form Figma (14/20, abu tua) dengan tanda wajib merah, lalu isian.
class LabeledField extends StatelessWidget {
  final String label;
  final bool required;
  final Widget child;

  /// Pesan galat 14/20 merah tua, rata kiri 6px di bawah isian.
  final String? error;

  const LabeledField({super.key, required this.label, required this.child, this.required = false, this.error});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text.rich(TextSpan(
        text: label,
        style: const TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMedium),
        children: [
          if (required) const TextSpan(text: ' *', style: TextStyle(color: AppColors.dangerDark)),
        ],
      )),
      const SizedBox(height: 6),
      child,
      if (error != null) ...[
        const SizedBox(height: 6),
        Text(error!, style: const TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.errorText)),
      ],
    ]);
  }
}

const _errorOutline = OutlineInputBorder(
  borderRadius: BorderRadius.all(Radius.circular(8)),
  borderSide: BorderSide(color: AppColors.dangerDark),
);

/// Garis isian merah bila [error] terisi. Teks galat ditampilkan [LabeledField]
/// karena galat bawaan InputDecorator menjorok mengikuti padding isian.
InputDecoration markError(InputDecoration decoration, String? error) => error == null
    ? decoration
    : decoration.copyWith(
        enabledBorder: _errorOutline,
        focusedBorder: _errorOutline.copyWith(borderSide: const BorderSide(color: AppColors.dangerDark, width: 1.5)),
      );

/// Teks isian Figma (16, gelap).
const fieldTextStyle = TextStyle(fontSize: 16, height: 1.5, letterSpacing: 0, color: AppColors.textDark);

/// Ikon awalan isian (24) dengan jarak 12 dari tepi dan 8 ke teks (4 di
/// antaranya sudah ditambahkan InputDecorator).
Widget fieldPrefixIcon(String name) => Padding(
      padding: const EdgeInsets.only(left: 12, right: 4),
      child: AppIcon(name, color: AppColors.icon),
    );

const fieldPrefixConstraints = BoxConstraints(minWidth: 40, minHeight: 24);

/// Bagian lokal nomor HP tanpa awalan negara: `081234` / `6281234` /
/// `+6281234` → `81234`.
String phoneLocalPart(String raw) {
  var digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('62')) digits = digits.substring(2);
  if (digits.startsWith('0')) digits = digits.substring(1);
  return digits;
}

/// Nomor HP lengkap untuk API (`62…`), atau kosong bila belum diisi.
String phoneFromLocal(String local) {
  final digits = phoneLocalPart(local);
  return digits.isEmpty ? '' : '62$digits';
}

/// Tampilan nomor HP: `+6281234…`.
String displayPhone(String raw) {
  final local = phoneLocalPart(raw);
  return local.isEmpty ? '' : '+62$local';
}

/// Isian nomor WhatsApp dengan awalan bendera Indonesia dan `+62`.
class PhoneField extends StatelessWidget {
  final TextEditingController controller;
  final String? errorText;
  final bool enabled;

  const PhoneField({super.key, required this.controller, this.errorText, this.enabled = true});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      keyboardType: TextInputType.phone,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(13)],
      style: fieldTextStyle,
      decoration: markError(
          InputDecoration(
            hintText: '81234567890',
            fillColor: enabled ? Colors.white : AppColors.divider,
            prefixIconConstraints: const BoxConstraints(minWidth: 80, minHeight: 38),
            // Awalan selebar 76 (bendera, +62) dengan garis pemisah, lalu 8 ke nomor
            // (4 di antaranya dari InputDecorator).
            prefixIcon: Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Container(
                width: 76,
                height: 38,
                padding: const EdgeInsets.only(left: 12),
                decoration: BoxDecoration(
                  border: Border(
                    right: BorderSide(color: errorText == null ? AppColors.borderStrong : AppColors.dangerDark),
                  ),
                ),
                child: const Row(children: [
                  IndonesianFlag(),
                  SizedBox(width: 8),
                  Flexible(
                    child: Text('+62',
                        softWrap: false,
                        overflow: TextOverflow.clip,
                        style: TextStyle(fontSize: 16, height: 1.5, color: AppColors.textMedium)),
                  ),
                ]),
              ),
            ),
          ),
          errorText),
    );
  }
}

/// Bendera Indonesia 20×15.
class IndonesianFlag extends StatelessWidget {
  const IndonesianFlag({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 15,
      child: Column(children: [
        Expanded(child: Container(color: const Color(0xFFE31D1C))),
        Expanded(child: Container(color: Colors.white)),
      ]),
    );
  }
}

/// Isian tanggal lahir (DD/MM/YYYY) yang membuka pemilih tanggal.
class BirthDateField extends StatelessWidget {
  final String valueIso;
  final ValueChanged<String> onChanged;
  final String? errorText;
  final bool enabled;

  /// Tanggal rencana keberangkatan: hari ini sampai 5 tahun ke depan.
  final bool future;

  const BirthDateField({
    super.key,
    required this.valueIso,
    required this.onChanged,
    this.errorText,
    this.enabled = true,
    this.future = false,
  });

  Future<void> _pick(BuildContext context) async {
    final today = dateOnly(DateTime.now());
    final first = future ? today : DateTime(1920);
    final last = future ? DateTime(today.year + 5, today.month, today.day) : today;
    final initial = parseIsoDate(valueIso) ?? (future ? today.add(const Duration(days: 30)) : DateTime(2000));
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(first) ? first : (initial.isAfter(last) ? last : initial),
      initialEntryMode: DatePickerEntryMode.calendarOnly,
      initialDatePickerMode: future ? DatePickerMode.day : DatePickerMode.year,
      firstDate: first,
      lastDate: last,
      helpText: future ? 'Rencana tanggal keberangkatan' : 'Tanggal lahir',
    );
    if (picked != null) onChanged(toIsoDate(picked));
  }

  @override
  Widget build(BuildContext context) {
    final date = parseIsoDate(valueIso);
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: enabled ? () => _pick(context) : null,
      child: InputDecorator(
        isEmpty: date == null,
        decoration: markError(
            InputDecoration(
              hintText: 'DD/MM/YYYY',
              enabled: enabled,
              fillColor: enabled ? Colors.white : AppColors.divider,
              prefixIconConstraints: fieldPrefixConstraints,
              prefixIcon: fieldPrefixIcon('calendar'),
            ),
            errorText),
        child: Text(
          date == null ? '' : '${twoDigits(date.day)}/${twoDigits(date.month)}/${date.year}',
          style: fieldTextStyle,
        ),
      ),
    );
  }
}

/// Area teks Figma setinggi 128 dengan tanda ubah ukuran di pojok kanan bawah.
class TextAreaField extends StatelessWidget {
  final TextEditingController controller;
  final String hintText;
  final String? errorText;
  final int? maxLength;

  const TextAreaField({super.key, required this.controller, required this.hintText, this.errorText, this.maxLength});

  @override
  Widget build(BuildContext context) {
    const text = TextStyle(fontSize: 16, height: 20 / 16, letterSpacing: 0, color: AppColors.textDark);
    return Stack(children: [
      SizedBox(
        height: 128,
        child: TextField(
          controller: controller,
          expands: true,
          maxLines: null,
          textAlignVertical: TextAlignVertical.top,
          maxLength: maxLength,
          style: text,
          decoration: markError(
              InputDecoration(
                hintText: hintText,
                hintMaxLines: 3,
                hintStyle: text.copyWith(color: AppColors.textLight),
                counterText: '',
                contentPadding: const EdgeInsets.fromLTRB(12, 6.5, 12, 8),
              ),
              errorText),
        ),
      ),
      const Positioned(top: 110, right: 6, child: AppIcon('resize_handle', size: 12)),
    ]);
  }
}

/// Dropdown bergaya isian Figma.
class SelectField extends StatelessWidget {
  final String? value;
  final List<String> options;
  final String hint;
  final ValueChanged<String?>? onChanged;
  final String? errorText;

  const SelectField({
    super.key,
    required this.value,
    required this.options,
    required this.hint,
    required this.onChanged,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      value: options.contains(value) ? value : null,
      isExpanded: true,
      isDense: true,
      icon: const AppIcon('chevron_down', color: AppColors.icon),
      hint: Text(hint, style: const TextStyle(fontSize: 16, height: 1.17, color: AppColors.textLight)),
      style: fieldTextStyle.copyWith(fontFamily: 'Roboto', height: 1.17),
      decoration:
          markError(InputDecoration(fillColor: onChanged == null ? AppColors.divider : Colors.white), errorText),
      items: [
        for (final o in options) DropdownMenuItem(value: o, child: Text(o, overflow: TextOverflow.ellipsis)),
      ],
      onChanged: onChanged,
    );
  }
}
