import { useEffect, useState } from 'react';
import { ExternalLink, Eye, EyeOff, LoaderCircle, MessageSquare, Search, Trash2 } from 'lucide-react';
import { request } from '../utils/api';
import { newsHash } from '../utils/news';
import { NEWS_PANEL_CSS } from './AdminNewsPanel';
import { useCustomAlert } from './CustomAlertModal';
import { SkeletonTable } from './Skeleton';

interface AdminComment {
  id: number;
  newsId: number;
  newsTitle: string;
  parentId: number | null;
  displayName: string;
  anonymous: boolean;
  authorName: string;
  authorEmail: string;
  body: string;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommentPage { items: AdminComment[]; total: number; page: number; pageSize: number }

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const formatTime = (value: string) => new Date(value).toLocaleString('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
});

// Kelola Komentar: admin melihat semua komentar, mencari menurut judul artikel
// atau nama/email pengguna, lalu menyembunyikan atau menghapus komentar.
export function AdminNewsCommentsPanel() {
  const { showConfirm, showAlert } = useCustomAlert();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  // key menandai permintaan yang menghasilkan data agar halaman lama tetap tampil saat memuat.
  const [result, setResult] = useState<{ key: string; data: CommentPage } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<ReadonlySet<number>>(() => new Set());
  const requestKey = `${search}|${page}|${reload}`;
  const loading = result?.key !== requestKey;

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('q', search);
    request(`/admin/news-comments?${params}`)
      .then((data: CommentPage) => { if (!cancelled) { setResult({ key: requestKey, data }); setError(''); } })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, 'Komentar gagal dimuat.')); });
    return () => { cancelled = true; };
  }, [page, search, reload, requestKey]);

  const withBusy = async (id: number, action: () => Promise<void>) => {
    setBusy((current) => new Set(current).add(id));
    try {
      await action();
    } finally {
      setBusy((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleHidden = (comment: AdminComment) => withBusy(comment.id, async () => {
    try {
      await request(`/admin/news-comments/${comment.id}/visibility`, { method: 'PUT', body: JSON.stringify({ hidden: !comment.hidden }) });
      setResult((current) => current && {
        ...current,
        data: { ...current.data, items: current.data.items.map((row) => (row.id === comment.id ? { ...row, hidden: !comment.hidden } : row)) },
      });
    } catch (err) {
      showAlert({ type: 'error', message: errorMessage(err, 'Status komentar gagal diubah.') });
    }
  });

  const remove = (comment: AdminComment) => showConfirm({
    title: 'Hapus komentar?',
    message: comment.parentId === null
      ? `Komentar dari "${comment.displayName}" beserta seluruh balasannya akan dihapus permanen.`
      : `Balasan dari "${comment.displayName}" akan dihapus permanen.`,
    type: 'error',
    confirmText: 'Hapus',
    onConfirm: () => withBusy(comment.id, async () => {
      try {
        await request(`/admin/news-comments/${comment.id}`, { method: 'DELETE' });
        setReload((value) => value + 1);
      } catch (err) {
        showAlert({ type: 'error', message: errorMessage(err, 'Komentar gagal dihapus.') });
      }
    }),
  });

  const data = result?.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="nw-panel animate-fade-in">
      <section className="nw-card">
        <div className="nw-list-toolbar">
          <label className="nw-search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari judul artikel, nama, atau email pengguna"
              aria-label="Cari komentar"
              maxLength={150}
            />
          </label>
          {data && <span className="ncm-total">{data.total} komentar</span>}
        </div>

        {error && !data ? (
          <div className="alert-message error-alert" style={{ margin: 16 }}>{error}</div>
        ) : !data ? (
          <SkeletonTable rows={5} columns={3} label="Memuat komentar" />
        ) : data.items.length === 0 ? (
          <div className="nw-no-result">
            <MessageSquare size={28} strokeWidth={1.5} style={{ marginBottom: 8 }} />
            <p>{search ? 'Tidak ada komentar yang cocok.' : 'Belum ada komentar dari pembaca.'}</p>
          </div>
        ) : (
          <ul className={`ncm-rows${loading ? ' is-loading' : ''}`} aria-busy={loading}>
            {data.items.map((comment) => {
              const isBusy = busy.has(comment.id);
              return (
                <li key={comment.id} className={`ncm-row${comment.hidden ? ' is-hidden' : ''}`}>
                  <div className="ncm-main">
                    <div className="ncm-head">
                      <strong>{comment.displayName}</strong>
                      {comment.anonymous && <span className="nw-chip">Samaran</span>}
                      {comment.parentId !== null && <span className="nw-chip">Balasan</span>}
                      {comment.hidden && <span className="nw-chip ncm-chip-hidden">Disembunyikan</span>}
                      <time dateTime={comment.createdAt}>{formatTime(comment.createdAt)} WIB</time>
                    </div>
                    <p className="ncm-body">{comment.body}</p>
                    <div className="ncm-meta">
                      <span>Akun: {comment.authorName || '-'}{comment.authorEmail && ` · ${comment.authorEmail}`}</span>
                      <a href={newsHash(comment.newsId)} target="_blank" rel="noreferrer" className="nw-inline-link">
                        {comment.newsTitle} <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                  <div className="ncm-actions">
                    <button type="button" className="nw-btn nw-btn-sm" disabled={isBusy} onClick={() => toggleHidden(comment)}>
                      {isBusy ? <LoaderCircle size={15} className="nw-spin" /> : comment.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                      {comment.hidden ? 'Tampilkan' : 'Sembunyikan'}
                    </button>
                    <button type="button" className="nw-btn nw-btn-sm nw-btn-danger" disabled={isBusy} onClick={() => remove(comment)}>
                      <Trash2 size={15} /> Hapus
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {data && data.total > data.pageSize && (
          <div className="ncm-pager">
            <span>{first}–{last} dari {data.total}</span>
            <button type="button" className="nw-btn nw-btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Sebelumnya</button>
            <button type="button" className="nw-btn nw-btn-sm" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Berikutnya</button>
          </div>
        )}
        {error && data && <p className="ncm-error" role="alert">{error}</p>}
      </section>
      <style>{NEWS_PANEL_CSS + COMMENTS_PANEL_CSS}</style>
    </div>
  );
}

const COMMENTS_PANEL_CSS = `
  .ncm-total { font-size: 13px; color: #64748b; white-space: nowrap; }
  .ncm-rows { list-style: none; transition: opacity .15s; }
  .ncm-rows.is-loading { opacity: .55; }
  .ncm-row { display: flex; gap: 16px; align-items: flex-start; padding: 16px; border-bottom: 1px solid #f1f5f9; }
  .ncm-row:last-child { border-bottom: 0; }
  .ncm-row.is-hidden { background: #fffbeb; }
  .ncm-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .ncm-head { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 8px; font-size: 13px; color: #64748b; }
  .ncm-head strong { font-size: 15px; color: var(--color-text-dark); }
  .ncm-chip-hidden { background: #fef3c7; color: #92400e; }
  .ncm-body { font-size: 14.5px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; overflow-wrap: anywhere; }
  .ncm-row.is-hidden .ncm-body { color: #78716c; }
  .ncm-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 12.5px; color: #64748b; }
  .ncm-meta .nw-inline-link { font-size: 12.5px; min-width: 0; overflow-wrap: anywhere; }
  .ncm-actions { flex: none; display: flex; flex-direction: column; gap: 6px; }
  .ncm-actions .nw-btn { justify-content: flex-start; }
  .ncm-pager { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--color-border); font-size: 13px; color: #64748b; }
  .ncm-pager span { margin-right: auto; }
  .ncm-error { padding: 0 16px 16px; color: #b91c1c; font-size: 13px; }
  .nw-no-result p { margin: 0; }
  @media (max-width: 640px) {
    .ncm-row { flex-direction: column; }
    .ncm-actions { flex-direction: row; }
  }
`;
