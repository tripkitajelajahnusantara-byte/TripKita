import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { LoaderCircle, MessageCircle, Pencil, Reply, Trash2, VenetianMask } from 'lucide-react';
import { request } from '../utils/api';
import type { NewsComment } from '../utils/news';
import { rememberReturnTo, useNavigation } from '../context/NavigationContext';
import { useCustomAlert } from './CustomAlertModal';
import { Skeleton } from './Skeleton';
import { getLang, useI18n } from '../i18n';

const COMMENT_MAX = 1000;
const ALIAS_MAX = 40;
// Ditambahkan ke alamat kembali-setelah-login agar formulir komentar langsung terbuka.
const COMPOSE_PARAM = '&komentar=1';

interface Draft { body: string; anonymous: boolean; alias: string }
type Target = null | 'new' | { reply: number } | { edit: number };

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export function NewsComments({ newsId }: { newsId: number }) {
  const { t, locale } = useI18n();
  const { customerProfile, navigateTo } = useNavigation();
  const { showConfirm, showAlert } = useCustomAlert();
  const [items, setItems] = useState<NewsComment[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [target, setTarget] = useState<Target>(() => (window.location.hash.includes(COMPOSE_PARAM) ? 'new' : null));
  const sectionRef = useRef<HTMLElement>(null);
  const loggedIn = !!customerProfile;
  const realName = customerProfile?.picName || customerProfile?.businessName || '';

  // Dimuat ulang saat status login berubah agar tanda "Anda" ikut berubah.
  useEffect(() => {
    let cancelled = false;
    request(`/public/news/${newsId}/comments`)
      .then((data: { items: NewsComment[] }) => { if (!cancelled) setItems(data.items); })
      .catch((err) => { if (!cancelled) setLoadError(errorText(err, getLang() === 'en' ? 'Could not load comments.' : 'Komentar gagal dimuat.')); });
    return () => { cancelled = true; };
  }, [newsId, attempt, loggedIn]);

  // Kembali dari halaman login: gulir ke formulir lalu bersihkan penanda di URL.
  useEffect(() => {
    if (!items || !window.location.hash.includes(COMPOSE_PARAM)) return;
    window.history.replaceState(null, '', window.location.hash.replace(COMPOSE_PARAM, ''));
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [items]);

  const threads = useMemo(() => {
    const list = items ?? [];
    return list.filter((item) => item.parentId === null).reverse()
      .map((root) => ({ root, replies: list.filter((item) => item.parentId === root.id) }));
  }, [items]);

  const requireLogin = () => {
    rememberReturnTo(window.location.hash.replace(COMPOSE_PARAM, '') + COMPOSE_PARAM);
    navigateTo('masuk');
  };

  const open = (next: Target) => (loggedIn ? setTarget(next) : requireLogin());

  const save = async (draft: Draft, current: Exclude<Target, null>) => {
    const editing = typeof current === 'object' && 'edit' in current;
    const body = JSON.stringify({
      body: draft.body,
      anonymous: draft.anonymous,
      alias: draft.anonymous ? draft.alias : '',
      parentId: typeof current === 'object' && 'reply' in current ? current.reply : undefined,
    });
    const saved: NewsComment = editing
      ? await request(`/customer/news-comments/${current.edit}`, { method: 'PUT', body })
      : await request(`/customer/news/${newsId}/comments`, { method: 'POST', body });
    setItems((list) => (editing
      ? (list ?? []).map((item) => (item.id === saved.id ? saved : item))
      : [...(list ?? []), saved]));
    setTarget(null);
  };

  const remove = (comment: NewsComment) => showConfirm({
    title: t('Hapus komentar?', 'Delete comment?'),
    message: comment.parentId === null
      ? t('Komentar ini beserta seluruh balasannya akan dihapus.', 'This comment and all of its replies will be deleted.')
      : t('Balasan ini akan dihapus.', 'This reply will be deleted.'),
    type: 'error',
    confirmText: t('Hapus', 'Delete'),
    onConfirm: async () => {
      try {
        await request(`/customer/news-comments/${comment.id}`, { method: 'DELETE' });
        setItems((list) => list?.filter((item) => item.id !== comment.id && item.parentId !== comment.id) ?? null);
      } catch (err) {
        showAlert({ type: 'error', message: errorText(err, t('Komentar gagal dihapus.', 'Could not delete the comment.')) });
      }
    },
  });

  const formFor = (current: Exclude<Target, null>, initial?: Draft) => (
    <CommentForm
      realName={realName}
      initial={initial}
      submitLabel={current === 'new' ? t('Kirim komentar', 'Post comment') : 'edit' in current ? t('Simpan', 'Save') : t('Kirim balasan', 'Post reply')}
      onCancel={() => setTarget(null)}
      onSubmit={(draft) => save(draft, current)}
    />
  );

  const renderComment = (comment: NewsComment) => {
    const editing = typeof target === 'object' && target !== null && 'edit' in target && target.edit === comment.id;
    const edited = new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 60_000;
    const time = new Date(comment.createdAt).toLocaleString(locale, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
    });
    return (
      <article className="nc-item">
        <span className={`nc-avatar${comment.anonymous ? ' is-alias' : ''}`} aria-hidden="true">
          {comment.anonymous ? <VenetianMask size={18} /> : comment.displayName.trim().charAt(0).toUpperCase()}
        </span>
        <div className="nc-main">
          <header className="nc-meta">
            <strong>{comment.displayName}</strong>
            {comment.mine && <span className="nc-you">{t('Anda', 'You')}</span>}
            <time dateTime={comment.createdAt}>{time} WIB</time>
            {edited && <span className="nc-edited">· {t('diedit', 'edited')}</span>}
          </header>
          {editing ? (
            formFor({ edit: comment.id }, { body: comment.body, anonymous: comment.anonymous, alias: comment.anonymous ? comment.displayName : '' })
          ) : (
            <>
              <p className="nc-body">{comment.body}</p>
              <div className="nc-actions">
                <button type="button" onClick={() => open({ reply: comment.id })}><Reply size={15} /> {t('Balas', 'Reply')}</button>
                {comment.mine && (
                  <>
                    <button type="button" onClick={() => setTarget({ edit: comment.id })}><Pencil size={14} /> {t('Edit', 'Edit')}</button>
                    <button type="button" className="is-danger" onClick={() => remove(comment)}><Trash2 size={14} /> {t('Hapus', 'Delete')}</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </article>
    );
  };

  const count = items?.length ?? 0;

  return (
    <section className="nc" id="komentar" ref={sectionRef} aria-labelledby="nc-title">
      <div className="nc-head">
        <h2 id="nc-title">{t('Komentar', 'Comments')}{count > 0 && <span>{count}</span>}</h2>
        {target !== 'new' && (
          <button type="button" className="nc-write" onClick={() => open('new')}>
            <MessageCircle size={17} /> {t('Tulis Komentar', 'Write a Comment')}
          </button>
        )}
      </div>
      {!loggedIn && (
        <p className="nc-hint">{t('Siapa pun bisa membaca komentar. Masuk untuk menulis atau membalas komentar.', 'Anyone can read comments. Sign in to write or reply.')}</p>
      )}

      {target === 'new' && loggedIn && <div className="nc-compose">{formFor('new')}</div>}

      {loadError && !items ? (
        <div className="nc-state">
          <p>{loadError}</p>
          <button type="button" className="nc-btn" onClick={() => { setLoadError(''); setAttempt((value) => value + 1); }}>{t('Coba lagi', 'Try again')}</button>
        </div>
      ) : !items ? (
        <div className="nc-loading" aria-busy="true" aria-label={t('Memuat komentar', 'Loading comments')}>
          {[0, 1].map((key) => (
            <div key={key} className="nc-item">
              <Skeleton width={40} height={40} radius={999} />
              <div className="nc-main"><Skeleton width={160} height={14} /><Skeleton height={14} style={{ marginTop: 10 }} /></div>
            </div>
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="nc-state">
          <MessageCircle size={28} strokeWidth={1.5} aria-hidden="true" />
          <p>{t('Belum ada komentar. Jadilah yang pertama berbagi pendapat.', 'No comments yet. Be the first to share your thoughts.')}</p>
        </div>
      ) : (
        <ol className="nc-list">
          {threads.map(({ root, replies }) => {
            const replyingHere = typeof target === 'object' && target !== null && 'reply' in target
              && (target.reply === root.id || replies.some((reply) => reply.id === target.reply));
            const replyTo = replyingHere ? [root, ...replies].find((item) => item.id === (target as { reply: number }).reply) : undefined;
            return (
              <li key={root.id} className="nc-thread">
                {renderComment(root)}
                {(replies.length > 0 || replyingHere) && (
                  <ol className="nc-replies">
                    {replies.map((reply) => <li key={reply.id}>{renderComment(reply)}</li>)}
                    {replyingHere && loggedIn && (
                      <li className="nc-reply-form" key={`reply-${replyTo?.id}`}>
                        {formFor({ reply: root.id }, { body: replyTo && replyTo.id !== root.id ? `@${replyTo.displayName} ` : '', anonymous: false, alias: '' })}
                      </li>
                    )}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <style>{NEWS_COMMENTS_CSS}</style>
    </section>
  );
}

function CommentForm({ realName, initial, submitLabel, onSubmit, onCancel }: {
  realName: string;
  initial?: Draft;
  submitLabel: string;
  onSubmit: (draft: Draft) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const name = useId();
  const [draft, setDraft] = useState<Draft>(initial ?? { body: '', anonymous: false, alias: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.body.trim()) {
      setError(t('Tulis komentar terlebih dahulu.', 'Write your comment first.'));
      return;
    }
    if (draft.anonymous && draft.alias.trim().length < 2) {
      setError(t('Isi nama samaran minimal 2 karakter.', 'Enter a pseudonym of at least 2 characters.'));
      return;
    }
    setSending(true);
    setError('');
    try {
      await onSubmit(draft);
    } catch (err) {
      setError(errorText(err, t('Komentar gagal dikirim.', 'Could not post the comment.')));
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="nc-form" onSubmit={send} noValidate>
      <fieldset className="nc-identity">
        <legend>{t('Tampil sebagai', 'Post as')}</legend>
        <label className={draft.anonymous ? '' : 'is-active'}>
          <input type="radio" name={name} checked={!draft.anonymous} onChange={() => setDraft({ ...draft, anonymous: false })} />
          <span><strong>{t('Nama asli', 'Real name')}</strong><small>{realName}</small></span>
        </label>
        <label className={draft.anonymous ? 'is-active' : ''}>
          <input type="radio" name={name} checked={draft.anonymous} onChange={() => setDraft({ ...draft, anonymous: true })} />
          <span><strong>{t('Samarkan nama', 'Pseudonym')}</strong><small>{t('Nama asli tidak ditampilkan', 'Your real name stays hidden')}</small></span>
        </label>
      </fieldset>
      {draft.anonymous && (
        <input
          className="nc-input"
          maxLength={ALIAS_MAX}
          value={draft.alias}
          onChange={(event) => setDraft({ ...draft, alias: event.target.value })}
          placeholder={t('Nama samaran, mis. Pendaki Malam', 'Pseudonym, e.g. Night Hiker')}
          aria-label={t('Nama samaran', 'Pseudonym')}
        />
      )}
      <textarea
        ref={textRef}
        className="nc-input"
        rows={3}
        maxLength={COMMENT_MAX}
        value={draft.body}
        onChange={(event) => setDraft({ ...draft, body: event.target.value })}
        placeholder={t('Bagikan pendapat atau pengalamanmu…', 'Share your thoughts or experience…')}
        aria-label={t('Isi komentar', 'Comment')}
      />
      <div className="nc-form-foot">
        <span className={`nc-count${draft.body.length > COMMENT_MAX - 100 ? ' is-near' : ''}`}>{draft.body.length}/{COMMENT_MAX}</span>
        {error && <p className="nc-error" role="alert">{error}</p>}
        <button type="button" className="nc-btn" onClick={onCancel} disabled={sending}>{t('Batal', 'Cancel')}</button>
        <button type="submit" className="nc-btn nc-btn-primary" disabled={sending}>
          {sending && <LoaderCircle size={15} className="nc-spin" />} {submitLabel}
        </button>
      </div>
    </form>
  );
}

const NEWS_COMMENTS_CSS = `
  .nc { margin-top: 56px; padding-top: 32px; border-top: 1px solid var(--color-border); scroll-margin-top: 96px; }
  .nc-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .nc-head h2 { font-size: 22px; display: inline-flex; align-items: center; gap: 10px; }
  .nc-head h2 span {
    min-width: 28px; height: 24px; padding: 0 8px; border-radius: 999px; background: var(--nw-teal-soft); color: var(--nw-teal-ink);
    font-size: 13px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;
  }
  .nc-write {
    display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border-radius: 999px;
    background: var(--nw-teal); color: #fff; font-size: 14px; font-weight: 600; transition: background .15s;
  }
  .nc-write:hover { background: var(--nw-teal-ink); }
  .nc-hint { margin-top: 8px; font-size: 14px; color: var(--color-text-medium); }
  .nc-compose { margin-top: 20px; }

  .nc-form { display: flex; flex-direction: column; gap: 10px; padding: 16px; border: 1px solid var(--color-border); border-radius: 14px; background: #f8fafc; }
  .nc-identity { border: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .nc-identity legend { font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px; }
  .nc-identity label {
    display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer;
    border: 1.5px solid var(--color-border); background: #fff; transition: border-color .15s, background .15s;
  }
  .nc-identity label.is-active { border-color: var(--nw-teal); background: var(--nw-teal-softer); }
  .nc-identity input { margin-top: 3px; accent-color: var(--nw-teal); }
  .nc-identity span { display: flex; flex-direction: column; min-width: 0; }
  .nc-identity strong { font-size: 14px; color: var(--color-text-dark); }
  .nc-identity small { font-size: 12.5px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nc-input {
    width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff;
    font: inherit; font-size: 15px; line-height: 1.55; color: var(--color-text-dark); resize: vertical;
  }
  .nc-input:focus { outline: none; border-color: var(--nw-teal); box-shadow: 0 0 0 3px rgb(13 148 136 / .15); }
  .nc-form-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nc-count { font-size: 12px; color: #94a3b8; margin-right: auto; }
  .nc-count.is-near { color: #b45309; }
  .nc-error { flex-basis: 100%; order: -1; font-size: 13.5px; color: #b91c1c; }
  .nc-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; padding: 0 16px;
    border-radius: 999px; border: 1px solid #cbd5e1; background: #fff; font-size: 14px; font-weight: 600; color: #334155;
  }
  .nc-btn:hover:not(:disabled) { border-color: #64748b; }
  .nc-btn:disabled { opacity: .6; cursor: default; }
  .nc-btn-primary { background: var(--nw-teal); border-color: var(--nw-teal); color: #fff; }
  .nc-btn-primary:hover:not(:disabled) { background: var(--nw-teal-ink); border-color: var(--nw-teal-ink); }
  .nc-spin { animation: spin .9s linear infinite; }

  .nc-list, .nc-replies { list-style: none; }
  .nc-list { margin-top: 24px; display: flex; flex-direction: column; }
  .nc-thread { padding: 18px 0; border-bottom: 1px solid #f1f5f9; }
  .nc-thread:last-child { border-bottom: 0; }
  .nc-replies { margin: 14px 0 0 52px; padding-left: 16px; border-left: 2px solid #e2e8f0; display: flex; flex-direction: column; gap: 14px; }
  .nc-item { display: flex; gap: 12px; }
  .nc-avatar {
    flex: none; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    background: var(--nw-teal-soft); color: var(--nw-teal-ink); font-weight: 700; font-size: 16px;
  }
  .nc-avatar.is-alias { background: #ede9fe; color: #6d28d9; }
  .nc-main { flex: 1; min-width: 0; }
  .nc-meta { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px; font-size: 13px; color: #64748b; }
  .nc-meta strong { font-size: 15px; color: var(--color-text-dark); }
  .nc-you { padding: 1px 8px; border-radius: 999px; background: #f1f5f9; color: #475569; font-size: 11.5px; font-weight: 600; }
  .nc-body { margin-top: 4px; font-size: 15px; line-height: 1.65; color: #1e293b; white-space: pre-wrap; overflow-wrap: anywhere; }
  .nc-actions { display: flex; gap: 4px; margin-top: 6px; margin-left: -8px; }
  .nc-actions button {
    display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 8px; border-radius: 8px;
    font-size: 13px; font-weight: 600; color: #64748b;
  }
  .nc-actions button:hover { background: #f1f5f9; color: var(--color-text-dark); }
  .nc-actions button.is-danger:hover { background: #fef2f2; color: #b91c1c; }
  .nc-item .nc-form { margin-top: 8px; }
  .nc-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 16px; text-align: center; color: #94a3b8; }
  .nc-state p { color: var(--color-text-medium); font-size: 14.5px; }
  .nc-loading { margin-top: 24px; display: flex; flex-direction: column; gap: 20px; }
  .nc button:focus-visible, .nc-identity label:focus-within { outline: 2px solid var(--nw-teal); outline-offset: 2px; }

  @media (max-width: 640px) {
    .nc-identity { grid-template-columns: 1fr; }
    .nc-replies { margin-left: 18px; padding-left: 12px; }
    .nc-write { width: 100%; justify-content: center; }
  }
`;
