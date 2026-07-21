import 'package:customer_mobile/models/package.dart';

class Participant {
  String fullName;
  String email;
  String whatsappNumber;
  String gender; // Laki-laki, Perempuan
  String dateOfBirth;
  String optionalNotes;

  Participant({
    this.fullName = '',
    this.email = '',
    this.whatsappNumber = '',
    this.gender = 'Laki-laki',
    this.dateOfBirth = '',
    this.optionalNotes = '',
  });

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      fullName: json['fullName'] as String? ?? '',
      email: json['email'] as String? ?? '',
      whatsappNumber: json['whatsappNumber'] as String? ?? '',
      gender: json['gender'] as String? ?? 'Laki-laki',
      dateOfBirth: json['dateOfBirth'] as String? ?? '',
      optionalNotes: json['optionalNotes'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'fullName': fullName,
      'email': email,
      'whatsappNumber': whatsappNumber,
      'gender': gender,
      'dateOfBirth': dateOfBirth,
      'optionalNotes': optionalNotes,
    };
  }
}

class Booking {
  final int id;
  final String bookingCode;
  final int providerId;
  final int packageId;
  final TripPackage? packageDetails;
  final String customerName;
  final String customerInitial;
  final DateTime tripDate;
  final int guests;
  final int totalPrice;
  final int dpAmount;
  final String paymentMethod;
  final String status; // PENDING_PAYMENT, PAID, CONFIRMED, COMPLETED, etc.
  final String paymentUrl;
  final DateTime createdAt;
  final List<Participant> participants;

  Booking({
    required this.id,
    required this.bookingCode,
    required this.providerId,
    required this.packageId,
    this.packageDetails,
    required this.customerName,
    required this.customerInitial,
    required this.tripDate,
    required this.guests,
    required this.totalPrice,
    required this.dpAmount,
    required this.paymentMethod,
    required this.status,
    required this.paymentUrl,
    required this.createdAt,
    required this.participants,
  });

  static final List<Booking> mockBookings = [
    Booking(
      id: 101,
      bookingCode: 'TK-2824-9988',
      providerId: 101,
      packageId: 1,
      packageDetails: TripPackage(
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
      customerName: 'Budi Santoso',
      customerInitial: 'BS',
      tripDate: DateTime.now().add(const Duration(days: 5, hours: 6)), // Dynamically 5 days from now
      guests: 2,
      totalPrice: 5500000,
      dpAmount: 0,
      paymentMethod: 'QRIS',
      status: 'PAID',
      paymentUrl: '',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      participants: [
        Participant(fullName: 'Budi Santoso', email: 'budi.santoso@gmail.com', whatsappNumber: '08123456789', gender: 'Laki-laki', dateOfBirth: '1990-05-15'),
        Participant(fullName: 'Siti Aminah', email: 'siti.aminah@gmail.com', whatsappNumber: '08129876543', gender: 'Perempuan', dateOfBirth: '1992-08-20'),
      ],
    ),
    Booking(
      id: 102,
      bookingCode: 'TK-2824-1122',
      providerId: 102,
      packageId: 2,
      packageDetails: TripPackage(
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
        itinerary: [
          'Hari 1: Penjemputan di Bandara Komodo - Check-in Kapal Phinisi - Sunset di Pulau Kalong',
          'Hari 2: Trekking Pulau Padar - Snorkeling di Pink Beach - Melihat Komodo di Pulau Rinca',
          'Hari 3: Snorkeling dengan Manta Ray di Manta Point - Kembali ke Labuan Bajo - Bandara'
        ],
        facilities: ['Sewa Kapal Phinisi', 'Makan 3x Sehari', 'Alat Snorkeling', 'Kamera Air / GoPro', 'Pemandu Wisata'],
        includes: ['Tiket Taman Nasional Komodo', 'Air Mineral & Cemilan', 'Penjemputan Hotel/Bandara'],
        excludes: ['Tiket Pesawat ke Labuan Bajo', 'Tips ABK & Pemandu'],
        meetingPoint: 'Bandara Udara Komodo, Labuan Bajo',
      ),
      customerName: 'Budi Santoso',
      customerInitial: 'BS',
      tripDate: DateTime.now().subtract(const Duration(days: 2)), // 2 days ago
      guests: 1,
      totalPrice: 2190000,
      dpAmount: 0,
      paymentMethod: 'Virtual Account',
      status: 'FAILED',
      paymentUrl: '',
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
      participants: [
        Participant(fullName: 'Budi Santoso', email: 'budi.santoso@gmail.com', whatsappNumber: '08123456789', gender: 'Laki-laki', dateOfBirth: '1990-05-15'),
      ],
    ),
  ];

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] as int,
      bookingCode: json['bookingCode'] as String? ?? '',
      providerId: json['providerId'] as int,
      packageId: json['packageId'] as int,
      packageDetails: json['packageDetails'] != null
          ? TripPackage.fromJson(json['packageDetails'] as Map<String, dynamic>)
          : null,
      customerName: json['customerName'] as String,
      customerInitial: json['customerInitial'] as String? ?? '',
      tripDate: DateTime.parse(json['tripDate'] as String),
      guests: json['guests'] as int,
      totalPrice: (json['totalPrice'] as num).toInt(),
      dpAmount: (json['dpAmount'] as num? ?? 0).toInt(),
      paymentMethod: json['paymentMethod'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING_PAYMENT',
      paymentUrl: json['paymentUrl'] as String? ?? '',
      createdAt: DateTime.parse(json['createdAt'] as String? ?? DateTime.now().toIso8601String()),
      participants: json['participants'] != null
          ? (json['participants'] as List)
              .map((p) => Participant.fromJson(p as Map<String, dynamic>))
              .toList()
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'bookingCode': bookingCode,
      'providerId': providerId,
      'packageId': packageId,
      'packageDetails': packageDetails?.toJson(),
      'customerName': customerName,
      'customerInitial': customerInitial,
      'tripDate': tripDate.toIso8601String(),
      'guests': guests,
      'totalPrice': totalPrice,
      'dpAmount': dpAmount,
      'paymentMethod': paymentMethod,
      'status': status,
      'paymentUrl': paymentUrl,
      'createdAt': createdAt.toIso8601String(),
      'participants': participants.map((p) => p.toJson()).toList(),
    };
  }
}
