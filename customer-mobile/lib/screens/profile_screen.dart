import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:image_picker/image_picker.dart';

import 'package:customer_mobile/config/app_config.dart';
import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/screens/auth_screen.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/services/wishlist_store.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/external_links.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/form_fields.dart';
import 'package:customer_mobile/widgets/legal_content.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

const _genders = ['Laki-laki', 'Perempuan'];

/// AppBar halaman turunan Profil: panah di x 24, judul di x 65.
AppBar _subpageBar(String title) => AppBar(leadingWidth: 72, titleSpacing: -7, title: Text(title));

/// Tab Profil: kartu akun, menu Perjalanan/Bantuan/Tentang, dan keluar akun.
class ProfileScreen extends StatelessWidget {
  final VoidCallback onBrowseTrips;

  const ProfileScreen({super.key, required this.onBrowseTrips});

  void _push(BuildContext context, Widget page) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));

  void _openSite(BuildContext context, String route, String fallback) {
    if (AppConfig.siteUrl.isEmpty) {
      showTopToast(context, fallback);
      return;
    }
    openExternal(Uri.parse('${AppConfig.siteUrl}/#/$route'));
  }

  Future<void> _logout(BuildContext context) async {
    final ok = await showActionDialog(
      context,
      title: 'Keluar dari Akun?',
      message: const Text('Anda perlu masuk kembali untuk melihat booking dan rencana trip.'),
      confirmLabel: 'Ya, Keluar',
      cancelLabel: 'Batal',
    );
    if (ok) await AuthSession.instance.logout();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AuthSession.instance,
      builder: (context, _) {
        final loggedIn = AuthSession.instance.isLoggedIn;
        return Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(automaticallyImplyLeading: false, titleSpacing: 16, title: const Text('Profil')),
          body: DefaultTextStyle.merge(
            style: figmaTextStyle,
            child: ListView(
              padding: const EdgeInsets.only(top: 16, bottom: 16),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _AccountCard(
                    onEdit: () => _push(context, const EditProfileScreen()),
                    onLogin: () => _push(context, const AuthScreen()),
                  ),
                ),
                const SizedBox(height: 20),
                const _SectionBand('Perjalanan'),
                _MenuRow(icon: 'menu_ticket', label: 'Booking', onTap: () => appShellKey.currentState?.showBookings()),
                _MenuRow(
                  icon: 'menu_heart',
                  label: 'Trip Favorit',
                  divider: false,
                  onTap: () => _push(context, FavoriteTripsScreen(onBrowseTrips: onBrowseTrips)),
                ),
                const SizedBox(height: 20),
                const _SectionBand('Bantuan'),
                _MenuRow(
                  icon: 'menu_headset',
                  label: 'Kontak Kami',
                  divider: false,
                  onTap: () => _push(context, const ContactScreen()),
                ),
                const SizedBox(height: 20),
                const _SectionBand('Tentang TemenTrip'),
                _MenuRow(
                  icon: 'menu_link',
                  label: 'Jadi Mitra Provider',
                  onTap: () => _openSite(context, 'partner-landing', 'Daftar sebagai mitra melalui situs web TemenTrip.'),
                ),
                _MenuRow(
                  icon: 'menu_bulb',
                  label: 'Kenali TemenTrip',
                  onTap: () => _openSite(context, 'tentang-kami', 'Kenali TemenTrip lebih jauh di situs web kami.'),
                ),
                _MenuRow(icon: 'menu_shield', label: 'Kebijakan Privasi', onTap: () => showPrivacyPolicy(context)),
                _MenuRow(icon: 'menu_files', label: 'Syarat & Ketentuan', onTap: () => showGeneralTerms(context)),
                if (loggedIn) ...[
                  const SizedBox(height: 20),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        foregroundColor: AppColors.textMedium,
                        side: const BorderSide(color: AppColors.borderStrong),
                      ),
                      onPressed: () => _logout(context),
                      child: const Text('Keluar Akun'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Kartu akun teal dengan avatar, nama, email, dan tombol ubah profil.
class _AccountCard extends StatelessWidget {
  final VoidCallback onEdit;
  final VoidCallback onLogin;

  const _AccountCard({required this.onEdit, required this.onLogin});

  @override
  Widget build(BuildContext context) {
    final profile = AuthSession.instance.profile;
    return Container(
      height: 90,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.brand,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
        boxShadow: const [BoxShadow(color: Color(0x1A000000), offset: Offset(0, 1), blurRadius: 3)],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: profile == null ? onLogin : null,
          child: Row(children: [
            const SizedBox(width: 15),
            ProfileAvatar(size: 56, photo: profile?.profilePhoto ?? ''),
            const SizedBox(width: 12),
            Expanded(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(profile == null ? 'Masuk ke TemenTrip' : (profile.name.isEmpty ? 'Pelanggan TemenTrip' : profile.name),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 20, height: 28 / 20, fontWeight: FontWeight.w700, color: Colors.white)),
                const SizedBox(height: 2.3),
                Text(profile?.email ?? 'Masuk atau daftar untuk mengelola booking',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.accentSoft)),
              ]),
            ),
            if (profile != null)
              ButtonSkin(
                filled: false,
                child: Material(
                  color: Colors.white,
                  shape: const CircleBorder(side: BorderSide(color: AppColors.buttonOutline)),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: onEdit,
                    child: const SizedBox(
                      width: 36,
                      height: 36,
                      child: Center(child: AppIcon('pencil', size: 20, color: AppColors.accent)),
                    ),
                  ),
                ),
              ),
            const SizedBox(width: 15),
          ]),
        ),
      ),
    );
  }
}

/// Avatar bulat: foto profil, atau siluet abu bila belum ada foto.
class ProfileAvatar extends StatelessWidget {
  final double size;
  final String photo;

  const ProfileAvatar({super.key, required this.size, required this.photo});

  @override
  Widget build(BuildContext context) {
    final url = resolveMediaUrl(photo);
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.divider,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.border, width: size / 40),
      ),
      child: url.isEmpty
          ? Center(child: AppIcon('avatar_glyph', size: size / 2))
          : Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => AppIcon('avatar_glyph', size: size / 2)),
    );
  }
}

class _SectionBand extends StatelessWidget {
  final String label;

  const _SectionBand(this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 40,
      color: AppColors.divider,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(label,
          style: const TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.textMedium)),
    );
  }
}

/// Baris menu 52: ikon 24, label 16, panah abu; garis pemisah di bawahnya.
class _MenuRow extends StatelessWidget {
  final String icon;
  final String label;
  final VoidCallback onTap;
  final bool divider;

  const _MenuRow({required this.icon, required this.label, required this.onTap, this.divider = true});

  @override
  Widget build(BuildContext context) {
    return Column(mainAxisSize: MainAxisSize.min, children: [
      InkWell(
        onTap: onTap,
        child: SizedBox(
          height: 52,
          child: Row(children: [
            const SizedBox(width: 14),
            AppIcon(icon, color: AppColors.textMedium),
            const SizedBox(width: 10),
            Expanded(child: Text(label, style: const TextStyle(fontSize: 16, height: 1.5, color: AppColors.textDark))),
            const AppIcon('chevron_right', color: AppColors.textLight),
            const SizedBox(width: 13.4),
          ]),
        ),
      ),
      if (divider) ...[
        const SizedBox(height: 4),
        const Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: Divider(height: 1)),
      ],
    ]);
  }
}

/// Lembar aksi foto profil: ambil, unggah, atau lihat foto.
Future<void> showPhotoActions(BuildContext context) {
  Future<void> pick(BuildContext sheetContext, ImageSource source) async {
    Navigator.pop(sheetContext);
    final file = await ImagePicker().pickImage(source: source, maxWidth: 1080, imageQuality: 85);
    if (file == null || !context.mounted) return;
    try {
      await AuthSession.instance.updatePhoto(await file.readAsBytes(), file.name);
      if (context.mounted) showTopToast(context, 'Foto profil berhasil diperbarui');
    } catch (e) {
      if (context.mounted) showTopToast(context, e is ApiException ? e.message : 'Foto profil belum dapat disimpan.');
    }
  }

  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.white,
    barrierColor: const Color(0xB3000000),
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
    builder: (sheetContext) => SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 16),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 48,
            height: 5,
            decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2.5)),
          ),
          const SizedBox(height: 27),
          _MenuRow(icon: 'menu_camera', label: 'Ambil Foto', onTap: () => pick(sheetContext, ImageSource.camera)),
          _MenuRow(icon: 'menu_image', label: 'Unggah Foto', onTap: () => pick(sheetContext, ImageSource.gallery)),
          _MenuRow(
            icon: 'menu_eye',
            label: 'Lihat Foto',
            onTap: () {
              Navigator.pop(sheetContext);
              showPhotoViewer(context);
            },
          ),
        ]),
      ),
    ),
  );
}

/// Pratinjau foto profil 296×296; ketuk di luar foto untuk menutup.
Future<void> showPhotoViewer(BuildContext context) {
  final photo = AuthSession.instance.profile?.profilePhoto ?? '';
  final url = resolveMediaUrl(photo);
  return showDialog<void>(
    context: context,
    useSafeArea: false,
    barrierColor: const Color(0xB3000000),
    builder: (dialogContext) => GestureDetector(
      onTap: () => Navigator.pop(dialogContext),
      child: Material(
        type: MaterialType.transparency,
        child: Center(
          child: Container(
            width: 296,
            padding: const EdgeInsets.only(top: 4),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                ),
                child: const Center(child: AppIcon('x_close', size: 20, color: Colors.white)),
              ),
              const SizedBox(height: 16),
              GestureDetector(
                onTap: () {},
                child: Container(
                  width: 296,
                  height: 296,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    color: AppColors.divider,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: url.isEmpty
                      ? const Center(child: AppIcon('avatar_glyph', size: 142))
                      : Image.network(url, fit: BoxFit.cover),
                ),
              ),
              const SizedBox(height: 20),
              const SizedBox(
                width: 296,
                child: Text('Ketuk diluar foto untuk menutup',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.divider)),
              ),
            ]),
          ),
        ),
      ),
    ),
  );
}

/// Ubah Profil: avatar dengan tombol kamera, lalu data akun.
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  String _gender = '';
  String _birthDate = '';
  bool _saving = false;
  String? _nameError;

  @override
  void initState() {
    super.initState();
    final p = AuthSession.instance.profile;
    if (p == null) return;
    _name.text = p.name;
    _phone.text = phoneLocalPart(p.whatsapp);
    if (_genders.contains(p.gender)) _gender = p.gender;
    if (parseIsoDate(p.birthDate) != null) _birthDate = p.birthDate.substring(0, 10);
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    if (_name.text.trim().isEmpty) {
      setState(() => _nameError = 'Wajib diisi.');
      return;
    }
    setState(() {
      _saving = true;
      _nameError = null;
    });
    try {
      await AuthSession.instance.updateProfile({
        'picName': _name.text.trim(),
        'name': _name.text.trim(),
        'whatsapp': phoneFromLocal(_phone.text),
        'gender': _gender,
        'birthDate': _birthDate,
      });
      if (mounted) showTopToast(context, 'Profil berhasil disimpan');
    } catch (e) {
      if (mounted) showTopToast(context, e is ApiException ? e.message : 'Profil belum dapat disimpan.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AuthSession.instance,
      builder: (context, _) {
        final profile = AuthSession.instance.profile;
        return Scaffold(
          backgroundColor: Colors.white,
          appBar: _subpageBar('Ubah Profil'),
          body: DefaultTextStyle.merge(
            style: figmaTextStyle,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                Center(
                  child: GestureDetector(
                    onTap: () => showPhotoActions(context),
                    child: SizedBox(
                      width: 64,
                      height: 64,
                      child: Stack(clipBehavior: Clip.none, children: [
                        ProfileAvatar(size: 64, photo: profile?.profilePhoto ?? ''),
                        Positioned(
                          left: 36,
                          top: 36,
                          child: Container(
                            width: 28,
                            height: 28,
                            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                            child: const Center(child: AppIcon('camera_badge', size: 16, color: AppColors.icon)),
                          ),
                        ),
                      ]),
                    ),
                  ),
                ),
                const SizedBox(height: 11.4),
                Text(profile?.name ?? '',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 20, height: 28 / 20, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                const SizedBox(height: 2.3),
                Text(profile?.email ?? '',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
                const SizedBox(height: 20),
                LabeledField(
                  label: 'Nama Lengkap',
                  error: _nameError,
                  child: TextField(
                    controller: _name,
                    textCapitalization: TextCapitalization.words,
                    style: fieldTextStyle,
                    decoration: markError(const InputDecoration(hintText: 'Nama lengkap'), _nameError),
                  ),
                ),
                const SizedBox(height: 16),
                LabeledField(
                  label: 'Alamat Email',
                  child: TextField(
                    controller: TextEditingController(text: profile?.email ?? ''),
                    enabled: false,
                    style: fieldTextStyle.copyWith(color: AppColors.textLight),
                    decoration: InputDecoration(
                      fillColor: AppColors.background,
                      disabledBorder: const OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(8)),
                        borderSide: BorderSide(color: AppColors.borderStrong),
                      ),
                      prefixIconConstraints: fieldPrefixConstraints,
                      prefixIcon: fieldPrefixIcon('envelope'),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                LabeledField(label: 'Nomor WhatsApp / HP', child: PhoneField(controller: _phone)),
                const SizedBox(height: 16),
                LabeledField(
                  label: 'Jenis Kelamin',
                  child: SelectField(
                    value: _gender,
                    options: _genders,
                    hint: 'Pilih jenis kelamin',
                    onChanged: (v) => setState(() => _gender = v ?? _gender),
                  ),
                ),
                const SizedBox(height: 16),
                LabeledField(
                  label: 'Tanggal Lahir',
                  child: BirthDateField(valueIso: _birthDate, onChanged: (v) => setState(() => _birthDate = v)),
                ),
                const SizedBox(height: 20),
                PrimaryButton(label: 'Simpan', loading: _saving, onPressed: _save),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Trip Favorit: kartu trip tersimpan, atau ilustrasi saat kosong.
class FavoriteTripsScreen extends StatelessWidget {
  final VoidCallback onBrowseTrips;

  const FavoriteTripsScreen({super.key, required this.onBrowseTrips});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: _subpageBar('Trip Favorit'),
      body: DefaultTextStyle.merge(
        style: figmaTextStyle,
        child: ListenableBuilder(
          listenable: WishlistStore.instance,
          builder: (context, _) {
            final items = WishlistStore.instance.items;
            if (items.isEmpty) return const _FavoritesEmpty();
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, i) => _favoriteCard(context, items[i]),
            );
          },
        ),
      ),
    );
  }

  Widget _favoriteCard(BuildContext context, TripPackage pkg) => TripListCard(
        pkg: pkg,
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TripDetailScreen(package: pkg))),
      );
}

class _FavoritesEmpty extends StatelessWidget {
  const _FavoritesEmpty();

  @override
  Widget build(BuildContext context) {
    // Konten sedikit di bawah tengah, sama dengan desain.
    return Padding(
      padding: const EdgeInsets.only(top: 25, left: 40, right: 40),
      child: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          SvgPicture.asset('assets/images/favorite_empty.svg', width: 206, height: 162),
          const SizedBox(height: 39.4),
          const Text('Belum Ada Trip Favorit',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, height: 28 / 20, fontWeight: FontWeight.w600, color: AppColors.textStrong)),
          const SizedBox(height: 5.3),
          const Text('Simpan trip yang menarik agar mudah\nditemukan lagi nanti.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
        ]),
      ),
    );
  }
}

/// Kontak Kami: ilustrasi layanan pelanggan, lalu tombol WhatsApp & Email.
class ContactScreen extends StatelessWidget {
  const ContactScreen({super.key});

  @override
  Widget build(BuildContext context) {
    Widget channel(String icon, String label, Uri uri) => Expanded(
          child: Material(
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: const BorderSide(color: AppColors.border),
            ),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () => openExternal(uri),
              child: SizedBox(
                height: 64,
                child: Row(children: [
                  const SizedBox(width: 16),
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(color: AppColors.accentBright.withValues(alpha: 0.05), shape: BoxShape.circle),
                    child: Center(child: AppIcon(icon)),
                  ),
                  const SizedBox(width: 12),
                  Text(label,
                      style: const TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: AppColors.textDark)),
                ]),
              ),
            ),
          ),
        );
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: _subpageBar('Kontak Kami'),
      body: DefaultTextStyle.merge(
        style: figmaTextStyle,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 35, 16, 16),
          children: [
            Center(child: SvgPicture.asset('assets/images/contact_support.svg', width: 224, height: 210)),
            const SizedBox(height: 25),
            const Text('Masih butuh bantuan?',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18, height: 28 / 18, fontWeight: FontWeight.w600, color: AppColors.textDark)),
            const SizedBox(height: 3.5),
            const Text('Hubungi tim TemenTrip melalui kanal berikut.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
            const SizedBox(height: 21.3),
            Row(children: [
              channel('chat_duo', 'WhatsApp', Uri.parse('https://wa.me/${AppConfig.supportWhatsApp}')),
              const SizedBox(width: 16),
              channel('email_duo', 'Email', Uri.parse('mailto:${AppConfig.supportEmail}')),
            ]),
          ],
        ),
      ),
    );
  }
}
