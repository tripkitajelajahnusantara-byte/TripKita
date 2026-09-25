import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { fetchCheckoutConfig } from '../utils/checkoutConfig';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, MessageSquare, Star } from 'lucide-react';

interface BookingItem {
  id: number;
  bookingCode: string;
  customerName: string;
  customerInitial: string;
  packageDetails?: {
    id?: number;
    name: string;
    tripType?: string;
    category: string;
    destination: string;
    price: number;
  };
  packageName?: string; // Fallback for local history items
  tripDate: string;
  guests: number;
  totalPrice: number;
  paymentMethod: string;
  status: string;
  paymentUrl: string;
  createdAt: string;
  providerWhatsApp?: string;
  providerName?: string;
  // Terisi saat penyelenggara menawarkan tanggal pengganti karena kuota minimal
  // open trip tidak terpenuhi pada H-3.
  rescheduleDate?: string | null;
  tripDepartureId?: number | null;
  // Sebab keberangkatan tidak dapat dijalankan: kuota minimal tidak terpenuhi,
  // atau keadaan kahar beserta penjelasan penyelenggara.
  cancellationReason?: string;
}

const getWhatsAppURL = (phone?: string): string | null => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  if (!digits.startsWith('62') || digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
};

const getTrustedPaymentURL = (value?: string): string | null => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === 'https:' && (host === 'xendit.co' || host.endsWith('.xendit.co')) ? parsed.toString() : null;
  } catch {
    return null;
  }
};

// Batas waktu pembayaran invoice. Nilai sebenarnya diambil dari /public/checkout-config;
// konstanta ini hanya dipakai selama konfigurasi belum termuat.
const DEFAULT_PAYMENT_WINDOW_SECONDS = 24 * 60 * 60;

const CountdownTimer: React.FC<{ createdAt?: string; windowSeconds: number; onExpire?: () => void }> = ({ createdAt, windowSeconds, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!createdAt) return;
    const createdMs = new Date(createdAt).getTime();
    if (!Number.isFinite(createdMs) || createdMs <= 0) return;

    const expireMs = createdMs + windowSeconds * 1000;

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((expireMs - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0 && onExpireRef.current) {
        onExpireRef.current();
        return true;
      }
      return false;
    };

    if (updateTimer()) return;
    const interval = setInterval(() => {
      if (updateTimer()) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt, windowSeconds]);

  const hours = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', padding: '5px 12px', borderRadius: '30px', fontSize: '12px', fontWeight: '800' }}>
      <Clock size={14} color="#ea580c" />
      <span>Batas Transfer: {hours}:{minutes}:{seconds}</span>
    </div>
  );
};

export const CustomerHistoryPage: React.FC = () => {
  const { navigateTo, customerProfile, setSelectedPackageForDetail } = useNavigation();

  // Batas waktu pembayaran dari backend (detik)
  const [paymentWindowSeconds, setPaymentWindowSeconds] = useState<number>(DEFAULT_PAYMENT_WINDOW_SECONDS);

  useEffect(() => {
    let cancelled = false;
    fetchCheckoutConfig()
      .then((cfg) => { if (!cancelled) setPaymentWindowSeconds(cfg.paymentWindowSeconds); })
      .catch((err) => console.error('Failed to load checkout config:', err));
    return () => { cancelled = true; };
  }, []);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Lacak Tiket State
  const [searchCode, setSearchCode] = useState('');
  const [trackedBooking, setTrackedBooking] = useState<any | null>(null);
  const [trackingError, setTrackingError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Review & Rating Modal State
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<any | null>(null);
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');

  // Custom Notice Modal state
  const [modalNotice, setModalNotice] = useState<{ title: string; message: string; isError?: boolean } | null>(null);

  // Cancellation Modal state
  const [cancelConfirmBooking, setCancelConfirmBooking] = useState<any | null>(null);
  const [cancellingLoading, setCancellingLoading] = useState(false);

  const handleConfirmCancel = async (bookingToCancel: any) => {
	if (!bookingToCancel) return;
	if (!customerProfile || customerProfile.role !== 'CUSTOMER') {
	  alert('Pembatalan booking tamu harus dilakukan melalui layanan pelanggan untuk verifikasi identitas.');
	  return;
	}
	setCancellingLoading(true);
	try {
	  const cancelledBooking = await request(`/customer/bookings/${bookingToCancel.id}/cancel`, {
		method: 'PUT',
		body: JSON.stringify({})
	  });
	  const cancelledStatus = cancelledBooking.status || 'CANCELLED_BY_CUSTOMER';

      try {
        const historyStr = localStorage.getItem('tripkita_my_bookings') || '[]';
        const history = JSON.parse(historyStr);
        const updatedHistory = history.map((b: any) => {
          if (b.id == bookingToCancel.id || b.bookingCode === bookingToCancel.bookingCode) {
            return { ...b, ...cancelledBooking, status: cancelledStatus };
          }
          return b;
        });
        localStorage.setItem('tripkita_my_bookings', JSON.stringify(updatedHistory));
      } catch (e) {
        console.error(e);
      }

      if (trackedBooking && (trackedBooking.id == bookingToCancel.id || trackedBooking.bookingCode === bookingToCancel.bookingCode)) {
        setTrackedBooking({ ...trackedBooking, ...cancelledBooking, status: cancelledStatus });
      }

      setBookings(prev => prev.map(b => (b.id == bookingToCancel.id || b.bookingCode === bookingToCancel.bookingCode) ? { ...b, ...cancelledBooking, status: cancelledStatus } : b));
      fetchHistory();
      setCancelConfirmBooking(null);
    } catch (err: any) {
      console.error('Failed to cancel booking:', err);
      alert('Gagal membatalkan pesanan: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setCancellingLoading(false);
    }
  };

	const handleExpireBooking = (_bId: string | number) => {
	  // Expiry is decided by the backend clock; the browser only refreshes the view.
	};

  useEffect(() => {
    // Handle return from Xendit payment gateway
    const urlParams = new URLSearchParams(window.location.search);
	const paymentResult = urlParams.get('payment_result');
	const bookingId = urlParams.get('booking_id');

	if (paymentResult && bookingId) {
	  // Redirect parameters are informational only. Payment status is accepted
	  // exclusively from the verified backend webhook.
	  if (window.history.replaceState) {
		window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
	  }
	}
	fetchHistory();
  }, [customerProfile]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      if (customerProfile && customerProfile.role === 'CUSTOMER') {
        // Authenticated customer: fetch directly from DB
        const data = await request('/customer/bookings');
        setBookings(data || []);
      } else {
        // Guest customer: keep search empty until user manually enters booking code
        setBookings([]);
        setSearchCode('');
        setTrackedBooking(null);
      }
    } catch (err) {
      console.error('Failed to fetch booking history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingError('');
    setTrackedBooking(null);
    
    if (!searchCode.trim()) {
      setTrackingError('Silakan masukkan Kode Booking Anda terlebih dahulu.');
      return;
    }

    setTrackingLoading(true);
    try {
      const data = await request(`/public/bookings/status/${searchCode.trim()}`);
      setTrackedBooking(data);
    } catch (err: any) {
      console.error(err);
      setTrackingError('Kode booking tidak ditemukan. Mohon masukkan Kode Booking secara lengkap dan tepat (contoh: TK-2824-1889).');
    } finally {
      setTrackingLoading(false);
    }
  };

  const isBookingExpired = (createdAt?: string) => {
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return false;
    const expireTime = createdTime + paymentWindowSeconds * 1000; // Batas waktu invoice Xendit
    return Date.now() > expireTime;
  };

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const [reviewedMap, setReviewedMap] = useState<{ [id: number]: boolean }>({});

  useEffect(() => {
    if (bookings.length > 0) {
      bookings.forEach((b) => {
        request(`/public/reviews/booking/${b.id}`).then((res) => {
          if (res && res.reviewed) {
            setReviewedMap(prev => ({ ...prev, [b.id]: true }));
          }
        }).catch(() => {});
      });
    }
  }, [bookings]);

  const handleSendReview = async () => {
    if (!selectedReviewBooking) return;
    try {
      await request('/customer/reviews', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: selectedReviewBooking.id,
          rating: ratingStars,
          comment: reviewText
        })
      });
      setReviewedMap(prev => ({ ...prev, [selectedReviewBooking.id]: true }));
      setSelectedReviewBooking(null);
      setModalNotice({
        title: 'Ulasan Berhasil Terkirim!',
        message: 'Terima kasih! Ulasan dan penilaian bintang Anda telah berhasil dikirim dan tersimpan di database.'
      });
    } catch (err: any) {
      console.error(err);
      setModalNotice({
        title: 'Gagal Mengirim Ulasan',
        message: err.message || 'Gagal menyimpan ulasan ke database.',
        isError: true
      });
    }
  };

  // Jawaban pelanggan atas tanggal pengganti yang ditawarkan penyelenggara saat
  // kuota minimal open trip tidak terpenuhi pada H-3.
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState<number | null>(null);

  const handleRescheduleResponse = async (bookingId: number, accept: boolean) => {
    const confirmText = accept
      ? 'Terima tanggal pengganti ini? Jadwal trip Anda akan diperbarui.'
      : 'Tolak tanggal pengganti ini? Pesanan Anda akan diteruskan ke proses pengembalian dana penuh.';
    if (!window.confirm(confirmText)) return;

    setRescheduleSubmitting(bookingId);
    try {
      const result = await request(`/customer/bookings/${bookingId}/reschedule-response`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
      });
      setModalNotice({
        title: accept ? 'Jadwal Pengganti Diterima' : 'Jadwal Pengganti Ditolak',
        message: result?.message || 'Jawaban Anda telah tersimpan.',
        isError: !accept,
      });
      await fetchHistory();
    } catch (err: any) {
      setModalNotice({
        title: 'Jawaban Gagal Dikirim',
        message: err?.message || 'Jawaban Anda tidak dapat disimpan. Silakan coba lagi.',
        isError: true,
      });
    } finally {
      setRescheduleSubmitting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          label: 'Trip Selesai (Completed)',
          color: '#10b981',
          bgColor: '#dcfce7',
          icon: <CheckCircle2 size={14} color="#10b981" />
        };
      case 'PAID':
      case 'CONFIRMED':
      case 'Dikonfirmasi':
      case 'Selesai':
        return {
          label: 'Lunas & Aktif',
          color: '#10b981',
          bgColor: '#dcfce7',
          icon: <CheckCircle2 size={14} color="#10b981" />
        };
      case 'EXPIRED':
        return {
          label: 'Kadaluwarsa (Batas Waktu Habis)',
          color: '#ef4444',
          bgColor: '#fee2e2',
          icon: <XCircle size={14} color="#ef4444" />
        };
      case 'DIBATALKAN':
      case 'CANCELLED':
        return {
          label: 'Pesanan Dibatalkan',
          color: '#ef4444',
          bgColor: '#fee2e2',
          icon: <XCircle size={14} color="#ef4444" />
        };
      case 'PENDING_PAYMENT':
      case 'Menunggu':
        return {
          label: 'Menunggu Pembayaran',
          color: '#f59e0b',
          bgColor: '#fffbeb',
          icon: <Clock size={14} color="#f59e0b" />
        };
      case 'RESCHEDULE_OFFERED':
        return {
          label: 'Menunggu Jawaban Anda (Jadwal Pengganti)',
          color: '#d97706',
          bgColor: '#fffbeb',
          icon: <AlertCircle size={14} color="#d97706" />
        };
      case 'REFUND_REQUIRED':
        return {
          label: 'Proses Refund',
          color: '#3b82f6',
          bgColor: '#eff6ff',
          icon: <AlertCircle size={14} color="#3b82f6" />
        };
      default:
        return {
          label: 'Dibatalkan',
          color: '#ef4444',
          bgColor: '#fee2e2',
          icon: <XCircle size={14} color="#ef4444" />
        };
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '40px 20px 80px 20px', boxSizing: 'border-box' }}>
      <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Track Ticket Widget */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
            Lacak Tiket Pesanan Anda
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
            Ingin mencari pesanan Anda yang hilang? Masukkan Kode Booking (Contoh: TK-2824-xxxx) di bawah ini.
          </p>

          <form onSubmit={handleTrackTicket} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Masukkan Kode Booking Anda..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              style={{
                flex: '1 1 200px',
                minWidth: 0,
                boxSizing: 'border-box',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                color: '#0f172a'
              }}
            />
            <button
              type="submit"
              disabled={trackingLoading}
              style={{
                flex: '1 0 auto',
                backgroundColor: '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {trackingLoading ? 'Melacak...' : 'Cari Tiket'}
            </button>
          </form>

          {trackingError && (
            <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', margin: '12px 0 0 0' }}>{trackingError}</p>
          )}

          {/* Tracked Ticket Result Box */}
          {trackedBooking && (
            <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>Hasil Pencarian Tiket</h3>
              <div 
                style={{ 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px', 
                  padding: '20px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    {trackedBooking.bookingCode}
                  </span>
                  <span 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '30px',
                      backgroundColor: getStatusBadge(trackedBooking.status).bgColor,
                      color: getStatusBadge(trackedBooking.status).color
                    }}
                  >
                    {getStatusBadge(trackedBooking.status).icon}
                    {getStatusBadge(trackedBooking.status).label}
                  </span>
                </div>

                <div>
                  <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                    {trackedBooking.packageDetails?.name || trackedBooking.packageName}
                  </strong>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                    <span>Tanggal: {new Date(trackedBooking.tripDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span>Peserta: {trackedBooking.guests} orang</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px dotted #cbd5e1', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>TOTAL HARGA</span>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#00a896' }}>{formatIDR(trackedBooking.totalPrice)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {trackedBooking.status === 'PENDING_PAYMENT' && (
                      <button
                        onClick={() => {
                          const pUrl = trackedBooking.paymentUrl || trackedBooking.payment_url;
                          const trustedURL = getTrustedPaymentURL(pUrl);
                          if (trustedURL) {
                            window.location.href = trustedURL;
                          } else {
                            alert('Tautan pembayaran Xendit tidak ditemukan. Silakan lakukan pemesanan ulang.');
                          }
                        }}
                        style={{
                          padding: '10px 18px',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Selesaikan Pembayaran
                      </button>
                    )}
                    {(trackedBooking.status === 'PAID' || trackedBooking.status === 'CONFIRMED') && getWhatsAppURL(
                      trackedBooking.providerWhatsApp || bookings.find(item => item.bookingCode === trackedBooking.bookingCode)?.providerWhatsApp
                    ) && (
                      <a
                        href={getWhatsAppURL(trackedBooking.providerWhatsApp || bookings.find(item => item.bookingCode === trackedBooking.bookingCode)?.providerWhatsApp) || undefined}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#25d366',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '10px 18px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '13px'
                        }}
                      >
                        <MessageSquare size={14} /> Hubungi Provider
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History List Header */}
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>
          {customerProfile && customerProfile.role === 'CUSTOMER' ? 'Riwayat Pemesanan Akun Anda' : 'Detail Status Pemesanan Tiket'}
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <p>Sedang memuat riwayat pesanan...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            <Calendar size={44} color="#007bff" style={{ marginBottom: '14px' }} />
            <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '800', marginBottom: '6px' }}>
              {customerProfile ? 'Belum Ada Pemesanan Terdaftar' : 'Melacak Tiket Pesanan (Mode Tamu)'}
            </h3>
            <p style={{ fontSize: '13.5px', maxWidth: '500px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
              {customerProfile 
                ? 'Anda belum memiliki riwayat transaksi di akun ini.' 
                : 'Anda saat ini mengakses tanpa akun. Masukkan Kode Booking yang telah Anda salin pada kolom pencarian di atas untuk melacak pesanan Anda.'}
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {!customerProfile && (
                <button 
                  onClick={() => navigateTo('masuk' as any)}
                  style={{ padding: '11px 22px', backgroundColor: '#007bff', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,123,255,0.25)' }}
                >
                  🔑 Masuk ke Akun Saya
                </button>
              )}
              <button 
                onClick={() => navigateTo('beranda')}
                style={{ padding: '11px 22px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer' }}
              >
                Cari Paket Wisata
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {bookings.map((booking, idx) => {
              const isExpired = booking.status === 'EXPIRED' || (booking.status === 'PENDING_PAYMENT' && isBookingExpired(booking.createdAt));
              const badge = getStatusBadge(isExpired ? 'EXPIRED' : booking.status);
              const tripName = booking.packageDetails?.name || booking.packageName || 'Paket Wisata Nusantara';
              const formattedTripDate = new Date(booking.tripDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
              
              return (
                <div 
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{booking.bookingCode}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {booking.createdAt && !isNaN(new Date(booking.createdAt).getTime()) 
                          ? new Date(booking.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                          : ''}
                      </span>
                    </div>
                    <span 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 10px',
                        borderRadius: '30px',
                        backgroundColor: badge.bgColor,
                        color: badge.color
                      }}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
                      {tripName}
                    </h4>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                      <span>Tanggal: {formattedTripDate}</span>
                      <span>Peserta: {booking.guests} orang</span>
                    </div>
                  </div>

                  {booking.status === 'RESCHEDULE_OFFERED' && booking.rescheduleDate && (
                    <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <strong style={{ fontSize: '13.5px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={16} color="#d97706" /> Penyelenggara Menawarkan Tanggal Pengganti
                      </strong>
                      <p style={{ fontSize: '13px', color: '#7c2d12', margin: 0, lineHeight: '1.6' }}>
                        Keberangkatan <strong>{formattedTripDate}</strong> tidak dapat dijalankan. Penyelenggara menawarkan
                        tanggal pengganti{' '}
                        <strong style={{ color: '#b45309' }}>
                          {new Date(booking.rescheduleDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </strong>.
                      </p>
                      {booking.cancellationReason && (
                        <p style={{ fontSize: '12.5px', color: '#7c2d12', margin: 0, lineHeight: '1.5', backgroundColor: '#ffffff', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px' }}>
                          <strong>Sebab:</strong> {booking.cancellationReason}
                        </p>
                      )}
                      <p style={{ fontSize: '12.5px', color: '#92400e', margin: 0, lineHeight: '1.5' }}>
                        Jika Anda menolak, pesanan akan diteruskan ke proses pengembalian dana penuh.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={rescheduleSubmitting === booking.id}
                          onClick={() => handleRescheduleResponse(booking.id, true)}
                          style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: rescheduleSubmitting === booking.id ? 'wait' : 'pointer' }}
                        >
                          Terima Jadwal Pengganti
                        </button>
                        <button
                          type="button"
                          disabled={rescheduleSubmitting === booking.id}
                          onClick={() => handleRescheduleResponse(booking.id, false)}
                          style={{ backgroundColor: '#ffffff', color: '#dc2626', border: '1.5px solid #fca5a5', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: rescheduleSubmitting === booking.id ? 'wait' : 'pointer' }}
                        >
                          Tolak & Minta Refund
                        </button>
                      </div>
                    </div>
                  )}

                  {booking.status === 'PENDING_PAYMENT' && (
                    isExpired ? (
                      /* EXPIRED CARD BANNER */
                      <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <XCircle size={16} color="#dc2626" /> Batas Waktu Pembayaran Habis (Kadaluwarsa)
                          </strong>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '4px 12px', borderRadius: '20px' }}>KADALUWARSA</span>
                        </div>
                        
                        <p style={{ fontSize: '13px', color: '#7f1d1d', margin: 0, lineHeight: '1.5' }}>
                          Batas waktu pembayaran {Math.round(paymentWindowSeconds / 3600)} jam untuk transaksi ini telah kadaluwarsa. Silakan lakukan pemesanan ulang jika Anda ingin mengikuti trip ini.
                        </p>

                        <div style={{ marginTop: '4px' }}>
                          <button
                            onClick={() => {
                              // Buka detail paket yang sama bila datanya tersedia
                              if (booking.packageDetails?.id) {
                                setSelectedPackageForDetail(booking.packageDetails);
                                navigateTo('paket-detail');
                              } else {
                                navigateTo('beranda');
                              }
                            }}
                            style={{
                              display: 'inline-block',
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              padding: '10px 20px',
                              borderRadius: '10px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              border: 'none',
                              boxShadow: '0 4px 10px rgba(220, 38, 38, 0.25)'
                            }}
                          >
                            Pesan Ulang Trip Ini
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ACTIVE PENDING PAYMENT BANNER */
                      <div style={{ backgroundColor: '#f0f9ff', border: '1.5px solid #0284c7', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#0369a1' }}>Informasi Pembayaran Xendit:</strong>
                          <CountdownTimer createdAt={booking.createdAt} windowSeconds={paymentWindowSeconds} onExpire={() => { handleExpireBooking(booking.id); fetchHistory(); }} />
                        </div>
                        
                        <span style={{ fontSize: '13px', color: '#0f172a' }}>
                          Silakan lakukan pembayaran sebesar <strong style={{ color: '#0284c7', fontSize: '15px' }}>{formatIDR(booking.totalPrice)}</strong> via Payment Gateway Xendit.
                        </span>
                        
                        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                          <div style={{ fontSize: '13px', color: '#1e293b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div><span style={{ color: '#64748b' }}>Tipe Trip:</span> <strong>{booking.packageDetails?.tripType || 'Open Trip'}</strong></div>
                            {booking.packageDetails?.category && (
                              <div><span style={{ color: '#64748b' }}>Kategori:</span> <strong>{booking.packageDetails.category}</strong></div>
                            )}
                            <div><span style={{ color: '#64748b' }}>Tujuan Trip:</span> <strong>{booking.packageDetails?.destination || tripName}</strong></div>
                            <div><span style={{ color: '#64748b' }}>Nama Pemesan:</span> <strong>{booking.customerName || (customerProfile as any)?.name || 'Pelanggan TripKita'}</strong></div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setCancelConfirmBooking(booking)}
                              style={{
                                padding: '10px 18px',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Batalkan
                            </button>

                            <button
                              onClick={() => {
                                const pUrl = booking.paymentUrl || (booking as any).payment_url;
                                const trustedURL = getTrustedPaymentURL(pUrl);
                                if (trustedURL) {
                                  window.location.href = trustedURL;
                                } else {
                                  alert('Tautan pembayaran Xendit tidak ditemukan. Silakan lakukan pemesanan ulang.');
                                }
                              }}
                              style={{
                                padding: '10px 18px',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                              }}
                            >
                              Selesaikan Pembayaran
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {(booking.status === 'DIBATALKAN' || booking.status === 'CANCELLED') && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <strong style={{ fontSize: '13.5px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <XCircle size={16} color="#dc2626" /> Pesanan Dibatalkan oleh Pelanggan
                        </strong>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '4px 12px', borderRadius: '20px' }}>DIBATALKAN</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#7f1d1d', margin: 0, lineHeight: '1.5' }}>
                        Pesanan ini telah Anda batalkan. Jika Anda ingin mengikuti trip ini kembali, Anda dapat melakukan pemesanan ulang.
                      </p>
                    </div>
                  )}



                  <div style={{ borderTop: '1px dotted #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>TOTAL HARGA</span>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#00a896' }}>{formatIDR(booking.totalPrice)}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {(booking.status === 'PAID' || booking.status === 'CONFIRMED' || booking.status === 'Dikonfirmasi' || booking.status === 'COMPLETED') && (
                        <>
                          {getWhatsAppURL(booking.providerWhatsApp) && (
                            <a
                              href={getWhatsAppURL(booking.providerWhatsApp) || undefined}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#25d366',
                                color: '#ffffff',
                                textDecoration: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '13px'
                              }}
                            >
                              <MessageSquare size={14} /> Hubungi Provider
                            </a>
                          )}
                          
                          {(() => {
                            const isAlreadyReviewed = reviewedMap[booking.id];
                            if (isAlreadyReviewed) {
                              return (
                                <button
                                  disabled
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    color: '#64748b',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    cursor: 'not-allowed'
                                  }}
                                >
                                  ✓ Sudah Diulas
                                </button>
                              );
                            }

                            const isFinished = booking.status === 'COMPLETED';

                            return (
                              <button
                                onClick={() => {
                                  if (!isFinished) {
                                    setModalNotice({
                                      title: 'Ulasan Belum Aktif',
                                      message: 'Fitur ulasan dan penilaian bintang akan otomatis aktif setelah jadwal perjalanan (trip) Anda selesai dilaksanakan.'
                                    });
                                    return;
                                  }
                                  setSelectedReviewBooking(booking);
                                  setRatingStars(5);
                                  setReviewText('');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  backgroundColor: isFinished ? '#ffffff' : '#f8fafc',
                                  border: isFinished ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                                  color: isFinished ? '#d97706' : '#94a3b8',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  fontWeight: '700',
                                  fontSize: '13px',
                                  cursor: isFinished ? 'pointer' : 'not-allowed',
                                  opacity: isFinished ? 1 : 0.75
                                }}
                                title={isFinished ? 'Klik untuk memberikan ulasan' : 'Ulasan dapat diberikan setelah waktu trip berakhir'}
                              >
                                ⭐ Beri Ulasan {isFinished ? '(Aktif)' : '(Terkunci)'}
                              </button>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Review & Rating Modal */}
        {selectedReviewBooking && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Beri Ulasan & Rating</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
                Bagikan pengalaman seru Anda mengikuti trip <strong>{selectedReviewBooking.packageDetails?.name || selectedReviewBooking.packageName}</strong>!
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>Pilih Bintang Rating:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingStars(star)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <Star size={28} fill={star <= ratingStars ? '#f59e0b' : 'none'} color={star <= ratingStars ? '#f59e0b' : '#cbd5e1'} />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>Tulis Ulasan Anda:</label>
                <textarea
                  rows={4}
                  placeholder="Ceritakan keseruan trip, pelayanan tour guide, dan fasilitasnya..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReviewBooking(null)}
                  style={{ padding: '10px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSendReview}
                  style={{ padding: '10px 20px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                >
                  Kirim Ulasan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM NOTICE MODAL */}
        {modalNotice && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backdropFilter: 'blur(4px)'
            }}
          >
            <div 
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                maxWidth: '440px',
                width: '100%',
                padding: '32px 28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                textAlign: 'center'
              }}
            >
              <div style={{ backgroundColor: modalNotice.isError ? '#fee2e2' : '#dcfce7', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
                {modalNotice.isError ? <AlertCircle size={32} color="#ef4444" /> : <CheckCircle2 size={32} color="#16a34a" />}
              </div>

              <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>
                {modalNotice.title}
              </h3>

              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                {modalNotice.message}
              </p>

              <button
                onClick={() => setModalNotice(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: modalNotice.isError ? '#ef4444' : '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                OK, Mengerti
              </button>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL BEFORE CANCELLING BOOKING */}
        {cancelConfirmBooking && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backdropFilter: 'blur(4px)'
            }}
          >
            <div 
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                maxWidth: '440px',
                width: '100%',
                padding: '32px 28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                textAlign: 'center'
              }}
            >
              <div style={{ backgroundColor: '#fee2e2', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
                <XCircle size={32} color="#dc2626" />
              </div>

              <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>
                Konfirmasi Pembatalan Pesanan
              </h3>

              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                Apakah Anda yakin ingin membatalkan pesanan <strong style={{ color: '#0f172a' }}>{cancelConfirmBooking.bookingCode}</strong>? Status pesanan akan diubah menjadi <strong>Dibatalkan</strong>.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => setCancelConfirmBooking(null)}
                  disabled={cancellingLoading}
                  style={{
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Tidak (Kembali)
                </button>

                <button
                  onClick={() => handleConfirmCancel(cancelConfirmBooking)}
                  disabled={cancellingLoading}
                  style={{
                    padding: '12px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: cancellingLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  {cancellingLoading ? 'Membatalkan...' : 'Ya, Batalkan'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
