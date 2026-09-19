import 'package:customer_mobile/models/package.dart';

class TripChecklistItem {
  final String id;
  final String label;
  bool completed;
  final bool isAutomatic;

  TripChecklistItem({
    required this.id,
    required this.label,
    this.completed = false,
    this.isAutomatic = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'completed': completed,
        'isAutomatic': isAutomatic,
      };

  factory TripChecklistItem.fromJson(Map<String, dynamic> json) => TripChecklistItem(
        id: json['id'] ?? '',
        label: json['label'] ?? '',
        completed: json['completed'] ?? false,
        isAutomatic: json['isAutomatic'] ?? false,
      );
}

class TripSavingsLog {
  final String id;
  final String date;
  final double amount;
  final String note;

  TripSavingsLog({
    required this.id,
    required this.date,
    required this.amount,
    required this.note,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'date': date,
        'amount': amount,
        'note': note,
      };

  factory TripSavingsLog.fromJson(Map<String, dynamic> json) => TripSavingsLog(
        id: json['id'] ?? '',
        date: json['date'] ?? '',
        amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
        note: json['note'] ?? '',
      );
}

class TripPlan {
  final String id;
  String destination;
  String targetMonth; // e.g. '2027-03'
  String targetMonthLabel; // e.g. '17 Maret 2027'
  int participants;
  double targetBudget;
  double savedAmount;
  String status; // 'Tersimpan', 'Draft', 'Selesai'
  List<TripChecklistItem> checklist;
  List<TripSavingsLog> savingsLogs;
  DateTime createdAt;
  DateTime updatedAt;

  TripPlan({
    required this.id,
    required this.destination,
    required this.targetMonth,
    required this.targetMonthLabel,
    required this.participants,
    required this.targetBudget,
    required this.savedAmount,
    this.status = 'Tersimpan',
    required this.checklist,
    required this.savingsLogs,
    required this.createdAt,
    required this.updatedAt,
  });

  int get savedPercentage {
    if (targetBudget <= 0) return 0;
    final pct = ((savedAmount / targetBudget) * 100).round();
    return pct > 100 ? 100 : (pct < 0 ? 0 : pct);
  }

  double get remainingBudget {
    final rem = targetBudget - savedAmount;
    return rem < 0 ? 0 : rem;
  }

  bool get isTargetMonthReached {
    final now = DateTime.now();
    final currentMonthIso = '${now.year}-${now.month.toString().padLeft(2, '0')}';
    return targetMonth.compareTo(currentMonthIso) <= 0;
  }

  void updateChecklistMilestones() {
    final pct = savedPercentage;
    for (var item in checklist) {
      if (item.id == '2') {
        item.completed = pct >= 25;
      } else if (item.id == '3') {
        item.completed = pct >= 50;
      } else if (item.id == '4') {
        item.completed = pct >= 75;
      } else if (item.id == '5') {
        item.completed = pct >= 100;
      }
    }
  }

  // Shared mock plans list for mobile prototype persistence
  static List<TripPlan> mockPlans = [
    TripPlan(
      id: 'plan_palu_1',
      destination: 'Palu',
      targetMonth: '2027-03',
      targetMonthLabel: '17 Maret 2027',
      participants: 2,
      targetBudget: 10000000,
      savedAmount: 1000000,
      status: 'Tersimpan',
      checklist: [
        TripChecklistItem(id: '1', label: 'Tentukan Destinasi & Target Budget Liburan', completed: true, isAutomatic: true),
        TripChecklistItem(id: '2', label: 'Capai 25% Tabungan Perjalanan', completed: false, isAutomatic: true),
        TripChecklistItem(id: '3', label: 'Capai 50% Tabungan Perjalanan', completed: false, isAutomatic: true),
        TripChecklistItem(id: '4', label: 'Capai 75% Tabungan Perjalanan', completed: false, isAutomatic: true),
        TripChecklistItem(id: '5', label: 'Capai 100% Target Tabungan', completed: false, isAutomatic: true),
        TripChecklistItem(id: '6', label: 'Cari & Pesan Paket Open Trip di TemenTrip', completed: false, isAutomatic: false),
      ],
      savingsLogs: [
        TripSavingsLog(id: 'log_1', date: '17 Sep 2026', amount: 1000000, note: 'Tabungan bulanan'),
      ],
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
      updatedAt: DateTime.now(),
    ),
  ];
}
