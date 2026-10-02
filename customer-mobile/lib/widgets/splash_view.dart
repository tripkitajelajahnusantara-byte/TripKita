import 'package:flutter/material.dart';

import 'package:customer_mobile/theme/app_theme.dart';

/// Splash pembuka. Frame pertamanya sama persis dengan splash native Android
/// (simbol "7" berukuran 54dp di tengah layar putih), lalu berganti halus ke
/// logo lengkap. Splash selesai setelah animasi berakhir dan [ready] bernilai
/// true, yaitu saat sesi login sudah diperiksa.
class SplashView extends StatefulWidget {
  final bool ready;
  final VoidCallback onFinished;

  const SplashView({super.key, required this.ready, required this.onFinished});

  @override
  State<SplashView> createState() => _SplashViewState();
}

class _SplashViewState extends State<SplashView> with SingleTickerProviderStateMixin {
  static const _nativeMarkSize = 54.0;

  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1500));

  late final Animation<double> _markOpacity = _interval(0.20, 0.50, from: 1, to: 0);
  late final Animation<double> _markScale = _interval(0.0, 0.50, from: 1, to: 1.18, curve: Curves.easeOutCubic);
  late final Animation<double> _logoOpacity = _interval(0.32, 0.70);
  late final Animation<double> _logoLift = _interval(0.32, 0.75, from: 10, to: 0, curve: Curves.easeOutCubic);
  late final Animation<double> _taglineOpacity = _interval(0.55, 0.90);
  bool _finished = false;

  Animation<double> _interval(double begin, double end,
      {double from = 0, double to = 1, Curve curve = Curves.easeOut}) {
    return Tween<double>(begin: from, end: to)
        .animate(CurvedAnimation(parent: _controller, curve: Interval(begin, end, curve: curve)));
  }

  @override
  void initState() {
    super.initState();
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) _maybeFinish();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      // Pengguna yang mematikan animasi sistem langsung melihat logo akhir.
      if (MediaQuery.of(context).disableAnimations) {
        _controller.value = 1;
        _maybeFinish();
      } else {
        _controller.forward();
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    precacheImage(const AssetImage('assets/images/tementrip_official_logo.png'), context);
    precacheImage(const AssetImage('assets/images/hero.jpg'), context);
  }

  @override
  void didUpdateWidget(covariant SplashView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.ready && !oldWidget.ready) _maybeFinish();
  }

  void _maybeFinish() {
    if (_finished || !widget.ready || !_controller.isCompleted) return;
    _finished = true;
    widget.onFinished();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final waiting = _controller.isCompleted && !widget.ready;
          return Stack(fit: StackFit.expand, children: [
            Center(
              child: Opacity(
                opacity: _markOpacity.value,
                child: Transform.scale(
                  scale: _markScale.value,
                  child: Image.asset('assets/images/tementrip_mark.png', height: _nativeMarkSize),
                ),
              ),
            ),
            Center(
              child: Opacity(
                opacity: _logoOpacity.value,
                child: Transform.translate(
                  offset: Offset(0, _logoLift.value),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Image.asset('assets/images/tementrip_official_logo.png', width: 200),
                    const SizedBox(height: 14),
                    Opacity(
                      opacity: _taglineOpacity.value,
                      child: const Text(
                        'Cari Open Trip Indonesia dengan Mudah',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textMuted,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ),
                  ]),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 28),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    // Garis progres hanya muncul bila pemeriksaan sesi lebih
                    // lama dari animasi, misalnya saat jaringan lambat.
                    AnimatedOpacity(
                      opacity: waiting ? 1 : 0,
                      duration: const Duration(milliseconds: 250),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(2),
                        child: const SizedBox(
                          width: 96,
                          height: 3,
                          child: LinearProgressIndicator(
                            backgroundColor: AppColors.accentLight,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Opacity(
                      opacity: _taglineOpacity.value,
                      child: const Text(
                        'PT TripKita Jelajah Nusantara',
                        style: TextStyle(fontSize: 11.5, color: AppColors.textLight, letterSpacing: 0.4),
                      ),
                    ),
                  ]),
                ),
              ),
            ),
          ]);
        },
      ),
    );
  }
}
