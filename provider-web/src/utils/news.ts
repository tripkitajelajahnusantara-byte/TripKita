import { BACKEND_ORIGIN } from './tripImages';
import { groupNewsBlocks, NEWS_IMAGE_CHARS } from './newsPages';
import { getLang } from '../i18n';

// Slug kategori sama persis dengan models.NewsCategories di backend.
export const NEWS_CATEGORIES = [
  { slug: 'destinasi', id: 'Destinasi', en: 'Destinations' },
  { slug: 'kuliner', id: 'Kuliner', en: 'Culinary' },
  { slug: 'wisata-budaya', id: 'Wisata Budaya', en: 'Culture' },
  { slug: 'tips-travel', id: 'Tips Travel', en: 'Travel Tips' },
  { slug: 'mistis', id: 'Mistis', en: 'Mystical' },
  { slug: 'lainnya', id: 'Lainnya', en: 'Others' },
] as const;
export type NewsCategory = typeof NEWS_CATEGORIES[number]['slug'];

export const isNewsCategory = (value: unknown): value is NewsCategory =>
  NEWS_CATEGORIES.some((category) => category.slug === value);

export function newsCategoryLabel(slug: string, lang: 'id' | 'en' = 'id') {
  const category = NEWS_CATEGORIES.find((item) => item.slug === slug);
  return category ? category[lang] : slug;
}

export interface NewsItem {
  id: number;
  title: string;
  category: NewsCategory;
  excerpt: string;
  coverImage: string;
  coverCaption: string;
  coverSource: string;
  content?: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsHighlights {
  featured: NewsItem[];
  editorPicks: NewsItem[];
}

export interface NewsComment {
  id: number;
  parentId: number | null;
  displayName: string;
  anonymous: boolean;
  body: string;
  mine: boolean;
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
  value ? new Date(value).toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '';

export function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// ±200 kata per menit, minimal 1 menit.
export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 200));

export function htmlToText(html: string) {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
}

export const newsHash = (id?: number, page = 1) =>
  (id ? `#/berita?id=${id}${page > 1 ? `&hal=${page}` : ''}` : '#/berita');
export const newsCategoryHash = (slug: string) => `#/berita?kategori=${slug}`;

/** Keterangan foto sampul gaya media: "Keterangan (Foto: Sumber)". */
export function coverCredit(caption: string, source: string) {
  const credit = source.trim() ? `${getLang() === 'en' ? 'Photo' : 'Foto'}: ${source.trim()}` : '';
  if (!caption.trim()) return credit;
  return credit ? `${caption.trim()} (${credit})` : caption.trim();
}

/** Memecah isi artikel menjadi HTML per halaman (lihat aturan di newsPages.ts). */
export function splitNewsPages(html: string): string[] {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  const nodes = Array.from(body.childNodes).filter((node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim());
  const blocks = nodes.map((node) => {
    const element = node instanceof Element ? node : null;
    const images = element ? Number(element.matches('img')) + element.querySelectorAll('img').length : 0;
    return {
      size: (node.textContent ?? '').trim().length + images * NEWS_IMAGE_CHARS,
      heading: !!element?.matches('h2, h3'),
    };
  });
  return groupNewsBlocks(blocks).map((indexes) => {
    const page = document.createElement('div');
    page.append(...indexes.map((index) => nodes[index]));
    return page.innerHTML;
  });
}
