// Centralized categories & trip types synced across Web Customer, Web Provider, and Admin
export const OFFICIAL_CATEGORIES = [
  "City Tour",
  "Diving & Snorkeling",
  "Wisata Budaya & Sejarah",
  "Pantai",
  "Gunung",
  "Curug",
  "Keluarga Santai"
];

export const OFFICIAL_TRIP_TYPES = [
  "Open Trip",
  "Private Trip",
  "Honeymoon",
  "Family",
  "Corporate"
];

// Helper to get 3 highlights for package card UI
export function getHighlightsForPackage(pkg: { name?: string; tripType?: string; category?: string; highlights?: string[] }): string[] {
  if (pkg.highlights && pkg.highlights.length >= 3) {
    return pkg.highlights.slice(0, 3);
  }
  const nameLower = (pkg.name || '').toLowerCase();
  const typeLower = (pkg.tripType || '').toLowerCase();
  const catLower = (pkg.category || '').toLowerCase();

  if (nameLower.includes('bromo')) {
    return ['🌋 Golden Sunrise Bromo', '🚙 Hardtop Jeep 4x4', '☕ Kopi Klotok Pasuruan'];
  }
  if (nameLower.includes('jogja') || nameLower.includes('yogyakarta')) {
    return ['🏛️ Candi Borobudur', '🏰 Tamansari & Malioboro', '☕ Kopi Klotok & Gudeg'];
  }
  if (nameLower.includes('bali') || typeLower.includes('honeymoon')) {
    return ['👩‍❤️‍👨 Floating Breakfast', '🏡 Private Pool Villa', '🌅 Candlelight Dinner'];
  }
  if (nameLower.includes('tidung') || nameLower.includes('pantai') || nameLower.includes('palu')) {
    return ['🪸 Snorkeling Terumbu Karang', '📸 Free Foto Underwater', '🚴 Sepeda Keliling Pulau'];
  }
  if (nameLower.includes('baduy')) {
    return ['🌾 Suku Baduy Dalam', '🏡 Menginap di Saung Tradisional', '☕ Minum Kopi Khas Baduy'];
  }
  if (nameLower.includes('ranu') || nameLower.includes('kumbolo')) {
    return ['🏕️ Camping Ranu Kumbolo', '🌌 Stargazing Milky Way', '🍲 Full Board Catering'];
  }
  if (nameLower.includes('cilember') || catLower.includes('curug')) {
    return ['🌊 7 Tingkat Air Terjun', '🌲 Hutan Pinus Asri', '🔥 Api Unggun Malam'];
  }
  if (typeLower.includes('family') || catLower.includes('keluarga')) {
    return ['👨‍👩‍👧‍👦 Ramah Anak & Lansia', '🚌 Van Executive AC', '🏨 Hotel Bintang 4'];
  }
  if (typeLower.includes('corporate')) {
    return ['🎯 Outbound Team Building', '🚌 Bus Luxury VIP', '🍢 Gala Dinner & BBQ'];
  }
  if (typeLower.includes('private')) {
    return ['🚗 Mobil Private & Driver', '📸 Pemandu & Dokum Pro', '⏱️ Jam Trip Fleksibel'];
  }

  return ['⭐ Tour Guide Berlisensi', '📸 Dokumentasi Lengkap', '🚗 Armada Transport AC'];
}

// Centralized mapping of authentic, verified photos for all TripKita packages
export function getTripImage(id?: number, name: string = '', category: string = '', uploadedImage?: string): string {
  if (uploadedImage && uploadedImage.trim() !== '') {
    const firstImg = uploadedImage.split(',')[0].trim();
    if (firstImg) return firstImg;
  }
  const nameLower = name.toLowerCase();
  const catLower = category.toLowerCase();

  // 1. Match by exact package ID or specific landmark keywords
  if (id === 1 || nameLower.includes('bromo')) {
    return 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 2 || nameLower.includes('tidung')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 3 || nameLower.includes('cilember') || catLower.includes('curug')) {
    return 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 4 || nameLower.includes('bandung')) {
    return 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 5 || nameLower.includes('baduy')) {
    return 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 6 || nameLower.includes('ranu') || nameLower.includes('kumbolo')) {
    return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 7 || nameLower.includes('palu') || nameLower.includes('tanjung karang')) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80';
  }
  if (id === 8 || nameLower.includes('yogyakarta') || nameLower.includes('jogja')) {
    return 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80';
  }

  // 2. Match by category
  if (catLower.includes('diving') || catLower.includes('snorkeling') || nameLower.includes('diving') || nameLower.includes('raja ampat')) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80';
  }
  if (catLower.includes('pantai') || catLower.includes('beach')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
  }
  if (catLower.includes('gunung') || catLower.includes('mountain')) {
    return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
  }
  if (catLower.includes('budaya') || catLower.includes('sejarah') || catLower.includes('temple')) {
    return 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80';
  }
  if (catLower.includes('city') || catLower.includes('tour')) {
    return 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80';
  }
  if (catLower.includes('keluarga') || catLower.includes('family')) {
    return 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80';
  }

  // Default fallback
  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';
}

