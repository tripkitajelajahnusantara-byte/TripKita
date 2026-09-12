import React, { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { getTripImage, getHighlightsForPackage, OFFICIAL_CATEGORIES, OFFICIAL_TRIP_TYPES } from '../utils/tripImages';
import { Search, ShieldCheck, CreditCard, Headset, ThumbsUp, Star, MapPin, Calendar, LayoutGrid, Heart, Users, ChevronRight, Share2 } from 'lucide-react';
import { getWishlistStorage, toggleWishlistStorage } from '../utils/wishlist';

import heroImage from '../assets/hero.jpg';

interface TripPackage {
  id: number;
  providerId: number;
  name: string;
  destination: string;
  category: string;
  tripType: string;
  price: number;
  quotaMin: number;
  quotaUsed: number;
  quotaMax: number;
  startDate: string;
  endDate: string;
  schedule: string;
  status: string;
  rating: number;
  description?: string;
  image?: string;
  images?: string;
  highlights?: string[];
}

// 38 Provinsi Indonesia (Ported 100% from customer-mobile/lib/screens/home_screen.dart)
const indonesiaProvinces = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 
  'Jambi', 'Sumatera Selatan', 'Bangka Belitung', 'Bengkulu', 'Lampung',
  'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
  'Bali', 'Nusa Tenggara Barat (NTB)', 'Nusa Tenggara Timur (NTT)',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Maluku', 'Maluku Utara',
  'Papua', 'Papua Barat', 'Papua Barat Daya', 'Papua Tengah', 'Papua Pegunungan', 'Papua Selatan'
];

// Synced Trip Types & Categories from official constants

const tripTypesList = ['Semua Tipe', ...OFFICIAL_TRIP_TYPES];
const categoriesList = ['Semua Kategori', ...OFFICIAL_CATEGORIES];


const getTodayIsoDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDynamicScheduleStr = (daysFromToday: number, durationDays: number) => {
  const d1 = new Date();
  d1.setDate(d1.getDate() + daysFromToday);
  const d2 = new Date(d1);
  d2.setDate(d2.getDate() + durationDays - 1);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const m1 = months[d1.getMonth()];
  const m2 = months[d2.getMonth()];

  if (m1 === m2) {
    return `${d1.getDate()} ${m1} ${d1.getFullYear()} - ${d2.getDate()} ${m2} ${d2.getFullYear()} (${durationDays} Hari)`;
  }
  return `${d1.getDate()} ${m1} - ${d2.getDate()} ${m2} ${d2.getFullYear()} (${durationDays} Hari)`;
};

export const CustomerLandingPage: React.FC = () => {
  const { navigateTo, setSelectedPackageForDetail, setSearchParams } = useNavigation();
  const [packages, setPackages] = useState<TripPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Search widget states
  const [searchDest, setSearchDest] = useState('');
  const [searchDate, setSearchDate] = useState(getTodayIsoDate()); 
  const [searchType, setSearchType] = useState('Open Trip');   
  const [searchCategory, setSearchCategory] = useState('Semua Kategori');

  const [dateError, setDateError] = useState('');

  // Minimum date for date picker (today - no backdates)
  const todayStr = getTodayIsoDate();

  const handleSearchSubmit = () => {
    if (!searchDate) {
      setDateError('Tanggal wajib diisi');
      return;
    }
    setDateError('');
    setSearchParams({
      destination: searchDest,
      date: searchDate,
      type: searchType,
      category: searchCategory
    });
    navigateTo('cari-trip');
  };

const DEFAULT_PACKAGES: TripPackage[] = [
  {
    id: 1,
    providerId: 1,
    name: "Open Trip Gunung Bromo",
    destination: "Probolinggo, Jawa Timur",
    category: "Gunung",
    tripType: "Open Trip",
    price: 350000,
    quotaMin: 5,
    quotaUsed: 3,
    quotaMax: 15,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: getDynamicScheduleStr(0, 3),
    status: "Aktif",
    rating: 4.8
  },
  {
    id: 2,
    providerId: 2,
    name: "Open Trip Pulau Tidung",
    destination: "Kepulauan Seribu, Jakarta",
    category: "Pantai",
    tripType: "Open Trip",
    price: 450000,
    quotaMin: 4,
    quotaUsed: 2,
    quotaMax: 12,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: getDynamicScheduleStr(0, 3),
    status: "Aktif",
    rating: 4.7
  },
  {
    id: 3,
    providerId: 3,
    name: "Trip Curug Cilember",
    destination: "Bogor, Jawa Barat",
    category: "Curug",
    tripType: "Open Trip",
    price: 275000,
    quotaMin: 5,
    quotaUsed: 4,
    quotaMax: 10,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: getDynamicScheduleStr(0, 2),
    status: "Aktif",
    rating: 4.6
  },
  {
    id: 4,
    providerId: 4,
    name: "Bandung City Tour",
    destination: "Bandung, Jawa Barat",
    category: "City Tour",
    tripType: "Open Trip",
    price: 420000,
    quotaMin: 4,
    quotaUsed: 3,
    quotaMax: 15,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: getDynamicScheduleStr(0, 3),
    status: "Aktif",
    rating: 4.9
  },
  {
    id: 5,
    providerId: 1,
    name: "Private Trip Bromo Sunrise & Savana",
    destination: "Probolinggo, Jawa Timur",
    category: "Gunung",
    tripType: "Private Trip",
    price: 1250000,
    quotaMin: 2,
    quotaUsed: 1,
    quotaMax: 10,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: "Fleksibel (Pilihan Customer)",
    status: "Aktif",
    rating: 4.9,
    highlights: ['🌋 Golden Sunrise Bromo', '🚙 Hardtop Jeep 4x4', '☕ Kopi Klotok Pasuruan']
  },
  {
    id: 6,
    providerId: 8,
    name: "Private Trip Wisata Raja Ampat 4D3N",
    destination: "Papua Barat",
    category: "Diving & Snorkeling",
    tripType: "Private Trip",
    price: 3850000,
    quotaMin: 2,
    quotaUsed: 0,
    quotaMax: 8,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: "Fleksibel (Pilihan Customer)",
    status: "Aktif",
    rating: 5.0,
    highlights: ['🪸 Diving Wayag & Piaynemo', '🛥️ Speedboat Charter', '🏨 Resort Ocean View']
  },
  {
    id: 7,
    providerId: 1,
    name: "Honeymoon Romantic Bali Villa 3D2N",
    destination: "Bali",
    category: "Pantai",
    tripType: "Honeymoon",
    price: 2950000,
    quotaMin: 2,
    quotaUsed: 0,
    quotaMax: 10,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: "Fleksibel (Pilihan Customer)",
    status: "Aktif",
    rating: 5.0,
    highlights: ['👩‍❤️‍👨 Floating Breakfast', '🏡 Private Pool Villa', '🌅 Candlelight Sunset']
  },
  {
    id: 8,
    providerId: 2,
    name: "Honeymoon Island Sunset Tidung 3D2N",
    destination: "Kepulauan Seribu, Jakarta",
    category: "Pantai",
    tripType: "Honeymoon",
    price: 1650000,
    quotaMin: 2,
    quotaUsed: 0,
    quotaMax: 10,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: "Fleksibel (Pilihan Customer)",
    status: "Aktif",
    rating: 4.8,
    highlights: ['👩‍❤️‍👨 Cottage Over the Sea', '🌅 Sunset Bridge Walk', '⛵ Private Boat & Dinner']
  },
  {
    id: 9,
    providerId: 8,
    name: "Family Vacation Yogyakarta & Borobudur",
    destination: "Yogyakarta, DI Yogyakarta",
    category: "Wisata Budaya & Sejarah",
    tripType: "Family",
    price: 850000,
    quotaMin: 3,
    quotaUsed: 3,
    quotaMax: 15,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: "Fleksibel (Pilihan Customer)",
    status: "Aktif",
    rating: 4.9,
    highlights: ['🏛️ Candi Borobudur Pro', '👨‍👩‍👧‍👦 Ramah Anak & Lansia', '🚌 Mobil Family AC Private']
  },
  {
    id: 10,
    providerId: 3,
    name: "Family Nature Retreat Cilember 2D1N",
    destination: "Bogor, Jawa Barat",
    category: "Curug",
    tripType: "Family",
    price: 650000,
    quotaMin: 3,
    quotaUsed: 3,
    quotaMax: 12,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: "Fleksibel (Pilihan Customer)",
    status: "Aktif",
    rating: 4.7,
    highlights: ['🌊 7 Tingkat Air Terjun', '🌲 Hutan Pinus Asri', '🔥 Campfire Family BBQ']
  },
  {
    id: 11,
    providerId: 4,
    name: "Corporate Gathering & Outbound Bandung",
    destination: "Bandung, Jawa Barat",
    category: "City Tour",
    tripType: "Corporate",
    price: 750000,
    quotaMin: 10,
    quotaUsed: 15,
    quotaMax: 100,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: "Fleksibel (Pilihan Customer)",
    status: "Aktif",
    rating: 4.9,
    highlights: ['🎯 Outbound Team Building', '🚌 Bus Luxury VIP AC', '🍢 Gala Dinner & Music']
  },
  {
    id: 12,
    providerId: 3,
    name: "Corporate Team Building Bogor 2D1N",
    destination: "Bogor, Jawa Barat",
    category: "Wisata Budaya & Sejarah",
    tripType: "Corporate",
    price: 680000,
    quotaMin: 10,
    quotaUsed: 20,
    quotaMax: 80,
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    schedule: "Fleksibel (Pilihan Customer)",
    status: "Aktif",
    rating: 4.8,
    highlights: ['🏆 Team Bonding Games', '🏨 Hotel Bintang 4 Resort', '🎤 Gala Night & BBQ']
  }
];

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const data = await request('/public/packages');
        if (Array.isArray(data) && data.length > 0) {
          const activePkgs = data.filter((p: TripPackage) => 
            !p.status || p.status === 'Aktif' || p.status === 'Published' || p.status === 'published'
          );
          setPackages(activePkgs.length > 0 ? activePkgs : data);
        } else {
          setPackages(DEFAULT_PACKAGES);
        }
      } catch (err) {
        console.error('Failed to load packages:', err);
        setPackages(DEFAULT_PACKAGES);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const [wishlistIds, setWishlistIds] = useState<number[]>(() => 
    getWishlistStorage().map(item => Number(item.id))
  );

  useEffect(() => {
    const handleWishlistUpdate = () => {
      setWishlistIds(getWishlistStorage().map(item => Number(item.id)));
    };
    window.addEventListener('tripkita_wishlist_updated', handleWishlistUpdate);
    return () => window.removeEventListener('tripkita_wishlist_updated', handleWishlistUpdate);
  }, []);

  const handleSelectPackage = (pkg: TripPackage) => {
    const updatedPkg = {
      ...pkg,
      bookingDate: searchDate
    };
    setSelectedPackageForDetail(updatedPkg);
    navigateTo('paket-detail');
  };

  const toggleFavorite = (e: React.MouseEvent, pkg: TripPackage) => {
    e.stopPropagation();
    const updated = toggleWishlistStorage(pkg);
    setWishlistIds(updated.map(i => Number(i.id)));
  };

  const [shareToast, setShareToast] = useState('');
  const handleSharePackage = (e: React.MouseEvent, pkg: TripPackage) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}#/paket-detail?id=${pkg.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareToast(`Link paket "${pkg.name}" berhasil disalin!`);
        setTimeout(() => setShareToast(''), 3000);
      });
    } else {
      setShareToast(`Link paket disalin: ${shareUrl}`);
      setTimeout(() => setShareToast(''), 4000);
    }
  };

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return 'Pilih tanggal';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getImageUrl = (pkgId: number, name: string, category: string) => {
    return getTripImage(pkgId, name, category);
  };

  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // Home page grid displays all available packages statically; search filter executes on search page
  const processedPackages = packages;

  // Single cohesive, user-friendly brand color for all badges
  const getBadgeColor = (_category: string) => {
    return { bg: '#007bff', text: '#ffffff' };
  };

  // Review counts mapping matching Gambar 1 reference image
  const getReviewCount = (pkgId: number) => {
    const counts: { [key: number]: number } = {
      1: 120, // Bromo
      2: 89,  // Tidung
      3: 64,  // Cilember
      4: 72,  // Bandung
      5: 56,  // Ranu Kumbolo
      6: 98,  // Karimunjawa / Baduy
      7: 43,  // Palu / Leuwi Hejo
      8: 81   // Yogyakarta
    };
    return counts[pkgId] || 50;
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '40px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Hero Section with vivid hero.jpg background & elegant text contrast */}
      <div 
        className="hero-section"
        style={{
          position: 'relative',
          backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.45) 45%, rgba(15, 23, 42, 0.1) 80%), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          minHeight: '420px',
          height: 'auto',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px 60px 20px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '1120px', zIndex: 2, textAlign: 'left' }}>
          <h1 className="hero-title" style={{ fontSize: 'clamp(24px, 5vw, 44px)', fontWeight: '800', marginBottom: '16px', lineHeight: '1.2', color: '#ffffff', letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0, 0, 0, 0.4)' }}>
            Cari Open Trip <br />
            Indonesia dengan Mudah
          </h1>
          <p style={{ fontSize: 'clamp(14px, 2.5vw, 16.5px)', color: '#f1f5f9', marginBottom: '24px', fontWeight: 600, maxWidth: '500px', lineHeight: '1.5', textShadow: '0 1px 6px rgba(0, 0, 0, 0.5)' }}>
            Temukan berbagai open trip seru dan tour guide terpercaya di seluruh Indonesia.
          </p>
          <button 
            onClick={() => {
              const el = document.getElementById('main-trips-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ 
              backgroundColor: '#0284c7', 
              color: '#ffffff', 
              border: 'none', 
              padding: '13px 30px', 
              fontSize: '15px', 
              fontWeight: '700', 
              borderRadius: '10px', 
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
          >
            Explore Trip
          </button>
        </div>
      </div>

      {/* Floating Search Widget Card matching Gambar 1 */}
      <div className="container" style={{ marginTop: '-45px', position: 'relative', zIndex: 10, maxWidth: '1120px', padding: '0 20px', marginBottom: '30px' }}>
        <div 
          className="search-widget-card"
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '16px', 
            padding: '24px 28px', 
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            {/* Destination Selection */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                <MapPin size={16} color="#007bff" /> Destination
              </label>
              <select 
                value={searchDest} 
                onChange={(e) => setSearchDest(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value="">Pilih destinasi</option>
                {indonesiaProvinces.map(dest => (
                  <option key={dest} value={dest}>{dest}</option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                <Calendar size={16} color="#007bff" /> Tanggal <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div 
                onClick={() => {
                  if (dateInputRef.current) {
                    if (typeof dateInputRef.current.showPicker === 'function') {
                      dateInputRef.current.showPicker();
                    } else {
                      dateInputRef.current.focus();
                    }
                  }
                }}
                style={{ position: 'relative', width: '100%', cursor: 'pointer' }}
              >
                <div
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: dateError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: searchDate ? '#0f172a' : '#94a3b8',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box'
                  }}
                >
                  <span>{formatDateIndo(searchDate)}</span>
                  <Calendar size={16} color="#007bff" />
                </div>
                <input 
                  ref={dateInputRef}
                  type="date" 
                  min={todayStr}
                  value={searchDate}
                  onChange={(e) => {
                    setSearchDate(e.target.value);
                    if (e.target.value) setDateError('');
                  }}
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
              {dateError && (
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', display: 'block', marginTop: '4px' }}>
                  {dateError}
                </span>
              )}
            </div>

            {/* Type Trip Selection */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                <Users size={16} color="#007bff" /> Type Trip
              </label>
              <select 
                value={searchType} 
                onChange={(e) => setSearchType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {tripTypesList.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Category Selection */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                <LayoutGrid size={16} color="#007bff" /> Kategori
              </label>
              <select 
                value={searchCategory} 
                onChange={(e) => setSearchCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '22px' }}>
            <button 
              onClick={handleSearchSubmit}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '12px 48px',
                fontSize: '15px',
                fontWeight: '700',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
            >
              <Search size={18} /> Cari Trip
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Trips Section */}
      {shareToast && (
        <div 
          style={{ 
            position: 'fixed', 
            bottom: '24px', 
            right: '24px', 
            backgroundColor: '#0f172a', 
            color: '#ffffff', 
            padding: '12px 20px', 
            borderRadius: '12px', 
            fontSize: '13.5px', 
            fontWeight: '700', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Share2 size={16} color="#38bdf8" />
          <span>{shareToast}</span>
        </div>
      )}

      <div id="main-trips-section" className="container" style={{ marginTop: '45px', maxWidth: '1120px', margin: '45px auto 0 auto', padding: '0 20px' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <p>Sedang memuat paket wisata terbaik...</p>
          </div>
        ) : processedPackages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#ffffff', borderRadius: '16px', color: '#64748b', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: '#0f172a', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Paket Wisata Tidak Ditemukan</h3>
            <p>Coba pilih tanggal lain atau gunakan filter destinasi yang berbeda.</p>
          </div>
        ) : (
          <div>
            {/* Trip Populer (Open Trip) Section */}
            <div style={{ marginBottom: '45px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    Trip Populer (Open Trip) <span style={{ color: '#007bff' }}>✦</span>
                  </h2>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Paket wisata gabungan hemat & seru dengan jadwal teratur</span>
                </div>
                <span 
                  onClick={() => {
                    setSearchParams({ destination: '', date: '', type: 'Open Trip', category: '' });
                    navigateTo('cari-trip');
                  }}
                  style={{ fontSize: '13px', color: '#007bff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  Lihat semua <ChevronRight size={14} />
                </span>
              </div>

              {/* 4 Open Trip Packages */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))', gap: '20px' }}>
                {processedPackages.filter(p => p.tripType === 'Open Trip' || !p.tripType).slice(0, 4).map((pkg) => {
                  const badge = getBadgeColor(pkg.category);
                  const isFavorite = wishlistIds.includes(Number(pkg.id));
                  const highlights = getHighlightsForPackage(pkg).slice(0, 3);
                  return (
                    <div 
                      key={pkg.id}
                      onClick={() => handleSelectPackage(pkg)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                      className="trip-card"
                    >
                      {/* Image & Badges */}
                      <div style={{ position: 'relative', height: '150px', overflow: 'hidden', flexShrink: 0 }}>
                        <img 
                          src={getImageUrl(pkg.id, pkg.name, pkg.category)} 
                          alt={pkg.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={(e) => handleSharePackage(e, pkg)}
                            title="Bagikan Paket"
                            style={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: 'none', 
                              borderRadius: '50%', 
                              width: '32px', 
                              height: '32px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Share2 size={15} color="#334155" />
                          </button>

                          <button 
                            onClick={(e) => toggleFavorite(e, pkg)}
                            title="Simpan ke Favorit"
                            style={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: 'none', 
                              borderRadius: '50%', 
                              width: '32px', 
                              height: '32px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : '#64748b'} />
                          </button>
                        </div>
                        <span 
                          style={{ 
                            position: 'absolute', 
                            bottom: '10px', 
                            left: '10px', 
                            backgroundColor: badge.bg, 
                            color: badge.text, 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '10px', 
                            fontWeight: '700' 
                          }}
                        >
                          {pkg.tripType ? `${pkg.tripType} • ${pkg.category}` : pkg.category}
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1, justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0, minHeight: '36px', lineHeight: '1.3' }}>
                            {pkg.name}
                          </h4>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            <MapPin size={12} color="#94a3b8" />
                            <span>{pkg.destination}</span>
                          </div>

                          {/* 3 Key Highlights - Vertical Clean Soft Blue Pills (Exactly 3, Never Cut Off) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', minHeight: '72px' }}>
                            {highlights.map((hl, hIdx) => (
                              <div 
                                key={hIdx} 
                                style={{ 
                                  fontSize: '10px', 
                                  fontWeight: '600', 
                                  color: '#0284c7', 
                                  backgroundColor: '#e0f2fe', 
                                  padding: '3px 8px', 
                                  borderRadius: '5px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {hl}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>
                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            <span>{pkg.rating > 0 ? pkg.rating.toFixed(1) : '4.8'}</span>
                            <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>({getReviewCount(pkg.id)})</span>
                          </div>

                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#007bff' }}>
                            {formatIDR(pkg.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Private Trip & Honeymoon Section */}
            <div style={{ marginBottom: '45px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    Private Trip & Honeymoon Spesial <span style={{ color: '#e11d48' }}>🌹</span>
                  </h2>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Jadwal bebas pilih customer (Min 2 Orang) • Fasilitas eksklusif & privat</span>
                </div>
                <span 
                  onClick={() => {
                    setSearchParams({ destination: '', date: '', type: 'Private Trip', category: '' });
                    navigateTo('cari-trip');
                  }}
                  style={{ fontSize: '13px', color: '#007bff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  Lihat semua <ChevronRight size={14} />
                </span>
              </div>

              {/* 4 Private & Honeymoon Packages */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))', gap: '20px' }}>
                {processedPackages.filter(p => p.tripType === 'Private Trip' || p.tripType === 'Honeymoon').slice(0, 4).map((pkg) => {
                  const isFavorite = wishlistIds.includes(Number(pkg.id));
                  const highlights = getHighlightsForPackage(pkg).slice(0, 3);
                  return (
                    <div 
                      key={pkg.id}
                      onClick={() => handleSelectPackage(pkg)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                      className="trip-card"
                    >
                      {/* Image & Badges */}
                      <div style={{ position: 'relative', height: '150px', overflow: 'hidden', flexShrink: 0 }}>
                        <img 
                          src={getImageUrl(pkg.id, pkg.name, pkg.category)} 
                          alt={pkg.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={(e) => handleSharePackage(e, pkg)}
                            title="Bagikan Paket"
                            style={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: 'none', 
                              borderRadius: '50%', 
                              width: '32px', 
                              height: '32px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Share2 size={15} color="#334155" />
                          </button>

                          <button 
                            onClick={(e) => toggleFavorite(e, pkg)}
                            title="Simpan ke Favorit"
                            style={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: 'none', 
                              borderRadius: '50%', 
                              width: '32px', 
                              height: '32px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : '#64748b'} />
                          </button>
                        </div>
                        <span 
                          style={{ 
                            position: 'absolute', 
                            bottom: '10px', 
                            left: '10px', 
                            backgroundColor: pkg.tripType === 'Honeymoon' ? '#e11d48' : '#0284c7', 
                            color: '#ffffff', 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '10px', 
                            fontWeight: '700' 
                          }}
                        >
                          {pkg.tripType} • Min {pkg.quotaMin || 2} Orang
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1, justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0, minHeight: '36px', lineHeight: '1.3' }}>
                            {pkg.name}
                          </h4>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            <MapPin size={12} color="#94a3b8" />
                            <span>{pkg.destination}</span>
                          </div>

                          {/* 3 Key Highlights - Vertical Clean Soft Blue Pills (Exactly 3, Never Cut Off) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', minHeight: '72px' }}>
                            {highlights.map((hl, hIdx) => (
                              <div 
                                key={hIdx} 
                                style={{ 
                                  fontSize: '10px', 
                                  fontWeight: '600', 
                                  color: pkg.tripType === 'Honeymoon' ? '#be123c' : '#0284c7', 
                                  backgroundColor: pkg.tripType === 'Honeymoon' ? '#ffe4e6' : '#e0f2fe', 
                                  padding: '3px 8px', 
                                  borderRadius: '5px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {hl}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>
                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            <span>{pkg.rating > 0 ? pkg.rating.toFixed(1) : '5.0'}</span>
                            <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>({getReviewCount(pkg.id)})</span>
                          </div>

                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#007bff' }}>
                            {formatIDR(pkg.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Family & Corporate Trip Section */}
            <div style={{ marginBottom: '50px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    Family & Corporate Gathering <span style={{ color: '#059669' }}>🏢</span>
                  </h2>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Family (Min 3 orang) • Corporate Gathering (Min 10 orang) • Tanggal Bebas Pilih</span>
                </div>
                <span 
                  onClick={() => {
                    setSearchParams({ destination: '', date: '', type: 'Corporate', category: '' });
                    navigateTo('cari-trip');
                  }}
                  style={{ fontSize: '13px', color: '#007bff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  Lihat semua <ChevronRight size={14} />
                </span>
              </div>

              {/* 4 Family & Corporate Packages */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))', gap: '20px' }}>
                {processedPackages.filter(p => p.tripType === 'Family' || p.tripType === 'Corporate').slice(0, 4).map((pkg) => {
                  const isFavorite = wishlistIds.includes(Number(pkg.id));
                  const highlights = getHighlightsForPackage(pkg).slice(0, 3);
                  return (
                    <div 
                      key={pkg.id}
                      onClick={() => handleSelectPackage(pkg)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                      className="trip-card"
                    >
                      {/* Image & Badges */}
                      <div style={{ position: 'relative', height: '150px', overflow: 'hidden', flexShrink: 0 }}>
                        <img 
                          src={getImageUrl(pkg.id, pkg.name, pkg.category)} 
                          alt={pkg.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <button 
                          onClick={(e) => toggleFavorite(e, pkg)}
                          style={{ 
                            position: 'absolute', 
                            top: '10px', 
                            right: '10px', 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: 'none', 
                            borderRadius: '50%', 
                            width: '32px', 
                            height: '32px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : '#64748b'} />
                        </button>
                        <span 
                          style={{ 
                            position: 'absolute', 
                            bottom: '10px', 
                            left: '10px', 
                            backgroundColor: pkg.tripType === 'Corporate' ? '#059669' : '#d97706', 
                            color: '#ffffff', 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '10px', 
                            fontWeight: '700' 
                          }}
                        >
                          {pkg.tripType} • Min {pkg.quotaMin} Orang
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1, justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0, minHeight: '36px', lineHeight: '1.3' }}>
                            {pkg.name}
                          </h4>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            <MapPin size={12} color="#94a3b8" />
                            <span>{pkg.destination}</span>
                          </div>

                          {/* 3 Key Highlights - Vertical Clean Soft Blue/Green Pills (Exactly 3, Never Cut Off) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', minHeight: '72px' }}>
                            {highlights.map((hl, hIdx) => (
                              <div 
                                key={hIdx} 
                                style={{ 
                                  fontSize: '10px', 
                                  fontWeight: '600', 
                                  color: pkg.tripType === 'Corporate' ? '#047857' : '#b45309', 
                                  backgroundColor: pkg.tripType === 'Corporate' ? '#d1fae5' : '#fef3c7', 
                                  padding: '3px 8px', 
                                  borderRadius: '5px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {hl}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>
                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            <span>{pkg.rating > 0 ? pkg.rating.toFixed(1) : '4.9'}</span>
                            <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>({getReviewCount(pkg.id)})</span>
                          </div>

                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#007bff' }}>
                            {formatIDR(pkg.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Feature Grid Ribbon (Footer details matching Gambar 1) */}
        <div 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '16px', 
            padding: '28px 24px', 
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
            border: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}
        >
          {/* Item 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#e0f2fe', padding: '12px', borderRadius: '50%', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} />
            </div>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Aman & Terpercaya</strong>
            <span style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>Provider terverifikasi dan berpengalaman</span>
          </div>

          {/* Item 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#e0f2fe', padding: '12px', borderRadius: '50%', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Headset size={24} />
            </div>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Layanan 24/7</strong>
            <span style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>Customer service siap membantu kapan saja</span>
          </div>

          {/* Item 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#e0f2fe', padding: '12px', borderRadius: '50%', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={24} />
            </div>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Pembayaran Mudah</strong>
            <span style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>Transfer & QR Code praktis dan aman</span>
          </div>

          {/* Item 4 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#e0f2fe', padding: '12px', borderRadius: '50%', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ThumbsUp size={24} />
            </div>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Banyak Pilihan</strong>
            <span style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>Beragam destinasi menarik sesuai keinginanmu</span>
          </div>
        </div>

        {/* Copyright Footer */}
        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          &copy; 2026 TripKita. All rights reserved.
        </div>
      </div>

      <style>{`
        .trip-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.08) !important;
          border-color: #007bff !important;
        }
        @media (max-width: 768px) {
          .hero-section {
            min-height: 320px !important;
            padding: 30px 16px !important;
          }
          .search-widget-card {
            padding: 18px 16px !important;
            margin-top: -30px !important;
          }
        }
      `}</style>
    </div>
  );
};
