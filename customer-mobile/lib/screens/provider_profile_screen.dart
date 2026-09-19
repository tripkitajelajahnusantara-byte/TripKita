import 'package:flutter/material.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:intl/intl.dart';

class ProviderProfileScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;
  final Map<String, dynamic>? arguments;

  const ProviderProfileScreen({
    Key? key,
    required this.onNavigate,
    this.arguments,
  }) : super(key: key);

  @override
  State<ProviderProfileScreen> createState() => _ProviderProfileScreenState();
}

class _ProviderProfileScreenState extends State<ProviderProfileScreen> {
  late String providerName;
  late String providerCity;
  late List<TripPackage> providerPackages;

  @override
  void initState() {
    super.initState();
    final args = widget.arguments;
    providerName = args?['providerName'] as String? ?? 'Bandung Juara Tour';
    providerCity = args?['providerCity'] as String? ?? 'Bandung, Jawa Barat';

    // Filter packages by provider name or default fallback
    final nameLower = providerName.toLowerCase();
    final filtered = TripPackage.allPackages.where((p) =>
      p.providerName.toLowerCase().contains(nameLower) ||
      p.destination.toLowerCase().contains('bandung')
    ).toList();

    providerPackages = filtered.isNotEmpty ? filtered : [
      TripPackage(
        id: 101,
        providerId: 1,
        name: 'Bandung City Tour',
        destination: 'Bandung, Jawa Barat',
        price: 420000,
        quotaUsed: 1,
        quotaMax: 4,
        schedule: '16 Sep 2026 - 17 Sep 2026',
        status: 'Aktif',
        rating: 4.8,
        reviewCount: 102,
        duration: '2 Hari 1 Malam',
        tripType: 'Open Trip',
        category: 'City Tour',
        minParticipants: 4,
        availableSeats: 14,
        description: 'Spesialis open trip gunung & kota dengan pengalaman tim profesional dan fasilitas lengkap.',
        images: ['https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=800'],
      ),
      TripPackage(
        id: 102,
        providerId: 1,
        name: 'Corporate Gathering & Outbound Bandung',
        destination: 'Bandung, Jawa Barat',
        price: 750000,
        quotaUsed: 0,
        quotaMax: 20,
        schedule: '20 Okt 2026 - 22 Okt 2026',
        status: 'Aktif',
        rating: 4.9,
        reviewCount: 45,
        duration: '3 Hari 2 Malam',
        tripType: 'Corporate',
        category: 'Gathering',
        minParticipants: 10,
        availableSeats: 20,
        description: 'Paket outbond perusahaan lengkap dengan team building dan gala dinner.',
        images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'],
      )
    ];
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F8B8D)),
          onPressed: () {
            widget.onNavigate(5); // Return to Trip Detail
          },
        ),
        title: const Text(
          'Profil Provider',
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Provider Header Card (Matching Gambar 2)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: const Color(0xFF007BFF),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Center(
                          child: Text(
                            providerName.isNotEmpty ? providerName.substring(0, 1) : 'B',
                            style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              providerName,
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '📍 $providerCity • tour • Bergabung sejak 2026',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Mitra Provider Resmi TemenTrip',
                              style: TextStyle(fontSize: 11, color: Color(0xFF0F8B8D), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Stats Overview Boxes (Gambar 2)
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFF1F5F9)),
                          ),
                          child: const Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.star, color: Color(0xFFF59E0B), size: 14),
                                  SizedBox(width: 4),
                                  Text('Belum ada rating', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                                ],
                              ),
                              SizedBox(height: 2),
                              Text('Rating Kepuasan', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFF1F5F9)),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.inventory_2_outlined, color: Color(0xFF007BFF), size: 14),
                                  const SizedBox(width: 4),
                                  Text('${providerPackages.length} Paket', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF007BFF))),
                                ],
                              ),
                              const SizedBox(height: 2),
                              const Text('Paket Wisata Aktif', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFF1F5F9)),
                          ),
                          child: const Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.people_outline, color: Color(0xFF10B981), size: 14),
                                  SizedBox(width: 4),
                                  Text('0', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
                                ],
                              ),
                              SizedBox(height: 2),
                              Text('Wisatawan', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Tab Buttons
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F8B8D),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '📦 Paket Wisata (${providerPackages.length})',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    '💬 Ulasan & Rating (0)',
                    style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600, fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            Text(
              'Daftar Paket Wisata Diselenggarakan Oleh $providerName',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 12),

            // Package Grid / Cards
            ...providerPackages.map((pkg) {
              return GestureDetector(
                onTap: () {
                  widget.onNavigate(5, arguments: {'package': pkg});
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                        child: Stack(
                          children: [
                            Image.network(
                              pkg.images.isNotEmpty ? pkg.images[0] : 'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=800',
                              height: 140,
                              width: double.infinity,
                              fit: BoxFit.cover,
                            ),
                            Positioned(
                              top: 10,
                              left: 10,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF007BFF),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  pkg.tripType,
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              pkg.name,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '📍 ${pkg.destination}',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('⭐ Belum ada rating', style: TextStyle(fontSize: 11, color: Color(0xFFD97706))),
                                Text(
                                  currencyFormat.format(pkg.price),
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF007BFF)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ],
        ),
      ),
      bottomNavigationBar: TripKitaBottomNavigation(
        currentIndex: 1,
        onTap: (index) {
          widget.onNavigate(index);
        },
      ),
    );
  }
}
