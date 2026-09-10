import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ArrowLeft, Calendar, MapPin, CheckCircle2, XCircle, Users, Layers, ChevronLeft, ChevronRight, X, PlusCircle, Star, MessageSquare, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

interface AddOn {
  id: string;
  name: string;
  price: number;
}

export const CustomerPackageDetailPage: React.FC = () => {
  const { navigateTo, selectedPackageForDetail, setSelectedPackageForDetail, setSelectedProviderId } = useNavigation();

  // Photo Lightbox Modal State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxPhotoIdx, setLightboxPhotoIdx] = useState(0);

  // Add-ons State
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  // Reviews & Rating State with Pagination
  const [reviewsList] = useState([
    { id: 1, name: 'Budi Santoso', avatar: 'BS', rating: 5, date: '15 Mei 2026', comment: 'Pengalaman luar biasa di Bromo! Tour guidenya sangat membantu dan mengambil foto-foto yang ciamik banget.', verified: true },
    { id: 2, name: 'Siti Rahmawati', avatar: 'SR', rating: 5, date: '10 Mei 2026', comment: 'Penjemputan tepat waktu, armada AC dingin, dan homestay sangat bersih. Pokoknya mantap TripKita!', verified: true },
    { id: 3, name: 'Andi Wijaya', avatar: 'AW', rating: 4, date: '02 Mei 2026', comment: 'Perjalanan menyenangkan. Driver Jeep ramah banget, rekomendasi sarapan lokalnya mantap.', verified: true },
    { id: 4, name: 'Dewi Lestari', avatar: 'DL', rating: 5, date: '28 April 2026', comment: 'Sunset dan sunrisenya spektakuler. Sangat cocok buat refreshing akhir pekan.', verified: true },
    { id: 5, name: 'Rian Hidayat', avatar: 'RH', rating: 5, date: '20 April 2026', comment: 'Pelayanan ramah, tidak ada biaya tersembunyi. Nanti mau booking trip lain lagi di TripKita.', verified: true },
    { id: 6, name: 'Maya Putri', avatar: 'MP', rating: 4, date: '12 April 2026', comment: 'Semua itinerary terlaksana sesuai jadwal. Pemandu lokalnya sangat berwawasan.', verified: true },
    { id: 7, name: 'Fikri Pratama', avatar: 'FP', rating: 5, date: '05 April 2026', comment: 'Fasilitas sangat worth it dengan harganya. Top banget!', verified: true },
  ]);

  const [reviewPage, setReviewPage] = useState(1);
  const reviewsPerPage = 3;
  const totalReviewPages = Math.ceil(reviewsList.length / reviewsPerPage);
  const currentReviews = reviewsList.slice((reviewPage - 1) * reviewsPerPage, reviewPage * reviewsPerPage);



  if (!selectedPackageForDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
        <p>Paket tidak ditemukan. Silakan kembali ke halaman utama.</p>
        <button onClick={() => navigateTo('beranda')} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const pkg = selectedPackageForDetail;
  const customDateInputRef = React.useRef<HTMLInputElement>(null);

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

  const minRequiredGuests = pkg.quotaMin || (
    pkg.tripType === 'Honeymoon' ? 2 :
    pkg.tripType === 'Private Trip' ? 1 :
    pkg.tripType === 'Family' ? 3 :
    pkg.tripType === 'Corporate' ? 10 : 1
  );

  const isOpenTrip = !pkg.tripType || pkg.tripType === 'Open Trip';

  const [guestsCount, setGuestsCount] = useState(Math.max(minRequiredGuests, 1));
  const [customSelectedDate, setCustomSelectedDate] = useState<string>(
    pkg.bookingDate && pkg.bookingDate >= h7MinDateStr ? pkg.bookingDate : h7MinDateStr
  );

  // Booked / Occupied dates per package for database & availability testing
  const bookedDatesMap: { [key: number]: string[] } = {
    1: ['2026-09-22', '2026-09-25'],
    5: ['2026-09-22', '2026-10-15'],
    6: ['2026-09-25', '2026-10-12'],
    7: ['2026-09-20', '2026-10-14'],
    8: ['2026-09-24', '2026-10-08'],
    9: ['2026-09-22', '2026-09-25', '2026-10-12'], // Family Jogja (Ready 1 Bulan Full, with 3 booked dates for DB testing)
    10: ['2026-09-26', '2026-10-18'],
    11: ['2026-09-28', '2026-10-22'],
    12: ['2026-09-21', '2026-10-16']
  };

  const currentPkgBookedDates = bookedDatesMap[pkg.id] || ['2026-09-22', '2026-09-25'];
  const isDateBooked = currentPkgBookedDates.includes(customSelectedDate);

  useEffect(() => {
    if (guestsCount < minRequiredGuests) {
      setGuestsCount(minRequiredGuests);
    }
  }, [minRequiredGuests]);
  
  const totalQuotaMax = pkg.quotaMax || 15;
  const totalQuotaUsed = pkg.quotaUsed || 0;
  const availableSeats = Math.max(0, totalQuotaMax - totalQuotaUsed);

  const getDestinationDefaults = (nameStr: string): string[] => {
    const nameLower = nameStr.toLowerCase();
    if (nameLower.includes('bromo')) {
      return [
        'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80'
      ];
    }
    if (nameLower.includes('tidung')) {
      return [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1506953711105-89bf2347e221?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1471922694854-ff24a5692694?auto=format&fit=crop&w=1200&q=80'
      ];
    }
    if (nameLower.includes('cilember')) {
      return [
        'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80'
      ];
    }
    if (nameLower.includes('bandung')) {
      return [
        'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
      ];
    }
    if (nameLower.includes('ranu') || nameLower.includes('kumbolo')) {
      return [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80'
      ];
    }
    if (nameLower.includes('baduy')) {
      return [
        'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
      ];
    }
    if (nameLower.includes('palu') || nameLower.includes('tanjung karang')) {
      return [
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1471922694854-ff24a5692694?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1506953711105-89bf2347e221?auto=format&fit=crop&w=1200&q=80'
      ];
    }
    if (nameLower.includes('yogyakarta') || nameLower.includes('jogja')) {
      return [
        'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
      ];
    }
    return [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80'
    ];
  };

  const getGalleryImages = (name: string): string[] => {
    const formatUrl = (url: string) => {
      if (!url) return '';
      const trimmed = url.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
        return trimmed;
      }
      // If it looks like a valid relative path or image file extension
      if (trimmed.startsWith('/') || trimmed.startsWith('uploads/') || trimmed.startsWith('storage/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(trimmed)) {
        const baseUrl = API_BASE_URL.replace('/api/v1', '');
        return trimmed.startsWith('/') ? `${baseUrl}${trimmed}` : `${baseUrl}/${trimmed}`;
      }
      // Filter out non-URL junk text like "Sub 2", "Main preview", "thumb", etc.
      return '';
    };

    let rawList: string[] = [];
    if (Array.isArray((pkg as any)?.images)) {
      rawList = (pkg as any).images.map((img: any) => (typeof img === 'string' ? formatUrl(img) : '')).filter(Boolean);
    } else if ((pkg as any)?.images && typeof (pkg as any).images === 'string' && (pkg as any).images.trim() !== '') {
      rawList = (pkg as any).images.split(',').map((s: string) => formatUrl(s)).filter(Boolean);
    } else if ((pkg as any)?.image && typeof (pkg as any).image === 'string' && (pkg as any).image.trim() !== '') {
      const formatted = formatUrl((pkg as any).image);
      if (formatted) rawList = [formatted];
    }

    if (rawList.length > 0) {
      const defaults = getDestinationDefaults(name);
      while (rawList.length < 3) {
        const fallback = defaults[rawList.length % defaults.length] || FALLBACK_IMAGE;
        rawList.push(fallback);
      }
      return rawList;
    }

    return getDestinationDefaults(name);
  };

  const photos = getGalleryImages(pkg.name);

  // Dynamic Add-on services list per destination
  const getPackageAddOns = (name: string): AddOn[] => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('tidung') || nameLower.includes('pantai') || nameLower.includes('palu')) {
      return [
        { id: 'snorkel', name: 'Sewa Alat Snorkeling Lengkap & Pelampung', price: 75000 },
        { id: 'gopro', name: 'Dokumentasi Sewa Kamera GoPro UnderWater', price: 100000 },
        { id: 'banana', name: 'Wahana Water Sport Banana Boat / Donut', price: 50000 }
      ];
    }
    if (nameLower.includes('bromo') || nameLower.includes('ranu') || nameLower.includes('gunung')) {
      return [
        { id: 'jeep', name: 'Sewa Jeep Hardtop Sewa Pribadi (Private)', price: 350000 },
        { id: 'jacket', name: 'Sewa Jaket Gunung & Sarung Tangan Thermal', price: 45000 },
        { id: 'tenda', name: 'Upgrade Tenda Camping Exclusive 4 Person', price: 120000 }
      ];
    }
    if (nameLower.includes('baduy')) {
      return [
        { id: 'porter', name: 'Jasa Porter Personal Pendamping Warga Baduy', price: 150000 },
        { id: 'souvenir', name: 'Paket Souvenir Suku Baduy & Kain Tenun', price: 100000 }
      ];
    }
    return [
      { id: 'drone', name: 'Dokumentasi Sewa Drone & Pilot Pro', price: 250000 },
      { id: 'vip_van', name: 'Upgrade Armada VIP Van Travel', price: 150000 }
    ];
  };

  const addOnsList: AddOn[] = getPackageAddOns(pkg.name);

  const getActiveSchedules = () => {
    const today = new Date();
    const addDays = (d: Date, days: number) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + days);
      return copy;
    };
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const formatLabel = (start: Date, days: number) => {
      const end = addDays(start, days - 1);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${start.getDate()} ${months[start.getMonth()]}–${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()} (${days} Hari)`;
    };

    // If package has a specific schedule string (e.g. from backend or form)
    if (pkg.schedule && pkg.schedule.trim() !== '') {
      const parts = pkg.schedule.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        return parts.map((part: string) => {
          // If part contains YYYY-MM-DD format
          const dateMatch = part.match(/\d{4}-\d{2}-\d{2}/);
          const dateVal = dateMatch ? dateMatch[0] : (pkg.startDate || formatDate(addDays(today, 3)));
          return { label: part, dateValue: dateVal };
        });
      }
    }

    if (pkg.startDate) {
      const start = new Date(pkg.startDate);
      if (!isNaN(start.getTime())) {
        const end = pkg.endDate ? new Date(pkg.endDate) : addDays(start, 3);
        const days = !isNaN(end.getTime()) ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1) : 4;
        return [
          { label: formatLabel(start, days), dateValue: formatDate(start) }
        ];
      }
    }

    const d1 = addDays(today, 3);
    const d2 = addDays(today, 7);
    const d3 = addDays(today, 12);

    return [
      { label: formatLabel(d1, 4), dateValue: formatDate(d1) },
      { label: formatLabel(d2, 4), dateValue: formatDate(d2) },
      { label: formatLabel(d3, 4), dateValue: formatDate(d3) }
    ];
  };

  const availableSchedules = getActiveSchedules();

  // Pre-select schedule date closest to user's selected bookingDate
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(
    pkg.bookingDate || (availableSchedules.length > 0 ? availableSchedules[0].dateValue : '')
  );

  useEffect(() => {
    if (pkg.bookingDate) {
      const match = availableSchedules.find((s: { label: string; dateValue: string }) => s.dateValue >= pkg.bookingDate);
      if (match) {
        setSelectedScheduleDate(match.dateValue);
      }
    } else if (availableSchedules.length > 0) {
      setSelectedScheduleDate(availableSchedules[0].dateValue);
    }
  }, [pkg.bookingDate, pkg.schedule]);

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds(prev =>
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  const totalAddOnsCost = selectedAddOnIds.reduce((sum, id) => {
    const item = addOnsList.find(a => a.id === id);
    return sum + (item ? item.price : 0);
  }, 0);

  const mockItinerary = [
    { day: 'Hari 1', title: 'Kedatangan & Check-in Awal', desc: 'Penjemputan di meeting point oleh tim pemandu lokal TripKita. Briefing perjalanan dan pembagian kamar.' },
    { day: 'Hari 2', title: 'Eksplorasi Destinasi Utama & Sesi Foto', desc: 'Perjalanan seharian menjelajahi spot-spot ikonik. Makan siang bersama di spot alam dengan pemandangan menakjubkan.' },
    { day: 'Hari 3', title: 'Wisata Kuliner & Kepulangan', desc: 'Berburu oleh-oleh khas lokal, makan siang santai, lalu diantar kembali menuju titik kumpul awal kepulangan.' }
  ];

  const mockIncludedFacilities = [
    'Penginapan / Homestay AC Berstandar',
    'Transportasi Lokal AC Selama Trip',
    'Makan Sesuai Program Trip (3x Sehari)',
    'Tiket Masuk Semua Objek Wisata',
    'Tour Guide Lokal Berpengalaman & Lisensi',
    'Dokumentasi Foto Selama Perjalanan',
    'Air Mineral & Snack Perjalanan'
  ];

  const mockExcludedFacilities = [
    'Tiket Pesawat / Kereta menuju Meeting Point',
    'Pengeluaran Pribadi & Belanja Souvenir',
    'Obat-obatan Pribadi Khusus',
    'Tipping Sukarela Guide & Driver'
  ];

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
    if (availableSeats <= 0) {
      alert('Maaf, kuota untuk paket ini telah habis. Silakan pilih paket wisata lain.');
      return;
    }
    if (guestsCount < minRequiredGuests) {
      alert(`⚠️ Minimal pemesanan untuk paket ${pkg.tripType || 'ini'} adalah ${minRequiredGuests} orang.`);
      return;
    }
    if (isDateBooked) {
      alert(`❌ Tanggal ${formatDateIndoFull(customSelectedDate)} sudah TERBOOKING oleh pemesan lain. Silakan pilih tanggal lain yang tersedia.`);
      return;
    }
    if (customSelectedDate < h7MinDateStr) {
      alert(`⚠️ Pemesanan paket ${pkg.tripType || 'ini'} wajib H-7 sebelum keberangkatan. Tanggal paling awal yang dapat dipesan adalah ${formatDateIndoFull(h7MinDateStr)}.`);
      return;
    }
    const finalBookingDate = isOpenTrip ? selectedScheduleDate : customSelectedDate;
    if (!finalBookingDate) {
      alert('⚠️ Silakan pilih tanggal keberangkatan terlebih dahulu.');
      return;
    }
    const selectedAddOnObjects = addOnsList.filter(a => selectedAddOnIds.includes(a.id));
    const updatedPkg = {
      ...pkg,
      bookingGuests: guestsCount,
      bookingDate: finalBookingDate,
      selectedAddOns: selectedAddOnObjects
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
                Nikmati petualangan tak terlupakan bersama tim pemandu profesional TripKita di {pkg.destination}. Didesain untuk memberikan pengalaman liburan yang aman, nyaman, dan menyenangkan bersama teman maupun keluarga.
              </p>
            </div>

            {/* Itinerary */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px 0' }}>
                Rencana Perjalanan (Itinerary)
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {mockItinerary.map((item, idx) => (
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
                    {mockIncludedFacilities.map((fac, idx) => (
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
                    {mockExcludedFacilities.map((fac, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                        <XCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{fac}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Layanan Add-On Tambahan */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={18} color="#007bff" /> Layanan Tambahan (Add-On Opsional)
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
                Pilih fasilitas ekstra untuk melengkapi petualangan Anda (opsional).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {addOnsList.map((addon) => {
                  const isChecked = selectedAddOnIds.includes(addon.id);
                  return (
                    <label 
                      key={addon.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: isChecked ? '1.5px solid #007bff' : '1px solid #cbd5e1',
                        backgroundColor: isChecked ? '#f0f7ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 180px', minWidth: 0 }}>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAddOn(addon.id)}
                          style={{ width: '16px', height: '16px', accentColor: '#007bff', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a', wordBreak: 'break-word' }}>
                          {addon.name}
                        </span>
                      </div>
                      <strong style={{ fontSize: '13.5px', color: '#007bff', flexShrink: 0, marginLeft: 'auto' }}>
                        +{formatIDR(addon.price)}
                      </strong>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Profil Provider Penyelenggara Section */}
            {(() => {
              const pId = pkg.providerId || 1;
              const providerNames: { [key: number]: string } = {
                1: 'Wisata Bromo Nusantara',
                2: 'Tidung Paradise Tour',
                3: 'Bogor Curug Explorer',
                4: 'Bandung Juara Tour',
                8: 'Jogja Istimewa Tour',
              };
              const providerCities: { [key: number]: string } = {
                1: 'Probolinggo, Jawa Timur',
                2: 'Kepulauan Seribu, Jakarta',
                3: 'Bogor, Jawa Barat',
                4: 'Bandung, Jawa Barat',
                8: 'Yogyakarta, DI Yogyakarta',
              };
              const currentProviderName = providerNames[pId] || 'Wisata Bromo Nusantara';
              const currentProviderCity = providerCities[pId] || 'Indonesia';

              return (
                <div 
                  style={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: '16px', 
                    padding: '24px', 
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Diselenggarakan Oleh Mitra Provider
                    </span>
                    <span 
                      style={{ 
                        backgroundColor: '#dcfce7', 
                        color: '#166534', 
                        padding: '3px 10px', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <ShieldCheck size={13} color="#166534" /> Terverifikasi Resmi
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Logo Avatar */}
                    <div 
                      onClick={() => {
                        if (setSelectedProviderId) setSelectedProviderId(pId);
                        navigateTo('provider-public-profile');
                      }}
                      style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '14px', 
                        backgroundColor: '#007bff', 
                        color: '#ffffff', 
                        fontWeight: '900', 
                        fontSize: '22px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {currentProviderName.charAt(0)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: '1 1 200px' }}>
                      <h3 
                        onClick={() => {
                          if (setSelectedProviderId) setSelectedProviderId(pId);
                          navigateTo('provider-public-profile');
                        }}
                        style={{ 
                          fontSize: '16px', 
                          fontWeight: '800', 
                          color: '#0f172a', 
                          margin: '0 0 4px 0', 
                          cursor: 'pointer',
                          display: 'inline-block' 
                        }}
                      >
                        {currentProviderName}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={13} color="#007bff" /> {currentProviderCity}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b', fontWeight: '700' }}>
                          <Star size={13} fill="#f59e0b" color="#f59e0b" /> 4.9 / 5.0 (120 Ulasan)
                        </span>
                      </div>
                    </div>

                    {/* View Profile Action Button */}
                    <button 
                      type="button"
                      onClick={() => {
                        if (setSelectedProviderId) setSelectedProviderId(pId);
                        navigateTo('provider-public-profile');
                      }}
                      style={{
                        backgroundColor: '#f0f7ff',
                        color: '#007bff',
                        border: '1px solid #bfdbfe',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      Lihat Profil & Paket <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })()}

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
                    {(reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              {/* Reviews List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
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

          {/* Right Fixed Booking Card with 3 Jadwal Keberangkatan Dropdown */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', position: 'sticky', top: '90px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Harga per orang</span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#007bff', marginBottom: '18px' }}>
              {formatIDR(pkg.price)}
            </div>

            {/* Jadwal Keberangkatan (Open Trip Dropdown vs Non-Open Trip Calendar) */}
            {isOpenTrip ? (
              <div style={{ backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px', border: '1px solid #dbeafe' }}>
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
                  {availableSchedules.map((sch: { label: string; dateValue: string }) => (
                    <option key={sch.dateValue} value={sch.dateValue}>
                      {sch.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px', border: '1px solid #dbeafe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#007bff', fontWeight: '700', textTransform: 'uppercase' }}>
                    Pilih Tanggal ({pkg.tripType})
                  </label>
                  <span style={{ fontSize: '11px', color: '#007bff', fontWeight: '700', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                    Min. H-7
                  </span>
                </div>
                
                <div 
                  onClick={() => {
                    if (customDateInputRef.current) {
                      if (typeof customDateInputRef.current.showPicker === 'function') {
                        customDateInputRef.current.showPicker();
                      } else {
                        customDateInputRef.current.focus();
                      }
                    }
                  }}
                  style={{ position: 'relative', width: '100%', cursor: 'pointer' }}
                >
                  <div
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isDateBooked ? '1.5px solid #ef4444' : '1.5px solid #007bff',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      color: isDateBooked ? '#ef4444' : '#0f172a',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span>{formatDateIndoFull(customSelectedDate)} {isDateBooked ? '❌ (TERBOOKING)' : ''}</span>
                    <Calendar size={18} color={isDateBooked ? '#ef4444' : '#007bff'} />
                  </div>
                  <input 
                    ref={customDateInputRef}
                    type="date" 
                    min={h7MinDateStr}
                    max={pkg.endDate || undefined}
                    value={customSelectedDate}
                    onChange={(e) => setCustomSelectedDate(e.target.value)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>

                {isDateBooked ? (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: '8px', color: '#991b1b', fontSize: '11.5px', fontWeight: '700', marginTop: '8px', lineHeight: '1.4' }}>
                    ❌ Tanggal <strong>{formatDateIndoFull(customSelectedDate)}</strong> sudah TERBOOKING oleh pelanggan lain (TIDAK TERSEDIA). Silakan pilih tanggal lain.
                  </div>
                ) : (
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px', fontWeight: '500', lineHeight: '1.4' }}>
                    💡 <strong>Jadwal Operasional:</strong> {pkg.schedule || 'Siap melayani 3 bulan kedepan'}. Pemesanan H-7 (Mulai: {formatDateIndoFull(h7MinDateStr)}). Tanggal lewat / terbooking tidak dapat dipesan.
                  </span>
                )}
              </div>
            )}

            {/* Guest Counter (+ / -) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                <span>Jumlah Peserta</span>
                <span style={{ color: (availableSeats - guestsCount) >= 0 ? '#10b981' : '#ef4444', fontWeight: '800' }}>
                  Sisa {Math.max(0, availableSeats - guestsCount)} seat
                </span>
              </label>
              
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
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block', fontWeight: '500' }}>
                  * Minimal pemesanan paket {pkg.tripType || 'ini'} adalah {minRequiredGuests} orang.
                </span>
              )}
            </div>

            {/* Price Total Summary */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                <span>Paket ({guestsCount}x)</span>
                <span>{formatIDR(pkg.price * guestsCount)}</span>
              </div>
              
              {totalAddOnsCost > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#007bff', marginBottom: '6px' }}>
                  <span>Add-On Tambahan</span>
                  <span>+{formatIDR(totalAddOnsCost)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                <span>Total Estimasi</span>
                <span style={{ color: '#007bff' }}>{formatIDR(pkg.price * guestsCount + totalAddOnsCost)}</span>
              </div>
            </div>

            <button
              onClick={handleBookNow}
              disabled={availableSeats <= 0}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: availableSeats <= 0 ? '#94a3b8' : '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: availableSeats <= 0 ? 'not-allowed' : 'pointer',
                boxShadow: availableSeats <= 0 ? 'none' : '0 4px 12px rgba(0, 123, 255, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              {availableSeats <= 0 ? 'Kuota Habis (Tidak Bisa Dipesan)' : 'Pesan Sekarang'}
            </button>
          </div>

        </div>
      </div>

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

    </div>
  );
};
