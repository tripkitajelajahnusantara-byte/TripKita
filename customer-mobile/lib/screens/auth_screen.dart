import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/validators.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/legal_content.dart';

/// Masuk / daftar customer, padanan `CustomerLoginPage` di web. Setelah
/// berhasil, layar ditutup dengan hasil `true` sehingga alur sebelumnya
/// (mis. "Pesan Sekarang") dapat dilanjutkan.
class AuthScreen extends StatefulWidget {
  final bool startInRegisterMode;

  const AuthScreen({super.key, this.startInRegisterMode = false});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  late bool _register = widget.startInRegisterMode;
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _whatsapp = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _showPassword = false;
  bool _showConfirm = false;
  bool _agreeTerms = false;
  bool _loading = false;
  String? _generalError;
  Map<String, String> _errors = {};

  late final TapGestureRecognizer _termsTap = TapGestureRecognizer()..onTap = () => showRegistrationTerms(context);

  @override
  void dispose() {
    for (final c in [_name, _email, _whatsapp, _password, _confirm]) {
      c.dispose();
    }
    _termsTap.dispose();
    super.dispose();
  }

  bool _validate() {
    final errors = <String, String>{};
    if (_register) {
      if (!_agreeTerms) errors['agreeTerms'] = 'Anda wajib menyetujui Syarat dan Ketentuan Pendaftaran Customer TemenTrip.';
      final name = validateRegisterName(_name.text);
      if (name != null) errors['name'] = name;
      final wa = validateRegisterPhone(_whatsapp.text);
      if (wa != null) errors['whatsapp'] = wa;
      if (_confirm.text.isEmpty) {
        errors['confirm'] = 'Konfirmasi kata sandi wajib diisi.';
      } else if (_password.text != _confirm.text) {
        errors['confirm'] = 'Konfirmasi kata sandi tidak cocok dengan kata sandi di atas.';
      }
    }
    final email = validateEmail(_email.text);
    if (email != null) errors['email'] = email;
    if (_password.text.isEmpty) {
      errors['password'] = 'Kata sandi wajib diisi.';
    } else if (_register && _password.text.length < 12) {
      errors['password'] = 'Kata sandi minimal 12 karakter.';
    }
    setState(() => _errors = errors);
    return errors.isEmpty;
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() => _generalError = null);
    if (!_validate()) return;
    setState(() => _loading = true);
    try {
      if (_register) {
        await AuthSession.instance.register(
          name: _name.text.trim(),
          email: _email.text.trim(),
          password: _password.text,
          whatsapp: _whatsapp.text.trim(),
        );
      } else {
        await AuthSession.instance.login(_email.text.trim(), _password.text);
      }
      if (!mounted) return;
      showSnack(context, _register ? 'Pendaftaran berhasil! Akun Anda telah aktif.' : 'Berhasil masuk! Selamat datang kembali.');
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _generalError = e is ApiException ? e.message : 'Proses gagal. Silakan periksa kembali data Anda.';
      });
    }
  }

  void _toggleMode() {
    setState(() {
      _register = !_register;
      _generalError = null;
      _errors = {};
    });
  }

  InputDecoration _decoration(String hint, IconData icon, String key, {Widget? suffix}) => InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, size: 18, color: _errors[key] != null ? AppColors.danger : AppColors.textLight),
        suffixIcon: suffix,
        errorText: _errors[key],
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_register ? 'Daftar' : 'Masuk')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: [
          SectionCard(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Center(
                child: Container(
                  width: 52,
                  height: 52,
                  decoration: const BoxDecoration(color: AppColors.accentLight, shape: BoxShape.circle),
                  child: const Icon(Icons.how_to_reg_outlined, size: 26, color: AppColors.accent),
                ),
              ),
              const SizedBox(height: 14),
              Text(_register ? 'Daftar Akun Baru' : 'Selamat Datang Kembali!',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              const SizedBox(height: 6),
              Text(
                _register
                    ? 'Buat akun untuk simpan tiket & riwayat trip kamu dengan mudah.'
                    : 'Masuk untuk pesan open trip dan cek tiket perjalanan kamu.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted, height: 1.5),
              ),
              const SizedBox(height: 22),
              if (_generalError != null) ...[
                InfoBanner(
                  icon: Icons.error_outline,
                  color: AppColors.dangerDark,
                  background: AppColors.dangerSoft,
                  border: AppColors.dangerBorder,
                  textColor: const Color(0xFF991B1B),
                  message: _generalError,
                ),
                const SizedBox(height: 16),
              ],
              if (_register) ...[
                TextField(
                  controller: _name,
                  textCapitalization: TextCapitalization.words,
                  decoration: _decoration('Nama Lengkap...', Icons.person_outline, 'name'),
                ),
                const SizedBox(height: 14),
              ],
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                decoration: _decoration('Alamat Email (contoh: nama@gmail.com)...', Icons.mail_outline, 'email'),
              ),
              const SizedBox(height: 14),
              if (_register) ...[
                TextField(
                  controller: _whatsapp,
                  keyboardType: TextInputType.phone,
                  decoration: _decoration('Nomor WhatsApp (contoh: 081234567890)...', Icons.phone_outlined, 'whatsapp'),
                ),
                const SizedBox(height: 14),
              ],
              TextField(
                controller: _password,
                obscureText: !_showPassword,
                autofillHints: [_register ? AutofillHints.newPassword : AutofillHints.password],
                onSubmitted: _register ? null : (_) => _submit(),
                decoration: _decoration(
                  _register ? 'Kata Sandi (minimal 12 karakter)...' : 'Kata Sandi...',
                  Icons.lock_outline,
                  'password',
                  suffix: IconButton(
                    onPressed: () => setState(() => _showPassword = !_showPassword),
                    icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                  ),
                ),
              ),
              if (_register) ...[
                const SizedBox(height: 14),
                TextField(
                  controller: _confirm,
                  obscureText: !_showConfirm,
                  decoration: _decoration(
                    'Konfirmasi Kata Sandi...',
                    Icons.lock_outline,
                    'confirm',
                    suffix: IconButton(
                      onPressed: () => setState(() => _showConfirm = !_showConfirm),
                      icon: Icon(_showConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  decoration: BoxDecoration(
                    color: _errors['agreeTerms'] != null ? AppColors.dangerSoft : AppColors.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _errors['agreeTerms'] != null ? AppColors.dangerBorder : AppColors.border,
                      width: _errors['agreeTerms'] != null ? 1.5 : 1,
                    ),
                  ),
                  child: Row(children: [
                    Checkbox(
                      value: _agreeTerms,
                      onChanged: (v) => setState(() {
                        _agreeTerms = v ?? false;
                        _errors.remove('agreeTerms');
                      }),
                    ),
                    Expanded(
                      child: Text.rich(TextSpan(
                        text: 'Saya menyetujui ',
                        style: const TextStyle(fontSize: 13, color: AppColors.textBody),
                        children: [
                          TextSpan(
                            text: 'Syarat & Ketentuan Pendaftaran',
                            recognizer: _termsTap,
                            style: const TextStyle(
                              color: AppColors.accent,
                              fontWeight: FontWeight.w700,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ],
                      )),
                    ),
                  ]),
                ),
                ErrorText(_errors['agreeTerms']),
              ],
              const SizedBox(height: 20),
              PrimaryButton(
                label: _loading ? 'Memproses...' : (_register ? 'Daftar Akun Sekarang' : 'Masuk Sekarang'),
                loading: _loading,
                icon: Icons.arrow_forward,
                onPressed: _submit,
              ),
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 14),
              Wrap(alignment: WrapAlignment.center, crossAxisAlignment: WrapCrossAlignment.center, children: [
                Text(_register ? 'Sudah punya akun? ' : 'Belum punya akun? ',
                    style: const TextStyle(fontSize: 13.5, color: AppColors.textMuted)),
                GestureDetector(
                  onTap: _toggleMode,
                  child: Text(_register ? 'Masuk sekarang' : 'Daftar gratis sekarang',
                      style: const TextStyle(fontSize: 13.5, color: AppColors.accent, fontWeight: FontWeight.w800)),
                ),
              ]),
            ]),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: const Text(
              'Mitra Provider / Pemilik Tour? Kelola paket melalui Partner Hub di web TemenTrip.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.5, color: AppColors.textMedium),
            ),
          ),
        ],
      ),
    );
  }
}
