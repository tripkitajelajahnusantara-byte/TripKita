import { API_BASE_URL } from './api';

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
  meetingPointLatitude?: number;
  meetingPointLongitude?: number;
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

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, '');
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2']);

// Mengubah nilai foto dari database menjadi URL yang dapat dimuat browser.
// Path relatif ("/uploads/x.jpg") dilengkapi origin backend aktif. URL absolut
// yang tersimpan dengan host lokal (unggahan lama saat development) diarahkan
// ulang ke backend aktif agar tidak pernah memuat localhost di deployment.
// Teks yang bukan URL/path gambar dibuang.
export function resolveMediaUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (LOCAL_HOSTNAMES.has(parsed.hostname) && parsed.pathname.startsWith('/uploads/')) {
        return `${BACKEND_ORIGIN}${parsed.pathname}`;
      }
    } catch {
      return '';
    }
    return trimmed;
  }
  if (trimmed.startsWith('//')) return '';
  if (trimmed.startsWith('/') || trimmed.startsWith('uploads/') || trimmed.startsWith('storage/') || /\.(jpe?g|png|webp|gif)$/i.test(trimmed)) {
    return trimmed.startsWith('/') ? `${BACKEND_ORIGIN}${trimmed}` : `${BACKEND_ORIGIN}/${trimmed}`;
  }
  return '';
}

// Semua foto paket (sudah di-resolve), urut sesuai unggahan mitra.
export function getTripImages(pkg: { images?: unknown; image?: unknown; imageUrl?: unknown } | null | undefined): string[] {
  if (!pkg) return [];
  for (const source of [pkg.images, pkg.image, pkg.imageUrl]) {
    const candidates: unknown[] = Array.isArray(source)
      ? source
      : (typeof source === 'string' ? source.split(',') : []);
    const resolved = candidates.map(resolveMediaUrl).filter(Boolean);
    if (resolved.length > 0) return resolved;
  }
  return [];
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
    const resolved = resolveMediaUrl(candidate);
    if (resolved) return resolved;
  }
  return '';
}
