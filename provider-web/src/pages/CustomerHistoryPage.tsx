import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { fetchCheckoutConfig } from '../utils/checkoutConfig';
import { useActionLock } from '../utils/useActionLock';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, MessageSquare, Star, LoaderCircle } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';
import { RescheduleOfferCard } from '../components/RescheduleOfferCard';
import { BookingPickupSummary } from '../components/TripPickup';
import { bookingAddOns } from '../utils/pricing';
import { useI18n } from '../i18n';

interface BookingItem {
  pickupMode?: string;
  pickupInstructions?: string;
  participants?: { name: string; pickupPoint?: string }[];
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
  unitCount?: number;
  unitName?: string;
  addOns?: unknown;
  paymentMethod: string;
  status: string;
  createdAt: string;
  paymentProofSubmittedAt?: string;
  paymentReviewDeadline?: string;
  paymentReviewNotes?: string;
  providerWhatsApp?: string;
  providerName?: string;
  // Terisi saat penyelenggara menawarkan tanggal pengganti (perubahan jadwal
  // oleh mitra, keadaan kahar, atau kuota/cuaca H-3) untuk tipe trip apa pun.
  rescheduleDate?: string | null;
  rescheduleResponseDeadline?: string | null;
  tripDepartureId?: number | null;
  // Sebab keberangkatan tidak dapat dijalankan: kuota minimal tidak terpenuhi,
  // atau keadaan kahar beserta penjelasan penyelenggara.
  cancellationReason?: string;
}

// Unit (mis. 2 Jeep) dan fasilitas tambahan yang tersimpan pada booking.
const BookingExtras: React.FC<{ booking: BookingItem; formatIDR: (n: number) => string }> = ({ booking, formatIDR }) => {
  const { t } = useI18n();
  const addOns = bookingAddOns(booking);
  if (!booking.unitCount && addOns.length === 0) return null;
  return (
    <div style={{ marginTop: '6px', fontSize: '12.5px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {!!booking.unitCount && <span>{t('Unit', 'Units')}: {booking.unitCount} {booking.unitName || t('Unit', 'unit(s)')}</span>}
      {addOns.map((a) => (
        <span key={a.id || a.name}>+ {a.name}{a.perPerson ? t(` (×${booking.guests} orang)`, ` (×${booking.guests} pax)`) : ''} · {formatIDR(a.subtotal)}</span>
      ))}
    </div>
  );
};

const getWhatsAppURL = (phone?: string): string | null => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  if (!digits.startsWith('62') || digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
};

// Status pembatalan yang menampilkan keterangan (alasan penyelenggara atau
// ketentuan refund) kepada pelanggan.
const CANCELLED_WITH_REASON = ['REFUND_REQUIRED', 'REFUNDED', 'CANCELLED_BY_PROVIDER', 'CANCELLED_BY_CUSTOMER'];

// Batas waktu pembayaran invoice. Nilai sebenarnya diambil dari /public/checkout-config;
// konstanta ini hanya dipakai selama konfigurasi belum termuat.
const DEFAULT_PAYMENT_WINDOW_SECONDS = 24 * 60 * 60;

const isOnlinePayment = (booking: { paymentMethod?: string }) => String(booking.paymentMethod || '').startsWith('Midtrans');

const CountdownTimer: React.FC<{ createdAt?: string; windowSeconds: number; deadlineAt?: string; label?: string; onExpire?: () => void }> = ({ createdAt, windowSeconds, deadlineAt, label, onExpire }) => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const serverDeadlineMs = deadlineAt ? new Date(deadlineAt).getTime() : NaN;
    const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
    if (!Number.isFinite(serverDeadlineMs) && (!Number.isFinite(createdMs) || createdMs <= 0)) return;

    // Batas dari server diutamakan karena diperpanjang setelah bukti ditolak.
    const expireMs = Number.isFinite(serverDeadlineMs) ? serverDeadlineMs : createdMs + windowSeconds * 1000;

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
      <span>{label ?? t('Batas Transfer', 'Transfer deadline')}: {hours}:{minutes}:{seconds}</span>
    </div>
  );
};

export const CustomerHistoryPage: React.FC = () => {
  const { navigateTo, customerProfile, setSelectedPackageForDetail, setSelectedBookingForInvoice } = useNavigation();
  const { t, term, locale } = useI18n();

  // Batas waktu pembayaran dari backend (detik)
  const [paymentWindowSeconds, setPaymentWindowSeconds] = useState<number>(DEFAULT_PAYMENT_WINDOW_SECONDS);
  const [adminReviewWindowSeconds, setAdminReviewWindowSeconds] = useState<number>(DEFAULT_PAYMENT_WINDOW_SECONDS);

  useEffect(() => {
    let cancelled = false;
    fetchCheckoutConfig()
      .then((cfg) => {
        if (!cancelled) {
          setPaymentWindowSeconds(cfg.paymentWindowSeconds);
          setAdminReviewWindowSeconds(cfg.adminReviewWindowSeconds);
        }
      })
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

  // Satu kunci untuk semua aksi yang mengubah pesanan (batal, ulasan, jawaban
  // jadwal ulang). Kunci berbasis ref menahan klik ganda di tick yang sama,
  // yang masih lolos bila hanya mengandalkan state loading.
  const { pending, isBusy, run } = useActionLock();
  const cancellingLoading = pending === 'cancel-booking';

  const canCancelBooking = () => !!customerProfile && customerProfile.role === 'CUSTOMER';
  const guestCancelMessage = t('Pembatalan booking tamu harus dilakukan melalui layanan pelanggan untuk verifikasi identitas.', 'Guest bookings can only be cancelled through customer service so we can verify your identity.');

  // Hak batal dicek sebelum modal dibuka; sebelumnya tamu baru ditolak setelah
  // menekan "Ya, Batalkan" di modal konfirmasi.
  const handleOpenCancel = (booking: any) => {
    if (isBusy) return;
    if (!canCancelBooking()) {
      alert(guestCancelMessage);
      return;
    }
    setCancelConfirmBooking(booking);
  };

  const handleConfirmCancel = async (bookingToCancel: any) => {
	if (isBusy || !bookingToCancel) return;
	if (!canCancelBooking()) {
	  alert(guestCancelMessage);
	  setCancelConfirmBooking(null);
	  return;
	}
	await run('cancel-booking', async () => {
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
      alert(t('Gagal membatalkan pesanan: ', 'Could not cancel the booking: ') + (err.message || t('Terjadi kesalahan sistem', 'A system error occurred')));
    }
	});
  };

	const handleExpireBooking = (_bId: string | number) => {
	  // Expiry is decided by the backend clock; the browser only refreshes the view.
	};

  useEffect(() => {
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
      setTrackingError(t('Silakan masukkan Kode Booking Anda terlebih dahulu.', 'Please enter your booking code first.'));
      return;
    }

    setTrackingLoading(true);
    try {
      const data = await request(`/public/bookings/status/${searchCode.trim()}`);
      setTrackedBooking(data);
    } catch (err: any) {
      console.error(err);
      if (err?.status === 404) {
        setTrackingError(t('Kode booking tidak ditemukan. Masukkan kode secara lengkap, contoh: TK-20260928-AB12CD34.', 'Booking code not found. Enter the full code, for example: TK-20260928-AB12CD34.'));
      } else if (err?.status === 401 || err?.status === 403) {
        setTrackingError(t('Pesanan ini terhubung ke akun TemenTrip. Silakan masuk dengan akun pemesan untuk melihatnya.', 'This booking is linked to a TemenTrip account. Please sign in with the account used to book it.'));
      } else {
        setTrackingError(err?.message || t('Status booking belum dapat dimuat. Coba lagi beberapa saat.', 'Booking status could not be loaded. Please try again shortly.'));
      }
    } finally {
      setTrackingLoading(false);
    }
  };

  const isBookingExpired = (createdAt?: string, paymentDeadline?: string) => {
    if (paymentDeadline) {
      const deadlineMs = new Date(paymentDeadline).getTime();
      if (Number.isFinite(deadlineMs)) return Date.now() > deadlineMs;
    }
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return false;
    const expireTime = createdTime + paymentWindowSeconds * 1000;
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

  const sendingReview = pending === 'send-review';

  const handleSendReview = async () => {
    // Tanpa kunci, klik ganda mengirim dua POST ulasan untuk booking yang sama.
    if (isBusy || !selectedReviewBooking) return;
    await run('send-review', async () => {
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
        title: t('Ulasan Berhasil Terkirim!', 'Review Submitted'),
        message: t('Terima kasih! Ulasan dan penilaian bintang Anda telah berhasil dikirim dan tersimpan di database.', 'Thank you. Your review and star rating have been submitted and saved.')
      });
    } catch (err: any) {
      console.error(err);
      setModalNotice({
        title: t('Gagal Mengirim Ulasan', 'Review Not Submitted'),
        message: err.message || t('Gagal menyimpan ulasan ke database.', 'Your review could not be saved.'),
        isError: true
      });
    }
    });
  };

  // Jawaban pelanggan atas tanggal pengganti dari penyelenggara. Konfirmasi
  // dilakukan di dalam RescheduleOfferCard sebelum fungsi ini dipanggil.
  const handleRescheduleResponse = async (bookingId: number, accept: boolean) => {
    if (isBusy) return;

    await run(`reschedule-${bookingId}-${accept ? 'accept' : 'reject'}`, async () => {
    try {
      const result = await request(`/customer/bookings/${bookingId}/reschedule-response`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
      });
      if (result?.booking && trackedBooking && trackedBooking.id === bookingId) {
        setTrackedBooking({ ...trackedBooking, ...result.booking });
      }
      setModalNotice({
        title: accept ? t('Jadwal Pengganti Diterima', 'New Date Accepted') : t('Jadwal Pengganti Ditolak', 'New Date Declined'),
        message: result?.message || t('Jawaban Anda telah tersimpan.', 'Your reply has been saved.'),
        // Menolak jadwal pengganti adalah pilihan yang sah (diteruskan ke
        // refund), bukan kegagalan, jadi ditampilkan sebagai konfirmasi biasa.
        isError: false,
      });
      await fetchHistory();
    } catch (err: any) {
      setModalNotice({
        title: t('Jawaban Gagal Dikirim', 'Reply Not Sent'),
        message: err?.message || t('Jawaban Anda tidak dapat disimpan. Silakan coba lagi.', 'Your reply could not be saved. Please try again.'),
        isError: true,
      });
    }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          label: t('Trip Selesai (Completed)', 'Trip Completed'),
          color: '#10b981',
          bgColor: '#dcfce7',
          icon: <CheckCircle2 size={14} color="#10b981" />
        };
      case 'PAID':
      case 'CONFIRMED':
      case 'Dikonfirmasi':
      case 'Selesai':
        return {
          label: t('Lunas & Aktif', 'Paid & Active'),
          color: '#10b981',
          bgColor: '#dcfce7',
          icon: <CheckCircle2 size={14} color="#10b981" />
        };
      case 'EXPIRED':
        return {
          label: t('Kadaluwarsa (Batas Waktu Habis)', 'Expired (Deadline Passed)'),
          color: '#ef4444',
          bgColor: '#fee2e2',
          icon: <XCircle size={14} color="#ef4444" />
        };
	  case 'FAILED':
		return {
		  label: t('Pembayaran Gagal', 'Payment Failed'),
		  color: '#ef4444',
		  bgColor: '#fee2e2',
		  icon: <XCircle size={14} color="#ef4444" />
		};
      case 'DIBATALKAN':
      case 'CANCELLED':
	  case 'CANCELLED_BY_CUSTOMER':
	  case 'CANCELLED_BY_PROVIDER':
        return {
          label: t('Pesanan Dibatalkan', 'Booking Cancelled'),
          color: '#ef4444',
          bgColor: '#fee2e2',
          icon: <XCircle size={14} color="#ef4444" />
        };
      case 'PAYMENT_REVIEW':
        return {
          label: t('Menunggu Konfirmasi Admin', 'Awaiting Admin Review'),
          color: '#2563eb',
          bgColor: '#eff6ff',
          icon: <Clock size={14} color="#2563eb" />
        };
      case 'PENDING_PAYMENT':
      case 'Menunggu':
        return {
          label: t('Menunggu Pembayaran', 'Awaiting Payment'),
          color: '#f59e0b',
          bgColor: '#fffbeb',
          icon: <Clock size={14} color="#f59e0b" />
        };
      case 'RESCHEDULE_OFFERED':
        return {
          label: t('Menunggu Jawaban Anda (Jadwal Pengganti)', 'Your Reply Needed (New Date)'),
          color: '#d97706',
          bgColor: '#fffbeb',
          icon: <AlertCircle size={14} color="#d97706" />
        };
      case 'REFUND_REQUIRED':
        return {
          label: t('Proses Refund', 'Refund in Progress'),
          color: '#3b82f6',
          bgColor: '#eff6ff',
          icon: <AlertCircle size={14} color="#3b82f6" />
        };
	  case 'REFUNDED':
		return {
		  label: t('Refund Selesai', 'Refunded'),
		  color: '#10b981',
		  bgColor: '#dcfce7',
		  icon: <CheckCircle2 size={14} color="#10b981" />
		};
      default:
        return {
          label: t('Dibatalkan', 'Cancelled'),
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
            {t('Lacak Tiket Pesanan Anda', 'Track Your Booking')}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
            {t('Ingin mencari pesanan Anda yang hilang? Masukkan Kode Booking (Contoh: TK-20260928-XXXXXXXX) di bawah ini.', "Can't find your booking? Enter your booking code below (e.g. TK-20260928-XXXXXXXX).")}
          </p>

          <form onSubmit={handleTrackTicket} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder={t('Masukkan Kode Booking Anda...', 'Enter your booking code...')}
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
              {trackingLoading ? t('Melacak...', 'Searching...') : t('Cari Tiket', 'Find Booking')}
            </button>
          </form>

          {trackingError && (
            <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', margin: '12px 0 0 0' }}>{trackingError}</p>
          )}

          {/* Tracked Ticket Result Box */}
          {trackedBooking && (
            <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>{t('Hasil Pencarian Tiket', 'Search Result')}</h3>
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
                    <span>{t('Tanggal', 'Date')}: {new Date(trackedBooking.tripDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span>{t(`Peserta: ${trackedBooking.guests} orang`, `Participants: ${trackedBooking.guests}`)}</span>
                  </div>
                  <BookingExtras booking={trackedBooking} formatIDR={formatIDR} />
                </div>

                {trackedBooking.status === 'RESCHEDULE_OFFERED' && (
                  <RescheduleOfferCard
                    booking={trackedBooking}
                    pending={pending}
                    busy={isBusy}
                    onRespond={trackedBooking.id ? (accept) => handleRescheduleResponse(trackedBooking.id, accept) : undefined}
                  />
                )}
                {CANCELLED_WITH_REASON.includes(trackedBooking.status) && trackedBooking.cancellationReason && (
                  <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.55, color: '#7f1d1d', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px' }}>
                    <strong>{t('Keterangan pembatalan:', 'Cancellation note:')}</strong> {trackedBooking.cancellationReason}
                  </p>
                )}

                <div style={{ borderTop: '1px dotted #cbd5e1', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>{t('TOTAL HARGA', 'TOTAL PRICE')}</span>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#00a896' }}>{formatIDR(trackedBooking.totalPrice)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {trackedBooking.status === 'PENDING_PAYMENT' && (
                      <button
                        onClick={() => {
                          setSelectedBookingForInvoice(trackedBooking);
                          sessionStorage.setItem('tripkita_recent_guest_booking', JSON.stringify(trackedBooking));
                          navigateTo('halaman-pembayaran');
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
                        {t('Selesaikan Pembayaran', 'Complete Payment')}
                      </button>
                    )}
                    {trackedBooking.status === 'PAYMENT_REVIEW' && trackedBooking.paymentProofSubmittedAt && (
                      <CountdownTimer createdAt={trackedBooking.paymentProofSubmittedAt} windowSeconds={adminReviewWindowSeconds} label={t('Batas Konfirmasi Admin', 'Admin review deadline')} />
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
                        <MessageSquare size={14} /> {t('Hubungi Provider', 'Contact Provider')}
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
          {customerProfile && customerProfile.role === 'CUSTOMER' ? t('Riwayat Pemesanan Akun Anda', 'Your Booking History') : t('Detail Status Pemesanan Tiket', 'Booking Status Details')}
        </h1>

        {loading ? (
          <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span className="sr-only">{t('Memuat riwayat pesanan', 'Loading booking history')}</span>
            {/* Kerangka kartu pesanan: judul + status, detail jadwal, lalu baris harga */}
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                aria-hidden="true"
                style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <Skeleton width="55%" height={18} />
                  <Skeleton width={96} height={22} radius={999} />
                </div>
                <Skeleton width="38%" />
                <Skeleton width="62%" />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <Skeleton width={140} height={18} />
                  <Skeleton width={120} height={34} radius={10} />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            <Calendar size={44} color="#007bff" style={{ marginBottom: '14px' }} />
            <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '800', marginBottom: '6px' }}>
              {customerProfile ? t('Belum Ada Pemesanan Terdaftar', 'No Bookings Yet') : t('Melacak Tiket Pesanan (Mode Tamu)', 'Track a Booking (Guest Mode)')}
            </h3>
            <p style={{ fontSize: '13.5px', maxWidth: '500px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
              {customerProfile
                ? t('Anda belum memiliki riwayat transaksi di akun ini.', "You don't have any bookings on this account yet.")
                : t('Anda saat ini mengakses tanpa akun. Masukkan Kode Booking yang telah Anda salin pada kolom pencarian di atas untuk melacak pesanan Anda.', "You're not signed in. Enter the booking code you saved in the search box above to track your booking.")}
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {!customerProfile && (
                <button 
                  onClick={() => navigateTo('masuk' as any)}
                  style={{ padding: '11px 22px', backgroundColor: '#007bff', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,123,255,0.25)' }}
                >
                  🔑 {t('Masuk ke Akun Saya', 'Sign In to My Account')}
                </button>
              )}
              <button 
                onClick={() => navigateTo('beranda')}
                style={{ padding: '11px 22px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer' }}
              >
                {t('Cari Paket Wisata', 'Find Trips')}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {bookings.map((booking, idx) => {
              const isExpired = booking.status === 'EXPIRED' || (booking.status === 'PENDING_PAYMENT' && isBookingExpired(booking.createdAt, (booking as any).paymentDeadline));
              const badge = getStatusBadge(isExpired ? 'EXPIRED' : booking.status);
              const tripName = booking.packageDetails?.name || booking.packageName || t('Paket Wisata Nusantara', 'Indonesia Trip Package');
              const formattedTripDate = new Date(booking.tripDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
              
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
                          ? new Date(booking.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
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
                      <span>{t('Tanggal', 'Date')}: {formattedTripDate}</span>
                      <span>{t(`Peserta: ${booking.guests} orang`, `Participants: ${booking.guests}`)}</span>
                    </div>
                    <BookingExtras booking={booking} formatIDR={formatIDR} />
                  </div>

                  {booking.pickupMode === 'FLEXIBLE' && <details style={{ margin: '12px 0' }}>
                    <summary style={{ cursor: 'pointer', fontSize: 13, color: '#0369a1', fontWeight: 600 }}>{t('Lihat rencana penjemputan', 'View pickup plan')}</summary>
                    <BookingPickupSummary mode={booking.pickupMode} instructions={booking.pickupInstructions} participants={booking.participants} />
                  </details>}
                  {booking.status === 'RESCHEDULE_OFFERED' && (
                    <RescheduleOfferCard
                      booking={booking}
                      pending={pending}
                      busy={isBusy}
                      onRespond={(accept) => handleRescheduleResponse(booking.id, accept)}
                    />
                  )}

                  {CANCELLED_WITH_REASON.includes(booking.status) && booking.cancellationReason && (
                    <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.55, color: '#7f1d1d', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px' }}>
                      <strong>{t('Keterangan pembatalan:', 'Cancellation note:')}</strong> {booking.cancellationReason}
                    </p>
                  )}

                  {booking.status === 'PAYMENT_REVIEW' && (
                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <strong style={{ color: '#1d4ed8' }}>{t('Bukti transfer sedang diperiksa admin', 'Admin is reviewing your transfer proof')}</strong>
                        <div style={{ color: '#475569', fontSize: '13px', marginTop: '4px' }}>{t('Booking belum diteruskan ke provider sampai pembayaran disetujui.', "The booking won't be sent to the provider until the payment is approved.")}</div>
                      </div>
                      {booking.paymentProofSubmittedAt && <CountdownTimer createdAt={booking.paymentProofSubmittedAt} windowSeconds={adminReviewWindowSeconds} label={t('Batas Konfirmasi Admin', 'Admin review deadline')} />}
                    </div>
                  )}

                  {booking.status === 'PENDING_PAYMENT' && (
                    isExpired ? (
                      /* EXPIRED CARD BANNER */
                      <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <XCircle size={16} color="#dc2626" /> {t('Batas Waktu Pembayaran Habis (Kadaluwarsa)', 'Payment Deadline Passed (Expired)')}
                          </strong>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '4px 12px', borderRadius: '20px' }}>{t('KADALUWARSA', 'EXPIRED')}</span>
                        </div>

                        <p style={{ fontSize: '13px', color: '#7f1d1d', margin: 0, lineHeight: '1.5' }}>
                          {t(
                            `Batas waktu pembayaran ${Math.round(paymentWindowSeconds / 3600)} jam untuk transaksi ini telah kadaluwarsa. Silakan lakukan pemesanan ulang jika Anda ingin mengikuti trip ini.`,
                            `The ${Math.round(paymentWindowSeconds / 3600)}-hour payment window for this booking has expired. Please book again if you still want to join this trip.`
                          )}
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
                            {t('Pesan Ulang Trip Ini', 'Book This Trip Again')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ACTIVE PENDING PAYMENT BANNER */
                      <div style={{ backgroundColor: '#f0f9ff', border: '1.5px solid #0284c7', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#0369a1' }}>{t('Menunggu Pembayaran', 'Awaiting Payment')}</strong>
                          <CountdownTimer createdAt={booking.createdAt} deadlineAt={(booking as any).paymentDeadline} windowSeconds={paymentWindowSeconds} label={isOnlinePayment(booking) ? t('Batas Pembayaran', 'Payment deadline') : undefined} onExpire={() => { handleExpireBooking(booking.id); fetchHistory(); }} />
                        </div>

                        {booking.paymentReviewNotes && (
                          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                            <strong>{t('Bukti transfer sebelumnya ditolak admin:', 'Your previous transfer proof was rejected by admin:')}</strong> {booking.paymentReviewNotes}. {t('Silakan unggah ulang bukti yang benar.', 'Please upload the correct proof again.')}
                          </div>
                        )}

                        <span style={{ fontSize: '13px', color: '#0f172a' }}>
                          {isOnlinePayment(booking) ? (
                            <>{t('Bayar online sebesar', 'Pay')} <strong style={{ color: '#0284c7', fontSize: '15px' }}>{formatIDR(booking.totalPrice)}</strong> {t('lewat virtual account, QRIS, atau e-wallet sebelum countdown berakhir. Pesanan terkonfirmasi otomatis.', 'online via virtual account, QRIS, or e-wallet before the countdown ends. Your booking is confirmed automatically.')}</>
                          ) : (
                            <>{t('Silakan transfer sebesar', 'Please transfer')} <strong style={{ color: '#0284c7', fontSize: '15px' }}>{formatIDR(booking.totalPrice)}</strong> {t('lalu unggah bukti pembayaran sebelum countdown berakhir.', 'and upload your payment proof before the countdown ends.')}</>
                          )}
                        </span>
                        
                        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                          <div style={{ fontSize: '13px', color: '#1e293b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div><span style={{ color: '#64748b' }}>{t('Tipe Trip:', 'Trip Type:')}</span> <strong>{booking.packageDetails?.tripType || 'Open Trip'}</strong></div>
                            {booking.packageDetails?.category && (
                              <div><span style={{ color: '#64748b' }}>{t('Kategori:', 'Category:')}</span> <strong>{term(booking.packageDetails.category)}</strong></div>
                            )}
                            <div><span style={{ color: '#64748b' }}>{t('Tujuan Trip:', 'Destination:')}</span> <strong>{booking.packageDetails?.destination || tripName}</strong></div>
                            <div><span style={{ color: '#64748b' }}>{t('Nama Pemesan:', 'Booked By:')}</span> <strong>{booking.customerName || (customerProfile as any)?.name || t('Pelanggan', 'Traveler')}</strong></div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleOpenCancel(booking)}
                              disabled={isBusy}
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
                              {t('Batalkan', 'Cancel')}
                            </button>

                            <button
                              onClick={() => {
                                setSelectedBookingForInvoice(booking);
                                sessionStorage.setItem('tripkita_recent_guest_booking', JSON.stringify(booking));
                                navigateTo('halaman-pembayaran');
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
                              {t('Selesaikan Pembayaran', 'Complete Payment')}
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
                          <XCircle size={16} color="#dc2626" /> {t('Pesanan Dibatalkan oleh Pelanggan', 'Booking Cancelled by Customer')}
                        </strong>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '4px 12px', borderRadius: '20px' }}>{t('DIBATALKAN', 'CANCELLED')}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#7f1d1d', margin: 0, lineHeight: '1.5' }}>
                        {t('Pesanan ini telah Anda batalkan. Jika Anda ingin mengikuti trip ini kembali, Anda dapat melakukan pemesanan ulang.', "You cancelled this booking. If you'd like to join this trip after all, you can book it again.")}
                      </p>
                    </div>
                  )}



                  <div style={{ borderTop: '1px dotted #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>{t('TOTAL HARGA', 'TOTAL PRICE')}</span>
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
                              <MessageSquare size={14} /> {t('Hubungi Provider', 'Contact Provider')}
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
                                  ✓ {t('Sudah Diulas', 'Reviewed')}
                                </button>
                              );
                            }

                            const isFinished = booking.status === 'COMPLETED';

                            return (
                              <button
                                onClick={() => {
                                  if (!isFinished) {
                                    setModalNotice({
                                      title: t('Ulasan Belum Aktif', 'Reviews Not Open Yet'),
                                      message: t('Fitur ulasan dan penilaian bintang akan otomatis aktif setelah jadwal perjalanan (trip) Anda selesai dilaksanakan.', 'Reviews and star ratings open automatically once your trip has finished.')
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
                                title={isFinished ? t('Klik untuk memberikan ulasan', 'Click to leave a review') : t('Ulasan dapat diberikan setelah waktu trip berakhir', 'You can leave a review after the trip ends')}
                              >
                                ⭐ {t('Beri Ulasan', 'Review')} {isFinished ? t('(Aktif)', '(Open)') : t('(Terkunci)', '(Locked)')}
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
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>{t('Beri Ulasan & Rating', 'Review & Rating')}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
                {t('Bagikan pengalaman seru Anda mengikuti trip', 'Share your experience on the trip')} <strong>{selectedReviewBooking.packageDetails?.name || selectedReviewBooking.packageName}</strong>!
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>{t('Pilih Bintang Rating:', 'Choose a Star Rating:')}</label>
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>{t('Tulis Ulasan Anda:', 'Write Your Review:')}</label>
                <textarea
                  rows={4}
                  placeholder={t('Ceritakan keseruan trip, pelayanan tour guide, dan fasilitasnya...', 'Tell us about the trip, the tour guide, and the facilities...')}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReviewBooking(null)}
                  disabled={sendingReview}
                  style={{ padding: '10px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                >
                  {t('Batal', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSendReview}
                  disabled={isBusy}
                  aria-busy={sendingReview}
                  style={{ padding: '10px 20px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: sendingReview ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {sendingReview ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> {t('Mengirim...', 'Sending...')}</> : t('Kirim Ulasan', 'Submit Review')}
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
                {t('OK, Mengerti', 'OK, Got It')}
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
                {t('Konfirmasi Pembatalan Pesanan', 'Confirm Cancellation')}
              </h3>

              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                {t('Apakah Anda yakin ingin membatalkan pesanan', 'Are you sure you want to cancel booking')} <strong style={{ color: '#0f172a' }}>{cancelConfirmBooking.bookingCode}</strong>? {t('Status pesanan akan diubah menjadi', 'Its status will change to')} <strong>{t('Dibatalkan', 'Cancelled')}</strong>.
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
                  {t('Tidak (Kembali)', 'No, Go Back')}
                </button>

                <button
                  onClick={() => handleConfirmCancel(cancelConfirmBooking)}
                  disabled={isBusy}
                  aria-busy={cancellingLoading}
                  style={{
                    padding: '12px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: cancellingLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {cancellingLoading ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> {t('Membatalkan...', 'Cancelling...')}</> : t('Ya, Batalkan', 'Yes, Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
