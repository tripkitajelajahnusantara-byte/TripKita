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

  @override
  Widget build(BuildContext context) {
    // Read bookings from memory
    final List<Booking> allBookings = Booking.mockBookings;

    // Filter bookings based on active filter
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

    // Sort bookings: newest created first
    filteredBookings.sort((a, b) => b.createdAt.compareTo(a.createdAt));

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        automaticallyImplyLeading: false,
        title: const Text(
          'Booking Saya',
          style: TextStyle(color: Color(0xFF1F2937), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Filter Chips Section
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12.0, horizontal: 16.0),
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
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
          const SizedBox(height: 8),

          // Bookings List Section
          Expanded(
            child: filteredBookings.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                    itemCount: filteredBookings.length,
                    itemBuilder: (context, index) {
                      final booking = filteredBookings[index];
                      return _buildBookingCard(booking);
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar: TripKitaBottomNavigation(
        currentIndex: 2, // Booking tab is index 2
        onTap: (index) {
          widget.onNavigate(index);
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey.shade400),
            ),
            const SizedBox(height: 24),
            const Text(
              'Belum Ada Booking',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1F2937)),
            ),
            const SizedBox(height: 8),
            Text(
              'Anda belum memiliki transaksi booking dengan status filter "$selectedFilter". Yuk, cari open trip menarik di TripKita!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500, height: 1.4),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                widget.onNavigate(1); // Go to Trip List screen (Index 1)
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F8B8D),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: const Text('Jelajahi Open Trip', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            ),
          ],
        ),
      ),
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
