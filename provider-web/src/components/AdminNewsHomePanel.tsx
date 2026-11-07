import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, LoaderCircle, Newspaper, Plus, Search, X } from 'lucide-react';
import { request } from '../utils/api';
import { resolveMediaUrl } from '../utils/tripImages';
import { formatNewsDate, newsCategoryLabel, newsHash, type NewsHighlights, type NewsItem } from '../utils/news';
import { NEWS_PANEL_CSS } from './AdminNewsPanel';
import { SkeletonTable } from './Skeleton';

const SLOT_SIZE = 5;
const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const layoutKey = (value: NewsHighlights) => JSON.stringify([value.featured.map((item) => item.id), value.editorPicks.map((item) => item.id)]);

// Pengaturan Beranda: admin menyusun 5 Berita Utama dan 5 Pilihan Redaksi
// untuk halaman Berita customer. Perubahan langsung tayang setelah disimpan.
export function AdminNewsHomePanel() {
  const [published, setPublished] = useState<NewsItem[] | null>(null);
  const [layout, setLayout] = useState<NewsHighlights | null>(null);
  const [baseline, setBaseline] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([request('/admin/news'), request('/public/news-highlights')])
      .then(([all, highlights]: [NewsItem[], NewsHighlights]) => {
        if (cancelled) return;
        // Daftar admin diurutkan menurut waktu ubah; pilihan ditampilkan dari yang terbaru terbit.
        setPublished(all.filter((item) => item.status === 'PUBLISHED')
          .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')));
        setLayout(highlights);
        setBaseline(layoutKey(highlights));
      })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err, 'Pengaturan beranda gagal dimuat.')); });
    return () => { cancelled = true; };
  }, []);

  const dirty = layout !== null && layoutKey(layout) !== baseline;

  const save = async () => {
    if (!layout || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved: NewsHighlights = await request('/admin/news-placements', {
        method: 'PUT',
        body: JSON.stringify({
          featured: layout.featured.map((item) => item.id),
          editorPicks: layout.editorPicks.map((item) => item.id),
        }),
      });
      setLayout(saved);
      setBaseline(layoutKey(saved));
      setNotice('Susunan tersimpan dan sudah tampil di halaman Berita.');
    } catch (err) {
      setError(errorMessage(err, 'Susunan gagal disimpan.'));
    } finally {
      setSaving(false);
    }
  };

  const update = (patch: Partial<NewsHighlights>) => {
    setNotice('');
    setLayout((current) => (current ? { ...current, ...patch } : current));
  };

  return (
    <div className="nw-panel animate-fade-in">
      {loadError ? (
        <div className="alert-message error-alert">{loadError}</div>
      ) : !layout || !published ? (
        <section className="nw-card"><SkeletonTable rows={5} columns={2} label="Memuat pengaturan beranda" /></section>
      ) : (
        <>
          {error && <div className="alert-message error-alert" role="alert">{error}</div>}
          {notice && <div className="alert-message success-alert">{notice}</div>}
          {published.length === 0 && (
            <div className="alert-message">Belum ada berita yang terbit. Terbitkan berita di menu Berita agar bisa dipilih di sini.</div>
          )}
          <div className="nh-grid">
            <SlotEditor
              title="Berita Utama"
              hint="Tampil paling atas di halaman Berita. Artikel #1 menjadi berita utama berukuran besar, #2–5 menjadi berita pendukung. Kosongkan bila bagian ini tidak ingin ditampilkan."
              slotLabel={(index) => (index === 0 ? 'Berita utama' : 'Berita pendukung')}
              items={layout.featured}
              published={published}
              onChange={(featured) => update({ featured })}
            />
            <SlotEditor
              title="Pilihan Redaksi"
              hint="Tampil sebagai carousel yang bisa digeser ke kiri dan kanan, tepat di bawah Berita Utama. Dipilih terpisah dari Berita Utama."
              slotLabel={(index) => `Slide ${index + 1}`}
              items={layout.editorPicks}
              published={published}
              onChange={(editorPicks) => update({ editorPicks })}
            />
          </div>
          <div className="nh-savebar">
            <span className={`nw-save-state ${dirty ? 'is-dirty' : ''}`} aria-live="polite">
              {saving ? 'Menyimpan…' : dirty ? 'Ada perubahan yang belum disimpan' : 'Semua perubahan tersimpan'}
            </span>
            <a className="nw-inline-link" href={newsHash()} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Lihat halaman Berita</a>
            <button type="button" className="nw-btn nw-btn-primary" disabled={!dirty || saving} onClick={save}>
              {saving && <LoaderCircle size={16} className="nw-spin" />} Simpan susunan
            </button>
          </div>
        </>
      )}
      <style>{NEWS_PANEL_CSS + HOME_PANEL_CSS}</style>
    </div>
  );
}

function SlotEditor({ title, hint, slotLabel, items, published, onChange }: {
  title: string;
  hint: string;
  slotLabel: (index: number) => string;
  items: NewsItem[];
  published: NewsItem[];
  onChange: (items: NewsItem[]) => void;
}) {
  const [query, setQuery] = useState('');
  const full = items.length >= SLOT_SIZE;
  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return published
      .filter((item) => !items.some((chosen) => chosen.id === item.id) && (!needle || item.title.toLowerCase().includes(needle)))
      .slice(0, 6);
  }, [published, items, query]);

  const move = (index: number, step: -1 | 1) => {
    const next = [...items];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    onChange(next);
  };

  return (
    <section className="nw-card nh-card" aria-label={title}>
      <header className="nh-head">
        <h3>{title}</h3>
        <span className={`nh-count${full ? ' is-full' : ''}`}>{items.length}/{SLOT_SIZE}</span>
      </header>
      <p className="nh-hint">{hint}</p>

      <ol className="nh-slots">
        {Array.from({ length: SLOT_SIZE }, (_, index) => {
          const item = items[index];
          if (!item) {
            return (
              <li key={`empty-${index}`} className="nh-slot is-empty">
                <span className="nh-pos">{index + 1}</span>
                <span className="nh-empty-text">{slotLabel(index)} · kosong</span>
              </li>
            );
          }
          const cover = resolveMediaUrl(item.coverImage);
          return (
            <li key={item.id} className={`nh-slot${index === 0 ? ' is-lead' : ''}`}>
              <span className="nh-pos">{index + 1}</span>
              <span className="nw-thumb">{cover ? <img src={cover} alt="" loading="lazy" /> : <Newspaper size={18} />}</span>
              <span className="nw-row-text">
                <strong title={item.title}>{item.title}</strong>
                <small>{slotLabel(index)} · {newsCategoryLabel(item.category)}</small>
              </span>
              <span className="nw-row-actions">
                <button type="button" className="nw-icon-btn" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Naikkan ${item.title}`} title="Naikkan"><ArrowUp size={16} /></button>
                <button type="button" className="nw-icon-btn" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Turunkan ${item.title}`} title="Turunkan"><ArrowDown size={16} /></button>
                <button type="button" className="nw-icon-btn danger" onClick={() => onChange(items.filter((row) => row.id !== item.id))} aria-label={`Keluarkan ${item.title}`} title="Keluarkan"><X size={16} /></button>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="nh-picker">
        <label className="nw-search">
          <Search size={16} />
          <input
            type="search"
            value={query}
            disabled={full}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={full ? 'Slot penuh. Keluarkan satu artikel untuk menambah.' : 'Cari judul artikel yang sudah terbit'}
            aria-label={`Cari artikel untuk ${title}`}
          />
        </label>
        {!full && (
          candidates.length === 0 ? (
            <p className="nh-none">{query.trim() ? 'Tidak ada artikel terbit yang cocok.' : 'Semua artikel terbit sudah dipilih.'}</p>
          ) : (
            <ul className="nh-candidates">
              {candidates.map((item) => (
                <li key={item.id}>
                  <button type="button" className="nh-candidate" onClick={() => { onChange([...items, item]); setQuery(''); }}>
                    <span className="nw-row-text">
                      <strong title={item.title}>{item.title}</strong>
                      <small>{newsCategoryLabel(item.category)} · Terbit {formatNewsDate(item.publishedAt)}</small>
                    </span>
                    <span className="nh-add"><Plus size={15} /> Tambah</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </section>
  );
}

const HOME_PANEL_CSS = `
  .nh-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }
  .nh-card { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .nh-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .nh-head h3 { font-size: 18px; }
  .nh-count { padding: 3px 10px; border-radius: 999px; background: #f1f5f9; color: #475569; font-size: 12.5px; font-weight: 700; }
  .nh-count.is-full { background: #f0fdfa; color: #0f766e; }
  .nh-hint { font-size: 13px; line-height: 1.55; color: #64748b; margin-top: -6px; }
  .nh-slots { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .nh-slot { display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 10px; border: 1px solid var(--color-border); border-radius: 10px; background: #fff; }
  .nh-slot.is-lead { border-color: #99f6e4; background: #f0fdfa; }
  .nh-slot.is-empty { border-style: dashed; background: #f8fafc; color: #94a3b8; min-height: 66px; }
  .nh-slot .nw-row-text { flex: 1; }
  .nh-slot .nw-row-actions button:disabled { opacity: .35; cursor: default; background: transparent; }
  .nh-pos {
    flex: none; width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    background: #e2e8f0; color: #334155; font-size: 13px; font-weight: 700;
  }
  .nh-slot.is-lead .nh-pos { background: #0d9488; color: #fff; }
  .nh-empty-text { font-size: 13.5px; }
  .nh-picker { display: flex; flex-direction: column; gap: 8px; padding-top: 14px; border-top: 1px solid #f1f5f9; }
  .nh-picker .nw-search { flex: none; }
  .nh-picker input:disabled { cursor: not-allowed; }
  .nh-candidates { list-style: none; display: flex; flex-direction: column; border: 1px solid var(--color-border); border-radius: 10px; overflow: hidden; }
  .nh-candidates li + li { border-top: 1px solid #f1f5f9; }
  .nh-candidate { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; text-align: left; }
  .nh-candidate:hover { background: #f8fafc; }
  .nh-candidate .nw-row-text { flex: 1; }
  .nh-add { flex: none; display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: var(--color-accent); }
  .nh-none { font-size: 13px; color: #94a3b8; padding: 4px 2px; }
  .nh-savebar {
    position: sticky; bottom: 0; z-index: 5; margin-top: 20px; padding: 14px 16px; display: flex; align-items: center; justify-content: flex-end; gap: 16px; flex-wrap: wrap;
    background: #fff; border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 -8px 24px -18px rgb(15 23 42 / .4);
  }
  .nh-savebar .nw-save-state { margin-right: auto; }
  @media (max-width: 1100px) { .nh-grid { grid-template-columns: minmax(0, 1fr); } }
`;
