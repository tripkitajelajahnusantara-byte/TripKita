import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { request } from '../utils/api';
import { resolveMediaUrl } from '../utils/tripImages';
import { newsCategoryLabel, newsHash, type NewsItem, type NewsPage } from '../utils/news';
import { Skeleton } from './Skeleton';
import { useI18n } from '../i18n';

// Strip ringkas di bawah kotak pencarian beranda: cuplikan beberapa cerita
// terbaru tanpa mendorong daftar trip jauh ke bawah. Daftar lengkap ada di
// menu Cerita Travel.
const HOME_STORY_LIMIT = 4;

export const HomeTravelStories: React.FC = () => {
  const { t, lang, locale } = useI18n();
  // null = sedang dimuat. Gagal dimuat diperlakukan seperti kosong: strip
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
    <section className="story-strip" aria-labelledby="story-strip-title" aria-busy={!items}>
      <div className="story-strip-head">
        <h2 id="story-strip-title">
          <span className="story-strip-icon" aria-hidden="true"><BookOpen size={15} /></span>
          {t('Cerita Travel', 'Travel Stories')}
        </h2>
        <a className="story-strip-all" href={newsHash()}>
          {t('Lihat semua', 'See all')} <ChevronRight size={14} aria-hidden="true" />
        </a>
      </div>

      <ul className="story-strip-track">
        {!items
          ? Array.from({ length: HOME_STORY_LIMIT }, (_, key) => (
            <li key={key} aria-hidden="true">
              <div className="story-strip-item">
                <Skeleton width={64} height={64} radius={10} style={{ flexShrink: 0 }} />
                <div className="story-strip-text">
                  <Skeleton width={70} height={10} />
                  <Skeleton height={13} />
                  <Skeleton width="70%" height={13} />
                </div>
              </div>
            </li>
          ))
          : items.map((item) => {
            const cover = resolveMediaUrl(item.coverImage);
            return (
              <li key={item.id}>
                <a className="story-strip-item" href={newsHash(item.id)}>
                  <span className="story-strip-thumb">
                    {cover
                      ? <img src={cover} alt="" loading="lazy" />
                      : <BookOpen size={22} strokeWidth={1.6} aria-hidden="true" />}
                  </span>
                  <span className="story-strip-text">
                    <span className="story-strip-meta">
                      <span className="story-strip-cat">{newsCategoryLabel(item.category, lang)}</span>
                      {item.publishedAt && <time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}</time>}
                    </span>
                    <span className="story-strip-title">{item.title}</span>
                  </span>
                </a>
              </li>
            );
          })}
      </ul>

      <style>{STORY_STRIP_CSS}</style>
    </section>
  );
};

const STORY_STRIP_CSS = `
  .story-strip-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .story-strip-head h2 { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; }
  .story-strip-icon {
    width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;
    background: #ccfbf1; color: #0f766e;
  }
  .story-strip-all { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; font-weight: 600; color: #007bff; white-space: nowrap; }
  .story-strip-all:hover { text-decoration: underline; }

  .story-strip-track {
    list-style: none; margin: 0; padding: 2px 0 6px; display: flex; gap: 12px;
    overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none;
  }
  .story-strip-track::-webkit-scrollbar { display: none; }
  .story-strip-track > li { flex: 0 0 280px; min-width: 0; scroll-snap-align: start; }
  .story-strip-item {
    display: flex; align-items: center; gap: 12px; height: 100%; padding: 8px 12px 8px 8px;
    background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; color: inherit; text-decoration: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03); transition: border-color .2s, box-shadow .2s, transform .2s;
  }
  a.story-strip-item:hover { border-color: #0d9488; box-shadow: 0 8px 20px rgba(13,148,136,0.12); transform: translateY(-2px); }
  a.story-strip-item:focus-visible { outline: 2px solid #0d9488; outline-offset: 2px; }
  .story-strip-thumb {
    position: relative; flex-shrink: 0; width: 64px; height: 64px; border-radius: 10px; overflow: hidden;
    background: #e2e8f0; color: #94a3b8; display: flex; align-items: center; justify-content: center;
  }
  .story-strip-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .45s ease; }
  a.story-strip-item:hover .story-strip-thumb img { transform: scale(1.06); }
  .story-strip-text { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .story-strip-meta { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 11px; color: #94a3b8; white-space: nowrap; }
  .story-strip-cat { font-weight: 700; color: #0f766e; }
  .story-strip-meta time { overflow: hidden; text-overflow: ellipsis; }
  .story-strip-meta time::before { content: "•"; margin-right: 6px; color: #cbd5e1; }
  .story-strip-title {
    font-size: 13.5px; font-weight: 600; line-height: 1.35; color: #0f172a;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  a.story-strip-item:hover .story-strip-title { color: #0f5f63; }

  /* Layar lebar: semua cerita muat dalam satu baris, tanpa geser. */
  @media (min-width: 1024px) {
    .story-strip-track { display: grid; grid-template-columns: repeat(${HOME_STORY_LIMIT}, minmax(0, 1fr)); overflow: visible; }
  }
  @media (max-width: 768px) {
    .story-strip-track > li { flex-basis: 82%; max-width: 300px; }
  }
`;
