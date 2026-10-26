import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_plugins/url_strategy.dart';

import 'package:customer_mobile/screens/auth_screen.dart';
import 'package:customer_mobile/screens/booking_list_screen.dart';
import 'package:customer_mobile/screens/home_screen.dart';
import 'package:customer_mobile/screens/profile_screen.dart';
import 'package:customer_mobile/screens/trip_detail_screen.dart';
import 'package:customer_mobile/screens/trip_list_screen.dart';
import 'package:customer_mobile/screens/trip_planner_screen.dart';
import 'package:customer_mobile/services/auth_session.dart';
import 'package:customer_mobile/services/checkout_config.dart';
import 'package:customer_mobile/services/wishlist_store.dart';
import 'package:customer_mobile/theme/app_theme.dart';
import 'package:customer_mobile/utils/deep_links.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:customer_mobile/widgets/common.dart';
import 'package:customer_mobile/widgets/legal_content.dart';
import 'package:customer_mobile/widgets/splash_view.dart';

final navigatorKey = GlobalKey<NavigatorState>();
final appShellKey = GlobalKey<AppShellState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Web: tautan bagikan `/paket/<id>` dibaca dari path URL, bukan hash.
  usePathUrlStrategy();
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.dark);
  await WishlistStore.instance.load();
  runApp(const TemenTripApp());
  // Profil dimuat setelah frame pertama agar layar muat tampil segera.
  AuthSession.instance.init();
  // Biaya layanan & masa bayar dimuat lebih awal; layar konfirmasi akan
  // memuat ulang bila permintaan ini gagal.
  CheckoutConfig.load().ignore();
}

class TemenTripApp extends StatefulWidget {
  const TemenTripApp({super.key});

  @override
  State<TemenTripApp> createState() => _TemenTripAppState();
}

class _TemenTripAppState extends State<TemenTripApp> with WidgetsBindingObserver {
  bool _splashDone = false;

  /// Paket dari tautan yang membuka aplikasi; dibuka setelah splash selesai.
  int? _pendingPackageId =
      packageIdFromUri(Uri.parse(WidgetsBinding.instance.platformDispatcher.defaultRouteName));

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Tautan paket yang diketuk saat aplikasi sudah berjalan (Android App Links).
  @override
  Future<bool> didPushRouteInformation(RouteInformation routeInformation) async {
    final id = packageIdFromUri(routeInformation.uri);
    if (id == null) return false;
    if (_splashDone) {
      openPackageLink(id);
    } else {
      _pendingPackageId = id;
    }
    return true;
  }

  void _finishSplash() {
    setState(() => _splashDone = true);
    final id = _pendingPackageId;
    if (id == null) return;
    _pendingPackageId = null;
    WidgetsBinding.instance.addPostFrameCallback((_) => openPackageLink(id));
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TemenTrip',
      debugShowCheckedModeBanner: false,
      navigatorKey: navigatorKey,
      // Rute awal dari tautan ditangani sendiri lewat [_pendingPackageId].
      initialRoute: '/',
      theme: AppTheme.light(),
      home: ListenableBuilder(
        listenable: AuthSession.instance,
        builder: (context, _) => AnimatedSwitcher(
          duration: const Duration(milliseconds: 450),
          switchInCurve: Curves.easeOut,
          child: _splashDone
              ? AppShell(key: appShellKey)
              : SplashView(
                  ready: !AuthSession.instance.initializing,
                  onFinished: _finishSplash,
                ),
        ),
      ),
    );
  }
}

/// Membuka detail paket dari tautan bagikan `/paket/<id>`.
void openPackageLink(int packageId) {
  navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => PackageLinkScreen(packageId: packageId)));
}

/// Memastikan customer sudah masuk sebelum melanjutkan, padanan
/// `openAuthModal('login', onSuccess)` di web.
Future<bool> ensureLoggedIn(BuildContext context) async {
  if (AuthSession.instance.isLoggedIn) return true;
  final ok = await Navigator.of(context).push<bool>(
    MaterialPageRoute(builder: (_) => const AuthScreen()),
  );
  return ok == true && AuthSession.instance.isLoggedIn;
}

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => AppShellState();
}

class AppShellState extends State<AppShell> {
  AppTab _tab = AppTab.beranda;
  TripSearchParams _searchParams = const TripSearchParams();
  int _searchVersion = 0;
  int _bookingsVersion = 0;
  bool _plannerOpened = false;
  int? _termsCheckedFor;

  @override
  void initState() {
    super.initState();
    AuthSession.instance.addListener(_onAuthChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _onAuthChanged());
  }

  @override
  void dispose() {
    AuthSession.instance.removeListener(_onAuthChanged);
    super.dispose();
  }

  Future<void> selectTab(AppTab tab) async {
    // Rencana Trip tersimpan di akun, jadi customer perlu masuk lebih dulu.
    if (tab == AppTab.rencanaTrip && !await ensureLoggedIn(context)) return;
    if (!mounted) return;
    setState(() {
      // Masuk Cari Trip dari navigasi bawah: tampilkan trip terdekat (GPS).
      if (tab == AppTab.cariTrip && _tab != AppTab.cariTrip) {
        _searchParams = const TripSearchParams(nearMe: true);
        _searchVersion++;
      }
      if (tab == AppTab.booking) _bookingsVersion++;
      if (tab == AppTab.rencanaTrip) _plannerOpened = true;
      _tab = tab;
    });
  }

  /// Membuka tab Cari Trip dengan filter tertentu (`navigateTo('cari-trip')`).
  void openSearch(TripSearchParams params) {
    setState(() {
      _searchParams = params;
      _searchVersion++;
      _tab = AppTab.cariTrip;
    });
  }

  /// Kembali ke tab Booking dari halaman mana pun (mis. setelah membuat
  /// invoice pembayaran).
  void showBookings() {
    navigatorKey.currentState?.popUntil((route) => route.isFirst);
    selectTab(AppTab.booking);
  }

  Future<void> _onAuthChanged() async {
    final session = AuthSession.instance;
    if (session.consumeSessionExpired()) {
      final ctx = navigatorKey.currentContext;
      if (ctx != null && ctx.mounted) {
        showSnack(ctx, 'Sesi Anda telah berakhir. Silakan masuk kembali.', isError: true);
      }
    }

    // Persetujuan S&K wajib sekali per akun, sama dengan modal global web.
    final profile = session.profile;
    if (profile == null) {
      _termsCheckedFor = null;
      return;
    }
    if (_termsCheckedFor == profile.id) return;
    _termsCheckedFor = profile.id;
    if (await session.hasAcceptedTerms()) return;
    final ctx = navigatorKey.currentContext;
    if (ctx == null || !ctx.mounted) return;
    await showMandatoryCustomerTerms(ctx);
    await session.acceptTerms();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _tab == AppTab.beranda,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) selectTab(AppTab.beranda);
      },
      child: Scaffold(
        body: IndexedStack(
          index: _tab.index,
          children: [
            HomeScreen(onSearch: openSearch, onPlanTrip: () => selectTab(AppTab.rencanaTrip)),
            TripListScreen(key: ValueKey('search-$_searchVersion'), params: _searchParams),
            BookingListScreen(
              key: const ValueKey('bookings'),
              refreshToken: _bookingsVersion,
              isActive: _tab == AppTab.booking,
              onBrowseTrips: () => selectTab(AppTab.beranda),
            ),
            // Dibangun saat tab pertama kali dibuka agar tidak memuat data sebelum masuk.
            _plannerOpened ? const TripPlannerScreen() : const SizedBox.shrink(),
            ProfileScreen(onBrowseTrips: () => selectTab(AppTab.cariTrip)),
          ],
        ),
        bottomNavigationBar: TripKitaBottomNavigation(current: _tab, onSelect: selectTab),
      ),
    );
  }
}
