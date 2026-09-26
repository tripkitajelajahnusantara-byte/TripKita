/// Ulasan terverifikasi dari `GET /public/reviews/package/:id`.
class PackageReview {
  final int id;
  final int rating;
  final String comment;
  final DateTime? createdAt;

  const PackageReview({required this.id, required this.rating, required this.comment, this.createdAt});

  factory PackageReview.fromJson(Map<String, dynamic> json) {
    final created = json['createdAt'];
    return PackageReview(
      id: (json['id'] as num?)?.toInt() ?? 0,
      rating: (json['rating'] as num?)?.toInt() ?? 0,
      comment: json['comment'] as String? ?? '',
      createdAt: created is String ? DateTime.tryParse(created)?.toLocal() : null,
    );
  }
}

/// Profil publik mitra dari `GET /public/providers/:id`.
class PublicProvider {
  final int id;
  final String businessName;
  final String businessCategory;
  final String operationalProvince;
  final String operationalCity;
  final String description;
  final bool isVerified;
  final double rating;
  final int totalTravelers;
  final DateTime? createdAt;

  const PublicProvider({
    required this.id,
    required this.businessName,
    this.businessCategory = '',
    this.operationalProvince = '',
    this.operationalCity = '',
    this.description = '',
    this.isVerified = false,
    this.rating = 0,
    this.totalTravelers = 0,
    this.createdAt,
  });

  factory PublicProvider.fromJson(Map<String, dynamic> json) {
    final created = json['createdAt'];
    return PublicProvider(
      id: (json['id'] as num?)?.toInt() ?? 0,
      businessName: json['businessName'] as String? ?? '',
      businessCategory: json['businessCategory'] as String? ?? '',
      operationalProvince: json['operationalProvince'] as String? ?? '',
      operationalCity: json['operationalCity'] as String? ?? '',
      description: json['description'] as String? ?? '',
      isVerified: json['isVerified'] as bool? ?? false,
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      totalTravelers: (json['totalTravelers'] as num?)?.toInt() ?? 0,
      createdAt: created is String ? DateTime.tryParse(created)?.toLocal() : null,
    );
  }
}
