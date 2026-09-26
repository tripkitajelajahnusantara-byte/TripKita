import 'dart:convert';

import 'package:customer_mobile/config/app_config.dart';

/// Satu kegiatan pada itinerary paket.
class ItineraryItem {
  final String day;
  final String title;
  final String description;

  const ItineraryItem({required this.day, required this.title, required this.description});
}

/// Paket wisata sesuai respons `GET /public/packages` (lihat
/// `backend/models/package.go`).
class TripPackage {
  final int id;
  final int providerId;
  final String name;
  final String destination;
  final String meetingPoint;
  final String category;
  final String tripType;
  final int price;
  final int quotaMin;
  final int quotaUsed;
  final int quotaMax;
  final String startDate;
  final String endDate;
  final String schedule;
  final int duration;
  final int minGuests;
  final int maxGuests;
  final String status;
  final double rating;
  final String description;
  final String includedFacilitiesRaw;
  final String excludedFacilitiesRaw;
  final String itineraryRaw;
  final String image;
  final String imagesRaw;

  /// Tanggal yang dibuka mitra untuk paket selain Open Trip (YYYY-MM-DD).
  final List<String> availableDates;

  /// Tanggal yang sudah terkunci oleh pesanan lain (YYYY-MM-DD).
  final List<String> bookedDates;

  const TripPackage({
    required this.id,
    required this.providerId,
    required this.name,
    required this.destination,
    this.meetingPoint = '',
    this.category = '',
    this.tripType = '',
    required this.price,
    this.quotaMin = 1,
    this.quotaUsed = 0,
    this.quotaMax = 0,
    this.startDate = '',
    this.endDate = '',
    this.schedule = '',
    this.duration = 1,
    this.minGuests = 1,
    this.maxGuests = 0,
    this.status = 'Aktif',
    this.rating = 0,
    this.description = '',
    this.includedFacilitiesRaw = '',
    this.excludedFacilitiesRaw = '',
    this.itineraryRaw = '',
    this.image = '',
    this.imagesRaw = '',
    this.availableDates = const [],
    this.bookedDates = const [],
  });

  factory TripPackage.fromJson(Map<String, dynamic> json) {
    int asInt(Object? v, [int fallback = 0]) => v is num ? v.toInt() : int.tryParse('$v') ?? fallback;
    String asString(Object? v) => v is String ? v : (v == null ? '' : '$v');
    List<String> asStringList(Object? v) => v is List ? v.map((e) => '$e').toList() : const [];

    final provider = json['provider'];
    var providerId = asInt(json['providerId']);
    if (providerId == 0 && provider is Map) providerId = asInt(provider['id']);

    final images = json['images'];
    return TripPackage(
      id: asInt(json['id']),
      providerId: providerId,
      name: asString(json['name']),
      destination: asString(json['destination']),
      meetingPoint: asString(json['meetingPoint']),
      category: asString(json['category']),
      tripType: asString(json['tripType']),
      price: asInt(json['price']),
      quotaMin: asInt(json['quotaMin'], 1),
      quotaUsed: asInt(json['quotaUsed']),
      quotaMax: asInt(json['quotaMax']),
      startDate: asString(json['startDate']),
      endDate: asString(json['endDate']),
      schedule: asString(json['schedule']),
      duration: asInt(json['duration'], 1),
      minGuests: asInt(json['minGuests'], 1),
      maxGuests: asInt(json['maxGuests']),
      status: asString(json['status']),
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : 0,
      description: asString(json['description']),
      includedFacilitiesRaw: asString(json['includedFacilities']),
      excludedFacilitiesRaw: asString(json['excludedFacilities']),
      itineraryRaw: asString(json['itinerary']),
      image: asString(json['image']),
      imagesRaw: images is List ? images.join(',') : asString(images),
      availableDates: asStringList(json['availableDates']),
      bookedDates: asStringList(json['bookedDates']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'providerId': providerId,
        'name': name,
        'destination': destination,
        'meetingPoint': meetingPoint,
        'category': category,
        'tripType': tripType,
        'price': price,
        'quotaMin': quotaMin,
        'quotaUsed': quotaUsed,
        'quotaMax': quotaMax,
        'startDate': startDate,
        'endDate': endDate,
        'schedule': schedule,
        'duration': duration,
        'minGuests': minGuests,
        'maxGuests': maxGuests,
        'status': status,
        'rating': rating,
        'description': description,
        'includedFacilities': includedFacilitiesRaw,
        'excludedFacilities': excludedFacilitiesRaw,
        'itinerary': itineraryRaw,
        'image': image,
        'images': imagesRaw,
        'availableDates': availableDates,
        'bookedDates': bookedDates,
      };

  bool get isOpenTrip => tripType.isEmpty || tripType == 'Open Trip';
  bool get isCorporate => tripType == 'Corporate' || category == 'Corporate';
  int get durationDays => duration < 1 ? 1 : duration;
  int get minRequiredGuests => minGuests < 1 ? 1 : minGuests;
  int get availableSeats {
    final seats = quotaMax - quotaUsed;
    return seats < 0 ? 0 : seats;
  }

  bool get isActive => status.isEmpty || status == 'Aktif' || status.toLowerCase() == 'published';

  /// Daftar foto paket yang valid. Path relatif dilengkapi dengan origin
  /// backend, teks lain yang bukan URL dibuang (mengikuti web).
  List<String> get photos {
    String normalize(String raw) {
      final url = raw.trim();
      if (url.isEmpty) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      final looksLikePath = url.startsWith('/') ||
          url.startsWith('uploads/') ||
          url.startsWith('storage/') ||
          RegExp(r'\.(jpg|jpeg|png|webp|gif)$', caseSensitive: false).hasMatch(url);
      if (!looksLikePath) return '';
      final origin = AppConfig.backendOrigin;
      return url.startsWith('/') ? '$origin$url' : '$origin/$url';
    }

    final fromImages = imagesRaw.split(',').map(normalize).where((u) => u.isNotEmpty).toList();
    if (fromImages.isNotEmpty) return fromImages;
    final single = normalize(image);
    return single.isEmpty ? const [] : [single];
  }

  List<String> get includedFacilities => _lines(includedFacilitiesRaw);
  List<String> get excludedFacilities => _lines(excludedFacilitiesRaw);

  static List<String> _lines(String raw) =>
      raw.split('\n').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();

  /// Itinerary disimpan mitra sebagai JSON `[{day, activities: [{time, title, description}]}]`.
  List<ItineraryItem> get itinerary {
    if (itineraryRaw.trim().isEmpty) return const [];
    try {
      final parsed = jsonDecode(itineraryRaw);
      if (parsed is! List) return const [];
      final items = <ItineraryItem>[];
      for (final day in parsed) {
        if (day is! Map) continue;
        final activities = day['activities'];
        if (activities is! List) continue;
        for (final act in activities) {
          if (act is! Map) continue;
          final time = '${act['time'] ?? ''}'.trim();
          final title = '${act['title'] ?? ''}'.trim();
          items.add(ItineraryItem(
            day: 'Hari ${day['day']}',
            title: time.isNotEmpty ? '$time — $title' : title,
            description: '${act['description'] ?? ''}',
          ));
        }
      }
      return items;
    } catch (_) {
      return const [];
    }
  }
}
