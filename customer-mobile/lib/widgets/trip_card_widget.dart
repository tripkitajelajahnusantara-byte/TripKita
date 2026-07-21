import 'package:flutter/material.dart';
import 'package:customer_mobile/models/package.dart';
import 'package:intl/intl.dart';

class TripCardWidget extends StatefulWidget {
  final TripPackage package;
  final VoidCallback onTap;

  const TripCardWidget({
    Key? key,
    required this.package,
    required this.onTap,
  }) : super(key: key);

  @override
  State<TripCardWidget> createState() => _TripCardWidgetState();
}

class _TripCardWidgetState extends State<TripCardWidget> {
  bool isWishlisted = false;

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );

    // Dynamic colors based on Trip Type
    Color badgeColor = const Color(0xFF0F8B8D); // Teal default
    Color textColor = Colors.white;

    if (widget.package.tripType.toLowerCase().contains('private')) {
      badgeColor = Colors.blue.shade100;
      textColor = Colors.blue.shade800;
    } else if (widget.package.tripType.toLowerCase().contains('honeymoon')) {
      badgeColor = Colors.pink.shade100;
      textColor = Colors.pink.shade800;
    } else if (widget.package.tripType.toLowerCase().contains('family')) {
      badgeColor = Colors.green.shade100;
      textColor = Colors.green.shade800;
    } else if (widget.package.tripType.toLowerCase().contains('corporate')) {
      badgeColor = Colors.purple.shade100;
      textColor = Colors.purple.shade800;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                // Premium Travel Image
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    widget.package.images.isNotEmpty
                        ? widget.package.images[0]
                        : 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
                    fit: BoxFit.cover,
                    loadingBuilder: (context, child, progress) {
                      if (progress == null) return child;
                      return Container(
                        color: Colors.grey.shade100,
                        child: const Center(
                          child: CircularProgressIndicator(
                            color: Color(0xFF0F8B8D),
                          ),
                        ),
                      );
                    },
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: Colors.grey.shade200,
                        child: Icon(Icons.image, color: Colors.grey.shade400, size: 48),
                      );
                    },
                  ),
                ),
                // Trip Type Badge (Glassmorphic look or pill badge)
                Positioned(
                  top: 16,
                  left: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: widget.package.tripType.toLowerCase() == 'open trip'
                          ? const Color(0xFF0F8B8D)
                          : badgeColor,
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                    child: Text(
                      widget.package.tripType.toUpperCase(),
                      style: TextStyle(
                        color: widget.package.tripType.toLowerCase() == 'open trip'
                            ? Colors.white
                            : textColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
                // Wishlist Icon Button
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: Icon(
                        isWishlisted ? Icons.favorite : Icons.favorite_border,
                        color: isWishlisted ? Colors.red : Colors.grey.shade700,
                      ),
                      onPressed: () {
                        setState(() {
                          isWishlisted = !isWishlisted;
                        });
                      },
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    widget.package.name,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Location and Rating
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined, size: 16, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          widget.package.destination,
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(Icons.star, size: 16, color: Colors.amber.shade600),
                      const SizedBox(width: 2),
                      Text(
                        widget.package.rating.toStringAsFixed(1),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                      if (widget.package.reviewCount > 0) ...[
                        const SizedBox(width: 2),
                        Text(
                          '(${widget.package.reviewCount})',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                        ),
                      ]
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Duration and Min Participants
                  Row(
                    children: [
                      Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        widget.package.duration,
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                      const SizedBox(width: 16),
                      Icon(Icons.people_outline, size: 16, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        'Min. ${widget.package.minParticipants} org',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                  const Divider(height: 24, thickness: 1),
                  // Price and View Detail Button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Mulai dari',
                            style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            currencyFormatter.format(widget.package.price),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F8B8D),
                            ),
                          ),
                        ],
                      ),
                      ElevatedButton(
                        onPressed: widget.onTap,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F8B8D),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12.0),
                          ),
                        ),
                        child: const Text(
                          'Lihat Detail',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
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
  }
}
