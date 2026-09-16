class ReviewItem {
  final int id;
  final int packageId;
  final String customerName;
  final String customerAvatar;
  final double rating;
  final String comment;
  final String date;
  final String? providerResponse;

  ReviewItem({
    required this.id,
    required this.packageId,
    required this.customerName,
    required this.customerAvatar,
    required this.rating,
    required this.comment,
    required this.date,
    this.providerResponse,
  });

  factory ReviewItem.fromJson(Map<String, dynamic> json) {
    return ReviewItem(
      id: json['id'] as int,
      packageId: json['packageId'] as int,
      customerName: json['customerName'] as String,
      customerAvatar: json['customerAvatar'] as String? ?? '',
      rating: (json['rating'] as num).toDouble(),
      comment: json['comment'] as String,
      date: json['date'] as String,
      providerResponse: json['providerResponse'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'packageId': packageId,
      'customerName': customerName,
      'customerAvatar': customerAvatar,
      'rating': rating,
      'comment': comment,
      'date': date,
      'providerResponse': providerResponse,
    };
  }
}
