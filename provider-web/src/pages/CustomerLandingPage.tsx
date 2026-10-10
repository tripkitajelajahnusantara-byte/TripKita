import React, { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { getTripImage, getHighlightsForPackage, OFFICIAL_CATEGORIES, OFFICIAL_TRIP_TYPES } from '../utils/tripImages';
import { Search, ShieldCheck, CreditCard, RotateCcw, MessageSquare, Star, MapPin, Calendar, LayoutGrid, Heart, Users, ChevronRight, Share2, Target } from 'lucide-react';
import { getWishlistStorage, toggleWishlistStorage } from '../utils/wishlist';
import { ShareModal } from '../components/ShareModal';
import { TripImage } from '../components/TripImage';
import { SkeletonCards } from '../components/Skeleton';

import heroImage from '../assets/hero.jpg';

import { useCancellationRefundDays } from '../utils/checkoutConfig';
import { filterCustomerVisiblePackages, isPackageExpired, sortBookableFirst } from '../utils/publicPackages';
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
  includedFacilities?: string;
  duration?: number;
  minGuests?: number;
  meetingPoint?: string;
  meetingPointLatitude?: number;
  meetingPointLongitude?: number;
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

const PACKAGES_PER_PAGE = 12;

// Warna badge & highlight per tipe trip pada kartu beranda.
const TRIP_TYPE_STYLES: Record<string, { badge: string; pillText: string; pillBg: string }> = {
  'Open Trip': { badge: '#007bff', pillText: '#0284c7', pillBg: '#e0f2fe' },
  'Private Trip': { badge: '#0284c7', pillText: '#0284c7', pillBg: '#e0f2fe' },
  Honeymoon: { badge: '#e11d48', pillText: '#be123c', pillBg: '#ffe4e6' },
  Family: { badge: '#d97706', pillText: '#b45309', pillBg: '#fef3c7' },
  Corporate: { badge: '#059669', pillText: '#047857', pillBg: '#d1fae5' },
};


const getTodayIsoDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CustomerLandingPage: React.FC = () => {
  const refundDays = useCancellationRefundDays();
  const { navigateTo, setSelectedPackageForDetail, setSearchParams, customerProfile, openAuthModal } = useNavigation();
  const [packages, setPackages] = useState<TripPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PACKAGES_PER_PAGE);

  const openTripPlanner = () => customerProfile
    ? navigateTo('rencana-trip')
    : openAuthModal('login', () => navigateTo('rencana-trip'));

  // Search widget states
  const [searchDest, setSearchDest] = useState('');
  const [searchDate, setSearchDate] = useState(getTodayIsoDate()); 
  const [searchType, setSearchType] = useState('Semua Tipe');   
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

  const [loadError, setLoadError] = useState('');

  // Hanya paket asli dari backend; tidak ada paket contoh saat gagal/kosong
  const loadPackages = async (): Promise<{ list: TripPackage[]; error: string }> => {
    try {
      const data = await request('/public/packages');
      const list: TripPackage[] = Array.isArray(data) ? data : [];
      return { list: sortBookableFirst(filterCustomerVisiblePackages(list)), error: '' };
    } catch (err: unknown) {
      console.error('Failed to load packages:', err);
      return { list: [], error: err instanceof Error && err.message ? err.message : 'Gagal memuat paket wisata.' };
    }
  };

  const applyPackages = (result: { list: TripPackage[]; error: string }) => {
    setPackages(result.list);
    setLoadError(result.error);
    setLoading(false);
  };

  const fetchPackages = () => {
    setLoading(true);
    setLoadError('');
    loadPackages().then(applyPackages);
  };

  useEffect(() => {
    let cancelled = false;
    loadPackages().then((result) => {
      if (!cancelled) applyPackages(result);
    });
    return () => { cancelled = true; };
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

  const [selectedPackageForShare, setSelectedPackageForShare] = useState<TripPackage | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleSharePackage = (e: React.MouseEvent, pkg: TripPackage) => {
    e.stopPropagation();
    setSelectedPackageForShare(pkg);
    setIsShareModalOpen(true);
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

  const getImageUrl = (pkgId: number, name: string, category: string, uploadedImage?: string) => {
    return getTripImage(pkgId, name, category, uploadedImage);
  };

  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // Home page grid displays all packages of every trip type; search filter executes on search page
  const processedPackages = packages;

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
            Cari Trip Wisata <br />
            Indonesia dengan Mudah
          </h1>
          <p style={{ fontSize: 'clamp(14px, 2.5vw, 16.5px)', color: '#f1f5f9', marginBottom: '24px', fontWeight: 600, maxWidth: '500px', lineHeight: '1.5', textShadow: '0 1px 6px rgba(0, 0, 0, 0.5)' }}>
            Bandingkan paket open trip dan private trip dari mitra lokal, lalu pesan dan bayar online.
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

      {/* Rencana Trip: tampil untuk semua pengunjung; tamu diminta masuk/daftar dulu */}
      <div className="container" style={{ maxWidth: '1120px', margin: '0 auto 30px auto', padding: '0 20px' }}>
        <div
          className="planner-cta"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            flexWrap: 'wrap',
            background: 'linear-gradient(135deg, #e6f4f4 0%, #f0f9ff 100%)',
            border: '1px solid #b9e3e3',
            borderRadius: '16px',
            padding: '20px 24px'
          }}
        >
          <div style={{ backgroundColor: '#0f8b8d', color: '#ffffff', borderRadius: '14px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Target size={24} />
          </div>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
              Rencana Trip &amp; Target Tabungan
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
              Susun trip impian bersama pasangan, teman, atau keluarga. Tentukan target budget dan pantau progres tabunganmu.
            </p>
          </div>
          <div className="planner-cta-action" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={openTripPlanner}
              style={{ backgroundColor: '#0f8b8d', color: '#ffffff', border: 'none', padding: '11px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(15, 139, 141, 0.25)' }}
            >
              {customerProfile ? 'Buka Rencana Trip' : 'Mulai Rencanakan Trip'} <ChevronRight size={16} />
            </button>
            {!customerProfile && (
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>Gratis, cukup masuk atau daftar akun</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Trips Section */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        pkg={selectedPackageForShare} 
      />

      <div id="main-trips-section" className="container" style={{ marginTop: '45px', maxWidth: '1120px', margin: '45px auto 0 auto', padding: '0 20px' }}>
        
        {loading ? (
          <SkeletonCards count={8} minWidth={235} label="Memuat paket wisata" />
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '16px', color: '#64748b', border: '1px solid #fecaca' }}>
            <h3 style={{ color: '#0f172a', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Gagal Memuat Paket Wisata</h3>
            <p style={{ margin: '0 0 16px 0' }}>{loadError}</p>
            <button
              type="button"
              onClick={() => fetchPackages()}
              style={{ padding: '10px 22px', backgroundColor: '#007bff', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              Coba Lagi
            </button>
          </div>
        ) : processedPackages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#ffffff', borderRadius: '16px', color: '#64748b', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: '#0f172a', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Paket Wisata Tidak Ditemukan</h3>
            <p>Coba pilih tanggal lain atau gunakan filter destinasi yang berbeda.</p>
          </div>
        ) : (
          <div style={{ marginBottom: '45px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Semua trip
                </h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Open Trip, Private Trip, Honeymoon, Family, dan Corporate dari mitra terverifikasi</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchParams({ destination: '', date: '', type: 'Semua Tipe', category: '' });
                  navigateTo('cari-trip');
                }}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: '13px', color: '#007bff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                Cari &amp; filter trip <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))', gap: '20px' }}>
              {processedPackages.slice(0, visibleCount).map((pkg) => {
                const isFavorite = wishlistIds.includes(Number(pkg.id));
                const highlights = getHighlightsForPackage(pkg).slice(0, 3);
                const typeStyle = TRIP_TYPE_STYLES[pkg.tripType] || TRIP_TYPE_STYLES['Open Trip'];
                const isOpenTrip = !pkg.tripType || pkg.tripType === 'Open Trip';
                const expired = isPackageExpired(pkg);
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
                      <TripImage
                        src={getImageUrl(pkg.id, pkg.name, pkg.category, pkg.images || pkg.image || (pkg as any).imageUrl)}
                        alt={pkg.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: expired ? 'grayscale(1)' : undefined, opacity: expired ? 0.8 : 1 }}
                      />
                      {expired && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: 'rgba(15, 23, 42, 0.85)',
                            color: '#ffffff',
                            padding: '4px 9px',
                            borderRadius: '6px',
                            fontSize: '10.5px',
                            fontWeight: '700'
                          }}
                        >
                          Jadwal sudah lewat
                        </span>
                      )}
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                        <button
                          onClick={(e) => handleSharePackage(e, pkg)}
                          title="Bagikan Paket"
                          aria-label="Bagikan paket"
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
                          aria-label="Simpan ke favorit"
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
                          backgroundColor: expired ? '#64748b' : typeStyle.badge,
                          color: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: '700'
                        }}
                      >
                        {isOpenTrip
                          ? (pkg.tripType ? `${pkg.tripType} • ${pkg.category}` : pkg.category)
                          : `${pkg.tripType} • Min ${Math.max(1, Number(pkg.minGuests) || 1)} Orang`}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1, justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: expired ? '#64748b' : '#0f172a', margin: 0, minHeight: '36px', lineHeight: '1.3' }}>
                          {pkg.name}
                        </h4>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          <MapPin size={12} color="#94a3b8" />
                          <span>{pkg.destination}</span>
                        </div>

                        {/* 3 Key Highlights - Vertical Clean Pills (Exactly 3, Never Cut Off) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', minHeight: '72px' }}>
                          {highlights.map((hl, hIdx) => (
                            <div
                              key={hIdx}
                              style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                color: expired ? '#64748b' : typeStyle.pillText,
                                backgroundColor: expired ? '#f1f5f9' : typeStyle.pillBg,
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
                          <span>{pkg.rating > 0 ? pkg.rating.toFixed(1) : 'Baru'}</span>
                        </div>

                        {expired ? (
                          <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#94a3b8' }}>Tidak bisa dipesan</span>
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#007bff' }}>
                            {formatIDR(pkg.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {processedPackages.length > visibleCount && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PACKAGES_PER_PAGE)}
                  style={{ backgroundColor: '#ffffff', color: '#0284c7', border: '1.5px solid #0284c7', padding: '10px 26px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Tampilkan lebih banyak ({processedPackages.length - visibleCount} lagi)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feature Grid Ribbon */}
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
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Mitra diverifikasi</strong>
            <span style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>Admin TemenTrip memeriksa setiap mitra sebelum paketnya bisa dipesan</span>
          </div>

          {/* Item 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#e0f2fe', padding: '12px', borderRadius: '50%', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RotateCcw size={24} />
            </div>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Aturan refund jelas</strong>
            <span style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{refundDays ? `Batal paling lambat ${refundDays} hari sebelum trip` : 'Batal sesuai batas kebijakan refund'}, atau trip dibatalkan mitra: dana kembali penuh</span>
          </div>

          {/* Item 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#e0f2fe', padding: '12px', borderRadius: '50%', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={24} />
            </div>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Transfer & upload bukti</strong>
            <span style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>Kuota ditahan 24 jam hingga bukti pembayaran dikirim</span>
          </div>

          {/* Item 4 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#e0f2fe', padding: '12px', borderRadius: '50%', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={24} />
            </div>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Ulasan dari peserta</strong>
            <span style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>Ulasan hanya bisa ditulis setelah trip selesai</span>
          </div>
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
          .planner-cta {
            padding: 18px 16px !important;
          }
          .planner-cta-action,
          .planner-cta-action button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
