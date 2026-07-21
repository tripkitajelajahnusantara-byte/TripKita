import 'package:flutter/material.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';
import 'package:intl/intl.dart';

class HomeScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;

  const HomeScreen({
    Key? key,
    required this.onNavigate,
  }) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Search state variables
  String _selectedDestination = 'Raja Ampat, Papua';
  DateTime _selectedDate = DateTime(2024, 5, 28);
  int _selectedParticipants = 1;
  String _selectedCategory = 'Semua Tipe';

  // Realistic mock data matching backend schema and references
  final List<TripPackage> popularTrips = [
    TripPackage(
      id: 1,
      providerId: 101,
      name: 'Open Trip Raja Ampat',
      destination: 'Raja Ampat, Papua',
      price: 2750000,
      quotaUsed: 4,
      quotaMax: 16,
      schedule: '2024-05-25, 2024-05-26, 2024-05-27, 2024-05-28, 2024-05-29, 2024-05-30, 2024-05-31',
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
        'Hari 1: Penjemputan di Bandara Sorong - Menuju Waisai - Check-in Resort - Sunset di Pantai',
        'Hari 2: Snorkeling di Pulau Wayag - Menikmati Pemandangan Puncak Wayag - Makan Siang di Pantai',
        'Hari 3: Island Hopping ke Pianemo Viewpoint - Snorkeling di Manta Point - Pasir Timbul',
        'Hari 4: Menikmati pagi di Resort - Kembali ke Sorong - Pengantaran ke Bandara Sorong'
      ],
      facilities: ['Resort Ac', 'Speedboat Premium', 'Makan 3x Sehari', 'Alat Snorkeling', 'Dokumentasi GoPro', 'Pemandu Lokal'],
      includes: ['Pianemo Entry Fee', 'Raja Ampat Pin Kartu', 'Asuransi Perjalanan', 'Transportasi Sorong - Resort (PP)'],
      excludes: ['Tiket Pesawat ke Sorong', 'Pengeluaran Pribadi', 'Tips Pemandu & Kru'],
      meetingPoint: 'Bandara Domine Eduard Osok, Sorong',
    ),
    TripPackage(
      id: 2,
      providerId: 102,
      name: 'Open Trip Labuan Bajo',
      destination: 'Labuan Bajo, NTT',
      price: 2190000,
      quotaUsed: 8,
      quotaMax: 20,
      schedule: '2024-05-25, 2024-05-28, 2024-06-01',
      status: 'Aktif',
      rating: 4.7,
      reviewCount: 98,
      duration: '3 Hari 2 Malam',
      tripType: 'Open Trip',
      minParticipants: 4,
      availableSeats: 12,
      description: 'Saksikan naga purba Komodo di habitat aslinya dan nikmati keindahan panorama Pulau Padar yang menakjubkan.',
      images: [
        'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=800',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'
      ],
      itinerary: [],
      facilities: [],
      includes: [],
      excludes: [],
      meetingPoint: 'Bandara Komodo, Labuan Bajo',
    ),
    TripPackage(
      id: 3,
      providerId: 103,
      name: 'Open Trip Belitung',
      destination: 'Belitung, Bangka Belitung',
      price: 1890000,
      quotaUsed: 2,
      quotaMax: 10,
      schedule: '2024-05-25, 2024-05-28',
      status: 'Aktif',
      rating: 4.6,
      reviewCount: 76,
      duration: '3 Hari 2 Malam',
      tripType: 'Open Trip',
      minParticipants: 4,
      availableSeats: 8,
      description: 'Nikmati pasir putih halus dan batu-batu granit ikonik di Belitung seperti di film Laskar Pelangi.',
      images: [
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800'
      ],
      itinerary: [],
      facilities: [],
      includes: [],
      excludes: [],
      meetingPoint: 'Bandara H.A.S. Hanandjoeddin, Tanjung Pandan',
    )
  ];

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero Header Section
            Stack(
              clipBehavior: Clip.none,
              children: [
                // Full Width Travel Image Background
                Container(
                  height: 380,
                  decoration: const BoxDecoration(
                    image: DecorationImage(
                      image: NetworkImage(
                        'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=1200',
                      ),
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                // Gradient Overlay
                Container(
                  height: 380,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withOpacity(0.4),
                        Colors.black.withOpacity(0.1),
                        Colors.white.withOpacity(0.9),
                        Colors.white,
                      ],
                      stops: const [0.0, 0.4, 0.9, 1.0],
                    ),
                  ),
                ),
                // Custom Navbar Inside Hero
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Logo TripKita
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: const BoxDecoration(
                                color: Color(0xFF0F8B8D),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.language, color: Colors.white, size: 20),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'TripKita',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                letterSpacing: -0.5,
                              ),
                            ),
                          ],
                        ),
                        // Actions (Notification, Chat, Profile/Login)
                        Row(
                          children: [
                            // Notification Icon with Badge
                            _buildIconButton(
                              icon: Icons.notifications_none,
                              badgeCount: 3,
                              onPressed: () {},
                            ),
                            const SizedBox(width: 12),
                            // Chat Icon with Badge
                            _buildIconButton(
                              icon: Icons.chat_bubble_outline,
                              badgeCount: 2,
                              onPressed: () {},
                            ),
                            const SizedBox(width: 12),
                            // Profile Login Button
                            ElevatedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.person_outline, size: 16),
                              label: const Text('Masuk', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: const Color(0xFF0F8B8D),
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30),
                                  side: BorderSide(color: Colors.grey.shade200, width: 1),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                // Hero Tagline
                Positioned(
                  top: 130,
                  left: 20,
                  right: 20,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Temukan perjalanan\nterbaik untukmu ✨',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Jelajahi destinasi impian dan ciptakan\nmomen tak terlupakan bersama TripKita.',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.white.withOpacity(0.9),
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                // Floating Search Widget
                Positioned(
                  top: 240,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.95),
                      borderRadius: BorderRadius.circular(24.0),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Row 1: Destination and Date
                        Row(
                          children: [
                            Expanded(
                              child: _buildSearchField(
                                icon: Icons.location_on_outlined,
                                title: 'Destinasi',
                                value: _selectedDestination,
                                onTap: () {},
                              ),
                            ),
                            Container(width: 1, height: 40, color: Colors.grey.shade300),
                            Expanded(
                              child: _buildSearchField(
                                icon: Icons.calendar_today_outlined,
                                title: 'Tanggal',
                                value: DateFormat('dd MMM yyyy').format(_selectedDate),
                                onTap: () {},
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 20, thickness: 1),
                        // Row 2: Participants and Category
                        Row(
                          children: [
                            Expanded(
                              child: _buildSearchField(
                                icon: Icons.people_outline,
                                title: 'Jumlah Peserta',
                                value: '$_selectedParticipants Orang',
                                onTap: () {},
                              ),
                            ),
                            Container(width: 1, height: 40, color: Colors.grey.shade300),
                            Expanded(
                              child: _buildSearchField(
                                icon: Icons.dashboard_customize_outlined,
                                title: 'Tipe Trip',
                                value: _selectedCategory,
                                onTap: () {},
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        // Search Button
                        ElevatedButton.icon(
                          onPressed: () {
                            // Navigate to Trip List screen (Index 1)
                            widget.onNavigate(1, arguments: {
                              'destination': _selectedDestination,
                              'date': _selectedDate,
                              'participants': _selectedParticipants,
                              'category': _selectedCategory,
                            });
                          },
                          icon: const Icon(Icons.search, size: 20, color: Colors.white),
                          label: const Text(
                            'Cari Trip',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0F8B8D),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16.0),
                            ),
                            elevation: 2,
                            shadowColor: const Color(0xFF0F8B8D).withOpacity(0.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 140), // Spacer for the floating search card

            // Category shortcuts section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Kategori Trip',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: const Text('Lihat Semua', style: TextStyle(color: Color(0xFF0F8B8D), fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            _buildCategoryGrid(),

            // Popular Trips section
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Trip Populer',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                  ),
                  TextButton(
                    onPressed: () {
                      widget.onNavigate(1); // Go to Trip List screen
                    },
                    child: const Text('Lihat Semua', style: TextStyle(color: Color(0xFF0F8B8D), fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 380,
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                scrollDirection: Axis.horizontal,
                itemCount: popularTrips.length,
                itemBuilder: (context, index) {
                  final trip = popularTrips[index];
                  return Container(
                    width: 280,
                    margin: const EdgeInsets.only(right: 16.0),
                    child: TripCardWidget(
                      package: trip,
                      onTap: () {
                        widget.onNavigate(5, arguments: {'package': trip}); // Detail screen (Index 5)
                      },
                    ),
                  );
                },
              ),
            ),

            // Promotional Banner
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Container(
                padding: const EdgeInsets.all(20.0),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [const Color(0xFF0F8B8D), const Color(0xFF1EAEB1)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24.0),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0F8B8D).withOpacity(0.2),
                      blurRadius: 15,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(30),
                            ),
                            child: const Text(
                              'Promo Spesial',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Diskon Hingga 15% OFF',
                            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Periode promo:\n1 - 31 Mei 2024',
                            style: TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Center(
                        child: Icon(
                          Icons.flight_takeoff,
                          size: 72,
                          color: Colors.white.withOpacity(0.3),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Recommendations section
            const SizedBox(height: 28),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Rekomendasi Untuk Kamu',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: const Text('Lihat Semua', style: TextStyle(color: Color(0xFF0F8B8D), fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 0.75,
                ),
                itemCount: popularTrips.length >= 2 ? 2 : popularTrips.length,
                itemBuilder: (context, index) {
                  final trip = popularTrips[index];
                  return GestureDetector(
                    onTap: () {
                      widget.onNavigate(5, arguments: {'package': trip});
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          )
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                              child: Image.network(
                                trip.images[0],
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  trip.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1F2937)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(Icons.location_on, size: 12, color: Colors.grey.shade400),
                                    const SizedBox(width: 2),
                                    Expanded(
                                      child: Text(
                                        trip.destination,
                                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  currencyFormatter.format(trip.price),
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F8B8D)),
                                )
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
      bottomNavigationBar: TripKitaBottomNavigation(
        currentIndex: 0,
        onTap: (index) {
          widget.onNavigate(index);
        },
      ),
    );
  }

  Widget _buildIconButton({
    required IconData icon,
    required int badgeCount,
    required VoidCallback onPressed,
  }) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withOpacity(0.4), width: 1.5),
          ),
          child: IconButton(
            icon: Icon(icon, color: Colors.white, size: 20),
            padding: EdgeInsets.zero,
            onPressed: onPressed,
          ),
        ),
        if (badgeCount > 0)
          Positioned(
            top: -2,
            right: -2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(
                minWidth: 16,
                minHeight: 16,
              ),
              child: Text(
                badgeCount.toString(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildSearchField({
    required IconData icon,
    required String title,
    required String value,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(4.0),
        child: Row(
          children: [
            Icon(icon, size: 20, color: const Color(0xFF0F8B8D)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF374151)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(Icons.keyboard_arrow_down, size: 18, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryGrid() {
    final List<Map<String, dynamic>> categories = [
      {'name': 'Open Trip', 'icon': Icons.groups_outlined, 'color': const Color(0xFFE0F2F1)},
      {'name': 'Private Trip', 'icon': Icons.door_front_door_outlined, 'color': const Color(0xFFE3F2FD)},
      {'name': 'Honeymoon', 'icon': Icons.favorite_border, 'color': const Color(0xFFFCE4EC)},
      {'name': 'Family', 'icon': Icons.family_restroom, 'color': const Color(0xFFE8F5E9)},
      {'name': 'Corporate', 'icon': Icons.business_center_outlined, 'color': const Color(0xFFF3E5F5)},
    ];

    return SizedBox(
      height: 95,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          return Padding(
            padding: const EdgeInsets.only(right: 18.0),
            child: InkWell(
              onTap: () {
                widget.onNavigate(1, arguments: {'category': cat['name']});
              },
              child: Column(
                children: [
                  Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      color: cat['color'],
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Icon(cat['icon'] as IconData, color: const Color(0xFF0F8B8D), size: 28),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    cat['name'] as String,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF4B5563)),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
