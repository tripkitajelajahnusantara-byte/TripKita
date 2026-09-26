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

export interface HighlightSource {
  includedFacilities?: string;
  duration?: number | string;
  minGuests?: number | string;
  meetingPoint?: string;
}

// Highlight kartu paket dari data asli mitra: 3 baris pertama fasilitas termasuk,
// lalu dilengkapi fakta paket (durasi, minimal peserta, titik kumpul).
export function getHighlightsForPackage(pkg: HighlightSource, limit: number = 3): string[] {
  const highlights: string[] = (pkg.includedFacilities || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit)
    .map((line) => `✓ ${line}`);

  const facts: string[] = [];
  const duration = Number(pkg.duration) || 0;
  if (duration > 0) facts.push(`🗓️ ${duration} Hari`);
  const minGuests = Number(pkg.minGuests) || 0;
  if (minGuests > 1) facts.push(`👥 Min. ${minGuests} Orang`);
  const meetingPoint = (pkg.meetingPoint || '').trim();
  if (meetingPoint.length > 3) facts.push(`📍 ${meetingPoint}`);

  for (const fact of facts) {
    if (highlights.length >= limit) break;
    highlights.push(fact);
  }
  return highlights;
}

// Foto utama paket dari unggahan mitra. Mengembalikan '' bila belum ada foto
// (pemanggil wajib menampilkan placeholder, bukan foto stok).
export function getTripImage(id?: any, _name: string = '', _category: string = '', uploadedImage?: unknown): string {
  // Argumen pertama boleh berupa objek paket
  const source = (id && typeof id === 'object')
    ? (id.images || id.image || id.imageUrl || id.uploadedImage)
    : uploadedImage;

  const candidates: unknown[] = Array.isArray(source)
    ? source
    : (typeof source === 'string' ? source.split(',') : []);

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed && trimmed !== 'undefined' && trimmed !== 'null') return trimmed;
  }
  return '';
}
