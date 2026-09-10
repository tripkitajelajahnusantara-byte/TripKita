import React, { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { getTripImage, getHighlightsForPackage } from '../utils/tripImages';
import { ArrowLeft, MapPin, ShieldCheck, Star, Package, MessageSquare, Phone, Award } from 'lucide-react';

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

export const ProviderPublicProfilePage: React.FC = () => {
  const { navigateTo, selectedProviderId, setSelectedPackageForDetail } = useNavigation();
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [packages, setPackages] = useState<TripPackage[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'packages' | 'reviews'>('packages');
  const [loading, setLoading] = useState(true);

  // Provider Directory Mock Data Map matching all 8 seed providers in DB
  const providerDataMap: { [key: number]: any } = {
    1: {
      id: 1,
      businessName: 'Wisata Bromo Nusantara',
      businessCategory: 'Tour Operator Specialist',
      operationalProvince: 'Jawa Timur',
      operationalCity: 'Probolinggo',
      description: 'Penyedia layanan open trip & private trip Bromo terpercaya dengan pengalaman 10+ tahun. Armada Jeep Hardtop milik sendiri, pemandu lokal berlisensi, dan jaminan dokumentasi foto terbaik.',
      picName: 'Budi Santoso',
      email: 'partner@wisatanusantara.id',
      whatsApp: '+62 812 3456 7890',
      isVerified: true,
      rating: 4.9,
      totalBookings: 1420,
      joinedYear: 2021,
      bannerImage: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
    },
    2: {
      id: 2,
      businessName: 'Tidung Paradise Tour',
      businessCategory: 'Wisata Bahari & Island Hopping',
      operationalProvince: 'DKI Jakarta',
      operationalCity: 'Kepulauan Seribu',
      description: 'Spesialis tour jelajah Kepulauan Seribu dan Pulau Tidung. Menyediakan penginapan pinggir pantai, perahu private, alat snorkeling berkualitas, dan pemandu lokal profesional.',
      picName: 'Ahmad Fauzi',
      email: 'partner2@tidung.id',
      whatsApp: '+62 813 9876 5432',
      isVerified: true,
      rating: 4.8,
      totalBookings: 980,
      joinedYear: 2022,
      bannerImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    },
    3: {
      id: 3,
      businessName: 'Bogor Curug Explorer',
      businessCategory: 'Petualangan Alam & Outdoor',
      operationalProvince: 'Jawa Barat',
      operationalCity: 'Bogor',
      description: 'Mitra eksplorasi wisata air terjun, trekking hutan pinus, dan outbound alam di seputar Bogor. Pilihan utama untuk liburan keluarga & event corporate gathering.',
      picName: 'Rian Hidayat',
      email: 'partner3@cilember.id',
      whatsApp: '+62 815 1122 3344',
      isVerified: true,
      rating: 4.7,
      totalBookings: 760,
      joinedYear: 2022,
      bannerImage: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
    },
    4: {
      id: 4,
      businessName: 'Bandung Juara Tour',
      businessCategory: 'City Tour & Cultural Specialist',
      operationalProvince: 'Jawa Barat',
      operationalCity: 'Bandung',
      description: 'Layanan tour keliling kota Bandung, tempat bersejarah, wisata kuliner, dan destinasi populer. Didukung armada bus VIP & van travel ber-AC dingin.',
      picName: 'Deni Kurniawan',
      email: 'partner4@bandung.id',
      whatsApp: '+62 812 7788 9900',
      isVerified: true,
      rating: 4.9,
      totalBookings: 1150,
      joinedYear: 2020,
      bannerImage: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80',
    },
    8: {
      id: 8,
      businessName: 'Jogja Istimewa Tour',
      businessCategory: 'Wisata Budaya & Heritage Specialist',
      operationalProvince: 'DI Yogyakarta',
      operationalCity: 'Yogyakarta',
      description: 'Penyedia paket liburan Yogyakarta, Borobudur, Candi Prambanan, dan wisata kuliner khas. Menyediakan pemandu ramah anak & lansia serta mobil family AC private.',
      picName: 'Suryo Putro',
      email: 'partner8@jogja.id',
      whatsApp: '+62 811 2233 4455',
      isVerified: true,
      rating: 4.9,
      totalBookings: 1300,
      joinedYear: 2021,
      bannerImage: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80',
    }
  };

  const defaultMockReviews = [
    { id: 1, name: 'Budi Santoso', avatar: 'BS', rating: 5, date: '15 Mei 2026', comment: 'Pelayanan sangat profesional! Tour guidenya tepat waktu dan tempat penjemputan sangat nyaman. Sangat direkomendasikan!', packageName: 'Open Trip Gunung Bromo' },
    { id: 2, name: 'Siti Rahmawati', avatar: 'SR', rating: 5, date: '10 Mei 2026', comment: 'Fasilitas transportasi dingin & bersih, itinerary terlaksana 100% tanpa molor. Pemandu lokalnya ramah sekali.', packageName: 'Private Trip Wisata Raja Ampat' },
    { id: 3, name: 'Andi Wijaya', avatar: 'AW', rating: 4, date: '02 Mei 2026', comment: 'Sangat recommended untuk liburan keluarga. Penginapan bersih dan makanan yang disediakan enak-enak.', packageName: 'Family Vacation Yogyakarta' },
    { id: 4, name: 'Dewi Lestari', avatar: 'DL', rating: 5, date: '28 April 2026', comment: 'Honeymoon trip yang luar biasa manis! Keramahan tim mitra provider ini patut diacungi dua jempol.', packageName: 'Honeymoon Romantic Bali Villa' },
  ];

  useEffect(() => {
    const pId = selectedProviderId || 1;
    const fallbackInfo = providerDataMap[pId] || providerDataMap[1];

    const fetchProviderDetail = async () => {
      try {
        const allPkgs = await request('/public/packages');
        if (Array.isArray(allPkgs) && allPkgs.length > 0) {
          const filtered = allPkgs.filter((p: TripPackage) => p.providerId === pId || pId === 1);
          setPackages(filtered.length > 0 ? filtered : allPkgs.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load provider packages:', err);
      } finally {
        setProviderInfo(fallbackInfo);
        setReviews(defaultMockReviews);
        setLoading(false);
      }
    };

    fetchProviderDetail();
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

  if (loading || !providerInfo) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
        <p>Memuat profil mitra provider...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '80px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Banner Cover */}
      <div 
        style={{ 
          position: 'relative', 
          height: '240px', 
          backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.4), rgba(15,23,42,0.8)), url(${providerInfo.bannerImage})`,
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
                {providerInfo.isVerified && (
                  <span 
                    style={{ 
                      backgroundColor: '#dcfce7', 
                      color: '#166534', 
                      padding: '4px 10px', 
                      borderRadius: '30px', 
                      fontSize: '12px', 
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ShieldCheck size={14} color="#166534" /> Terverifikasi Resmi
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={15} color="#007bff" /> {providerInfo.operationalCity}, {providerInfo.operationalProvince}
                </span>
                <span>•</span>
                <span style={{ color: '#0f172a', fontWeight: '600' }}>{providerInfo.businessCategory}</span>
                <span>•</span>
                <span>Bergabung sejak {providerInfo.joinedYear}</span>
              </div>

              <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 16px 0', lineHeight: '1.6' }}>
                {providerInfo.description}
              </p>

              {/* Direct Contact Button */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <a 
                  href={`https://wa.me/${providerInfo.whatsApp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                  }}
                >
                  <Phone size={16} /> Hubungi via WhatsApp
                </a>
              </div>
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
                <Star size={18} fill="#f59e0b" color="#f59e0b" /> {providerInfo.rating} / 5.0
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
                <Award size={18} /> {providerInfo.totalBookings}+
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
                      <img 
                        src={getTripImage(pkg.id, pkg.name, pkg.category)} 
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
                          <span>{pkg.rating > 0 ? pkg.rating.toFixed(1) : '4.8'}</span>
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
              {reviews.map((rev) => (
                <div key={rev.id} style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#007bff', color: '#ffffff', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {rev.avatar}
                      </div>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>{rev.name}</strong>
                        <span style={{ fontSize: '11px', color: '#007bff', fontWeight: '600' }}>Paket: {rev.packageName}</span>
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
          </div>
        )}
      </div>
    </div>
  );
};
