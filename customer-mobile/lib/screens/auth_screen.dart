import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'package:customer_mobile/config/app_config.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/validators.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/form_fields.dart';
import 'package:customer_mobile/widgets/google_button/google_web_button.dart'
    if (dart.library.js_interop) 'package:customer_mobile/widgets/google_button/google_web_button_web.dart';
import 'package:customer_mobile/widgets/legal_content.dart';

enum _Mode { login, registerEmail, registerForm }

/// Masuk / daftar customer, padanan `CustomerLoginPage` di web. Daftar dibuat
/// dua langkah: email dulu, lalu nama, WhatsApp, dan kata sandi. Setelah
/// berhasil, layar ditutup dengan hasil `true` sehingga alur sebelumnya
/// (mis. "Pesan Sekarang") dapat dilanjutkan.
class AuthScreen extends StatefulWidget {
  final bool startInRegisterMode;

  const AuthScreen({super.key, this.startInRegisterMode = false});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  late _Mode _mode = widget.startInRegisterMode ? _Mode.registerEmail : _Mode.login;
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _whatsapp = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _showPassword = false;
  bool _showConfirm = false;
  bool _loading = false;
  Map<String, String> _errors = {};

  late final TapGestureRecognizer _termsTap = TapGestureRecognizer()..onTap = () => showRegistrationTerms(context);

  bool get _googleAvailable => AppConfig.googleServerClientId.isNotEmpty;

  /// Web: hasil login dari tombol resmi Google datang lewat event ini.
  StreamSubscription<GoogleSignInAuthenticationEvent>? _googleEvents;

  @override
  void initState() {
    super.initState();
    if (kIsWeb && _googleAvailable) {
      AuthSession.googleReady.then((_) {
        if (!mounted) return;
        _googleEvents = GoogleSignIn.instance.authenticationEvents.listen(
          (event) {
            if (event is GoogleSignInAuthenticationEventSignIn) _completeGoogle(event.user);
          },
          onError: (Object e) {
            if (mounted) _showGoogleError(e);
          },
        );
      });
    }
  }

  @override
  void dispose() {
    for (final c in [_name, _email, _whatsapp, _password, _confirm]) {
      c.dispose();
    }
    _termsTap.dispose();
    _googleEvents?.cancel();
    super.dispose();
  }

  /// Nomor WhatsApp seperti diketik di web (`08…`) dari isian berawalan +62.
  String get _whatsappNumber {
    final local = phoneLocalPart(_whatsapp.text);
    return local.isEmpty ? '' : '0$local';
  }

  bool _validate() {
    final errors = <String, String>{};
    if (_mode != _Mode.registerForm) {
      final email = validateEmail(_email.text);
      if (email != null) errors['email'] = email;
    }
    if (_mode == _Mode.login && _password.text.isEmpty) errors['password'] = 'Kata sandi wajib diisi.';
    if (_mode == _Mode.registerForm) {
      final name = validateRegisterName(_name.text);
      if (name != null) errors['name'] = name;
      final wa = validateRegisterPhone(_whatsappNumber);
      if (wa != null) errors['whatsapp'] = wa;
      if (_password.text.isEmpty) {
        errors['password'] = 'Kata sandi wajib diisi.';
      } else if (_password.text.length < 12) {
        errors['password'] = 'Kata sandi minimal 12 karakter.';
      }
      if (_confirm.text.isEmpty) {
        errors['confirm'] = 'Konfirmasi kata sandi wajib diisi.';
      } else if (_password.text != _confirm.text) {
        errors['confirm'] = 'Konfirmasi kata sandi tidak cocok dengan kata sandi di atas.';
      }
    }
    setState(() => _errors = errors);
    return errors.isEmpty;
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (_loading || !_validate()) return;
    if (_mode == _Mode.registerEmail) {
      setState(() => _mode = _Mode.registerForm);
      return;
    }
    final register = _mode == _Mode.registerForm;
    setState(() => _loading = true);
    try {
      if (register) {
        await AuthSession.instance.register(
          name: _name.text.trim(),
          email: _email.text.trim(),
          password: _password.text,
          whatsapp: _whatsappNumber,
        );
      } else {
        await AuthSession.instance.login(_email.text.trim(), _password.text);
      }
      if (!mounted) return;
      showTopToast(context, register ? 'Pendaftaran berhasil! Akun Anda telah aktif.' : 'Berhasil masuk! Selamat datang kembali.');
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showTopToast(context, e is ApiException ? e.message : 'Proses gagal. Silakan periksa kembali data Anda.');
    }
  }

  Future<void> _googleLogin() async {
    setState(() => _loading = true);
    try {
      final signedIn = await AuthSession.instance.loginWithGoogle();
      if (!mounted) return;
      if (!signedIn) {
        setState(() => _loading = false);
        return;
      }
      showTopToast(context, 'Berhasil masuk dengan Google!');
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _showGoogleError(e);
    }
  }

  Future<void> _completeGoogle(GoogleSignInAccount account) async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      await AuthSession.instance.loginWithGoogleAccount(account);
      if (!mounted) return;
      showTopToast(context, 'Berhasil masuk dengan Google!');
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _showGoogleError(e);
    }
  }

  void _showGoogleError(Object e) {
    showNoticeDialog(
      context,
      title: 'Login Google Gagal',
      message: e is ApiException ? e.message : 'Login Google gagal: $e',
      isError: true,
    );
  }

  // shortcut: backend belum punya reset kata sandi customer, jadi diarahkan
  // ke WhatsApp CS; ganti ke alur email bila endpoint-nya tersedia.
  void _forgotPassword() {
    final email = _email.text.trim();
    final text = 'Halo TemenTrip, saya lupa kata sandi akun${email.isEmpty ? '' : ' $email'}.';
    openExternal(Uri.parse('https://wa.me/${AppConfig.supportWhatsApp}?text=${Uri.encodeComponent(text)}'));
  }

  void _switchMode() {
    setState(() {
      _mode = _mode == _Mode.login ? _Mode.registerEmail : _Mode.login;
      _errors = {};
    });
  }

  Widget _eye(bool shown, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(right: 12),
        child: Semantics(
          button: true,
          label: shown ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi',
          child: InkResponse(onTap: onTap, radius: 20, child: const AppIcon('eye', color: AppColors.icon)),
        ),
      );

  Widget _passwordField(TextEditingController controller, String key, String hint, bool shown, VoidCallback toggle,
      {Iterable<String>? autofill, ValueChanged<String>? onSubmitted}) {
    return TextField(
      controller: controller,
      obscureText: !shown,
      autofillHints: autofill,
      onSubmitted: onSubmitted,
      style: fieldTextStyle,
      decoration: markError(
        InputDecoration(
          hintText: hint,
          suffixIcon: _eye(shown, toggle),
          suffixIconConstraints: const BoxConstraints(minWidth: 36, minHeight: 24),
        ),
        _errors[key],
      ),
    );
  }

  Widget _emailField() {
    return LabeledField(
      label: 'Alamat Email',
      error: _errors['email'],
      child: TextField(
        controller: _email,
        keyboardType: TextInputType.emailAddress,
        autofillHints: const [AutofillHints.email],
        style: fieldTextStyle,
        decoration: markError(
          InputDecoration(
            hintText: 'Alamat email',
            prefixIconConstraints: fieldPrefixConstraints,
            prefixIcon: fieldPrefixIcon('envelope'),
          ),
          _errors['email'],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final register = _mode != _Mode.login;
    return PopScope(
      // Langkah kedua daftar kembali ke langkah email.
      canPop: _mode != _Mode.registerForm,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _mode = _Mode.registerEmail);
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(leadingWidth: 72),
        body: DefaultTextStyle.merge(
          style: figmaTextStyle,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Expanded(
              child: AutofillGroup(
                child: ListView(padding: const EdgeInsets.fromLTRB(16, 19.7, 16, 16), children: [
                  Text(register ? 'Daftar Akun Baru' : 'Masuk ke TemenTrip',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                  const SizedBox(height: 5.2),
                  Text(
                    register
                        ? 'Daftar akun baru untuk pesan open trip & kelola tiket Anda.'
                        : 'Silakan masuk atau daftar akun untuk melanjutkan.',
                    style: const TextStyle(fontSize: 14, height: 1.6, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 20),
                  ...switch (_mode) {
                    _Mode.login => _loginFields(),
                    _Mode.registerEmail => _registerEmailFields(),
                    _Mode.registerForm => _registerFormFields(),
                  },
                ]),
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 17.3),
                child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(register ? 'Sudah punya akun?' : 'Belum punya akun?',
                      style: const TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
                  const SizedBox(width: 6),
                  InkWell(
                    onTap: _loading ? null : _switchMode,
                    child: Text(register ? 'Masuk sekarang' : 'Daftar sekarang',
                        style: const TextStyle(
                            fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600, color: AppColors.accent)),
                  ),
                ]),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  List<Widget> _loginFields() => [
        _emailField(),
        const SizedBox(height: 16),
        LabeledField(
          label: 'Kata Sandi',
          error: _errors['password'],
          child: _passwordField(
            _password,
            'password',
            'Kata sandi',
            _showPassword,
            () => setState(() => _showPassword = !_showPassword),
            autofill: const [AutofillHints.password],
            onSubmitted: (_) => _submit(),
          ),
        ),
        const SizedBox(height: 16),
        Align(
          alignment: Alignment.centerRight,
          child: InkWell(
            onTap: _forgotPassword,
            child: const Text('Lupa kata sandi?',
                style: TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w600, color: AppColors.accent)),
          ),
        ),
        const SizedBox(height: 20),
        ElevatedButton(onPressed: _loading ? null : _submit, child: Text(_loading ? 'Memproses...' : 'Masuk')),
        ..._googleSection(),
      ];

  List<Widget> _registerEmailFields() => [
        _emailField(),
        const SizedBox(height: 20),
        ElevatedButton(onPressed: _loading ? null : _submit, child: const Text('Lanjut')),
        ..._googleSection(),
        const SizedBox(height: 16.3),
        _terms(),
      ];

  List<Widget> _registerFormFields() => [
        LabeledField(
          label: 'Nama Lengkap',
          error: _errors['name'],
          child: TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            autofillHints: const [AutofillHints.name],
            style: fieldTextStyle,
            decoration: markError(const InputDecoration(hintText: 'Nama lengkap'), _errors['name']),
          ),
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'Nomor WhatsApp / HP',
          required: true,
          error: _errors['whatsapp'],
          child: PhoneField(controller: _whatsapp, errorText: _errors['whatsapp']),
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'Kata Sandi',
          error: _errors['password'],
          child: _passwordField(
            _password,
            'password',
            'Minimal 12 karakter',
            _showPassword,
            () => setState(() => _showPassword = !_showPassword),
            autofill: const [AutofillHints.newPassword],
          ),
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'Konfirmasi Kata Sandi',
          error: _errors['confirm'],
          child: _passwordField(
            _confirm,
            'confirm',
            'Ulangi kata sandi',
            _showConfirm,
            () => setState(() => _showConfirm = !_showConfirm),
            onSubmitted: (_) => _submit(),
          ),
        ),
        const SizedBox(height: 20),
        ElevatedButton(onPressed: _loading ? null : _submit, child: Text(_loading ? 'Memproses...' : 'Daftar')),
        const SizedBox(height: 16.3),
        _terms(),
      ];

  /// "atau" lalu tombol Google; disembunyikan bila login Google tidak aktif.
  List<Widget> _googleSection() {
    if (!_googleAvailable) return const [];
    return [
      const SizedBox(height: 17.4),
      const Row(children: [
        SizedBox(width: 16),
        Expanded(child: Divider(height: 1, color: AppColors.border)),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text('atau',
              style: TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w500, color: AppColors.textMuted)),
        ),
        Expanded(child: Divider(height: 1, color: AppColors.border)),
        SizedBox(width: 16),
      ]),
      const SizedBox(height: 16.6),
      if (kIsWeb)
        // Web wajib memakai tombol resmi Google (GIS) agar login dapat dipicu.
        SizedBox(
          height: 44,
          child: FutureBuilder<void>(
            future: AuthSession.googleReady,
            builder: (context, snapshot) => snapshot.connectionState != ConnectionState.done
                ? const SizedBox.shrink()
                : LayoutBuilder(builder: (context, c) => Center(child: googleWebButton(c.maxWidth))),
          ),
        )
      else
        OutlinedButton(
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.borderStrong),
            foregroundColor: AppColors.textMedium,
          ),
          onPressed: _loading ? null : _googleLogin,
          child: const Row(mainAxisSize: MainAxisSize.min, children: [
            AppIcon('google_g', size: 20),
            SizedBox(width: 12),
            Text('Masuk dengan Google'),
          ]),
        ),
    ];
  }

  Widget _terms() {
    return Text.rich(
      TextSpan(text: 'Dengan mendaftar di sini, Anda menyetujui ', children: [
        TextSpan(
          text: 'Syarat & Ketentuan Pendaftaran',
          recognizer: _termsTap,
          style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.primaryDark),
        ),
        const TextSpan(text: ' TemenTrip'),
      ]),
      textAlign: TextAlign.center,
      style: const TextStyle(fontSize: 14, height: 1.6, color: AppColors.textMuted),
    );
  }
}
