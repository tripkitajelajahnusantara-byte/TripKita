import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCustomAlert } from '../components/CustomAlertModal';
import { ArrowLeft, Calendar, MapPin, CheckCircle2, XCircle, Users, Layers, ChevronLeft, ChevronRight, X, Star, MessageSquare } from 'lucide-react';
import { request } from '../utils/api';
import { useApiData } from '../utils/useApiData';
import type { PublicPackage } from '../types';
import { TravelokaCalendarModal } from '../components/TravelokaCalendarModal';

import { EMPTY_TRIP_IMAGE, getTripImage } from '../utils/tripImages';
const FALLBACK_IMAGE = EMPTY_TRIP_IMAGE;

export const CustomerPackageDetailPage: React.FC = () => {
  const { selectedPackageForDetail, navigateTo } = useNavigation();
  const urlId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('id');
  const packageId = Number(urlId || selectedPackageForDetail?.id);
  const validId = Number.isInteger(packageId) && packageId > 0;
  const { data, loading, error: loadError } = useApiData<PublicPackage[]>(validId ? '/public/packages' : null);
  const found = data?.find(pkg => pkg.id === packageId && pkg.status === 'Aktif');
  const error = !validId ? 'Pilih paket wisata terlebih dahulu.' : loadError || (!loading && !found ? 'Paket wisata tidak tersedia.' : '');
  if (loading || error || !found) return (
    <div className="container" style={{ padding: '80px 20px' }}>
      <p role={error ? 'alert' : 'status'}>{loading ? 'Memuat paket wisata...' : error}</p>
      {!loading && <button onClick={() => navigateTo('cari-trip')}>Kembali ke daftar trip</button>}
    </div>
  );
  return <PackageDetailContent key={packageId} pkg={{ ...found, bookingDate: selectedPackageForDetail?.id === found.id ? selectedPackageForDetail.bookingDate : undefined }} />;
};

const PackageDetailContent: React.FC<{ pkg: PublicPackage & { bookingDate?: string } }> = ({ pkg }) => {
  const { navigateTo, setSelectedPackageForDetail, setSelectedProviderId, customerProfile, openAuthModal } = useNavigation();
  const { showAlert } = useCustomAlert();

  // Traveloka Calendar Modal State
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Photo Lightbox Modal State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxPhotoIdx, setLightboxPhotoIdx] = useState(0);

  const [reviewsList, setReviewsList] = useState<Array<{ id: number; name: string; avatar: string; rating: number; date: string; comment: string; verified: boolean }>>([]);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    request('/public/reviews/package/' + pkg.id).then(data => {
      if (active) setReviewsList((data || []).map((review: any) => ({
        id: review.id, name: 'Pelanggan', avatar: 'P', rating: review.rating,
        date: new Date(review.createdAt).toLocaleDateString('id-ID'),
        comment: review.comment, verified: Boolean(review.bookingId)
      })));
    }).catch(() => { if (active) setReviewsError('Ulasan gagal dimuat.'); })
      .finally(() => { if (active) setReviewsLoading(false); });
    return () => { active = false; };
  }, [pkg.id]);

  const [reviewPage, setReviewPage] = useState(1);
  const reviewsPerPage = 3;
  const totalReviewPages = Math.ceil(reviewsList.length / reviewsPerPage);
  const currentReviews = reviewsList.slice((reviewPage - 1) * reviewsPerPage, reviewPage * reviewsPerPage);


  const activeMeetingPoint = pkg.meetingPoint?.trim() || '';

  const formatDateIndoFull = (dateStr: string) => {
    if (!dateStr) return 'Pilih Tanggal';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getH7MinDateIso = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const h7MinDateStr = getH7MinDateIso();

  const isOpenTrip = !pkg.tripType || pkg.tripType === 'Open Trip';

  const minRequiredGuests = isOpenTrip ? 1 : (
    pkg.tripType === 'Honeymoon' ? 2 :
    pkg.tripType === 'Private Trip' ? 1 :
    pkg.tripType === 'Family' ? 3 :
    pkg.tripType === 'Corporate' ? 10 : 1
  );

  const [guestsCount, setGuestsCount] = useState(1);

  const durationFromDates = Math.round((Date.parse(pkg.endDate) - Date.parse(pkg.startDate)) / 86400000);
  const defaultDuration = Number.isFinite(durationFromDates) && durationFromDates >= 0 ? durationFromDates : 0;

  const [customStartDate, setCustomStartDate] = useState<string>(
    pkg.bookingDate && pkg.bookingDate.length === 10 && pkg.bookingDate >= h7MinDateStr ? pkg.bookingDate : h7MinDateStr
  );

  const [customEndDate, setCustomEndDate] = useState<string>(customStartDate);

  const currentPkgBookedDates: string[] = [];

  const getBookedDatesInSelectedRange = (startIso: string, endIso: string, bookedList: string[]) => {
    if (!startIso || !endIso) return [];
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const list: string[] = [];
    for (const bStr of bookedList) {
      const bTime = new Date(bStr).getTime();
      if (bTime >= start && bTime <= end) {
        list.push(bStr);
      }
    }
    return list;
  };

  const bookedDatesInRange = getBookedDatesInSelectedRange(customStartDate, customEndDate, currentPkgBookedDates);
  const isRangeBooked = bookedDatesInRange.length > 0;

  useEffect(() => {
    if (guestsCount < minRequiredGuests) {
      setGuestsCount(minRequiredGuests);
    }
  }, [minRequiredGuests]);
  
  const totalQuotaMax = pkg.quotaMax ?? 0;

  const photos: string[] = (pkg.images || pkg.image || '').split(',')
    .map((path: string) => path.trim()).filter(Boolean)
    .map((path: string) => getTripImage(pkg.id, pkg.name, pkg.category, path));

  const [pageOpenedAt] = useState(() => Date.now());
  const availableSchedules: Array<{ label: string; dateValue: string }> = [];
  if (pkg.startDate && Number.isFinite(Date.parse(pkg.startDate)) && Date.parse(pkg.startDate + 'T23:59:59') >= pageOpenedAt) {
    availableSchedules.push({ label: pkg.schedule || formatDateIndoFull(pkg.startDate), dateValue: pkg.startDate });
  }

  // Pre-select schedule date closest to user's selected bookingDate
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(
    availableSchedules[0]?.dateValue || ''
  );

  useEffect(() => {
    if (pkg.bookingDate) {
      const match = availableSchedules.find((s: { label: string; dateValue: string }) => s.dateValue >= pkg.bookingDate);
      setSelectedScheduleDate(match?.dateValue || availableSchedules[0]?.dateValue || '');
    } else if (availableSchedules.length > 0) {
      setSelectedScheduleDate(availableSchedules[0].dateValue);
    }
  }, [pkg.bookingDate, pkg.schedule]);

  const totalQuotaUsed = pkg.quotaUsed ?? 0;
  const availableSeats = Math.max(0, totalQuotaMax - totalQuotaUsed);

  const getDynamicItinerary = () => {
    if (pkg.itinerary) {
      try {
        const parsed = JSON.parse(pkg.itinerary);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list: { day: string; title: string; desc: string }[] = [];
          parsed.forEach((item: any) => {
            const dayLabel = `Hari ${item.day}`;
            if (Array.isArray(item.activities)) {
              item.activities.forEach((act: any) => {
                list.push({
                  day: dayLabel,
                  title: act.time ? `${act.time} — ${act.title}` : act.title,
                  desc: act.description || ''
                });
              });
            }
          });
          if (list.length > 0) return list;
        }
      } catch (e) {
        // ignore
      }
    }
    return [];
  };

  const getDynamicIncludedFacilities = () => {
    if (pkg.includedFacilities && pkg.includedFacilities.trim()) {
      const list = pkg.includedFacilities.split('\n').map((s: string) => s.trim()).filter(Boolean);
      if (list.length > 0) return list;
    }
    return [];
  };

  const getDynamicExcludedFacilities = () => {
    if (pkg.excludedFacilities && pkg.excludedFacilities.trim()) {
      const list = pkg.excludedFacilities.split('\n').map((s: string) => s.trim()).filter(Boolean);
      if (list.length > 0) return list;
    }
    return [];
  };

  const displayItinerary = getDynamicItinerary();
  const displayIncludedFacilities = getDynamicIncludedFacilities();
  const displayExcludedFacilities = getDynamicExcludedFacilities();

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const openLightbox = (index: number) => {
    setLightboxPhotoIdx(index);
    setIsLightboxOpen(true);
  };

  const nextLightboxPhoto = () => {
    setLightboxPhotoIdx(prev => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const prevLightboxPhoto = () => {
    setLightboxPhotoIdx(prev => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleBookNow = () => {
    if (!customerProfile) {
      openAuthModal('login');
      return;
    }
    if (isOpenTrip && !availableSchedules.some(schedule => schedule.dateValue === selectedScheduleDate)) {
      showAlert({ type: 'warning', message: 'Jadwal keberangkatan belum tersedia.' });
      return;
    }
    if (availableSeats <= 0) {
      showAlert({ type: 'warning', title: 'Kuota Habis', message: 'Maaf, kuota untuk paket ini telah habis. Silakan pilih paket wisata lain.' });
      return;
    }
    if (guestsCount < minRequiredGuests) {
      showAlert({ type: 'warning', title: 'Jumlah Peserta Kurang', message: `Minimal pemesanan untuk paket ${pkg.tripType || 'ini'} adalah ${minRequiredGuests} orang.` });
      return;
    }
    if (guestsCount > availableSeats) {
      showAlert({ type: 'warning', title: 'Melebihi Sisa Kuota', message: `Jumlah peserta (${guestsCount} orang) melebihi sisa kuota yang tersedia (${availableSeats} seat).` });
      return;
    }
    if (!isOpenTrip && isRangeBooked) {
      showAlert({ type: 'error', title: 'Jadwal Terbooking', message: `Rentang tanggal ${formatDateIndoFull(customStartDate)} - ${formatDateIndoFull(customEndDate)} sudah TERBOOKING oleh pemesan lain. Silakan pilih rentang tanggal lain.` });
      return;
    }
    if (!isOpenTrip && customStartDate < h7MinDateStr) {
      showAlert({ type: 'warning', title: 'Pemesanan Wajib H-7', message: `Pemesanan paket ${pkg.tripType || 'ini'} wajib H-7 sebelum keberangkatan. Tanggal paling awal yang dapat dipesan adalah ${formatDateIndoFull(h7MinDateStr)}.` });
      return;
    }
    const finalBookingDate = isOpenTrip 
      ? selectedScheduleDate 
      : customStartDate;
    
    if (!finalBookingDate) {
      showAlert({ type: 'warning', title: 'Pilih Tanggal Keberangkatan', message: 'Silakan pilih tanggal keberangkatan terlebih dahulu.' });
      return;
    }
    const updatedPkg = {
      ...pkg,
      bookingGuests: guestsCount,
      bookingDate: finalBookingDate,
      bookingEndDate: isOpenTrip ? pkg.endDate : customEndDate,
    };
    setSelectedPackageForDetail(updatedPkg);
    navigateTo('customer-checkout');
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '80px', fontFamily: 'Inter, sans-serif' }}>
      {/* Back Button */}
      <div className="container" style={{ maxWidth: '1120px', margin: '0 auto', paddingTop: '20px', paddingBottom: '16px' }}>
        <button 
          onClick={() => navigateTo('cari-trip')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Trip
        </button>
      </div>

      {/* Main Container */}
      <div className="container" style={{ maxWidth: '1120px', margin: '0 auto' }}>
        
        {/* Dynamic Photo Gallery Grid */}
        {(() => {
          const count = photos.length;
          if (count === 0) return null;

          if (count === 1) {
            return (
              <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '30px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', height: '378px' }}>
                <div onClick={() => openLightbox(0)} style={{ width: '100%', height: '100%', cursor: 'pointer', overflow: 'hidden' }}>
                  <img 
                    src={photos[0]} 
                    alt="Main preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                </div>
              </div>
            );
          }

          if (count === 2) {
            return (
              <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '30px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', height: '378px', backgroundColor: '#e2e8f0' }}>
                  {photos.map((imgUrl, idx) => (
                    <div key={idx} onClick={() => openLightbox(idx)} style={{ cursor: 'pointer', overflow: 'hidden' }}>
                      <img 
                        src={imgUrl} 
                        alt={`Preview ${idx + 1}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (count === 3) {
            return (
              <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '30px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '185px 185px', gap: '8px', height: '378px', backgroundColor: '#e2e8f0' }}>
                  <div onClick={() => openLightbox(0)} style={{ gridColumn: '1 / 2', gridRow: '1 / 3', cursor: 'pointer', overflow: 'hidden' }}>
                    <img 
                      src={photos[0]} 
                      alt="Main preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                  </div>
                  <div onClick={() => openLightbox(1)} style={{ gridColumn: '2 / 3', gridRow: '1 / 2', cursor: 'pointer', overflow: 'hidden' }}>
                    <img 
                      src={photos[1]} 
                      alt="Sub 1" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                  </div>
                  <div onClick={() => openLightbox(2)} style={{ gridColumn: '2 / 3', gridRow: '2 / 3', cursor: 'pointer', overflow: 'hidden' }}>
                    <img 
                      src={photos[2]} 
                      alt="Sub 2" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                  </div>
                </div>
              </div>
            );
          }

          if (count === 4) {
            return (
              <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '30px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '185px 185px', gap: '8px', height: '378px', backgroundColor: '#e2e8f0' }}>
                  <div onClick={() => openLightbox(0)} style={{ gridColumn: '1 / 2', gridRow: '1 / 3', cursor: 'pointer', overflow: 'hidden' }}>
                    <img 
                      src={photos[0]} 
                      alt="Main preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                  </div>
                  <div onClick={() => openLightbox(1)} style={{ gridColumn: '2 / 3', gridRow: '1 / 2', cursor: 'pointer', overflow: 'hidden' }}>
                    <img 
                      src={photos[1]} 
                      alt="Sub 1" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                  </div>
                  <div onClick={() => openLightbox(2)} style={{ gridColumn: '2 / 3', gridRow: '2 / 3', cursor: 'pointer', overflow: 'hidden' }}>
                    <img 
                      src={photos[2]} 
                      alt="Sub 2" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                  </div>
                  <div onClick={() => openLightbox(3)} style={{ gridColumn: '3 / 4', gridRow: '1 / 3', cursor: 'pointer', overflow: 'hidden' }}>
                    <img 
                      src={photos[3]} 
                      alt="Sub 3" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                  </div>
                </div>
              </div>
            );
          }

          // 5 or more photos
          return (
            <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '30px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div className="detail-gallery-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '185px 185px', gap: '8px', height: '378px', backgroundColor: '#e2e8f0' }}>
                <div onClick={() => openLightbox(0)} style={{ gridColumn: '1 / 2', gridRow: '1 / 3', cursor: 'pointer', overflow: 'hidden' }}>
                  <img 
                    src={photos[0]} 
                    alt="Main preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                </div>
                <div onClick={() => openLightbox(1)} style={{ gridColumn: '2 / 3', gridRow: '1 / 2', cursor: 'pointer', overflow: 'hidden' }}>
                  <img 
                    src={photos[1]} 
                    alt="Sub 1" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                </div>
                <div onClick={() => openLightbox(2)} style={{ gridColumn: '2 / 3', gridRow: '2 / 3', cursor: 'pointer', overflow: 'hidden' }}>
                  <img 
                    src={photos[2]} 
                    alt="Sub 2" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                </div>
                <div onClick={() => openLightbox(3)} style={{ gridColumn: '3 / 4', gridRow: '1 / 2', cursor: 'pointer', overflow: 'hidden' }}>
                  <img 
                    src={photos[3]} 
                    alt="Sub 3" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                </div>
                <div onClick={() => openLightbox(4)} style={{ gridColumn: '3 / 4', gridRow: '2 / 3', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                  <img 
                    src={photos[4]} 
                    alt="Sub 4" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                  <div 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '13px',
                      gap: '6px'
                    }}
                  >
                    <Layers size={16} /> Lihat semua foto ({photos.length})
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Content Layout: Left Details, Right Fixed Booking Card */}
        <style>{`
          @media (max-width: 768px) {
            .detail-grid-layout {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
        <div className="detail-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', alignItems: 'flex-start' }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Title & Info */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>
                {pkg.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#64748b', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={16} color="#007bff" /> {pkg.destination}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={16} color="#007bff" /> Kategori: <strong>{pkg.category}</strong>
                </span>
              </div>
            </div>

            {/* Description */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0' }}>
                Deskripsi Paket Wisata
              </h2>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: 0 }}>
                {pkg.description || 'Deskripsi belum tersedia.'}
              </p>
            </div>

            {/* Itinerary */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px 0' }}>
                Rencana Perjalanan (Itinerary)
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {displayItinerary.length === 0 && <p>Itinerary belum tersedia.</p>}
                {displayItinerary.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ backgroundColor: '#e0f2fe', color: '#007bff', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                      {item.day}
                    </span>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>{item.title}</strong>
                      <span style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', display: 'block' }}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fasilitas Termasuk & Tidak Termasuk */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                Fasilitas Paket
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Termasuk */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#10b981', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Fasilitas Termasuk
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {displayIncludedFacilities.length === 0 && <p>Belum ada informasi fasilitas.</p>}
                    {displayIncludedFacilities.map((fac: string, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#334155' }}>
                        <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{fac}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tidak Termasuk */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <XCircle size={16} /> Fasilitas Tidak Termasuk
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {displayExcludedFacilities.length === 0 && <p>Belum ada informasi fasilitas.</p>}
                    {displayExcludedFacilities.map((fac: string, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                        <XCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{fac}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Titik Kumpul / Google Maps Embed (Posisi Tepat Dibawah Layanan Tambahan) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="#0284c7" /> Lokasi Titik Kumpul (Meeting Point)
              </h2>
              <p style={{ fontSize: '14px', color: '#334155', marginBottom: '16px', lineHeight: '1.6' }}>
                📍 <strong>{activeMeetingPoint || 'Titik kumpul belum tersedia.'}</strong>
              </p>
              <div style={{ borderRadius: '12px', overflow: 'hidden', height: '300px', border: '1px solid #cbd5e1' }}>
                {activeMeetingPoint && <iframe
                  title="Titik Kumpul Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(activeMeetingPoint)}&t=m&z=16&output=embed`}
                />}
              </div>
            </div>

            {pkg.providerId && <div style={{ background: '#fff', padding: '24px', borderRadius: '16px' }}>
              <h2>Paket dari mitra yang sama</h2>
              <button onClick={() => { setSelectedProviderId(pkg.providerId); navigateTo('provider-public-profile'); }}>Lihat paket mitra</button>
            </div>}

            {/* Ulasan & Rating Pengunjung Section (Paged) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} color="#007bff" /> Ulasan & Rating Pengunjung
                  </h2>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    Berdasarkan <strong>{reviewsList.length}</strong> ulasan wisatawan terverifikasi
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '6px 14px', borderRadius: '30px' }}>
                  <Star size={18} fill="#f59e0b" color="#f59e0b" />
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#b45309' }}>
                    {reviewsList.length ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1) : '—'} / 5.0
                  </span>
                </div>
              </div>

              {/* Reviews List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {reviewsLoading ? <p>Memuat ulasan...</p> : reviewsError ? <p role="alert">{reviewsError}</p> : reviewsList.length === 0 && <p>Belum ada ulasan.</p>}
                {currentReviews.map((rev) => (
                  <div key={rev.id} style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#007bff', color: '#ffffff', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {rev.avatar}
                        </div>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>{rev.name}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', fontWeight: '600' }}>
                            <CheckCircle2 size={12} /> Terverifikasi Pembeli
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end', marginBottom: '2px' }}>
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={13} fill={i < rev.rating ? '#f59e0b' : 'none'} color={i < rev.rating ? '#f59e0b' : '#cbd5e1'} />
                          ))}
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{rev.date}</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '13.5px', color: '#334155', margin: 0, lineHeight: '1.5' }}>
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalReviewPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginBottom: '28px', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                    Halaman {reviewPage} dari {totalReviewPages} ({reviewsList.length} Ulasan)
                  </span>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={() => setReviewPage(p => Math.max(1, p - 1))}
                      disabled={reviewPage === 1}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: reviewPage === 1 ? '#f1f5f9' : '#ffffff',
                        color: reviewPage === 1 ? '#94a3b8' : '#0f172a',
                        cursor: reviewPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <ChevronLeft size={14} /> Sebelumnya
                    </button>

                    {[...Array(totalReviewPages)].map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setReviewPage(idx + 1)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: reviewPage === idx + 1 ? 'none' : '1px solid #cbd5e1',
                          backgroundColor: reviewPage === idx + 1 ? '#007bff' : '#ffffff',
                          color: reviewPage === idx + 1 ? '#ffffff' : '#0f172a',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {idx + 1}
                      </button>
                    ))}

                    <button
                      onClick={() => setReviewPage(p => Math.min(totalReviewPages, p + 1))}
                      disabled={reviewPage === totalReviewPages}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: reviewPage === totalReviewPages ? '#f1f5f9' : '#ffffff',
                        color: reviewPage === totalReviewPages ? '#94a3b8' : '#0f172a',
                        cursor: reviewPage === totalReviewPages ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Berikutnya <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Fixed Booking Card */}
          <div 
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '20px', 
              padding: '24px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)', 
              position: 'sticky', 
              top: '90px',
              maxHeight: 'calc(100vh - 110px)',
              overflowY: 'auto'
            }}
          >
            {/* Price Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', display: 'block' }}>Harga per orang</span>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#007bff' }}>
                  {formatIDR(pkg.price)}
                </div>
              </div>
              <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                {pkg.tripType || 'Open Trip'} • Min. {pkg.quotaMin ?? 0} Pax
              </span>
            </div>

            {/* Jadwal Keberangkatan */}
            {isOpenTrip ? (
              <div style={{ backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: '1px solid #dbeafe' }}>
                <label style={{ fontSize: '12px', color: '#007bff', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Jadwal Keberangkatan (Open Trip)
                </label>
                
                <select
                  value={selectedScheduleDate}
                  onChange={(e) => setSelectedScheduleDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #007bff',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {availableSchedules.length === 0 && <option value="">Jadwal belum tersedia</option>}
                  {availableSchedules.map((sch: { label: string; dateValue: string }) => (
                    <option key={sch.dateValue} value={sch.dateValue}>
                      {sch.label}
                    </option>
                  ))}
                </select>

                {(() => {
                  const quotaMin = pkg.quotaMin ?? 0;
                  const quotaUsed = totalQuotaUsed;
                  const quotaShortage = Math.max(0, quotaMin - quotaUsed);

                  // If quota is fulfilled (e.g. 4/4 or 5/4), hide notification completely
                  if (quotaUsed >= quotaMin) return null;

                  return (
                    <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#fffbebfb', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '12px', color: '#92400e', fontWeight: '700', lineHeight: '1.5' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span>Minimal Kuota Open Trip:</span>
                        <strong style={{ color: '#0f172a' }}>{quotaMin} Pax</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span>Status Kuota Terisi:</span>
                        <strong style={{ color: '#0284c7' }}>{quotaUsed} / {quotaMin} Pax</strong>
                      </div>
                      <div style={{ color: '#92400e', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', marginTop: '4px', textAlign: 'center' }}>
                        Kurang {quotaShortage} peserta untuk mencapai kuota minimal.
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: '1px solid #dbeafe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '12.5px', color: '#007bff', fontWeight: '700', textTransform: 'uppercase' }}>
                    Pilih Jadwal
                  </label>
                  <span style={{ fontSize: '11px', color: '#007bff', fontWeight: '700', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                    Min. H-7
                  </span>
                </div>
                
                {/* Trigger Button to Open Traveloka Calendar Month Grid (Gambar 1) */}
                <button
                  type="button"
                  onClick={() => setIsCalendarModalOpen(true)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: isRangeBooked ? '2px solid #ef4444' : '2px solid #007bff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,123,255,0.08)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#007bff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={15} color="#007bff" /> Kalender Jadwal Perjalanan
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#007bff', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                      Pilih Tanggal &gt;
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block' }}>Tanggal Mulai</span>
                      <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{formatDateIndoFull(customStartDate)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block' }}>Tanggal Selesai</span>
                      <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{formatDateIndoFull(customEndDate)}</strong>
                    </div>
                  </div>
                </button>

                {isRangeBooked && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '10px 12px', borderRadius: '8px', color: '#991b1b', fontSize: '11.5px', fontWeight: '700', marginTop: '10px', lineHeight: '1.5' }}>
                    ❌ Dalam rentang tanggal yang Anda pilih ({customStartDate === customEndDate ? formatDateIndoFull(customStartDate) : `${formatDateIndoFull(customStartDate)} - ${formatDateIndoFull(customEndDate)}`}), terdapat tanggal yang sudah terbooking ({bookedDatesInRange.map(d => formatDateIndoFull(d)).join(', ')} FULL). Silakan pilih rentang tanggal lain pada kalender.
                  </div>
                )}
              </div>
            )}

            {/* Guest Counter */}
            <div style={{ marginBottom: '16px' }}>
              {(() => {
                const remainingAfterSelect = Math.max(0, availableSeats - guestsCount);
                return (
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    <span>Jumlah Peserta</span>
                    <span style={{ color: availableSeats > 0 && guestsCount <= availableSeats ? '#10b981' : '#ef4444', fontWeight: '800' }}>
                      {availableSeats <= 0 
                        ? 'Sisa 0 seat' 
                        : guestsCount > availableSeats 
                        ? `Melebihi Kuota (${availableSeats} seat)` 
                        : `Sisa ${remainingAfterSelect} seat`}
                    </span>
                  </label>
                );
              })()}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 14px' }}>
                <Users size={18} color="#94a3b8" />
                <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  {guestsCount} Orang
                </span>
                
                <button 
                  type="button"
                  onClick={() => setGuestsCount((prev) => Math.max(minRequiredGuests, prev - 1))}
                  disabled={guestsCount <= minRequiredGuests || availableSeats <= 0}
                  style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '6px', 
                    border: '1px solid #cbd5e1', 
                    backgroundColor: (guestsCount <= minRequiredGuests || availableSeats <= 0) ? '#e2e8f0' : '#f8fafc', 
                    fontWeight: '700', 
                    cursor: (guestsCount <= minRequiredGuests || availableSeats <= 0) ? 'not-allowed' : 'pointer' 
                  }}
                >
                  -
                </button>
                <button 
                  type="button"
                  onClick={() => setGuestsCount((prev) => Math.min(availableSeats, prev + 1))}
                  disabled={guestsCount >= availableSeats || availableSeats === 0}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (guestsCount >= availableSeats || availableSeats === 0) ? '#e2e8f0' : '#f8fafc', fontWeight: '700', cursor: (guestsCount >= availableSeats || availableSeats === 0) ? 'not-allowed' : 'pointer' }}
                >
                  +
                </button>
              </div>
              {minRequiredGuests > 1 && (
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block', fontWeight: '600' }}>
                  * Minimal pemesanan paket {pkg.tripType || 'ini'} adalah {minRequiredGuests} orang.
                </span>
              )}
            </div>

            {/* Total Summary */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', marginBottom: '4px' }}>
                <span>Paket ({guestsCount}x)</span>
                <span>{formatIDR(pkg.price * guestsCount)}</span>
              </div>
              
              

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                <span>Total Estimasi</span>
                <span style={{ color: '#007bff' }}>{formatIDR(pkg.price * guestsCount)}</span>
              </div>
            </div>

            {/* Pesan Sekarang Button (Directly Visible!) */}
            <button
              onClick={handleBookNow}
              disabled={availableSeats <= 0 || guestsCount > availableSeats || (!isOpenTrip && isRangeBooked)}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: (availableSeats <= 0 || guestsCount > availableSeats || (!isOpenTrip && isRangeBooked)) ? '#94a3b8' : '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: (availableSeats <= 0 || guestsCount > availableSeats || (!isOpenTrip && isRangeBooked)) ? 'not-allowed' : 'pointer',
                boxShadow: (availableSeats <= 0 || guestsCount > availableSeats || (!isOpenTrip && isRangeBooked)) ? 'none' : '0 4px 12px rgba(0, 123, 255, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              {availableSeats <= 0 ? 'Kuota Habis (Tidak Bisa Dipesan)' :
               guestsCount > availableSeats ? 'Peserta Melebihi Kuota' :
               (!isOpenTrip && isRangeBooked) ? 'Tanggal Terbooking (Tidak Tersedia)' : 'Pesan Sekarang'}
            </button>

          </div>

        </div>
      </div>

      {/* MOBILE FIXED BOTTOM BOOKING BAR */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: '#ffffff',
          padding: '12px 20px',
          borderTop: '1px solid #cbd5e1',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
        className="mobile-only-bottom-bar"
      >
        <div>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: '600' }}>Total ({guestsCount}x)</span>
          <span style={{ fontSize: '17px', fontWeight: '800', color: '#007bff' }}>
            {formatIDR(pkg.price * guestsCount)}
          </span>
        </div>

        <button
          onClick={handleBookNow}
          disabled={availableSeats <= 0 || guestsCount > availableSeats || (!isOpenTrip && isRangeBooked)}
          style={{
            padding: '12px 24px',
            backgroundColor: (availableSeats <= 0 || guestsCount > availableSeats || (!isOpenTrip && isRangeBooked)) ? '#94a3b8' : '#007bff',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14.5px',
            fontWeight: '700',
            cursor: (availableSeats <= 0 || guestsCount > availableSeats || (!isOpenTrip && isRangeBooked)) ? 'not-allowed' : 'pointer',
            boxShadow: (availableSeats <= 0 || guestsCount > availableSeats || (!isOpenTrip && isRangeBooked)) ? 'none' : '0 4px 12px rgba(0, 123, 255, 0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          {availableSeats <= 0 ? 'Kuota Habis' : 'Pesan Sekarang'}
        </button>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .mobile-only-bottom-bar {
            display: none !important;
          }
        }
      `}</style>

      {/* PHOTO LIGHTBOX MODAL */}
      {isLightboxOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          {/* Close Button */}
          <button 
            onClick={() => setIsLightboxOpen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff'
            }}
          >
            <X size={24} />
          </button>

          {/* Main Enlarged Image */}
          <div style={{ position: 'relative', maxWidth: '900px', maxHeight: '70vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src={photos[lightboxPhotoIdx]} 
              alt={`Gallery ${lightboxPhotoIdx + 1}`}
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
            />

            {/* Prev Arrow */}
            <button
              onClick={prevLightboxPhoto}
              style={{
                position: 'absolute',
                left: '-20px',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#0f172a'
              }}
            >
              <ChevronLeft size={24} />
            </button>

            {/* Next Arrow */}
            <button
              onClick={nextLightboxPhoto}
              style={{
                position: 'absolute',
                right: '-20px',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#0f172a'
              }}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Thumbnail Bar */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            {photos.map((img: string, i: number) => (
              <div 
                key={i} 
                onClick={() => setLightboxPhotoIdx(i)}
                style={{
                  width: '64px',
                  height: '44px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: lightboxPhotoIdx === i ? '2px solid #007bff' : '2px solid transparent',
                  opacity: lightboxPhotoIdx === i ? 1 : 0.6
                }}
              >
                <img 
                  src={img} 
                  alt={`Thumbnail ${i + 1}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Traveloka Calendar Modal for Date Selection */}
      <TravelokaCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        startDateIso={customStartDate}
        endDateIso={customEndDate}
        onSelectRange={(startIso, endIso) => {
          setCustomStartDate(startIso);
          setCustomEndDate(endIso);
        }}
        bookedDates={currentPkgBookedDates}
        minDateIso={h7MinDateStr}
        tripType={pkg.tripType}
        durationDays={defaultDuration}
      />

    </div>
  );
};
