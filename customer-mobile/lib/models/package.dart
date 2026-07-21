class TripPackage {
  final int id;
  final int providerId;
  final String name;
  final String destination;
  final int price;
  final int quotaUsed;
  final int quotaMax;
  final String schedule; // comma-separated or date format
  final String status; // Aktif, Draft, Nonaktif
  final double rating;

  // Additional UI-centric properties for high-fidelity presentation
  final String duration;
  final String tripType; // Open Trip, Private Trip, Honeymoon, Family, Corporate
  final int minParticipants;
  final int availableSeats;
  final String description;
  final List<String> images;
  final List<String> itinerary;
  final List<String> facilities;
  final List<String> includes;
  final List<String> excludes;
  final String meetingPoint;
  final int reviewCount;

  TripPackage({
    required this.id,
    required this.providerId,
    required this.name,
    required this.destination,
    required this.price,
    required this.quotaUsed,
    required this.quotaMax,
    required this.schedule,
    required this.status,
    required this.rating,
    required this.duration,
    required this.tripType,
    required this.minParticipants,
    required this.availableSeats,
    required this.description,
    required this.images,
    required this.itinerary,
    required this.facilities,
    required this.includes,
    required this.excludes,
    required this.meetingPoint,
    required this.reviewCount,
  });

  factory TripPackage.fromJson(Map<String, dynamic> json) {
    return TripPackage(
      id: json['id'] as int,
      providerId: json['providerId'] as int,
      name: json['name'] as String,
      destination: json['destination'] as String,
      price: (json['price'] as num).toInt(),
      quotaUsed: json['quotaUsed'] as int? ?? 0,
      quotaMax: json['quotaMax'] as int,
      schedule: json['schedule'] as String,
      status: json['status'] as String? ?? 'Draft',
      rating: (json['rating'] as num? ?? 0.0).toDouble(),
      duration: json['duration'] as String? ?? '3 Hari 2 Malam',
      tripType: json['tripType'] as String? ?? 'Open Trip',
      minParticipants: json['minParticipants'] as int? ?? 4,
      availableSeats: json['availableSeats'] as int? ?? 12,
      description: json['description'] as String? ?? '',
      images: List<String>.from(json['images'] ?? []),
      itinerary: List<String>.from(json['itinerary'] ?? []),
      facilities: List<String>.from(json['facilities'] ?? []),
      includes: List<String>.from(json['includes'] ?? []),
      excludes: List<String>.from(json['excludes'] ?? []),
      meetingPoint: json['meetingPoint'] as String? ?? 'Bandara Udara Terdekat',
      reviewCount: json['reviewCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'providerId': providerId,
      'name': name,
      'destination': destination,
      'price': price,
      'quotaUsed': quotaUsed,
      'quotaMax': quotaMax,
      'schedule': schedule,
      'status': status,
      'rating': rating,
      'duration': duration,
      'tripType': tripType,
      'minParticipants': minParticipants,
      'availableSeats': availableSeats,
      'description': description,
      'images': images,
      'itinerary': itinerary,
      'facilities': facilities,
      'includes': includes,
      'excludes': excludes,
      'meetingPoint': meetingPoint,
      'reviewCount': reviewCount,
    };
  }
}
