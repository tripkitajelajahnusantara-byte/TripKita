import React, { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { getTripImage } from '../utils/tripImages';
import { Star, MapPin, Calendar, ChevronRight, ArrowLeft } from 'lucide-react';

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
}

export const CustomerSearchPage: React.FC = () => {
  const { navigateTo, setSelectedPackageForDetail, searchParams } = useNavigation();
  const [packages, setPackages] = useState<TripPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Rekomendasi');

  const DEFAULT_PACKAGES: TripPackage[] = [
    { id: 1, providerId: 1, name: "Open Trip Gunung Bromo", destination: "Probolinggo, Jawa Timur", category: "Gunung", tripType: "Open Trip", price: 350000, quotaMin: 5, quotaUsed: 3, quotaMax: 15, startDate: "2026-05-22", endDate: "2026-05-24", schedule: "22 Mei 2026 - 24 Mei 2026 (3 Hari)", status: "Aktif", rating: 4.8 },
    { id: 2, providerId: 1, name: "Open Trip Pulau Tidung", destination: "Kepulauan Seribu, Jakarta", category: "Pantai", tripType: "Open Trip", price: 450000, quotaMin: 4, quotaUsed: 2, quotaMax: 12, startDate: "2026-05-22", endDate: "2026-05-24", schedule: "22 Mei 2026 - 24 Mei 2026 (3 Hari)", status: "Aktif", rating: 4.7 },
    { id: 3, providerId: 1, name: "Trip Curug Cilember", destination: "Bogor, Jawa Barat", category: "Curug", tripType: "Open Trip", price: 275000, quotaMin: 5, quotaUsed: 4, quotaMax: 10, startDate: "2026-05-22", endDate: "2026-05-23", schedule: "22 Mei 2026 - 23 Mei 2026 (2 Hari)", status: "Aktif", rating: 4.6 },
    { id: 4, providerId: 1, name: "Bandung City Tour", destination: "Bandung, Jawa Barat", category: "City Tour", tripType: "Open Trip", price: 420000, quotaMin: 4, quotaUsed: 3, quotaMax: 15, startDate: "2026-05-22", endDate: "2026-05-24", schedule: "22 Mei 2026 - 24 Mei 2026 (3 Hari)", status: "Aktif", rating: 4.9 },
    { id: 5, providerId: 1, name: "Wisata Budaya Suku Baduy", destination: "Lebak, Banten", category: "Budaya", tripType: "Open Trip", price: 380000, quotaMin: 5, quotaUsed: 2, quotaMax: 15, startDate: "2026-05-22", endDate: "2026-05-24", schedule: "22 Mei 2026 - 24 Mei 2026 (3 Hari)", status: "Aktif", rating: 4.8 },
    { id: 6, providerId: 1, name: "Open Trip Ranu Kumbolo", destination: "Malang, Jawa Timur", category: "Gunung", tripType: "Open Trip", price: 550000, quotaMin: 6, quotaUsed: 4, quotaMax: 15, startDate: "2026-05-22", endDate: "2026-05-25", schedule: "22 Mei 2026 - 25 Mei 2026 (4 Hari)", status: "Aktif", rating: 4.9 },
    { id: 7, providerId: 1, name: "Wisata Pantai Tanjung Karang Palu", destination: "Palu, Sulawesi Tengah", category: "Pantai", tripType: "Open Trip", price: 850000, quotaMin: 4, quotaUsed: 2, quotaMax: 10, startDate: "2026-05-22", endDate: "2026-05-25", schedule: "22 Mei 2026 - 25 Mei 2026 (4 Hari)", status: "Aktif", rating: 4.7 },
    { id: 8, providerId: 1, name: "Yogyakarta City Tour", destination: "Yogyakarta, DI Yogyakarta", category: "City Tour", tripType: "Open Trip", price: 490000, quotaMin: 4, quotaUsed: 3, quotaMax: 15, startDate: "2026-05-22", endDate: "2026-05-24", schedule: "22 Mei 2026 - 24 Mei 2026 (3 Hari)", status: "Aktif", rating: 4.8 }
  ];

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const data = await request('/public/packages');
        if (Array.isArray(data) && data.length > 0) {
          const activePkgs = data.filter((p: TripPackage) => p.status === 'Aktif');
          setPackages(activePkgs.length > 0 ? activePkgs : DEFAULT_PACKAGES);
        } else {
          setPackages(DEFAULT_PACKAGES);
        }
      } catch (err) {
        console.error('Failed to load search packages:', err);
        setPackages(DEFAULT_PACKAGES);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getImageUrl = (pkgId: number, name: string, category: string) => {
    return getTripImage(pkgId, name, category);
  };

  const getBadgeColor = (_category: string) => {
    return { bg: '#007bff', text: '#ffffff' };
  };

  const handleSelectPackage = (pkg: TripPackage) => {
    const updatedPkg = {
      ...pkg,
      bookingDate: searchParams.date || pkg.startDate || '2026-05-22'
    };
    setSelectedPackageForDetail(updatedPkg);
    navigateTo('paket-detail');
  };

  // Filter packages based on active search parameters
  let processedPackages = packages.filter((pkg) => {
    if (searchParams.destination && !pkg.destination.toLowerCase().includes(searchParams.destination.toLowerCase())) {
      return false;
    }
    if (searchParams.category && searchParams.category !== 'Semua Kategori' && !pkg.category.toLowerCase().includes(searchParams.category.toLowerCase())) {
      return false;
    }
    if (searchParams.type && searchParams.type !== 'Semua Tipe' && pkg.tripType !== searchParams.type) {
      return false;
    }
    return true;
  });

  // Dynamic sorting based on dropdown selection
  if (sortBy === 'Termahal') {
    processedPackages.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'Termurah') {
    processedPackages.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'Rating Tertinggi') {
    processedPackages.sort((a, b) => (b.rating || 4.8) - (a.rating || 4.8));
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Daftar Paket Open Trip
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Menampilkan <strong>{processedPackages.length}</strong> paket wisata
              {searchParams.destination ? ` untuk "${searchParams.destination}"` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
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
                boxShadow: '0 2px 4px rgba(0,123,255,0.08)'
              }}
            >
              <option value="Rekomendasi">Rekomendasi</option>
              <option value="Termahal">Termahal</option>
              <option value="Termurah">Termurah</option>
              <option value="Rating Tertinggi">Rating Tertinggi</option>
            </select>
          </div>
        </div>

        {/* List of Landscape Package Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <p>Memuat daftar paket wisata...</p>
          </div>
        ) : processedPackages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Tidak Ada Paket Ditemukan</h3>
            <p style={{ fontSize: '13px' }}>Coba cari destinasi atau tanggal yang lain.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {processedPackages.map((pkg) => {
              const badge = getBadgeColor(pkg.category);
              const availableSeats = pkg.quotaMax - pkg.quotaUsed;

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
                    <img 
                      src={getImageUrl(pkg.id, pkg.name, pkg.category)} 
                      alt={pkg.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
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
                          {pkg.category}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                        <MapPin size={14} color="#94a3b8" />
                        <span>{pkg.destination}</span>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                        {pkg.description || 'Spesialis open trip gunung dengan pengalaman tim profesional dan fasilitas lengkap.'}
                      </p>

                      {/* Schedule */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                        <Calendar size={14} color="#94a3b8" />
                        <span>Jadwal tersedia: <strong>22–25 Mei 2026 • 23–26 Mei 2026</strong></span>
                      </div>
                    </div>

                    {/* Bottom Row: Rating + Seats & Action Button */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b', fontWeight: '700' }}>
                          <Star size={14} fill="#f59e0b" color="#f59e0b" /> {pkg.rating > 0 ? pkg.rating.toFixed(1) : '4.8'}
                        </span>
                        <span style={{ color: '#94a3b8' }}>(120 ulasan)</span>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <span style={{ color: availableSeats < 5 ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                          Sisa {availableSeats > 0 ? availableSeats : 4} seat
                        </span>
                      </div>

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
      `}</style>
    </div>
  );
};
