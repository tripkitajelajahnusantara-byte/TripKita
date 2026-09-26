import 'package:flutter/material.dart';

import 'package:customer_mobile/main.dart';
import 'package:customer_mobile/models/notification.dart';
import 'package:customer_mobile/screens/trip_planner_screen.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/formatters.dart';
import 'package:customer_mobile/widgets/common.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<AppNotification> _items = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await ApiService.fetchNotifications();
      if (mounted) setState(() => _items = items);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAll() async {
    try {
      await ApiService.markAllNotificationsRead();
      if (mounted)
        setState(() => _items =
            _items.map((item) => item.copyWith(isRead: true)).toList());
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, isError: true);
    }
  }

  Future<void> _open(AppNotification item) async {
    if (!item.isRead) {
      try {
        await ApiService.markNotificationRead(item.id);
        if (mounted) {
          setState(() => _items = _items
              .map((entry) =>
                  entry.id == item.id ? entry.copyWith(isRead: true) : entry)
              .toList());
        }
      } on ApiException catch (e) {
        if (mounted) showSnack(context, e.message, isError: true);
      }
    }
    if (!mounted) return;
    if (item.type == 'TRIP_PLAN') {
      Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => const TripPlannerScreen()));
    } else {
      appShellKey.currentState?.showBookings();
    }
  }

  IconData _icon(String type) {
    switch (type) {
      case 'TRIP_PLAN':
        return Icons.savings_outlined;
      case 'PAYMENT':
        return Icons.payments_outlined;
      case 'REFUND':
        return Icons.currency_exchange;
      case 'RESCHEDULE':
        return Icons.event_repeat_outlined;
      default:
        return Icons.notifications_none;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifikasi'),
        actions: [
          if (_items.any((item) => !item.isRead))
            TextButton(onPressed: _markAll, child: const Text('Baca semua')),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? EmptyState(
                  icon: Icons.cloud_off_outlined,
                  title: 'Notifikasi Belum Dapat Dimuat',
                  message: _error!,
                  actions: [
                    ElevatedButton(
                        onPressed: _load, child: const Text('Coba Lagi'))
                  ],
                )
              : _items.isEmpty
                  ? const EmptyState(
                      icon: Icons.notifications_none,
                      title: 'Belum Ada Notifikasi',
                      message:
                          'Pembaruan pesanan dan rencana trip akan tampil di sini.',
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final item = _items[index];
                          return SectionCard(
                            padding: EdgeInsets.zero,
                            child: ListTile(
                              onTap: () => _open(item),
                              leading: CircleAvatar(
                                backgroundColor: item.isRead
                                    ? AppColors.background
                                    : AppColors.accentLight,
                                child: Icon(_icon(item.type),
                                    color: AppColors.primary),
                              ),
                              title: Text(item.title,
                                  style: TextStyle(
                                      fontWeight: item.isRead
                                          ? FontWeight.w600
                                          : FontWeight.w800)),
                              subtitle: Text(
                                  '${item.message}\n${formatDateShort(item.createdAt.toLocal())}',
                                  maxLines: 4),
                              isThreeLine: true,
                              trailing: item.isRead
                                  ? null
                                  : const Icon(Icons.circle,
                                      size: 9, color: AppColors.accent),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
