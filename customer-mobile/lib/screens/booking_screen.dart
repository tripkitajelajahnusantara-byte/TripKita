import 'package:flutter/material.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:customer_mobile/services/api_service.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:intl/intl.dart';

class ParticipantData {
  String nama;
  String hp;
  String gender;
  String tanggalLahir;
  String riwayatPenyakit;

  ParticipantData({
    this.nama = '',
    this.hp = '',
    this.gender = 'Laki-laki',
    this.tanggalLahir = '2000-01-01',
    this.riwayatPenyakit = 'Tidak Ada',
  });
}

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

  // Pemesan Form Controllers
  final TextEditingController _pemesanNameCtrl = TextEditingController(text: 'testing');
  final TextEditingController _pemesanEmailCtrl = TextEditingController(text: 'testing@gmail.com');
  final TextEditingController _pemesanPhoneCtrl = TextEditingController(text: '081221213149');
  String _pemesanBirthDate = '1998-05-15';
  String _pemesanGender = 'Laki-laki';

  // Checkbox State: Peserta 1 sama dengan Pemesan
  bool _isSameAsPemesan = false;

  // Participants Data List
  List<ParticipantData> participants = [];

  // Form Validation Errors
  Map<String, String> errors = {};

  @override
  void initState() {
    super.initState();
    if (widget.arguments != null) {
      package = widget.arguments!['package'] as TripPackage;
      participantCount = widget.arguments!['participants'] as int? ?? 1;
      selectedDateStr = widget.arguments!['selectedDate'] as String? ?? '2026-09-26';
    } else {
      package = TripPackage(
        id: 1,
        providerId: 101,
        name: 'Trip Curug Cilember',
        destination: 'Bogor, Jawa Barat',
        price: 275000,
        quotaUsed: 1,
        quotaMax: 15,
        schedule: '2026-09-26',
        status: 'Aktif',
        rating: 4.8,
        reviewCount: 45,
        duration: '1 Hari',
        tripType: 'Open Trip',
        category: 'CURUG',
        minParticipants: 1,
        availableSeats: 14,
        description: '',
        images: ['https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800'],
      );
      participantCount = 1;
      selectedDateStr = '2026-09-26';
    }

    basePrice = package.price.toInt();
    _syncParticipants();
  }

  void _syncParticipants() {
    if (participants.length < participantCount) {
      int diff = participantCount - participants.length;
      for (int i = 0; i < diff; i++) {
        participants.add(ParticipantData(
          nama: (participants.isEmpty && _isSameAsPemesan) ? _pemesanNameCtrl.text : '',
          hp: (participants.isEmpty && _isSameAsPemesan) ? _pemesanPhoneCtrl.text : '',
          gender: (participants.isEmpty && _isSameAsPemesan) ? _pemesanGender : 'Laki-laki',
          tanggalLahir: (participants.isEmpty && _isSameAsPemesan) ? _pemesanBirthDate : '2000-01-01',
          riwayatPenyakit: 'Tidak Ada',
        ));
      }
    } else if (participants.length > participantCount) {
      participants.removeRange(participantCount, participants.length);
    }
  }

  void _onSameAsPemesanChanged(bool? val) {
    setState(() {
      _isSameAsPemesan = val ?? false;
      if (_isSameAsPemesan && participants.isNotEmpty) {
        participants[0].nama = _pemesanNameCtrl.text;
        participants[0].hp = _pemesanPhoneCtrl.text;
        participants[0].gender = _pemesanGender;
        participants[0].tanggalLahir = _pemesanBirthDate;
      }
    });
  }

  bool _validateForm() {
    final Map<String, String> newErrors = {};

    if (_pemesanNameCtrl.text.trim().length < 3) {
      newErrors['pemesanName'] = 'Nama pemesan minimal 3 karakter.';
    }
    if (!_pemesanEmailCtrl.text.contains('@') || !_pemesanEmailCtrl.text.contains('.')) {
      newErrors['pemesanEmail'] = 'Format email tidak valid.';
    }
    if (_pemesanPhoneCtrl.text.trim().length < 10) {
      newErrors['pemesanPhone'] = 'Nomor HP pemesan minimal 10 digit.';
    }

    for (int i = 0; i < participants.length; i++) {
      if (participants[i].nama.trim().length < 3) {
        newErrors['p_nama_$i'] = 'Nama Peserta ${i + 1} minimal 3 karakter.';
      }
      if (participants[i].hp.trim().length < 10) {
        newErrors['p_hp_$i'] = 'Nomor HP Peserta ${i + 1} minimal 10 digit.';
      }
    }

    setState(() {
      errors = newErrors;
    });

    return newErrors.isEmpty;
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
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF475569)),
          onPressed: () {
            widget.onNavigate(5, arguments: {'package': package});
          },
        ),
        title: const Text(
          'Data Pemesan & Peserta Trip',
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Rincian Pemesanan Summary Top Card
            Container(
              padding: const EdgeInsets.all(16),
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
                  Text(
                    package.category.toUpperCase(),
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF007BFF)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    package.name,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined, size: 14, color: Color(0xFF64748B)),
                      const SizedBox(width: 6),
                      Text(selectedDateStr, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                      const SizedBox(width: 16),
                      const Icon(Icons.people_outline, size: 14, color: Color(0xFF64748B)),
                      const SizedBox(width: 6),
                      Text('$participantCount Peserta', style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Harga (${participantCount}x)', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text(currencyFormatter.format(totalPrice), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Pembayaran', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                      Text(currencyFormatter.format(totalPrice), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF007BFF))),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFEF3C7)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.shield_outlined, size: 16, color: Color(0xFFB45309)),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Data peserta yang diisi akan digunakan oleh mitra travel untuk asuransi dan pendaftaran.',
                            style: TextStyle(fontSize: 11, color: Color(0xFFB45309), height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // BAGIAN 1: DATA PEMESAN (KONTAK UTAMA)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '1. Data Pemesan (Kontak Utama)',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.check_circle, size: 12, color: Color(0xFF10B981)),
                            SizedBox(width: 4),
                            Text(
                              'Terisi Otomatis (Akun Anda)',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildInputLabel('Nama Lengkap Pemesan *'),
                  _buildTextField(
                    controller: _pemesanNameCtrl,
                    icon: Icons.person_outline,
                    hint: 'Nama pemesan...',
                    errorText: errors['pemesanName'],
                    onChanged: (val) {
                      if (_isSameAsPemesan && participants.isNotEmpty) {
                        setState(() {
                          participants[0].nama = val;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 14),
                  _buildInputLabel('Alamat Email *'),
                  _buildTextField(
                    controller: _pemesanEmailCtrl,
                    icon: Icons.mail_outline,
                    hint: 'testing@gmail.com',
                    keyboardType: TextInputType.emailAddress,
                    errorText: errors['pemesanEmail'],
                  ),
                  const SizedBox(height: 14),
                  _buildInputLabel('Nomor WhatsApp / HP *'),
                  _buildTextField(
                    controller: _pemesanPhoneCtrl,
                    icon: Icons.phone_android,
                    hint: '081221213149',
                    keyboardType: TextInputType.phone,
                    errorText: errors['pemesanPhone'],
                    onChanged: (val) {
                      if (_isSameAsPemesan && participants.isNotEmpty) {
                        setState(() {
                          participants[0].hp = val;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildInputLabel('Tanggal Lahir *'),
                            GestureDetector(
                              onTap: () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: DateTime(1998, 5, 15),
                                  firstDate: DateTime(1950),
                                  lastDate: DateTime.now(),
                                );
                                if (picked != null) {
                                  setState(() {
                                    _pemesanBirthDate = DateFormat('yyyy-MM-dd').format(picked);
                                    if (_isSameAsPemesan && participants.isNotEmpty) {
                                      participants[0].tanggalLahir = _pemesanBirthDate;
                                    }
                                  });
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFCBD5E1)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(_pemesanBirthDate, style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A))),
                                    const Icon(Icons.calendar_today, size: 16, color: Color(0xFF64748B)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildInputLabel('Jenis Kelamin *'),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFCBD5E1)),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _pemesanGender,
                                  isExpanded: true,
                                  items: ['Laki-laki', 'Perempuan'].map((g) => DropdownMenuItem(value: g, child: Text(g, style: const TextStyle(fontSize: 13)))).toList(),
                                  onChanged: (val) {
                                    if (val != null) {
                                      setState(() {
                                        _pemesanGender = val;
                                        if (_isSameAsPemesan && participants.isNotEmpty) {
                                          participants[0].gender = val;
                                        }
                                      });
                                    }
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // BAGIAN 2: DATA PESERTA TRIP
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '2. Data Peserta Trip ($participantCount Orang)',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Lengkapi nama, nomor HP, dan jenis kelamin seluruh peserta yang akan berangkat.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 16),

                  ...List.generate(participantCount, (index) {
                    final p = participants[index];
                    final bool isFirst = index == 0;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(16),
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
                                'Peserta ${index + 1}',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF007BFF)),
                              ),
                              if (isFirst)
                                Row(
                                  children: [
                                    Checkbox(
                                      value: _isSameAsPemesan,
                                      onChanged: _onSameAsPemesanChanged,
                                      activeColor: const Color(0xFF007BFF),
                                    ),
                                    const Text('Peserta 1 sama dengan Pemesan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                                  ],
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildInputLabel('Nama Lengkap Peserta *'),
                                    TextFormField(
                                      initialValue: p.nama,
                                      readOnly: isFirst && _isSameAsPemesan,
                                      onChanged: (val) => p.nama = val,
                                      decoration: InputDecoration(
                                        hintText: 'testing',
                                        filled: isFirst && _isSameAsPemesan,
                                        fillColor: isFirst && _isSameAsPemesan ? const Color(0xFFF1F5F9) : Colors.white,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildInputLabel('Nomor HP Peserta *'),
                                    TextFormField(
                                      initialValue: p.hp,
                                      readOnly: isFirst && _isSameAsPemesan,
                                      onChanged: (val) => p.hp = val,
                                      decoration: InputDecoration(
                                        hintText: '081221213149',
                                        filled: isFirst && _isSameAsPemesan,
                                        fillColor: isFirst && _isSameAsPemesan ? const Color(0xFFF1F5F9) : Colors.white,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildInputLabel('Jenis Kelamin *'),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10),
                                      decoration: BoxDecoration(
                                        color: isFirst && _isSameAsPemesan ? const Color(0xFFF1F5F9) : Colors.white,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: const Color(0xFFCBD5E1)),
                                      ),
                                      child: DropdownButtonHideUnderline(
                                        child: DropdownButton<String>(
                                          value: p.gender,
                                          isExpanded: true,
                                          items: ['Laki-laki', 'Perempuan'].map((g) => DropdownMenuItem(value: g, child: Text(g, style: const TextStyle(fontSize: 12)))).toList(),
                                          onChanged: (isFirst && _isSameAsPemesan) ? null : (val) {
                                            if (val != null) setState(() => p.gender = val);
                                          },
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildInputLabel('Tanggal Lahir Peserta *'),
                                    TextFormField(
                                      initialValue: p.tanggalLahir,
                                      readOnly: isFirst && _isSameAsPemesan,
                                      onChanged: (val) => p.tanggalLahir = val,
                                      decoration: InputDecoration(
                                        hintText: '01/01/2000',
                                        filled: isFirst && _isSameAsPemesan,
                                        fillColor: isFirst && _isSameAsPemesan ? const Color(0xFFF1F5F9) : Colors.white,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                        suffixIcon: const Icon(Icons.calendar_today, size: 14),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _buildInputLabel('Riwayat Penyakit & Alergi (Maks. 255 Karakter, opsional)'),
                          TextFormField(
                            initialValue: p.riwayatPenyakit,
                            onChanged: (val) => p.riwayatPenyakit = val,
                            maxLength: 255,
                            decoration: InputDecoration(
                              hintText: 'Tidak Ada',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  if (!_validateForm()) return;

                  final DateTime parsedDate = DateTime.now().add(const Duration(days: 7));
                  final bookingResult = await ApiService.createBooking(
                    packageId: package.id,
                    packageDetails: package,
                    customerName: _pemesanNameCtrl.text,
                    guests: participantCount,
                    totalPrice: totalPrice,
                    tripDate: parsedDate,
                  );

                  widget.onNavigate(7, arguments: {'booking': bookingResult});
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF007BFF),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: const Text(
                  'Lanjut ke Konfirmasi Pemesanan',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: TripKitaBottomNavigation(
        currentIndex: 2,
        onTap: (index) => widget.onNavigate(index),
      ),
    );
  }

  Widget _buildInputLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        label,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required IconData icon,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    String? errorText,
    Function(String)? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: errorText != null ? Colors.red : const Color(0xFFCBD5E1)),
          ),
          child: Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFF94A3B8)),
              const SizedBox(width: 8),
              Expanded(
                child: TextFormField(
                  controller: controller,
                  onChanged: onChanged,
                  keyboardType: keyboardType,
                  style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                  decoration: InputDecoration(
                    hintText: hint,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (errorText != null)
          Padding(
            padding: const EdgeInsets.only(top: 4, left: 4),
            child: Text(errorText, style: const TextStyle(fontSize: 11, color: Colors.red, fontWeight: FontWeight.bold)),
          ),
      ],
    );
  }
}
