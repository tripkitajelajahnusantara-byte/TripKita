import 'package:flutter/material.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/models/booking.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:intl/intl.dart';

class BookingScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;
  final Map<String, dynamic>? arguments;

  const BookingScreen({
    Key? key,
    required this.onNavigate,
    this.arguments,
  }) : super(key: key);

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  late TripPackage package;
  late int participantCount;
  late String selectedDateStr;
  late int basePrice;

  List<Participant> participants = [];
  List<bool> isFormExpanded = [];

  @override
  void initState() {
    super.initState();
    // Retrieve passed arguments
    if (widget.arguments != null) {
      package = widget.arguments!['package'] as TripPackage;
      participantCount = widget.arguments!['participants'] as int? ?? 1;
      selectedDateStr = widget.arguments!['selectedDate'] as String? ?? '28 Mei 2024';
    } else {
      // Fallback default
      package = TripPackage(
        id: 1,
        providerId: 101,
        name: 'Open Trip Raja Ampat',
        destination: 'Raja Ampat, Papua',
        price: 2750000,
        quotaUsed: 4,
        quotaMax: 16,
        schedule: '28 Mei 2024',
        status: 'Aktif',
        rating: 4.8,
        reviewCount: 120,
        duration: '4 Hari 3 Malam',
        tripType: 'Open Trip',
        minParticipants: 4,
        availableSeats: 12,
        description: '',
        images: ['https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=800'],
        itinerary: [],
        facilities: [],
        includes: [],
        excludes: [],
        meetingPoint: 'Bandara Sorong',
      );
      participantCount = 4; // As shown in reference screenshot
      selectedDateStr = '28 Mei 2024';
    }

    basePrice = package.price.toInt();
    _syncParticipantForms();
  }

  // Adjust number of passenger forms to match participantCount
  void _syncParticipantForms() {
    if (participants.length < participantCount) {
      // Add new forms
      int diff = participantCount - participants.length;
      for (int i = 0; i < diff; i++) {
        participants.add(Participant());
        isFormExpanded.add(participants.length == 1); // Expand the first form by default, collapse others
      }
    } else if (participants.length > participantCount) {
      // Remove excess forms
      participants.removeRange(participantCount, participants.length);
      isFormExpanded.removeRange(participantCount, isFormExpanded.length);
    }
  }

  // Auto fill primary traveler data
  void _autoFillPrimaryTraveler() {
    setState(() {
      participants[0].fullName = 'Budi Santoso';
      participants[0].email = 'budi@email.com';
      participants[0].whatsappNumber = '081234567890';
      participants[0].gender = 'Laki-laki';
      participants[0].dateOfBirth = '1990-05-15';
      participants[0].optionalNotes = 'Alergi seafood';
    });
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    int totalPrice = basePrice * participantCount;

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF374151)),
          onPressed: () {
            widget.onNavigate(5, arguments: {'package': package}); // Back to detail (Index 5)
          },
        ),
        title: const Text(
          'Booking',
          style: TextStyle(color: Color(0xFF1F2937), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Selected package mini preview card
            Container(
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    )
                  ],
                ),
                child: Row(
                  children: [
                    // Package Image
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        package.images.isNotEmpty ? package.images[0] : '',
                        width: 90,
                        height: 90,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 16),
                    // Metadata
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F8B8D).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              package.tripType.toUpperCase(),
                              style: const TextStyle(color: Color(0xFF0F8B8D), fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            package.name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1F2937)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(Icons.location_on_outlined, size: 14, color: Colors.grey.shade400),
                              const SizedBox(width: 2),
                              Text(package.destination, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(Icons.star, size: 14, color: Colors.amber.shade600),
                              const SizedBox(width: 2),
                              Text(package.rating.toString(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              const SizedBox(width: 8),
                              Icon(Icons.access_time, size: 14, color: Colors.grey.shade400),
                              const SizedBox(width: 2),
                              Text(package.duration, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                            ],
                          )
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Participant quantity selector
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Jumlah Peserta', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1F2937))),
                          const SizedBox(height: 4),
                          Text('Pilih jumlah peserta yang akan ikut trip', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                        ],
                      ),
                      Row(
                        children: [
                          IconButton(
                            onPressed: () {
                              if (participantCount > 1) {
                                setState(() {
                                    participantCount--;
                                    _syncParticipantForms();
                                });
                              }
                            },
                            icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF0F8B8D)),
                          ),
                          Text('$participantCount Orang', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          IconButton(
                            onPressed: () {
                              if (participantCount < package.availableSeats) {
                                setState(() {
                                    participantCount++;
                                    _syncParticipantForms();
                                });
                              }
                            },
                            icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0F8B8D)),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Quota info badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0F2F1).withOpacity(0.5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline, size: 16, color: Color(0xFF0F8B8D)),
                        const SizedBox(width: 8),
                        Text(
                          'Minimal ${package.minParticipants} orang, maksimal ${package.quotaMax} orang',
                          style: const TextStyle(color: Color(0xFF0F8B8D), fontSize: 11, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Forms label and Autofill Action
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Data Peserta', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1F2937))),
                  TextButton.icon(
                    onPressed: _autoFillPrimaryTraveler,
                    icon: const Icon(Icons.flash_on, size: 16, color: Color(0xFF0F8B8D)),
                    label: const Text('Auto Fill', style: TextStyle(fontSize: 12, color: Color(0xFF0F8B8D), fontWeight: FontWeight.bold)),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      backgroundColor: const Color(0xFFE0F2F1),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    ),
                  ),
                ],
              ),
            ),

            // Participant forms lists
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: participantCount,
                itemBuilder: (context, index) {
                  final participant = participants[index];
                  final isExpanded = isFormExpanded[index];

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isExpanded ? const Color(0xFF0F8B8D) : Colors.grey.shade200,
                        width: isExpanded ? 1.5 : 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        // Card Header clickable to expand/collapse
                        InkWell(
                          onTap: () {
                            setState(() {
                              isFormExpanded[index] = !isFormExpanded[index];
                            });
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 28,
                                      height: 28,
                                      decoration: BoxDecoration(
                                        color: isExpanded ? const Color(0xFF0F8B8D) : Colors.grey.shade100,
                                        shape: BoxShape.circle,
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        '${index + 1}',
                                        style: TextStyle(
                                          color: isExpanded ? Colors.white : Colors.grey.shade600,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      'Peserta ${index + 1}',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1F2937)),
                                    ),
                                    if (index == 0) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFE0F2F1),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: const Text(
                                          'Data Utama',
                                          style: TextStyle(color: Color(0xFF0F8B8D), fontSize: 9, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                Icon(
                                  isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  color: Colors.grey.shade500,
                                ),
                              ],
                            ),
                          ),
                        ),
                        // Expanded Form body
                        if (isExpanded) ...[
                          const Divider(height: 1, thickness: 1),
                          Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              children: [
                                // Full Name input
                                _buildTextField(
                                  icon: Icons.person_outline,
                                  label: 'Nama Lengkap',
                                  hint: 'Contoh: Budi Santoso',
                                  value: participant.fullName,
                                  onChanged: (val) => participant.fullName = val,
                                ),
                                const SizedBox(height: 12),
                                // Email input
                                _buildTextField(
                                  icon: Icons.mail_outline,
                                  label: 'Email',
                                  hint: 'Contoh: budi@email.com',
                                  value: participant.email,
                                  onChanged: (val) => participant.email = val,
                                  keyboardType: TextInputType.emailAddress,
                                ),
                                const SizedBox(height: 12),
                                // WhatsApp input
                                _buildTextField(
                                  icon: Icons.phone_android,
                                  label: 'No. WhatsApp',
                                  hint: 'Contoh: 0812 3456 7890',
                                  value: participant.whatsappNumber,
                                  onChanged: (val) => participant.whatsappNumber = val,
                                  keyboardType: TextInputType.phone,
                                ),
                                const SizedBox(height: 12),
                                // Gender Dropdown
                                _buildDropdownField(
                                  icon: Icons.wc_outlined,
                                  label: 'Jenis Kelamin',
                                  value: participant.gender,
                                  items: ['Laki-laki', 'Perempuan'],
                                  onChanged: (val) {
                                    if (val != null) {
                                      setState(() {
                                        participant.gender = val;
                                      });
                                    }
                                  },
                                ),
                                const SizedBox(height: 12),
                                // Date of Birth Picker mockup
                                _buildTextField(
                                  icon: Icons.cake_outlined,
                                  label: 'Tanggal Lahir',
                                  hint: 'Contoh: YYYY-MM-DD',
                                  value: participant.dateOfBirth,
                                  onChanged: (val) => participant.dateOfBirth = val,
                                  suffixIcon: const Icon(Icons.calendar_today, size: 18, color: Colors.grey),
                                ),
                                const SizedBox(height: 12),
                                // Additional Notes textarea
                                _buildTextField(
                                  icon: Icons.edit_note,
                                  label: 'Catatan Tambahan (Opsional)',
                                  hint: 'Contoh: Alergi makanan, dll',
                                  value: participant.optionalNotes,
                                  onChanged: (val) => participant.optionalNotes = val,
                                  maxLines: 2,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),

            // Booking summary and breakdown
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2F1).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE0F2F1).withOpacity(0.5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.assignment_outlined, color: Color(0xFF0F8B8D), size: 20),
                        const SizedBox(width: 8),
                        Text('Ringkasan Booking', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F8B8D))),
                      ],
                    ),
                    const Divider(height: 24, thickness: 1, color: Colors.white),
                    _buildSummaryRow('Tanggal Trip', selectedDateStr),
                    const SizedBox(height: 8),
                    _buildSummaryRow('Jumlah Peserta', '$participantCount Orang'),
                    const SizedBox(height: 8),
                    _buildSummaryRow('Harga Per Orang', currencyFormatter.format(basePrice)),
                    const Divider(height: 24, thickness: 1),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Harga', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF374151))),
                        Text(
                          currencyFormatter.format(totalPrice),
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F8B8D)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),

      // Booking sticky bottom bar
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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Pembayaran', style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
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
                  ElevatedButton.icon(
                    onPressed: () {
                      // Generate mock booking code (e.g. TK-2824-1891)
                      final randomSuffix = (1000 + (DateTime.now().millisecond % 9000)).toString();
                      final bookingCode = 'TK-2824-$randomSuffix';

                      // Create Booking details model
                      DateTime parsedTripDate;
                      try {
                        parsedTripDate = DateFormat('dd MMM yyyy').parse(selectedDate);
                      } catch (e) {
                        parsedTripDate = DateTime(2024, 5, 28);
                      }

                      final bookingId = 500 + Booking.mockBookings.length;
                      final mockBooking = Booking(
                        id: bookingId,
                        bookingCode: bookingCode,
                        providerId: package.providerId,
                        packageId: package.id,
                        packageDetails: package,
                        customerName: participants[0].fullName.isNotEmpty ? participants[0].fullName : 'Budi Santoso',
                        customerInitial: 'BS',
                        tripDate: parsedTripDate,
                        guests: participantCount,
                        totalPrice: totalPrice,
                        dpAmount: 0,
                        paymentMethod: 'QRIS',
                        status: 'PENDING_PAYMENT',
                        paymentUrl: 'https://checkout.xendit.co/v2/invoice/TK-$randomSuffix',
                        createdAt: DateTime.now(),
                        participants: participants,
                      );

                      // Persist booking to mock list
                      Booking.mockBookings.add(mockBooking);

                      // Navigate to Payment Screen (Index 7)
                      widget.onNavigate(7, arguments: {'booking': mockBooking});
                    },
                    icon: const Text('Lanjut Pembayaran', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    label: const Icon(Icons.arrow_forward, size: 18),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F8B8D),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
            ),
            // Reuses the identical BottomNavigationBar (Booking is index 2 active)
            TripKitaBottomNavigation(
              currentIndex: 2, // Booking active
              onTap: (index) {
                widget.onNavigate(index);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required IconData icon,
    required String label,
    required String hint,
    required String value,
    required Function(String) onChanged,
    TextInputType keyboardType = TextInputType.text,
    Widget? suffixIcon,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF4B5563)),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: TextFormField(
            initialValue: value,
            key: Key(value), // Forces redrawing when state changes (e.g. Autofill)
            onChanged: onChanged,
            keyboardType: keyboardType,
            maxLines: maxLines,
            style: const TextStyle(fontSize: 13, color: Color(0xFF1F2937)),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
              prefixIcon: Icon(icon, size: 18, color: Colors.grey.shade500),
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdownField({
    required IconData icon,
    required String label,
    required String value,
    required List<String> items,
    required Function(String?) onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF4B5563)),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              Icon(icon, size: 18, color: Colors.grey.shade500),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: value,
                    onChanged: onChanged,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF1F2937)),
                    items: items.map<DropdownMenuItem<String>>((String val) {
                      return DropdownMenuItem<String>(
                        value: val,
                        child: Text(val),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF374151))),
      ],
    );
  }
}
