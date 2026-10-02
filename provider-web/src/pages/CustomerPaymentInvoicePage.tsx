import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Copy, FileText, FileUp, LoaderCircle, ShieldCheck, X } from 'lucide-react';

import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { fetchCheckoutConfig, type CheckoutConfig } from '../utils/checkoutConfig';

const formatIDR = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
}).format(value || 0);

const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const PAID_STATUSES = ['PAID', 'CONFIRMED', 'COMPLETED'];

// Status akhir/lain yang tidak lagi menerima bukti transfer beserta penjelasannya.
const CLOSED_STATUS_COPY: Record<string, { title: string; body: string }> = {
  EXPIRED: { title: 'Waktu pembayaran berakhir', body: 'Kuota sudah dilepas. Silakan buat pesanan baru bila masih ingin berangkat.' },
  FAILED: { title: 'Pembayaran gagal', body: 'Pesanan ini tidak dapat dibayar lagi. Silakan buat pesanan baru.' },
  CANCELLED_BY_CUSTOMER: { title: 'Pesanan dibatalkan', body: 'Pesanan ini sudah Anda batalkan.' },
  CANCELLED_BY_PROVIDER: { title: 'Pesanan dibatalkan mitra', body: 'Lihat detail pesanan di Cek Booking untuk informasi pengembalian dana.' },
  REFUND_REQUIRED: { title: 'Pengembalian dana sedang diproses', body: 'Admin TemenTrip akan memproses refund ke rekening Anda. Pantau statusnya di Cek Booking.' },
  REFUNDED: { title: 'Dana sudah dikembalikan', body: 'Pengembalian dana untuk pesanan ini telah selesai.' },
  RESCHEDULE_OFFERED: { title: 'Ada tawaran jadwal baru', body: 'Mitra menawarkan jadwal pengganti. Buka Cek Booking untuk menerima atau menolaknya.' },
};

const Countdown: React.FC<{ deadline: number; label: string; onExpire?: () => void }> = ({ deadline, label, onExpire }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((deadline - now) / 1000));
  useEffect(() => {
    if (seconds === 0) onExpire?.();
  }, [seconds, onExpire]);
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const deadlineText = new Date(deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <span>
      <strong style={{ color: seconds > 0 ? '#c2410c' : '#dc2626' }}>{label}: {hours}:{minutes}:{secs}</strong>
      <span style={{ color: '#64748b' }}> (sebelum {deadlineText} WIB)</span>
    </span>
  );
};

const CopyButton: React.FC<{ value: string; label: string; onCopied: (ok: boolean) => void }> = ({ value, label, onCopied }) => (
  <button
    type="button"
    onClick={async () => {
      try {
        await navigator.clipboard.writeText(value);
        onCopied(true);
      } catch {
        onCopied(false);
      }
    }}
    aria-label={`Salin ${label}`}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #bae6fd', background: '#fff', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#0369a1', fontWeight: 700, fontSize: 13 }}
  >
    <Copy size={14} /> Salin
  </button>
);

const StepItem: React.FC<{ index: number; title: string; active: boolean; done: boolean }> = ({ index, title, active, done }) => (
  <li style={{ display: 'flex', alignItems: 'center', gap: 8, color: done ? '#047857' : active ? '#0f172a' : '#94a3b8', fontWeight: active ? 800 : 600, fontSize: 13 }}>
    <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 12, background: done ? '#d1fae5' : active ? '#0284c7' : '#e2e8f0', color: done ? '#047857' : active ? '#fff' : '#64748b' }}>
      {done ? '✓' : index}
    </span>
    {title}
  </li>
);

export const CustomerPaymentInvoicePage: React.FC = () => {
  const { navigateTo, selectedBookingForInvoice, setSelectedBookingForInvoice } = useNavigation();
  const initialBooking = useMemo(() => {
    // Kode di URL (#/halaman-pembayaran?code=...) membuat halaman ini dapat
    // di-refresh, dibuka di tab lain, atau ditautkan dari notifikasi.
    const match = window.location.hash.match(/[?&]code=([^&]+)/);
    const hashCode = match ? decodeURIComponent(match[1]) : '';
    const matchesHash = (b: any) => !hashCode || b?.bookingCode === hashCode;
    if (selectedBookingForInvoice && matchesHash(selectedBookingForInvoice)) return selectedBookingForInvoice;
    try {
      const saved = sessionStorage.getItem('tripkita_recent_guest_booking');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && matchesHash(parsed)) return parsed;
    } catch {
      // abaikan data sesi yang rusak
    }
    return hashCode ? { bookingCode: hashCode } : null;
  }, [selectedBookingForInvoice]);
  const [booking, setBooking] = useState<any>(initialBooking);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [statusLoadError, setStatusLoadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bookingCode: string | undefined = booking?.bookingCode;

  const persistBooking = useCallback((next: any) => {
    setBooking(next);
    setSelectedBookingForInvoice(next);
    try {
      sessionStorage.setItem('tripkita_recent_guest_booking', JSON.stringify(next));
    } catch {
      // Penyimpanan sesi opsional; status tetap dapat dicek lewat Cek Booking.
    }
  }, [setSelectedBookingForInvoice]);

  const refreshStatus = useCallback(async () => {
    if (!bookingCode) return;
    try {
      const latest = await request(`/public/bookings/status/${encodeURIComponent(bookingCode)}`);
      setBooking((prev: any) => {
        const merged = { ...prev, ...latest };
        setSelectedBookingForInvoice(merged);
        try {
          sessionStorage.setItem('tripkita_recent_guest_booking', JSON.stringify(merged));
        } catch {
          // abaikan
        }
        return merged;
      });
      setStatusLoadError('');
    } catch (err: any) {
      // Hanya ditampilkan bila belum ada data sama sekali (dibuka dari URL).
      setStatusLoadError(err?.status === 404
        ? 'Kode booking tidak ditemukan.'
        : (err?.message || 'Status booking belum dapat dimuat.'));
    }
  }, [bookingCode, setSelectedBookingForInvoice]);

  useEffect(() => {
    fetchCheckoutConfig().then(setConfig).catch((err) => setError(err.message || 'Informasi rekening belum dapat dimuat. Muat ulang halaman ini.'));
  }, []);

  // Data dari sessionStorage bisa sudah usang (mis. admin sudah menyetujui atau
  // menolak bukti), jadi status selalu disegarkan saat halaman dibuka.
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const status = booking?.status;
    if (!bookingCode || (status !== 'PAYMENT_REVIEW' && status !== 'PENDING_PAYMENT')) return;
    const timer = window.setInterval(refreshStatus, status === 'PAYMENT_REVIEW' ? 15000 : 30000);
    return () => window.clearInterval(timer);
  }, [bookingCode, booking?.status, refreshStatus]);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!bookingCode) {
    return (
      <main style={{ minHeight: '65vh', display: 'grid', placeItems: 'center', padding: '32px 16px' }}>
        <section style={{ textAlign: 'center', maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Data pembayaran tidak ditemukan</h1>
          <p style={{ color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>Buka Cek Booking, cari kode booking Anda, lalu pilih <strong>Selesaikan Pembayaran</strong>.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigateTo('riwayat-booking')}>Buka Cek Booking</button>
        </section>
      </main>
    );
  }

  if (!booking.status) {
    return (
      <main style={{ minHeight: '65vh', display: 'grid', placeItems: 'center', padding: '32px 16px' }}>
        <section style={{ textAlign: 'center', maxWidth: 420 }}>
          {statusLoadError ? (
            <>
              <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Tagihan belum dapat dibuka</h1>
              <p style={{ color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>{statusLoadError}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline" onClick={() => refreshStatus()}>Coba Lagi</button>
                <button type="button" className="btn btn-primary" onClick={() => navigateTo('riwayat-booking')}>Buka Cek Booking</button>
              </div>
            </>
          ) : (
            <p style={{ color: '#64748b' }}><LoaderCircle size={16} className="btn-spinner" style={{ verticalAlign: 'middle', marginRight: 8 }} />Memuat tagihan {bookingCode}...</p>
          )}
        </section>
      </main>
    );
  }

  const status: string = booking.status;
  const createdAt = new Date(booking.createdAt).getTime();
  // Batas dari server diutamakan karena dapat diperpanjang setelah bukti ditolak.
  const serverDeadline = booking.paymentDeadline ? new Date(booking.paymentDeadline).getTime() : NaN;
  const paymentDeadline = Number.isFinite(serverDeadline)
    ? serverDeadline
    : (config && Number.isFinite(createdAt) ? createdAt + config.paymentWindowSeconds * 1000 : 0);
  const isPaid = PAID_STATUSES.includes(status);
  const isReview = status === 'PAYMENT_REVIEW';
  const isPending = status === 'PENDING_PAYMENT';
  const isLocallyExpired = isPending && paymentDeadline > 0 && Date.now() >= paymentDeadline;
  const closedCopy = CLOSED_STATUS_COPY[status] || (isLocallyExpired ? CLOSED_STATUS_COPY.EXPIRED : undefined);
  const canUpload = isPending && !isLocallyExpired;
  const reviewDeadline = booking.paymentReviewDeadline ? new Date(booking.paymentReviewDeadline).getTime() : 0;
  const bank = config?.manualPayment;
  const bankReady = !!bank?.accountNumber;
  const totalPrice = Number(booking.totalPrice) || 0;
  const currentStep = isPaid ? 4 : isReview ? 3 : file ? 2 : 1;

  const selectFile = (selected: File | null) => {
    setError('');
    setMessage('');
    if (!selected) {
      setFile(null);
      return;
    }
    // Sebagian file picker Android tidak mengisi MIME type; isi file tetap
    // diverifikasi server, jadi yang kosong diteruskan.
    if (selected.type && !ALLOWED_PROOF_TYPES.includes(selected.type)) {
      setError('Bukti transfer harus berupa foto JPG/PNG atau PDF.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_PROOF_SIZE) {
      setError(`Ukuran file ${(selected.size / (1024 * 1024)).toFixed(1)} MB. Maksimal 5 MB.`);
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitProof = async () => {
    if (!file || loading || !canUpload) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      const updated = await request(`/public/bookings/${encodeURIComponent(bookingCode)}/payment-proof`, { method: 'POST', body });
      persistBooking({ ...booking, ...updated });
      clearFile();
      setMessage('Bukti transfer terkirim. Admin akan memeriksa maksimal 1×24 jam, dan Anda akan menerima notifikasi setelahnya.');
    } catch (err: any) {
      setError(err?.message || 'Bukti transfer belum dapat dikirim. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const onCopied = (what: string) => (ok: boolean) => {
    setError('');
    if (ok) setMessage(`${what} berhasil disalin.`);
    else setError(`${what} tidak dapat disalin otomatis. Silakan salin secara manual.`);
  };

  const statusTone = isPaid ? { bg: '#ecfdf5', icon: <CheckCircle2 color="#059669" /> }
    : isReview ? { bg: '#eff6ff', icon: <ShieldCheck color="#2563eb" /> }
    : closedCopy ? { bg: '#fef2f2', icon: <AlertTriangle color="#dc2626" /> }
    : { bg: '#fff7ed', icon: <Clock3 color="#ea580c" /> };

  const statusTitle = isPaid ? 'Pembayaran dikonfirmasi'
    : isReview ? 'Bukti transfer sedang diperiksa admin'
    : closedCopy ? closedCopy.title
    : booking.paymentReviewNotes ? 'Bukti transfer sebelumnya ditolak'
    : 'Menunggu pembayaran — kuota sedang ditahan untuk Anda';

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px 72px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button type="button" onClick={() => navigateTo('riwayat-booking')} style={{ border: 0, background: 'transparent', color: '#0284c7', fontWeight: 700, cursor: 'pointer', marginBottom: 18, padding: '6px 0' }}>← Cek Booking</button>
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 'clamp(16px, 4vw, 24px)', boxShadow: '0 8px 28px rgba(15,23,42,.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>KODE BOOKING</span>
              <h1 style={{ margin: '4px 0', fontSize: 22, wordBreak: 'break-all' }}>{bookingCode}</h1>
              <p style={{ margin: 0, color: '#64748b' }}>{booking.packageName || booking.packageDetails?.name || 'Paket Wisata'} · {booking.guests} peserta</p>
            </div>
            <div>
              <span style={{ fontSize: 12, color: '#64748b' }}>TOTAL YANG HARUS DITRANSFER</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#0284c7' }}>{formatIDR(totalPrice)}</span>
                {canUpload && totalPrice > 0 && <CopyButton value={String(Math.round(totalPrice))} label="nominal transfer" onCopied={onCopied('Nominal transfer')} />}
              </div>
            </div>
          </div>

          {!closedCopy && (
            <ol style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <StepItem index={1} title="Transfer" active={currentStep === 1} done={currentStep > 1} />
              <StepItem index={2} title="Unggah bukti" active={currentStep === 2} done={currentStep > 2} />
              <StepItem index={3} title="Verifikasi admin" active={currentStep === 3} done={currentStep > 3} />
            </ol>
          )}

          <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: statusTone.bg, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: 2 }}>{statusTone.icon}</span>
            <div>
              <strong>{statusTitle}</strong>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                {isPaid && 'Pesanan Anda sudah diteruskan ke mitra. E-tiket dapat dilihat di Cek Booking.'}
                {isReview && (reviewDeadline > 0
                  ? <Countdown deadline={reviewDeadline} label="Batas pemeriksaan admin" />
                  : 'Admin memeriksa bukti maksimal 1×24 jam sejak dikirim.')}
                {closedCopy && closedCopy.body}
                {canUpload && (paymentDeadline > 0
                  ? <Countdown deadline={paymentDeadline} label="Selesaikan dalam" onExpire={refreshStatus} />
                  : 'Memuat batas waktu pembayaran...')}
              </div>
            </div>
          </div>

          {canUpload && (
            <>
              <div style={{ marginTop: 20, padding: 18, border: '1px solid #bae6fd', borderRadius: 14, background: '#f0f9ff' }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>1. Transfer ke rekening TemenTrip</h2>
                {!config && !error ? (
                  <p style={{ color: '#64748b', margin: 0 }}>Memuat informasi rekening...</p>
                ) : bankReady ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>Bank <strong style={{ color: '#0f172a' }}>{bank!.bankName}</strong></span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 22, letterSpacing: 1 }}>{bank!.accountNumber}</strong>
                      <CopyButton value={bank!.accountNumber} label="nomor rekening" onCopied={onCopied('Nomor rekening')} />
                    </div>
                    <span style={{ color: '#475569' }}>a.n. <strong>{bank!.accountHolder}</strong></span>
                    <small style={{ color: '#64748b', lineHeight: 1.5 }}>
                      Transfer <strong>tepat {formatIDR(totalPrice)}</strong> dan cantumkan kode <strong>{bookingCode}</strong> di berita transfer agar verifikasi lebih cepat.
                    </small>
                  </div>
                ) : (
                  <p style={{ color: '#dc2626', margin: 0 }}>Rekening pembayaran belum tersedia. Jangan transfer dulu — hubungi admin TemenTrip melalui halaman Bantuan.</p>
                )}
              </div>

              <div style={{ marginTop: 16, padding: 18, border: '1px dashed #94a3b8', borderRadius: 14 }}>
                <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>2. Unggah bukti transfer</h2>
                {booking.paymentReviewNotes && (
                  <p style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 8, fontSize: 14 }}>
                    <strong>Alasan penolakan dari admin:</strong> {booking.paymentReviewNotes}. Silakan unggah bukti yang benar.
                  </p>
                )}
                <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>Screenshot/foto struk (JPG, PNG) atau PDF · maksimal 5 MB. Pastikan nominal, tanggal, dan rekening tujuan terlihat jelas.</p>

                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #cbd5e1', borderRadius: 10 }}>
                    {previewUrl
                      ? <img src={previewUrl} alt="Pratinjau bukti transfer" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                      : <FileText size={36} color="#0284c7" style={{ flexShrink: 0 }} />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{(file.size / 1024).toFixed(0)} KB</div>
                    </div>
                    <button type="button" onClick={clearFile} disabled={loading} aria-label="Ganti file" style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, border: '1px solid #cbd5e1', borderRadius: 10, cursor: bankReady ? 'pointer' : 'not-allowed', opacity: bankReady ? 1 : 0.6 }}>
                    <FileUp size={20} color="#0284c7" />
                    <span style={{ fontWeight: 600 }}>Pilih file bukti transfer</span>
                    <input ref={fileInputRef} type="file" disabled={!bankReady} accept="image/jpeg,image/png,application/pdf" onChange={(e) => selectFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  </label>
                )}

                <button type="button" disabled={!file || loading || !bankReady} onClick={submitProof} style={{ marginTop: 14, width: '100%', border: 0, borderRadius: 10, padding: 14, background: '#0284c7', color: '#fff', fontWeight: 800, cursor: !file || loading || !bankReady ? 'not-allowed' : 'pointer', opacity: !file || loading || !bankReady ? .55 : 1 }}>
                  {loading ? <><LoaderCircle size={16} className="btn-spinner" style={{ verticalAlign: 'middle', marginRight: 8 }} /> Mengirim...</> : 'Kirim Bukti Pembayaran'}
                </button>
              </div>
            </>
          )}

          <div aria-live="polite">
            {message && <p style={{ color: '#047857', fontWeight: 700, marginTop: 16 }}>{message}</p>}
            {error && <p style={{ color: '#dc2626', fontWeight: 700, marginTop: 16 }}>{error}</p>}
          </div>
          {isReview && <p style={{ color: '#475569', marginTop: 18, lineHeight: 1.5 }}>Pesanan baru diteruskan ke mitra setelah admin menyetujui pembayaran. Halaman ini diperbarui otomatis; Anda juga boleh menutupnya dan memantau status lewat Cek Booking.</p>}
          {(isPaid || closedCopy) && (
            <button type="button" className="btn btn-primary" onClick={() => navigateTo('riwayat-booking')} style={{ marginTop: 18 }}>Lihat di Cek Booking</button>
          )}
        </section>
      </div>
    </main>
  );
};
