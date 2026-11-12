import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCustomAlert } from '../components/CustomAlertModal';
import { request } from '../utils/api';
import { useActionLock } from '../utils/useActionLock';
import { getTripImage } from '../utils/tripImages';
import { TripImage } from '../components/TripImage';
import { User, Heart, Star, Save, Trash2, ChevronRight, MapPin, LoaderCircle } from 'lucide-react';
import { IndonesianPhoneInput } from '../components/IndonesianPhoneInput';
import { isValidIndonesianMobilePhone } from '../utils/phone';
import { filterCustomerVisiblePackages, isPackageExpired } from '../utils/publicPackages';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { useI18n } from '../i18n';

export const CustomerSettingsPage: React.FC = () => {
  const { customerProfile, setCustomerProfile, navigateTo, setSelectedPackageForDetail } = useNavigation();
  const { showAlert } = useCustomAlert();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'akun' | 'favorit' | 'review'>('akun');
  // Kunci berbasis ref agar klik/enter ganda tidak mengirim dua PUT profil.
  const { pending, isBusy, run } = useActionLock();
  const submitting = pending === 'save-profile';

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
    let cancelled = false;
    const loadWishlist = async () => {
      try {
        const storedWishlist = localStorage.getItem('tripkita_customer_wishlist');
        const storedItems = storedWishlist ? JSON.parse(storedWishlist) : [];
        if (!Array.isArray(storedItems) || storedItems.length === 0) {
          setWishlistItems([]);
          return;
        }

        // Favorit berisi snapshot lokal. Cocokkan ID-nya dengan katalog
        // publik terbaru agar paket nonaktif/provider nonaktif ikut hilang.
        // Paket yang jadwalnya lewat tetap ada dan ditandai tidak bisa dipesan.
        const publicPackages = await request('/public/packages');
        const visibleById = new Map(
          filterCustomerVisiblePackages(Array.isArray(publicPackages) ? publicPackages : [])
            .map((pkg: any) => [Number(pkg.id), pkg])
        );
        const currentItems = storedItems
          .map((item: any) => visibleById.get(Number(item.id)))
          .filter(Boolean);
        if (cancelled) return;
        setWishlistItems(currentItems);
        localStorage.setItem('tripkita_customer_wishlist', JSON.stringify(currentItems));
      } catch (e) {
        console.error(e);
        if (!cancelled) setWishlistItems([]);
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
        setReviewItems([]);
      }
    } catch (e) {
      console.error(e);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('tripkita_wishlist_updated', loadWishlist);
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    if (!namaLengkap.trim()) {
      showAlert({ type: 'error', message: t('Nama Lengkap wajib diisi.', 'Full name is required.') });
      return;
    }
    if (!isValidIndonesianMobilePhone(whatsapp)) {
      showAlert({ type: 'error', message: t('Masukkan 9–12 digit nomor seluler setelah +62, diawali angka 8.', 'Enter 9–12 digits of your mobile number after +62, starting with 8.') });
      return;
    }

    await run('save-profile', async () => {
      try {
        const payload = {
          picName: namaLengkap,
          name: namaLengkap,
          whatsapp: whatsapp,
          gender: gender,
          birthDate: birthDate
        };

        const updated = await request('/provider/profile', {
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
          title: t('Profil Berhasil Diperbarui', 'Profile Updated'),
          message: t('Data akun Anda telah berhasil disimpan di database.', 'Your account details have been saved.')
        });
      } catch (err: any) {
        console.error(err);
        // Profil tidak ditulis ke state/localStorage saat server menolak atau
        // tidak terjangkau; sebelumnya kegagalan ditampilkan sebagai sukses
        // sehingga data di perangkat berbeda dengan data akun sebenarnya.
        // Isian form tetap dibiarkan agar pengguna bisa langsung mencoba lagi.
        showAlert({
          type: 'error',
          title: t('Profil Gagal Disimpan', 'Profile Not Saved'),
          message: err instanceof Error && err.message
            ? err.message
            : t('Perubahan profil belum tersimpan. Periksa koneksi Anda lalu coba lagi.', 'Your profile changes were not saved. Check your connection and try again.')
        });
      }
    });
  };

  const handleRemoveWishlist = (id: number | string) => {
    const updated = wishlistItems.filter(item => Number(item.id) !== Number(id));
    setWishlistItems(updated);
    localStorage.setItem('tripkita_customer_wishlist', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tripkita_wishlist_updated', { detail: updated }));
    showAlert({ type: 'success', message: t('Paket berhasil dihapus dari Favorit.', 'Trip removed from Favorites.') });
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '32px 0 80px 0', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
            {t('Pengaturan Akun & Profil', 'Account & Profile Settings')}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            {t('Kelola data pribadi, paket favorit yang Anda simpan, dan riwayat ulasan ulasan perjalanan Anda.', 'Manage your personal details, saved favorite trips, and your trip reviews.')}
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
                  {namaLengkap || t('Pelanggan TemenTrip', 'TemenTrip Traveler')}
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
                  <span>{t('Akun', 'Account')}</span>
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
                  <span>{t('Opsi Favorit', 'Favorites')}</span>
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
                  <span>{t('Kumpulan Review', 'My Reviews')}</span>
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
                  {t('Data Diri Akun', 'Personal Details')}
                </h2>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      {t('Nama Lengkap', 'Full Name')}
                    </label>
                    <input
                      type="text"
                      value={namaLengkap}
                      onChange={(e) => setNamaLengkap(e.target.value)}
                      placeholder={t('Masukkan nama lengkap sesuai identitas', 'Enter your full name as shown on your ID')}
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
                        {t('Alamat Email (Read-only)', 'Email Address (Read-only)')}
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
                        {t('Nomor HP / WhatsApp', 'Phone / WhatsApp Number')}
                      </label>
                      <IndonesianPhoneInput value={whatsapp} onChange={setWhatsapp} required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        {t('Jenis Kelamin', 'Gender')}
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
                        <option value="Laki-laki">{t('Laki-laki', 'Male')}</option>
                        <option value="Perempuan">{t('Perempuan', 'Female')}</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        {t('Tanggal Lahir', 'Date of Birth')}
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
                      disabled={isBusy}
                      aria-busy={submitting}
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
                      {submitting
                        ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> {t('Menyimpan...', 'Saving...')}</>
                        : <><Save size={16} /> {t('Simpan Perubahan', 'Save Changes')}</>}
                    </button>
                  </div>
                </form>

                <div style={{ marginTop: '28px', padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>{t('Bahasa', 'Language')}</strong>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>{t('Bahasa tampilan situs TemenTrip', 'Display language for the TemenTrip site')}</span>
                  </div>
                  <LanguageSwitch />
                </div>
              </div>
            )}

            {/* TAB 2: OPSI FAVORIT (WISHLIST) */}
            {activeTab === 'favorit' && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  {t('Paket Wisata Favorit Anda', 'Your Favorite Trips')}
                </h2>

                {wishlistItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <div style={{ backgroundColor: '#fee2e2', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                      <Heart size={30} color="#ef4444" />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                      {t('Belum Ada Paket Favorit', 'No Favorites Yet')}
                    </h3>
                    <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '20px' }}>
                      {t('Anda belum menambahkan paket wisata apa pun ke daftar favorit Anda.', "You haven't added any trips to your favorites yet.")}
                    </p>
                    <button
                      onClick={() => navigateTo('cari-trip')}
                      style={{ padding: '10px 24px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      {t('Jelajahi Paket Wisata', 'Explore Trips')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {wishlistItems.map((pkg: any) => {
                      const expired = isPackageExpired(pkg);
                      return (
                      <div key={pkg.id} style={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                          <TripImage
                            src={getTripImage(pkg.id, pkg.name || '', pkg.category || '', pkg.image)}
                            alt={pkg.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: expired ? 'grayscale(1)' : undefined, opacity: expired ? 0.8 : 1 }}
                          />
                          {expired && (
                            <span style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#ffffff', padding: '4px 9px', borderRadius: '6px', fontSize: '10.5px', fontWeight: '700' }}>
                              {t('Jadwal sudah lewat', 'Date has passed')}
                            </span>
                          )}
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
                              {t('Lihat Detail', 'View Details')}
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: KUMPULAN REVIEW */}
            {activeTab === 'review' && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  {t('Kumpulan Review & Ulasan Anda', 'Your Reviews')}
                </h2>

                {reviewItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <div style={{ backgroundColor: '#fef3c7', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                      <Star size={30} color="#d97706" />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                      {t('Belum Ada Ulasan', 'No Reviews Yet')}
                    </h3>
                    <p style={{ fontSize: '13.5px', color: '#64748b' }}>
                      {t('Ulasan yang Anda berikan setelah menyelesaikan trip akan tampil di sini.', 'Reviews you write after finishing a trip will show up here.')}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {reviewItems.map((rev: any, idx: number) => (
                      <div key={idx} style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
                              {t('Ulasan Perjalanan', 'Trip Review')}
                            </span>
                            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0 0' }}>
                              {rev.packageName || 'TemenTrip Package'}
                            </h4>
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {rev.date || t('Terbaru', 'Recent')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              fill={i < (rev.rating || 0) ? '#f59e0b' : '#e2e8f0'}
                              color={i < (rev.rating || 0) ? '#f59e0b' : '#e2e8f0'}
                            />
                          ))}
                        </div>

                        <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
                          "{rev.comment || rev.content || t('Tidak ada komentar.', 'No comment.')}"
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
