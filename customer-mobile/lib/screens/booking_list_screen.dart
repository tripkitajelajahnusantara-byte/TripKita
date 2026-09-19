import 'package:flutter/material.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:intl/intl.dart';

class BookingListScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;
  final Map<String, dynamic>? arguments;

  const BookingListScreen({
    Key? key,
    required this.onNavigate,
    this.arguments,
  }) : super(key: key);

  @override
  State<BookingListScreen> createState() => _BookingListScreenState();
}

class _BookingListScreenState extends State<BookingListScreen> {
  String selectedFilter = 'Semua'; // Semua, Berhasil, Menunggu, Gagal
  final TextEditingController _trackCodeController = TextEditingController();
  Booking? _trackedBooking;
  String? _trackError;

  void _handleTrackTicket() {
    final code = _trackCodeController.text.trim();
    if (code.isEmpty) return;

    final List<Booking> allBookings = Booking.mockBookings;
    final foundIndex = allBookings.indexWhere(
      (b) => b.bookingCode.toLowerCase() == code.toLowerCase() || b.id.toLowerCase() == code.toLowerCase(),
    );

    setState(() {
      if (foundIndex != -1) {
        _trackedBooking = allBookings[foundIndex];
        _trackError = null;
      } else {
        _trackedBooking = null;
        _trackError = 'Kode booking tidak ditemukan. Mohon periksa kembali kode Anda.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<Booking> allBookings = Booking.mockBookings;

    final List<Booking> filteredBookings = allBookings.where((booking) {
      if (selectedFilter == 'Semua') return true;
      if (selectedFilter == 'Berhasil') {
        return booking.status == 'PAID' || booking.status == 'CONFIRMED' || booking.status == 'COMPLETED';
      }
      if (selectedFilter == 'Menunggu') {
        return booking.status == 'PENDING_PAYMENT';
      }
      if (selectedFilter == 'Gagal') {
        return booking.status == 'FAILED' || booking.status == 'EXPIRED';
      }
      return true;
    }).toList();

    filteredBookings.sort((a, b) => b.createdAt.compareTo(a.createdAt));

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        automaticallyImplyLeading: false,
        title: const Text(
          'Cek Booking',
          style: TextStyle(color: Color(0xFF1F2937), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Track Ticket Widget (Aligned with Customer Web)
            _buildTrackTicketCard(),
            const SizedBox(height: 20),

            // History Header Title
            const Text(
              'Detail Status Pemesanan Tiket',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.extrabold,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 12),

            // Guest Mode Empty State OR Filtered Bookings List
            _buildGuestOrBookingsContent(filteredBookings),
          ],
        ),
      ),
      bottomNavigationBar: TripKitaBottomNavigation(
        currentIndex: 2,
        onTap: (index) {
          widget.onNavigate(index);
        },
      ),
    );
  }

  Widget _buildTrackTicketCard() {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Lacak Tiket Pesanan Anda',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.extrabold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Ingin mencari pesanan Anda yang hilang? Masukkan Kode Booking (Contoh: TK-2824-xxxx) di bawah ini.',
            style: TextStyle(
              fontSize: 12,
              color: Color(0xFF64748B),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),

          TextField(
            controller: _trackCodeController,
            decoration: InputDecoration(
              hintText: 'Masukkan Kode Booking Anda...',
              hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
          const SizedBox(height: 10),

          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: _handleTrackTicket,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF007BFF),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: const Text('Cari Tiket', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ),

          if (_trackError != null) ...[
            const SizedBox(height: 10),
            Text(
              _trackError!,
              style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ],

          if (_trackedBooking != null) ...[
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            const Text(
              'Hasil Pencarian Tiket',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _trackedBooking!.bookingCode,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                      ),
                      _buildStatusBadge(_trackedBooking!.status),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _trackedBooking!.packageDetails?.name ?? 'Open Trip Special',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tanggal: ${DateFormat("dd MMM yyyy").format(_trackedBooking!.tripDate)} • ${_trackedBooking!.guests} Pax',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        currencyFormatter.format(_trackedBooking!.totalPrice),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.extrabold, color: Color(0xFF00A896)),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          widget.onNavigate(9, arguments: {'booking': _trackedBooking});
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F8B8D),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        ),
                        child: const Text('Lihat Detail', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildGuestOrBookingsContent(List<Booking> filteredBookings) {
    // Guest Mode State (matching screenshot when no bookings in list)
    if (filteredBookings.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                color: Color(0xFFEFF6FF),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.calendar_month_rounded, color: Color(0xFF007BFF), size: 28),
            ),
            const SizedBox(height: 16),
            const Text(
              'Melacak Tiket Pesanan (Mode Tamu)',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Anda saat ini mengakses tanpa akun. Masukkan Kode Booking yang telah Anda salin pada kolom pencarian di atas untuk melacak pesanan Anda.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: Color(0xFF64748B),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: () {
                    widget.onNavigate(4); // Profile screen (Login)
                  },
                  icon: const Icon(Icons.key, size: 14, color: Colors.white),
                  label: const Text('Masuk ke Akun Saya', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF007BFF),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton(
                  onPressed: () {
                    widget.onNavigate(0); // Home screen
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF475569),
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Cari Paket Wisata', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Filter Chips Row
        Container(
          color: Colors.transparent,
          child: Row(
            children: ['Semua', 'Berhasil', 'Menunggu', 'Gagal'].map((filter) {
              final isSelected = selectedFilter == filter;
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: ChoiceChip(
                  label: Text(
                    filter == 'Gagal' ? 'Gagal / Batal' : filter,
                    style: TextStyle(
                      color: isSelected ? Colors.white : const Color(0xFF4B5563),
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: const Color(0xFF0F8B8D),
                  backgroundColor: Colors.grey.shade100,
                  elevation: 0,
                  pressElevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        selectedFilter = filter;
                      });
                    }
                  },
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 12),

        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: filteredBookings.length,
          itemBuilder: (context, index) {
            final booking = filteredBookings[index];
            return _buildBookingCard(booking);
          },
        ),
      ],
    );
  }

  Widget _buildBookingCard(Booking booking) {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    final package = booking.packageDetails;
    final String packageImageUrl = (package?.images != null && package!.images.isNotEmpty)
        ? package.images[0]
        : 'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=800';

    return Container(
      margin: const EdgeInsets.only(bottom: 16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              // Navigate to Booking Detail Screen (Index 9)
              widget.onNavigate(9, arguments: {'booking': booking});
            },
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Booking Code & Status Badge Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        booking.bookingCode,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: Colors.grey.shade500,
                          letterSpacing: 0.5,
                        ),
                      ),
                      _buildStatusBadge(booking.status),
                    ],
                  ),
                  const Divider(height: 24, thickness: 1),

                  // Trip Summary (Thumbnail, Title, Destination)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          image: DecorationImage(
                            image: NetworkImage(packageImageUrl),
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              package?.name ?? 'Open Trip Special',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: Color(0xFF1F2937),
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 12, color: Color(0xFF0F8B8D)),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    package?.destination ?? 'Destinasi Wisata',
                                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Icon(Icons.calendar_today_outlined, size: 12, color: Colors.grey.shade400),
                                const SizedBox(width: 4),
                                Text(
                                  DateFormat('dd MMM yyyy').format(booking.tripDate),
                                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                                ),
                                const SizedBox(width: 10),
                                Icon(Icons.people_outline, size: 12, color: Colors.grey.shade400),
                                const SizedBox(width: 4),
                                Text(
                                  '${booking.guests} Pax',
                                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24, thickness: 1),

                  // Price and Detail Button Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Total Pembayaran', style: TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                          const SizedBox(height: 2),
                          Text(
                            currencyFormatter.format(booking.totalPrice),
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F8B8D),
                            ),
                          ),
                        ],
                      ),
                      // Action indicator
                      Row(
                        children: [
                          if (booking.status == 'COMPLETED' || booking.status == 'PAID' || booking.status == 'CONFIRMED')
                            Padding(
                              padding: const EdgeInsets.only(right: 8.0),
                              child: OutlinedButton.icon(
                                onPressed: () => _showReviewDialog(context, booking),
                                icon: Icon(Icons.star, size: 14, color: booking.hasReviewed ? Colors.grey : Colors.amber),
                                label: Text(
                                  booking.hasReviewed ? 'Ulasan Ada' : 'Beri Ulasan',
                                  style: TextStyle(fontSize: 11, color: booking.hasReviewed ? Colors.grey.shade600 : Colors.amber.shade900),
                                ),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  side: BorderSide(color: booking.hasReviewed ? Colors.grey.shade300 : Colors.amber.shade400),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ),
                          Text(
                            booking.status == 'PENDING_PAYMENT' ? 'Bayar Sekarang' : 'Lihat Detail',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: booking.status == 'PENDING_PAYMENT' ? Colors.orange.shade700 : const Color(0xFF0F8B8D),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.chevron_right,
                            size: 16,
                            color: booking.status == 'PENDING_PAYMENT' ? Colors.orange.shade700 : const Color(0xFF0F8B8D),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showReviewDialog(BuildContext context, Booking booking) {
    double stars = booking.reviewRating ?? 5.0;
    final textController = TextEditingController(text: booking.reviewComment ?? '');

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulWidget(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('Beri Ulasan & Rating', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Paket: ${booking.packageDetails?.name ?? "Trip Kita"}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F8B8D))),
                    const SizedBox(height: 12),
                    const Text('Rating Bintang:', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (idx) {
                        return IconButton(
                          icon: Icon(
                            idx < stars ? Icons.star : Icons.star_border,
                            color: Colors.amber,
                            size: 28,
                          ),
                          onPressed: () {
                            setDialogState(() {
                              stars = (idx + 1).toDouble();
                            });
                          },
                        );
                      }),
                    ),
                    const SizedBox(height: 12),
                    const Text('Ulasan / Pengalaman Anda:', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: textController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'Tuliskan pengalaman menyenangkan selama trip ini...',
                        hintStyle: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.all(10),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogCtx),
                  child: const Text('Batal', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      booking.hasReviewed = true;
                      booking.reviewRating = stars;
                      booking.reviewComment = textController.text;
                    });
                    Navigator.pop(dialogCtx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Terima kasih! Ulasan Anda telah terkirim ke Provider.'),
                        backgroundColor: Color(0xFF0F8B8D),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F8B8D),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Kirim Ulasan', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildStatusBadge(String status) {
    String text = 'Menunggu';
    Color bg = Colors.orange.shade50;
    Color fg = Colors.orange.shade700;

    if (status == 'PAID' || status == 'CONFIRMED' || status == 'COMPLETED') {
      text = 'Berhasil';
      bg = Colors.green.shade50;
      fg = Colors.green.shade700;
    } else if (status == 'FAILED' || status == 'EXPIRED') {
      text = 'Gagal / Batal';
      bg = Colors.red.shade50;
      fg = Colors.red.shade700;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: fg,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
