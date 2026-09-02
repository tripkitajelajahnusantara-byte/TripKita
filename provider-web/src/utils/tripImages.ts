// Centralized mapping of authentic, verified photos for all 8 TripKita packages
export function getTripImage(id?: number, name: string = '', _category: string = ''): string {
  const nameLower = name.toLowerCase();

  // 1. Match by exact package ID
  if (id === 1 || nameLower.includes('bromo')) {
    // Authentic Bromo volcano sunrise landscape
    return 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 2 || nameLower.includes('tidung')) {
    // Authentic tropical island beach (Pulau Tidung)
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 3 || nameLower.includes('cilember')) {
    // Tropical jungle waterfall (Curug Cilember)
    return 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 4 || nameLower.includes('bandung')) {
    // Scenic tea plantation hills (Bandung)
    return 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 5 || nameLower.includes('baduy')) {
    // Traditional Indonesian wooden village (Suku Baduy)
    return 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 6 || nameLower.includes('ranu') || nameLower.includes('kumbolo')) {
    // Scenic mountain lake (Ranu Kumbolo)
    return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 7 || nameLower.includes('palu') || nameLower.includes('tanjung karang')) {
    // Turquoise ocean & pier beach (Palu Tanjung Karang)
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 8 || nameLower.includes('yogyakarta') || nameLower.includes('jogja')) {
    // Ancient stone temple stupa (Yogyakarta Prambanan/Borobudur)
    return 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80';
  }

  // Default fallback
  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';
}
