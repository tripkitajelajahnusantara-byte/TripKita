import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCustomAlert } from '../components/CustomAlertModal';
import { request } from '../utils/api';
import { User, Heart, Star, Save, Trash2, ChevronRight, MapPin } from 'lucide-react';

export const CustomerSettingsPage: React.FC = () => {
  const { customerProfile, setCustomerProfile, navigateTo, setSelectedPackageForDetail } = useNavigation();
  const { showAlert } = useCustomAlert();

  const [activeTab, setActiveTab] = useState<'akun' | 'favorit' | 'review'>('akun');
  const [submitting, setSubmitting] = useState(false);

  // Profile Form State
  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [gender, setGender] = useState('Laki-laki');
  const [birthDate, setBirthDate] = useState('');

  // Favorit & Review State
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [reviewItems, setReviewItems] = useState<any[]>([]);

  useEffect(() => {
    if (customerProfile) {
      setNamaLengkap(customerProfile.picName || customerProfile.businessName || '');
      setEmail(customerProfile.email || '');
      setWhatsapp(customerProfile.whatsapp || '');
      setGender(customerProfile.gender || 'Laki-laki');
      setBirthDate(customerProfile.birthDate || '');
    }
  }, [customerProfile]);

  useEffect(() => {
    const loadWishlist = () => {
      try {
        const storedWishlist = localStorage.getItem('tripkita_customer_wishlist');
        if (storedWishlist) {
          setWishlistItems(JSON.parse(storedWishlist));
        } else {
          setWishlistItems([]);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadWishlist();

    window.addEventListener('tripkita_wishlist_updated', loadWishlist);

    // Load Reviews
    try {
      const storedReviews = localStorage.getItem('tripkita_customer_reviews');
      if (storedReviews) {
        setReviewItems(JSON.parse(storedReviews));
      } else {
        // Mock review if none saved
        setReviewItems([
          {
            id: 1,
            packageName: 'Open Trip Gunung Bromo',
            rating: 5,
            comment: 'Pengalaman trip luar biasa! Pemandunya sangat ramah, ramah anak, dan tepat waktu. Pemandangan sunrise Bromo tiada duanya.',
            date: '2026-08-20'
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    }

    return () => window.removeEventListener('tripkita_wishlist_updated', loadWishlist);
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaLengkap.trim()) {
      showAlert({ type: 'error', message: 'Nama Lengkap wajib diisi.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        picName: namaLengkap,
        name: namaLengkap,
        whatsapp: whatsapp,
        gender: gender,
        birthDate: birthDate
      };

      const updated = await request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      const updatedProfile = {
        ...(customerProfile || {}),
        ...updated,
        picName: namaLengkap,
        whatsapp: whatsapp,
        gender: gender,
        birthDate: birthDate
      };

      setCustomerProfile(updatedProfile as any);
      localStorage.setItem('tementrip_customer', JSON.stringify(updatedProfile));
      localStorage.setItem('tripkita_customer', JSON.stringify(updatedProfile));

      showAlert({
        type: 'success',
        title: 'Profil Berhasil Diperbarui',
        message: 'Data akun Anda telah berhasil disimpan di database.'
      });
    } catch (err: any) {
      console.error(err);
      // Fallback local update if offline
      const updatedProfile = {
        ...(customerProfile || {}),
        picName: namaLengkap,
        whatsapp: whatsapp,
        gender: gender,
        birthDate: birthDate
      };
      setCustomerProfile(updatedProfile as any);
      localStorage.setItem('tementrip_customer', JSON.stringify(updatedProfile));
      localStorage.setItem('tripkita_customer', JSON.stringify(updatedProfile));

      showAlert({
        type: 'success',
        title: 'Profil Berhasil Disimpan',
        message: 'Data akun Anda telah tersimpan.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveWishlist = (id: number | string) => {
    const updated = wishlistItems.filter(item => Number(item.id) !== Number(id));
    setWishlistItems(updated);
    localStorage.setItem('tripkita_customer_wishlist', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tripkita_wishlist_updated', { detail: updated }));
    showAlert({ type: 'success', message: 'Paket berhasil dihapus dari Favorit.' });
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '32px 0 80px 0', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
            Pengaturan Akun & Profil
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Kelola data pribadi, paket favorit yang Anda simpan, dan riwayat ulasan ulasan perjalanan Anda.
          </p>
        </div>

        {/* Layout Grid: Left Tabs & Right Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '28px', alignItems: 'start' }}>
          
          {/* Sidebar Tab Navigation (tiket.com style) */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: '#e0f2fe', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={22} color="#0284c7" />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '14.5px', color: '#0f172a' }}>
                  {namaLengkap || 'Pelanggan TripKita'}
                </strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {email || 'Traveler'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('akun')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: activeTab === 'akun' ? '#e0f2fe' : 'transparent',
                  color: activeTab === 'akun' ? '#0284c7' : '#475569',
                  fontWeight: activeTab === 'akun' ? '800' : '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={18} />
                  <span>Akun</span>
                </div>
                <ChevronRight size={16} color={activeTab === 'akun' ? '#0284c7' : '#94a3b8'} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('favorit')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: activeTab === 'favorit' ? '#e0f2fe' : 'transparent',
                  color: activeTab === 'favorit' ? '#0284c7' : '#475569',
                  fontWeight: activeTab === 'favorit' ? '800' : '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Heart size={18} />
                  <span>Opsi Favorit</span>
                </div>
                <ChevronRight size={16} color={activeTab === 'favorit' ? '#0284c7' : '#94a3b8'} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('review')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: activeTab === 'review' ? '#e0f2fe' : 'transparent',
                  color: activeTab === 'review' ? '#0284c7' : '#475569',
                  fontWeight: activeTab === 'review' ? '800' : '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Star size={18} />
                  <span>Kumpulan Review</span>
                </div>
                <ChevronRight size={16} color={activeTab === 'review' ? '#0284c7' : '#94a3b8'} />
              </button>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            
            {/* TAB 1: AKUN */}
            {activeTab === 'akun' && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  Data Diri Akun
                </h2>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={namaLengkap}
                      onChange={(e) => setNamaLengkap(e.target.value)}
                      placeholder="Masukkan nama lengkap sesuai identitas"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        Alamat Email (Read-only)
                      </label>
                      <input
                        type="email"
                        value={email}
                        readOnly
                        disabled
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          fontSize: '14px',
                          color: '#64748b',
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        Nomor HP / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="Contoh: 08123456789"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '14px',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        Jenis Kelamin
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '14px',
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        Tanggal Lahir
                      </label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '14px',
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: '12px 28px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '800',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                      }}
                    >
                      <Save size={16} /> {submitting ? 'Memproses...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: OPSI FAVORIT (WISHLIST) */}
            {activeTab === 'favorit' && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  Paket Wisata Favorit Anda
                </h2>

                {wishlistItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <div style={{ backgroundColor: '#fee2e2', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                      <Heart size={30} color="#ef4444" />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                      Belum Ada Paket Favorit
                    </h3>
                    <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '20px' }}>
                      Anda belum menambahkan paket wisata apa pun ke daftar favorit Anda.
                    </p>
                    <button
                      onClick={() => navigateTo('cari-trip')}
                      style={{ padding: '10px 24px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Jelajahi Paket Wisata
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {wishlistItems.map((pkg: any) => (
                      <div key={pkg.id} style={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                          <img src={pkg.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'} alt={pkg.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            onClick={() => handleRemoveWishlist(pkg.id)}
                            style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(255, 255, 255, 0.9)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} color="#ef4444" />
                          </button>
                        </div>
                        <div style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                            <MapPin size={14} color="#0284c7" />
                            <span>{pkg.destination || 'Indonesia'}</span>
                          </div>
                          <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                            {pkg.name}
                          </h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '15px', color: '#0284c7', fontWeight: '800' }}>
                              Rp {(pkg.price || 0).toLocaleString('id-ID')}
                            </strong>
                            <button
                              onClick={() => {
                                setSelectedPackageForDetail(pkg);
                                navigateTo('paket-detail');
                              }}
                              style={{ padding: '6px 14px', backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                            >
                              Lihat Detail
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: KUMPULAN REVIEW */}
            {activeTab === 'review' && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  Kumpulan Review & Ulasan Anda
                </h2>

                {reviewItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <div style={{ backgroundColor: '#fef3c7', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                      <Star size={30} color="#d97706" />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                      Belum Ada Ulasan
                    </h3>
                    <p style={{ fontSize: '13.5px', color: '#64748b' }}>
                      Ulasan yang Anda berikan setelah menyelesaikan trip akan tampil di sini.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {reviewItems.map((rev: any, idx: number) => (
                      <div key={idx} style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
                              Ulasan Perjalanan
                            </span>
                            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0 0' }}>
                              {rev.packageName || 'TripKita Package'}
                            </h4>
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {rev.date || 'Terbaru'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              fill={i < (rev.rating || 5) ? '#f59e0b' : '#e2e8f0'}
                              color={i < (rev.rating || 5) ? '#f59e0b' : '#e2e8f0'}
                            />
                          ))}
                        </div>

                        <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
                          "{rev.comment || rev.content || 'Pelayanan sangat memuaskan!'}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
