import 'package:flutter/material.dart';

import 'package:customer_mobile/theme/app_theme.dart';

/// Tab utama aplikasi. Urutannya mengikuti menu customer di web.
enum AppTab { beranda, cariTrip, booking, akun }

class TripKitaBottomNavigation extends StatelessWidget {
  final AppTab current;
  final ValueChanged<AppTab> onSelect;

  const TripKitaBottomNavigation({super.key, required this.current, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return NavigationBarTheme(
      data: NavigationBarThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        indicatorColor: AppColors.accentLight,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 12,
            fontWeight: states.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
            color: states.contains(WidgetState.selected) ? AppColors.accent : AppColors.textMuted,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected) ? AppColors.accent : AppColors.textMuted,
          ),
        ),
      ),
      child: DecoratedBox(
        decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.border))),
        child: NavigationBar(
          height: 66,
          selectedIndex: current.index,
          onDestinationSelected: (i) => onSelect(AppTab.values[i]),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Beranda'),
            NavigationDestination(icon: Icon(Icons.search), selectedIcon: Icon(Icons.travel_explore), label: 'Cari Trip'),
            NavigationDestination(
                icon: Icon(Icons.confirmation_number_outlined),
                selectedIcon: Icon(Icons.confirmation_number),
                label: 'Booking'),
            NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Akun'),
          ],
        ),
      ),
    );
  }
}
