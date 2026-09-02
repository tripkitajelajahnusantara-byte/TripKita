import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ArrowLeft, Calendar, MapPin, CheckCircle2, XCircle, Users, Layers, ChevronLeft, ChevronRight, X, PlusCircle, Star, MessageSquare } from 'lucide-react';

interface AddOn {
  id: string;
  name: string;
  price: number;
}

export const CustomerPackageDetailPage: React.FC = () => {
  const { navigateTo, selectedPackageForDetail, setSelectedPackageForDetail } = useNavigation();
  const [guestsCount, setGuestsCount] = useState(1);

  // Photo Lightbox Modal State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxPhotoIdx, setLightboxPhotoIdx] = useState(0);

  // Add-ons State
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  // Reviews & Rating State with Pagination
  const [reviewsList, setReviewsList] = useState([
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

  // New review form state
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmittedNotice, setReviewSubmittedNotice] = useState(false);

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewComment.trim()) return;

    const newRev = {
      id: Date.now(),
      name: newReviewName,
      avatar: newReviewName.slice(0, 2).toUpperCase(),
      rating: newReviewRating,
      date: 'Hari ini',
      comment: newReviewComment,
      verified: true
    };

    setReviewsList([newRev, ...reviewsList]);
    setNewReviewName('');
    setNewReviewComment('');
    setNewReviewRating(5);
    setReviewSubmittedNotice(true);
    setTimeout(() => setReviewSubmittedNotice(false), 4000);
  };

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
  const availableSeats = pkg.quotaMax ? (pkg.quotaMax - pkg.quotaUsed) : 10;

  // 5 High quality photos per destination matching actual trip content
  const getGalleryImages = (name: string) => {
    const nameLower = name.toLowerCase();
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

  // Exactly 3 closest available schedules in that month
  const availableSchedules = [
    { label: '22–25 Mei 2026 (4 Hari)', dateValue: '2026-05-22' },
    { label: '26–29 Mei 2026 (4 Hari)', dateValue: '2026-05-26' },
    { label: '30 Mei–2 Juni 2026 (4 Hari)', dateValue: '2026-05-30' }
  ];

  // Pre-select schedule date closest to user's selected bookingDate
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(
    pkg.bookingDate || availableSchedules[0].dateValue
  );

  useEffect(() => {
    if (pkg.bookingDate) {
      const match = availableSchedules.find(s => s.dateValue >= pkg.bookingDate);
      if (match) {
        setSelectedScheduleDate(match.dateValue);
      }
    }
  }, [pkg.bookingDate]);

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
    const selectedAddOnObjects = addOnsList.filter(a => selectedAddOnIds.includes(a.id));
    const updatedPkg = {
      ...pkg,
      bookingGuests: guestsCount,
      bookingDate: selectedScheduleDate,
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
        
        {/* Tiket.com Style 5-Photo Grid Gallery (Clean without overlay badges) */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '30px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '185px 185px', gap: '8px', height: '378px', backgroundColor: '#e2e8f0' }}>
            
            {/* Photo 1 (Main Big Left) */}
            <div 
              onClick={() => openLightbox(0)}
              style={{ gridColumn: '1 / 2', gridRow: '1 / 3', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
            >
              <img 
                src={photos[0]} 
                alt="Main preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'; }}
              />
            </div>

            {/* Photo 2 (Top Middle) */}
            <div 
              onClick={() => openLightbox(1)}
              style={{ gridColumn: '2 / 3', gridRow: '1 / 2', cursor: 'pointer', overflow: 'hidden' }}
            >
              <img 
                src={photos[1]} 
                alt="Sub 1" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80'; }}
              />
            </div>

            {/* Photo 3 (Bottom Middle) */}
            <div 
              onClick={() => openLightbox(2)}
              style={{ gridColumn: '2 / 3', gridRow: '2 / 3', cursor: 'pointer', overflow: 'hidden' }}
            >
              <img 
                src={photos[2]} 
                alt="Sub 2" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'; }}
              />
            </div>

            {/* Photo 4 (Top Right) */}
            <div 
              onClick={() => openLightbox(3)}
              style={{ gridColumn: '3 / 4', gridRow: '1 / 2', cursor: 'pointer', overflow: 'hidden' }}
            >
              <img 
                src={photos[3]} 
                alt="Sub 3" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80'; }}
              />
            </div>

            {/* Photo 5 (Bottom Right with "Lihat semua foto" overlay) */}
            <div 
              onClick={() => openLightbox(4)}
              style={{ gridColumn: '3 / 4', gridRow: '2 / 3', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
            >
              <img 
                src={photos[4]} 
                alt="Sub 4" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80'; }}
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
                <Layers size={16} /> Lihat semua foto
              </div>
            </div>

          </div>
        </div>

        {/* Content Layout: Left Details, Right Fixed Booking Card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', alignItems: 'flex-start' }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Title & Info */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>
                {pkg.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#64748b' }}>
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
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: isChecked ? '1.5px solid #007bff' : '1px solid #cbd5e1',
                        backgroundColor: isChecked ? '#f0f7ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAddOn(addon.id)}
                          style={{ width: '16px', height: '16px', accentColor: '#007bff', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a' }}>
                          {addon.name}
                        </span>
                      </div>
                      <strong style={{ fontSize: '13.5px', color: '#007bff' }}>
                        +{formatIDR(addon.price)}
                      </strong>
                    </label>
                  );
                })}
              </div>
            </div>

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

              {/* Add New Review Form */}
              <div style={{ backgroundColor: '#f0f9ff', borderRadius: '14px', padding: '20px', border: '1px solid #bae6fd' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0369a1', margin: '0 0 12px 0' }}>
                  Tulis Ulasan & Rating Anda
                </h3>

                {reviewSubmittedNotice && (
                  <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '14px' }}>
                    ✓ Ulasan Anda berhasil diterbitkan! Terima kasih atas masukan Anda.
                  </div>
                )}

                <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        Nama Anda <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="Nama Anda..."
                        value={newReviewName}
                        onChange={(e) => setNewReviewName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        Beri Rating
                      </label>
                      <div style={{ display: 'flex', gap: '4px', paddingTop: '6px' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReviewRating(star)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                          >
                            <Star size={20} fill={star <= newReviewRating ? '#f59e0b' : 'none'} color={star <= newReviewRating ? '#f59e0b' : '#cbd5e1'} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Komentar / Pengalaman <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Bagikan pengalaman liburan Anda bersama TripKita..."
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                    }}
                  >
                    Kirim Ulasan
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* Right Fixed Booking Card with 3 Jadwal Keberangkatan Dropdown */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', position: 'sticky', top: '90px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Harga per orang</span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#007bff', marginBottom: '18px' }}>
              {formatIDR(pkg.price)}
            </div>

            {/* Jadwal Keberangkatan Dropdown Select (Strictly 3 Closest Schedules) */}
            <div style={{ backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px', border: '1px solid #dbeafe' }}>
              <label style={{ fontSize: '12px', color: '#007bff', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Jadwal Keberangkatan (3 Terdekat)
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
                {availableSchedules.map((sch) => (
                  <option key={sch.dateValue} value={sch.dateValue}>
                    {sch.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Guest Counter (+ / -) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                <span>Jumlah Peserta</span>
                <span style={{ color: '#10b981' }}>Sisa {availableSeats} seat</span>
              </label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 14px' }}>
                <Users size={18} color="#94a3b8" />
                <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  {guestsCount} Orang
                </span>
                
                <button 
                  onClick={() => setGuestsCount((prev) => Math.max(1, prev - 1))}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', cursor: 'pointer' }}
                >
                  -
                </button>
                <button 
                  onClick={() => setGuestsCount((prev) => Math.min(availableSeats, prev + 1))}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
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
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
              }}
            >
              Pesan Sekarang
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
            {photos.map((img, i) => (
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
                <img src={img} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
