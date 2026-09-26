import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:customer_mobile/models/trip_plan.dart';
import 'package:customer_mobile/services/auth_session.dart';

/// Penyimpanan rencana trip di perangkat, terpisah per akun customer (atau
/// tamu), dengan kunci dan batas yang sama seperti web.
class TripPlanStore extends ChangeNotifier {
  TripPlanStore._();
  static final TripPlanStore instance = TripPlanStore._();

  static const maxPlans = 10;

  List<TripPlan> _plans = [];
  String? _loadedKey;

  List<TripPlan> get plans => List.unmodifiable(_plans);

  String get _key {
    final profile = AuthSession.instance.profile;
    return profile == null ? 'tementrip_plans_guest' : 'tementrip_plans_cust_${profile.id}';
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
    if (key == _loadedKey) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(key);
      final parsed = raw == null ? const [] : jsonDecode(raw);
      _plans = parsed is List ? parsed.whereType<Map<String, dynamic>>().map(TripPlan.fromJson).toList() : [];
    } catch (_) {
      _plans = [];
    }
    _loadedKey = key;
    notifyListeners();
  }

  Future<void> upsert(TripPlan plan) async {
    final index = _plans.indexWhere((p) => p.id == plan.id);
    if (index >= 0) {
      _plans[index] = plan;
    } else {
      _plans = [plan, ..._plans];
    }
    await _persist();
  }

  Future<void> remove(String id) async {
    _plans = _plans.where((p) => p.id != id).toList();
    await _persist();
  }

  Future<void> _persist() async {
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key, jsonEncode(_plans.map((p) => p.toJson()).toList()));
    } catch (_) {}
  }
}
