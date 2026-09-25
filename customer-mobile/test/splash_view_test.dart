import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:customer_mobile/widgets/splash_view.dart';

void main() {
  testWidgets('splash menunggu pemeriksaan sesi selesai sebelum masuk aplikasi', (tester) async {
    var finished = 0;
    Widget build(bool ready) => MaterialApp(home: SplashView(ready: ready, onFinished: () => finished++));

    await tester.pumpWidget(build(false));
    for (var i = 0; i < 40; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
    expect(finished, 0, reason: 'animasi selesai tetapi sesi belum siap');
    final progress = tester.widget<AnimatedOpacity>(
      find.ancestor(of: find.byType(LinearProgressIndicator), matching: find.byType(AnimatedOpacity)),
    );
    expect(progress.opacity, 1, reason: 'garis progres tampil selama menunggu sesi');

    await tester.pumpWidget(build(true));
    await tester.pump();
    expect(finished, 1);

    await tester.pumpWidget(build(true));
    await tester.pump(const Duration(seconds: 1));
    expect(finished, 1, reason: 'onFinished hanya dipanggil sekali');
  });
}
