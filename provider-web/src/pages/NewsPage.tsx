import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Newspaper } from 'lucide-react';
import { ApiError, request } from '../utils/api';
import { resolveMediaUrl } from '../utils/tripImages';
import {
  countWords, coverCredit, formatNewsDate, htmlToText, newsHash, readingMinutes, splitNewsPages, toDisplayHtml,
  type NewsItem, type NewsPage as NewsPageData,
} from '../utils/news';
import { Skeleton, SkeletonCards } from '../components/Skeleton';
import { getLang, useI18n } from '../i18n';

// Artikel dibuka lewat #/berita?id=12 (halaman berikutnya &hal=2) sehingga
// tautannya dapat dibagikan dan tombol kembali browser berfungsi.
function readNewsLocation() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const id = Number(params.get('id'));
  const page = Number(params.get('hal'));
  return {
    id: Number.isInteger(id) && id > 0 ? id : null,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

// Dipakai di dalam efek fetch; getLang() dibaca saat gagal agar efek tidak
// perlu bergantung pada t (ganti bahasa tidak boleh memuat ulang berita).
const loadFailed = () => (getLang() === 'en' ? 'Could not load news.' : 'Berita gagal dimuat.');

export function NewsPage() {
  const [location, setLocation] = useState(readNewsLocation);
  useEffect(() => {
    const onHashChange = () => setLocation(readNewsLocation());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.id, location.page]);

  return (
    <div className="news-page animate-fade-in">
      {location.id ? <NewsArticle key={location.id} id={location.id} page={location.page} /> : <NewsIndex />}
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

const NewsCard: React.FC<{ item: NewsItem }> = ({ item }) => (
  <a className="news-card" href={newsHash(item.id)}>
    <Cover src={item.coverImage} className="news-card-cover" />
    <time className="news-date" dateTime={item.publishedAt ?? undefined}>{formatNewsDate(item.publishedAt)}</time>
    <h3>{item.title}</h3>
    {item.excerpt && <p>{item.excerpt}</p>}
  </a>
);

const fetchNewsPage = (page: number): Promise<NewsPageData> => request(`/public/news?page=${page}`);

function NewsIndex() {
  const { t } = useI18n();
  // null = halaman pertama belum dimuat.
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchNewsPage(1)
      .then((data) => { if (!cancelled) { setItems(data.items); setTotal(data.total); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : loadFailed()); });
    return () => { cancelled = true; };
  }, [attempt]);

  const loadMore = async () => {
    setLoadingMore(true);
    setError('');
    try {
      const data = await fetchNewsPage(page + 1);
      // Berita yang baru terbit menggeser urutan; cegah kartu ganda.
      setItems((current) => [...(current ?? []), ...data.items.filter((item) => !current?.some((row) => row.id === item.id))]);
      setTotal(data.total);
      setPage(page + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : loadFailed());
    } finally {
      setLoadingMore(false);
    }
  };

  const [featured, ...rest] = items ?? [];

  return (
    <div className="news-container">
      <header className="news-head">
        <h1>{t('Berita', 'News')}</h1>
        <p>{t('Kabar terbaru dari TemenTrip seputar destinasi, promo, dan layanan.', 'The latest from TemenTrip on destinations, promos, and services.')}</p>
      </header>

      {error && !items ? (
        <div className="news-state">
          <p>{error}</p>
          <button type="button" className="news-btn" onClick={() => { setError(''); setAttempt((current) => current + 1); }}>{t('Coba lagi', 'Try again')}</button>
        </div>
      ) : !items ? (
        <SkeletonCards count={6} label={t('Memuat berita', 'Loading news')} minWidth={280} />
      ) : !featured ? (
        <div className="news-state">
          <Newspaper size={32} strokeWidth={1.4} aria-hidden="true" />
          <h2>{t('Belum ada berita', 'No news yet')}</h2>
          <p>{t('Kabar terbaru dari TemenTrip akan muncul di sini.', 'The latest updates from TemenTrip will appear here.')}</p>
        </div>
      ) : (
        <>
          <a className="news-feature" href={newsHash(featured.id)}>
            <Cover src={featured.coverImage} className="news-feature-cover" />
            <div className="news-feature-body">
              <time className="news-date" dateTime={featured.publishedAt ?? undefined}>{formatNewsDate(featured.publishedAt)}</time>
              <h2>{featured.title}</h2>
              {featured.excerpt && <p>{featured.excerpt}</p>}
              <span className="news-read-more">{t('Baca selengkapnya', 'Read more')} <ArrowRight size={16} /></span>
            </div>
          </a>

          {rest.length > 0 && (
            <div className="news-grid">
              {rest.map((item) => <NewsCard key={item.id} item={item} />)}
            </div>
          )}

          {error && <p className="news-inline-error" role="alert">{error}</p>}
          {items.length < total && (
            <div className="news-more">
              <button type="button" className="news-btn" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? t('Memuat…', 'Loading…') : t('Muat berita lainnya', 'Load more news')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
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
  const { t } = useI18n();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [related, setRelated] = useState<NewsItem[]>([]);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    request(`/public/news/${id}`)
      .then((data: NewsItem) => { if (!cancelled) setArticle(data); })
      .catch((err) => {
        if (cancelled) return;
        setError({
          notFound: err instanceof ApiError && err.status === 404,
          message: err instanceof Error ? err.message : loadFailed(),
        });
      });
    // Berita lain hanya pelengkap; kegagalannya tidak perlu ditampilkan.
    request('/public/news?page=1')
      .then((data: NewsPageData) => { if (!cancelled) setRelated(data.items.filter((item) => item.id !== id).slice(0, 3)); })
      .catch(() => undefined);
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
          <p className="news-date">
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
      </article>

      {isLastPage && related.length > 0 && (
        <section className="news-container news-related" aria-labelledby="news-related-title">
          <h2 id="news-related-title">{t('Berita lainnya', 'More news')}</h2>
          <div className="news-grid">
            {related.map((item) => <NewsCard key={item.id} item={item} />)}
          </div>
        </section>
      )}
    </>
  );
}

const NEWS_PAGE_CSS = `
  .news-page { background: #fff; padding: 48px 0 88px; min-height: 60vh; }
  .news-container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  .news-head { padding-bottom: 28px; margin-bottom: 36px; border-bottom: 1px solid var(--color-border); }
  .news-head h1 { font-size: 36px; letter-spacing: -0.02em; }
  .news-head p { margin-top: 6px; color: var(--color-text-medium); font-size: 16px; }

  .news-date { display: block; font-size: 13px; color: #64748b; }
  .news-cover { overflow: hidden; background: #f1f5f9; color: #cbd5e1; display: flex; align-items: center; justify-content: center; }
  .news-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s ease; }

  .news-feature { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 36px; align-items: center; margin-bottom: 56px; }
  .news-feature-cover { aspect-ratio: 16 / 10; border-radius: 14px; }
  .news-feature-body h2 { font-size: 30px; line-height: 1.22; letter-spacing: -0.015em; margin-top: 10px; transition: color .15s; }
  .news-feature-body p { margin-top: 14px; font-size: 16px; line-height: 1.65; color: var(--color-text-medium); }
  .news-read-more { display: inline-flex; align-items: center; gap: 6px; margin-top: 20px; font-size: 14px; font-weight: 600; color: var(--color-accent); }
  .news-feature:hover h2, .news-card:hover h3 { color: var(--color-accent); }
  .news-feature:hover img, .news-card:hover img { transform: scale(1.03); }
  .news-feature:focus-visible, .news-card:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 6px; border-radius: 14px; }

  .news-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px 28px; }
  .news-card { display: flex; flex-direction: column; }
  .news-card-cover { aspect-ratio: 16 / 10; border-radius: 10px; margin-bottom: 14px; }
  .news-card h3 {
    font-size: 18px; line-height: 1.35; margin-top: 6px; transition: color .15s;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .news-card p {
    margin-top: 8px; font-size: 14.5px; line-height: 1.6; color: var(--color-text-medium);
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }

  .news-more { display: flex; justify-content: center; margin-top: 48px; }
  .news-btn {
    height: 42px; padding: 0 22px; border-radius: 999px; border: 1px solid #cbd5e1;
    font-size: 14px; font-weight: 600; color: var(--color-text-dark); background: #fff;
  }
  .news-btn:hover:not(:disabled) { border-color: var(--color-text-dark); }
  .news-btn:disabled { opacity: .6; cursor: default; }
  .news-inline-error { margin-top: 24px; text-align: center; color: #b91c1c; font-size: 14px; }
  .news-state {
    display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
    padding: 72px 16px; color: #94a3b8;
  }
  .news-state h2 { font-size: 20px; margin-top: 4px; }
  .news-state p { color: var(--color-text-medium); max-width: 420px; }
  .news-state .news-btn { margin-top: 12px; }

  .news-article { max-width: 760px; margin: 0 auto; padding: 0 24px; }
  .news-back { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 28px; }
  .news-back:hover { color: var(--color-accent); }
  .news-article-head h1 { font-size: 40px; line-height: 1.18; letter-spacing: -0.02em; margin-top: 10px; }
  .news-article-figure { margin: 32px 0 36px; }
  .news-article-cover { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 14px; }
  .news-article-figure figcaption { margin-top: 8px; font-size: 13px; line-height: 1.5; color: #64748b; }
  .news-article-head + .news-prose { margin-top: 32px; }
  .news-pager {
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--color-border);
  }
  .news-pager ol { display: flex; gap: 6px; list-style: none; flex-wrap: wrap; justify-content: center; }
  .news-pager ol a {
    min-width: 38px; height: 38px; padding: 0 6px; border-radius: 8px; border: 1px solid var(--color-border);
    display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: #475569;
  }
  .news-pager ol a:hover { border-color: var(--color-text-dark); color: var(--color-text-dark); }
  .news-pager ol a[aria-current="page"] { background: var(--color-text-dark); border-color: var(--color-text-dark); color: #fff; }
  .news-pager-step { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--color-accent); }
  .news-pager-step:hover { text-decoration: underline; }
  .news-pager-step.is-disabled { color: #cbd5e1; pointer-events: none; }
  .news-related { margin-top: 72px; padding-top: 40px; border-top: 1px solid var(--color-border); }
  .news-related h2 { font-size: 22px; margin-bottom: 24px; }

  @media (max-width: 860px) {
    .news-feature { grid-template-columns: 1fr; gap: 20px; }
    .news-feature-body h2 { font-size: 24px; }
  }
  @media (max-width: 640px) {
    .news-page { padding: 32px 0 64px; }
    .news-container, .news-article { padding: 0 16px; }
    .news-head h1 { font-size: 28px; }
    .news-article-head h1 { font-size: 28px; }
    .news-article-figure { margin: 24px 0 28px; }
    .news-article-cover { border-radius: 10px; }
    .news-pager { justify-content: center; }
    .news-pager-step { flex: 1 1 40%; }
    .news-pager-step:last-child { justify-content: flex-end; }
    .news-pager ol { order: 3; flex-basis: 100%; }
  }
`;
