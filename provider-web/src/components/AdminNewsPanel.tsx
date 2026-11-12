import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, ImagePlus, LoaderCircle, Newspaper, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { request } from '../utils/api';
import { resolveMediaUrl } from '../utils/tripImages';
import {
  NEWS_CATEGORIES, coverCredit, formatNewsDate, newsCategoryLabel, newsHash, toDisplayHtml, toStoredHtml,
  type NewsCategory, type NewsItem,
} from '../utils/news';
import { useCustomAlert } from './CustomAlertModal';
import { RichTextEditor } from './RichTextEditor';
import { Skeleton, SkeletonTable } from './Skeleton';

type Filter = 'ALL' | 'PUBLISHED' | 'DRAFT';
const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

async function uploadNewsPhoto(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const result = await request('/admin/news/photos', { method: 'POST', body });
  return result.photoPath as string;
}

const StatusChip: React.FC<{ status: NewsItem['status'] }> = ({ status }) => (
  <span className={`nw-chip ${status === 'PUBLISHED' ? 'is-live' : ''}`}>{status === 'PUBLISHED' ? 'Terbit' : 'Draf'}</span>
);

export function AdminNewsPanel() {
  // null = daftar; 'new' = artikel baru; angka = id artikel yang diedit.
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  return (
    <div className="nw-panel animate-fade-in">
      {editing === null
        ? <NewsList onOpen={setEditing} />
        : <NewsEditor key={String(editing)} initialId={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <style>{NEWS_PANEL_CSS}</style>
    </div>
  );
}

function NewsList({ onOpen }: { onOpen: (id: number | 'new') => void }) {
  const { showConfirm, showAlert } = useCustomAlert();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [category, setCategory] = useState<NewsCategory | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  // Id berita yang sedang dihapus; baris tetap tampil dengan indikator sampai server menjawab.
  const [deleting, setDeleting] = useState<ReadonlySet<number>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    request('/admin/news')
      .then((data: NewsItem[]) => { if (!cancelled) setItems(data); })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err, 'Gagal memuat berita.')); });
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => ({
    ALL: items?.length ?? 0,
    PUBLISHED: items?.filter((item) => item.status === 'PUBLISHED').length ?? 0,
    DRAFT: items?.filter((item) => item.status === 'DRAFT').length ?? 0,
  }), [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (items ?? []).filter((item) =>
      (filter === 'ALL' || item.status === filter)
      && (category === 'ALL' || item.category === category)
      && (!needle || item.title.toLowerCase().includes(needle)));
  }, [items, filter, category, query]);

  const confirmDelete = (item: NewsItem) => showConfirm({
    title: 'Hapus berita?',
    message: `"${item.title}" akan dihapus permanen${item.status === 'PUBLISHED' ? ' dan langsung hilang dari situs' : ''}.`,
    type: 'error',
    confirmText: 'Hapus',
    onConfirm: async () => {
      setDeleting((current) => new Set(current).add(item.id));
      try {
        await request(`/admin/news/${item.id}`, { method: 'DELETE' });
        setItems((current) => current?.filter((row) => row.id !== item.id) ?? null);
      } catch (err) {
        showAlert({ type: 'error', message: errorMessage(err, 'Berita gagal dihapus.') });
      } finally {
        setDeleting((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
      }
    },
  });

  if (loadError) return <div className="alert-message error-alert">{loadError}</div>;

  if (items && items.length === 0) {
    return (
      <div className="nw-empty">
        <Newspaper size={36} strokeWidth={1.5} />
        <h3>Belum ada berita</h3>
        <p>Berita yang Anda terbitkan akan tampil di menu Cerita Travel pada situs customer.</p>
        <button type="button" className="nw-btn nw-btn-primary" onClick={() => onOpen('new')}><Plus size={16} /> Tulis berita pertama</button>
      </div>
    );
  }

  return (
    <section className="nw-card">
      <div className="nw-list-toolbar">
        <div className="nw-segment" role="group" aria-label="Filter status">
          {(['ALL', 'PUBLISHED', 'DRAFT'] as Filter[]).map((key) => (
            <button key={key} type="button" aria-pressed={filter === key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>
              {key === 'ALL' ? 'Semua' : key === 'PUBLISHED' ? 'Terbit' : 'Draf'} <span>{counts[key]}</span>
            </button>
          ))}
        </div>
        <select className="nw-select" value={category} onChange={(event) => setCategory(event.target.value as NewsCategory | 'ALL')} aria-label="Filter kategori">
          <option value="ALL">Semua kategori</option>
          {NEWS_CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.id}</option>)}
        </select>
        <label className="nw-search">
          <Search size={16} />
          <input type="search" placeholder="Cari judul" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Cari judul berita" />
        </label>
        <button type="button" className="nw-btn nw-btn-primary" onClick={() => onOpen('new')}><Plus size={16} /> Tulis berita</button>
      </div>

      {!items ? (
        <SkeletonTable rows={5} columns={3} label="Memuat berita" />
      ) : visible.length === 0 ? (
        <p className="nw-no-result">Tidak ada berita yang cocok.</p>
      ) : (
        <ul className="nw-rows">
          {visible.map((item) => {
            const cover = resolveMediaUrl(item.coverImage);
            const isDeleting = deleting.has(item.id);
            return (
              <li key={item.id} className={`nw-row${isDeleting ? ' is-deleting' : ''}`} aria-busy={isDeleting}>
                <button type="button" className="nw-row-main" onClick={() => onOpen(item.id)} disabled={isDeleting}>
                  <span className="nw-thumb">{cover ? <img src={cover} alt="" loading="lazy" /> : <Newspaper size={18} />}</span>
                  <span className="nw-row-text">
                    <strong>{item.title}</strong>
                    {isDeleting ? (
                      <small className="nw-deleting-text" role="status">Menghapus berita…</small>
                    ) : (
                      <small>
                        {item.status === 'PUBLISHED' ? `Terbit ${formatNewsDate(item.publishedAt)}` : 'Belum diterbitkan'}
                        {' · '}Diubah {formatNewsDate(item.updatedAt)}
                      </small>
                    )}
                  </span>
                </button>
                <span className="nw-cat">{newsCategoryLabel(item.category)}</span>
                <StatusChip status={item.status} />
                <div className="nw-row-actions">
                  {item.status === 'PUBLISHED' && !isDeleting && (
                    <a className="nw-icon-btn" href={newsHash(item.id)} target="_blank" rel="noreferrer" aria-label="Lihat di situs" title="Lihat di situs"><ExternalLink size={16} /></a>
                  )}
                  <button type="button" className="nw-icon-btn" onClick={() => onOpen(item.id)} disabled={isDeleting} aria-label="Edit" title="Edit"><Pencil size={16} /></button>
                  <button type="button" className="nw-icon-btn danger" onClick={() => confirmDelete(item)} disabled={isDeleting} aria-label={isDeleting ? 'Menghapus' : 'Hapus'} title={isDeleting ? 'Menghapus…' : 'Hapus'}>
                    {isDeleting ? <LoaderCircle size={16} className="nw-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface Draft { title: string; category: NewsCategory | ''; coverImage: string; coverCaption: string; coverSource: string; content: string }
const EMPTY_DRAFT: Draft = { title: '', category: '', coverImage: '', coverCaption: '', coverSource: '', content: '' };
const snapshot = (draft: Draft) => JSON.stringify(draft);

function NewsEditor({ initialId, onClose }: { initialId: number | null; onClose: () => void }) {
  const { showConfirm } = useCustomAlert();
  const [id, setId] = useState(initialId);
  const [loaded, setLoaded] = useState(initialId === null);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState(() => snapshot(EMPTY_DRAFT));
  const [sourceRequired, setSourceRequired] = useState(false);
  const [status, setStatus] = useState<NewsItem['status']>('DRAFT');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const dirty = snapshot(draft) !== baseline;

  useEffect(() => {
    if (initialId === null) return;
    let cancelled = false;
    request(`/admin/news/${initialId}`)
      .then((news: NewsItem) => {
        if (cancelled) return;
        const next = {
          title: news.title,
          category: news.category,
          coverImage: news.coverImage,
          coverCaption: news.coverCaption ?? '',
          coverSource: news.coverSource ?? '',
          content: toDisplayHtml(news.content ?? ''),
        };
        setDraft(next);
        setBaseline(snapshot(next));
        setStatus(news.status);
        setPublishedAt(news.publishedAt);
        setLoaded(true);
      })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err, 'Berita gagal dimuat.')); });
    return () => { cancelled = true; };
  }, [initialId]);

  // Judul memakai textarea agar judul panjang terbungkus; tingginya mengikuti isi.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft.title, loaded]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async (nextStatus: NewsItem['status']) => {
    if (saving) return;
    if (!draft.title.trim()) {
      setError('Judul berita wajib diisi.');
      titleRef.current?.focus();
      return;
    }
    if (!draft.category) {
      setError('Pilih kategori berita.');
      categoryRef.current?.focus();
      return;
    }
    // Standar jurnalistik: foto sampul yang tayang wajib mencantumkan sumbernya.
    if (nextStatus === 'PUBLISHED' && draft.coverImage && !draft.coverSource.trim()) {
      setSourceRequired(true);
      setError('Isi sumber foto sampul sebelum menerbitkan, contoh: Dok. Istimewa.');
      sourceInputRef.current?.focus();
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const sent = draft;
    try {
      const payload = JSON.stringify({ ...sent, content: toStoredHtml(sent.content), status: nextStatus });
      const saved: NewsItem = id === null
        ? await request('/admin/news', { method: 'POST', body: payload })
        : await request(`/admin/news/${id}`, { method: 'PUT', body: payload });
      setId(saved.id);
      setBaseline(snapshot(sent));
      setStatus(saved.status);
      setPublishedAt(saved.publishedAt);
      setSavedAt(new Date());
      if (nextStatus !== status) {
        setNotice(nextStatus === 'PUBLISHED' ? 'Berita sudah tayang di menu Cerita Travel.' : 'Berita ditarik dari situs dan disimpan sebagai draf.');
      }
    } catch (err) {
      setError(errorMessage(err, 'Berita gagal disimpan.'));
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/⌘+S menyimpan tanpa mengubah status.
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveRef.current(status);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status]);

  const leave = () => {
    if (!dirty) return onClose();
    showConfirm({
      title: 'Tinggalkan editor?',
      message: 'Perubahan yang belum disimpan akan hilang.',
      confirmText: 'Buang perubahan',
      cancelText: 'Tetap di sini',
      onConfirm: onClose,
    });
  };

  const unpublish = () => showConfirm({
    title: 'Tarik berita dari situs?',
    message: 'Berita tidak lagi tampil untuk customer sampai Anda menerbitkannya kembali.',
    confirmText: 'Tarik ke draf',
    onConfirm: () => { void save('DRAFT'); },
  });

  const uploadCover = async (file: File) => {
    setError('');
    setCoverUploading(true);
    try {
      const path = await uploadNewsPhoto(file);
      setDraft((current) => ({ ...current, coverImage: path }));
    } catch (err) {
      setError(errorMessage(err, 'Foto sampul gagal diunggah.'));
    } finally {
      setCoverUploading(false);
    }
  };

  if (loadError) {
    return (
      <div>
        <button type="button" className="nw-back" onClick={onClose}><ArrowLeft size={16} /> Semua berita</button>
        <div className="alert-message error-alert">{loadError}</div>
      </div>
    );
  }

  const saveState = saving ? 'Menyimpan…'
    : dirty ? 'Belum disimpan'
    : savedAt ? `Tersimpan ${savedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
    : '';
  const coverUrl = resolveMediaUrl(draft.coverImage);

  return (
    <div className="nw-editor">
      <div className="nw-editor-bar">
        <button type="button" className="nw-back" onClick={leave}><ArrowLeft size={16} /> Semua berita</button>
        <div className="nw-editor-actions">
          <span className={`nw-save-state ${dirty ? 'is-dirty' : ''}`} aria-live="polite">{saveState}</span>
          {status === 'DRAFT' ? (
            <>
              <button type="button" className="nw-btn" disabled={saving || !loaded} onClick={() => save('DRAFT')}>Simpan draf</button>
              <button type="button" className="nw-btn nw-btn-primary" disabled={saving || !loaded} onClick={() => save('PUBLISHED')}>
                {saving ? <LoaderCircle size={16} className="rte-spin" /> : null} Terbitkan
              </button>
            </>
          ) : (
            <button type="button" className="nw-btn nw-btn-primary" disabled={saving || !dirty} onClick={() => save('PUBLISHED')}>
              {saving ? <LoaderCircle size={16} className="rte-spin" /> : null} Simpan perubahan
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert-message error-alert" role="alert">{error}</div>}
      {notice && (
        <div className="alert-message success-alert">
          {notice}{' '}
          {status === 'PUBLISHED' && id !== null && <a href={newsHash(id)} target="_blank" rel="noreferrer" className="nw-inline-link">Lihat di situs</a>}
        </div>
      )}

      {!loaded ? (
        <div className="nw-card nw-loading">
          <Skeleton height={34} width="70%" />
          <Skeleton height={14} />
          <Skeleton height={14} width="90%" />
          <Skeleton height={240} radius={10} />
        </div>
      ) : (
        <div className="nw-editor-grid">
          <div className="nw-editor-main">
            <textarea
              ref={titleRef}
              className="nw-title-input"
              rows={1}
              maxLength={200}
              placeholder="Judul berita"
              aria-label="Judul berita"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value.replace(/\n/g, ' ') }))}
              onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
            />
            {draft.title.length > 160 && <p className="nw-counter">{draft.title.length}/200 karakter</p>}
            <RichTextEditor
              initialHtml={draft.content}
              onChange={(content) => setDraft((current) => ({ ...current, content }))}
              onUploadImage={async (file) => resolveMediaUrl(await uploadNewsPhoto(file))}
              placeholder="Tulis isi berita di sini. Paragraf pertama dipakai sebagai ringkasan di daftar berita."
            />
          </div>

          <aside className="nw-side">
            <section className="nw-card nw-side-card">
              <h4>Kategori</h4>
              <select
                ref={categoryRef}
                className="nw-select nw-select-block"
                value={draft.category}
                aria-label="Kategori berita"
                aria-invalid={!!error && !draft.category}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as NewsCategory }))}
              >
                <option value="" disabled>Pilih kategori</option>
                {NEWS_CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.id}</option>)}
              </select>
              <p className="nw-help">Satu kategori utama. Dipakai untuk Topik Pilihan di halaman Cerita Travel.</p>
            </section>

            <section className="nw-card nw-side-card">
              <h4>Foto sampul</h4>
              {coverUrl ? (
                <div className="nw-cover">
                  <img src={coverUrl} alt="Pratinjau foto sampul" />
                  {coverCredit(draft.coverCaption, draft.coverSource) && (
                    <p className="nw-cover-credit">{coverCredit(draft.coverCaption, draft.coverSource)}</p>
                  )}
                  <div className="nw-cover-actions">
                    <button type="button" className="nw-btn nw-btn-sm" disabled={coverUploading} onClick={() => coverInputRef.current?.click()}>
                      {coverUploading ? 'Mengunggah…' : 'Ganti'}
                    </button>
                    <button type="button" className="nw-btn nw-btn-sm nw-btn-danger" onClick={() => setDraft((current) => ({ ...current, coverImage: '', coverCaption: '', coverSource: '' }))}>Hapus</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="nw-cover-drop" disabled={coverUploading} onClick={() => coverInputRef.current?.click()}>
                  {coverUploading ? <LoaderCircle size={22} className="rte-spin" /> : <ImagePlus size={22} strokeWidth={1.6} />}
                  <span>{coverUploading ? 'Mengunggah…' : 'Unggah foto sampul'}</span>
                  <small>JPG/PNG, maks. 5 MB. Ideal 1600×900.</small>
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void uploadCover(file);
                }}
              />
              {coverUrl ? (
                <>
                  <label className="nw-field">
                    <span>Keterangan foto</span>
                    <textarea
                      rows={2}
                      maxLength={300}
                      placeholder="Contoh: Wisatawan menikmati senja di Pantai Pink, Lombok Timur."
                      value={draft.coverCaption}
                      onChange={(event) => setDraft((current) => ({ ...current, coverCaption: event.target.value.replace(/\n/g, ' ') }))}
                    />
                  </label>
                  <label className="nw-field">
                    <span>Sumber foto <em>wajib</em></span>
                    <input
                      ref={sourceInputRef}
                      type="text"
                      maxLength={150}
                      placeholder="Contoh: Dok. Istimewa"
                      aria-invalid={sourceRequired && !draft.coverSource.trim()}
                      value={draft.coverSource}
                      onChange={(event) => setDraft((current) => ({ ...current, coverSource: event.target.value }))}
                    />
                  </label>
                  <p className="nw-help">Tampil di bawah foto: keterangan lalu "(Foto: sumber)".</p>
                </>
              ) : (
                <p className="nw-help">Tampil di daftar berita dan di atas artikel.</p>
              )}
            </section>

            <section className="nw-card nw-side-card">
              <h4>Publikasi</h4>
              <dl className="nw-meta">
                <div><dt>Status</dt><dd><StatusChip status={status} /></dd></div>
                <div><dt>Tanggal terbit</dt><dd>{publishedAt ? formatNewsDate(publishedAt) : 'Belum diterbitkan'}</dd></div>
              </dl>
              {status === 'PUBLISHED' && id !== null && (
                <div className="nw-side-links">
                  <a href={newsHash(id)} target="_blank" rel="noreferrer" className="nw-inline-link"><ExternalLink size={14} /> Lihat di situs</a>
                  <button type="button" className="nw-text-btn" disabled={saving} onClick={unpublish}>Tarik ke draf</button>
                </div>
              )}
              <p className="nw-help">Simpan cepat dengan Ctrl+S.</p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

export const NEWS_PANEL_CSS = `
  .nw-card { background: #fff; border: 1px solid var(--color-border); border-radius: 12px; }
  .nw-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 38px; padding: 0 16px; border-radius: 8px;
    border: 1px solid #cbd5e1; background: #fff; color: #1e293b;
    font-size: 14px; font-weight: 600; white-space: nowrap;
  }
  .nw-btn:hover:not(:disabled) { border-color: #94a3b8; }
  .nw-btn:disabled { opacity: .55; cursor: default; }
  .nw-btn-primary { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
  .nw-btn-primary:hover:not(:disabled) { background: var(--color-accent-hover); border-color: var(--color-accent-hover); }
  .nw-btn-sm { height: 32px; padding: 0 12px; font-size: 13px; }
  .nw-btn-danger { color: #b91c1c; }
  .nw-btn:focus-visible, .nw-icon-btn:focus-visible, .nw-row-main:focus-visible, .nw-cover-drop:focus-visible {
    outline: 2px solid var(--color-accent); outline-offset: 2px;
  }

  .nw-list-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid var(--color-border); }
  .nw-segment { display: inline-flex; padding: 3px; background: #f1f5f9; border-radius: 9px; }
  .nw-segment button { height: 32px; padding: 0 12px; border-radius: 7px; font-size: 13px; font-weight: 600; color: #475569; }
  .nw-segment button span { margin-left: 4px; color: #94a3b8; font-weight: 500; }
  .nw-segment button.active { background: #fff; color: var(--color-text-dark); box-shadow: 0 1px 2px rgb(15 23 42 / .08); }
  .nw-select {
    height: 38px; padding: 0 32px 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #fff;
    font-size: 14px; color: var(--color-text-dark);
  }
  .nw-select:focus { outline: none; border-color: var(--color-accent); }
  .nw-select[aria-invalid="true"] { border-color: #dc2626; }
  .nw-select-block { width: 100%; }
  .nw-cat { flex: none; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #fff; border: 1px solid #99f6e4; color: #0f766e; }
  .nw-search {
    flex: 1 1 200px; display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px;
    border: 1px solid #cbd5e1; border-radius: 8px; color: #94a3b8;
  }
  .nw-search:focus-within { border-color: var(--color-accent); }
  .nw-search input { flex: 1; min-width: 0; border: 0; outline: none; font-size: 14px; background: transparent; color: var(--color-text-dark); }

  .nw-rows { list-style: none; }
  .nw-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
  .nw-row:last-child { border-bottom: 0; }
  .nw-row:hover { background: #fafbfc; }
  .nw-row-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 14px; text-align: left; border-radius: 8px; }
  .nw-thumb {
    flex: none; width: 72px; height: 48px; border-radius: 6px; overflow: hidden;
    background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center;
  }
  .nw-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .nw-row-text { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .nw-row-text strong { font-size: 15px; color: var(--color-text-dark); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nw-row-text small { font-size: 12.5px; color: #64748b; }
  .nw-chip { flex: none; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #475569; }
  .nw-chip.is-live { background: #ecfdf5; color: #047857; }
  .nw-row-actions { flex: none; display: flex; gap: 2px; }
  .nw-icon-btn { width: 34px; height: 34px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: #64748b; }
  .nw-icon-btn:hover { background: #f1f5f9; color: var(--color-text-dark); }
  .nw-icon-btn.danger:hover { background: #fef2f2; color: #b91c1c; }
  .nw-row.is-deleting { background: #fef2f2; }
  .nw-row.is-deleting .nw-row-main, .nw-row.is-deleting .nw-chip { opacity: 0.55; }
  .nw-row.is-deleting button { cursor: progress; }
  .nw-row.is-deleting .nw-icon-btn.danger { color: #b91c1c; opacity: 1; }
  .nw-deleting-text { color: #b91c1c !important; font-weight: 600; }
  .nw-spin { animation: spin 0.9s linear infinite; }
  .nw-no-result { padding: 40px 16px; text-align: center; color: #64748b; font-size: 14px; }

  .nw-empty {
    display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;
    padding: 56px 24px; background: #fff; border: 1px dashed #cbd5e1; border-radius: 12px; color: #94a3b8;
  }
  .nw-empty h3 { font-size: 18px; margin-top: 4px; }
  .nw-empty p { max-width: 380px; color: #64748b; font-size: 14px; margin-bottom: 8px; }

  .nw-editor-bar {
    display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;
    margin-bottom: 16px;
  }
  .nw-back { display: inline-flex; align-items: center; gap: 6px; color: #475569; font-size: 14px; font-weight: 600; padding: 6px 2px; }
  .nw-back:hover { color: var(--color-text-dark); }
  .nw-editor-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nw-save-state { font-size: 13px; color: #64748b; margin-right: 4px; }
  .nw-save-state.is-dirty { color: #b45309; }
  .nw-editor-grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 24px; align-items: start; }
  .nw-editor-main { min-width: 0; }
  .nw-title-input {
    width: 100%; resize: none; overflow: hidden; border: 0; outline: none; background: transparent;
    font-family: var(--font-display); font-size: 30px; font-weight: 700; line-height: 1.25;
    color: var(--color-text-dark); padding: 4px 0 14px;
  }
  .nw-title-input::placeholder { color: #cbd5e1; }
  .nw-counter { margin: -8px 0 10px; font-size: 12px; color: #b45309; }
  .nw-side { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 16px; }
  .nw-side-card { padding: 16px; }
  .nw-side-card h4 { font-family: var(--font-primary); font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 12px; }
  .nw-cover img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 8px; display: block; }
  .nw-cover-actions { display: flex; gap: 8px; margin-top: 10px; }
  .nw-cover-credit { margin-top: 6px; font-size: 11.5px; line-height: 1.45; color: #64748b; }
  .nw-field { display: flex; flex-direction: column; gap: 5px; margin-top: 14px; font-size: 13px; }
  .nw-field span { font-weight: 600; color: #334155; }
  .nw-field em { font-style: normal; font-weight: 500; color: #94a3b8; margin-left: 4px; }
  .nw-field input, .nw-field textarea {
    width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 7px;
    font-size: 13.5px; line-height: 1.45; color: var(--color-text-dark); resize: vertical;
  }
  .nw-field input:focus, .nw-field textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(0, 123, 255, .12); }
  .nw-field [aria-invalid="true"] { border-color: #dc2626; }
  .nw-cover-drop {
    width: 100%; aspect-ratio: 16 / 9; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    border: 1.5px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; color: #475569; font-size: 14px; font-weight: 600;
  }
  .nw-cover-drop:hover:not(:disabled) { border-color: var(--color-accent); color: var(--color-accent); }
  .nw-cover-drop small { font-weight: 400; font-size: 12px; color: #94a3b8; }
  .nw-help { margin-top: 10px; font-size: 12px; color: #94a3b8; }
  .nw-meta { display: flex; flex-direction: column; gap: 10px; font-size: 13px; }
  .nw-meta div { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .nw-meta dt { color: #64748b; }
  .nw-meta dd { color: var(--color-text-dark); font-weight: 500; }
  .nw-side-links { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
  .nw-inline-link { display: inline-flex; align-items: center; gap: 4px; color: var(--color-accent); font-weight: 600; font-size: 13px; }
  .nw-inline-link:hover { text-decoration: underline; }
  .nw-text-btn { font-size: 13px; font-weight: 600; color: #64748b; }
  .nw-text-btn:hover { color: #b91c1c; }
  .nw-loading { padding: 24px; display: flex; flex-direction: column; gap: 14px; }

  @media (max-width: 1080px) {
    .nw-editor-grid { grid-template-columns: minmax(0, 1fr); }
    .nw-side { position: static; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
  }
  @media (max-width: 640px) {
    .nw-title-input { font-size: 24px; }
    .nw-row { flex-wrap: wrap; }
    .nw-row-main { flex-basis: 100%; }
    .nw-cat { margin-left: 86px; }
    .nw-row-actions { margin-left: auto; }
  }
`;
