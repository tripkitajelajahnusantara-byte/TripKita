import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:customer_mobile/models/trip_plan.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/services/api_service.dart';

/// Sumber data rencana trip bersama untuk web dan mobile. SharedPreferences
/// hanya menjadi cache/migrasi data versi lama; backend adalah sumber utama.
class TripPlanStore extends ChangeNotifier {
  TripPlanStore._();
  static final TripPlanStore instance = TripPlanStore._();

  static const maxPlans = 10;

  List<TripPlan> _plans = [];
  bool _loading = false;
  String? _error;

  List<TripPlan> get plans => List.unmodifiable(_plans);
  bool get loading => _loading;
  String? get error => _error;

  String get _key {
    final profile = AuthSession.instance.profile;
    return profile == null ? '' : 'tementrip_plans_cust_${profile.id}';
  }

  TripPlan? byId(String id) {
    for (final p in _plans) {
      if (p.id == id) return p;
    }
    return null;
  }

  /// Memuat ulang bila akun yang masuk berubah sejak pemuatan terakhir.
  Future<void> load() async {
    final key = _key;
    if (key.isEmpty) {
      _plans = [];
      notifyListeners();
      return;
    }
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final remote = await ApiService.fetchTripPlans();
      _plans = remote;

      // Migrasikan data lokal lama hanya bila akun belum mempunyai data server.
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(key);
      if (_plans.isEmpty && raw != null) {
        try {
          final parsed = jsonDecode(raw);
          if (parsed is List) {
            for (final json
                in parsed.whereType<Map<String, dynamic>>().take(maxPlans)) {
              final legacy = TripPlan.fromJson(json);
              final target = parseLegacyTargetDate(legacy.targetDate);
              final logs = legacy.savingsLogs
                  .map((log) => TripSavingsLog(
                        id: log.id,
                        date: parseLegacyLogDate(log.date),
                        amount: log.amount,
                        note: log.note,
                      ))
                  .toList();
              final migrated =
                  legacy.copyWith(targetDate: target, savingsLogs: logs);
              _plans.add(await ApiService.createTripPlan(migrated));
            }
            await prefs.remove(key);
          }
        } catch (_) {
          // Cache tetap dipertahankan bila migrasi belum berhasil agar dapat
          // dicoba lagi pada pembukaan berikutnya.
        }
      }
    } on ApiException catch (e) {
      _error = e.message;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<TripPlan> upsert(TripPlan plan) async {
    final index = _plans.indexWhere((p) => p.id == plan.id);
    final saved = index >= 0 && RegExp(r'^\d+$').hasMatch(plan.id)
        ? await ApiService.updateTripPlan(plan)
        : await ApiService.createTripPlan(plan);
    if (index >= 0) {
      _plans[index] = saved;
    } else {
      _plans = [saved, ..._plans];
    }
    await _persist();
    return saved;
  }

  Future<void> remove(String id) async {
    if (RegExp(r'^\d+$').hasMatch(id)) await ApiService.deleteTripPlan(id);
    _plans = _plans.where((p) => p.id != id).toList();
    await _persist();
  }

  Future<void> _persist() async {
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
          _key, jsonEncode(_plans.map((p) => p.toJson()).toList()));
    } catch (_) {}
  }

  String parseLegacyTargetDate(String value) {
    final parsed = DateTime.tryParse(value);
    final today = DateTime.now();
    final minimum = DateTime(today.year, today.month, today.day);
    final maximum = DateTime(today.year + 5, today.month, today.day);
    final target =
        parsed == null || parsed.isBefore(minimum) || parsed.isAfter(maximum)
            ? minimum.add(const Duration(days: 30))
            : parsed;
    return '${target.year.toString().padLeft(4, '0')}-${target.month.toString().padLeft(2, '0')}-${target.day.toString().padLeft(2, '0')}';
  }

  String parseLegacyLogDate(String value) {
    final parsed = DateTime.tryParse(value) ?? DateTime.now();
    return '${parsed.year.toString().padLeft(4, '0')}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')}';
  }
}
