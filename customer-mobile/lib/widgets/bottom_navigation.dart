import 'package:flutter/material.dart';

import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/widgets/common.dart';

/// Tab utama aplikasi, urutannya mengikuti navigasi bawah desain Figma.
enum AppTab { beranda, cariTrip, booking, rencanaTrip, akun }

/// Label, ikon biasa, dan ikon aktif tiap tab.
const _tabs = {
  AppTab.beranda: ('Beranda', 'house', 'house_fill'),
  AppTab.cariTrip: ('Cari Trip', 'nav_search', 'magnifying_glass_fill'),
  AppTab.booking: ('Booking', 'ticket', 'ticket_fill'),
  AppTab.rencanaTrip: ('Plan Trip', 'calendar_heart', 'calendar_heart_fill'),
  AppTab.akun: ('Profil', 'user', 'user_fill'),
};

class TripKitaBottomNavigation extends StatelessWidget {
  final AppTab current;
  final ValueChanged<AppTab> onSelect;

  const TripKitaBottomNavigation({super.key, required this.current, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Color(0x0F000000), offset: Offset(0, -2), blurRadius: 2),
          BoxShadow(color: Color(0x1A000000), offset: Offset(0, -4), blurRadius: 4),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(children: [
            for (final MapEntry(key: tab, value: (label, icon, activeIcon)) in _tabs.entries)
              Expanded(
                child: Semantics(
                  selected: tab == current,
                  child: InkWell(
                    onTap: () => onSelect(tab),
                    child: Stack(alignment: Alignment.topCenter, children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Column(mainAxisSize: MainAxisSize.min, children: [
                          AppIcon(tab == current ? activeIcon : icon,
                              color: tab == current ? AppColors.primaryDark : AppColors.textMuted),
                          const SizedBox(height: 4),
                          Text(label,
                              maxLines: 1,
                              softWrap: false,
                              overflow: TextOverflow.visible,
                              style: TextStyle(
                                fontSize: 12,
                                height: 20 / 12,
                                letterSpacing: 0,
                                fontWeight: tab == current ? FontWeight.w600 : FontWeight.w400,
                                color: tab == current ? AppColors.primaryDark : AppColors.textMuted,
                              )),
                        ]),
                      ),
                      if (tab == current)
                        Container(
                          width: 46,
                          height: 3,
                          decoration: const BoxDecoration(
                            color: AppColors.brand,
                            borderRadius: BorderRadius.vertical(bottom: Radius.circular(12)),
                          ),
                        ),
                    ]),
                  ),
                ),
              ),
          ]),
        ),
      ),
    );
  }
}
