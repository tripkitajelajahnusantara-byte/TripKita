import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/models/trip_plan.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/screens/trip_list_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/services/trip_plan_store.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/form_fields.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

const _darkTeal = Color(0xFF075C70);
const _paleTeal = Color(0xFFDCEEF2);

/// `25 Des 2026 • 5 Peserta`
String _planMeta(TripPlan plan) =>
    '${formatDateShort(parseIsoDate(plan.targetDate))} • ${plan.participants} Peserta';

/// Checklist yang tampil: tonggak "destinasi" (id 1) selalu selesai sehingga
/// disembunyikan, seperti desain.
List<TripChecklistItem> _visibleChecklist(TripPlan plan) => plan.checklist.where((c) => c.id != '1').toList();

/// Label tonggak otomatis mengikuti desain, juga untuk plan lama.
String _itemLabel(TripChecklistItem item) => switch (item.id) {
      '2' => 'Capai 25% target tabungan',
      '3' => 'Capai 50% target tabungan',
      '4' => 'Capai 75% target tabungan',
      '5' => 'Capai 100% target tabungan',
      _ => item.label,
    };

/// Catatan penyemangat di halaman Progress Tabungan sesuai tonggak terakhir.
String? _savingsNote(TripPlan plan) {
  final saved = plan.savedAmount * 100;
  if (plan.targetBudget > 0 && saved >= plan.targetBudget * 100) {
    return 'Target tabungan tercapai! Yuk pesan trip impianmu sekarang.';
  }
  for (final milestone in const [75, 50, 25]) {
    if (saved >= plan.targetBudget * milestone) {
      return 'Sudah lewat $milestone%! Tambah tabungan lagi untuk supaya trip impianmu makin dekat.';
    }
  }
  return plan.savedAmount > 0 ? 'Awal yang bagus! Tabung rutin supaya trip impianmu makin dekat.' : null;
}

/// Foto sampul dari galeri, diperkecil agar muat disimpan di perangkat.
Future<Uint8List?> _pickCover() async {
  try {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 720, imageQuality: 75);
    return file?.readAsBytes();
  } catch (_) {
    return null;
  }
}

Future<void> _savePlan(BuildContext context, TripPlan plan) async {
  try {
    await TripPlanStore.instance.upsert(plan);
  } on ApiException catch (e) {
    if (context.mounted) showTopToast(context, e.message);
    rethrow;
  }
}

/// Tab Plan Trip: header teal lalu panel putih berisi daftar plan atau
/// ilustrasi ajakan membuat plan pertama.
class TripPlannerScreen extends StatefulWidget {
  const TripPlannerScreen({super.key});

  @override
  State<TripPlannerScreen> createState() => _TripPlannerScreenState();
}

class _TripPlannerScreenState extends State<TripPlannerScreen> {
  final _store = TripPlanStore.instance;

  @override
  void initState() {
    super.initState();
    _store.load();
  }

  Future<void> _create() async {
    if (_store.plans.length >= TripPlanStore.maxPlans) {
      showTopToast(context, 'Maksimal 10 plan trip. Hapus plan lama untuk membuat yang baru.');
      return;
    }
    final plan = await Navigator.of(context).push<TripPlan>(MaterialPageRoute(builder: (_) => const TripPlanFormScreen()));
    if (plan != null && mounted) _open(plan);
  }

  void _open(TripPlan plan) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => TripPlanDetailScreen(planId: plan.id)));
  }

  /// Tekan lama kartu: ubah atau hapus plan.
  Future<void> _planActions(TripPlan plan) async {
    final action = await _showActions(context, const [('pencil', 'Ubah Plan', false), ('trash', 'Hapus Plan', true)]);
    if (!mounted || action == null) return;
    if (action == 0) {
      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => TripPlanFormScreen(existing: plan)));
      return;
    }
    final ok = await showActionDialog(
      context,
      title: 'Hapus Plan Trip?',
      message: Text('Plan trip ke "${plan.destination}" beserta seluruh riwayat tabungannya akan dihapus.'),
      confirmLabel: 'Ya, Hapus',
      cancelLabel: 'Batal',
    );
    if (!ok || !mounted) return;
    try {
      await _store.remove(plan.id);
      if (mounted) showTopToast(context, 'Plan trip berhasil dihapus');
    } on ApiException catch (e) {
      if (mounted) showTopToast(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.accent,
      body: DefaultTextStyle.merge(
        style: figmaTextStyle,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          SizedBox(height: MediaQuery.paddingOf(context).top),
          const SizedBox(
            height: 56,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Plan Trip', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: Colors.white)),
              ),
            ),
          ),
          Expanded(
            child: Container(
              clipBehavior: Clip.antiAlias,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: ListenableBuilder(listenable: _store, builder: (context, _) => _buildBody()),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _buildBody() {
    final plans = _store.plans;
    if (_store.loading && plans.isEmpty) return const LoadingView('Sedang memuat plan trip...');
    if (_store.error != null && plans.isEmpty) {
      return ListView(padding: const EdgeInsets.all(16), children: [
        EmptyState(
          icon: Icons.cloud_off_outlined,
          title: 'Plan Trip Belum Dapat Dimuat',
          message: _store.error!,
          actions: [ElevatedButton(onPressed: _store.load, child: const Text('Coba Lagi'))],
        ),
      ]);
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Expanded(
        child: plans.isEmpty
            ? const _PlannerEmpty()
            : RefreshIndicator(
                onRefresh: _store.load,
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: plans.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, i) => _PlanCard(
                    plan: plans[i],
                    onTap: () => _open(plans[i]),
                    onLongPress: () => _planActions(plans[i]),
                  ),
                ),
              ),
      ),
      Padding(
        padding: const EdgeInsets.all(16),
        child: OutlinedButton(
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: _create,
          child: Text(plans.isEmpty ? 'Buat Plan Trip' : 'Buat Plan Baru'),
        ),
      ),
    ]);
  }
}

/// Ilustrasi peta dunia dan ajakan membuat plan pertama.
class _PlannerEmpty extends StatelessWidget {
  const _PlannerEmpty();

  @override
  Widget build(BuildContext context) {
    return ListView(padding: const EdgeInsets.only(top: 69, bottom: 16), children: [
      Image.asset('assets/images/plan_empty_map.png', height: 312, fit: BoxFit.cover),
      const SizedBox(height: 15.6),
      const Text('Mulai Rencanakan Trip Impianmu',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textStrong)),
      const SizedBox(height: 6),
      const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: Text('Tentukan destinasi, tanggal, dan target budget, lalu pantau tabunganmu.',
            textAlign: TextAlign.center, style: TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
      ),
    ]);
  }
}

/// Kartu plan pada daftar: sampul, tabungan terkumpul, dan progresnya.
class _PlanCard extends StatelessWidget {
  final TripPlan plan;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  const _PlanCard({required this.plan, required this.onTap, required this.onLongPress});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            _PlanHero(plan: plan),
            const SizedBox(height: 12.9),
            const Text('Tabungan Terkumpul', style: TextStyle(fontSize: 12, height: 16 / 12, color: AppColors.textMuted)),
            const SizedBox(height: 8.2),
            Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
              Text(formatPrice(plan.savedAmount),
                  style: const TextStyle(fontSize: 18, height: 1.17, fontWeight: FontWeight.w700, color: AppColors.textBody)),
              const SizedBox(width: 6),
              Flexible(
                child: Text('/ ${formatPrice(plan.targetBudget)}',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 14, height: 1.17, fontWeight: FontWeight.w500, color: AppColors.textLight)),
              ),
            ]),
            const SizedBox(height: 9.8),
            Row(children: [
              Expanded(
                child: _Bar(
                  value: plan.targetBudget <= 0 ? 0 : plan.savedAmount / plan.targetBudget,
                  background: const Color(0x801F343D),
                  fill: AppColors.accent,
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 39,
                child: Text('${plan.progressPercent}%',
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                        fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: AppColors.textMedium)),
              ),
            ]),
          ]),
        ),
      ),
    );
  }
}

/// Bilah progres setinggi 8 dengan ujung membulat.
class _Bar extends StatelessWidget {
  final double value;
  final Color background;
  final Color fill;

  const _Bar({required this.value, required this.background, required this.fill});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 8,
      alignment: Alignment.centerLeft,
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(4)),
      child: FractionallySizedBox(
        widthFactor: value.clamp(0.0, 1.0),
        child: Container(decoration: BoxDecoration(color: fill, borderRadius: BorderRadius.circular(4))),
      ),
    );
  }
}

/// Sampul plan: foto pilihan pengguna, atau langit dengan logo TemenTrip.
class _CoverImage extends StatelessWidget {
  final Uint8List? bytes;

  const _CoverImage(this.bytes);

  @override
  Widget build(BuildContext context) {
    if (bytes != null) return Image.memory(bytes!, fit: BoxFit.cover, gaplessPlayback: true);
    return const Stack(fit: StackFit.expand, children: [
      Image(
        image: AssetImage('assets/images/plan_cover_sky.png'),
        fit: BoxFit.cover,
        alignment: Alignment(0, 0.49),
      ),
      Center(
        child: Opacity(
          opacity: 0.7,
          child: CroppedAsset('assets/images/logo_white.png',
              width: 107, height: 36, left: -0.1443, top: 0, widthFactor: 1.2857, heightFactor: 1),
        ),
      ),
    ]);
  }
}

/// Sampul 109 dengan gradasi gelap, nama destinasi, tanggal & peserta, dan
/// tombol kamera opsional untuk mengganti sampul.
class _PlanHero extends StatelessWidget {
  final TripPlan plan;
  final VoidCallback? onCamera;

  const _PlanHero({required this.plan, this.onCamera});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        height: 109,
        child: Stack(fit: StackFit.expand, children: [
          _CoverImage(TripPlanStore.instance.cover(plan.id)),
          const DecoratedBox(
            decoration: BoxDecoration(gradient: LinearGradient(colors: [Color(0xF2073E4A), Color(0x00073E4A)])),
          ),
          Positioned(
            left: 16,
            right: onCamera == null ? 16 : 64,
            bottom: 13.2,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(plan.destination,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 24, height: 1.17, fontWeight: FontWeight.w700, color: Colors.white)),
              const SizedBox(height: 4.9),
              Text(_planMeta(plan),
                  style: const TextStyle(
                      fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w500, color: AppColors.background)),
            ]),
          ),
          if (onCamera != null) Positioned(right: 16, bottom: 12, child: _CameraButton(size: 36, onTap: onCamera!)),
        ]),
      ),
    );
  }
}

class _CameraButton extends StatelessWidget {
  final double size;
  final VoidCallback onTap;

  const _CameraButton({required this.size, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Ganti foto sampul',
      child: Material(
        color: Colors.white,
        shape: const CircleBorder(side: BorderSide(color: AppColors.buttonOutline)),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox.square(
            dimension: size,
            child: const Center(child: AppIcon('camera', size: 20, color: AppColors.accent)),
          ),
        ),
      ),
    );
  }
}

/// Input nominal rupiah dengan pemisah ribuan otomatis.
class _RupiahInputFormatter extends TextInputFormatter {
  static final _format = NumberFormat.decimalPattern('id_ID');

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return const TextEditingValue();
    final text = _format.format(int.parse(digits.length > 13 ? digits.substring(0, 13) : digits));
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}

int _parseRupiah(String text) => int.tryParse(text.replaceAll(RegExp(r'\D'), '')) ?? 0;
String _formatRupiahInput(int value) => value <= 0 ? '' : NumberFormat.decimalPattern('id_ID').format(value);

/// Isian nominal berawalan "Rp".
class _RupiahField extends StatelessWidget {
  final TextEditingController controller;
  final String? error;
  final bool autofocus;

  const _RupiahField({required this.controller, this.error, this.autofocus = false});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      autofocus: autofocus,
      keyboardType: TextInputType.number,
      inputFormatters: [_RupiahInputFormatter()],
      style: fieldTextStyle,
      decoration: markError(
        const InputDecoration(
          hintText: '0',
          prefixIcon: Padding(
            padding: EdgeInsets.symmetric(horizontal: 12),
            child: Text('Rp', style: TextStyle(fontSize: 16, height: 1.5, color: AppColors.textMedium)),
          ),
          prefixIconConstraints: BoxConstraints(minHeight: 24),
        ),
        error,
      ),
    );
  }
}

/// Form "Buat Plan Trip" (atau ubah plan): sampul, destinasi, tanggal,
/// peserta, dan target budget.
class TripPlanFormScreen extends StatefulWidget {
  final TripPlan? existing;

  const TripPlanFormScreen({super.key, this.existing});

  @override
  State<TripPlanFormScreen> createState() => _TripPlanFormScreenState();
}

class _TripPlanFormScreenState extends State<TripPlanFormScreen> {
  late final _destination = TextEditingController(text: widget.existing?.destination ?? '');
  late final _participants =
      TextEditingController(text: widget.existing == null ? '' : '${widget.existing!.participants}');
  late final _budget = TextEditingController(text: _formatRupiahInput(widget.existing?.targetBudget ?? 0));
  late String _date = widget.existing?.targetDate ?? '';
  late Uint8List? _cover = widget.existing == null ? null : TripPlanStore.instance.cover(widget.existing!.id);
  bool _coverChanged = false;
  bool _saving = false;
  final _errors = <String, String>{};

  @override
  void dispose() {
    _destination.dispose();
    _participants.dispose();
    _budget.dispose();
    super.dispose();
  }

  Future<void> _changeCover() async {
    final bytes = await _pickCover();
    if (bytes != null && mounted) {
      setState(() {
        _cover = bytes;
        _coverChanged = true;
      });
    }
  }

  Future<void> _submit() async {
    final destination = _destination.text.trim();
    final participants = int.tryParse(_participants.text.trim()) ?? 0;
    final budget = _parseRupiah(_budget.text);
    final date = parseIsoDate(_date);
    // Tanggal lama yang sudah lewat tetap boleh selama tidak diubah (sama
    // dengan backend).
    final pastDate = date != null &&
        date.isBefore(dateOnly(DateTime.now())) &&
        _date != widget.existing?.targetDate;
    setState(() {
      _errors
        ..clear()
        ..addAll({
          if (destination.isEmpty) 'destination': 'Destinasi impian wajib diisi.',
          if (date == null)
            'date': 'Rencana tanggal keberangkatan wajib diisi.'
          else if (pastDate)
            'date': 'Tanggal keberangkatan tidak boleh di masa lalu.',
          if (participants < 1 || participants > 100) 'participants': 'Jumlah peserta harus antara 1 dan 100 orang.',
          if (budget <= 0) 'budget': 'Target budget wajib diisi.',
        });
    });
    if (_errors.isNotEmpty || _saving) return;

    final existing = widget.existing;
    final now = DateTime.now();
    final plan = existing?.copyWith(
          destination: destination,
          targetDate: _date,
          targetDateLabel: formatDateLong(date),
          participants: participants,
          targetBudget: budget,
        ) ??
        TripPlan(
          id: 'plan_${now.millisecondsSinceEpoch}',
          destination: destination,
          targetDate: _date,
          targetDateLabel: formatDateLong(date),
          participants: participants,
          targetBudget: budget,
          checklist: TripPlan.defaultChecklist(),
          savingsLogs: const [],
          createdAt: now,
          updatedAt: now,
        );
    setState(() => _saving = true);
    try {
      final saved = await TripPlanStore.instance.upsert(plan);
      if (_coverChanged && _cover != null) await TripPlanStore.instance.setCover(saved.id, _cover!);
      if (mounted) Navigator.pop(context, saved);
    } on ApiException catch (e) {
      if (mounted) showTopToast(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(titleSpacing: 0, title: Text(widget.existing == null ? 'Buat Plan Trip' : 'Ubah Plan Trip')),
      body: DefaultTextStyle.merge(
        style: figmaTextStyle,
        child: ListView(padding: const EdgeInsets.only(bottom: 16), children: [
          SizedBox(
            height: 120,
            child: Stack(fit: StackFit.expand, children: [
              _CoverImage(_cover),
              Positioned(right: 12, bottom: 12, child: _CameraButton(size: 44, onTap: _changeCover)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              LabeledField(
                label: 'Destinasi Impian',
                required: true,
                error: _errors['destination'],
                child: TextField(
                  controller: _destination,
                  textCapitalization: TextCapitalization.words,
                  inputFormatters: [LengthLimitingTextInputFormatter(120)],
                  style: fieldTextStyle,
                  decoration:
                      markError(const InputDecoration(hintText: 'Contoh: Raja Ampat'), _errors['destination']),
                ),
              ),
              const SizedBox(height: 16),
              LabeledField(
                label: 'Rencana Tanggal Keberangkatan',
                required: true,
                error: _errors['date'],
                child: BirthDateField(
                  valueIso: _date,
                  future: true,
                  errorText: _errors['date'],
                  onChanged: (v) => setState(() => _date = v),
                ),
              ),
              const SizedBox(height: 16),
              LabeledField(
                label: 'Jumlah Peserta',
                required: true,
                error: _errors['participants'],
                child: TextField(
                  controller: _participants,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(3)],
                  style: fieldTextStyle,
                  decoration: markError(const InputDecoration(hintText: 'Contoh: 5'), _errors['participants']),
                ),
              ),
              const SizedBox(height: 16),
              LabeledField(
                label: 'Target Budget',
                required: true,
                error: _errors['budget'],
                child: _RupiahField(controller: _budget, error: _errors['budget']),
              ),
              if (_errors['budget'] == null) ...[
                const SizedBox(height: 6),
                const Text('Total untuk semua peserta',
                    style: TextStyle(fontSize: 14, height: 20 / 14, color: AppColors.textMuted)),
              ],
            ]),
          ),
        ]),
      ),
      bottomNavigationBar: BottomActionBar(
        child: ElevatedButton(
          onPressed: _saving ? null : _submit,
          child: Text(widget.existing == null ? 'Lanjut' : 'Simpan'),
        ),
      ),
    );
  }
}

/// Judul bagian 18 SemiBold setinggi 26.
class _Heading extends StatelessWidget {
  final String text;

  const _Heading(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(text,
        style: const TextStyle(fontSize: 18, height: 26 / 18, fontWeight: FontWeight.w600, color: AppColors.textDark));
  }
}

/// Panel biru tua kartu ringkasan dengan gelembung dan ilustrasi di kanan
/// atas (terpotong tepi kartu).
class _DarkPanel extends StatelessWidget {
  final double height;
  final double blobRight;
  final Widget art;
  final Widget child;

  const _DarkPanel({required this.height, required this.blobRight, required this.art, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      color: _darkTeal,
      child: Stack(clipBehavior: Clip.hardEdge, children: [
        Positioned(
          right: blobRight,
          top: -39,
          child: SvgPicture.asset('assets/images/plan_blob.svg', width: 106, height: 112),
        ),
        art,
        Positioned.fill(child: child),
      ]),
    );
  }
}

/// Kartu "Tabungan Terkumpul" (biru tua) dengan baris "Sisa dibutuhkan"
/// setelah ada tabungan.
class _SavingsCard extends StatelessWidget {
  final TripPlan plan;

  const _SavingsCard({required this.plan});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _DarkPanel(
          height: 122,
          blobRight: -27,
          art: Positioned(
            right: 15.5,
            top: 7.32,
            child: Image.asset('assets/images/plan_coins.png', width: 45, height: 59.74),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 13.5, 16, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Text('Tabungan Terkumpul',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _paleTeal)),
              const SizedBox(height: 7.4),
              Padding(
                padding: const EdgeInsets.only(right: 72),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(formatPrice(plan.savedAmount),
                      style: const TextStyle(fontSize: 27.5, fontWeight: FontWeight.w500, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 10),
              _Bar(
                value: plan.targetBudget <= 0 ? 0 : plan.savedAmount / plan.targetBudget,
                background: const Color(0xB3F8FAFC),
                fill: Colors.white,
              ),
              const SizedBox(height: 7.8),
              Row(children: [
                Text('${plan.progressPercent}%',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                const Spacer(),
                Text('dari ${formatPrice(plan.targetBudget)}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.accentSoft)),
              ]),
            ]),
          ),
        ),
        if (plan.savedAmount > 0)
          Container(
            height: 44,
            color: _paleTeal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              const Text('Sisa dibutuhkan',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textMuted)),
              const Spacer(),
              Text(formatPrice(plan.remaining),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textDark)),
            ]),
          ),
      ]),
    );
  }
}

/// Kotak ikon 44 bergaya tombol Figma, lalu destinasi dan tanggal & peserta.
class _PlanHeader extends StatelessWidget {
  final TripPlan plan;

  const _PlanHeader({required this.plan});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      DecoratedBox(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8.25)),
        child: const ButtonSkin(
          filled: false,
          radius: 8.25,
          scale: 1.375,
          child: SizedBox.square(
            dimension: 44,
            child: Center(child: AppIcon('map_pin', color: AppColors.textMedium)),
          ),
        ),
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(plan.destination,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark)),
          const SizedBox(height: 5.6),
          Text(_planMeta(plan), style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
        ]),
      ),
    ]);
  }
}

/// "Detail Plan Trip": sampul, progres tabungan, persiapan, dan rekomendasi
/// paket untuk destinasinya.
class TripPlanDetailScreen extends StatefulWidget {
  final String planId;

  const TripPlanDetailScreen({super.key, required this.planId});

  @override
  State<TripPlanDetailScreen> createState() => _TripPlanDetailScreenState();
}

class _TripPlanDetailScreenState extends State<TripPlanDetailScreen> {
  final _store = TripPlanStore.instance;
  late final Future<List<TripPackage>> _packages = PackageCatalog.load();

  void _push(Widget page) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));

  Future<void> _changeCover(TripPlan plan) async {
    final bytes = await _pickCover();
    if (bytes != null) await _store.setCover(plan.id, bytes);
  }

  void _searchPackages(TripPlan plan) {
    appShellKey.currentState?.openSearch(TripSearchParams(destination: plan.destination));
    navigatorKey.currentState?.popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _store,
      builder: (context, _) {
        final plan = _store.byId(widget.planId);
        if (plan == null) {
          return Scaffold(appBar: AppBar(), body: const Center(child: Text('Plan trip tidak ditemukan.')));
        }
        final items = _visibleChecklist(plan);
        return Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(titleSpacing: 0, title: const Text('Detail Plan Trip')),
          body: DefaultTextStyle.merge(
            style: figmaTextStyle,
            child: ListView(padding: const EdgeInsets.only(top: 16, bottom: 12), children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _PlanHero(plan: plan, onCamera: () => _changeCover(plan)),
              ),
              const SizedBox(height: 17),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(children: [
                  const Expanded(child: _Heading('Progress Tabungan')),
                  InkWell(
                    borderRadius: BorderRadius.circular(4),
                    onTap: () => _push(SavingsProgressScreen(planId: plan.id)),
                    child: const Text('Lihat Detail',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.accent)),
                  ),
                ]),
              ),
              const SizedBox(height: 13),
              Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: _SavingsCard(plan: plan)),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _PrepCard(
                  done: items.where(plan.isCompleted).length,
                  total: items.length,
                  onTap: () => _push(PrepChecklistScreen(planId: plan.id)),
                ),
              ),
              _buildRecommendations(plan),
            ]),
          ),
          bottomNavigationBar: BottomActionBar(
            child: ElevatedButton(onPressed: () => _searchPackages(plan), child: const Text('Buat Sekarang')),
          ),
        );
      },
    );
  }

  Widget _buildRecommendations(TripPlan plan) {
    return FutureBuilder<List<TripPackage>>(
      future: _packages,
      builder: (context, snapshot) {
        final all = snapshot.data ?? const <TripPackage>[];
        final q = plan.destination.toLowerCase();
        final matches = all
            .where((p) =>
                p.destination.toLowerCase().contains(q) ||
                p.name.toLowerCase().contains(q) ||
                (p.destination.isNotEmpty && q.contains(p.destination.toLowerCase())))
            .toList();
        final recs = (matches.isEmpty ? all : matches).take(10).toList();
        if (recs.isEmpty) return const SizedBox.shrink();
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
              const Expanded(
                child: Text('Rekomendasi Untukmu',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.heading)),
              ),
              InkWell(
                borderRadius: BorderRadius.circular(6),
                onTap: () => _searchPackages(plan),
                child: const Text('Lihat Semua',
                    style: TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.accent)),
              ),
            ]),
          ),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            // Jarak 4 di atas & bawah memberi ruang bayangan kartu.
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              for (final pkg in recs) ...[
                if (pkg != recs.first) const SizedBox(width: 16),
                TripCompactCard(
                  pkg: pkg,
                  onTap: () => _push(TripDetailScreen(package: pkg)),
                ),
              ],
            ]),
          ),
        ]);
      },
    );
  }
}

/// Kartu "Persiapan Trip" menuju checklist.
class _PrepCard extends StatelessWidget {
  final int done;
  final int total;
  final VoidCallback onTap;

  const _PrepCard({required this.done, required this.total, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 18, 21.4, 18),
          child: Row(children: [
            Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(color: Color(0x0D03B2B5), shape: BoxShape.circle),
              child: const Center(child: AppIcon('checklist', color: AppColors.accent)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Persiapan Trip',
                    style: TextStyle(fontSize: 16, height: 1.17, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                const SizedBox(height: 4.9),
                Text('$done dari $total persiapan selesai',
                    style: const TextStyle(fontSize: 14, height: 1.17, color: AppColors.textMuted)),
              ]),
            ),
            const AppIcon('chevron_right', color: AppColors.textMuted),
          ]),
        ),
      ),
    );
  }
}

/// Lembar aksi: pegangan lalu baris ikon 20, label, dan chevron. Mengembalikan
/// indeks aksi yang dipilih. Aksi `(ikon, label, merah)`.
Future<int?> _showActions(BuildContext context, List<(String, String, bool)> actions) {
  return showModalBottomSheet<int>(
    context: context,
    backgroundColor: Colors.white,
    barrierColor: const Color(0xB3000000),
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
    builder: (sheetContext) => SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Center(
            child: Container(
              width: 48,
              height: 5,
              decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2.5)),
            ),
          ),
          const SizedBox(height: 27),
          for (var i = 0; i < actions.length; i++)
            InkWell(
              onTap: () => Navigator.pop(sheetContext, i),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                SizedBox(
                  height: 52,
                  child: Row(children: [
                    const SizedBox(width: 16),
                    AppIcon(actions[i].$1, size: 20, color: actions[i].$3 ? AppColors.dangerDark : AppColors.textMuted),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(actions[i].$2,
                          style: TextStyle(
                              fontSize: 16,
                              height: 1.5,
                              letterSpacing: 0,
                              color: actions[i].$3 ? AppColors.errorText : AppColors.textDark)),
                    ),
                    const AppIcon('chevron_right', color: AppColors.textLight),
                    const SizedBox(width: 13.4),
                  ]),
                ),
                const SizedBox(height: 4),
                const Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: Divider(height: 1)),
              ]),
            ),
        ]),
      ),
    ),
  );
}

/// "Progress Tabungan": ringkasan, catatan penyemangat, dan riwayat tabungan.
class SavingsProgressScreen extends StatelessWidget {
  final String planId;

  const SavingsProgressScreen({super.key, required this.planId});

  Future<void> _edit(BuildContext context, TripPlan plan, [TripSavingsLog? log]) async {
    final result = await showDesignSheet<TripSavingsLog>(
      context,
      title: log == null ? 'Tambah Tabungan' : 'Ubah Tabungan',
      showClose: false,
      builder: (_) => _SavingsForm(existing: log),
    );
    if (result == null || !context.mounted) return;
    final logs = log == null
        ? [result, ...plan.savingsLogs]
        : plan.savingsLogs.map((l) => l.id == log.id ? result : l).toList();
    try {
      await _savePlan(context, plan.copyWith(savingsLogs: logs));
      if (context.mounted) {
        showTopToast(context, log == null ? 'Tabungan berhasil ditambahkan' : 'Tabungan berhasil diperbarui');
      }
    } on ApiException {
      // Pesan galat sudah ditampilkan _savePlan.
    }
  }

  Future<void> _actions(BuildContext context, TripPlan plan, TripSavingsLog log) async {
    final action = await _showActions(context, const [('pencil', 'Ubah Tabungan', false), ('trash', 'Hapus Tabungan', true)]);
    if (action == null || !context.mounted) return;
    if (action == 0) return _edit(context, plan, log);
    try {
      await _savePlan(context, plan.copyWith(savingsLogs: plan.savingsLogs.where((l) => l.id != log.id).toList()));
      if (context.mounted) showTopToast(context, 'Tabungan berhasil dihapus');
    } on ApiException {
      // Pesan galat sudah ditampilkan _savePlan.
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: TripPlanStore.instance,
      builder: (context, _) {
        final plan = TripPlanStore.instance.byId(planId);
        if (plan == null) {
          return Scaffold(appBar: AppBar(), body: const Center(child: Text('Plan trip tidak ditemukan.')));
        }
        final note = _savingsNote(plan);
        final logs = [...plan.savingsLogs]..sort((a, b) => b.date.compareTo(a.date));
        return Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(titleSpacing: 0, title: const Text('Progress Tabungan')),
          body: DefaultTextStyle.merge(
            style: figmaTextStyle,
            child: ListView(padding: const EdgeInsets.all(16), children: [
              _PlanHeader(plan: plan),
              const SizedBox(height: 16),
              _SavingsCard(plan: plan),
              if (note != null) ...[const SizedBox(height: 16), NoteBox(text: note)],
              const SizedBox(height: 16),
              const _Heading('Riwayat Tabungan'),
              if (logs.isEmpty) ...[
                const SizedBox(height: 44),
                Center(child: SvgPicture.asset('assets/images/savings_empty.svg', width: 170, height: 140)),
                const SizedBox(height: 37.6),
                const Text('Belum Ada Tabungan',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textStrong)),
                const SizedBox(height: 5.7),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 24),
                  child: Text('Tambahkan tabungan pertamamu untuk mulai memantau.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 12, height: 18 / 12, fontWeight: FontWeight.w500, color: AppColors.textMuted)),
                ),
              ] else ...[
                const SizedBox(height: 14),
                for (final log in logs) ...[
                  if (log != logs.first) const SizedBox(height: 8),
                  _SavingsRow(log: log, onTap: () => _actions(context, plan, log)),
                ],
              ],
            ]),
          ),
          bottomNavigationBar: BottomActionBar(
            child: OutlinedButton(onPressed: () => _edit(context, plan), child: const Text('Tambah Tabungan')),
          ),
        );
      },
    );
  }
}

/// Baris riwayat tabungan: ikon masuk, catatan & tanggal, nominal, dan menu.
class _SavingsRow extends StatelessWidget {
  final TripSavingsLog log;
  final VoidCallback onTap;

  const _SavingsRow({required this.log, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        height: 64,
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
        child: Row(children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: const Center(child: AppIcon('arrow_down_left', size: 16, color: AppColors.textMuted)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(log.note.isEmpty ? 'Tabungan' : log.note,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textDark)),
              const SizedBox(height: 5),
              Text(formatDateShort(parseIsoDate(log.date)),
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ]),
          ),
          Text('+ ${formatPrice(log.amount)}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
          const SizedBox(width: 6),
          const AppIcon('dots', size: 20, color: AppColors.textMuted),
        ]),
      ),
    );
  }
}

/// Isi lembar "Tambah Tabungan": jumlah dan catatan opsional.
class _SavingsForm extends StatefulWidget {
  final TripSavingsLog? existing;

  const _SavingsForm({this.existing});

  @override
  State<_SavingsForm> createState() => _SavingsFormState();
}

class _SavingsFormState extends State<_SavingsForm> {
  late final _amount = TextEditingController(text: _formatRupiahInput(widget.existing?.amount ?? 0));
  late final _note = TextEditingController(text: widget.existing?.note ?? '');
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  void _save() {
    final amount = _parseRupiah(_amount.text);
    if (amount <= 0) {
      setState(() => _error = 'Masukkan jumlah tabungan yang valid.');
      return;
    }
    final existing = widget.existing;
    Navigator.pop(
      context,
      TripSavingsLog(
        id: existing?.id ?? 'log_${DateTime.now().millisecondsSinceEpoch}',
        date: existing?.date ?? toIsoDate(DateTime.now()),
        amount: amount,
        note: _note.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Flexible(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            LabeledField(
              label: 'Jumlah',
              required: true,
              error: _error,
              child: _RupiahField(controller: _amount, error: _error, autofocus: widget.existing == null),
            ),
            const SizedBox(height: 16),
            LabeledField(
              label: 'Catatan (opsional)',
              child: TextField(
                controller: _note,
                textCapitalization: TextCapitalization.sentences,
                inputFormatters: [LengthLimitingTextInputFormatter(120)],
                style: fieldTextStyle,
                decoration: const InputDecoration(hintText: 'Contoh: Tabungan bulanan, Bonus proyek'),
              ),
            ),
          ]),
        ),
      ),
      SheetFormFooter(onSave: _save),
    ]);
  }
}

/// "Persiapan Trip": ringkasan checklist dan daftar item persiapan.
class PrepChecklistScreen extends StatelessWidget {
  final String planId;

  const PrepChecklistScreen({super.key, required this.planId});

  Future<void> _save(BuildContext context, TripPlan plan, List<TripChecklistItem> checklist) async {
    try {
      await _savePlan(context, plan.copyWith(checklist: checklist));
    } on ApiException {
      // Pesan galat sudah ditampilkan _savePlan.
    }
  }

  Future<String?> _itemSheet(BuildContext context, String title, [String initial = '']) {
    return showDesignSheet<String>(
      context,
      title: title,
      showClose: false,
      builder: (_) => _ItemForm(initial: initial),
    );
  }

  Future<void> _add(BuildContext context, TripPlan plan) async {
    final label = await _itemSheet(context, 'Tambah Item');
    if (label == null || !context.mounted) return;
    await _save(context, plan, [
      ...plan.checklist,
      TripChecklistItem(id: 'chk_${DateTime.now().millisecondsSinceEpoch}', label: label),
    ]);
  }

  Future<void> _actions(BuildContext context, TripPlan plan, TripChecklistItem item) async {
    final action = await _showActions(context, const [('pencil', 'Ubah Item', false), ('trash', 'Hapus Item', true)]);
    if (action == null || !context.mounted) return;
    if (action == 1) {
      return _save(context, plan, plan.checklist.where((c) => c.id != item.id).toList());
    }
    final label = await _itemSheet(context, 'Ubah Item', item.label);
    if (label == null || !context.mounted) return;
    await _save(context, plan, plan.checklist.map((c) => c.id == item.id ? c.copyWith(label: label) : c).toList());
  }

  void _toggle(BuildContext context, TripPlan plan, TripChecklistItem item) {
    if (item.isAutomatic) {
      showTopToast(context, 'Tercentang otomatis saat tabunganmu mencapai target ini');
      return;
    }
    _save(context, plan,
        plan.checklist.map((c) => c.id == item.id ? c.copyWith(completed: !c.completed) : c).toList());
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: TripPlanStore.instance,
      builder: (context, _) {
        final plan = TripPlanStore.instance.byId(planId);
        if (plan == null) {
          return Scaffold(appBar: AppBar(), body: const Center(child: Text('Plan trip tidak ditemukan.')));
        }
        final items = _visibleChecklist(plan);
        final done = items.where(plan.isCompleted).length;
        return Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(titleSpacing: 0, title: const Text('Persiapan Trip')),
          body: DefaultTextStyle.merge(
            style: figmaTextStyle,
            child: ListView(padding: const EdgeInsets.all(16), children: [
              _PlanHeader(plan: plan),
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: _DarkPanel(
                  height: 108,
                  blobRight: -17,
                  art: Positioned(
                    right: -3,
                    top: -1,
                    child: Image.asset('assets/images/plan_clipboard.png', width: 70, height: 70),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 17.8, 16, 0),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      const Text('Persiapan Trip',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _paleTeal)),
                      const SizedBox(height: 7.6),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text('$done',
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: Colors.white)),
                          const SizedBox(width: 6),
                          Text('/ ${items.length}',
                              style: const TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.border)),
                        ],
                      ),
                      const SizedBox(height: 14.2),
                      _Bar(
                        value: items.isEmpty ? 0 : done / items.length,
                        background: const Color(0x80F1F8FA),
                        fill: Colors.white,
                      ),
                    ]),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const _Heading('Checklist Persiapan'),
              const SizedBox(height: 14),
              for (final item in items) ...[
                if (item != items.first) const SizedBox(height: 8),
                _ChecklistTile(
                  label: _itemLabel(item),
                  done: plan.isCompleted(item),
                  automatic: item.isAutomatic,
                  onTap: () => _toggle(context, plan, item),
                  onMore: item.isAutomatic ? null : () => _actions(context, plan, item),
                ),
              ],
            ]),
          ),
          bottomNavigationBar: BottomActionBar(
            child: OutlinedButton(onPressed: () => _add(context, plan), child: const Text('Tambah Item')),
          ),
        );
      },
    );
  }
}

/// Item checklist: lingkaran status, label, dan menu (khusus item buatan
/// pengguna). Tonggak otomatis yang belum tercapai berlatar abu.
class _ChecklistTile extends StatelessWidget {
  final String label;
  final bool done;
  final bool automatic;
  final VoidCallback onTap;
  final VoidCallback? onMore;

  const _ChecklistTile({
    required this.label,
    required this.done,
    required this.automatic,
    required this.onTap,
    this.onMore,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: AppColors.borderStrong),
      ),
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 54),
          // Teks diberi jarak 10 sendiri agar tombol menu 40 tidak menambah
          // tinggi item satu baris.
          child: Padding(
            padding: EdgeInsets.fromLTRB(16, 6, onMore == null ? 16 : 6, 6),
            child: Row(children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: done
                      ? AppColors.borderStrong
                      : automatic
                          ? AppColors.border
                          : Colors.white,
                  border: done ? null : Border.all(color: AppColors.borderStrong),
                ),
                child: done ? const AppIcon('check_small', size: 20, color: AppColors.textMedium) : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Text(label,
                      style: const TextStyle(
                          fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: AppColors.textDark)),
                ),
              ),
              if (onMore != null) ...[
                const SizedBox(width: 2),
                Semantics(
                  button: true,
                  label: 'Opsi item',
                  child: InkResponse(
                    onTap: onMore,
                    radius: 20,
                    child: const Padding(
                      padding: EdgeInsets.all(10),
                      child: AppIcon('dots', size: 20, color: AppColors.textMuted),
                    ),
                  ),
                ),
              ],
            ]),
          ),
        ),
      ),
    );
  }
}

/// Isi lembar "Tambah Item" / "Ubah Item".
class _ItemForm extends StatefulWidget {
  final String initial;

  const _ItemForm({required this.initial});

  @override
  State<_ItemForm> createState() => _ItemFormState();
}

class _ItemFormState extends State<_ItemForm> {
  late final _name = TextEditingController(text: widget.initial);
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _save() {
    final label = _name.text.trim();
    if (label.isEmpty) {
      setState(() => _error = 'Nama item wajib diisi.');
      return;
    }
    Navigator.pop(context, label);
  }

  @override
  Widget build(BuildContext context) {
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: LabeledField(
          label: 'Nama Item',
          error: _error,
          child: TextField(
            controller: _name,
            autofocus: widget.initial.isEmpty,
            textCapitalization: TextCapitalization.sentences,
            inputFormatters: [LengthLimitingTextInputFormatter(160)],
            style: fieldTextStyle,
            onSubmitted: (_) => _save(),
            decoration: markError(const InputDecoration(hintText: 'Contoh: Sewa kamera'), _error),
          ),
        ),
      ),
      SheetFormFooter(onSave: _save),
    ]);
  }
}
