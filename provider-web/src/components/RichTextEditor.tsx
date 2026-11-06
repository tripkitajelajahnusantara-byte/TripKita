import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote,
  Link2, Unlink, ImagePlus, Minus, Undo2, Redo2, RemoveFormatting, LoaderCircle, Trash2,
} from 'lucide-react';
import { countWords, readingMinutes } from '../utils/news';

interface RichTextEditorProps {
  /** HTML awal. Editor tidak dikontrol; beri `key` baru untuk memuat artikel lain. */
  initialHtml: string;
  onChange: (html: string) => void;
  /** Mengunggah foto dan mengembalikan URL yang dapat ditampilkan browser. */
  onUploadImage: (file: File) => Promise<string>;
  placeholder?: string;
}

type InlineCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList';
const INLINE_COMMANDS: InlineCommand[] = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

// Tempelan dari Google Docs/Word/web dibersihkan ke tag yang sama dengan yang
// diizinkan backend, supaya editor sudah menampilkan hasil akhirnya.
const PASTE_TAGS: Record<string, string> = {
  P: 'p', DIV: 'p', H1: 'h2', H2: 'h2', H3: 'h3', H4: 'h3', H5: 'h3', H6: 'h3',
  STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', U: 'u', S: 's', STRIKE: 's', DEL: 's',
  BLOCKQUOTE: 'blockquote', UL: 'ul', OL: 'ol', LI: 'li', A: 'a', BR: 'br', HR: 'hr', IMG: 'img',
};
const PASTE_DROP = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'IFRAME', 'OBJECT', 'SVG', 'NOSCRIPT', 'TEMPLATE']);

function cleanPastedNode(node: Node, doc: Document): Node[] {
  if (node.nodeType === Node.TEXT_NODE) return [doc.createTextNode(node.textContent ?? '')];
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as HTMLElement;
  if (PASTE_DROP.has(el.tagName)) return [];
  const children = Array.from(el.childNodes).flatMap((child) => cleanPastedNode(child, doc));
  const style = el.getAttribute('style') ?? '';
  let tag: string | undefined = PASTE_TAGS[el.tagName];
  // Google Docs membungkus seluruh isi dengan <b style="font-weight:normal">
  // dan menandai tebal/miring lewat style pada <span>.
  if (tag === 'strong' && /font-weight:\s*(normal|400)/.test(style)) tag = undefined;
  if (!tag && el.tagName === 'SPAN') {
    if (/font-weight:\s*(bold|[6-9]00)/.test(style)) tag = 'strong';
    else if (/font-style:\s*italic/.test(style)) tag = 'em';
  }
  if (!tag) return children;
  const out = doc.createElement(tag);
  if (tag === 'a') {
    const href = el.getAttribute('href')?.trim() ?? '';
    if (!/^(https?:|mailto:|#)/i.test(href)) return children;
    out.setAttribute('href', href);
  }
  if (tag === 'img') {
    const src = el.getAttribute('src')?.trim() ?? '';
    if (!/^https?:\/\//i.test(src)) return [];
    out.setAttribute('src', src);
    out.setAttribute('alt', el.getAttribute('alt') ?? '');
  }
  out.append(...children);
  return [out];
}

function cleanPastedHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const container = document.createElement('div');
  container.append(...Array.from(parsed.body.childNodes).flatMap((node) => cleanPastedNode(node, document)));
  return container.innerHTML;
}

function normalizeLink(raw: string) {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return '';
  if (/^(https?:|mailto:|#)/i.test(value)) return value;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return `mailto:${value}`;
  return `https://${value}`;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface ToolButtonProps { label: string; icon: React.ReactNode; onPress: () => void; pressed?: boolean; disabled?: boolean }

const ToolButton: React.FC<ToolButtonProps> = ({ label, icon, onPress, pressed, disabled }) => (
  <button
    type="button"
    className={`rte-btn ${pressed ? 'is-active' : ''}`}
    aria-label={label}
    aria-pressed={pressed}
    title={label}
    disabled={disabled}
    // Mencegah tombol mengambil fokus sehingga seleksi teks tidak hilang.
    onMouseDown={(event) => event.preventDefault()}
    onClick={onPress}
  >
    {icon}
  </button>
);

export function RichTextEditor({ initialHtml, onChange, onUploadImage, placeholder = 'Mulai menulis…' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const initialHtmlRef = useRef(initialHtml);

  const [active, setActive] = useState<Partial<Record<InlineCommand, boolean>>>({});
  const [block, setBlock] = useState('p');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTarget, setLinkTarget] = useState<HTMLAnchorElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageAlt, setImageAlt] = useState('');
  const [words, setWords] = useState(0);
  const [empty, setEmpty] = useState(true);

  const refreshStats = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText;
    setWords(countWords(text));
    setEmpty(!text.trim() && !el.querySelector('img, hr'));
  }, []);

  const emit = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
    refreshStats();
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = initialHtmlRef.current || '<p><br></p>';
    document.execCommand('defaultParagraphSeparator', false, 'p');
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    const onSelection = () => {
      const el = editorRef.current;
      const selection = document.getSelection();
      if (!el || !selection || selection.rangeCount === 0 || !el.contains(selection.anchorNode)) return;
      rangeRef.current = selection.getRangeAt(0).cloneRange();
      setActive(Object.fromEntries(INLINE_COMMANDS.map((cmd) => [cmd, document.queryCommandState(cmd)])));
      setBlock(String(document.queryCommandValue('formatBlock') || 'p').toLowerCase());
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, []);

  // Fokus kembali ke editor dan pulihkan posisi kursor terakhir (hilang saat
  // admin mengetik URL tautan atau memilih berkas foto).
  const restoreSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const selection = document.getSelection();
    let range = rangeRef.current;
    if (!range || !el.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const exec = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    emit();
  };

  const toggleBlock = (tag: 'h2' | 'h3' | 'blockquote') => exec('formatBlock', block === tag ? '<p>' : `<${tag}>`);

  const openLink = () => {
    const anchorNode = rangeRef.current?.commonAncestorContainer;
    const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
    const anchor = anchorElement?.closest('a') ?? null;
    const target = anchor && editorRef.current?.contains(anchor) ? anchor : null;
    setLinkTarget(target);
    setLinkUrl(target?.getAttribute('href') ?? '');
    setLinkOpen(true);
    requestAnimationFrame(() => linkInputRef.current?.focus());
  };

  const applyLink = () => {
    const href = normalizeLink(linkUrl);
    setLinkOpen(false);
    if (!href) return;
    const target = linkTarget;
    if (target) {
      target.setAttribute('href', href);
      emit();
      return;
    }
    restoreSelection();
    const selection = document.getSelection();
    if (selection?.isCollapsed) {
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(href)}">${escapeHtml(linkUrl.trim())}</a>`);
    } else {
      document.execCommand('createLink', false, href);
    }
    emit();
  };

  const removeLink = () => {
    setLinkOpen(false);
    const target = linkTarget;
    restoreSelection();
    if (target) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    document.execCommand('unlink');
    emit();
  };

  const insertImage = async (file: File) => {
    setUploadError('');
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      setUploadError('Foto harus berformat JPG atau PNG.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError('Ukuran foto maksimal 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const src = await onUploadImage(file);
      restoreSelection();
      document.execCommand('insertHTML', false, `<img src="${escapeHtml(src)}" alt="">`);
      emit();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Foto gagal diunggah.');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith('image/'));
    if (file) {
      event.preventDefault();
      void insertImage(file);
      return;
    }
    const html = event.clipboardData.getData('text/html');
    if (!html) return;
    event.preventDefault();
    document.execCommand('insertHTML', false, cleanPastedHtml(html));
    emit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openLink();
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLImageElement) {
      setSelectedImage(target);
      setImageAlt(target.getAttribute('alt') ?? '');
    } else {
      setSelectedImage(null);
    }
  };

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Format teks">
        <div className="rte-group">
          <ToolButton label="Judul bagian" icon={<Heading2 size={18} />} onPress={() => toggleBlock('h2')} pressed={block === 'h2'} />
          <ToolButton label="Subjudul" icon={<Heading3 size={18} />} onPress={() => toggleBlock('h3')} pressed={block === 'h3'} />
        </div>
        <div className="rte-group">
          <ToolButton label={`Tebal (${mod}+B)`} icon={<Bold size={17} />} onPress={() => exec('bold')} pressed={active.bold} />
          <ToolButton label={`Miring (${mod}+I)`} icon={<Italic size={17} />} onPress={() => exec('italic')} pressed={active.italic} />
          <ToolButton label={`Garis bawah (${mod}+U)`} icon={<Underline size={17} />} onPress={() => exec('underline')} pressed={active.underline} />
          <ToolButton label="Coret" icon={<Strikethrough size={17} />} onPress={() => exec('strikeThrough')} pressed={active.strikeThrough} />
        </div>
        <div className="rte-group">
          <ToolButton label="Daftar poin" icon={<List size={18} />} onPress={() => exec('insertUnorderedList')} pressed={active.insertUnorderedList} />
          <ToolButton label="Daftar bernomor" icon={<ListOrdered size={18} />} onPress={() => exec('insertOrderedList')} pressed={active.insertOrderedList} />
          <ToolButton label="Kutipan" icon={<Quote size={17} />} onPress={() => toggleBlock('blockquote')} pressed={block === 'blockquote'} />
          <ToolButton label="Garis pemisah" icon={<Minus size={18} />} onPress={() => exec('insertHorizontalRule')} />
        </div>
        <div className="rte-group">
          <ToolButton label={`Tautan (${mod}+K)`} icon={<Link2 size={18} />} onPress={openLink} pressed={linkOpen} />
          <ToolButton label="Sisipkan foto" icon={uploading ? <LoaderCircle size={18} className="rte-spin" /> : <ImagePlus size={18} />} onPress={() => fileRef.current?.click()} disabled={uploading} />
        </div>
        <div className="rte-group">
          <ToolButton label="Hapus format" icon={<RemoveFormatting size={17} />} onPress={() => { exec('removeFormat'); exec('formatBlock', '<p>'); }} />
          <ToolButton label={`Urungkan (${mod}+Z)`} icon={<Undo2 size={17} />} onPress={() => exec('undo')} />
          <ToolButton label="Ulangi" icon={<Redo2 size={17} />} onPress={() => exec('redo')} />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void insertImage(file);
          }}
        />
      </div>

      {linkOpen && (
        <div className="rte-bar">
          <label htmlFor="rte-link-input">Tautan</label>
          <input
            id="rte-link-input"
            ref={linkInputRef}
            type="text"
            inputMode="url"
            placeholder="tementrip.id/promo atau #/cari-trip"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); applyLink(); }
              if (event.key === 'Escape') { event.preventDefault(); setLinkOpen(false); restoreSelection(); }
            }}
          />
          <button type="button" className="rte-bar-primary" onClick={applyLink} disabled={!linkUrl.trim()}>Terapkan</button>
          {linkTarget && (
            <button type="button" className="rte-bar-ghost" onClick={removeLink}><Unlink size={15} /> Lepas tautan</button>
          )}
          <button type="button" className="rte-bar-ghost" onClick={() => { setLinkOpen(false); restoreSelection(); }}>Batal</button>
        </div>
      )}

      {selectedImage?.isConnected && (
        <div className="rte-bar">
          <label htmlFor="rte-alt-input">Keterangan foto</label>
          <input
            id="rte-alt-input"
            type="text"
            placeholder="Contoh: Pantai Pink saat matahari terbenam"
            value={imageAlt}
            maxLength={150}
            onChange={(event) => {
              setImageAlt(event.target.value);
              selectedImage.setAttribute('alt', event.target.value);
              emit();
            }}
          />
          <button type="button" className="rte-bar-ghost danger" onClick={() => { selectedImage.remove(); setSelectedImage(null); emit(); }}>
            <Trash2 size={15} /> Hapus foto
          </button>
        </div>
      )}

      {uploadError && <p className="rte-error" role="alert">{uploadError}</p>}

      <div
        ref={editorRef}
        className={`rte-content news-prose ${empty ? 'is-empty' : ''}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Isi berita"
        data-placeholder={placeholder}
        onInput={emit}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
      />

      <div className="rte-footer">
        <span>{words} kata · ±{readingMinutes(words)} menit baca</span>
        <span className="rte-hint">Klik foto untuk menambah keterangan atau menghapusnya.</span>
      </div>

      <style>{`
        .rte { background: #fff; border: 1px solid var(--color-border); border-radius: 12px; }
        .rte-toolbar {
          position: sticky; top: 0; z-index: 5;
          display: flex; flex-wrap: wrap; gap: 4px;
          padding: 6px 8px; background: #fff;
          border-bottom: 1px solid var(--color-border);
          border-radius: 12px 12px 0 0;
        }
        .rte-group { display: flex; gap: 2px; padding-right: 4px; margin-right: 2px; border-right: 1px solid #eef2f6; }
        .rte-group:last-of-type { border-right: 0; }
        .rte-btn {
          width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center;
          border-radius: 7px; color: #475569;
        }
        .rte-btn:hover:not(:disabled) { background: #f1f5f9; color: var(--color-text-dark); }
        .rte-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }
        .rte-btn.is-active { background: #e8f1ff; color: #1d4ed8; }
        .rte-btn:disabled { opacity: .5; cursor: default; }
        .rte-spin { animation: rte-spin 0.9s linear infinite; }
        @keyframes rte-spin { to { transform: rotate(360deg); } }
        .rte-bar {
          display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
          padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid var(--color-border);
          font-size: 13px;
        }
        .rte-bar label { font-weight: 600; color: #334155; }
        .rte-bar input {
          flex: 1 1 220px; min-width: 0; height: 34px; padding: 0 10px;
          border: 1px solid #cbd5e1; border-radius: 7px; font-size: 14px; background: #fff;
        }
        .rte-bar input:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(0, 123, 255, .12); }
        .rte-bar-primary { height: 34px; padding: 0 14px; border-radius: 7px; background: var(--color-accent); color: #fff; font-weight: 600; }
        .rte-bar-primary:disabled { opacity: .5; cursor: default; }
        .rte-bar-ghost { height: 34px; padding: 0 10px; border-radius: 7px; color: #475569; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
        .rte-bar-ghost:hover { background: #eef2f6; }
        .rte-bar-ghost.danger { color: #b91c1c; }
        .rte-bar-ghost.danger:hover { background: #fef2f2; }
        .rte-error { margin: 0; padding: 8px 14px; font-size: 13px; color: #991b1b; background: #fef2f2; border-bottom: 1px solid #fecaca; }
        .rte-content { position: relative; min-height: 420px; padding: 28px 32px 40px; outline: none; }
        .rte-content.is-empty::before {
          content: attr(data-placeholder); position: absolute; top: 28px; left: 32px;
          color: #94a3b8; pointer-events: none;
        }
        .rte-content img { cursor: pointer; }
        .rte-footer {
          display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
          padding: 8px 14px; border-top: 1px solid var(--color-border);
          font-size: 12px; color: #64748b;
        }
        .rte-hint { color: #94a3b8; }
        @media (max-width: 640px) {
          .rte-content { padding: 20px 16px 32px; min-height: 320px; }
          .rte-content.is-empty::before { top: 20px; left: 16px; }
          .rte-hint { display: none; }
        }
      `}</style>
    </div>
  );
}
