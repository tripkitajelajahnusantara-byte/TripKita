import React, { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { getTripImage, getHighlightsForPackage } from '../utils/tripImages';
import { TripImage } from '../components/TripImage';
import { ArrowLeft, MapPin, Star, Package, MessageSquare, Award } from 'lucide-react';

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

interface PublicProviderProfile {
  id: number;
  businessName: string;
  businessCategory: string;
  operationalProvince: string;
  operationalCity: string;
  description: string;
  isVerified: boolean;
  rating: number;
  totalTravelers: number;
  createdAt: string;
}

interface PublicReview {
  id: number;
  packageId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export const ProviderPublicProfilePage: React.FC = () => {
  const { navigateTo, selectedProviderId, setSelectedPackageForDetail } = useNavigation();
  const [providerInfo, setProviderInfo] = useState<PublicProviderProfile | null>(null);
  const [packages, setPackages] = useState<TripPackage[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [activeTab, setActiveTab] = useState<'packages' | 'reviews'>('packages');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchProviderDetail = async () => {
      if (!selectedProviderId) {
        setLoadError('Provider tidak dipilih.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError('');
      try {
        const [profile, allPkgs] = await Promise.all([
          request(`/public/providers/${selectedProviderId}`),
          request('/public/packages')
        ]);
        const filtered = Array.isArray(allPkgs)
          ? allPkgs.filter((p: TripPackage) => p.providerId === selectedProviderId)
          : [];
        const reviewResponses = await Promise.all(
          filtered.map((pkg: TripPackage) => request(`/public/reviews/package/${pkg.id}`).catch(() => []))
        );
        if (!cancelled) {
          setProviderInfo(profile);
          setPackages(filtered);
          setReviews(reviewResponses.flat().filter(Boolean));
        }
      } catch (err) {
        console.error('Failed to load provider packages:', err);
        if (!cancelled) {
          setProviderInfo(null);
          setPackages([]);
          setReviews([]);
          setLoadError('Profil provider tidak tersedia.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProviderDetail();
    return () => { cancelled = true; };
  }, [selectedProviderId]);

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleSelectPackage = (pkg: TripPackage) => {
    setSelectedPackageForDetail(pkg);
    navigateTo('paket-detail');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
        <p>Memuat profil mitra provider...</p>
      </div>
    );
  }
  if (!providerInfo) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
        <p>{loadError || 'Profil provider tidak tersedia.'}</p>
        <button type="button" onClick={() => navigateTo('cari-trip')}>Kembali ke daftar trip</button>
      </div>
    );
  }

  // Banner memakai foto asli paket pertama; tanpa foto -> gradien polos (bukan foto stok)
  const bannerImage = packages.length > 0 ? getTripImage(packages[0]) : '';

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '80px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Banner Cover */}
      <div 
        style={{ 
          position: 'relative', 
          height: '240px', 
          backgroundImage: bannerImage
            ? `linear-gradient(to bottom, rgba(15,23,42,0.4), rgba(15,23,42,0.8)), url(${JSON.stringify(bannerImage)})`
            : 'linear-gradient(135deg, #0c4a6e 0%, #0f172a 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          color: '#ffffff'
        }}
      >
        <div className="container" style={{ maxWidth: '1080px', margin: '0 auto', padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Back Button */}
          <button 
            onClick={() => navigateTo('paket-detail')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#0f172a',
              cursor: 'pointer',
              width: 'fit-content',
              backdropFilter: 'blur(4px)'
            }}
          >
            <ArrowLeft size={16} /> Kembali ke Paket Trip
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container" style={{ maxWidth: '1080px', margin: '-60px auto 0 auto', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        
        {/* Provider Profile Header Card */}
        <div 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '20px', 
            padding: '28px', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)', 
            border: '1px solid #e2e8f0',
            marginBottom: '30px'
          }}
        >
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Provider Logo Avatar */}
            <div 
              style={{ 
                width: '88px', 
                height: '88px', 
                borderRadius: '20px', 
                backgroundColor: '#007bff', 
                color: '#ffffff', 
                fontWeight: '900', 
                fontSize: '32px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 6px 18px rgba(0,123,255,0.3)',
                flexShrink: 0
              }}
            >
              {providerInfo.businessName.charAt(0)}
            </div>

            {/* Provider Basic Info */}
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {providerInfo.businessName}
                </h1>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={15} color="#007bff" /> {providerInfo.operationalCity}, {providerInfo.operationalProvince}
                </span>
                <span>•</span>
                <span style={{ color: '#0f172a', fontWeight: '600' }}>{providerInfo.businessCategory}</span>
                <span>•</span>
                <span>Bergabung sejak {new Date(providerInfo.createdAt).getFullYear()}</span>
              </div>

              <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 16px 0', lineHeight: '1.6' }}>
                {providerInfo.description}
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '16px', 
              marginTop: '24px', 
              paddingTop: '20px', 
              borderTop: '1px solid #f1f5f9' 
            }}
          >
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#f59e0b', fontWeight: '800', fontSize: '18px' }}>
                <Star size={18} fill="#f59e0b" color="#f59e0b" /> {providerInfo.rating > 0 ? `${providerInfo.rating.toFixed(1)} / 5.0` : 'Belum ada rating'}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Rating Kepuasan Wisatawan</span>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ color: '#007bff', fontWeight: '800', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Package size={18} /> {packages.length} Paket
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Paket Wisata Aktif</span>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ color: '#10b981', fontWeight: '800', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Award size={18} /> {providerInfo.totalTravelers}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Wisatawan Diberangkatkan</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px' }}>
          <button 
            onClick={() => setActiveTab('packages')}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '700',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'packages' ? '3px solid #007bff' : '3px solid transparent',
              color: activeTab === 'packages' ? '#007bff' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Package size={16} /> Paket Wisata ({packages.length})
          </button>

          <button 
            onClick={() => setActiveTab('reviews')}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '700',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'reviews' ? '3px solid #007bff' : '3px solid transparent',
              color: activeTab === 'reviews' ? '#007bff' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <MessageSquare size={16} /> Ulasan & Rating ({reviews.length})
          </button>
        </div>

        {/* TAB 1: Paket Wisata dari Provider Ini */}
        {activeTab === 'packages' && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
              Daftar Paket Wisata Diselenggarakan Oleh {providerInfo.businessName}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
              {packages.map((pkg) => {
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
                    <div style={{ position: 'relative', height: '150px', overflow: 'hidden' }}>
                      <TripImage
                        src={getTripImage(pkg.id, pkg.name, pkg.category, (pkg as any).images || (pkg as any).image || (pkg as any).imageUrl)}  
                        alt={pkg.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span 
                        style={{ 
                          position: 'absolute', 
                          bottom: '10px', 
                          left: '10px', 
                          backgroundColor: '#007bff', 
                          color: '#ffffff', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontSize: '10px', 
                          fontWeight: '700' 
                        }}
                      >
                        {pkg.tripType || pkg.category}
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

                        {/* 3 Key Highlights Badges */}
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
                                textOverflow: 'ellipsis'
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
                          <span>{pkg.rating > 0 ? pkg.rating.toFixed(1) : 'Belum ada'}</span>
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
        )}

        {/* TAB 2: Ulasan & Rating Pengunjung */}
        {activeTab === 'reviews' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
              Ulasan Pengunjung dari Trip {providerInfo.businessName}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviews.length === 0 && (
                <p style={{ color: '#64748b', margin: 0 }}>Belum ada ulasan terverifikasi untuk provider ini.</p>
              )}
              {reviews.map((rev) => (
                <div key={rev.id} style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#007bff', color: '#ffffff', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        W
                      </div>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>Wisatawan terverifikasi</strong>
                        <span style={{ fontSize: '11px', color: '#007bff', fontWeight: '600' }}>Paket: {packages.find(pkg => pkg.id === rev.packageId)?.name || 'Paket wisata'}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end', marginBottom: '2px' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={13} fill={i < rev.rating ? '#f59e0b' : 'none'} color={i < rev.rating ? '#f59e0b' : '#cbd5e1'} />
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(rev.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '13.5px', color: '#334155', margin: 0, lineHeight: '1.5' }}>
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
