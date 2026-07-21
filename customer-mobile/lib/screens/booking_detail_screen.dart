import 'package:flutter/material.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:intl/intl.dart';

class BookingDetailScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;
  final Map<String, dynamic>? arguments;

  const BookingDetailScreen({
    Key? key,
    required this.onNavigate,
    this.arguments,
  }) : super(key: key);

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  late Booking booking;

  @override
  void initState() {
    super.initState();
    if (widget.arguments != null && widget.arguments!['booking'] != null) {
      booking = widget.arguments!['booking'] as Booking;
    } else {
      // Fallback fallback
      booking = Booking.mockBookings.first;
    }
  }

  // Helper to calculate countdown string
  String _calculateCountdown(DateTime targetDate) {
    final now = DateTime.now();
    final difference = targetDate.difference(now);

    if (difference.isNegative) {
      return 'Trip telah dimulai / selesai';
    }

    final days = difference.inDays;
    final hours = difference.inHours % 24;
    final minutes = difference.inMinutes % 60;

    if (days > 0) {
      return 'H-$days Hari $hours Jam';
    } else if (hours > 0) {
      return 'H-$hours Jam $minutes Menit';
    } else {
      return 'H-$minutes Menit Keberangkatan';
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isSuccess = booking.status == 'PAID' || booking.status == 'CONFIRMED' || booking.status == 'COMPLETED';
    final bool isFailed = booking.status == 'FAILED' || booking.status == 'EXPIRED';

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF374151)),
          onPressed: () {
            // Navigate back to Bookings list (Index 2)
            widget.onNavigate(2);
          },
        ),
        title: const Text(
          'Detail Booking',
          style: TextStyle(color: Color(0xFF1F2937), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Header Banner
            _buildStatusHeaderBanner(isSuccess, isFailed),

            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Successful flow details
                  if (isSuccess) ...[
                    _buildCountdownCard(),
                    const SizedBox(height: 20),
                    _buildDigitalVoucherCard(),
                    const SizedBox(height: 20),
                    _buildItineraryCard(),
                    const SizedBox(height: 20),
                    _buildTripInfoDetailsCard(),
                    const SizedBox(height: 20),
                    _buildParticipantsCard(),
                  ],

                  // Failed flow details
                  if (isFailed) ...[
                    _buildFailureExplanationCard(),
                    const SizedBox(height: 20),
                    _buildTripSummaryMiniCard(),
                  ],

                  // Pending flow details
                  if (booking.status == 'PENDING_PAYMENT') ...[
                    _buildPendingActionCard(),
                    const SizedBox(height: 20),
                    _buildTripSummaryMiniCard(),
                  ],

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: TripKitaBottomNavigation(
        currentIndex: 2, // Booking active
        onTap: (index) {
          widget.onNavigate(index);
        },
      ),
    );
  }

  Widget _buildStatusHeaderBanner(bool isSuccess, bool isFailed) {
    String text = 'Menunggu Pembayaran';
    Color bgColor = Colors.orange.shade500;
    IconData icon = Icons.hourglass_empty;

    if (isSuccess) {
      text = 'Booking Berhasil & Terkonfirmasi';
      bgColor = const Color(0xFF0F8B8D); // Teal
      icon = Icons.check_circle_outline;
    } else if (isFailed) {
      text = 'Booking Gagal / Kedaluwarsa';
      bgColor = Colors.red.shade600;
      icon = Icons.error_outline;
    }

    return Container(
      color: bgColor,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ),
          Text(
            booking.bookingCode,
            style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 0.5),
          ),
        ],
      ),
    );
  }

  Widget _buildCountdownCard() {
    final countdownStr = _calculateCountdown(booking.tripDate);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F8B8D), Color(0xFF14A0A3)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F8B8D).withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.timer, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Hitung Mundur Keberangkatan',
                  style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  countdownStr,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDigitalVoucherCard() {
    final package = booking.packageDetails;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          // Header info
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.confirmation_num_outlined, color: Color(0xFF0F8B8D), size: 16),
                    SizedBox(width: 6),
                    Text('E-VOUCHER TRIPKITA', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: Color(0xFF0F8B8D), letterSpacing: 1)),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  package?.name ?? 'Open Trip Wisata',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1F2937)),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(package?.destination ?? 'Destinasi', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                  ],
                ),
              ],
            ),
          ),

          // Dash line separator
          Row(
            children: List.generate(
              30,
              (i) => Expanded(
                child: Container(
                  height: 1,
                  color: i % 2 == 0 ? Colors.grey.shade300 : Colors.transparent,
                ),
              ),
            ),
          ),

          // Ticket detail & Simulated QR
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildTicketInfoLabel('Tanggal Keberangkatan', DateFormat('dd MMM yyyy').format(booking.tripDate)),
                      const SizedBox(height: 14),
                      _buildTicketInfoLabel('Meeting Point', package?.meetingPoint ?? 'Bandara Domine Eduard Osok, Sorong'),
                      const SizedBox(height: 14),
                      _buildTicketInfoLabel('Pax Terdaftar', '${booking.guests} Tamu'),
                    ],
                  ),
                ),
                const SizedBox(width: 20),
                // Simulated Check-in QR code box
                Column(
                  children: [
                    Container(
                      width: 90,
                      height: 90,
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: CustomPaint(
                        painter: TicketQrPainter(),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text('Scan to Board', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF6B7280))),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketInfoLabel(String title, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: TextStyle(color: Colors.grey.shade400, fontSize: 10)),
        const SizedBox(height: 3),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF374151)),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildItineraryCard() {
    final package = booking.packageDetails;
    final itinerary = package?.itinerary ?? [];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Itinerary (Rencana Perjalanan)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1F2937))),
          const SizedBox(height: 16),
          if (itinerary.isEmpty)
            Text('Informasi itinerary lengkap akan dikirimkan oleh Provider.', style: TextStyle(color: Colors.grey.shade400, fontSize: 12))
          else
            ...List.generate(itinerary.length, (idx) {
              final item = itinerary[idx];
              final isLast = idx == itinerary.length - 1;
              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 14,
                          height: 14,
                          decoration: const BoxDecoration(
                            color: Color(0xFF0F8B8D),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                            ),
                          ),
                        ),
                        if (!isLast)
                          Expanded(
                            child: Container(
                              width: 2,
                              color: const Color(0xFF0F8B8D).withOpacity(0.3),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 16.0),
                        child: Text(
                          item,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563), height: 1.4),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildTripInfoDetailsCard() {
    final package = booking.packageDetails;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Informasi Perjalanan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1F2937))),
          const SizedBox(height: 16),
          _buildInfoRowIcon(Icons.watch_later_outlined, 'Durasi Trip', package?.duration ?? '3 Hari 2 Malam'),
          const Divider(height: 24),
          _buildInfoRowIcon(Icons.directions_boat_outlined, 'Tipe Perjalanan', package?.tripType ?? 'Open Trip'),
          const Divider(height: 24),
          _buildInfoRowIcon(Icons.business_center_outlined, 'Fasilitas Utama', package?.facilities.join(', ') ?? 'Peralatan standar, konsumsi'),
          const Divider(height: 24),
          _buildInfoRowIcon(Icons.info_outline, 'Sudah Termasuk', package?.includes.join(', ') ?? 'Perijinan & Tiket Masuk'),
        ],
      ),
    );
  }

  Widget _buildInfoRowIcon(IconData icon, String title, String body) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: const Color(0xFF0F8B8D), size: 18),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(color: Colors.grey.shade400, fontSize: 10)),
              const SizedBox(height: 4),
              Text(body, style: const TextStyle(fontSize: 12, color: Color(0xFF374151), fontWeight: FontWeight.bold, height: 1.3)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildParticipantsCard() {
    final participants = booking.participants;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Daftar Peserta', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1F2937))),
          const SizedBox(height: 16),
          if (participants.isEmpty)
            Text('Hanya Pemesan: ${booking.customerName}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold))
          else
            ...List.generate(participants.length, (idx) {
              final p = participants[idx];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: const Color(0xFFE0F2F1),
                      radius: 16,
                      child: Text('${idx + 1}', style: const TextStyle(color: Color(0xFF0F8B8D), fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(p.fullName.isNotEmpty ? p.fullName : 'Peserta ${idx + 1}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF374151))),
                          const SizedBox(height: 2),
                          Text('${p.gender} • Lahir ${p.dateOfBirth}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  // --- FAILED FLOW LAYOUTS ---
  Widget _buildFailureExplanationCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.red.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.error, color: Colors.red.shade600, size: 20),
              const SizedBox(width: 8),
              Text(
                'Transaksi Gagal / Kedaluwarsa',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.red.shade800),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Batas waktu pembayaran 24 jam telah habis tanpa adanya konfirmasi transfer dari bank pengirim atau e-wallet. Booking ini dibatalkan secara otomatis oleh sistem.',
            style: TextStyle(color: Colors.red.shade700, fontSize: 11, height: 1.4),
          ),
          const Divider(height: 24, thickness: 1),
          const Text(
            'Solusi Anda:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF374151)),
          ),
          const SizedBox(height: 6),
          Text(
            '1. Lakukan booking ulang untuk paket open trip yang sama.\n2. Hubungi Customer Service jika saldo Anda terpotong namun booking gagal.',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 11, height: 1.4),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    // Navigate to Trip List screen (Index 1)
                    widget.onNavigate(1);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF374151),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Cari Trip Lagi', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    // Navigate to chat/support (Index 3)
                    widget.onNavigate(3);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F8B8D),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Hubungi CS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- PENDING FLOW LAYOUTS ---
  Widget _buildPendingActionCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.orange.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.hourglass_bottom, color: Colors.orange.shade800, size: 20),
              const SizedBox(width: 8),
              Text(
                'Menunggu Pembayaran',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.orange.shade800),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Lengkapi pembayaran Anda dengan metode pembayaran yang telah dipilih sebelumnya agar voucher keberangkatan dapat segera diterbitkan.',
            style: TextStyle(color: Color(0xFF6B7280), fontSize: 11, height: 1.4),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // Navigate back to checkout screen (Index 7)
                widget.onNavigate(7, arguments: {'booking': booking});
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F8B8D),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Bayar Sekarang', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripSummaryMiniCard() {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    final package = booking.packageDetails;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Rincian Pemesanan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1F2937))),
          const SizedBox(height: 14),
          _buildTextInfoRow('Paket Trip', package?.name ?? 'Open Trip'),
          const Divider(height: 20),
          _buildTextInfoRow('Tanggal Trip', DateFormat('dd MMMM yyyy').format(booking.tripDate)),
          const Divider(height: 20),
          _buildTextInfoRow('Jumlah Pax', '${booking.guests} Pax'),
          const Divider(height: 20),
          _buildTextInfoRow('Total Transaksi', currencyFormatter.format(booking.totalPrice), isBoldValue: true, valueColor: const Color(0xFF0F8B8D)),
        ],
      ),
    );
  }

  Widget _buildTextInfoRow(String label, String value, {bool isBoldValue = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF6B7280), fontSize: 11)),
        const SizedBox(width: 14),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              fontWeight: isBoldValue ? FontWeight.w800 : FontWeight.bold,
              fontSize: 11,
              color: valueColor ?? const Color(0xFF374151),
            ),
          ),
        ),
      ],
    );
  }
}

// Custom Painter to draw a high-fidelity digital ticket QR code pattern
class TicketQrPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF1F2937)
      ..style = PaintingStyle.fill;

    // Corner Anchor 1 (Top-Left)
    canvas.drawRect(const Rect.fromLTWH(0, 0, 18, 18), paint);
    canvas.drawRect(const Rect.fromLTWH(3.5, 3.5, 11, 11), Paint()..color = Colors.white);
    canvas.drawRect(const Rect.fromLTWH(6, 6, 6, 6), paint);

    // Corner Anchor 2 (Top-Right)
    canvas.drawRect(Rect.fromLTWH(size.width - 18, 0, 18, 18), paint);
    canvas.drawRect(Rect.fromLTWH(size.width - 14.5, 3.5, 11, 11), Paint()..color = Colors.white);
    canvas.drawRect(Rect.fromLTWH(size.width - 12, 6, 6, 6), paint);

    // Corner Anchor 3 (Bottom-Left)
    canvas.drawRect(Rect.fromLTWH(0, size.height - 18, 18, 18), paint);
    canvas.drawRect(Rect.fromLTWH(3.5, size.height - 14.5, 11, 11), Paint()..color = Colors.white);
    canvas.drawRect(Rect.fromLTWH(6, size.height - 12, 6, 6), paint);

    // Draw ticket signature bits
    final bitPaint = Paint()..color = const Color(0xFF1F2937);
    const double bitSize = 3.6;

    for (double y = 22; y < size.height - 22; y += bitSize * 1.5) {
      for (double x = 4; x < size.width - 4; x += bitSize * 1.5) {
        if ((x + y).toInt() % 4 == 0 || (x * y).toInt() % 9 == 3) {
          canvas.drawRect(Rect.fromLTWH(x, y, bitSize, bitSize), bitPaint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
