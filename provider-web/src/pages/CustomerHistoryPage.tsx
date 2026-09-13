import React, { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Star } from 'lucide-react';

interface BookingItem {
  id: number;
  bookingCode: string;
  customerName: string;
  customerInitial: string;
  packageDetails?: {
    name: string;
    category: string;
    destination: string;
    price: number;
  };
  packageName?: string;
  tripDate: string;
  guests: number;
  totalPrice: number;
  paymentMethod: string;
  status: string;
  paymentUrl: string;
  createdAt: string;
}



export const CustomerHistoryPage: React.FC = () => {
  const { navigateTo, customerProfile, setSelectedBookingForInvoice } = useNavigation();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Lacak Tiket State
  const [searchCode, setSearchCode] = useState(() => new URLSearchParams(window.location.search).get('code') || new URLSearchParams(window.location.hash.split('?')[1] || '').get('code') || '');
  const [trackedBooking, setTrackedBooking] = useState<any | null>(null);
  const [trackingError, setTrackingError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Review & Rating Modal State
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<any | null>(null);
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');

  // Custom Notice Modal state
  const [modalNotice, setModalNotice] = useState<{ title: string; message: string; isError?: boolean } | null>(null);

  const [historyError, setHistoryError] = useState('');
  const [sendingReview, setSendingReview] = useState(false);
  useEffect(() => {
    // Redirect parameters identify the booking only; the API owns its payment status.
    const code = new URLSearchParams(window.location.search).get('code') || new URLSearchParams(window.location.hash.split('?')[1] || '').get('code');
    if (code) {
      request('/public/bookings/status/' + encodeURIComponent(code))
        .then(data => setTrackedBooking(data))
        .catch(err => setTrackingError(err.message || 'Booking gagal dimuat.'))
        .finally(() => setTrackingLoading(false));
    }
    void fetchHistory();
  }, [customerProfile]);

  const fetchHistory = async () => {
    setLoading(true);
    setHistoryError('');
    try {
      if (customerProfile && customerProfile.role === 'CUSTOMER') {
        // Authenticated customer: fetch directly from DB
        const data = await request('/customer/bookings');
        setBookings(data || []);
      } else {
        // Guest customer: keep search empty until user manually enters booking code
        setBookings([]);

      }
    } catch (err) {
      setBookings([]);
      setHistoryError('Riwayat booking gagal dimuat. Silakan coba lagi.');
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
      const data = await request(`/public/bookings/status/${encodeURIComponent(searchCode.trim())}`);
      setTrackedBooking(data);
    } catch (err: any) {
      console.error(err);
      setTrackingError(err.message || 'Booking gagal dilacak. Silakan coba lagi.');
    } finally {
      setTrackingLoading(false);
    }
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
    if (!selectedReviewBooking || sendingReview) return;
    setSendingReview(true);
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
        message: 'Terima kasih! Ulasan dan penilaian Anda berhasil dikirim.'
      });
    } catch (err: any) {
      console.error(err);
      setModalNotice({
        title: 'Gagal Mengirim Ulasan',
        message: err.message || 'Gagal menyimpan ulasan.',
        isError: true
      });
    } finally { setSendingReview(false); }
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
      case 'DIBATALKAN':
        return {
          label: 'Kadaluwarsa (Dibatalkan)',
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
      case 'WAITING_CONFIRMATION':
        return {
          label: 'Menunggu Konfirmasi Pembayaran',
          color: '#10b981',
          bgColor: '#ecfdf5',
          icon: <CheckCircle2 size={14} color="#10b981" />
        };
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_PROVIDER':
        return { label: 'Dibatalkan', color: '#ef4444', bgColor: '#fee2e2', icon: <XCircle size={14} /> };
      case 'REFUNDED':
        return { label: 'Dana Dikembalikan', color: '#0284c7', bgColor: '#eff6ff', icon: <CheckCircle2 size={14} /> };
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
                          setSelectedBookingForInvoice({
                            id: trackedBooking.id,
                            bookingCode: trackedBooking.bookingCode,
                            packageName: trackedBooking.packageDetails?.name || trackedBooking.packageName,
                            totalPrice: trackedBooking.totalPrice,
                            guests: trackedBooking.guests,
                            tripDate: trackedBooking.tripDate,
                            paymentUrl: trackedBooking.paymentUrl || ''
                          });
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
                        ⚡ Selesaikan Pembayaran
                      </button>
                    )}
                    
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {customerProfile && <button disabled={loading} onClick={() => void fetchHistory()}>Perbarui riwayat</button>}
        {/* History List Header */}
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>
          {customerProfile && customerProfile.role === 'CUSTOMER' ? 'Riwayat Pemesanan Akun Anda' : 'Detail Status Pemesanan Tiket'}
        </h1>

        {historyError ? <div role="alert"><p>{historyError}</p><button onClick={() => void fetchHistory()}>Coba lagi</button></div> : loading ? (
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
              const isExpired = booking.status === 'EXPIRED';
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

                  



                  {booking.status === 'PENDING_PAYMENT' && <button onClick={() => {
                    setSelectedBookingForInvoice(booking);
                    navigateTo('halaman-pembayaran');
                  }}>Lihat invoice pembayaran</button>}
                  <div style={{ borderTop: '1px dotted #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>TOTAL HARGA</span>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#00a896' }}>{formatIDR(booking.totalPrice)}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {(booking.status === 'PAID' || booking.status === 'CONFIRMED' || booking.status === 'Dikonfirmasi' || booking.status === 'COMPLETED') && (
                        <>
                          
                          
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

                            const parseDate = (dStr?: string) => {
                              if (!dStr) return null;
                              const d = new Date(dStr);
                              return !isNaN(d.getTime()) ? d : null;
                            };
                            const tripD = parseDate(booking.tripDate);
                            const isFinished = booking.status === 'COMPLETED' || (
                              (booking.status === 'PAID' || booking.status === 'CONFIRMED') &&
                              tripD !== null &&
                              tripD.getTime() + 24 * 60 * 60 * 1000 <= Date.now()
                            );

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
                  disabled={sendingReview} onClick={() => setSelectedReviewBooking(null)}
                  style={{ padding: '10px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={sendingReview}
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

      </div>
    </div>
  );
};
