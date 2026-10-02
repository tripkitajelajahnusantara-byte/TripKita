import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/models/trip_plan.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/screens/trip_list_screen.dart';
import 'package:customer_mobile/services/package_catalog.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/services/trip_plan_store.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

/// Daftar rencana perjalanan, padanan `CustomerTripPlannerPage` di web.
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
      await showNoticeDialog(
        context,
        title: 'Batas Rencana Tercapai',
        message:
            'Batas maksimal 10 rencana trip telah tercapai. Hapus rencana lama terlebih dahulu jika ingin membuat rencana baru.',
        isError: true,
      );
      return;
    }
    final plan = await Navigator.of(context).push<TripPlan>(
        MaterialPageRoute(builder: (_) => const TripPlanFormScreen()));
    if (plan != null && mounted) _open(plan);
  }

  void _open(TripPlan plan) {
    Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => TripPlanDetailScreen(planId: plan.id)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rencana Trip')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        onPressed: _create,
        icon: const Icon(Icons.add),
        label: const Text('Rencana Baru'),
      ),
      body: ListenableBuilder(
        listenable: _store,
        builder: (context, _) {
          final plans = _store.plans;
          if (_store.loading) {
            return const Center(
                child: CircularProgressIndicator(color: AppColors.primary));
          }
          if (_store.error != null) {
            return EmptyState(
              icon: Icons.cloud_off_outlined,
              title: 'Rencana Trip Belum Dapat Dimuat',
              message: _store.error!,
              actions: [
                ElevatedButton(
                    onPressed: _store.load, child: const Text('Coba Lagi'))
              ],
            );
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            children: [
              const InfoBanner(
                icon: Icons.lightbulb_outline,
                color: AppColors.primaryDark,
                background: AppColors.accentSoft,
                border: AppColors.accentBorder,
                textColor: AppColors.primaryDark,
                message:
                    'Tentukan destinasi impian dan target budget, lalu catat tabunganmu sedikit demi sedikit sampai siap berangkat.',
              ),
              const SizedBox(height: 16),
              if (plans.isEmpty)
                EmptyState(
                  icon: Icons.savings_outlined,
                  title: 'Belum Ada Rencana Trip',
                  message:
                      'Mulai rencanakan liburan impianmu dan pantau progres tabungannya di sini.',
                  actions: [
                    ElevatedButton(
                        onPressed: _create,
                        child: const Text('Buat Rencana Pertama'))
                  ],
                )
              else
                for (final plan in plans) ...[
                  _PlanCard(plan: plan, onTap: () => _open(plan)),
                  const SizedBox(height: 12),
                ],
            ],
          );
        },
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final TripPlan plan;
  final VoidCallback onTap;

  const _PlanCard({required this.plan, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final pct = plan.progressPercent;
    return SectionCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              const Icon(Icons.flag_outlined,
                  color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(plan.destination,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textDark)),
              ),
              Text('$pct%',
                  style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary)),
            ]),
            const SizedBox(height: 6),
            Text(
                '${formatIsoLong(plan.targetDate)} • ${plan.participants} orang',
                style: const TextStyle(
                    fontSize: 12.5, color: AppColors.textMuted)),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: pct / 100,
                minHeight: 8,
                backgroundColor: AppColors.divider,
                color: pct >= 100 ? AppColors.success : AppColors.primary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
                '${formatIDR(plan.savedAmount)} dari ${formatIDR(plan.targetBudget)}',
                style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textMedium,
                    fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
    );
  }
}

/// Input nominal rupiah dengan pemisah ribuan otomatis.
class _RupiahInputFormatter extends TextInputFormatter {
  static final _format = NumberFormat.decimalPattern('id_ID');

  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return const TextEditingValue();
    final text = _format.format(
        int.parse(digits.length > 13 ? digits.substring(0, 13) : digits));
    return TextEditingValue(
        text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}

int _parseRupiah(String text) =>
    int.tryParse(text.replaceAll(RegExp(r'\D'), '')) ?? 0;
String _formatRupiahInput(int value) =>
    value <= 0 ? '' : NumberFormat.decimalPattern('id_ID').format(value);

/// Form membuat atau mengubah rencana trip.
class TripPlanFormScreen extends StatefulWidget {
  final TripPlan? existing;

  const TripPlanFormScreen({super.key, this.existing});

  @override
  State<TripPlanFormScreen> createState() => _TripPlanFormScreenState();
}

class _TripPlanFormScreenState extends State<TripPlanFormScreen> {
  late final _destination =
      TextEditingController(text: widget.existing?.destination ?? '');
  late final _budget = TextEditingController(
      text: _formatRupiahInput(widget.existing?.targetBudget ?? 0));
  late DateTime _date = parseIsoDate(widget.existing?.targetDate ?? '') ??
      dateOnly(DateTime.now()).add(const Duration(days: 30));
  late int _participants = widget.existing?.participants ?? 2;
  String? _destinationError;
  String? _budgetError;

  @override
  void dispose() {
    _destination.dispose();
    _budget.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final today = dateOnly(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: _date.isBefore(today) ? today : _date,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365 * 5)),
      helpText: 'Target tanggal berangkat',
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final destination = _destination.text.trim();
    final budget = _parseRupiah(_budget.text);
    setState(() {
      _destinationError =
          destination.isEmpty ? 'Silakan isi destinasi impian Anda.' : null;
      _budgetError =
          budget <= 0 ? 'Silakan masukkan target budget yang valid.' : null;
    });
    if (_destinationError != null || _budgetError != null) return;

    final iso = toIsoDate(_date);
    final existing = widget.existing;
    final now = DateTime.now();
    final plan = existing != null
        ? existing.copyWith(
            destination: destination,
            targetDate: iso,
            targetDateLabel: formatDateLong(_date),
            participants: _participants,
            targetBudget: budget,
          )
        : TripPlan(
            id: 'plan_${now.millisecondsSinceEpoch}',
            destination: destination,
            targetDate: iso,
            targetDateLabel: formatDateLong(_date),
            participants: _participants,
            targetBudget: budget,
            checklist: TripPlan.defaultChecklist(),
            savingsLogs: const [],
            createdAt: now,
            updatedAt: now,
          );
    try {
      final saved = await TripPlanStore.instance.upsert(plan);
      if (mounted) Navigator.pop(context, saved);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: Text(widget.existing == null
              ? 'Rencana Trip Baru'
              : 'Ubah Rencana Trip')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const FieldLabel('Destinasi Impian', required: true),
                  TextField(
                    controller: _destination,
                    textCapitalization: TextCapitalization.words,
                    decoration: InputDecoration(
                      hintText: 'Contoh: Bali, Labuan Bajo, Bromo',
                      prefixIcon: const Icon(Icons.location_on_outlined,
                          size: 18, color: AppColors.textLight),
                      errorText: _destinationError,
                    ),
                  ),
                  const SizedBox(height: 14),
                  const FieldLabel('Target Tanggal Berangkat', required: true),
                  InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: _pickDate,
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.calendar_today_outlined,
                            size: 18, color: AppColors.textLight),
                      ),
                      child: Text(formatDateLong(_date),
                          style: const TextStyle(fontSize: 14)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const FieldLabel('Jumlah Peserta', required: true),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.borderStrong),
                    ),
                    child: Row(children: [
                      const Icon(Icons.groups_outlined,
                          size: 18, color: AppColors.textLight),
                      const SizedBox(width: 12),
                      Expanded(
                          child: Text('$_participants Orang',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700))),
                      IconButton(
                        onPressed: _participants > 1
                            ? () => setState(() => _participants--)
                            : null,
                        icon: const Icon(Icons.remove_circle_outline),
                      ),
                      IconButton(
                        onPressed: _participants < 100
                            ? () => setState(() => _participants++)
                            : null,
                        icon: const Icon(Icons.add_circle_outline),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 14),
                  const FieldLabel('Target Budget', required: true),
                  TextField(
                    controller: _budget,
                    keyboardType: TextInputType.number,
                    inputFormatters: [_RupiahInputFormatter()],
                    decoration: InputDecoration(
                      hintText: 'Contoh: 5.000.000',
                      prefixText: 'Rp ',
                      errorText: _budgetError,
                    ),
                  ),
                ]),
          ),
          const SizedBox(height: 20),
          PrimaryButton(
            label: widget.existing == null
                ? 'Buat Rencana Trip'
                : 'Simpan Perubahan',
            color: AppColors.primary,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}

class _Motivation {
  final String icon;
  final String title;
  final String text;
  final Color background;
  final Color border;
  final Color titleColor;
  final Color textColor;

  const _Motivation(this.icon, this.title, this.text, this.background,
      this.border, this.titleColor, this.textColor);
}

/// Pesan motivasi sesuai progres tabungan, sama dengan web.
_Motivation _motivationFor(int pct, bool dateReached, String dest) {
  if (dateReached && pct < 100) {
    return _Motivation(
        '🗓️',
        'Waktu Keberangkatan Tiba, Tapi Jangan Patah Semangat! 💪',
        'Target tabungan liburan ke $dest belum 100% terkumpul. Usahamu sudah luar biasa! Yuk sesuaikan ulang tanggal keberangkatanmu dan coba lagi! ✨',
        const Color(0xFFFFFBE6),
        const Color(0xFFFFE58F),
        const Color(0xFFD48806),
        const Color(0xFF784C00));
  }
  if (pct >= 100) {
    return _Motivation(
        '🎉',
        'Hore! Target Tabunganmu 100% Tercapai! 🎉',
        'Selamat! Tabungan untuk liburan impian ke $dest sudah terkumpul 100%. Yuk langsung cari dan pesan paket trip impianmu! 🚀',
        AppColors.successBg,
        const Color(0xFF86EFAC),
        const Color(0xFF15803D),
        const Color(0xFF166534));
  }
  if (pct >= 75) {
    return _Motivation(
        '💪',
        'Hampir Sampai! 75%+ Tabungan Terkumpul! 💪',
        'Ayo semangat! Tinggal sedikit lagi tabunganmu terkumpul 100% untuk liburan impian ke $dest! ✨',
        const Color(0xFFECFDF5),
        const Color(0xFFA7F3D0),
        const Color(0xFF047857),
        const Color(0xFF065F46));
  }
  if (pct >= 25) {
    return _Motivation(
        '🔥',
        'Awal yang Bagus! 25% Tabungan Sudah Terkumpul! 🔥',
        'Kerja bagus! Tabungan liburan ke $dest sudah mulai terkumpul. Tetap konsisten menyisihkan tabungan tiap bulan ya! ✨',
        AppColors.accentLight,
        const Color(0xFFBAE6FD),
        AppColors.primary,
        AppColors.primaryDark);
  }
  return _Motivation(
      '🌱',
      'Langkah Awal Memulai Perjalanan Impian! 🚀',
      'Setiap perjalanan besar dimulai dari langkah kecil. Rencana trip impianmu ke $dest baru saja dimulai. Yuk konsisten sisihkan tabungan! ✨',
      AppColors.accentSoft,
      AppColors.accentBorder,
      AppColors.primary,
      AppColors.primaryDark);
}

/// Detail satu rencana: progres, catatan tabungan, checklist, dan paket yang
/// cocok dengan destinasinya.
class TripPlanDetailScreen extends StatefulWidget {
  final String planId;

  const TripPlanDetailScreen({super.key, required this.planId});

  @override
  State<TripPlanDetailScreen> createState() => _TripPlanDetailScreenState();
}

class _TripPlanDetailScreenState extends State<TripPlanDetailScreen> {
  final _store = TripPlanStore.instance;
  final _newItem = TextEditingController();
  late final Future<List<TripPackage>> _packages = PackageCatalog.load();

  @override
  void dispose() {
    _newItem.dispose();
    super.dispose();
  }

  Future<void> _save(TripPlan plan) async {
    try {
      await _store.upsert(plan);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, isError: true);
    }
  }

  Future<void> _editPlan(TripPlan plan) async {
    await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => TripPlanFormScreen(existing: plan)));
  }

  Future<void> _deletePlan(TripPlan plan) async {
    final ok = await showConfirmDialog(
      context,
      icon: Icons.delete_outline,
      iconColor: AppColors.dangerDark,
      iconBackground: AppColors.dangerBg,
      title: 'Hapus Rencana Trip?',
      message: Text(
          'Rencana trip ke "${plan.destination}" beserta seluruh catatan tabungannya akan dihapus.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textMuted, height: 1.5)),
      cancelLabel: 'Batal',
      confirmLabel: 'Ya, Hapus',
      confirmColor: AppColors.dangerDark,
    );
    if (!ok) return;
    try {
      await _store.remove(plan.id);
      if (mounted) Navigator.pop(context);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, isError: true);
    }
  }

  Future<void> _editSavings(TripPlan plan, [TripSavingsLog? log]) async {
    final result = await showModalBottomSheet<TripSavingsLog>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _SavingsSheet(existing: log),
    );
    if (result == null) return;
    final logs = log == null
        ? [result, ...plan.savingsLogs]
        : plan.savingsLogs.map((l) => l.id == log.id ? result : l).toList();
    await _save(plan.copyWith(savingsLogs: logs));
  }

  Future<void> _deleteSavings(TripPlan plan, TripSavingsLog log) async {
    final ok = await showConfirmDialog(
      context,
      icon: Icons.delete_outline,
      iconColor: AppColors.dangerDark,
      iconBackground: AppColors.dangerBg,
      title: 'Hapus Catatan Tabungan?',
      message: Text(
          'Catatan ${formatIDR(log.amount)} akan dihapus dari rencana ini.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textMuted)),
      cancelLabel: 'Batal',
      confirmLabel: 'Hapus',
      confirmColor: AppColors.dangerDark,
    );
    if (ok)
      await _save(plan.copyWith(
          savingsLogs: plan.savingsLogs.where((l) => l.id != log.id).toList()));
  }

  Future<void> _toggleItem(TripPlan plan, TripChecklistItem item) async {
    if (item.isAutomatic) {
      await showNoticeDialog(
        context,
        title: 'Item Otomatis',
        message: item.id == '1'
            ? 'Item ini otomatis tercentang saat rencana trip dibuat.'
            : 'Item "${item.label}" otomatis tercentang oleh sistem ketika total tabungan mencapai target tersebut.',
      );
      return;
    }
    await _save(plan.copyWith(
      checklist: plan.checklist
          .map((c) => c.id == item.id ? c.copyWith(completed: !c.completed) : c)
          .toList(),
    ));
  }

  Future<void> _addItem(TripPlan plan) async {
    final label = _newItem.text.trim();
    if (label.isEmpty) return;
    _newItem.clear();
    FocusScope.of(context).unfocus();
    await _save(plan.copyWith(checklist: [
      ...plan.checklist,
      TripChecklistItem(
          id: 'chk_${DateTime.now().millisecondsSinceEpoch}', label: label),
    ]));
  }

  Future<void> _renameItem(TripPlan plan, TripChecklistItem item) async {
    final controller = TextEditingController(text: item.label);
    final label = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ubah Item Checklist'),
        content: TextField(controller: controller, autofocus: true),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Batal')),
          TextButton(
              onPressed: () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Simpan')),
        ],
      ),
    );
    controller.dispose();
    if (label == null || label.isEmpty) return;
    await _save(plan.copyWith(
      checklist: plan.checklist
          .map((c) => c.id == item.id ? c.copyWith(label: label) : c)
          .toList(),
    ));
  }

  Future<void> _deleteItem(TripPlan plan, TripChecklistItem item) async {
    await _save(plan.copyWith(
        checklist: plan.checklist.where((c) => c.id != item.id).toList()));
  }

  void _searchPackages(TripPlan plan) {
    appShellKey.currentState
        ?.openSearch(TripSearchParams(destination: plan.destination));
    navigatorKey.currentState?.popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _store,
      builder: (context, _) {
        final plan = _store.byId(widget.planId);
        if (plan == null) {
          return Scaffold(
              appBar: AppBar(),
              body: const Center(child: Text('Rencana trip tidak ditemukan.')));
        }
        return Scaffold(
          appBar: AppBar(
            title: const Text('Detail Rencana Trip'),
            actions: [
              IconButton(
                  tooltip: 'Ubah',
                  onPressed: () => _editPlan(plan),
                  icon: const Icon(Icons.edit_outlined)),
              IconButton(
                tooltip: 'Hapus',
                onPressed: () => _deletePlan(plan),
                icon: const Icon(Icons.delete_outline, color: AppColors.danger),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              _buildHeader(plan),
              const SizedBox(height: 16),
              _buildProgress(plan),
              const SizedBox(height: 16),
              _buildSavings(plan),
              const SizedBox(height: 16),
              _buildChecklist(plan),
              const SizedBox(height: 16),
              _buildPackages(plan),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader(TripPlan plan) {
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(plan.destination,
            style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppColors.textDark)),
        const SizedBox(height: 8),
        Wrap(spacing: 16, runSpacing: 6, children: [
          Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.calendar_today_outlined,
                size: 15, color: AppColors.primary),
            const SizedBox(width: 5),
            Text(formatIsoLong(plan.targetDate),
                style:
                    const TextStyle(fontSize: 13, color: AppColors.textMedium)),
          ]),
          Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.groups_outlined,
                size: 16, color: AppColors.primary),
            const SizedBox(width: 5),
            Text('${plan.participants} orang',
                style:
                    const TextStyle(fontSize: 13, color: AppColors.textMedium)),
          ]),
        ]),
      ]),
    );
  }

  Widget _buildProgress(TripPlan plan) {
    final pct = plan.progressPercent;
    final target = parseIsoDate(plan.targetDate);
    final reached = target != null && !target.isAfter(dateOnly(DateTime.now()));
    final m = _motivationFor(pct, reached, plan.destination);
    Widget stat(String label, int value, Color color) => Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 11.5, color: AppColors.textMuted)),
            const SizedBox(height: 2),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(formatIDR(value),
                  style: TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w800, color: color)),
            ),
          ]),
        );

    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Expanded(
            child: Text('📈 Progres Tabungan',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ),
          Text('$pct%',
              style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary)),
        ]),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: pct / 100,
            minHeight: 10,
            backgroundColor: AppColors.divider,
            color: pct >= 100 ? AppColors.success : AppColors.primary,
          ),
        ),
        const SizedBox(height: 14),
        Row(children: [
          stat('Terkumpul', plan.savedAmount, AppColors.success),
          stat('Target Total', plan.targetBudget, AppColors.textDark),
          stat('Sisa Dibutuhkan', plan.remaining, AppColors.warningDark),
        ]),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: m.background,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: m.border),
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(m.icon, style: const TextStyle(fontSize: 22)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m.title,
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: m.titleColor)),
                    const SizedBox(height: 4),
                    Text(m.text,
                        style: TextStyle(
                            fontSize: 12.5, color: m.textColor, height: 1.5)),
                  ]),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _buildSavings(TripPlan plan) {
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Expanded(
            child: Text('💰 Catatan Tabungan',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ),
          TextButton.icon(
            onPressed: () => _editSavings(plan),
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Tambah'),
          ),
        ]),
        const SizedBox(height: 6),
        if (plan.savingsLogs.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Text(
                'Belum ada catatan tabungan. Tambahkan setiap kali kamu menyisihkan uang untuk trip ini.',
                style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
          ),
        for (final log in plan.savingsLogs)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const CircleAvatar(
              backgroundColor: AppColors.successBg,
              child: Icon(Icons.savings_outlined,
                  color: AppColors.success, size: 20),
            ),
            title: Text(formatIDR(log.amount),
                style: const TextStyle(fontWeight: FontWeight.w800)),
            subtitle: Text(
                '${log.date}${log.note.isNotEmpty ? ' • ${log.note}' : ''}',
                style: const TextStyle(fontSize: 12)),
            trailing: PopupMenuButton<String>(
              onSelected: (v) => v == 'edit'
                  ? _editSavings(plan, log)
                  : _deleteSavings(plan, log),
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'edit', child: Text('Ubah')),
                PopupMenuItem(value: 'delete', child: Text('Hapus')),
              ],
            ),
          ),
      ]),
    );
  }

  Widget _buildChecklist(TripPlan plan) {
    final done = plan.checklist.where(plan.isCompleted).length;
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Expanded(
            child: Text('✅ Checklist Persiapan',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ),
          Text('$done/${plan.checklist.length}',
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMuted)),
        ]),
        const SizedBox(height: 6),
        for (final item in plan.checklist)
          ListTile(
            contentPadding: EdgeInsets.zero,
            dense: true,
            onTap: () => _toggleItem(plan, item),
            leading: Icon(
              plan.isCompleted(item)
                  ? Icons.check_circle
                  : Icons.radio_button_unchecked,
              color: plan.isCompleted(item)
                  ? AppColors.success
                  : AppColors.borderStrong,
            ),
            title: Text(item.label,
                style: TextStyle(
                  fontSize: 13.5,
                  color: plan.isCompleted(item)
                      ? AppColors.textMuted
                      : AppColors.textDark,
                  decoration: plan.isCompleted(item)
                      ? TextDecoration.lineThrough
                      : null,
                )),
            subtitle: item.isAutomatic
                ? const Text('Otomatis', style: TextStyle(fontSize: 11))
                : null,
            trailing: item.isAutomatic
                ? null
                : PopupMenuButton<String>(
                    onSelected: (v) => v == 'edit'
                        ? _renameItem(plan, item)
                        : _deleteItem(plan, item),
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'edit', child: Text('Ubah')),
                      PopupMenuItem(value: 'delete', child: Text('Hapus')),
                    ],
                  ),
          ),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: TextField(
              controller: _newItem,
              onSubmitted: (_) => _addItem(plan),
              decoration: const InputDecoration(
                  hintText: 'Tambah item, mis. Sewa kamera'),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            style: IconButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => _addItem(plan),
            icon: const Icon(Icons.add),
          ),
        ]),
      ]),
    );
  }

  Widget _buildPackages(TripPlan plan) {
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('🧭 Paket yang Cocok',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text('Paket aktif dengan destinasi "${plan.destination}".',
            style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted)),
        const SizedBox(height: 12),
        FutureBuilder<List<TripPackage>>(
          future: _packages,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Padding(
                padding: EdgeInsets.all(16),
                child: Center(
                    child: CircularProgressIndicator(color: AppColors.accent)),
              );
            }
            final q = plan.destination.toLowerCase();
            final matches = (snapshot.data ?? const <TripPackage>[])
                .where((p) =>
                    p.destination.toLowerCase().contains(q) ||
                    p.name.toLowerCase().contains(q) ||
                    (p.destination.isNotEmpty &&
                        q.contains(p.destination.toLowerCase())))
                .take(4)
                .toList();
            if (matches.isEmpty) {
              return Text(
                snapshot.hasError
                    ? 'Paket belum dapat dimuat. Periksa koneksi Anda.'
                    : 'Belum ada paket yang cocok. Coba cari paket lain di TemenTrip.',
                style:
                    const TextStyle(fontSize: 13, color: AppColors.textMuted),
              );
            }
            return LayoutBuilder(builder: (context, constraints) {
              final width = (constraints.maxWidth - 12) / 2;
              return Wrap(spacing: 12, runSpacing: 12, children: [
                for (final pkg in matches)
                  SizedBox(
                    width: width,
                    child: TripGridCard(
                      pkg: pkg,
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => TripDetailScreen(package: pkg))),
                    ),
                  ),
              ]);
            });
          },
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => _searchPackages(plan),
          icon: const Icon(Icons.search, size: 18),
          label: const Text('Cari Paket di TemenTrip'),
        ),
      ]),
    );
  }
}

class _SavingsSheet extends StatefulWidget {
  final TripSavingsLog? existing;

  const _SavingsSheet({this.existing});

  @override
  State<_SavingsSheet> createState() => _SavingsSheetState();
}

class _SavingsSheetState extends State<_SavingsSheet> {
  late final _amount = TextEditingController(
      text: _formatRupiahInput(widget.existing?.amount ?? 0));
  late final _note = TextEditingController(text: widget.existing?.note ?? '');
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  void _submit() {
    final amount = _parseRupiah(_amount.text);
    if (amount <= 0) {
      setState(() => _error = 'Masukkan nominal tabungan yang valid.');
      return;
    }
    final existing = widget.existing;
    Navigator.pop(
      context,
      TripSavingsLog(
        id: existing?.id ?? 'log_${DateTime.now().millisecondsSinceEpoch}',
        date: existing?.date ?? toIsoDate(DateTime.now()),
        amount: amount,
        note:
            _note.text.trim().isEmpty ? 'Tabungan bulanan' : _note.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                  widget.existing == null ? 'Tambah Tabungan' : 'Ubah Tabungan',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              const FieldLabel('Nominal', required: true),
              TextField(
                controller: _amount,
                autofocus: true,
                keyboardType: TextInputType.number,
                inputFormatters: [_RupiahInputFormatter()],
                decoration: InputDecoration(
                    prefixText: 'Rp ', hintText: '500.000', errorText: _error),
              ),
              const SizedBox(height: 14),
              const FieldLabel('Catatan', hint: '(opsional)'),
              TextField(
                  controller: _note,
                  decoration:
                      const InputDecoration(hintText: 'Tabungan bulanan')),
              const SizedBox(height: 20),
              PrimaryButton(
                  label: 'Simpan',
                  color: AppColors.primary,
                  onPressed: _submit),
            ]),
      ),
    );
  }
}
