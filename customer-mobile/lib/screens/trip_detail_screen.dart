import 'package:flutter/material.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:intl/intl.dart';

class TripDetailScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;
  final Map<String, dynamic>? arguments;

  const TripDetailScreen({
    Key? key,
    required this.onNavigate,
    this.arguments,
  }) : super(key: key);

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> with SingleTickerProviderStateMixin {
  late TripPackage package;
  int currentCarouselPage = 0;
  String activeTab = 'Deskripsi';
  String? selectedDepartureDate;
  int participantCount = 2; // Default to 2 participants
  bool isWishlisted = false;
  bool isLoggedIn = false;

  final PageController _carouselController = PageController();

  // Departure schedules parsed from backend schedule string
  List<String> departureDates = [];

  @override
  void initState() {
    super.initState();
    // Retrieve package from arguments, or fallback to mock
    if (widget.arguments != null && widget.arguments!['package'] != null) {
      package = widget.arguments!['package'] as TripPackage;
    } else {
      // Fallback default mock
      package = TripPackage(
        id: 1,
        providerId: 101,
        name: 'Open Trip Raja Ampat',
        destination: 'Raja Ampat, Papua',
        price: 2750000,
        quotaUsed: 4,
        quotaMax: 16,
        schedule: '25 Mei, 26 Mei, 27 Mei, 28 Mei, 29 Mei, 30 Mei, 31 Mei',
        status: 'Aktif',
        rating: 4.8,
        reviewCount: 120,
        duration: '4 Hari 3 Malam',
        tripType: 'Open Trip',
        minParticipants: 4,
        availableSeats: 12,
        description: 'Jelajahi keindahan surga tersembunyi di Raja Ampat. Nikmati laut biru jernih, gugusan pulau karst yang memukau, dan pengalaman snorkeling tak terlupakan bersama trip open trip seru ini!',
        images: [
          'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=800',
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
          'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
          'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800'
        ],
        itinerary: [
          'Hari 1: Penjemputan Sorong - Menuju Waisai - Check-in Resort',
          'Hari 2: Snorkeling di Pulau Wayag - Puncak Wayag',
          'Hari 3: Island Hopping Pianemo - Manta Point - Pasir Timbul',
          'Hari 4: Kembali ke Sorong - Airport Drop-off'
        ],
        facilities: ['Resort Ac', 'Speedboat Premium', 'Makan 3x Sehari', 'Alat Snorkeling', 'Dokumentasi GoPro', 'Pemandu Lokal'],
        includes: ['Pianemo Entry Fee', 'Raja Ampat Pin Kartu', 'Asuransi Perjalanan', 'Transportasi Sorong - Resort (PP)'],
        excludes: ['Tiket Pesawat ke Sorong', 'Pengeluaran Pribadi', 'Tips Pemandu & Kru'],
        meetingPoint: 'Bandara Domine Eduard Osok, Sorong',
      );
    }

    // Split backend schedule string to list
    departureDates = package.schedule.split(',').map((e) => e.trim()).toList();
    if (departureDates.isNotEmpty) {
      selectedDepartureDate = departureDates[3]; // Default active selection (e.g. 28 Mei)
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    int totalPrice = package.price * participantCount;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image Carousel with Page indicator & Overlays
            Stack(
              children: [
                SizedBox(
                  height: 320,
                  child: PageView.builder(
                    controller: _carouselController,
                    itemCount: package.images.length,
                    onPageChanged: (index) {
                      setState(() {
                        currentCarouselPage = index;
                      });
                    },
                    itemBuilder: (context, index) {
                      return Image.network(
                        package.images[index],
                        fit: BoxFit.cover,
                      );
                    },
                  ),
                ),
                // Carousel Counter Indicator badge (1 / 12 style)
                Positioned(
                  bottom: 20,
                  right: 20,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${currentCarouselPage + 1} / ${package.images.length}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                // Page Indicator Dots
                Positioned(
                  bottom: 20,
                  left: 0,
                  right: 0,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      package.images.length,
                      (index) => Container(
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: currentCarouselPage == index ? 16 : 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: currentCarouselPage == index ? const Color(0xFF0F8B8D) : Colors.white70,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ),
                ),
                // Navigation overlays
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Back Button
                        Container(
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          child: IconButton(
                            icon: const Icon(Icons.arrow_back, color: Color(0xFF1F2937)),
                            onPressed: () => widget.onNavigate(1), // Back to list
                          ),
                        ),
                        // Action buttons (Share & Wishlist)
                        Row(
                          children: [
                            Container(
                              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                              child: IconButton(
                                icon: const Icon(Icons.share_outlined, color: Color(0xFF1F2937)),
                                onPressed: () {},
                              ),
                            ),
                            const SizedBox(width: 12),
                            Container(
                              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                              child: IconButton(
                                icon: Icon(
                                  isWishlisted ? Icons.favorite : Icons.favorite_border,
                                  color: isWishlisted ? Colors.red : const Color(0xFF1F2937),
                                ),
                                onPressed: () {
                                  setState(() {
                                    isWishlisted = !isWishlisted;
                                  });
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Content Container
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Badge Open Trip / Category
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F8B8D).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      package.tripType.toUpperCase(),
                      style: const TextStyle(
                        color: Color(0xFF0F8B8D),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Package Name
                  Text(
                    package.name,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Location, Rating, Total joined
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined, size: 16, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        package.destination,
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                      ),
                      const SizedBox(width: 12),
                      Icon(Icons.star, size: 16, color: Colors.amber.shade600),
                      const SizedBox(width: 2),
                      Text(
                        package.rating.toString(),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        ' (${package.reviewCount} ulasan)',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Participants Joined text
                  Row(
                    children: [
                      Icon(Icons.people_outline, size: 16, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        '1.2K+ sudah bergabung',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),
                  // Provider Public Profile Card
                  _buildProviderPublicCard(),

                  const SizedBox(height: 16),
                  // Summary Information Cards Grid
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade100),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildSummaryItem(Icons.access_time, 'Durasi', package.duration),
                        _buildSummaryItem(Icons.explore_outlined, 'Tipe Trip', package.tripType),
                        _buildSummaryItem(Icons.person_outline, 'Min. Peserta', '${package.minParticipants} Orang'),
                        _buildSummaryItem(Icons.chair_alt_outlined, 'Seat Tersedia', '${package.availableSeats} Seat'),
                      ],
                    ),
                  ),

                  // Tab Navigation
                  const SizedBox(height: 24),
                  _buildTabNavBar(),
                  const SizedBox(height: 16),
                  // Active Tab Content
                  _buildActiveTabContent(),

                  // Gallery Highlights
                  const SizedBox(height: 24),
                  const Text(
                    'Highlight Destinasi',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 100,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: package.images.length,
                      itemBuilder: (context, index) {
                        return Container(
                          width: 100,
                          margin: const EdgeInsets.only(right: 12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            image: DecorationImage(
                              image: NetworkImage(package.images[index]),
                              fit: BoxFit.cover,
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  // Departure Date Selection Card list
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Pilih Tanggal Keberangkatan',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                      ),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 4),
                          Text('Tersedia ${package.availableSeats} Seat', style: const TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 70,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: departureDates.length,
                      itemBuilder: (context, index) {
                        final dateStr = departureDates[index];
                        final bool isSelected = selectedDepartureDate == dateStr;

                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              selectedDepartureDate = dateStr;
                            });
                          },
                          child: Container(
                            width: 80,
                            margin: const EdgeInsets.only(right: 10),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF0F8B8D).withOpacity(0.08) : Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF0F8B8D) : Colors.grey.shade200,
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  dateStr.split(' ')[0], // Day (e.g. 28)
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: isSelected ? const Color(0xFF0F8B8D) : const Color(0xFF1F2937),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  dateStr.split(' ')[1], // Month (e.g. Mei)
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: isSelected ? const Color(0xFF0F8B8D) : Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  // Open Trip Quota Info Box
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline, size: 18, color: Color(0xFFD97706)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Status Open Trip: Min. Kuota ${package.minParticipants > 0 ? package.minParticipants : 4} pax. '
                            'Terisi: ${package.quotaUsed}/${package.minParticipants > 0 ? package.minParticipants : 4} pax '
                            '${(package.minParticipants > 0 ? package.minParticipants : 4) > package.quotaUsed ? "(Kurang ${(package.minParticipants > 0 ? package.minParticipants : 4) - package.quotaUsed} pax lagi agar PASTI BERANGKAT)" : "(PASTI BERANGKAT)"}',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF92400E), fontWeight: FontWeight.bold, height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Participant selector
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAFAFA),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Jumlah Peserta', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 4),
                            Text('Minimal ${package.minParticipants} orang', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                          ],
                        ),
                        Row(
                          children: [
                            // Minus Button
                            IconButton(
                              onPressed: () {
                                if (participantCount > 1) {
                                  setState(() {
                                    participantCount--;
                                  });
                                }
                              },
                              icon: const Icon(Icons.remove_circle_outline),
                              color: const Color(0xFF0F8B8D),
                            ),
                            Text(
                              '$participantCount Orang',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            // Plus Button
                            IconButton(
                              onPressed: () {
                                if (participantCount < package.availableSeats) {
                                  setState(() {
                                    participantCount++;
                                  });
                                }
                              },
                              icon: const Icon(Icons.add_circle_outline),
                              color: const Color(0xFF0F8B8D),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),

      // Price Ticker & Booking sticky bottom bar
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
            // Pricing layout
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Harga', style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
                      const SizedBox(height: 2),
                      Text(
                        currencyFormatter.format(totalPrice),
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F8B8D),
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text('Termasuk pajak & biaya layanan', style: TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                    ],
                  ),
                  SizedBox(
                    width: 180,
                    child: ElevatedButton(
                      onPressed: () {
                        if (!isLoggedIn) {
                          _showLoginModal(context);
                        } else {
                          widget.onNavigate(6, arguments: {
                            'package': package,
                            'participants': participantCount,
                            'selectedDate': selectedDepartureDate,
                            'totalPrice': totalPrice,
                          });
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F8B8D),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        'Pesan Sekarang',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Reuses the identical BottomNavigationBar (Trip is index 1 active)
            TripKitaBottomNavigation(
              currentIndex: 1, // Trip active
              onTap: (index) {
                widget.onNavigate(index);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryItem(IconData icon, String title, String value) {
    return Column(
      children: [
        Icon(icon, color: const Color(0xFF0F8B8D), size: 20),
        const SizedBox(height: 6),
        Text(title, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF374151))),
      ],
    );
  }

  Widget _buildTabNavBar() {
    final tabs = ['Deskripsi', 'Itinerary', 'Fasilitas', 'Include', 'Exclude', 'Meeting Point', 'Ulasan'];
    return SizedBox(
      height: 38,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: tabs.length,
        itemBuilder: (context, index) {
          final tabName = tabs[index];
          final bool isActive = activeTab == tabName;

          return Padding(
            padding: const EdgeInsets.only(right: 12.0),
            child: InkWell(
              onTap: () {
                setState(() {
                  activeTab = tabName;
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: isActive ? const Color(0xFF0F8B8D) : Colors.transparent,
                      width: 2.0,
                    ),
                  ),
                ),
                child: Text(
                  tabName,
                  style: TextStyle(
                    color: isActive ? const Color(0xFF0F8B8D) : Colors.grey.shade500,
                    fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildActiveTabContent() {
    switch (activeTab) {
      case 'Deskripsi':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Tentang Perjalanan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 6),
            Text(
              package.description,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.5),
            ),
          ],
        );
      case 'Itinerary':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: package.itinerary.map((item) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 6),
                    child: Icon(Icons.circle, size: 8, color: Color(0xFF0F8B8D)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      item,
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        );
      case 'Fasilitas':
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: package.facilities.map((facility) {
            return Chip(
              backgroundColor: Colors.grey.shade50,
              avatar: const Icon(Icons.check, size: 14, color: Color(0xFF0F8B8D)),
              label: Text(facility, style: const TextStyle(fontSize: 11)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            );
          }).toList(),
        );
      case 'Include':
        return Column(
          children: package.includes.map((inc) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4.0),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Colors.green, size: 18),
                  const SizedBox(width: 8),
                  Text(inc, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
                ],
              ),
            );
          }).toList(),
        );
      case 'Exclude':
        return Column(
          children: package.excludes.map((exc) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4.0),
              child: Row(
                children: [
                  const Icon(Icons.cancel_outlined, color: Colors.red, size: 18),
                  const SizedBox(width: 8),
                  Text(exc, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
                ],
              ),
            );
          }).toList(),
        );
      case 'Meeting Point':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.flag_outlined, color: Color(0xFF0F8B8D)),
                const SizedBox(width: 8),
                Text(package.meetingPoint, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Detail lokasi penjemputan dan nomor kontak koordinator lapangan akan dikirimkan 2 hari sebelum keberangkatan melalui WhatsApp.',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500, height: 1.4),
            ),
          ],
        );
      case 'Ulasan':
        final reviews = package.reviews.isNotEmpty
            ? package.reviews
            : [
                ReviewItem(
                  id: 1,
                  packageId: package.id,
                  customerName: 'Rian Hidayat',
                  customerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
                  rating: 5.0,
                  comment: 'Trip paling berkesan! Pemandu ramah, resort bersih, dan spot snorkeling-nya luar biasa indah.',
                  date: '12 Mei 2024',
                  providerResponse: 'Terima kasih Kak Rian! Sampai jumpa di trip berikutnya bersama kami.',
                ),
                ReviewItem(
                  id: 2,
                  packageId: package.id,
                  customerName: 'Anisa Putri',
                  customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
                  rating: 4.5,
                  comment: 'Makanan enak dan jadwal tepat waktu. Sangat direkomendasikan untuk liburan keluarga!',
                  date: '28 April 2024',
                ),
              ];

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.star, color: Colors.amber, size: 24),
                const SizedBox(width: 8),
                Text(
                  package.rating > 0 ? package.rating.toStringAsFixed(1) : '4.8',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF1F2937)),
                ),
                Text(
                  ' / 5.0 (${reviews.length} Ulasan)',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...reviews.map((rev) {
              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundImage: NetworkImage(rev.customerAvatar.isNotEmpty ? rev.customerAvatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(rev.customerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                              Text(rev.date, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                            ],
                          ),
                        ),
                        Row(
                          children: List.generate(
                            5,
                            (starIndex) => Icon(
                              starIndex < rev.rating ? Icons.star : Icons.star_border,
                              color: Colors.amber,
                              size: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(rev.comment, style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.4)),
                    if (rev.providerResponse != null && rev.providerResponse!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0F2F1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Respon Provider: ${rev.providerResponse}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF0F8B8D), fontStyle: FontStyle.italic),
                        ),
                      ),
                    ],
                  ],
                ),
              );
            }).toList(),
          ],
        );
      default:
        return const SizedBox();
    }
  }

  Widget _buildProviderPublicCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'DISELENGGARAKAN OLEH MITRA PROVIDER',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Color(0xFF64748B),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              InkWell(
                onTap: () {
                  widget.onNavigate(10, arguments: {
                    'providerName': package.providerName,
                    'providerCity': package.destination,
                  });
                },
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF007BFF),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    package.providerName.isNotEmpty ? package.providerName[0].toUpperCase() : 'B',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: () {
                    widget.onNavigate(10, arguments: {
                      'providerName': package.providerName,
                      'providerCity': package.destination,
                    });
                  },
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        package.providerName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(Icons.location_on, size: 12, color: Colors.grey.shade500),
                          const SizedBox(width: 2),
                          Text(
                            package.destination.split(',')[0],
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                          ),
                          const SizedBox(width: 6),
                          const Text('•', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          const SizedBox(width: 6),
                          Icon(Icons.star, size: 12, color: Colors.amber.shade600),
                          const SizedBox(width: 2),
                          Text(
                            package.rating > 0 ? '${package.rating}' : 'Belum ada rating',
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade700, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () {
                  widget.onNavigate(10, arguments: {
                    'providerName': package.providerName,
                    'providerCity': package.destination,
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF0F7FF),
                  foregroundColor: const Color(0xFF007BFF),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: const BorderSide(color: Color(0xFFBFDBFE)),
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Lihat Profil & Paket', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    SizedBox(width: 2),
                    Icon(Icons.chevron_right, size: 14),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showLoginModal(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.public, color: Color(0xFF0F8B8D), size: 24),
                        SizedBox(width: 8),
                        Text('TemenTrip', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF0F8B8D))),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.grey),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Masuk ke TemenTrip',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Silakan masuk untuk melanjutkan pemesanan paket wisata.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),
                // Tabs Masuk / Daftar
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: const Text('Masuk', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF007BFF))),
                        ),
                      ),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          alignment: Alignment.center,
                          child: const Text('Daftar Akun', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF64748B))),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                // Email input
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Alamat Email', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F7FF),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: const TextField(
                        controller: null,
                        decoration: InputDecoration(
                          hintText: 'testing@gmail.com',
                          prefixIcon: Icon(Icons.mail_outline, size: 16, color: Color(0xFF64748B)),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Password input
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Kata Sandi', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F7FF),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: const TextField(
                        obscureText: true,
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          prefixIcon: Icon(Icons.lock_outline, size: 16, color: Color(0xFF64748B)),
                          suffixIcon: Icon(Icons.visibility_outlined, size: 16, color: Color(0xFF64748B)),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                // Submit Login button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() {
                        isLoggedIn = true;
                      });
                      Navigator.of(ctx).pop();
                      widget.onNavigate(6, arguments: {
                        'package': package,
                        'participants': participantCount,
                        'selectedDate': selectedDepartureDate,
                        'totalPrice': package.price * participantCount,
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF007BFF),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Masuk Sekarang', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward, size: 16),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: const [
                    Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8.0),
                      child: Text('atau', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    ),
                    Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                  ],
                ),
                const SizedBox(height: 14),
                // Google Login button
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      setState(() {
                        isLoggedIn = true;
                      });
                      Navigator.of(ctx).pop();
                      widget.onNavigate(6, arguments: {
                        'package': package,
                        'participants': participantCount,
                        'selectedDate': selectedDepartureDate,
                        'totalPrice': package.price * participantCount,
                      });
                    },
                    icon: const Icon(Icons.g_mobiledata, size: 24, color: Colors.red),
                    label: const Text('Masuk dengan Google', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// Small helper widget for margin in custom icons
extension WidgetMargin on Widget {
  Widget margin({required EdgeInsets margin}) {
    return Container(
      margin: margin,
      child: this,
    );
  }
}
