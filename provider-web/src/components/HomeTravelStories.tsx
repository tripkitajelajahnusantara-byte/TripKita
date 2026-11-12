import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, ChevronRight } from 'lucide-react';
import { request } from '../utils/api';
import { resolveMediaUrl } from '../utils/tripImages';
import { formatNewsDate, newsCategoryLabel, newsHash, type NewsItem, type NewsPage } from '../utils/news';
import { Skeleton } from './Skeleton';
import { useI18n } from '../i18n';

// Beranda hanya menampilkan cuplikan beberapa cerita terbaru; daftar lengkap
// ada di menu Cerita Travel.
const HOME_STORY_LIMIT = 3;

export const HomeTravelStories: React.FC = () => {
  const { t, lang } = useI18n();
  // null = sedang dimuat. Gagal dimuat diperlakukan seperti kosong: section
  // disembunyikan agar beranda tetap rapi.
  const [items, setItems] = useState<NewsItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    request('/public/news?page=1')
      .then((data: NewsPage) => { if (!cancelled) setItems((data?.items ?? []).slice(0, HOME_STORY_LIMIT)); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  if (items && items.length === 0) return null;

  return (
    <section className="home-stories" aria-labelledby="home-stories-title" aria-busy={!items}>
      <div className="home-stories-head">
        <div>
          <h2 id="home-stories-title">{t('Cerita Travel', 'Travel Stories')}</h2>
          <span>{t('Kisah, tips, dan inspirasi dari perjalanan keliling Indonesia', 'Stories, tips, and inspiration from trips across Indonesia')}</span>
        </div>
        <a className="home-stories-all" href={newsHash()}>
          {t('Lihat semua cerita', 'See all stories')} <ChevronRight size={14} aria-hidden="true" />
        </a>
      </div>

      <ul className="home-stories-track">
        {!items
          ? Array.from({ length: HOME_STORY_LIMIT }, (_, key) => (
            <li key={key} aria-hidden="true">
              <div className="home-story">
                <Skeleton height={170} radius={0} />
                <div className="home-story-body">
                  <Skeleton height={16} />
                  <Skeleton width="80%" height={16} />
                  <Skeleton width="60%" height={12} style={{ marginTop: 6 }} />
                </div>
              </div>
            </li>
          ))
          : items.map((item) => {
            const cover = resolveMediaUrl(item.coverImage);
            return (
              <li key={item.id}>
                <a className="home-story" href={newsHash(item.id)}>
                  <div className="home-story-cover">
                    {cover
                      ? <img src={cover} alt="" loading="lazy" />
                      : <BookOpen size={28} strokeWidth={1.4} aria-hidden="true" />}
                    <span className="home-story-chip">{newsCategoryLabel(item.category, lang)}</span>
                  </div>
                  <div className="home-story-body">
                    <h3>{item.title}</h3>
                    {item.excerpt && <p>{item.excerpt}</p>}
                    <div className="home-story-meta">
                      {item.publishedAt && (
                        <time dateTime={item.publishedAt}><CalendarDays size={13} aria-hidden="true" /> {formatNewsDate(item.publishedAt)}</time>
                      )}
                      <span className="home-story-read">{t('Baca', 'Read')} <ArrowRight size={14} aria-hidden="true" /></span>
                    </div>
                  </div>
                </a>
              </li>
            );
          })}
      </ul>

      <style>{HOME_STORIES_CSS}</style>
    </section>
  );
};

const HOME_STORIES_CSS = `
  .home-stories { margin-bottom: 45px; }
  .home-stories-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
  .home-stories-head h2 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
  .home-stories-head span { font-size: 12px; color: #64748b; }
  .home-stories-all { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; font-weight: 600; color: #007bff; white-space: nowrap; }
  .home-stories-all:hover { text-decoration: underline; }

  .home-stories-track { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .home-stories-track > li { min-width: 0; }
  .home-story {
    display: flex; flex-direction: column; height: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
    overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03); color: inherit; text-decoration: none;
    transition: transform .2s, box-shadow .2s, border-color .2s;
  }
  a.home-story:hover { transform: translateY(-4px); box-shadow: 0 10px 24px rgba(0,0,0,0.08); border-color: #0d9488; }
  a.home-story:focus-visible { outline: 2px solid #0d9488; outline-offset: 3px; }
  .home-story-cover {
    position: relative; aspect-ratio: 16 / 9; background: #e2e8f0; color: #94a3b8;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .home-story-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .45s ease; }
  a.home-story:hover .home-story-cover img { transform: scale(1.04); }
  .home-story-chip {
    position: absolute; left: 10px; bottom: 10px; padding: 3px 10px; border-radius: 999px;
    background: #0d9488; color: #fff; font-size: 11px; font-weight: 700; white-space: nowrap;
  }
  .home-story-body { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 14px 16px 16px; }
  .home-story-body h3 {
    margin: 0; font-size: 15px; font-weight: 700; line-height: 1.4; color: #0f172a;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .home-story-body p {
    margin: 0; font-size: 13px; line-height: 1.55; color: #64748b;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .home-story-meta {
    margin-top: auto; padding-top: 10px; border-top: 1px solid #f1f5f9;
    display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; color: #64748b;
  }
  .home-story-meta time { display: inline-flex; align-items: center; gap: 5px; }
  .home-story-read { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; color: #0f766e; white-space: nowrap; }
  a.home-story:hover .home-story-read svg { transform: translateX(3px); }
  .home-story-read svg { transition: transform .15s; }

  /* Ponsel: cerita digeser ke samping agar beranda tidak memanjang. */
  @media (max-width: 768px) {
    .home-stories-track {
      display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none;
      gap: 14px; padding: 2px 0 8px;
    }
    .home-stories-track::-webkit-scrollbar { display: none; }
    .home-stories-track > li { flex: 0 0 82%; max-width: 320px; scroll-snap-align: start; }
  }
`;
