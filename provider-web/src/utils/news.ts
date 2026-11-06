import { BACKEND_ORIGIN } from './tripImages';

export interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  coverImage: string;
  content?: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsPage {
  items: NewsItem[];
  total: number;
  page: number;
  pageSize: number;
}

// Foto di isi berita disimpan sebagai path relatif "/uploads/..." agar tidak
// terikat host backend; saat ditampilkan path itu dilengkapi origin backend.
const STORED_SRC = 'src="/uploads/';
const DISPLAY_SRC = `src="${BACKEND_ORIGIN}/uploads/`;
export const toDisplayHtml = (html: string) => html.split(STORED_SRC).join(DISPLAY_SRC);
export const toStoredHtml = (html: string) => html.split(DISPLAY_SRC).join(STORED_SRC);

export const formatNewsDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '';

export function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// ±200 kata per menit, minimal 1 menit.
export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 200));

export function htmlToText(html: string) {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
}

export const newsHash = (id?: number) => (id ? `#/berita?id=${id}` : '#/berita');
