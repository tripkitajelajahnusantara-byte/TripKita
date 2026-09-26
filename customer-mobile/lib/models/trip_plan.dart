/// Rencana perjalanan & tabungan, format sama dengan `TripPlan` di
/// `provider-web/src/types/index.ts` (fitur "Rencana Trip").
class TripChecklistItem {
  final String id;
  final String label;
  final bool completed;

  const TripChecklistItem({required this.id, required this.label, this.completed = false});

  /// Item 1–5 adalah tonggak otomatis (destinasi & 25/50/75/100% tabungan)
  /// yang tidak dapat diubah atau dihapus pengguna, sama seperti web.
  bool get isAutomatic => const {'1', '2', '3', '4', '5'}.contains(id);

  TripChecklistItem copyWith({String? label, bool? completed}) =>
      TripChecklistItem(id: id, label: label ?? this.label, completed: completed ?? this.completed);

  factory TripChecklistItem.fromJson(Map<String, dynamic> json) => TripChecklistItem(
        id: '${json['id']}',
        label: json['label'] as String? ?? '',
        completed: json['completed'] == true,
      );

  Map<String, dynamic> toJson() => {'id': id, 'label': label, 'completed': completed};
}

class TripSavingsLog {
  final String id;
  final String date;
  final int amount;
  final String note;

  const TripSavingsLog({required this.id, required this.date, required this.amount, this.note = ''});

  factory TripSavingsLog.fromJson(Map<String, dynamic> json) => TripSavingsLog(
        id: '${json['id']}',
        date: json['date'] as String? ?? '',
        amount: (json['amount'] as num?)?.toInt() ?? 0,
        note: json['note'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {'id': id, 'date': date, 'amount': amount, 'note': note};
}

class TripPlan {
  final String id;
  final String destination;

  /// Tanggal target berangkat, YYYY-MM-DD.
  final String targetDate;
  final String targetDateLabel;
  final int participants;
  final int targetBudget;
  final List<TripChecklistItem> checklist;
  final List<TripSavingsLog> savingsLogs;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TripPlan({
    required this.id,
    required this.destination,
    required this.targetDate,
    required this.targetDateLabel,
    required this.participants,
    required this.targetBudget,
    required this.checklist,
    required this.savingsLogs,
    required this.createdAt,
    required this.updatedAt,
  });

  static List<TripChecklistItem> defaultChecklist() => const [
        TripChecklistItem(id: '1', label: 'Tentukan Destinasi & Target Budget Liburan', completed: true),
        TripChecklistItem(id: '2', label: 'Capai 25% Tabungan Perjalanan'),
        TripChecklistItem(id: '3', label: 'Capai 50% Tabungan Perjalanan'),
        TripChecklistItem(id: '4', label: 'Capai 75% Tabungan Perjalanan'),
        TripChecklistItem(id: '5', label: 'Capai 100% Target Tabungan'),
        TripChecklistItem(id: '6', label: 'Cari & Pesan Paket Open Trip di TemenTrip'),
        TripChecklistItem(id: '7', label: 'Siapkan Barang Bawaan & Pakaian Liburan'),
        TripChecklistItem(id: '8', label: 'Siap Berangkat & Nikmati Liburan! 🥳'),
      ];

  int get savedAmount => savingsLogs.fold(0, (sum, log) => sum + log.amount);
  int get remaining => targetBudget - savedAmount < 0 ? 0 : targetBudget - savedAmount;
  int get progressPercent => targetBudget <= 0 ? 0 : ((savedAmount / targetBudget) * 100).round().clamp(0, 100);

  /// Status tonggak otomatis dihitung dari tabungan, bukan dari centang.
  bool isCompleted(TripChecklistItem item) {
    switch (item.id) {
      case '1':
        return true;
      case '2':
        return savedAmount >= targetBudget * 0.25;
      case '3':
        return savedAmount >= targetBudget * 0.5;
      case '4':
        return savedAmount >= targetBudget * 0.75;
      case '5':
        return savedAmount >= targetBudget;
      default:
        return item.completed;
    }
  }

  TripPlan copyWith({
    String? destination,
    String? targetDate,
    String? targetDateLabel,
    int? participants,
    int? targetBudget,
    List<TripChecklistItem>? checklist,
    List<TripSavingsLog>? savingsLogs,
  }) =>
      TripPlan(
        id: id,
        destination: destination ?? this.destination,
        targetDate: targetDate ?? this.targetDate,
        targetDateLabel: targetDateLabel ?? this.targetDateLabel,
        participants: participants ?? this.participants,
        targetBudget: targetBudget ?? this.targetBudget,
        checklist: checklist ?? this.checklist,
        savingsLogs: savingsLogs ?? this.savingsLogs,
        createdAt: createdAt,
        updatedAt: DateTime.now(),
      );

  factory TripPlan.fromJson(Map<String, dynamic> json) {
    List<T> list<T>(Object? raw, T Function(Map<String, dynamic>) parse) =>
        raw is List ? raw.whereType<Map<String, dynamic>>().map(parse).toList() : <T>[];
    DateTime date(Object? raw) => raw is String ? DateTime.tryParse(raw) ?? DateTime.now() : DateTime.now();
    return TripPlan(
      id: '${json['id']}',
      destination: json['destination'] as String? ?? '',
      targetDate: json['targetMonth'] as String? ?? '',
      targetDateLabel: json['targetMonthLabel'] as String? ?? '',
      participants: (json['participants'] as num?)?.toInt() ?? 1,
      targetBudget: (json['targetBudget'] as num?)?.toInt() ?? 0,
      checklist: list(json['checklist'], TripChecklistItem.fromJson),
      savingsLogs: list(json['savingsLogs'], TripSavingsLog.fromJson),
      createdAt: date(json['createdAt']),
      updatedAt: date(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'destination': destination,
        'targetMonth': targetDate,
        'targetMonthLabel': targetDateLabel,
        'participants': participants,
        'targetBudget': targetBudget,
        'savedAmount': savedAmount,
        'checklist': checklist.map((c) => c.toJson()).toList(),
        'savingsLogs': savingsLogs.map((l) => l.toJson()).toList(),
        'status': 'SAVED',
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}
