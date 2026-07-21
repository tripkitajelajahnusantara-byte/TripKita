import 'package:flutter/material.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:customer_mobile/widgets/trip_card_widget.dart';

class TripListScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;
  final Map<String, dynamic>? arguments;

  const TripListScreen({
    Key? key,
    required this.onNavigate,
    this.arguments,
  }) : super(key: key);

  @override
  State<TripListScreen> createState() => _TripListScreenState();
}

class _TripListScreenState extends State<TripListScreen> {
  String selectedCategory = 'Semua';
  String sortBy = 'Terpopuler';
  final TextEditingController _searchController = TextEditingController();

  // Expanded realistic mock database
  final List<TripPackage> allPackages = [
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
        'Hari 1: Penjemputan Sorong - Menuju Waisai - Check-in Resort',
        'Hari 2: Snorkeling di Pulau Wayag - Puncak Wayag',
        'Hari 3: Island Hopping Pianemo - Manta Point - Pasir Timbul',
        'Hari 4: Kembali ke Sorong - Airport Drop-off'
      ],
      facilities: ['Resort Ac', 'Speedboat Premium', 'Makan 3x Sehari', 'Alat Snorkeling', 'Dokumentasi GoPro', 'Pemandu Lokal'],
      includes: ['Pianemo Entry Fee', 'Raja Ampat Pin Kartu', 'Asuransi Perjalanan', 'Transportasi Sorong - Resort (PP)'],
      excludes: ['Tiket Pesawat ke Sorong', 'Pengeluaran Pribadi', 'Tips Pemandu & Kru'],
      meetingPoint: 'Bandara Domine Eduard Osok, Sorong',
    ),
    TripPackage(
      id: 2,
      providerId: 102,
      name: 'Open Trip Belitung',
      destination: 'Belitung, Bangka Belitung',
      price: 1890000,
      quotaUsed: 2,
      quotaMax: 10,
      schedule: '2024-05-25, 2024-05-28, 2024-06-01',
      status: 'Aktif',
      rating: 4.6,
      reviewCount: 76,
      duration: '3 Hari 2 Malam',
      tripType: 'Open Trip',
      minParticipants: 4,
      availableSeats: 8,
      description: 'Nikmati keindahan pantai dengan formasi batu granit yang megah di Belitung. Jelajahi Pulau Lengkuas, mercusuar bersejarah, dan nikmati kuliner mie Belitung legendaris.',
      images: [
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'
      ],
      itinerary: [
        'Hari 1: Penjemputan di Bandara Tanjung Pandan - City Tour - Kuliner Mie Belitung - Sunset di Pantai Tanjung Pendam',
        'Hari 2: Island Hopping: Pulau Batu Garuda, Pulau Pasir, Pulau Lengkuas (Mercusuar), Pulau Kelayang - Goa Kelayang',
        'Hari 3: Belanja Oleh-Oleh - Museum Kata Andrea Hirata - Rumah Adat Belitung - Transfer ke Bandara'
      ],
      facilities: ['Hotel Bintang 3', 'Boat Island Hopping', 'Makan 3x Sehari', 'Life Jacket & Snorkel', 'Dokumentasi Kameraphone', 'Pemandu Lokal'],
      includes: ['Tiket Masuk Wisata', 'Transportasi Darat AC', 'Air Mineral Harian'],
      excludes: ['Tiket Pesawat ke Belitung', 'Makan di luar paket', 'Tips Pemandu'],
      meetingPoint: 'Bandara H.A.S. Hanandjoeddin, Tanjung Pandan',
    ),
    TripPackage(
      id: 4,
      providerId: 104,
      name: 'Private Trip Bali',
      destination: 'Bali',
      price: 4950000,
      quotaUsed: 1,
      quotaMax: 4,
      schedule: 'Setiap Hari',
      status: 'Aktif',
      rating: 4.9,
      reviewCount: 64,
      duration: '5 Hari 4 Malam',
      tripType: 'Private Trip',
      minParticipants: 2,
      availableSeats: 3,
      description: 'Rasakan pengalaman eksklusif menjelajahi Bali. Dari pura Uluwatu yang romantis, keindahan alam Ubud yang tenang, hingga sunset spektakuler di Seminyak.',
      images: [
        'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
        'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800'
      ],
      itinerary: [
        'Hari 1: Penjemputan Airport - Transfer ke Hotel Seminyak - Dinner Romantis',
        'Hari 2: Ubud Tour: Tegallalang Rice Terrace, Monkey Forest, Kopi Luwak Tasting',
        'Hari 3: Bedugul & Tanah Lot Temple Tour - Sunset Dinner',
        'Hari 4: Nusa Penida Day Trip: Kelingking Beach, Broken Beach, Angel Billabong',
        'Hari 5: Belanja Oleh-Oleh - Pengantaran Airport'
      ],
      facilities: ['Private Villa dengan Pool', 'Private Car & Driver', 'Makan sesuai Itinerary', 'Tiket Masuk Nusa Penida Fastboat', 'Dokumentasi Drone & Kamera'],
      includes: ['Semua Tiket Masuk Pura', 'Pajak & Retribusi', 'Welcome Drink & Garland'],
      excludes: ['Tiket Pesawat ke Bali', 'Pengeluaran Pribadi', 'Tips Driver'],
      meetingPoint: 'Bandara I Gusti Ngurah Rai, Denpasar, Bali',
    ),
    TripPackage(
      id: 5,
      providerId: 105,
      name: 'Honeymoon Lombok',
      destination: 'Lombok, NTB',
      price: 3250000,
      quotaUsed: 0,
      quotaMax: 2,
      schedule: 'Setiap Hari',
      status: 'Aktif',
      rating: 4.8,
      reviewCount: 52,
      duration: '4 Hari 3 Malam',
      tripType: 'Honeymoon',
      minParticipants: 2,
      availableSeats: 2,
      description: 'Paket bulan madu romantis di Lombok dan Gili Trawangan. Nikmati dinner romantis di tepi pantai, naik cidomo mengelilingi pulau, dan snorkeling romantis.',
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800'
      ],
      itinerary: [
        'Hari 1: Penjemputan Airport - Sade Village - Pantai Kuta Lombok - Bukit Merese Sunset',
        'Hari 2: Gili Trawangan Escape: Private Glass Bottom Boat Snorkeling - Sunset Candle Light Dinner',
        'Hari 3: Sendang Gile & Tiu Kelep Waterfall Tour - Romantic Spa Couple',
        'Hari 4: Kuliner Ayam Taliwang - Belanja Souvenir Lombok - Transfer ke Airport'
      ],
      facilities: ['Resort Bintang 4 di Gili', 'Private Glass Bottom Boat', 'Candle Light Dinner di Pantai', 'Couple Spa Treatment', 'Cidomo Ride', 'Private AC Transport'],
      includes: ['Tiket Wisata & Retribusi', 'Alat Snorkeling Lengkap', 'Air Mineral'],
      excludes: ['Tiket Pesawat ke Lombok', 'Makan siang & malam di luar paket', 'Tips Driver/Guide'],
      meetingPoint: 'Bandara Internasional Lombok, Praya',
    )
  ];

  @override
  void initState() {
    super.initState();
    // Pre-populate filters based on passed arguments from Home Screen
    if (widget.arguments != null) {
      if (widget.arguments!['category'] != null) {
        String cat = widget.arguments!['category'] as String;
        if (cat == 'Semua Tipe') {
          selectedCategory = 'Semua';
        } else {
          selectedCategory = cat;
        }
      }
      if (widget.arguments!['destination'] != null) {
        // Mock search text autofill
        _searchController.text = (widget.arguments!['destination'] as String).split(',')[0];
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Dynamic filtering of packages based on category tab & search query
    List<TripPackage> filteredPackages = allPackages.where((p) {
      // Filter by category
      bool matchesCategory = true;
      if (selectedCategory != 'Semua') {
        matchesCategory = p.tripType.toLowerCase() == selectedCategory.toLowerCase();
      }

      // Filter by search string
      bool matchesSearch = true;
      if (_searchController.text.isNotEmpty) {
        matchesSearch = p.name.toLowerCase().contains(_searchController.text.toLowerCase()) ||
            p.destination.toLowerCase().contains(_searchController.text.toLowerCase());
      }

      return matchesCategory && matchesSearch;
    }).toList();

    // Sorting logic
    if (sortBy == 'Harga Terendah') {
      filteredPackages.sort((a, b) => a.price.compareTo(b.price));
    } else if (sortBy == 'Harga Tertinggi') {
      filteredPackages.sort((a, b) => b.price.compareTo(a.price));
    } else if (sortBy == 'Rating Tertinggi') {
      filteredPackages.sort((a, b) => b.rating.compareTo(a.rating));
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA), // Clean off-white background
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF374151)),
          onPressed: () {
            widget.onNavigate(0); // Back to Home (Index 0)
          },
        ),
        titleSpacing: 0,
        title: Padding(
          padding: const EdgeInsets.only(right: 8.0),
          child: Container(
            height: 44,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (val) {
                setState(() {});
              },
              decoration: InputDecoration(
                hintText: 'Cari destinasi atau trip...',
                hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                prefixIcon: Icon(Icons.search, color: Colors.grey.shade500, size: 20),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ),
        actions: [
          // Filter Button
          Container(
            margin: const EdgeInsets.only(right: 8, top: 8, bottom: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFE0F2F1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: IconButton(
              icon: const Icon(Icons.tune, color: Color(0xFF0F8B8D), size: 18),
              onPressed: () {
                _showFilterBottomSheet(context);
              },
            ),
          ),
          // Notification badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_none, color: Color(0xFF374151)),
                onPressed: () {},
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                  child: const Text('3', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Sort drop-down & Category Chips Container
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12.0),
            child: Column(
              children: [
                // Category Chips List
                SizedBox(
                  height: 38,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    children: [
                      _buildCategoryChip('Semua', Icons.grid_view),
                      _buildCategoryChip('Open Trip', Icons.groups_outlined),
                      _buildCategoryChip('Family', Icons.family_restroom),
                      _buildCategoryChip('Honeymoon', Icons.favorite_border),
                      _buildCategoryChip('Private Trip', Icons.door_front_door_outlined),
                      _buildCategoryChip('Budget', Icons.savings_outlined),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                // Sorting Selector Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Menampilkan ${filteredPackages.length} Paket Trip',
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                      GestureDetector(
                        onTap: () {
                          _showSortBottomSheet(context);
                        },
                        child: Row(
                          children: [
                            Text(
                              sortBy,
                              style: const TextStyle(color: Color(0xFF0F8B8D), fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 4),
                            const Icon(Icons.keyboard_arrow_down, size: 16, color: Color(0xFF0F8B8D)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Scrollable Trip Cards list
          Expanded(
            child: filteredPackages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search_off, size: 64, color: Colors.grey.shade400),
                        const SizedBox(height: 16),
                        const Text(
                          'Destinasi tidak ditemukan',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF374151)),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Coba cari destinasi lain atau ubah kategori filter.',
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                    itemCount: filteredPackages.length,
                    itemBuilder: (context, index) {
                      final package = filteredPackages[index];
                      return TripCardWidget(
                        package: package,
                        onTap: () {
                          widget.onNavigate(5, arguments: {'package': package}); // Detail (Index 5)
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar: TripKitaBottomNavigation(
        currentIndex: 1, // Trip active
        onTap: (index) {
          widget.onNavigate(index);
        },
      ),
    );
  }

  Widget _buildCategoryChip(String label, IconData icon) {
    final bool isSelected = selectedCategory == label;

    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: FilterChip(
        selected: isSelected,
        label: Row(
          children: [
            Icon(icon, size: 16, color: isSelected ? Colors.white : const Color(0xFF0F8B8D)),
            const SizedBox(width: 6),
            Text(label),
          ],
        ),
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : const Color(0xFF374151),
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
        checkmarkColor: Colors.white,
        showCheckmark: false,
        backgroundColor: Colors.white,
        selectedColor: const Color(0xFF0F8B8D),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(30),
          side: BorderSide(
            color: isSelected ? Colors.transparent : Colors.grey.shade300,
            width: 1,
          ),
        ),
        onSelected: (bool selected) {
          setState(() {
            selectedCategory = label;
          });
        },
      ),
    );
  }

  void _showSortBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Urutkan Berdasarkan',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
              ),
              const SizedBox(height: 16),
              ...['Terpopuler', 'Harga Terendah', 'Harga Tertinggi', 'Rating Tertinggi'].map((option) {
                final bool isSelected = sortBy == option;
                return ListTile(
                  title: Text(
                    option,
                    style: TextStyle(
                      color: isSelected ? const Color(0xFF0F8B8D) : const Color(0xFF374151),
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  trailing: isSelected ? const Icon(Icons.check, color: Color(0xFF0F8B8D)) : null,
                  onTap: () {
                    setState(() {
                      sortBy = option;
                    });
                    Navigator.pop(context);
                  },
                );
              }).toList(),
            ],
          ),
        );
      },
    );
  }

  void _showFilterBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          expand: false,
          maxChildSize: 0.8,
          initialChildSize: 0.6,
          builder: (context, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Center(
                    child: SizedBox(
                      width: 50,
                      child: Divider(thickness: 4),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Filter Pencarian', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 24),
                  const Text('Rentang Harga', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 12),
                  // Price slider placeholder
                  RangeSlider(
                    values: const RangeValues(1000000, 5000000),
                    min: 0,
                    max: 10000000,
                    divisions: 10,
                    activeColor: const Color(0xFF0F8B8D),
                    inactiveColor: Colors.grey.shade200,
                    labels: const RangeLabels('Rp 1jt', 'Rp 5jt'),
                    onChanged: (val) {},
                  ),
                  const SizedBox(height: 20),
                  const Text('Durasi Trip', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    children: ['2H 1M', '3H 2M', '4H 3M', '5H 4M+'].map((duration) {
                      return FilterChip(
                        label: Text(duration),
                        selected: false,
                        onSelected: (val) {},
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Reset', style: TextStyle(color: Colors.grey)),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => Navigator.pop(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0F8B8D),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Terapkan', style: TextStyle(color: Colors.white)),
                        ),
                      ),
                    ],
                  )
                ],
              ),
            );
          },
        );
      },
    );
  }
}
