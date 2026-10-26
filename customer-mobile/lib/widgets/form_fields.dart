import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';

/// Label form Figma (14, abu tua) dengan tanda wajib merah, lalu isian.
class LabeledField extends StatelessWidget {
  final String label;
  final bool required;
  final Widget child;

  const LabeledField({super.key, required this.label, required this.child, this.required = false});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text.rich(TextSpan(
        text: label,
        style: const TextStyle(fontSize: 14, color: AppColors.textBody),
        children: [
          if (required) const TextSpan(text: ' *', style: TextStyle(color: AppColors.dangerDark)),
        ],
      )),
      const SizedBox(height: 6),
      child,
    ]);
  }
}

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
      style: const TextStyle(fontSize: 15, color: AppColors.textDark),
      decoration: InputDecoration(
        hintText: '81234567890',
        errorText: errorText,
        fillColor: enabled ? Colors.white : AppColors.divider,
        prefixIconConstraints: const BoxConstraints(minHeight: 40),
        prefixIcon: Container(
          margin: const EdgeInsets.only(right: 10),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: const BoxDecoration(border: Border(right: BorderSide(color: AppColors.borderStrong))),
          child: const Row(mainAxisSize: MainAxisSize.min, children: [
            _IndonesianFlag(),
            SizedBox(width: 8),
            Text('+62', style: TextStyle(fontSize: 15, color: AppColors.textMedium)),
          ]),
        ),
      ),
    );
  }
}

class _IndonesianFlag extends StatelessWidget {
  const _IndonesianFlag();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20,
      height: 14,
      decoration: BoxDecoration(border: Border.all(color: AppColors.border, width: 0.5)),
      child: Column(children: [
        Expanded(child: Container(color: const Color(0xFFE70011))),
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

  const BirthDateField({
    super.key,
    required this.valueIso,
    required this.onChanged,
    this.errorText,
    this.enabled = true,
  });

  Future<void> _pick(BuildContext context) async {
    final today = dateOnly(DateTime.now());
    final initial = parseIsoDate(valueIso) ?? DateTime(2000);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isAfter(today) ? today : initial,
      initialEntryMode: DatePickerEntryMode.calendarOnly,
      initialDatePickerMode: DatePickerMode.year,
      firstDate: DateTime(1920),
      lastDate: today,
      helpText: 'Tanggal lahir',
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
        decoration: InputDecoration(
          hintText: 'DD/MM/YYYY',
          errorText: errorText,
          enabled: enabled,
          fillColor: enabled ? Colors.white : AppColors.divider,
          prefixIcon: const Icon(Icons.calendar_today_outlined, size: 20, color: AppColors.textMuted),
        ),
        child: Text(
          date == null ? '' : '${twoDigits(date.day)}/${twoDigits(date.month)}/${date.year}',
          style: const TextStyle(fontSize: 15, color: AppColors.textDark),
        ),
      ),
    );
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
      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textMedium),
      hint: Text(hint, style: const TextStyle(fontSize: 15, color: AppColors.textLight)),
      style: const TextStyle(fontSize: 15, color: AppColors.textDark, fontFamily: 'Roboto'),
      decoration: InputDecoration(
        errorText: errorText,
        fillColor: onChanged == null ? AppColors.divider : Colors.white,
      ),
      items: [
        for (final o in options) DropdownMenuItem(value: o, child: Text(o, overflow: TextOverflow.ellipsis)),
      ],
      onChanged: onChanged,
    );
  }
}
