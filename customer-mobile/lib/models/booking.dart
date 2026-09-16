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
  String status; // PENDING_PAYMENT, PAID, CONFIRMED, COMPLETED, CANCELLED, EXPIRED
  final String paymentUrl;
  final DateTime createdAt;
  final List<Participant> participants;
  bool hasReviewed;
  double? reviewRating;
  String? reviewComment;

  DateTime get bookingDate => tripDate;

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
    this.hasReviewed = false,
    this.reviewRating,
    this.reviewComment,
  });

  static final List<Booking> mockBookings = [
    Booking(
      id: 101,
      bookingCode: 'TK-2824-9988',
      providerId: 101,
      packageId: 1,
      packageDetails: TripPackage.allPackages[0], // Raja Ampat
      customerName: 'Budi Santoso',
      customerInitial: 'BS',
      tripDate: DateTime.now().add(const Duration(days: 5, hours: 6)),
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
      packageDetails: TripPackage.allPackages[1], // Labuan Bajo
      customerName: 'Budi Santoso',
      customerInitial: 'BS',
      tripDate: DateTime.now().subtract(const Duration(days: 10)),
      guests: 1,
      totalPrice: 2190000,
      dpAmount: 0,
      paymentMethod: 'Virtual Account',
      status: 'COMPLETED',
      paymentUrl: '',
      createdAt: DateTime.now().subtract(const Duration(days: 15)),
      hasReviewed: false,
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
      hasReviewed: json['hasReviewed'] as bool? ?? false,
      reviewRating: json['reviewRating'] != null ? (json['reviewRating'] as num).toDouble() : null,
      reviewComment: json['reviewComment'] as String?,
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
      'hasReviewed': hasReviewed,
      'reviewRating': reviewRating,
      'reviewComment': reviewComment,
    };
  }
}
