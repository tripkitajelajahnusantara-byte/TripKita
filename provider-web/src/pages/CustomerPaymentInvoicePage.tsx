import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Copy, FileUp, LoaderCircle, ShieldCheck } from 'lucide-react';

import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { fetchCheckoutConfig, type CheckoutConfig } from '../utils/checkoutConfig';

const formatIDR = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
}).format(value || 0);

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
  return <strong style={{ color: seconds > 0 ? '#c2410c' : '#dc2626' }}>{label}: {hours}:{minutes}:{secs}</strong>;
};

export const CustomerPaymentInvoicePage: React.FC = () => {
  const { navigateTo, selectedBookingForInvoice, setSelectedBookingForInvoice } = useNavigation();
  const initialBooking = useMemo(() => {
    if (selectedBookingForInvoice) return selectedBookingForInvoice;
    try {
      const saved = sessionStorage.getItem('tripkita_recent_guest_booking');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [selectedBookingForInvoice]);
  const [booking, setBooking] = useState<any>(initialBooking);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refreshStatus = useCallback(async () => {
    if (!booking?.bookingCode) return;
    try {
      const latest = await request(`/public/bookings/status/${encodeURIComponent(booking.bookingCode)}`);
      const merged = { ...booking, ...latest };
      setBooking(merged);
      setSelectedBookingForInvoice(merged);
      sessionStorage.setItem('tripkita_recent_guest_booking', JSON.stringify(merged));
    } catch {
      // Status tetap dapat dimuat ulang secara manual dari Cek Booking.
    }
  }, [booking, setSelectedBookingForInvoice]);

  useEffect(() => {
    fetchCheckoutConfig().then(setConfig).catch((err) => setError(err.message || 'Konfigurasi rekening belum dapat dimuat.'));
  }, []);

  useEffect(() => {
    if (!booking?.bookingCode || booking.status !== 'PAYMENT_REVIEW') return;
    const timer = window.setInterval(refreshStatus, 15000);
    return () => window.clearInterval(timer);
  }, [booking?.bookingCode, booking?.status, refreshStatus]);

  if (!booking?.bookingCode) {
    return (
      <main style={{ minHeight: '65vh', display: 'grid', placeItems: 'center', padding: '32px' }}>
        <section style={{ textAlign: 'center' }}>
          <h1>Booking tidak ditemukan</h1>
          <p style={{ color: '#64748b' }}>Buka Cek Booking lalu pilih Selesaikan Pembayaran.</p>
          <button onClick={() => navigateTo('riwayat-booking')}>Buka Cek Booking</button>
        </section>
      </main>
    );
  }

  const createdAt = new Date(booking.createdAt).getTime();
  const paymentDeadline = createdAt + (config?.paymentWindowSeconds || 86400) * 1000;
  const isExpired = booking.status === 'EXPIRED' || (booking.status === 'PENDING_PAYMENT' && Date.now() >= paymentDeadline);
  const isReview = booking.status === 'PAYMENT_REVIEW';
  const isPaid = ['PAID', 'CONFIRMED', 'COMPLETED'].includes(booking.status);
  const reviewDeadline = booking.paymentReviewDeadline ? new Date(booking.paymentReviewDeadline).getTime() : 0;

  const submitProof = async () => {
    if (!file || loading || isExpired) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran bukti transfer maksimal 5 MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setError('Bukti transfer harus berupa JPG, PNG, atau PDF.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      const updated = await request(`/public/bookings/${encodeURIComponent(booking.bookingCode)}/payment-proof`, { method: 'POST', body });
      const merged = { ...booking, ...updated };
      setBooking(merged);
      setSelectedBookingForInvoice(merged);
      sessionStorage.setItem('tripkita_recent_guest_booking', JSON.stringify(merged));
      setFile(null);
      setMessage('Bukti transfer berhasil dikirim. Admin akan mengonfirmasi maksimal 1×24 jam.');
    } catch (err: any) {
      setError(err?.message || 'Bukti transfer belum dapat dikirim.');
    } finally {
      setLoading(false);
    }
  };

  const bank = config?.manualPayment;
  const copyAccount = async () => {
    if (!bank?.accountNumber) return;
    await navigator.clipboard.writeText(bank.accountNumber);
    setMessage('Nomor rekening berhasil disalin.');
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 20px 72px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button type="button" onClick={() => navigateTo('riwayat-booking')} style={{ border: 0, background: 'transparent', color: '#0284c7', fontWeight: 700, cursor: 'pointer', marginBottom: 18 }}>← Cek Booking</button>
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 24, boxShadow: '0 8px 28px rgba(15,23,42,.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 12, color: '#64748b' }}>BOOKING ID</span>
              <h1 style={{ margin: '4px 0', fontSize: 24 }}>{booking.bookingCode}</h1>
              <p style={{ margin: 0, color: '#64748b' }}>{booking.packageName || booking.packageDetails?.name || 'Paket Wisata'} · {booking.guests} peserta</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>TOTAL TRANSFER</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0284c7' }}>{formatIDR(booking.totalPrice)}</div>
            </div>
          </div>

          <div style={{ marginTop: 22, padding: 16, borderRadius: 12, background: isPaid ? '#ecfdf5' : isReview ? '#eff6ff' : isExpired ? '#fef2f2' : '#fff7ed', display: 'flex', gap: 10, alignItems: 'center' }}>
            {isPaid ? <CheckCircle2 color="#059669" /> : isReview ? <ShieldCheck color="#2563eb" /> : <Clock3 color={isExpired ? '#dc2626' : '#ea580c'} />}
            <div>
              <strong>{isPaid ? 'Pembayaran dikonfirmasi' : isReview ? 'Menunggu konfirmasi admin' : isExpired ? 'Waktu pembayaran berakhir' : 'Kuota sedang ditahan'}</strong>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>
                {isReview && reviewDeadline > 0
                  ? <Countdown deadline={reviewDeadline} label="Batas konfirmasi admin" />
                  : !isPaid && !isExpired
                    ? <Countdown deadline={paymentDeadline} label="Selesaikan dalam" onExpire={refreshStatus} />
                    : isReview ? 'Admin wajib memeriksa bukti maksimal 1×24 jam sejak dikirim.' : null}
              </div>
            </div>
          </div>

          {!isPaid && !isReview && !isExpired && (
            <>
              <div style={{ marginTop: 22, padding: 20, border: '1px solid #bae6fd', borderRadius: 14, background: '#f0f9ff' }}>
                <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>Transfer ke rekening TemenTrip</h2>
                {bank?.accountNumber ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <span><strong>{bank.bankName}</strong></span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <strong style={{ fontSize: 22, letterSpacing: 1 }}>{bank.accountNumber}</strong>
                      <button onClick={copyAccount} aria-label="Salin nomor rekening" style={{ border: '1px solid #bae6fd', background: '#fff', borderRadius: 8, padding: 7, cursor: 'pointer' }}><Copy size={16} /></button>
                    </div>
                    <span style={{ color: '#475569' }}>a.n. {bank.accountHolder}</span>
                    <small style={{ color: '#64748b' }}>Transfer tepat sesuai total agar verifikasi admin lebih cepat.</small>
                  </div>
                ) : <p style={{ color: '#dc2626' }}>Rekening pembayaran belum dikonfigurasi. Hubungi admin TemenTrip sebelum melakukan transfer.</p>}
              </div>

              <div style={{ marginTop: 18, padding: 20, border: '1px dashed #94a3b8', borderRadius: 14 }}>
                <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Upload bukti transfer</h2>
                {booking.paymentReviewNotes && <p style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 8 }}><strong>Catatan admin:</strong> {booking.paymentReviewNotes}</p>}
                <p style={{ color: '#64748b', fontSize: 13 }}>JPG, PNG, atau PDF · maksimal 5 MB.</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, border: '1px solid #cbd5e1', borderRadius: 10, cursor: 'pointer' }}>
                  <FileUp size={20} color="#0284c7" />
                  <span>{file?.name || 'Pilih bukti transfer'}</span>
                  <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </label>
                <button disabled={!file || loading || !bank?.accountNumber} onClick={submitProof} style={{ marginTop: 14, width: '100%', border: 0, borderRadius: 10, padding: 13, background: '#0284c7', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: !file || loading || !bank?.accountNumber ? .55 : 1 }}>
                  {loading ? <><LoaderCircle size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Mengirim...</> : 'Kirim Bukti Pembayaran'}
                </button>
              </div>
            </>
          )}

          {message && <p style={{ color: '#047857', fontWeight: 700, marginTop: 16 }}>{message}</p>}
          {error && <p style={{ color: '#dc2626', fontWeight: 700, marginTop: 16 }}>{error}</p>}
          {isReview && <p style={{ color: '#475569', marginTop: 18 }}>Booking belum diteruskan ke provider sampai admin menyetujui pembayaran. Anda dapat menutup halaman ini dan memantau status lewat Cek Booking.</p>}
        </section>
      </div>
    </main>
  );
};
