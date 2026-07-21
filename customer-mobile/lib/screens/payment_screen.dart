import 'dart:async';
import 'package:flutter/material.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:intl/intl.dart';

class PaymentScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;
  final Map<String, dynamic>? arguments;

  const PaymentScreen({
    Key? key,
    required this.onNavigate,
    this.arguments,
  }) : super(key: key);

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  late Booking booking;
  String activePaymentTab = 'QRIS'; // Default to QRIS

  // Countdown timer state
  late Timer _timer;
  Duration _remainingTime = const Duration(hours: 24); // 24 hours default countdown

  // FAQ accordion state
  List<bool> isInstructionExpanded = [true, false, false];

  @override
  void initState() {
    super.initState();
    // Retrieve passed arguments
    if (widget.arguments != null && widget.arguments!['booking'] != null) {
      booking = widget.arguments!['booking'] as Booking;
    } else {
      // Fallback default mock
      booking = Booking(
        id: 501,
        bookingCode: 'TK-2824-1891',
        providerId: 101,
        packageId: 1,
        customerName: 'Budi Santoso',
        customerInitial: 'BS',
        tripDate: DateTime(2024, 5, 28),
        guests: 4,
        totalPrice: 11000000,
        dpAmount: 0,
        paymentMethod: 'QRIS',
        status: 'PENDING_PAYMENT',
        paymentUrl: '',
        createdAt: DateTime.now(),
        participants: [],
      );
    }

    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingTime.inSeconds > 0) {
        setState(() {
          _remainingTime = _remainingTime - const Duration(seconds: 1);
        });
      } else {
        _timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final hours = twoDigits(duration.inHours);
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$hours:$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF374151)),
          onPressed: () {
            widget.onNavigate(6, arguments: {
              'package': booking.packageDetails,
              'participants': booking.guests,
              'selectedDate': DateFormat('dd MMM yyyy').format(booking.tripDate),
            }); // Back to booking (Index 6)
          },
        ),
        title: const Text(
          'Pembayaran',
          style: TextStyle(color: Color(0xFF1F2937), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Stepper progress indicator
            _buildProgressStepper(),

            // Timer & Booking Code Card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    )
                  ],
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Batas Akhir Pembayaran', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
                            const SizedBox(height: 4),
                            Text(
                              _formatDuration(_remainingTime),
                              style: const TextStyle(
                                color: Colors.red,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('Kode Booking', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
                            const SizedBox(height: 4),
                            Text(
                              booking.bookingCode,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF374151)),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const Divider(height: 24, thickness: 1),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Pembayaran', style: TextStyle(color: Color(0xFF6B7280), fontSize: 13)),
                        Text(
                          currencyFormatter.format(booking.totalPrice),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F8B8D),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Payment Methods Tabs selector
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: ['QRIS', 'Virtual Account', 'E-Wallet'].map((tab) {
                    final bool isActive = activePaymentTab == tab;
                    return Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            activePaymentTab = tab;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: isActive ? const Color(0xFF0F8B8D) : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            tab,
                            style: TextStyle(
                              color: isActive ? Colors.white : const Color(0xFF4B5563),
                              fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Tab contents
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: _buildActivePaymentTabContent(),
            ),

            // Payment Instructions accordions
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Petunjuk Pembayaran', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1F2937))),
                  const SizedBox(height: 12),
                  _buildInstructionAccordion(0, 'Langkah 1: Buka aplikasi E-Wallet atau M-Banking', 'Pastikan saldo mencukupi dan cari menu transfer / scan QR.'),
                  _buildInstructionAccordion(1, 'Langkah 2: Arahkan kamera ke QR Code', 'Posisikan QR code TripKita di dalam kotak pemindai di aplikasi pembayaran Anda.'),
                  _buildInstructionAccordion(2, 'Langkah 3: Konfirmasi dan Bayar', 'Masukkan PIN transaksi dan tunggu status pembayaran berhasil di halaman ini.'),
                ],
              ),
            ),

            // Security assurance info
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.shade100),
                ),
                child: Row(
                  children: [
                    Icon(Icons.shield_outlined, color: Colors.green.shade700, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Pembayaran Anda dilindungi dengan enkripsi SSL 256-bit aman dan bersertifikat OJK.',
                        style: TextStyle(color: Colors.green.shade800, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Support & Help Center
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.help_outline, size: 16, color: Color(0xFF6B7280)),
                    label: const Text('Bantuan', style: TextStyle(color: Color(0xFF6B7280), fontSize: 12)),
                  ),
                  TextButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.support_agent, size: 16, color: Color(0xFF0F8B8D)),
                    label: const Text('Hubungi CS TripKita', style: TextStyle(color: Color(0xFF0F8B8D), fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),

      // Bottom verification notification and navigation
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 10,
              offset: const Offset(0, -4),
            )
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0F2F1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      children: [
                        SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0F8B8D)),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Menunggu pembayaran... Sistem mendeteksi otomatis.',
                            style: TextStyle(color: Color(0xFF0F8B8D), fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        // Navigate to Payment Verification Screen (Index 8)
                        widget.onNavigate(8, arguments: {'booking': booking});
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F8B8D),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        'Verifikasi Pembayaran Saya',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            TripKitaBottomNavigation(
              currentIndex: 2, // Booking active
              onTap: (index) {
                widget.onNavigate(index);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressStepper() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildStepItem('Booking', true, true),
          _buildStepLine(true),
          _buildStepItem('Pembayaran', true, false),
          _buildStepLine(false),
          _buildStepItem('Verifikasi', false, false),
          _buildStepLine(false),
          _buildStepItem('Selesai', false, false),
        ],
      ),
    );
  }

  Widget _buildStepItem(String title, bool isCompleted, bool isPast) {
    Color nodeColor = const Color(0xFF0F8B8D); // Teal
    Color textColor = const Color(0xFF1F2937);

    if (!isCompleted) {
      nodeColor = Colors.grey.shade300;
      textColor = Colors.grey.shade400;
    }

    return Column(
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: isPast ? const Color(0xFF0F8B8D) : Colors.white,
            border: Border.all(color: nodeColor, width: 2),
            shape: BoxShape.circle,
          ),
          child: isPast
              ? const Icon(Icons.check, size: 12, color: Colors.white)
              : Center(
                  child: Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: isCompleted ? const Color(0xFF0F8B8D) : Colors.transparent,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
        ),
        const SizedBox(height: 6),
        Text(
          title,
          style: TextStyle(
            fontSize: 10,
            color: textColor,
            fontWeight: isCompleted ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine(bool isActive) {
    return Container(
      width: 40,
      height: 2,
      margin: const EdgeInsets.only(bottom: 16),
      color: isActive ? const Color(0xFF0F8B8D) : Colors.grey.shade200,
    );
  }

  Widget _buildActivePaymentTabContent() {
    switch (activePaymentTab) {
      case 'QRIS':
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            children: [
              // QRIS logos
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('QRIS', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, fontStyle: FontStyle.italic, color: Color(0xFF1F2937))),
                  const SizedBox(width: 8),
                  Text('GPN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.blue.shade800)),
                ],
              ),
              const SizedBox(height: 16),
              // Simulated QR code
              Container(
                width: 200,
                height: 200,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10)
                  ],
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: CustomPaint(
                  painter: QrPatternPainter(),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Scan QR di atas menggunakan aplikasi perbankan atau e-wallet Anda.',
                style: TextStyle(fontSize: 12, color: Colors.grey, height: 1.4),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );
      case 'Virtual Account':
        return Column(
          children: [
            _buildVaItem('Bank Central Asia (BCA)', '8033202418919001', 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=100'),
            const SizedBox(height: 12),
            _buildVaItem('Bank Mandiri', '8902202418918224', 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=100'),
            const SizedBox(height: 12),
            _buildVaItem('Bank Negara Indonesia (BNI)', '8271202418917833', 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=100'),
          ],
        );
      case 'E-Wallet':
        return Column(
          children: [
            _buildEwalletItem('GoPay', 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=100'),
            const SizedBox(height: 12),
            _buildEwalletItem('OVO', 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=100'),
            const SizedBox(height: 12),
            _buildEwalletItem('ShopeePay', 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=100'),
          ],
        );
      default:
        return const SizedBox();
    }
  }

  Widget _buildVaItem(String bankName, String vaNumber, String logoUrl) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 32,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(6),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.account_balance, color: Colors.blue, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(bankName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1F2937))),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(vaNumber, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF0F8B8D), letterSpacing: 0.5)),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: () {},
                      child: const Icon(Icons.copy, size: 14, color: Colors.grey),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEwalletItem(String walletName, String logoUrl) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.account_balance_wallet_outlined, color: Color(0xFF0F8B8D)),
              ),
              const SizedBox(width: 16),
              Text(walletName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1F2937))),
            ],
          ),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F8B8D),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Buka Aplikasi', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionAccordion(int index, String title, String body) {
    final isExpanded = isInstructionExpanded[index];

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          ListTile(
            title: Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF374151))),
            trailing: Icon(isExpanded ? Icons.expand_less : Icons.expand_more, size: 18),
            dense: true,
            onTap: () {
              setState(() {
                isInstructionExpanded[index] = !isInstructionExpanded[index];
              });
            },
          ),
          if (isExpanded) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Text(
                body,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 11, height: 1.4),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// Simple Painter to draw a QR lookalike pattern for the QRIS block
class QrPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.fill;

    // Corner Anchor 1 (Top-Left)
    canvas.drawRect(Rect.fromLTWH(0, 0, 40, 40), paint);
    canvas.drawRect(Rect.fromLTWH(8, 8, 24, 24), Paint()..color = Colors.white);
    canvas.drawRect(Rect.fromLTWH(13, 13, 14, 14), paint);

    // Corner Anchor 2 (Top-Right)
    canvas.drawRect(Rect.fromLTWH(size.width - 40, 0, 40, 40), paint);
    canvas.drawRect(Rect.fromLTWH(size.width - 32, 8, 24, 24), Paint()..color = Colors.white);
    canvas.drawRect(Rect.fromLTWH(size.width - 27, 13, 14, 14), paint);

    // Corner Anchor 3 (Bottom-Left)
    canvas.drawRect(Rect.fromLTWH(0, size.height - 40, 40, 40), paint);
    canvas.drawRect(Rect.fromLTWH(8, size.height - 32, 24, 24), Paint()..color = Colors.white);
    canvas.drawRect(Rect.fromLTWH(13, size.height - 27, 14, 14), paint);

    // Draw some random bits
    final bitPaint = Paint()..color = Colors.black;
    final double bitSize = 8.0;

    // A simple grid pattern of bits to look like a QR code
    for (double y = 48; y < size.height - 48; y += bitSize * 1.5) {
      for (double x = 8; x < size.width - 8; x += bitSize * 1.5) {
        if ((x + y).toInt() % 3 == 0 || (x * y).toInt() % 7 == 2) {
          canvas.drawRect(Rect.fromLTWH(x, y, bitSize, bitSize), bitPaint);
        }
      }
    }

    // Additional anchors and center markers
    canvas.drawRect(Rect.fromLTWH(size.width - 32, size.height - 32, 16, 16), bitPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
