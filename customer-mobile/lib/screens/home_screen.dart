import 'package:flutter/material.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/services/api_service.dart';
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
  // Search state variables matching Gambar 1 filter fields
  String _selectedDestination = 'Pilih destinasi';
  DateTime _selectedDate = DateTime.now();
  String _selectedTripType = 'Open Trip';
  String _selectedCategory = 'Semua Kategori';

  // 38 Provinsi Indonesia
  final List<String> indonesiaProvinces = [
    'Pilih destinasi',
    'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 
    'Jambi', 'Sumatera Selatan', 'Bangka Belitung', 'Bengkulu', 'Lampung',
    'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
    'Bali', 'Nusa Tenggara Barat (NTB)', 'Nusa Tenggara Timur (NTT)',
    'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
    'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara',
    'Maluku', 'Maluku Utara',
    'Papua', 'Papua Barat', 'Papua Barat Daya', 'Papua Tengah', 'Papua Pegunungan', 'Papua Selatan'
  ];

  final List<String> tripTypesList = [
    'Semua Tipe', 'Open Trip', 'Private Trip', 'Honeymoon', 'Family & Corporate'
  ];

  final List<String> categoriesList = [
    'Semua Kategori', 'Wisata Budaya & Sejarah', 'City Tour', 'Curug', 'Pantai', 'Gunung', 'Keluarga Santai'
  ];

  // Live packages synced with Railway backend database
  List<TripPackage> packages = TripPackage.allPackages;

  @override
  void initState() {
    super.initState();
    _loadLivePackages();
  }

  Future<void> _loadLivePackages() async {
    final livePkgs = await ApiService.fetchPublicPackages();
    if (mounted && livePkgs.isNotEmpty) {
      setState(() {
        packages = livePkgs;
      });
    }
  }

  void _showDestinationPicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          height: 400,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Pilih Destinasi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.builder(
                  itemCount: indonesiaProvinces.length,
                  itemBuilder: (context, index) {
                    final prov = indonesiaProvinces[index];
                    return ListTile(
                      title: Text(prov),
                      trailing: _selectedDestination == prov ? const Icon(Icons.check, color: Color(0xFF0F8B8D)) : null,
                      onTap: () {
                        setState(() {
                          _selectedDestination = prov;
                        });
                        Navigator.pop(ctx);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showDatePickerModal() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime(2028),
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  void _showTripTypePicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Pilih Type Trip', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ...tripTypesList.map((type) {
                return ListTile(
                  title: Text(type),
                  trailing: _selectedTripType == type ? const Icon(Icons.check, color: Color(0xFF0F8B8D)) : null,
                  onTap: () {
                    setState(() {
                      _selectedTripType = type;
                    });
                    Navigator.pop(ctx);
                  },
                );
              }).toList(),
            ],
          ),
        );
      },
    );
  }

  void _showCategoryPicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Pilih Kategori', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ...categoriesList.map((cat) {
                return ListTile(
                  title: Text(cat),
                  trailing: _selectedCategory == cat ? const Icon(Icons.check, color: Color(0xFF0F8B8D)) : null,
                  onTap: () {
                    setState(() {
                      _selectedCategory = cat;
                    });
                    Navigator.pop(ctx);
                  },
                );
              }).toList(),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final openTrips = packages.where((p) => p.tripType.contains('Open')).toList();
    final privateHoneymoonTrips = packages.where((p) => p.tripType.contains('Private') || p.tripType.contains('Honeymoon')).toList();
    final familyCorporateTrips = packages.where((p) => p.tripType.contains('Family') || p.tripType.contains('Corporate')).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero Header Section matching Gambar 1
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
                        Colors.black.withOpacity(0.5),
                        Colors.black.withOpacity(0.2),
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
                        Row(
                          children: [
                            ElevatedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.person_outline, size: 16),
                              label: const Text('Masuk', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0284C7),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                // Hero Tagline matching Gambar 1
                Positioned(
                  top: 100,
                  left: 20,
                  right: 20,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Cari Open Trip\nIndonesia dengan Mudah',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Temukan berbagai open trip seru dan tour guide terpercaya di seluruh Indonesia.',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Colors.white.withOpacity(0.95),
                          height: 1.4,
                          shadows: const [
                            Shadow(blurRadius: 6, color: Colors.black54, offset: Offset(0, 1)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                // Floating Search Box matching Gambar 1 (4 Filters: Destination, Tanggal, Type Trip, Kategori)
                Positioned(
                  top: 210,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20.0),
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
                        // 1. Destination & 2. Tanggal
                        Row(
                          children: [
                            Expanded(
                              child: _buildFilterBox(
                                icon: Icons.location_on_outlined,
                                title: 'Destination',
                                value: _selectedDestination,
                                onTap: _showDestinationPicker,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildFilterBox(
                                icon: Icons.calendar_today_outlined,
                                title: 'Tanggal *',
                                value: DateFormat('dd MMMM yyyy').format(_selectedDate),
                                onTap: _showDatePickerModal,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // 3. Type Trip & 4. Kategori
                        Row(
                          children: [
                            Expanded(
                              child: _buildFilterBox(
                                icon: Icons.card_travel_outlined,
                                title: 'Type Trip',
                                value: _selectedTripType,
                                onTap: _showTripTypePicker,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildFilterBox(
                                icon: Icons.grid_view_outlined,
                                title: 'Kategori',
                                value: _selectedCategory,
                                onTap: _showCategoryPicker,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        // Search Button matching Gambar 1
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              widget.onNavigate(1, arguments: {
                                'destination': _selectedDestination == 'Pilih destinasi' ? '' : _selectedDestination,
                                'date': _selectedDate,
                                'type': _selectedTripType,
                                'category': _selectedCategory,
                              });
                            },
                            icon: const Icon(Icons.search, size: 18, color: Colors.white),
                            label: const Text(
                              'Cari Trip',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0284C7),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12.0),
                              ),
                              elevation: 0,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 160), // Spacer for floating search box

            // Section 1: Trip Populer (Open Trip) ✨ (matching Gambar 1)
            _buildSectionHeader('Trip Populer (Open Trip) ✨', 'Paket wisata gabungan hemat & seru dengan jadwal teratur', () {
              widget.onNavigate(1, arguments: {'type': 'Open Trip'});
            }),
            const SizedBox(height: 12),
            _buildHorizontalTripList(openTrips.isNotEmpty ? openTrips.take(4).toList() : packages.take(4).toList()),

            // Section 2: Private Trip & Honeymoon Spesial 🌹 (matching Gambar 1)
            const SizedBox(height: 28),
            _buildSectionHeader('Private Trip & Honeymoon Spesial 🌹', 'Jadwal bebas pilih customer (Min 2 Orang) + Fasilitas eksklusif & privat', () {
              widget.onNavigate(1, arguments: {'type': 'Private Trip'});
            }),
            const SizedBox(height: 12),
            _buildHorizontalTripList(privateHoneymoonTrips.isNotEmpty ? privateHoneymoonTrips.take(4).toList() : packages.take(4).toList()),

            // Section 3: Family & Corporate Gathering 🏢 (matching Gambar 1)
            const SizedBox(height: 28),
            _buildSectionHeader('Family & Corporate Gathering 🏢', 'Family (Min 3 orang) • Corporate Gathering (Min 10 orang) • Tanggal Bebas Pilih', () {
              widget.onNavigate(1, arguments: {'type': 'Corporate'});
            }),
            const SizedBox(height: 12),
            _buildHorizontalTripList(familyCorporateTrips.isNotEmpty ? familyCorporateTrips.take(4).toList() : packages.take(4).toList()),

            // Bottom Value Proposition Grid (matching Gambar 1)
            const SizedBox(height: 36),
            _buildValuePropGrid(),

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

  Widget _buildFilterBox({
    required IconData icon,
    required String title,
    required String value,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: const Color(0xFF0284C7)),
            const SizedBox(width: 6),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontSize: 10, color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, String subtitle, VoidCallback onSeeAll) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ],
            ),
          ),
          InkWell(
            onTap: onSeeAll,
            child: const Text('Lihat semua >', style: TextStyle(color: Color(0xFF0284C7), fontSize: 12, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildHorizontalTripList(List<TripPackage> tripList) {
    return SizedBox(
      height: 380,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        scrollDirection: Axis.horizontal,
        itemCount: tripList.length,
        itemBuilder: (context, index) {
          final cardWidth = (MediaQuery.of(context).size.width - 52) / 2;
          return Container(
            width: cardWidth > 170 ? cardWidth : 170,
            margin: const EdgeInsets.only(right: 12.0),
            child: TripCardWidget(
              package: trip,
              onTap: () {
                widget.onNavigate(5, arguments: {'package': trip});
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildValuePropGrid() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildPropItem(Icons.verified_user_outlined, 'Aman & Terpercaya', 'Provider terverifikasi'),
          _buildPropItem(Icons.headset_mic_outlined, 'Layanan 24/7', 'Customer service siap membantu'),
          _buildPropItem(Icons.payment_outlined, 'Pembayaran Mudah', 'Transfer & QRIS aman'),
          _buildPropItem(Icons.thumb_up_alt_outlined, 'Banyak Pilihan', 'Beragam destinasi menarik'),
        ],
      ),
    );
  }

  Widget _buildPropItem(IconData icon, String title, String sub) {
    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: const Color(0xFFF0F9FF), shape: BoxShape.circle),
            child: Icon(icon, color: const Color(0xFF0284C7), size: 20),
          ),
          const SizedBox(height: 8),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF0F172A))),
          const SizedBox(height: 2),
          Text(sub, textAlign: TextAlign.center, style: TextStyle(fontSize: 9, color: Colors.grey.shade500)),
        ],
      ),
    );
  }
}
