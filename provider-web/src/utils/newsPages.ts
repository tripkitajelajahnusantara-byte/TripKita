// Aturan pemotongan artikel berita per halaman. Dipisah dari news.ts agar
// tidak bergantung pada DOM/API dan dapat diuji langsung dengan node --test.

/** Batas teks per halaman artikel (karakter, tanpa tag HTML). */
export const NEWS_PAGE_CHARS = 1000;
/** Satu foto dihitung setara teks sepanjang ini agar halaman bergambar tidak terlalu panjang. */
export const NEWS_IMAGE_CHARS = 400;
/** Halaman terakhir yang lebih pendek dari porsi ini digabung ke halaman sebelumnya. */
const MIN_LAST_PAGE_RATIO = 0.3;

export interface NewsBlock {
  /** Panjang teks blok ditambah bobot foto di dalamnya. */
  size: number;
  /** Judul bagian (h2/h3) tidak boleh tertinggal di akhir halaman. */
  heading: boolean;
}

/**
 * Mengelompokkan blok teratas artikel (paragraf, judul, daftar, foto) menjadi
 * halaman. Halaman hanya dipotong di batas blok, jadi satu paragraf tidak pernah
 * terbelah. Hasilnya daftar indeks blok per halaman.
 */
export function groupNewsBlocks(blocks: NewsBlock[], limit = NEWS_PAGE_CHARS): number[][] {
  const pages: { items: number[]; size: number }[] = [{ items: [], size: 0 }];
  blocks.forEach((block, index) => {
    let page = pages[pages.length - 1];
    if (page.size > 0 && page.size + block.size > limit) {
      const next = { items: [] as number[], size: 0 };
      // Judul bagian ikut pindah ke halaman baru bersama isinya.
      while (page.items.length > 1 && blocks[page.items[page.items.length - 1]].heading) {
        const moved = page.items.pop()!;
        page.size -= blocks[moved].size;
        next.items.unshift(moved);
        next.size += blocks[moved].size;
      }
      pages.push(next);
      page = next;
    }
    page.items.push(index);
    page.size += block.size;
  });
  const last = pages[pages.length - 1];
  if (pages.length > 1 && last.size < limit * MIN_LAST_PAGE_RATIO) {
    pages[pages.length - 2].items.push(...last.items);
    pages.pop();
  }
  return pages.map((page) => page.items);
}
