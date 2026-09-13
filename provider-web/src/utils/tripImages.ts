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

export const EMPTY_TRIP_IMAGE = '/images/trip-image-unavailable.svg';

export function getHighlightsForPackage(pkg: { highlights?: string[]; includedFacilities?: string }): string[] {
  return (pkg.highlights || pkg.includedFacilities?.split('\n') || []).filter(Boolean).slice(0, 3);
}

export function getTripImage(...args: [id?: number, name?: string, category?: string, uploadedImage?: string]): string {
  const uploadedImage = args[3];
  const path = typeof uploadedImage === 'string' ? uploadedImage.split(',').map(value => value.trim()).find(Boolean) : '';
  if (!path) return EMPTY_TRIP_IMAGE;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:image/')) return path;
  if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
    return API_BASE_URL.replace(/\/api\/v1\/?$/, '') + '/' + path.replace(/^\//, '');
  }
  return path.startsWith('/') ? path : EMPTY_TRIP_IMAGE;
}
