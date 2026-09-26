import 'package:flutter/material.dart';

import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/screens/auth_screen.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/screens/trip_planner_screen.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/services/wishlist_store.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/utils/trip_utils.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/legal_content.dart';

const _genders = ['Laki-laki', 'Perempuan'];

/// Pengaturan akun & favorit, padanan `CustomerSettingsPage` di web.
class ProfileScreen extends StatelessWidget {
  final VoidCallback onBrowseTrips;

  const ProfileScreen({super.key, required this.onBrowseTrips});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AuthSession.instance,
      builder: (context, _) {
        final loggedIn = AuthSession.instance.isLoggedIn;
        return DefaultTabController(
          length: 2,
          child: Scaffold(
            appBar: AppBar(
              title: const Text('Pengaturan (Akun & Favorit)'),
              bottom: const TabBar(
                labelColor: AppColors.accent,
                unselectedLabelColor: AppColors.textMuted,
                indicatorColor: AppColors.accent,
                labelStyle: TextStyle(fontWeight: FontWeight.w700),
                tabs: [Tab(text: 'Akun'), Tab(text: 'Opsi Favorit')],
              ),
            ),
            body: TabBarView(children: [
              loggedIn ? const _AccountTab() : const _GuestAccountTab(),
              _FavoritesTab(onBrowseTrips: onBrowseTrips),
            ]),
          ),
        );
      },
    );
  }
}

class _GuestAccountTab extends StatelessWidget {
  const _GuestAccountTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        EmptyState(
          icon: Icons.person_outline,
          title: 'Anda Belum Masuk',
          message:
              'Masuk untuk pesan open trip, menyimpan tiket, dan melihat riwayat perjalanan kamu.',
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.of(context)
                  .push(MaterialPageRoute(builder: (_) => const AuthScreen())),
              child: const Text('Masuk'),
            ),
            OutlinedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => const AuthScreen(startInRegisterMode: true))),
              child: const Text('Daftar gratis'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const _PlannerMenu(),
        const SizedBox(height: 16),
        _LegalLinks(),
      ],
    );
  }
}

/// Pintasan ke fitur Rencana Trip (padanan menu "Rencana Trip" di web).
class _PlannerMenu extends StatelessWidget {
  const _PlannerMenu();

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: EdgeInsets.zero,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
              color: AppColors.accentLight,
              borderRadius: BorderRadius.circular(12)),
          child: const Icon(Icons.savings_outlined, color: AppColors.primary),
        ),
        title: const Text('Rencanakan Perjalananmu',
            style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800)),
        subtitle: const Text('Target budget, tabungan & checklist trip',
            style: TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.chevron_right),
        onTap: () async {
          if (!AuthSession.instance.isLoggedIn) {
            final ok = await Navigator.of(context).push<bool>(
                MaterialPageRoute(builder: (_) => const AuthScreen()));
            if (ok != true || !context.mounted) return;
          }
          if (context.mounted) {
            Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const TripPlannerScreen()));
          }
        },
      ),
    );
  }
}

class _LegalLinks extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    Widget tile(IconData icon, String label, VoidCallback onTap) => ListTile(
          leading: Icon(icon, color: AppColors.primary),
          title: Text(label,
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        );
    return SectionCard(
      padding: EdgeInsets.zero,
      child: Column(children: [
        tile(Icons.description_outlined, 'Syarat & Ketentuan',
            () => showGeneralTerms(context)),
        const Divider(),
        tile(Icons.verified_user_outlined, 'Kebijakan Pembatalan Strict H-7',
            () => showCancellationPolicy(context)),
      ]),
    );
  }
}

class _AccountTab extends StatefulWidget {
  const _AccountTab();

  @override
  State<_AccountTab> createState() => _AccountTabState();
}

class _AccountTabState extends State<_AccountTab> {
  final _name = TextEditingController();
  final _whatsapp = TextEditingController();
  String _gender = 'Laki-laki';
  String _birthDate = '';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final p = AuthSession.instance.profile!;
    _name.text = p.name;
    _whatsapp.text = p.whatsapp;
    if (_genders.contains(p.gender)) _gender = p.gender;
    if (parseIsoDate(p.birthDate) != null)
      _birthDate = p.birthDate.substring(0, 10);
  }

  @override
  void dispose() {
    _name.dispose();
    _whatsapp.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    if (_name.text.trim().isEmpty) {
      await showNoticeDialog(context,
          title: 'Periksa Form',
          message: 'Nama Lengkap wajib diisi.',
          isError: true);
      return;
    }
    setState(() => _saving = true);
    try {
      await AuthSession.instance.updateProfile({
        'picName': _name.text.trim(),
        'name': _name.text.trim(),
        'whatsapp': _whatsapp.text.trim(),
        'gender': _gender,
        'birthDate': _birthDate,
      });
      if (mounted) {
        await showNoticeDialog(context,
            title: 'Profil Berhasil Diperbarui',
            message: 'Data akun Anda telah berhasil disimpan di database.');
      }
    } catch (e) {
      if (mounted)
        await showNoticeDialog(context,
            title: 'Profil Gagal Disimpan', message: '$e', isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _logout() async {
    final ok = await showConfirmDialog(
      context,
      icon: Icons.priority_high,
      iconColor: AppColors.dangerDark,
      iconBackground: AppColors.dangerBg,
      title: 'Keluar dari akun?',
      message: const Text(
        'Sesi Anda akan diakhiri. Anda perlu masuk kembali untuk mengakses akun.',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.6),
      ),
      cancelLabel: 'Batal',
      confirmLabel: 'Ya, Keluar',
      confirmColor: AppColors.dangerDark,
    );
    if (ok) await AuthSession.instance.logout();
  }

  @override
  Widget build(BuildContext context) {
    final profile = AuthSession.instance.profile!;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SectionCard(
          child: Row(children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.accentLight,
              child: Text(
                  profile.name.isNotEmpty ? profile.name[0].toUpperCase() : 'T',
                  style: const TextStyle(
                      fontSize: 22,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                        profile.name.isEmpty
                            ? 'Pelanggan TripKita'
                            : profile.name,
                        style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textDark)),
                    const SizedBox(height: 2),
                    Text(profile.email,
                        style: const TextStyle(
                            fontSize: 13, color: AppColors.textMuted)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                          color: AppColors.accentLight,
                          borderRadius: BorderRadius.circular(6)),
                      child: const Text('Traveler',
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary)),
                    ),
                  ]),
            ),
          ]),
        ),
        const SizedBox(height: 16),
        const _PlannerMenu(),
        const SizedBox(height: 16),
        SectionCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Akun',
                style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textDark)),
            const Divider(height: 26),
            const FieldLabel('Nama Lengkap', required: true),
            TextField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                  hintText: 'Masukkan nama lengkap sesuai identitas'),
            ),
            const SizedBox(height: 14),
            const FieldLabel('Alamat Email'),
            TextField(
              controller: TextEditingController(text: profile.email),
              readOnly: true,
              enabled: false,
              decoration: const InputDecoration(fillColor: AppColors.divider),
            ),
            const SizedBox(height: 14),
            const FieldLabel('Nomor WhatsApp'),
            TextField(
              controller: _whatsapp,
              keyboardType: TextInputType.phone,
              decoration:
                  const InputDecoration(hintText: 'Contoh: 08123456789'),
            ),
            const SizedBox(height: 14),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const FieldLabel('Jenis Kelamin'),
                      DropdownButtonFormField<String>(
                        value: _gender,
                        isExpanded: true,
                        items: [
                          for (final g in _genders)
                            DropdownMenuItem(value: g, child: Text(g))
                        ],
                        onChanged: (v) =>
                            setState(() => _gender = v ?? _gender),
                      ),
                    ]),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const FieldLabel('Tanggal Lahir'),
                      InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: () async {
                          final today = dateOnly(DateTime.now());
                          final picked = await showDatePicker(
                            context: context,
                            initialDate:
                                parseIsoDate(_birthDate) ?? DateTime(2000),
                            firstDate: DateTime(1920),
                            lastDate: today,
                          );
                          if (picked != null)
                            setState(() => _birthDate = toIsoDate(picked));
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            suffixIcon: Icon(Icons.calendar_today_outlined,
                                size: 16, color: AppColors.textLight),
                          ),
                          child: Text(
                              _birthDate.isEmpty
                                  ? 'Pilih tanggal'
                                  : formatIsoLong(_birthDate),
                              style: const TextStyle(fontSize: 14)),
                        ),
                      ),
                    ]),
              ),
            ]),
            const SizedBox(height: 20),
            PrimaryButton(
                label: 'Simpan Perubahan',
                loading: _saving,
                color: AppColors.primary,
                onPressed: _save),
          ]),
        ),
        const SizedBox(height: 16),
        _LegalLinks(),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.dangerDark,
            side: const BorderSide(color: AppColors.dangerBorder),
          ),
          onPressed: _logout,
          icon: const Icon(Icons.logout, size: 18),
          label: const Text('Keluar'),
        ),
      ],
    );
  }
}

class _FavoritesTab extends StatelessWidget {
  final VoidCallback onBrowseTrips;

  const _FavoritesTab({required this.onBrowseTrips});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: WishlistStore.instance,
      builder: (context, _) {
        final items = WishlistStore.instance.items;
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (items.isEmpty)
              EmptyState(
                icon: Icons.favorite_border,
                title: 'Belum Ada Paket Favorit',
                message:
                    'Simpan paket wisata incaran Anda dengan menekan ikon hati pada kartu paket.',
                actions: [
                  ElevatedButton(
                      onPressed: onBrowseTrips,
                      child: const Text('Cari Paket Wisata'))
                ],
              )
            else
              for (final pkg in items) ...[
                _FavoriteTile(pkg: pkg),
                const SizedBox(height: 12),
              ],
          ],
        );
      },
    );
  }
}

class _FavoriteTile extends StatelessWidget {
  final TripPackage pkg;

  const _FavoriteTile({required this.pkg});

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: const EdgeInsets.all(12),
      child: InkWell(
        onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => TripDetailScreen(package: pkg))),
        child: Row(children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: NetworkPhoto(coverImageFor(pkg), width: 84, height: 84),
          ),
          const SizedBox(width: 12),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                  '${pkg.tripType.isEmpty ? 'Open Trip' : pkg.tripType} • ${pkg.category}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accent)),
              const SizedBox(height: 4),
              Text(pkg.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textDark)),
              const SizedBox(height: 4),
              Text(pkg.destination,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textMuted)),
              const SizedBox(height: 4),
              Text(formatIDR(pkg.price),
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppColors.accent)),
            ]),
          ),
          IconButton(
            tooltip: 'Hapus dari Favorit',
            onPressed: () async {
              await WishlistStore.instance
                  .toggle(pkg, syncToAccount: AuthSession.instance.isLoggedIn);
              if (context.mounted)
                showSnack(context, 'Paket berhasil dihapus dari Favorit.');
            },
            icon: const Icon(Icons.delete_outline, color: AppColors.danger),
          ),
        ]),
      ),
    );
  }
}
