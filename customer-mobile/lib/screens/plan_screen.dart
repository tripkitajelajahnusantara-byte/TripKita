import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:customer_mobile/models/trip_plan.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';

class PlanScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;
  final Map<String, dynamic>? arguments;

  const PlanScreen({
    Key? key,
    required this.onNavigate,
    this.arguments,
  }) : super(key: key);

  @override
  State<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends State<PlanScreen> {
  final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  List<TripPlan> _plans = TripPlan.mockPlans;
  TripPlan? _selectedPlan;
  bool _isCreatingNew = false;
  bool _isEditingPlan = false;

  // Form fields for Create/Edit Plan
  final TextEditingController _destinationController = TextEditingController();
  final TextEditingController _budgetController = TextEditingController();
  int _participantsCount = 2;
  String _selectedMonth = '';
  List<Map<String, String>> _availableMonths = [];

  // Custom Checklist Input
  final TextEditingController _customChecklistController = TextEditingController();

  // Savings Modal Fields
  final TextEditingController _savingsAmountController = TextEditingController();
  final TextEditingController _savingsNoteController = TextEditingController();

  // Packages state
  List<TripPackage> _matchingPackages = [];
  bool _loadingPackages = false;

  @override
  void initState() {
    super.initState();
    _generateAvailableMonths();
    if (_plans.isNotEmpty && widget.arguments?['selectedPlanId'] != null) {
      final id = widget.arguments!['selectedPlanId'];
      _selectedPlan = _plans.firstWhere((p) => p.id == id, orElse: () => _plans.first);
    }
  }

  void _generateAvailableMonths() {
    final now = DateTime.now();
    final List<Map<String, String>> months = [];
    final monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    for (int i = 0; i < 24; i++) {
      final d = DateTime(now.year, now.month + i, 1);
      final yyyy = d.year;
      final mm = d.month.toString().padLeft(2, '0');
      final val = '$yyyy-$mm';
      final label = '${monthNames[d.month - 1]} $yyyy';
      months.add({'val': val, 'label': label});
    }
    _availableMonths = months;
    if (_availableMonths.length > 2) {
      _selectedMonth = _availableMonths[2]['val']!;
    } else if (_availableMonths.isNotEmpty) {
      _selectedMonth = _availableMonths[0]['val']!;
    }
  }

  void _loadMatchingPackages(String destination) {
    setState(() {
      _loadingPackages = true;
    });
    ApiService.fetchPublicPackages().then((packages) {
      if (!mounted) return;
      final destLower = destination.toLowerCase();
      final filtered = packages.where((pkg) =>
          pkg.destination.toLowerCase().contains(destLower) ||
          pkg.title.toLowerCase().contains(destLower)
      ).toList();

      setState(() {
        _matchingPackages = filtered.isNotEmpty ? filtered : packages.take(3).toList();
        _loadingPackages = false;
      });
    }).catchError((_) {
      if (!mounted) return;
      final destLower = destination.toLowerCase();
      final filtered = TripPackage.allPackages.where((pkg) =>
          pkg.destination.toLowerCase().contains(destLower) ||
          pkg.title.toLowerCase().contains(destLower)
      ).toList();
      setState(() {
        _matchingPackages = filtered.isNotEmpty ? filtered : TripPackage.allPackages.take(3).toList();
        _loadingPackages = false;
      });
    });
  }

  void _openCreatePlanDialog({TripPlan? planToEdit}) {
    if (planToEdit != null) {
      _destinationController.text = planToEdit.destination;
      _budgetController.text = _currencyFormat.format(planToEdit.targetBudget).replaceAll('Rp ', '');
      _participantsCount = planToEdit.participants;
      _selectedMonth = planToEdit.targetMonth;
      _isEditingPlan = true;
    } else {
      if (_plans.length >= 10) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Batas maksimum 10 Rencana Trip telah tercapai.')),
        );
        return;
      }
      _destinationController.clear();
      _budgetController.clear();
      _participantsCount = 2;
      _isEditingPlan = false;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                top: 24,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _isEditingPlan ? 'Edit Rencana Trip' : 'Buat Rencana Trip Impian Baru',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Destinasi
                    const Text(
                      'DESTINASI IMPIAN *',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _destinationController,
                      decoration: InputDecoration(
                        hintText: 'Contoh: Palu, Labuan Bajo, Raja Ampat...',
                        hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Bulan Keberangkatan
                    const Text(
                      'RENCANA BULAN KEBERANGKATAN *',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      value: _availableMonths.any((m) => m['val'] == _selectedMonth)
                          ? _selectedMonth
                          : (_availableMonths.isNotEmpty ? _availableMonths[0]['val'] : ''),
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      items: _availableMonths.map((m) {
                        return DropdownMenuItem<String>(
                          value: m['val'],
                          child: Text(m['label']!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setModalState(() => _selectedMonth = val);
                        }
                      },
                    ),
                    const SizedBox(height: 16),

                    // Jumlah Peserta & Target Budget
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'PESERTA (ORANG) *',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  IconButton(
                                    onPressed: () {
                                      if (_participantsCount > 1) {
                                        setModalState(() => _participantsCount--);
                                      }
                                    },
                                    icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF0F8B8D)),
                                  ),
                                  Text(
                                    '$_participantsCount',
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                  IconButton(
                                    onPressed: () {
                                      if (_participantsCount < 50) {
                                        setModalState(() => _participantsCount++);
                                      }
                                    },
                                    icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0F8B8D)),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          flex: 3,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'TARGET BUDGET (RP) *',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                              ),
                              const SizedBox(height: 6),
                              TextField(
                                controller: _budgetController,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  hintText: '10.000.000',
                                  hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F8B8D),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          final dest = _destinationController.text.trim();
                          final budgetRaw = _budgetController.text.replaceAll(RegExp(r'\D'), '');
                          final budget = double.tryParse(budgetRaw) ?? 0;

                          if (dest.isEmpty || budget <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Silakan lengkapi destinasi dan target budget valid.')),
                            );
                            return;
                          }

                          final selectedMonthObj = _availableMonths.firstWhere(
                            (m) => m['val'] == _selectedMonth,
                            orElse: () => {'val': _selectedMonth, 'label': _selectedMonth},
                          );

                          setState(() {
                            if (_isEditingPlan && planToEdit != null) {
                              planToEdit.destination = dest;
                              planToEdit.targetMonth = _selectedMonth;
                              planToEdit.targetMonthLabel = selectedMonthObj['label']!;
                              planToEdit.participants = _participantsCount;
                              planToEdit.targetBudget = budget;
                              planToEdit.updatedAt = DateTime.now();
                              planToEdit.updateChecklistMilestones();
                            } else {
                              final newPlan = TripPlan(
                                id: 'plan_${DateTime.now().millisecondsSinceEpoch}',
                                destination: dest,
                                targetMonth: _selectedMonth,
                                targetMonthLabel: selectedMonthObj['label']!,
                                participants: _participantsCount,
                                targetBudget: budget,
                                savedAmount: 0,
                                status: 'Tersimpan',
                                checklist: [
                                  TripChecklistItem(id: '1', label: 'Tentukan Destinasi & Target Budget Liburan', completed: true, isAutomatic: true),
                                  TripChecklistItem(id: '2', label: 'Capai 25% Tabungan Perjalanan', completed: false, isAutomatic: true),
                                  TripChecklistItem(id: '3', label: 'Capai 50% Tabungan Perjalanan', completed: false, isAutomatic: true),
                                  TripChecklistItem(id: '4', label: 'Capai 75% Tabungan Perjalanan', completed: false, isAutomatic: true),
                                  TripChecklistItem(id: '5', label: 'Capai 100% Target Tabungan', completed: false, isAutomatic: true),
                                  TripChecklistItem(id: '6', label: 'Cari & Pesan Paket Open Trip di TemenTrip', completed: false, isAutomatic: false),
                                ],
                                savingsLogs: [],
                                createdAt: DateTime.now(),
                                updatedAt: DateTime.now(),
                              );
                              _plans.insert(0, newPlan);
                              _selectedPlan = newPlan;
                              _loadMatchingPackages(dest);
                            }
                          });

                          Navigator.pop(context);
                        },
                        child: Text(
                          _isEditingPlan ? 'Simpan Perubahan' : 'Simpan Rencana Trip',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _openAddSavingsModal(TripPlan plan) {
    _savingsAmountController.clear();
    _savingsNoteController.text = 'Tabungan bulanan';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            top: 24,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Catat Tabungan Bulan Ini',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'NOMINAL DISISIHKAN (RP) *',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _savingsAmountController,
                keyboardType: TextInputType.number,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: '1.000.000',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'CATATAN / SUMBER (OPSIONAL)',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _savingsNoteController,
                decoration: InputDecoration(
                  hintText: 'Contoh: Gaji bulan September, Bonus...',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F8B8D),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    final raw = _savingsAmountController.text.replaceAll(RegExp(r'\D'), '');
                    final amount = double.tryParse(raw) ?? 0;
                    if (amount <= 0) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Masukkan nominal tabungan yang valid.')),
                      );
                      return;
                    }

                    final now = DateTime.now();
                    final dateStr = DateFormat('dd MMM yyyy', 'id_ID').format(now);

                    setState(() {
                      plan.savedAmount += amount;
                      plan.savingsLogs.insert(0, TripSavingsLog(
                        id: 'log_${now.millisecondsSinceEpoch}',
                        date: dateStr,
                        amount: amount,
                        note: _savingsNoteController.text.trim().isNotEmpty
                            ? _savingsNoteController.text.trim()
                            : 'Tabungan bulanan',
                      ));
                      plan.updateChecklistMilestones();
                      plan.updatedAt = now;
                    });

                    Navigator.pop(context);
                  },
                  child: const Text('Simpan Tabungan', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _deletePlan(TripPlan plan) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Rencana Trip?'),
        content: Text('Apakah Anda yakin ingin menghapus rencana trip ke ${plan.destination}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              setState(() {
                _plans.removeWhere((p) => p.id == plan.id);
                if (_selectedPlan?.id == plan.id) {
                  _selectedPlan = null;
                }
              });
              Navigator.pop(ctx);
            },
            child: const Text('Hapus', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Row(
          children: [
            const Icon(Icons.track_changes, color: Color(0xFF0F8B8D), size: 24),
            const SizedBox(width: 8),
            Text(
              _selectedPlan != null ? 'Detail Rencana Trip' : 'Rencana Trip & Tabungan',
              style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        leading: _selectedPlan != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
                onPressed: () => setState(() => _selectedPlan = null),
              )
            : null,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Banner Header Component
              _buildHeroBanner(),
              const SizedBox(height: 20),

              // 2. View Switcher: List View vs Detail View
              if (_selectedPlan == null)
                _buildPlanListView()
              else
                _buildPlanDetailView(_selectedPlan!),
            ],
          ),
        ),
      ),
      bottomNavigationBar: TripKitaBottomNavigation(
        currentIndex: 3,
        onTap: (index) {
          widget.onNavigate(index);
        },
      ),
    );
  }

  // Header Banner Card
  Widget _buildHeroBanner() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F8B8D), Color(0xFF09686A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F8B8D).withOpacity(0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'LIBURAN IMPIAN TANPA BEBAN',
              style: TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Rencanakan Liburan Seru Bersama Pasangan, Teman, atau Keluarga! 🏝️✨',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Susun target budget dan tabungan bulananmu mulai dari sekarang. Nikmati perjalanan impian tanpa perlu risau masalah keuangan!',
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 12,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  // 1. LIST VIEW OF ALL PLANS (Screenshot 1)
  Widget _buildPlanListView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Daftar Rencana Trip Saya (${_plans.length}/10)',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        if (_plans.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Icon(Icons.explore_outlined, size: 48, color: Colors.grey.shade400),
                const SizedBox(height: 12),
                const Text(
                  'Belum ada Rencana Trip.',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 4),
                Text(
                  'Yuk buat target tabungan trip impianmu sekarang!',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
              ],
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _plans.length,
            itemBuilder: (context, index) {
              final plan = _plans[index];
              return _buildPlanCardItem(plan);
            },
          ),

        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F8B8D),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 2,
            ),
            onPressed: () => _openCreatePlanDialog(),
            icon: const Icon(Icons.add, color: Colors.white),
            label: Text(
              '+ Buat Rencana Baru (${_plans.length}/10)',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }

  // Single Plan Card in Overview List
  Widget _buildPlanCardItem(TripPlan plan) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Badges
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  plan.status,
                  style: const TextStyle(
                    color: Color(0xFF166534),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE6F4F4),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${plan.savedPercentage}% Terkumpul',
                  style: const TextStyle(
                    color: Color(0xFF0F8B8D),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Destination Title
          Row(
            children: [
              const Text('🏝️ ', style: TextStyle(fontSize: 20)),
              Text(
                plan.destination,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Date & Participants info
          Row(
            children: [
              Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey.shade600),
              const SizedBox(width: 4),
              Text(
                plan.targetMonthLabel,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
              ),
              const SizedBox(width: 14),
              Icon(Icons.people_outline, size: 16, color: Colors.grey.shade600),
              const SizedBox(width: 4),
              Text(
                '${plan.participants} Peserta',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Financial Box
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('TERKUMPUL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                        const SizedBox(height: 2),
                        Text(
                          _currencyFormat.format(plan.savedAmount),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('TARGET BUDGET', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                        const SizedBox(height: 2),
                        Text(
                          _currencyFormat.format(plan.targetBudget),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Sisa Dibutuhkan:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    Text(
                      _currencyFormat.format(plan.remainingBudget),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: plan.remainingBudget > 0 ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Linear Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: plan.savedPercentage / 100,
              minHeight: 10,
              backgroundColor: const Color(0xFFE2E8F0),
              valueColor: AlwaysStoppedAnimation<Color>(
                plan.savedPercentage >= 100 ? const Color(0xFF10B981) : const Color(0xFF0F8B8D),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F8B8D),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () {
                    setState(() {
                      _selectedPlan = plan;
                      _loadMatchingPackages(plan.destination);
                    });
                  },
                  child: const Text(
                    'Lihat Detail →',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: IconButton(
                  icon: const Icon(Icons.edit_outlined, size: 20, color: Color(0xFF475569)),
                  onPressed: () => _openCreatePlanDialog(planToEdit: plan),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20, color: Color(0xFFEF4444)),
                  onPressed: () => _deletePlan(plan),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 2. DETAIL VIEW OF A SELECTED PLAN (Screenshot 2)
  Widget _buildPlanDetailView(TripPlan plan) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Navigation Back Button
        InkWell(
          onTap: () => setState(() => _selectedPlan = null),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.arrow_back, size: 16, color: Color(0xFF0F8B8D)),
                SizedBox(width: 6),
                Text(
                  'Kembali ke Daftar Rencana Trip Saya',
                  style: TextStyle(color: Color(0xFF0F8B8D), fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Plan Header Box
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F4F4),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'TARGET LIBURAN',
                          style: TextStyle(color: Color(0xFF0F8B8D), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Status: ${plan.status}',
                          style: const TextStyle(color: Color(0xFF166534), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          plan.destination,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey.shade600),
                            const SizedBox(width: 4),
                            Text(plan.targetMonthLabel, style: TextStyle(fontSize: 12, color: Colors.grey.shade700, fontWeight: FontWeight.w600)),
                            const SizedBox(width: 12),
                            Icon(Icons.people_outline, size: 16, color: Colors.grey.shade600),
                            const SizedBox(width: 4),
                            Text('${plan.participants} Peserta', style: TextStyle(fontSize: 12, color: Colors.grey.shade700, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F8B8D),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    onPressed: () => _openAddSavingsModal(plan),
                    icon: const Icon(Icons.add, size: 18, color: Colors.white),
                    label: const Text(
                      'Catat Tabungan',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Progress Bar Overview Box
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFF1F5F9)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('📈 Progres Tabungan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF334155))),
                        Text(
                          '${plan.savedPercentage}%',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F8B8D)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: plan.savedPercentage / 100,
                        minHeight: 12,
                        backgroundColor: const Color(0xFFE2E8F0),
                        valueColor: AlwaysStoppedAnimation<Color>(
                          plan.savedPercentage >= 100 ? const Color(0xFF10B981) : const Color(0xFF0F8B8D),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                            child: Column(
                              children: [
                                const Text('TERKUMPUL', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                const SizedBox(height: 2),
                                Text(_currencyFormat.format(plan.savedAmount), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                            child: Column(
                              children: [
                                const Text('TARGET TOTAL', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                const SizedBox(height: 2),
                                Text(_currencyFormat.format(plan.targetBudget), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                            child: Column(
                              children: [
                                const Text('SISA DIBUTUHKAN', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                const SizedBox(height: 2),
                                Text(
                                  _currencyFormat.format(plan.remainingBudget),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: plan.remainingBudget > 0 ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Motivational Box (Matches Web Logic)
        _buildMotivationBox(plan),
        const SizedBox(height: 16),

        // Checklist Section
        _buildChecklistSection(plan),
        const SizedBox(height: 16),

        // Savings Log History Section
        _buildSavingsHistorySection(plan),
        const SizedBox(height: 20),

        // Matching Packages Section
        _buildMatchingPackagesSection(plan),
        const SizedBox(height: 24),

        // Bottom Action Bar
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFEF4444)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () => _deletePlan(plan),
                child: const Text('Batalkan Rencana Trip', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F8B8D),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Rencana Trip berhasil disimpan!')),
                  );
                  setState(() => _selectedPlan = null);
                },
                child: const Text('Simpan Rencana Trip', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // Motivation Box Widget
  Widget _buildMotivationBox(TripPlan plan) {
    final is100 = plan.savedPercentage >= 100;
    final isExpired = plan.isTargetMonthReached;

    final bgColor = is100
        ? const Color(0xFFECFDF5)
        : (isExpired ? const Color(0xFFFFF7ED) : const Color(0xFFE6F4F4));
    final borderColor = is100
        ? const Color(0xFFA7F3D0)
        : (isExpired ? const Color(0xFFFED7AA) : const Color(0xFFB2E2E2));
    final titleColor = is100
        ? const Color(0xFF065F46)
        : (isExpired ? const Color(0xFF9A3412) : const Color(0xFF0D5C5E));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor, width: 1.5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            is100 ? '🥳' : (isExpired ? '⏳' : '🌱'),
            style: const TextStyle(fontSize: 28),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  is100
                      ? 'SELAMAT! Target Tabungan 100% Terkumpul!'
                      : (isExpired ? 'Bulan Target Tiba, Tabungan Belum 100%' : 'Langkah Awal Memulai Perjalanan Impian! 🚀'),
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: titleColor),
                ),
                const SizedBox(height: 4),
                Text(
                  is100
                      ? 'Tabungan liburan kamu ke ${plan.destination} sudah terkumpul penuh (${_currencyFormat.format(plan.savedAmount)}). Yuk langsung cari dan pesan paket trip di bawah ini!'
                      : (isExpired
                          ? 'Bulan target (${plan.targetMonthLabel}) sudah tiba namun tabungan baru ${plan.savedPercentage}%. Yuk tambah tabungan atau undurkan target bulan agar trip-mu tetap terwujud!'
                          : 'Setiap perjalanan besar dimulai dari langkah kecil. Rencana trip impianmu ke ${plan.destination} baru saja dimulai. Yuk konsisten sisihkan tabungan bulan ini! ✨'),
                  style: TextStyle(fontSize: 12, color: titleColor.withOpacity(0.9), height: 1.35),
                ),
                if (is100) ...[
                  const SizedBox(height: 10),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    ),
                    onPressed: () => widget.onNavigate(1), // Go to Trip list
                    child: const Text('Pesan Trip Sekarang →', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Checklist Section Widget
  Widget _buildChecklistSection(TripPlan plan) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.auto_awesome_outlined, size: 18, color: Color(0xFF0F8B8D)),
              SizedBox(width: 8),
              Text(
                'Checklist Persiapan Trip',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // List of checklist items
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: plan.checklist.length,
            itemBuilder: (context, index) {
              final item = plan.checklist[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: item.completed ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: item.completed ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Checkbox(
                      value: item.completed,
                      activeColor: const Color(0xFF10B981),
                      onChanged: (val) {
                        setState(() {
                          item.completed = val ?? false;
                        });
                      },
                    ),
                    Expanded(
                      child: Text(
                        item.label,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: item.completed ? FontWeight.bold : FontWeight.w600,
                          color: item.completed ? const Color(0xFF166534) : const Color(0xFF334155),
                          decoration: item.completed ? TextDecoration.lineThrough : TextDecoration.none,
                        ),
                      ),
                    ),
                    if (item.isAutomatic)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0F2FE),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Otomatis', style: TextStyle(fontSize: 9, color: Color(0xFF0369A1), fontWeight: FontWeight.bold)),
                      )
                    else
                      IconButton(
                        icon: const Icon(Icons.delete_outline, size: 16, color: Colors.grey),
                        onPressed: () {
                          setState(() {
                            plan.checklist.removeAt(index);
                          });
                        },
                      ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 10),

          // Add Custom Item Field
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _customChecklistController,
                  decoration: InputDecoration(
                    hintText: 'Tambah item checklist baru...',
                    hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F8B8D),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                onPressed: () {
                  final text = _customChecklistController.text.trim();
                  if (text.isNotEmpty) {
                    setState(() {
                      plan.checklist.add(TripChecklistItem(
                        id: 'chk_${DateTime.now().millisecondsSinceEpoch}',
                        label: text,
                        completed: false,
                        isAutomatic: false,
                      ));
                      _customChecklistController.clear();
                    });
                  }
                },
                child: const Text('Tambah', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Savings History Section Widget
  Widget _buildSavingsHistorySection(TripPlan plan) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.account_balance_wallet_outlined, size: 18, color: Color(0xFF0F8B8D)),
              SizedBox(width: 8),
              Text(
                'Riwayat Catatan Tabungan',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          if (plan.savingsLogs.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Text(
                'Belum ada tabungan yang dicatat.\nKlik tombol "+ Catat Tabungan" di atas.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12.5),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: plan.savingsLogs.length,
              itemBuilder: (context, index) {
                final log = plan.savingsLogs[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(log.date, style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 2),
                          Text(log.note, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                        ],
                      ),
                      Row(
                        children: [
                          Text(
                            '+ ${_currencyFormat.format(log.amount)}',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF10B981)),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 16, color: Colors.grey),
                            onPressed: () {
                              setState(() {
                                plan.savedAmount -= log.amount;
                                if (plan.savedAmount < 0) plan.savedAmount = 0;
                                plan.savingsLogs.removeAt(index);
                                plan.updateChecklistMilestones();
                              });
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  // Matching Packages Recommendation Section
  Widget _buildMatchingPackagesSection(TripPlan plan) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Rekomendasi Paket Open Trip ke ${plan.destination}',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            TextButton(
              onPressed: () => widget.onNavigate(1), // Navigates to Trip screen
              child: const Text('Lihat Semua >', style: TextStyle(color: Color(0xFF0F8B8D), fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 10),

        if (_loadingPackages)
          const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
        else if (_matchingPackages.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: const Text('Belum ada paket trip spesifik untuk lokasi ini.', style: TextStyle(color: Colors.grey, fontSize: 12)),
          )
        else
          SizedBox(
            height: 220,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _matchingPackages.length,
              itemBuilder: (context, index) {
                final pkg = _matchingPackages[index];
                return GestureDetector(
                  onTap: () {
                    widget.onNavigate(5, arguments: {'package': pkg});
                  },
                  child: Container(
                    width: 200,
                    margin: const EdgeInsets.only(right: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 3)),
                      ],
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Stack(
                          children: [
                            Image.network(
                              pkg.imageUrl,
                              height: 100,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(height: 100, color: Colors.teal.shade100),
                            ),
                            Positioned(
                              top: 6,
                              left: 6,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(color: const Color(0xFF0F8B8D), borderRadius: BorderRadius.circular(6)),
                                child: Text(pkg.tripType, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                        Padding(
                          padding: const EdgeInsets.all(10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                pkg.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                pkg.destination,
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.star, size: 14, color: Color(0xFFD97706)),
                                      const SizedBox(width: 2),
                                      Text('${pkg.rating}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                                    ],
                                  ),
                                  Text(
                                    _currencyFormat.format(pkg.price),
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F8B8D)),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
