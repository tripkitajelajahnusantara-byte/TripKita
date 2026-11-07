import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Backpack, CalendarDays, ChevronLeft, ChevronRight, Ghost, Landmark, LayoutGrid, Mail,
  MountainSnow, Newspaper, SquarePen, UtensilsCrossed, type LucideIcon,
} from 'lucide-react';
import { ApiError, request } from '../utils/api';
import { resolveMediaUrl } from '../utils/tripImages';
import {
  NEWS_CATEGORIES, countWords, coverCredit, formatNewsDate, htmlToText, isNewsCategory, newsCategoryHash, newsCategoryLabel,
  newsHash, readingMinutes, splitNewsPages, toDisplayHtml,
  type NewsCategory, type NewsHighlights, type NewsItem, type NewsPage as NewsPageData,
} from '../utils/news';
import { Skeleton } from '../components/Skeleton';
import { NewsComments } from '../components/NewsComments';
import { getLang, useI18n } from '../i18n';

const STORY_EMAIL = 'tripkitajelajahnusantara@gmail.com';
const CATEGORY_ICONS: Record<NewsCategory, LucideIcon> = {
  destinasi: MountainSnow,
  kuliner: UtensilsCrossed,
  'wisata-budaya': Landmark,
  'tips-travel': Backpack,
  mistis: Ghost,
  lainnya: LayoutGrid,
};

// Artikel dibuka lewat #/berita?id=12 (halaman berikutnya &hal=2) dan daftar
// kategori lewat #/berita?kategori=mistis sehingga tautannya dapat dibagikan
// dan tombol kembali browser berfungsi.
function readNewsLocation() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const id = Number(params.get('id'));
  const page = Number(params.get('hal'));
  const category = params.get('kategori');
  return {
    id: Number.isInteger(id) && id > 0 ? id : null,
    page: Number.isInteger(page) && page > 1 ? page : 1,
    category: isNewsCategory(category) ? category : null,
  };
}

// Dipakai di dalam efek fetch; getLang() dibaca saat gagal agar efek tidak
// perlu bergantung pada t (ganti bahasa tidak boleh memuat ulang berita).
const loadFailed = () => (getLang() === 'en' ? 'Could not load news.' : 'Berita gagal dimuat.');

const fetchNewsPage = (page: number, category?: NewsCategory | null): Promise<NewsPageData> =>
  request(`/public/news?page=${page}${category ? `&category=${category}` : ''}`);

export function NewsPage() {
  const [location, setLocation] = useState(readNewsLocation);
  useEffect(() => {
    const onHashChange = () => setLocation(readNewsLocation());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.id, location.page, location.category]);

  return (
    <div className="news-page animate-fade-in">
      {location.id
        ? <NewsArticle key={location.id} id={location.id} page={location.page} />
        : <NewsIndex category={location.category} />}
      <style>{NEWS_PAGE_CSS}</style>
    </div>
  );
}

const Cover: React.FC<{ src: string; className: string }> = ({ src, className }) => {
  const url = resolveMediaUrl(src);
  return (
    <div className={`news-cover ${className}`}>
      {url ? <img src={url} alt="" loading="lazy" /> : <Newspaper size={28} strokeWidth={1.4} aria-hidden="true" />}
    </div>
  );
};

const CategoryChip: React.FC<{ slug: string }> = ({ slug }) => {
  const { lang } = useI18n();
  return <span className="news-chip">{newsCategoryLabel(slug, lang)}</span>;
};

const NewsDate: React.FC<{ value: string | null; withIcon?: boolean }> = ({ value, withIcon = true }) => {
  const { locale } = useI18n();
  if (!value) return null;
  const label = new Date(value).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  return (
    <time className="news-date" dateTime={value}>
      {withIcon && <CalendarDays size={14} aria-hidden="true" />}{label}
    </time>
  );
};

const SectionTitle: React.FC<{ id?: string; as?: 'h1' | 'h2'; children: React.ReactNode }> = ({ id, as: Tag = 'h2', children }) => (
  <Tag id={id} className="news-section-title">{children}</Tag>
);

function NewsIndex({ category }: { category: NewsCategory | null }) {
  const { t } = useI18n();
  // Kategori di sidebar. Di halaman daftar kategori, pilihannya mengikuti URL.
  const [selected, setSelected] = useState<NewsCategory>(category ?? NEWS_CATEGORIES[0].slug);
  const active = category ?? selected;
  const choose = (slug: NewsCategory) => {
    setSelected(slug);
    if (category) window.location.hash = newsCategoryHash(slug);
  };

  return (
    <div className="news-container news-layout">
      <div className="news-main">
        {category ? (
          <CategoryArticles key={category} category={category} />
        ) : (
          <>
            <h1 className="news-visually-hidden">{t('Berita', 'News')}</h1>
            <Highlights />
            <section aria-labelledby="news-latest-title">
              <SectionTitle id="news-latest-title">{t('Berita Terbaru', 'Latest News')}</SectionTitle>
              <NewsFeed />
            </section>
          </>
        )}
      </div>
      <aside className="news-side">
        <StoryInvite />
        <TopicPicker active={active} onSelect={choose} />
        <CategoryLatest key={active} category={active} />
      </aside>
    </div>
  );
}

function Highlights() {
  const { t } = useI18n();
  const [data, setData] = useState<NewsHighlights | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Gagal memuat sorotan tidak menutup halaman: Berita Terbaru tetap tampil.
    request('/public/news-highlights')
      .then((value: NewsHighlights) => { if (!cancelled) setData(value); })
      .catch(() => { if (!cancelled) setData({ featured: [], editorPicks: [] }); });
    return () => { cancelled = true; };
  }, []);

  if (!data) {
    return (
      <div className="news-highlight-loading" aria-busy="true" aria-label={t('Memuat berita utama', 'Loading top stories')}>
        <Skeleton height={360} radius={18} />
        <div className="news-support">
          {[0, 1, 2, 3].map((key) => <Skeleton key={key} height={150} radius={12} />)}
        </div>
      </div>
    );
  }

  const [lead, ...support] = data.featured;
  return (
    <>
      {lead && (
        <section className="news-top" aria-label={t('Berita utama', 'Top stories')}>
          <a className="news-hero" href={newsHash(lead.id)}>
            <Cover src={lead.coverImage} className="news-hero-cover" />
            <div className="news-hero-body">
              <CategoryChip slug={lead.category} />
              <h2>{lead.title}</h2>
              <NewsDate value={lead.publishedAt} />
            </div>
          </a>
          {support.length > 0 && (
            <ul className="news-support">
              {support.map((item) => (
                <li key={item.id}>
                  <a className="news-support-card" href={newsHash(item.id)}>
                    <Cover src={item.coverImage} className="news-support-cover" />
                    <h3>{item.title}</h3>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {data.editorPicks.length > 0 && <EditorPicks items={data.editorPicks} />}
    </>
  );
}

function EditorPicks({ items }: { items: NewsItem[] }) {
  const { t } = useI18n();
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => setEdges({
      atStart: track.scrollLeft <= 4,
      atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
    });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    track.addEventListener('scroll', update, { passive: true });
    return () => { observer.disconnect(); track.removeEventListener('scroll', update); };
  }, []);

  const slide = (direction: 1 | -1) => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (track && card) track.scrollBy({ left: direction * (card.offsetWidth + 16), behavior: 'smooth' });
  };

  return (
    <section className="news-picks" aria-labelledby="news-picks-title">
      <SectionTitle id="news-picks-title">{t('Pilihan Redaksi', "Editor's Picks")}</SectionTitle>
      <div className="news-carousel">
        <button type="button" className="news-carousel-btn is-prev" onClick={() => slide(-1)} disabled={edges.atStart} aria-label={t('Sebelumnya', 'Previous')}>
          <ChevronLeft size={20} />
        </button>
        <ul className="news-carousel-track" ref={trackRef} tabIndex={0} aria-label={t('Geser untuk melihat pilihan redaksi lainnya', "Scroll to see more editor's picks")}>
          {items.map((item) => (
            <li key={item.id}>
              <a className="news-pick" href={newsHash(item.id)}>
                <div className="news-pick-media">
                  <Cover src={item.coverImage} className="news-pick-cover" />
                  <CategoryChip slug={item.category} />
                </div>
                <h3>{item.title}</h3>
                <NewsDate value={item.publishedAt} />
              </a>
            </li>
          ))}
        </ul>
        <button type="button" className="news-carousel-btn is-next" onClick={() => slide(1)} disabled={edges.atEnd} aria-label={t('Berikutnya', 'Next')}>
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}

// Daftar berita terbit terbaru (semua atau satu kategori) dengan tombol muat lagi.
function NewsFeed({ category, onTotal }: { category?: NewsCategory; onTotal?: (total: number) => void }) {
  const { t } = useI18n();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchNewsPage(1, category)
      .then((data) => { if (!cancelled) { setItems(data.items); setTotal(data.total); onTotal?.(data.total); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : loadFailed()); });
    return () => { cancelled = true; };
    // onTotal sengaja tidak menjadi dependensi: cukup dilaporkan saat data dimuat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, attempt]);

  const loadMore = async () => {
    setLoadingMore(true);
    setError('');
    try {
      const data = await fetchNewsPage(page + 1, category);
      // Berita yang baru terbit menggeser urutan; cegah baris ganda.
      setItems((current) => [...(current ?? []), ...data.items.filter((item) => !current?.some((row) => row.id === item.id))]);
      setTotal(data.total);
      setPage(page + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : loadFailed());
    } finally {
      setLoadingMore(false);
    }
  };

  if (error && !items) {
    return (
      <div className="news-state">
        <p>{error}</p>
        <button type="button" className="news-btn" onClick={() => { setError(''); setAttempt((current) => current + 1); }}>{t('Coba lagi', 'Try again')}</button>
      </div>
    );
  }
  if (!items) {
    return (
      <div className="news-rows" aria-busy="true" aria-label={t('Memuat berita', 'Loading news')}>
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="news-row">
            <Skeleton height={100} radius={12} />
            <div><Skeleton width={90} height={18} radius={999} /><Skeleton height={18} style={{ marginTop: 10 }} /><Skeleton width={160} height={13} style={{ marginTop: 10 }} /></div>
          </div>
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="news-state">
        <Newspaper size={32} strokeWidth={1.4} aria-hidden="true" />
        <p>{category ? t('Belum ada artikel dalam kategori ini.', 'No articles in this category yet.') : t('Belum ada berita. Kabar terbaru akan muncul di sini.', 'No news yet. The latest updates will appear here.')}</p>
      </div>
    );
  }
  return (
    <>
      <ul className="news-rows">
        {items.map((item) => (
          <li key={item.id}>
            <a className="news-row" href={newsHash(item.id)}>
              <Cover src={item.coverImage} className="news-row-cover" />
              <div className="news-row-body">
                <CategoryChip slug={item.category} />
                <h3>{item.title}</h3>
                <NewsDate value={item.publishedAt} />
              </div>
            </a>
          </li>
        ))}
      </ul>
      {error && <p className="news-inline-error" role="alert">{error}</p>}
      {items.length < total && (
        <div className="news-more">
          <button type="button" className="news-btn" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? t('Memuat…', 'Loading…') : t('Muat artikel lainnya', 'Load more articles')}
          </button>
        </div>
      )}
    </>
  );
}

function CategoryArticles({ category }: { category: NewsCategory }) {
  const { t, lang } = useI18n();
  const [total, setTotal] = useState<number | null>(null);
  const Icon = CATEGORY_ICONS[category];
  const label = newsCategoryLabel(category, lang);
  return (
    <section aria-labelledby="news-category-title">
      <a className="news-back" href={newsHash()}><ArrowLeft size={16} /> {t('Semua berita', 'All news')}</a>
      <header className="news-category-head">
        <span className="news-category-icon" aria-hidden="true"><Icon size={26} strokeWidth={1.8} /></span>
        <div>
          <SectionTitle id="news-category-title" as="h1">{t(`Artikel ${label}`, label)}</SectionTitle>
          {total !== null && <p>{t(`${total} artikel`, `${total} ${total === 1 ? 'article' : 'articles'}`)}</p>}
        </div>
      </header>
      <NewsFeed category={category} onTotal={setTotal} />
    </section>
  );
}

function StoryInvite() {
  const { t } = useI18n();
  const subject = encodeURIComponent(t('Cerita Liburan untuk TemenTrip', 'Holiday story for TemenTrip'));
  return (
    <section className="news-story" aria-labelledby="news-story-title">
      <div className="news-story-art" aria-hidden="true">
        <svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMax slice">
          <circle cx="238" cy="46" r="22" fill="#fde68a" opacity=".9" />
          <path d="M0 120 L0 84 L52 48 L96 78 L150 34 L214 86 L262 60 L320 92 L320 120 Z" fill="#5eead4" opacity=".55" />
          <path d="M0 120 L0 100 L70 70 L128 96 L188 64 L252 98 L320 80 L320 120 Z" fill="#ffffff" opacity=".9" />
        </svg>
        <span className="news-story-badge"><SquarePen size={20} /></span>
      </div>
      <div className="news-story-body">
        <h2 id="news-story-title">{t('Ceritakan Pengalaman Liburanmu!', 'Tell Us About Your Trip!')}</h2>
        <p>
          {t('Bagikan cerita seru, unik, menarik, atau pengalaman ', 'Share a fun, unusual, or memorable story, including ')}
          <strong>{t('mistis', 'mystical')}</strong>
          {t(' saat traveling di berbagai destinasi di Indonesia.', ' experiences, from your travels around Indonesia.')}
        </p>
        <a className="news-story-mail" href={`mailto:${STORY_EMAIL}?subject=${subject}`}>
          {/* Pemutusan baris hanya di depan "@" bila sidebar sempit. */}
          <Mail size={17} aria-hidden="true" /> <span>{STORY_EMAIL.split('@')[0]}<wbr />@{STORY_EMAIL.split('@')[1]}</span>
        </a>
        <p className="news-story-reward">
          {t('Cerita terpilih berkesempatan ', 'Selected stories could ')}
          <span>{t('menghasilkan jutaan rupiah!', 'earn you millions of rupiah!')}</span>
        </p>
      </div>
    </section>
  );
}

function TopicPicker({ active, onSelect }: { active: NewsCategory; onSelect: (slug: NewsCategory) => void }) {
  const { t, lang } = useI18n();
  return (
    <section className="news-side-card" aria-labelledby="news-topics-title">
      <SectionTitle id="news-topics-title">{t('Topik Pilihan', 'Topics')}</SectionTitle>
      <div className="news-topics" role="group" aria-label={t('Pilih topik', 'Choose a topic')}>
        {NEWS_CATEGORIES.map(({ slug }) => {
          const Icon = CATEGORY_ICONS[slug];
          return (
            <button key={slug} type="button" className="news-topic" aria-pressed={active === slug} onClick={() => onSelect(slug)}>
              <Icon size={26} strokeWidth={1.8} aria-hidden="true" />
              <span>{newsCategoryLabel(slug, lang)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CategoryLatest({ category }: { category: NewsCategory }) {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const label = newsCategoryLabel(category, lang);

  useEffect(() => {
    let cancelled = false;
    fetchNewsPage(1, category)
      .then((data) => { if (!cancelled) setItems(data.items.slice(0, 3)); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [category]);

  return (
    <section className="news-side-card" aria-labelledby="news-category-latest" aria-live="polite">
      <SectionTitle id="news-category-latest">{t(`Artikel ${label} Terbaru`, `Latest in ${label}`)}</SectionTitle>
      {failed ? (
        <p className="news-side-empty">{t('Artikel gagal dimuat.', 'Could not load articles.')}</p>
      ) : !items ? (
        <div className="news-mini-list" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="news-mini"><Skeleton height={72} radius={10} /><div><Skeleton height={14} /><Skeleton width="60%" height={12} style={{ marginTop: 8 }} /></div></div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="news-side-empty">{t('Belum ada artikel dalam kategori ini.', 'No articles in this category yet.')}</p>
      ) : (
        <>
          <ul className="news-mini-list">
            {items.map((item) => (
              <li key={item.id}>
                <a className="news-mini" href={newsHash(item.id)}>
                  <Cover src={item.coverImage} className="news-mini-cover" />
                  <div>
                    <h3>{item.title}</h3>
                    <NewsDate value={item.publishedAt} />
                  </div>
                </a>
              </li>
            ))}
          </ul>
          <a className="news-see-all" href={newsCategoryHash(category)}>
            {t(`Lihat Semua Artikel ${label}`, `See all in ${label}`)} <ArrowRight size={16} aria-hidden="true" />
          </a>
        </>
      )}
    </section>
  );
}

function ArticlePager({ id, page, total }: { id: number; page: number; total: number }) {
  const { t } = useI18n();
  return (
    <nav className="news-pager" aria-label={t('Halaman artikel', 'Article pages')}>
      {page > 1
        ? <a className="news-pager-step" href={newsHash(id, page - 1)}><ArrowLeft size={16} /> {t('Sebelumnya', 'Previous')}</a>
        : <span className="news-pager-step is-disabled" aria-hidden="true"><ArrowLeft size={16} /> {t('Sebelumnya', 'Previous')}</span>}
      <ol>
        {Array.from({ length: total }, (_, index) => index + 1).map((number) => (
          <li key={number}>
            <a href={newsHash(id, number)} aria-label={t(`Halaman ${number}`, `Page ${number}`)} aria-current={number === page ? 'page' : undefined}>{number}</a>
          </li>
        ))}
      </ol>
      {page < total
        ? <a className="news-pager-step" href={newsHash(id, page + 1)}>{t('Selanjutnya', 'Next')} <ArrowRight size={16} /></a>
        : <span className="news-pager-step is-disabled" aria-hidden="true">{t('Selanjutnya', 'Next')} <ArrowRight size={16} /></span>}
    </nav>
  );
}

function NewsArticle({ id, page }: { id: number; page: number }) {
  const { t, lang } = useI18n();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [related, setRelated] = useState<NewsItem[]>([]);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    request(`/public/news/${id}`)
      .then((data: NewsItem) => {
        if (cancelled) return;
        setArticle(data);
        // Berita lain hanya pelengkap; kegagalannya tidak perlu ditampilkan.
        fetchNewsPage(1, data.category)
          .then((list) => { if (!cancelled) setRelated(list.items.filter((item) => item.id !== id).slice(0, 3)); })
          .catch(() => undefined);
      })
      .catch((err) => {
        if (cancelled) return;
        setError({
          notFound: err instanceof ApiError && err.status === 404,
          message: err instanceof Error ? err.message : loadFailed(),
        });
      });
    return () => { cancelled = true; };
  }, [id]);

  const pages = useMemo(() => splitNewsPages(toDisplayHtml(article?.content ?? '')), [article]);
  const backLink = <a className="news-back" href={newsHash()}><ArrowLeft size={16} /> {t('Semua berita', 'All news')}</a>;

  if (error) {
    return (
      <div className="news-article">
        {backLink}
        <div className="news-state">
          <h2>{error.notFound ? t('Berita tidak ditemukan', 'News not found') : t('Berita gagal dimuat', 'Could not load news')}</h2>
          <p>{error.notFound ? t('Berita ini mungkin sudah dihapus atau belum diterbitkan.', 'This article may have been removed or not published yet.') : error.message}</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="news-article" aria-busy="true" aria-label={t('Memuat berita', 'Loading news')}>
        {backLink}
        <Skeleton width={180} height={14} />
        <Skeleton height={36} style={{ marginTop: 16 }} />
        <Skeleton width="65%" height={36} style={{ marginTop: 10 }} />
        <Skeleton height={340} radius={12} style={{ marginTop: 28 }} />
      </div>
    );
  }

  const minutes = readingMinutes(countWords(htmlToText(article.content ?? '')));
  const cover = resolveMediaUrl(article.coverImage);
  const credit = coverCredit(article.coverCaption ?? '', article.coverSource ?? '');
  const current = Math.min(page, pages.length);
  const isLastPage = current === pages.length;

  return (
    <>
      <article className="news-article">
        {backLink}
        <header className="news-article-head">
          <a className="news-chip news-chip-link" href={newsCategoryHash(article.category)}>{newsCategoryLabel(article.category, lang)}</a>
          <p className="news-article-meta">
            <time dateTime={article.publishedAt ?? undefined}>{formatNewsDate(article.publishedAt)}</time> · {t(`${minutes} menit baca`, `${minutes} min read`)}
            {pages.length > 1 && t(` · Halaman ${current} dari ${pages.length}`, ` · Page ${current} of ${pages.length}`)}
          </p>
          <h1>{article.title}</h1>
        </header>
        {cover && current === 1 && (
          <figure className="news-article-figure">
            <img className="news-article-cover" src={cover} alt={article.coverCaption || ''} />
            {credit && <figcaption>{credit}</figcaption>}
          </figure>
        )}
        {/* Isi sudah disaring backend (controllers/news_html.go) sebelum disimpan. */}
        <div className="news-prose" dangerouslySetInnerHTML={{ __html: pages[current - 1] }} />
        {pages.length > 1 && <ArticlePager id={id} page={current} total={pages.length} />}
        <NewsComments newsId={id} />
      </article>

      {isLastPage && related.length > 0 && (
        <section className="news-container news-related" aria-labelledby="news-related-title">
          <SectionTitle id="news-related-title">{t(`Artikel ${newsCategoryLabel(article.category, 'id')} lainnya`, `More in ${newsCategoryLabel(article.category, 'en')}`)}</SectionTitle>
          <ul className="news-related-grid">
            {related.map((item) => (
              <li key={item.id}>
                <a className="news-pick" href={newsHash(item.id)}>
                  <div className="news-pick-media"><Cover src={item.coverImage} className="news-pick-cover" /></div>
                  <h3>{item.title}</h3>
                  <NewsDate value={item.publishedAt} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const NEWS_PAGE_CSS = `
  .news-page {
    --nw-teal: #0d9488; --nw-teal-ink: #0f5f63; --nw-teal-soft: #ccfbf1; --nw-teal-softer: #f0fdfa; --nw-ink: #0b3443;
    background: #fff; padding: 40px 0 88px; min-height: 60vh;
  }
  .news-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
  .news-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .news-page ul, .news-page ol { list-style: none; }
  .news-page a:focus-visible, .news-page button:focus-visible, .news-carousel-track:focus-visible {
    outline: 2px solid var(--nw-teal); outline-offset: 3px; border-radius: 12px;
  }

  .news-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 40px; align-items: start; }
  .news-main { min-width: 0; display: flex; flex-direction: column; gap: 48px; }
  .news-side { display: flex; flex-direction: column; gap: 24px; position: sticky; top: 104px; }

  .news-section-title {
    display: flex; align-items: center; gap: 14px; font-size: 26px; line-height: 1.2; color: var(--nw-ink);
    letter-spacing: -0.015em; margin-bottom: 20px;
  }
  .news-section-title::after { content: ""; width: 44px; height: 4px; border-radius: 4px; background: var(--nw-teal); flex: none; }
  .news-side .news-section-title { font-size: 21px; margin-bottom: 16px; }

  .news-chip {
    align-self: flex-start; display: inline-flex; align-items: center; height: 22px; padding: 0 10px; border-radius: 999px;
    background: var(--nw-teal); color: #fff; font-size: 12px; font-weight: 700; letter-spacing: .01em; white-space: nowrap;
  }
  .news-date { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b; }
  .news-cover { overflow: hidden; background: #e2e8f0; color: #94a3b8; display: flex; align-items: center; justify-content: center; }
  .news-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform .45s ease; }
  a:hover > .news-cover img, a:hover .news-pick-media img { transform: scale(1.04); }

  .news-top { display: flex; flex-direction: column; gap: 16px; }
  .news-hero { position: relative; display: block; border-radius: 20px; overflow: hidden; aspect-ratio: 16 / 9; min-height: 300px; isolation: isolate; }
  .news-hero-cover { position: absolute; inset: 0; z-index: -1; }
  .news-hero::after {
    content: ""; position: absolute; inset: 0; z-index: -1;
    background: linear-gradient(180deg, rgb(2 6 23 / 0) 30%, rgb(2 6 23 / .55) 62%, rgb(2 6 23 / .88) 100%);
  }
  .news-hero-body { position: absolute; left: 0; right: 0; bottom: 0; padding: 32px; display: flex; flex-direction: column; gap: 12px; }
  .news-hero-body h2 { color: #fff; font-size: 34px; line-height: 1.18; letter-spacing: -0.02em; max-width: 680px; text-wrap: balance; }
  .news-hero-body .news-date { color: #e2e8f0; }
  .news-hero:hover h2 { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 5px; }
  .news-support { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .news-support-card {
    display: flex; flex-direction: column; height: 100%; border-radius: 14px; overflow: hidden; background: #fff;
    border: 1px solid var(--color-border); transition: box-shadow .2s, border-color .2s;
  }
  .news-support-card:hover { border-color: #cbd5e1; box-shadow: 0 10px 24px -14px rgb(15 23 42 / .35); }
  .news-support-cover { aspect-ratio: 16 / 10; }
  .news-support-card h3 {
    margin: 10px 12px 12px; font-family: var(--font-primary); font-size: 13.5px; font-weight: 600; line-height: 1.4; color: var(--color-text-dark);
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
  .news-highlight-loading { display: flex; flex-direction: column; gap: 16px; }

  .news-carousel { position: relative; }
  .news-carousel-track {
    display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 32px) / 3); gap: 16px;
    overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; scrollbar-width: none; padding: 4px 2px 8px;
  }
  .news-carousel-track::-webkit-scrollbar { display: none; }
  .news-carousel-track > li { scroll-snap-align: start; min-width: 0; }
  .news-carousel-btn {
    position: absolute; top: 34%; z-index: 2; width: 42px; height: 42px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center; background: #fff; color: var(--nw-ink);
    border: 1px solid var(--color-border); box-shadow: 0 6px 18px -6px rgb(15 23 42 / .35); transition: opacity .2s, transform .2s;
  }
  .news-carousel-btn:hover:not(:disabled) { transform: scale(1.06); color: var(--nw-teal); }
  .news-carousel-btn:disabled { opacity: 0; pointer-events: none; }
  .news-carousel-btn.is-prev { left: -18px; }
  .news-carousel-btn.is-next { right: -18px; }
  .news-pick { display: flex; flex-direction: column; gap: 8px; height: 100%; }
  .news-pick-media { position: relative; border-radius: 14px; overflow: hidden; }
  .news-pick-cover { aspect-ratio: 4 / 3; }
  .news-pick-media .news-chip { position: absolute; left: 10px; bottom: 10px; }
  .news-pick h3 {
    margin-top: 4px; font-family: var(--font-primary); font-size: 15.5px; font-weight: 700; line-height: 1.4; color: var(--color-text-dark);
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; transition: color .15s;
  }
  .news-pick:hover h3, .news-row:hover h3, .news-mini:hover h3 { color: var(--nw-teal-ink); }

  .news-rows { display: flex; flex-direction: column; }
  .news-rows > li + li, .news-rows > .news-row + .news-row { border-top: 1px solid #eef2f6; }
  .news-row { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 20px; align-items: center; padding: 16px 0; }
  .news-row-cover { aspect-ratio: 16 / 10; border-radius: 12px; }
  .news-row-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .news-row h3 {
    font-family: var(--font-primary); font-size: 18px; font-weight: 700; line-height: 1.38; color: var(--color-text-dark);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; transition: color .15s;
  }

  .news-category-head { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
  .news-category-head .news-section-title { margin-bottom: 2px; font-size: 30px; }
  .news-category-head p { color: #64748b; font-size: 14px; }
  .news-category-icon {
    flex: none; width: 56px; height: 56px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;
    background: var(--nw-teal-soft); color: var(--nw-teal-ink);
  }

  .news-side-card { padding: 22px; border-radius: 18px; background: #f8fafc; border: 1px solid #eef2f6; }
  .news-topics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .news-topic {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 92px; padding: 12px 6px;
    border-radius: 14px; background: #fff; border: 1px solid #e2e8f0; color: var(--nw-teal);
    font-size: 13.5px; font-weight: 600; text-align: center; line-height: 1.25; transition: border-color .15s, box-shadow .15s, background .15s, color .15s;
  }
  .news-topic span { color: var(--color-text-dark); }
  .news-topic:hover { border-color: var(--nw-teal); box-shadow: 0 8px 18px -12px rgb(13 148 136 / .6); }
  .news-topic[aria-pressed="true"] { background: var(--nw-teal); border-color: var(--nw-teal); color: #fff; box-shadow: 0 10px 22px -12px rgb(13 148 136 / .9); }
  .news-topic[aria-pressed="true"] span { color: #fff; }

  .news-mini-list { display: flex; flex-direction: column; gap: 14px; }
  .news-mini { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 12px; align-items: center; }
  .news-mini-cover { aspect-ratio: 4 / 3; border-radius: 10px; }
  .news-mini h3 {
    font-family: var(--font-primary); font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--color-text-dark); margin-bottom: 6px;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; transition: color .15s;
  }
  .news-mini .news-date { font-size: 12px; }
  .news-side-empty { font-size: 14px; color: #64748b; line-height: 1.55; }
  .news-see-all {
    display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0;
    font-size: 14px; font-weight: 700; color: var(--nw-teal-ink);
  }
  .news-see-all:hover { color: var(--nw-teal); }
  .news-see-all:hover svg { transform: translateX(3px); }
  .news-see-all svg { transition: transform .15s; }

  .news-story { border-radius: 20px; overflow: hidden; background: #fff; border: 1px solid #ccfbf1; box-shadow: 0 18px 40px -28px rgb(13 148 136 / .7); }
  .news-story-art { position: relative; height: 120px; background: linear-gradient(135deg, #0f766e 0%, #14b8a6 55%, #5eead4 100%); }
  .news-story-art svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .news-story-badge {
    position: absolute; left: 22px; bottom: -20px; width: 48px; height: 48px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center; background: var(--nw-teal); color: #fff;
    border: 4px solid #fff; box-shadow: 0 6px 14px -6px rgb(15 23 42 / .4);
  }
  .news-story-body { padding: 30px 22px 22px; display: flex; flex-direction: column; gap: 14px; }
  .news-story-body h2 { font-size: 27px; line-height: 1.12; color: var(--nw-ink); letter-spacing: -0.02em; font-style: italic; }
  .news-story-body > p { font-size: 15px; line-height: 1.6; color: #334155; }
  .news-story-mail {
    display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 8px 14px; border-radius: 999px;
    border: 1.5px solid var(--nw-teal); color: var(--nw-teal-ink); font-size: 13.5px; font-weight: 700; text-align: center; transition: background .15s, color .15s;
  }
  .news-story-mail span { min-width: 0; }
  .news-story-mail:hover { background: var(--nw-teal); color: #fff; }
  .news-story-reward { text-align: center; font-family: var(--font-display); font-size: 17px; font-weight: 700; font-style: italic; color: var(--nw-ink); line-height: 1.5; }
  .news-story-reward span {
    display: inline-block; margin-top: 6px; padding: 4px 14px; border-radius: 10px; transform: rotate(-2deg);
    background: var(--nw-ink); color: #fff; font-size: 19px;
  }

  .news-more { display: flex; justify-content: center; margin-top: 28px; }
  .news-btn {
    height: 42px; padding: 0 22px; border-radius: 999px; border: 1px solid #cbd5e1;
    font-size: 14px; font-weight: 600; color: var(--color-text-dark); background: #fff;
  }
  .news-btn:hover:not(:disabled) { border-color: var(--nw-teal); color: var(--nw-teal-ink); }
  .news-btn:disabled { opacity: .6; cursor: default; }
  .news-inline-error { margin-top: 24px; text-align: center; color: #b91c1c; font-size: 14px; }
  .news-state {
    display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
    padding: 56px 16px; color: #94a3b8; border: 1px dashed #e2e8f0; border-radius: 16px;
  }
  .news-state h2 { font-size: 20px; margin-top: 4px; }
  .news-state p { color: var(--color-text-medium); max-width: 420px; }
  .news-state .news-btn { margin-top: 12px; }

  .news-back { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 20px; }
  .news-back:hover { color: var(--nw-teal-ink); }
  .news-article { max-width: 760px; margin: 0 auto; padding: 0 24px; }
  .news-article .news-back { margin-bottom: 28px; }
  .news-article-head { display: flex; flex-direction: column; gap: 10px; }
  .news-chip-link:hover { background: var(--nw-teal-ink); }
  .news-article-meta { font-size: 13px; color: #64748b; }
  .news-article-head h1 { font-size: 40px; line-height: 1.18; letter-spacing: -0.02em; }
  .news-article-figure { margin: 32px 0 36px; }
  .news-article-cover { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 14px; }
  .news-article-figure figcaption { margin-top: 8px; font-size: 13px; line-height: 1.5; color: #64748b; }
  .news-article-head + .news-prose { margin-top: 32px; }
  .news-pager {
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--color-border);
  }
  .news-pager ol { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
  .news-pager ol a {
    min-width: 38px; height: 38px; padding: 0 6px; border-radius: 8px; border: 1px solid var(--color-border);
    display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: #475569;
  }
  .news-pager ol a:hover { border-color: var(--color-text-dark); color: var(--color-text-dark); }
  .news-pager ol a[aria-current="page"] { background: var(--nw-ink); border-color: var(--nw-ink); color: #fff; }
  .news-pager-step { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--nw-teal-ink); }
  .news-pager-step:hover { text-decoration: underline; }
  .news-pager-step.is-disabled { color: #cbd5e1; pointer-events: none; }
  .news-related { margin-top: 72px; padding-top: 40px; border-top: 1px solid var(--color-border); max-width: 1000px; }
  .news-related-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }

  @media (max-width: 1080px) {
    .news-layout { grid-template-columns: minmax(0, 1fr); }
    .news-side { position: static; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .news-side .news-story { grid-row: span 2; }
  }
  @media (max-width: 760px) {
    .news-page { padding: 24px 0 64px; }
    .news-container, .news-article { padding: 0 16px; }
    .news-main { gap: 40px; }
    .news-side { display: flex; }
    .news-section-title { font-size: 22px; }
    .news-hero { aspect-ratio: 4 / 5; min-height: 0; border-radius: 16px; }
    .news-hero-body { padding: 20px; }
    .news-hero-body h2 { font-size: 24px; }
    .news-support { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .news-carousel-track { grid-auto-columns: 78%; }
    .news-carousel-btn { display: none; }
    .news-row { grid-template-columns: 112px minmax(0, 1fr); gap: 14px; padding: 14px 0; }
    .news-row-cover { aspect-ratio: 1; }
    .news-row h3 { font-size: 15.5px; -webkit-line-clamp: 3; }
    .news-row .news-date { font-size: 12px; }
    .news-category-head .news-section-title { font-size: 24px; }
    .news-article-head h1 { font-size: 28px; }
    .news-article-figure { margin: 24px 0 28px; }
    .news-article-cover { border-radius: 10px; }
    .news-pager { justify-content: center; }
    .news-pager-step { flex: 1 1 40%; }
    .news-pager-step:last-child { justify-content: flex-end; }
    .news-pager ol { order: 3; flex-basis: 100%; }
    .news-related-grid { grid-template-columns: minmax(0, 1fr); gap: 20px; }
  }
`;
