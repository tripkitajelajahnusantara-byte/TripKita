import 'package:flutter/material.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/screens/payment_screen.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/validators.dart';
import 'package:customer_mobile/widgets/common.dart';

const _genders = ['Laki-laki', 'Perempuan'];

/// Form data pemesan & peserta, padanan `CustomerBookingPage` di web.
class BookingScreen extends StatefulWidget {
  final BookingDraft draft;

  const BookingScreen({super.key, required this.draft});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final _bookerName = TextEditingController();
  final _bookerEmail = TextEditingController();
  final _bookerPhone = TextEditingController();
  // Tidak diisi otomatis dengan nilai contoh: data peserta dipakai mitra
  // untuk asuransi, jadi harus berasal dari pengguna atau profilnya.
  String _bookerBirthDate = '';
  String _bookerGender = '';
  bool _sameAsBooker = false;

  late final List<Participant> _participants;
  late final List<TextEditingController> _nameCtrls;
  late final List<TextEditingController> _phoneCtrls;
  late final List<TextEditingController> _medicalCtrls;
  Map<String, String> _errors = {};

  @override
  void initState() {
    super.initState();
    final profile = AuthSession.instance.profile;
    _bookerName.text = profile?.name ?? '';
    _bookerEmail.text = profile?.email ?? '';
    _bookerPhone.text = profile?.whatsapp ?? '';
    if (profile?.birthDate.isNotEmpty == true && parseIsoDate(profile!.birthDate) != null) {
      _bookerBirthDate = profile.birthDate.substring(0, 10);
    }
    if (_genders.contains(profile?.gender)) _bookerGender = profile!.gender;

    _participants = List.generate(widget.draft.guests, (i) {
      if (i == 0 && profile != null) {
        return Participant(
          name: profile.name,
          phone: profile.whatsapp,
          gender: _bookerGender,
          birthDate: _bookerBirthDate,
        );
      }
      return Participant();
    });
    _nameCtrls = [for (final p in _participants) TextEditingController(text: p.name)];
    _phoneCtrls = [for (final p in _participants) TextEditingController(text: p.phone)];
    _medicalCtrls = [for (final p in _participants) TextEditingController(text: p.medicalHistory)];

    _bookerName.addListener(_syncFirstParticipant);
    _bookerPhone.addListener(_syncFirstParticipant);

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
    for (final c in [_bookerName, _bookerEmail, _bookerPhone, ..._nameCtrls, ..._phoneCtrls, ..._medicalCtrls]) {
      c.dispose();
    }
    super.dispose();
  }

  void _syncFirstParticipant() {
    if (!_sameAsBooker || _participants.isEmpty) return;
    setState(() {
      _participants[0]
        ..name = _bookerName.text
        ..phone = _bookerPhone.text
        ..gender = _bookerGender
        ..birthDate = _bookerBirthDate;
      _nameCtrls[0].text = _bookerName.text;
      _phoneCtrls[0].text = _bookerPhone.text;
    });
  }

  Future<String?> _pickBirthDate(String current) async {
    final today = dateOnly(DateTime.now());
    final initial = parseIsoDate(current) ?? DateTime(2000);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isAfter(today) ? today : initial,
      initialEntryMode: DatePickerEntryMode.calendarOnly,
      initialDatePickerMode: DatePickerMode.year,
      firstDate: DateTime(1920),
      lastDate: today,
      helpText: 'Tanggal lahir',
    );
    return picked == null ? null : toIsoDate(picked);
  }

  bool _validate() {
    final errors = <String, String>{};
    void put(String key, String? message) {
      if (message != null) errors[key] = message;
    }

    put('bookerName', validateBookerName(_bookerName.text));
    final email = _bookerEmail.text.trim();
    if (email.isEmpty || validateEmail(email) != null) {
      errors['bookerEmail'] = 'Format email tidak valid (contoh: pemesan@gmail.com).';
    }
    put('bookerPhone', validateBookerPhone(_bookerPhone.text));
    final birth = parseIsoDate(_bookerBirthDate);
    if (birth == null) {
      errors['bookerBirthDate'] = 'Tanggal lahir wajib diisi.';
    } else if (birth.isAfter(DateTime.now())) {
      errors['bookerBirthDate'] = 'Tanggal lahir tidak boleh berada di masa depan.';
    }
    if (!_genders.contains(_bookerGender)) errors['bookerGender'] = 'Jenis kelamin wajib dipilih.';
    for (var i = 0; i < _participants.length; i++) {
      final p = _participants[i];
      put('p_name_$i', validateParticipantName(p.name, i + 1));
      put('p_phone_$i', validateParticipantPhone(p.phone, i + 1));
      if (!_genders.contains(p.gender)) errors['p_gender_$i'] = 'Jenis kelamin Peserta ${i + 1} wajib dipilih.';
      if (parseIsoDate(p.birthDate) == null) errors['p_birth_$i'] = 'Tanggal lahir Peserta ${i + 1} wajib diisi.';
    }
    setState(() => _errors = errors);
    return errors.isEmpty;
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!_validate()) {
      await showNoticeDialog(
        context,
        title: 'Periksa Form',
        message: 'Terdapat data yang belum sesuai kriteria. Silakan periksa pesan peringatan di form.',
        isError: true,
      );
      return;
    }
    if (!mounted) return;
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => PaymentScreen(
        draft: widget.draft,
        booker: BookerContact(
          name: _bookerName.text.trim(),
          email: _bookerEmail.text.trim(),
          whatsapp: _bookerPhone.text.trim(),
        ),
        participants: [for (final p in _participants) p.copy()],
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final loggedIn = AuthSession.instance.isLoggedIn;
    return Scaffold(
      appBar: AppBar(title: const Text('Data Pemesan & Peserta Trip')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          _buildSummaryCard(),
          const SizedBox(height: 16),
          SectionCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Text('1. Data Pemesan (Kontak Utama)',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              if (loggedIn) ...[
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: AppColors.successBg, borderRadius: BorderRadius.circular(30)),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.check_circle_outline, size: 13, color: AppColors.success),
                      SizedBox(width: 4),
                      Text('Terisi Otomatis (Akun Anda)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.success)),
                    ]),
                  ),
                ),
              ],
              const Divider(height: 24),
              const FieldLabel('Nama Lengkap Pemesan', required: true),
              TextField(
                controller: _bookerName,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  hintText: 'Masukkan nama pemesan (hanya huruf)...',
                  prefixIcon: const Icon(Icons.person_outline, size: 18, color: AppColors.textLight),
                  errorText: _errors['bookerName'],
                ),
              ),
              const SizedBox(height: 14),
              const FieldLabel('Alamat Email', required: true),
              TextField(
                controller: _bookerEmail,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  hintText: 'Email untuk pengiriman tiket...',
                  prefixIcon: const Icon(Icons.mail_outline, size: 18, color: AppColors.textLight),
                  errorText: _errors['bookerEmail'],
                ),
              ),
              const SizedBox(height: 14),
              const FieldLabel('Nomor WhatsApp / HP', required: true),
              TextField(
                controller: _bookerPhone,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  hintText: 'Contoh: 081234567890...',
                  prefixIcon: const Icon(Icons.phone_outlined, size: 18, color: AppColors.textLight),
                  errorText: _errors['bookerPhone'],
                ),
              ),
              const SizedBox(height: 14),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const FieldLabel('Tanggal Lahir', required: true),
                    _DateField(
                      value: _bookerBirthDate,
                      error: _errors['bookerBirthDate'],
                      onTap: () async {
                        final picked = await _pickBirthDate(_bookerBirthDate);
                        if (picked != null) {
                          setState(() => _bookerBirthDate = picked);
                          _syncFirstParticipant();
                        }
                      },
                    ),
                  ]),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const FieldLabel('Jenis Kelamin', required: true),
                    DropdownButtonFormField<String>(
                      value: _genders.contains(_bookerGender) ? _bookerGender : null,
                      isExpanded: true,
                      hint: const Text('Pilih'),
                      decoration: InputDecoration(errorText: _errors['bookerGender']),
                      items: [for (final g in _genders) DropdownMenuItem(value: g, child: Text(g))],
                      onChanged: (v) {
                        setState(() => _bookerGender = v ?? _bookerGender);
                        _syncFirstParticipant();
                      },
                    ),
                  ]),
                ),
              ]),
            ]),
          ),
          const SizedBox(height: 16),
          SectionCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('2. Data Peserta Trip (${_participants.length} Orang)',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              const SizedBox(height: 6),
              const Text('Lengkapi nama, nomor HP, dan jenis kelamin seluruh peserta yang akan berangkat.',
                  style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
              const SizedBox(height: 16),
              for (var i = 0; i < _participants.length; i++) ...[
                _buildParticipant(i),
                if (i < _participants.length - 1) const SizedBox(height: 14),
              ],
            ]),
          ),
          const SizedBox(height: 16),
          const InfoBanner(
            icon: Icons.shield_outlined,
            color: Color(0xFFB45309),
            textColor: Color(0xFFB45309),
            border: Color(0xFFFEF3C7),
            message: 'Data peserta yang diisi akan digunakan oleh mitra travel untuk asuransi dan pendaftaran.',
          ),
          const SizedBox(height: 20),
          PrimaryButton(label: 'Lanjut ke Konfirmasi Pemesanan', onPressed: _submit),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    final d = widget.draft;
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Rincian Pemesanan', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textDark)),
        const Divider(height: 22),
        Text(d.package.category.toUpperCase(),
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.accent)),
        const SizedBox(height: 4),
        Text(d.package.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textDark)),
        const SizedBox(height: 8),
        _iconLine(Icons.calendar_today_outlined, d.scheduleLabel),
        const SizedBox(height: 4),
        _iconLine(Icons.groups_outlined, '${d.guests} Peserta'),
        const Divider(height: 22),
        PriceRow('Harga (${d.guests}x)', formatIDR(d.packageTotal)),
        const Divider(height: 14),
        PriceRow('Total Pembayaran', formatIDR(d.packageTotal), emphasize: true),
      ]),
    );
  }

  Widget _iconLine(IconData icon, String text) => Row(children: [
        Icon(icon, size: 15, color: AppColors.textLight),
        const SizedBox(width: 6),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: AppColors.textMedium))),
      ]);

  Widget _buildParticipant(int i) {
    final p = _participants[i];
    final locked = i == 0 && _sameAsBooker;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Peserta ${i + 1}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.accent)),
        if (i == 0) ...[
          const SizedBox(height: 8),
          Material(
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: const BorderSide(color: AppColors.borderStrong),
            ),
            child: CheckboxListTile(
              dense: true,
              value: _sameAsBooker,
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: const EdgeInsets.only(right: 8),
              title: const Text('Peserta 1 sama dengan Pemesan',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDark)),
              onChanged: (v) {
                setState(() => _sameAsBooker = v ?? false);
                _syncFirstParticipant();
              },
            ),
          ),
        ],
        const SizedBox(height: 12),
        const FieldLabel('Nama Lengkap Peserta', required: true),
        TextField(
          controller: _nameCtrls[i],
          readOnly: locked,
          textCapitalization: TextCapitalization.words,
          onChanged: (v) => p.name = v,
          decoration: InputDecoration(
            hintText: 'Nama peserta ${i + 1}...',
            fillColor: locked ? AppColors.divider : Colors.white,
            errorText: _errors['p_name_$i'],
          ),
        ),
        const SizedBox(height: 12),
        const FieldLabel('Nomor HP Peserta', required: true),
        TextField(
          controller: _phoneCtrls[i],
          readOnly: locked,
          keyboardType: TextInputType.phone,
          onChanged: (v) => p.phone = v,
          decoration: InputDecoration(
            hintText: 'Nomor HP...',
            fillColor: locked ? AppColors.divider : Colors.white,
            errorText: _errors['p_phone_$i'],
          ),
        ),
        const SizedBox(height: 12),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const FieldLabel('Jenis Kelamin', required: true),
              DropdownButtonFormField<String>(
                value: _genders.contains(p.gender) ? p.gender : null,
                isExpanded: true,
                hint: const Text('Pilih'),
                decoration: InputDecoration(
                  fillColor: locked ? AppColors.divider : Colors.white,
                  errorText: _errors['p_gender_$i'],
                ),
                items: [for (final g in _genders) DropdownMenuItem(value: g, child: Text(g))],
                onChanged: locked ? null : (v) => setState(() => p.gender = v ?? p.gender),
              ),
            ]),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const FieldLabel('Tanggal Lahir Peserta', required: true),
              _DateField(
                value: p.birthDate,
                enabled: !locked,
                error: _errors['p_birth_$i'],
                onTap: () async {
                  final picked = await _pickBirthDate(p.birthDate);
                  if (picked != null) setState(() => p.birthDate = picked);
                },
              ),
            ]),
          ),
        ]),
        const SizedBox(height: 12),
        const FieldLabel('Riwayat Penyakit & Alergi', hint: '(Maks. 255 Karakter, opsional)'),
        TextField(
          controller: _medicalCtrls[i],
          maxLength: 255,
          onChanged: (v) => p.medicalHistory = v,
          decoration: const InputDecoration(
            hintText: "Misal: Asma, Alergi, Jantung, atau '-' jika tidak ada",
            counterText: '',
          ),
        ),
      ]),
    );
  }
}

class _DateField extends StatelessWidget {
  final String value;
  final VoidCallback onTap;
  final bool enabled;
  final String? error;

  const _DateField({required this.value, required this.onTap, this.enabled = true, this.error});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: enabled ? onTap : null,
      child: InputDecorator(
        decoration: InputDecoration(
          fillColor: enabled ? Colors.white : AppColors.divider,
          errorText: error,
          suffixIcon: const Icon(Icons.calendar_today_outlined, size: 16, color: AppColors.textLight),
        ),
        child: Text(
          parseIsoDate(value) == null ? 'Pilih tanggal' : formatDateShort(parseIsoDate(value)),
          style: const TextStyle(fontSize: 14, color: AppColors.textDark),
        ),
      ),
    );
  }
}
