import React, { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { getTripImage, getHighlightsForPackage } from '../utils/tripImages';
import { Star, MapPin, Calendar, ChevronRight, ArrowLeft, Heart, Share2 } from 'lucide-react';
import { getWishlistStorage, toggleWishlistStorage } from '../utils/wishlist';
import { ShareModal } from '../components/ShareModal';
import { TripImage } from '../components/TripImage';

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
}

// Format YYYY-MM-DD menjadi "15 Okt 2026" untuk ringkasan jadwal
const formatShortDate = (value?: string) => {
  if (!value) return '';
  const iso = value.slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d} ${months[m - 1]} ${y}`;
};

export const CustomerSearchPage: React.FC = () => {
  const { navigateTo, setSelectedPackageForDetail, searchParams } = useNavigation();
  const [packages, setPackages] = useState<TripPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Rekomendasi');

  const [loadError, setLoadError] = useState('');

  // Hanya paket asli dari backend; tidak ada paket contoh saat gagal/kosong
  const loadPackages = async (): Promise<{ list: TripPackage[]; error: string }> => {
    try {
      const data = await request('/public/packages');
      const list: TripPackage[] = Array.isArray(data) ? data : [];
      return { list: list.filter((p: TripPackage) => p.status === 'Aktif'), error: '' };
    } catch (err: unknown) {
      console.error('Failed to load search packages:', err);
      return { list: [], error: err instanceof Error && err.message ? err.message : 'Gagal memuat daftar paket wisata.' };
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

  const getImageUrl = (pkgId: number, name: string, category: string, uploadedImage?: string) => {
    return getTripImage(pkgId, name, category, uploadedImage);
  };

  const getBadgeColor = (_category: string) => {
    return { bg: '#007bff', text: '#ffffff' };
  };

  const handleSelectPackage = (pkg: TripPackage) => {
    const updatedPkg = {
      ...pkg,
      bookingDate: searchParams.date || pkg.startDate || ''
    };
    setSelectedPackageForDetail(updatedPkg);
    navigateTo('paket-detail');
  };

  // Tipe trip boleh lebih dari satu, dipisah koma (mis. 'Private Trip,Honeymoon')
  const selectedTypes = (searchParams.type && searchParams.type !== 'Semua Tipe')
    ? searchParams.type.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];

  // Filter packages based on active search parameters
  const processedPackages = packages.filter((pkg) => {
    if (searchParams.destination && !pkg.destination.toLowerCase().includes(searchParams.destination.toLowerCase())) {
      return false;
    }
    if (searchParams.category && searchParams.category !== 'Semua Kategori' && !pkg.category.toLowerCase().includes(searchParams.category.toLowerCase())) {
      return false;
    }
    if (selectedTypes.length > 0 && !selectedTypes.includes(pkg.tripType || 'Open Trip')) {
      return false;
    }
    return true;
  });

  // Dynamic sorting based on dropdown selection
  if (sortBy === 'Terpopuler') {
    processedPackages.sort((a, b) => (b.quotaUsed || 0) - (a.quotaUsed || 0));
  } else if (sortBy === 'Rating Tertinggi') {
    processedPackages.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === 'Termahal') {
    processedPackages.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'Termurah') {
    processedPackages.sort((a, b) => a.price - b.price);
  } else if (searchParams.date) {
    // Sort by closest start date to user selected date
    const targetTime = new Date(searchParams.date).getTime();
    processedPackages.sort((a, b) => {
      const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return Math.abs(timeA - targetTime) - Math.abs(timeB - targetTime);
    });
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px 20px 80px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div className="container" style={{ maxWidth: '1080px', margin: '0 auto' }}>
        
        {/* Back Button */}
        <button 
          onClick={() => navigateTo('beranda')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Beranda
        </button>

        {/* Top Header Result Bar with Single Sort Dropdown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Daftar Paket {
                selectedTypes.length > 0
                  ? selectedTypes.join(' & ')
                  : (searchParams.category && searchParams.category !== 'Semua Kategori')
                  ? searchParams.category
                  : 'Wisata'
              }
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Menampilkan <strong>{processedPackages.length}</strong> paket wisata
              {searchParams.destination ? ` untuk "${searchParams.destination}"` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>
              Urutkan berdasarkan:
            </label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                border: '1.5px solid #007bff',
                fontSize: '13px',
                fontWeight: '600',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,123,255,0.08)',
                maxWidth: '100%'
              }}
            >
              <option value="Rekomendasi">Rekomendasi</option>
              <option value="Terpopuler">Terpopuler (Paling Sering Dipesan)</option>
              <option value="Rating Tertinggi">Rating Tertinggi</option>
              <option value="Termurah">Termurah</option>
              <option value="Termahal">Termahal</option>
            </select>
          </div>
        </div>

        {/* List of Landscape Package Cards */}
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          pkg={selectedPackageForShare} 
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <p>Memuat daftar paket wisata...</p>
          </div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #fecaca', color: '#64748b' }}>
            <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Gagal Memuat Daftar Paket</h3>
            <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>{loadError}</p>
            <button
              type="button"
              onClick={() => fetchPackages()}
              style={{ padding: '10px 22px', backgroundColor: '#007bff', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              Coba Lagi
            </button>
          </div>
        ) : processedPackages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Tidak Ada Paket Ditemukan</h3>
            <p style={{ fontSize: '13px' }}>Coba cari destinasi atau tanggal yang lain.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {processedPackages.map((pkg) => {
              // Calculate active reserved seats from pending/paid/completed bookings
              const totalQuotaMax = Math.max(0, Number(pkg.quotaMax) || 0);
              const totalQuotaUsed = Math.max(0, Number(pkg.quotaUsed) || 0);
              const availableSeats = Math.max(0, totalQuotaMax - totalQuotaUsed);
              const periodText = pkg.startDate
                ? `${formatShortDate(pkg.startDate)}${pkg.endDate && pkg.endDate.slice(0, 10) !== pkg.startDate.slice(0, 10) ? ` - ${formatShortDate(pkg.endDate)}` : ''}`
                : '';
              const scheduleText = (pkg.schedule || '').trim() || periodText;

              const badge = getBadgeColor(pkg.category);
              const isFavorite = wishlistIds.includes(Number(pkg.id));

              return (
                <div 
                  key={pkg.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'grid',
                    gridTemplateColumns: '270px 1fr',
                    gap: '24px',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  className="search-card-item"
                >
                  {/* Image Left */}
                  <div style={{ height: '180px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                    <TripImage 
                      src={getImageUrl(pkg.id, pkg.name, pkg.category, pkg.images || pkg.image)} 
                      alt={pkg.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                        width: '34px', 
                        height: '34px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Heart size={18} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : '#64748b'} />
                    </button>
                  </div>

                  {/* Content Right */}
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      {/* Top Row: Category + Price */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span 
                          style={{ 
                            backgroundColor: badge.bg, 
                            color: badge.text, 
                            padding: '4px 12px', 
                            borderRadius: '6px', 
                            fontSize: '11px', 
                            fontWeight: '700' 
                          }}
                        >
                          {pkg.tripType ? `${pkg.tripType} • ${pkg.category}` : pkg.category}
                        </span>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Mulai dari</span>
                          <span style={{ fontSize: '19px', fontWeight: '800', color: '#007bff' }}>
                            {formatIDR(pkg.price)} <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>/ orang</span>
                          </span>
                        </div>
                      </div>

                      {/* Package Title */}
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                        {pkg.name}
                      </h3>

                      {/* Location */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                        <MapPin size={14} color="#94a3b8" />
                        <span>{pkg.destination}</span>
                      </div>

                      {/* 3 Key Highlights - Soft Blue Badges */}
                      <div 
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '10px',
                          flexWrap: 'wrap'
                        }}
                      >
                        {getHighlightsForPackage(pkg).slice(0, 3).map((hl, hIdx) => (
                          <span 
                            key={hIdx}
                            style={{ 
                              fontSize: '11px', 
                              fontWeight: '600', 
                              color: '#0284c7',
                              backgroundColor: '#e0f2fe',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {hl}
                          </span>
                        ))}
                      </div>

                      {/* Description */}
                      {pkg.description && pkg.description.trim() && (
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                          {pkg.description}
                        </p>
                      )}

                      {/* Schedule */}
                      {scheduleText && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                          <Calendar size={14} color="#94a3b8" />
                          <span>Jadwal tersedia: <strong>{scheduleText}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Rating + Seats & Action Buttons (Share & Detail) */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b', fontWeight: '700' }}>
                          <Star size={14} fill="#f59e0b" color="#f59e0b" /> {pkg.rating > 0 ? pkg.rating.toFixed(1) : 'Baru'}
                        </span>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <span style={{ color: availableSeats < 5 ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                          {availableSeats > 0 ? `Sisa ${availableSeats} seat` : 'Kuota habis'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Share Button (Gambar 3) */}
                        <button
                          onClick={(e) => handleSharePackage(e, pkg)}
                          style={{
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            padding: '9px 14px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#e2e8f0';
                            e.currentTarget.style.color = '#0f172a';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.color = '#334155';
                          }}
                        >
                          <Share2 size={14} /> Bagikan
                        </button>

                        <button 
                          onClick={() => handleSelectPackage(pkg)}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1.5px solid #0284c7',
                            color: '#0284c7',
                            padding: '9px 20px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#0284c7';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.color = '#0284c7';
                          }}
                        >
                          Lihat Detail <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <style>{`
        .search-card-item:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.06) !important;
          border-color: #007bff !important;
        }
        @media (max-width: 768px) {
          .search-card-item {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
