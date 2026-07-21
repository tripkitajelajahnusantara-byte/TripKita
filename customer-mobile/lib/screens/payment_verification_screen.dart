import 'dart:async';
import 'package:flutter/material.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:intl/intl.dart';

class PaymentVerificationScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;
  final Map<String, dynamic>? arguments;

  const PaymentVerificationScreen({
    Key? key,
    required this.onNavigate,
    this.arguments,
  }) : super(key: key);

  @override
  State<PaymentVerificationScreen> createState() => _PaymentVerificationScreenState();
}

class _PaymentVerificationScreenState extends State<PaymentVerificationScreen> {
  late Booking booking;
  String verificationState = 'PENDING'; // PENDING, SUCCESS, FAILED
  String? errorMessage;
  bool isVerifying = true;

  @override
  void initState() {
    super.initState();
    if (widget.arguments != null && widget.arguments!['booking'] != null) {
      booking = widget.arguments!['booking'] as Booking;
    } else {
      // Fallback fallback
      booking = Booking.mockBookings.first;
    }

    // Simulate initial loading before user makes a choice
    Timer(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          isVerifying = false;
        });
      }
    });
  }

  void _simulateSuccess() {
    setState(() {
      verificationState = 'SUCCESS';
      // Find the booking in mock list and update its status
      final index = Booking.mockBookings.indexWhere((b) => b.id == booking.id || b.bookingCode == booking.bookingCode);
      if (index != -1) {
        final currentBooking = Booking.mockBookings[index];
        Booking.mockBookings[index] = Booking(
          id: currentBooking.id,
          bookingCode: currentBooking.bookingCode,
          providerId: currentBooking.providerId,
          packageId: currentBooking.packageId,
          packageDetails: currentBooking.packageDetails,
          customerName: currentBooking.customerName,
          customerInitial: currentBooking.customerInitial,
          tripDate: currentBooking.tripDate,
          guests: currentBooking.guests,
          totalPrice: currentBooking.totalPrice,
          dpAmount: currentBooking.dpAmount,
          paymentMethod: currentBooking.paymentMethod,
          status: 'PAID', // Update status to PAID
          paymentUrl: currentBooking.paymentUrl,
          createdAt: currentBooking.createdAt,
          participants: currentBooking.participants,
        );
        booking = Booking.mockBookings[index];
      } else {
        // If not in list, add it as paid
        final updatedBooking = Booking(
          id: booking.id,
          bookingCode: booking.bookingCode,
          providerId: booking.providerId,
          packageId: booking.packageId,
          packageDetails: booking.packageDetails,
          customerName: booking.customerName,
          customerInitial: booking.customerInitial,
          tripDate: booking.tripDate,
          guests: booking.guests,
          totalPrice: booking.totalPrice,
          dpAmount: booking.dpAmount,
          paymentMethod: booking.paymentMethod,
          status: 'PAID',
          paymentUrl: booking.paymentUrl,
          createdAt: booking.createdAt,
          participants: booking.participants,
        );
        Booking.mockBookings.add(updatedBooking);
        booking = updatedBooking;
      }
    });
  }

  void _simulateFailure() {
    setState(() {
      verificationState = 'FAILED';
      errorMessage = 'Batas waktu transfer telah terlampaui (Expired). Silakan lakukan pemesanan ulang.';
      // Find the booking in mock list and update its status
      final index = Booking.mockBookings.indexWhere((b) => b.id == booking.id || b.bookingCode == booking.bookingCode);
      if (index != -1) {
        final currentBooking = Booking.mockBookings[index];
        Booking.mockBookings[index] = Booking(
          id: currentBooking.id,
          bookingCode: currentBooking.bookingCode,
          providerId: currentBooking.providerId,
          packageId: currentBooking.packageId,
          packageDetails: currentBooking.packageDetails,
          customerName: currentBooking.customerName,
          customerInitial: currentBooking.customerInitial,
          tripDate: currentBooking.tripDate,
          guests: currentBooking.guests,
          totalPrice: currentBooking.totalPrice,
          dpAmount: currentBooking.dpAmount,
          paymentMethod: currentBooking.paymentMethod,
          status: 'FAILED', // Update status to FAILED
          paymentUrl: currentBooking.paymentUrl,
          createdAt: currentBooking.createdAt,
          participants: currentBooking.participants,
        );
        booking = Booking.mockBookings[index];
      } else {
        // If not in list, add it as failed
        final updatedBooking = Booking(
          id: booking.id,
          bookingCode: booking.bookingCode,
          providerId: booking.providerId,
          packageId: booking.packageId,
          packageDetails: booking.packageDetails,
          customerName: booking.customerName,
          customerInitial: booking.customerInitial,
          tripDate: booking.tripDate,
          guests: booking.guests,
          totalPrice: booking.totalPrice,
          dpAmount: booking.dpAmount,
          paymentMethod: booking.paymentMethod,
          status: 'FAILED',
          paymentUrl: booking.paymentUrl,
          createdAt: booking.createdAt,
          participants: booking.participants,
        );
        Booking.mockBookings.add(updatedBooking);
        booking = updatedBooking;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        automaticallyImplyLeading: false,
        title: const Text(
          'Verifikasi Pembayaran',
          style: TextStyle(color: Color(0xFF1F2937), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildProgressStepper(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 30.0),
              child: _buildMainContent(),
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

  Widget _buildProgressStepper() {
    final bool isCompleted = verificationState == 'SUCCESS' || verificationState == 'FAILED';
    final bool isPastVerification = verificationState == 'SUCCESS' || verificationState == 'FAILED';

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildStepItem('Booking', true, true),
          _buildStepLine(true),
          _buildStepItem('Pembayaran', true, true),
          _buildStepLine(true),
          _buildStepItem('Verifikasi', true, isPastVerification),
          _buildStepLine(isPastVerification),
          _buildStepItem('Selesai', isCompleted, false),
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

  Widget _buildMainContent() {
    if (isVerifying) {
      return _buildPendingState('Menghubungkan ke server bank untuk verifikasi...');
    }

    switch (verificationState) {
      case 'PENDING':
        return _buildPendingVerificationControls();
      case 'SUCCESS':
        return _buildSuccessOutcome();
      case 'FAILED':
        return _buildFailedOutcome();
      default:
        return const SizedBox();
    }
  }

  Widget _buildPendingState(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              strokeWidth: 4,
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF0F8B8D)),
            ),
          ),
          const SizedBox(height: 30),
          const Text(
            'Mengecek Status Pembayaran',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF1F2937)),
          ),
          const SizedBox(height: 12),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280), height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingVerificationControls() {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.grey.shade200),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: Column(
            children: [
              const Icon(Icons.payment, color: Color(0xFF0F8B8D), size: 48),
              const SizedBox(height: 16),
              const Text(
                'Simulasi Verifikasi Pembayaran',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1F2937)),
              ),
              const SizedBox(height: 8),
              Text(
                'Pilih salah satu hasil di bawah ini untuk mensimulasikan respons pembayaran dari penyedia payment gateway/bank.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500, height: 1.4),
              ),
              const Divider(height: 32, thickness: 1),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Pembayaran', style: TextStyle(color: Color(0xFF6B7280), fontSize: 13)),
                  Text(
                    currencyFormatter.format(booking.totalPrice),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF374151)),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Kode Booking', style: TextStyle(color: Color(0xFF6B7280), fontSize: 13)),
                  Text(
                    booking.bookingCode,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F8B8D)),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 30),
        // Action buttons to simulate outcomes
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    isVerifying = true;
                  });
                  Timer(const Duration(seconds: 1), () {
                    _simulateSuccess();
                    setState(() {
                      isVerifying = false;
                    });
                  });
                },
                icon: const Icon(Icons.check_circle_outline, size: 18),
                label: const Text('Simulasi Sukses', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green.shade600,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    isVerifying = true;
                  });
                  Timer(const Duration(seconds: 1), () {
                    _simulateFailure();
                    setState(() {
                      isVerifying = false;
                    });
                  });
                },
                icon: const Icon(Icons.error_outline, size: 18),
                label: const Text('Simulasi Gagal', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade600,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSuccessOutcome() {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.check_circle, color: Colors.green.shade600, size: 56),
          ),
          const SizedBox(height: 20),
          const Text(
            'Pembayaran Berhasil!',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Color(0xFF1F2937)),
          ),
          const SizedBox(height: 8),
          const Text(
            'E-tiket dan voucher Anda telah diterbitkan dan dapat diakses kapan saja.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.4),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFAFAFA),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _buildInfoRow('Kode Booking', booking.bookingCode, isHighlighted: true),
                const Divider(height: 20),
                _buildInfoRow('Nama Trip', booking.packageDetails?.name ?? 'Open Trip'),
                const Divider(height: 20),
                _buildInfoRow('Jumlah Tamu', '${booking.guests} Pax'),
                const Divider(height: 20),
                _buildInfoRow('Total Bayar', currencyFormatter.format(booking.totalPrice)),
                const Divider(height: 20),
                _buildInfoRow('Metode Pembayaran', booking.paymentMethod),
              ],
            ),
          ),
          const SizedBox(height: 30),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // Navigate to booking detail (index 9)
                widget.onNavigate(9, arguments: {'booking': booking});
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F8B8D),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: const Text('Lihat Detail Booking & Tiket', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () {
              // Navigate to Booking list (index 2)
              widget.onNavigate(2);
            },
            child: const Text('Pergi ke Booking Saya', style: TextStyle(color: Color(0xFF0F8B8D), fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildFailedOutcome() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.cancel, color: Colors.red.shade600, size: 56),
          ),
          const SizedBox(height: 20),
          const Text(
            'Pembayaran Gagal!',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Color(0xFF1F2937)),
          ),
          const SizedBox(height: 8),
          Text(
            errorMessage ?? 'Sistem mendeteksi transaksi tidak diselesaikan tepat waktu.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.4),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFAFAFA),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _buildInfoRow('Kode Booking', booking.bookingCode),
                const Divider(height: 20),
                _buildInfoRow('Alasan Gagal', 'Checkout Expired / Waktu habis', valueColor: Colors.red.shade600),
                const Divider(height: 20),
                _buildInfoRow('Metode', booking.paymentMethod),
              ],
            ),
          ),
          const SizedBox(height: 30),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // Navigate back to payment screen (index 7)
                widget.onNavigate(7, arguments: {'booking': booking});
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF374151),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: const Text('Kembali ke Menu Pembayaran', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () {
              // Navigate back to home (index 0)
              widget.onNavigate(0);
            },
            child: const Text('Kembali ke Beranda', style: TextStyle(color: Color(0xFF6B7280), fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {bool isHighlighted = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF6B7280), fontSize: 12)),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? (isHighlighted ? const Color(0xFF0F8B8D) : const Color(0xFF1F2937)),
            fontWeight: isHighlighted ? FontWeight.w800 : FontWeight.bold,
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}
