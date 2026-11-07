import { BACKEND_ORIGIN } from './tripImages';
import { groupNewsBlocks, NEWS_IMAGE_CHARS } from './newsPages';
import { getLang } from '../i18n';

export interface NewsItem {
  id: number;
  title: string;
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
