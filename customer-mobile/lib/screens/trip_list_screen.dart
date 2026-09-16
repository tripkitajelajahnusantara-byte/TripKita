import 'package:flutter/material.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:intl/intl.dart';

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
  String selectedTypeFilter = 'Semua Tipe';
  String selectedCategoryFilter = 'Semua Kategori';
  String selectedDestinationFilter = '';
  String sortBy = 'Rekomendasi';
  final TextEditingController _searchController = TextEditingController();

  List<TripPackage> allPackages = TripPackage.allPackages;

  @override
  void initState() {
    super.initState();
    _loadLivePackages();

    // Pre-populate filters based on passed arguments from Home Screen
    if (widget.arguments != null) {
      if (widget.arguments!['type'] != null) {
        selectedTypeFilter = widget.arguments!['type'] as String;
      }
      if (widget.arguments!['category'] != null) {
        selectedCategoryFilter = widget.arguments!['category'] as String;
      }
      if (widget.arguments!['destination'] != null && (widget.arguments!['destination'] as String).isNotEmpty) {
        selectedDestinationFilter = widget.arguments!['destination'] as String;
        _searchController.text = selectedDestinationFilter;
      }
    }
  }

  Future<void> _loadLivePackages() async {
    final livePkgs = await ApiService.fetchPublicPackages();
    if (mounted && livePkgs.isNotEmpty) {
      setState(() {
        allPackages = livePkgs;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    // Dynamic filtering matching Gambar 2
    List<TripPackage> filteredPackages = allPackages.where((p) {
      bool matchesType = true;
      if (selectedTypeFilter != 'Semua Tipe' && selectedTypeFilter.isNotEmpty) {
        matchesType = p.tripType.toLowerCase().contains(selectedTypeFilter.toLowerCase());
      }

      bool matchesCategory = true;
      if (selectedCategoryFilter != 'Semua Kategori' && selectedCategoryFilter.isNotEmpty) {
        matchesCategory = p.category.toLowerCase().contains(selectedCategoryFilter.toLowerCase());
      }

      bool matchesSearch = true;
      final q = _searchController.text.trim().toLowerCase();
      if (q.isNotEmpty) {
        matchesSearch = p.name.toLowerCase().contains(q) || p.destination.toLowerCase().contains(q);
      }

      return matchesType && matchesCategory && matchesSearch;
    }).toList();

    // Sorting logic matching Gambar 2
    if (sortBy == 'Harga Terendah') {
      filteredPackages.sort((a, b) => a.price.compareTo(b.price));
    } else if (sortBy == 'Harga Tertinggi') {
      filteredPackages.sort((a, b) => b.price.compareTo(a.price));
    } else if (sortBy == 'Rating Tertinggi') {
      filteredPackages.sort((a, b) => b.rating.compareTo(a.rating));
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0284C7)),
          onPressed: () {
            widget.onNavigate(0); // Back to Home
          },
        ),
        title: Text(
          selectedTypeFilter != 'Semua Tipe' ? 'Daftar Paket $selectedTypeFilter' : 'Daftar Paket Wisata',
          style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
        ),
        centerTitle: false,
      ),
      body: Column(
        children: [
          // Filter & Search Bar Header
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            child: Column(
              children: [
                // Search Input
                Container(
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Cari destinasi atau nama trip...',
                      hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                      prefixIcon: Icon(Icons.search, color: Colors.grey.shade500, size: 18),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                // Results Counter & Sort Dropdown matching Gambar 2
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Menampilkan ${filteredPackages.length} paket wisata',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                    Row(
                      children: [
                        const Text('Urutkan:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        const SizedBox(width: 6),
                        DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: sortBy,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                            items: ['Rekomendasi', 'Harga Terendah', 'Harga Tertinggi', 'Rating Tertinggi'].map((val) {
                              return DropdownMenuItem<String>(
                                value: val,
                                child: Text(val),
                              );
                            }).toList(),
                            onChanged: (newVal) {
                              if (newVal != null) {
                                setState(() {
                                  sortBy = newVal;
                                });
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Package Cards List matching Gambar 2 1-to-1
          Expanded(
            child: filteredPackages.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
                    itemCount: filteredPackages.length,
                    itemBuilder: (context, index) {
                      final package = filteredPackages[index];
                      return _buildSearchCard(package, currencyFormatter);
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar: TripKitaBottomNavigation(
        currentIndex: 1, // Trip List active
        onTap: (index) {
          widget.onNavigate(index);
        },
      ),
    );
  }

  Widget _buildSearchCard(TripPackage package, NumberFormat currencyFormatter) {
    final String packageImgUrl = package.images.isNotEmpty
        ? package.images[0]
        : 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800';

    return Container(
      margin: const EdgeInsets.only(bottom: 16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
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
          // Image Header with Badge & Heart
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: Image.network(
                  packageImgUrl,
                  height: 180,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              // Category Badge (e.g. Open Trip • City Tour) matching Gambar 2
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0284C7),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${package.tripType} • ${package.category}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              // Wishlist Heart Button
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.favorite_border, size: 18, color: Color(0xFF64748B)),
                ),
              ),
            ],
          ),

          // Card Content Body
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Price Tag & Title Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        package.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Mulai dari', style: TextStyle(fontSize: 9, color: Color(0xFF94A3B8))),
                        Text(
                          currencyFormatter.format(package.price),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0284C7),
                          ),
                        ),
                        const Text('/orang', style: TextStyle(fontSize: 9, color: Color(0xFF94A3B8))),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Destination Location
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF64748B)),
                    const SizedBox(width: 4),
                    Text(
                      package.destination,
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Highlights chips matching Gambar 2
                if (package.highlights.isNotEmpty) ...[
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: package.highlights.map((hl) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0F9FF),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFBAE6FD)),
                        ),
                        child: Text(
                          hl,
                          style: const TextStyle(fontSize: 10, color: Color(0xFF0369A1), fontWeight: FontWeight.w500),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),
                ],

                // Schedule Info matching Gambar 2
                Row(
                  children: [
                    const Icon(Icons.calendar_month_outlined, size: 14, color: Color(0xFF64748B)),
                    const SizedBox(width: 4),
                    Text(
                      'Jadwal tersedia: ${package.schedule}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
                const Divider(height: 20, thickness: 1),

                // Rating, Quota Seats & Actions Row matching Gambar 2
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.star, size: 16, color: Colors.amber),
                        const SizedBox(width: 4),
                        Text(
                          package.rating.toString(),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                        Text(
                          ' (${package.reviewCount} ulasan)',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'Sisa ${package.availableSeats} seat',
                            style: TextStyle(fontSize: 10, color: Colors.green.shade700, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),

                    Row(
                      children: [
                        OutlinedButton(
                          onPressed: () {},
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            side: BorderSide(color: Colors.grey.shade300),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.share_outlined, size: 12, color: Color(0xFF64748B)),
                              SizedBox(width: 4),
                              Text('Bagikan', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () {
                            widget.onNavigate(5, arguments: {'package': package}); // Detail (Index 5)
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF0284C7),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            elevation: 0,
                            side: const BorderSide(color: Color(0xFF0284C7)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: const Text('Lihat Detail >', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
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

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off_outlined, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text(
              'Paket Wisata Tidak Ditemukan',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 6),
            Text(
              'Coba ubah kata kunci pencarian atau ganti pilihan filter destinasi.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
            ),
          ],
        ),
      ),
    );
  }
}
