import 'package:customer_mobile/services/checkout_config.dart';
import 'package:customer_mobile/models/package.dart';

/// Status pesanan dari backend (`backend/models/booking.go`).
class BookingStatus {
  static const pendingPayment = 'PENDING_PAYMENT';
  static const paid = 'PAID';
  static const confirmed = 'CONFIRMED';
  static const completed = 'COMPLETED';
  static const failed = 'FAILED';
  static const expired = 'EXPIRED';
  static const cancelledByCustomer = 'CANCELLED_BY_CUSTOMER';
  static const cancelledByProvider = 'CANCELLED_BY_PROVIDER';
  static const refundRequired = 'REFUND_REQUIRED';
  static const refunded = 'REFUNDED';
  static const rescheduleOffered = 'RESCHEDULE_OFFERED';
}

/// Data peserta yang diisi pada form pemesanan.
class Participant {
  String name;
  String phone;
  String gender;
  String birthDate;
  String medicalHistory;

  Participant({
    this.name = '',
    this.phone = '',
    this.gender = '',
    this.birthDate = '',
    this.medicalHistory = '',
  });

  /// Format `participants` pada `POST /public/bookings`.
  Map<String, dynamic> toApiJson() {
    final notes = medicalHistory.trim();
    return {
      'name': name.trim(),
      'phone': phone.trim(),
      'gender': gender,
      'birthDate': birthDate,
      'medicalNotes': notes == '-' || notes.toLowerCase() == 'tidak ada' ? '' : notes,
    };
  }

  Participant copy() => Participant(
        name: name,
        phone: phone,
        gender: gender,
        birthDate: birthDate,
        medicalHistory: medicalHistory,
      );
}

/// Kontak utama pemesan.
class BookerContact {
  final String name;
  final String email;
  final String whatsapp;

  const BookerContact({required this.name, required this.email, required this.whatsapp});
}

/// Pilihan yang dibawa dari halaman detail paket ke form pemesanan.
class BookingDraft {
  final TripPackage package;
  final int guests;

  /// Tanggal berangkat (YYYY-MM-DD).
  final String startDate;

  /// Tanggal selesai (YYYY-MM-DD).
  final String endDate;

  /// Label jadwal yang ditampilkan ke pengguna.
  final String scheduleLabel;

  const BookingDraft({
    required this.package,
    required this.guests,
    required this.startDate,
    required this.endDate,
    required this.scheduleLabel,
  });

  int get packageTotal => package.price * guests;
  /// Total tagihan dengan biaya layanan dari `CheckoutConfig` backend.
  int totalWithFee(int serviceFee) => packageTotal + serviceFee;
}

class Booking {
  final int id;
  final String bookingCode;
  final int packageId;
  final TripPackage? packageDetails;
  final String packageNameFallback;
  final String customerName;
  final DateTime? tripDate;
  final int guests;
  final int totalPrice;
  final String status;
  final String paymentUrl;
  final DateTime? createdAt;
  final String providerWhatsApp;
  final String providerName;
  final DateTime? rescheduleDate;
  final String cancellationReason;

  const Booking({
    required this.id,
    required this.bookingCode,
    this.packageId = 0,
    this.packageDetails,
    this.packageNameFallback = '',
    this.customerName = '',
    this.tripDate,
    this.guests = 0,
    this.totalPrice = 0,
    this.status = BookingStatus.pendingPayment,
    this.paymentUrl = '',
    this.createdAt,
    this.providerWhatsApp = '',
    this.providerName = '',
    this.rescheduleDate,
    this.cancellationReason = '',
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    int asInt(Object? v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
    String asString(Object? v) => v is String ? v : '';
    DateTime? asDate(Object? v) => v is String && v.isNotEmpty ? DateTime.tryParse(v)?.toLocal() : null;

    final details = json['packageDetails'];
    final pkg = details is Map<String, dynamic> && asInt(details['id']) > 0 ? TripPackage.fromJson(details) : null;
    return Booking(
      id: asInt(json['id']),
      bookingCode: asString(json['bookingCode']).isNotEmpty ? asString(json['bookingCode']) : asString(json['booking_code']),
      packageId: asInt(json['packageId']),
      packageDetails: pkg,
      packageNameFallback: details is Map ? asString(details['name']) : asString(json['packageName']),
      customerName: asString(json['customerName']),
      tripDate: asDate(json['tripDate']),
      guests: asInt(json['guests']),
      totalPrice: asInt(json['totalPrice']),
      status: asString(json['status']).isEmpty ? BookingStatus.pendingPayment : asString(json['status']),
      paymentUrl: asString(json['paymentUrl']).isNotEmpty ? asString(json['paymentUrl']) : asString(json['payment_url']),
      createdAt: asDate(json['createdAt']),
      providerWhatsApp: asString(json['providerWhatsApp']),
      providerName: asString(json['providerName']),
      rescheduleDate: asDate(json['rescheduleDate']),
      cancellationReason: asString(json['cancellationReason']),
    );
  }

  String get packageName =>
      packageDetails?.name ?? (packageNameFallback.isNotEmpty ? packageNameFallback : 'Paket Wisata Nusantara');

  DateTime? get paymentDeadline => createdAt?.add(CheckoutConfig.currentPaymentWindow);

  /// Checkout iPaymu berlaku 24 jam; setelah itu pesanan dianggap kedaluwarsa
  /// di tampilan walaupun backend belum memperbarui statusnya.
  bool get isPaymentExpired {
    if (status == BookingStatus.expired) return true;
    final deadline = paymentDeadline;
    return status == BookingStatus.pendingPayment && deadline != null && DateTime.now().isAfter(deadline);
  }

  bool get isPaidOrActive =>
      status == BookingStatus.paid || status == BookingStatus.confirmed || status == BookingStatus.completed;
}
