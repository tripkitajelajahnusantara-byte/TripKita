import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:customer_mobile/screens/home_screen.dart';
import 'package:customer_mobile/screens/trip_list_screen.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/screens/booking_screen.dart';
import 'package:customer_mobile/screens/payment_screen.dart';
import 'package:customer_mobile/screens/booking_list_screen.dart';
import 'package:customer_mobile/screens/booking_detail_screen.dart';
import 'package:customer_mobile/screens/payment_verification_screen.dart';
import 'package:customer_mobile/screens/chat_list_screen.dart';
import 'package:customer_mobile/screens/profile_screen.dart';


void main() {
  runApp(const TripKitaApp());
}

class TripKitaApp extends StatelessWidget {
  const TripKitaApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TripKita Customer Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFF0F8B8D), // Teal
        scaffoldBackgroundColor: Colors.white,
        textTheme: GoogleFonts.interTextTheme(
          Theme.of(context).textTheme,
        ),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F8B8D),
          primary: const Color(0xFF0F8B8D),
        ),
        appBarTheme: const AppBarTheme(
          iconTheme: IconThemeData(color: Color(0xFF374151)),
          titleTextStyle: TextStyle(
            color: Color(0xFF1F2937),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      home: const MainNavigationWrapper(),
    );
  }
}

class MainNavigationWrapper extends StatefulWidget {
  const MainNavigationWrapper({Key? key}) : super(key: key);

  @override
  State<MainNavigationWrapper> createState() => _MainNavigationWrapperState();
}

class _MainNavigationWrapperState extends State<MainNavigationWrapper> {
  // Prototype State Controller
  // 0 = HomeScreen (Beranda Tab)
  // 1 = TripListScreen (Trip Tab)
  // 2 = BookingListScreen (Booking Tab - NEW)
  // 3 = ChatListScreen (Chat Tab - NEW)
  // 4 = ProfileScreen (Profile Tab - NEW)
  // 5 = TripDetailScreen (Sub-screen - formerly index 2)
  // 6 = BookingScreen (Sub-screen - formerly index 3)
  // 7 = PaymentScreen (Sub-screen - formerly index 4)
  // 8 = PaymentVerificationScreen (Sub-screen - NEW)
  // 9 = BookingDetailScreen (Sub-screen - NEW)
  int _currentScreenIndex = 0;
  Map<String, dynamic>? _navigationArguments;

  void _navigateToScreen(int index, {Map<String, dynamic>? arguments}) {
    setState(() {
      _currentScreenIndex = index;
      _navigationArguments = arguments;
    });
  }

  @override
  Widget build(BuildContext context) {
    switch (_currentScreenIndex) {
      case 0:
        return HomeScreen(
          onNavigate: _navigateToScreen,
        );
      case 1:
        return TripListScreen(
          onNavigate: _navigateToScreen,
          arguments: _navigationArguments,
        );
      case 2:
        return BookingListScreen(
          onNavigate: _navigateToScreen,
          arguments: _navigationArguments,
        );
      case 3:
        return ChatListScreen(
          onNavigate: _navigateToScreen,
          arguments: _navigationArguments,
        );
      case 4:
        return ProfileScreen(
          onNavigate: _navigateToScreen,
          arguments: _navigationArguments,
        );
      case 5:
        return TripDetailScreen(
          onNavigate: _navigateToScreen,
          arguments: _navigationArguments,
        );
      case 6:
        return BookingScreen(
          onNavigate: _navigateToScreen,
          arguments: _navigationArguments,
        );
      case 7:
        return PaymentScreen(
          onNavigate: _navigateToScreen,
          arguments: _navigationArguments,
        );
      case 8:
        return PaymentVerificationScreen(
          onNavigate: _navigateToScreen,
          arguments: _navigationArguments,
        );
      case 9:
        return BookingDetailScreen(
          onNavigate: _navigateToScreen,
          arguments: _navigationArguments,
        );
      default:
        return HomeScreen(
          onNavigate: _navigateToScreen,
        );
    }
  }
}
