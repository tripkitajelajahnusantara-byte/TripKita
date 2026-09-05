import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { ArrowLeft, Calendar, Users, CreditCard, AlertCircle, HelpCircle } from 'lucide-react';

export const CustomerConfirmationPage: React.FC = () => {
  const { navigateTo, selectedPackageForDetail, providerProfile, bookingFormData, setSelectedBookingForInvoice } = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  
  // Agreement Checkbox state
  const [isAgreed, setIsAgreed] = useState(false);
  const [agreementError, setAgreementError] = useState('');

  // Confirmation Modal Popup state (YES / NO)
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!selectedPackageForDetail || !bookingFormData) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
        <p>Data pemesanan tidak ditemukan. Silakan isi data pemesan terlebih dahulu.</p>
        <button onClick={() => navigateTo('beranda')} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const pkg = selectedPackageForDetail;
  const { pemesan, peserta } = bookingFormData;
  const guestsCount = peserta.length;
  const selectedAddOns = pkg.selectedAddOns || bookingFormData?.selectedAddOns || [];
  const addOnsTotal = selectedAddOns.reduce((sum: number, a: any) => sum + (a.price || 0), 0);
  const baseCost = pkg.price * guestsCount;
  const totalCost = baseCost + addOnsTotal;

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleOpenConfirmModal = () => {
    if (!isAgreed) {
      setAgreementError('Anda wajib menyetujui Syarat & Ketentuan untuk melanjutkan.');
      return;
    }
    setAgreementError('');
    setShowConfirmModal(true);
  };

  const calculateAge = (dobString?: string) => {
    if (!dobString) return '-';
    const birth = new Date(dobString);
    if (isNaN(birth.getTime())) return '-';
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? `${age} Tahun` : '0 Tahun';
  };

  const handleFinalConfirmBooking = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    let bookingObj: any = null;
    const nowIso = new Date().toISOString();
    const randomCode = `TK-${Math.floor(Math.random() * 90000 + 10000)}`;

    try {
      // Safe tripDate parsing to avoid invalid date toISOString() RangeError crash
      let parsedTripDate = new Date();
      if (pkg.bookingDate) {
        const d = new Date(pkg.bookingDate);
        if (!isNaN(d.getTime())) {
          parsedTripDate = d;
        }
      }

      const payload: any = {
        packageId: Number(pkg.id),
        customerName: pemesan.nama,
        customerInitial: pemesan.nama.charAt(0).toUpperCase(),
        guests: guestsCount,
        tripDate: parsedTripDate.toISOString(),
        paymentMethod: 'Xendit Invoice',
        participants: peserta.map((p: any) => ({
          nama: p.nama,
          hp: p.hp,
          gender: p.gender,
          tanggalLahir: p.tanggalLahir || '',
          riwayatPenyakit: p.riwayatPenyakit || 'Tidak Ada'
        }))
      };

      if (providerProfile && providerProfile.role === 'CUSTOMER') {
        payload.customerId = providerProfile.id;
      }

      const response = await request('/public/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (response && (response.id || response.bookingCode)) {
        bookingObj = {
          id: response.id || Date.now(),
          bookingCode: response.bookingCode || randomCode,
          packageName: pkg.name,
          totalPrice: totalCost,
          guests: guestsCount,
          tripDate: pkg.bookingDate || '22 Mei 2026',
          createdAt: response.createdAt || nowIso,
          status: response.status || 'PENDING_PAYMENT',
          accountNumber: '693800143473',
          bankName: 'Bank OCBC',
          paymentUrl: response.paymentUrl || ''
        };
      } else {
        bookingObj = {
          id: Date.now(),
          bookingCode: randomCode,
          packageName: pkg.name,
          totalPrice: totalCost,
          guests: guestsCount,
          tripDate: pkg.bookingDate || '22 Mei 2026',
          createdAt: nowIso,
          status: 'PENDING_PAYMENT',
          accountNumber: '693800143473',
          bankName: 'Bank OCBC',
          paymentUrl: ''
        };
      }
    } catch (err) {
      bookingObj = {
        id: Date.now(),
        bookingCode: randomCode,
        packageName: pkg.name,
        totalPrice: totalCost,
        guests: guestsCount,
        tripDate: pkg.bookingDate || '22 Mei 2026',
        createdAt: nowIso,
        status: 'PENDING_PAYMENT',
        accountNumber: '693800143473',
        bankName: 'Bank OCBC',
        paymentUrl: ''
      };
    } finally {
      setSubmitting(false);

      if (bookingObj) {
        // Save into local history and sessionStorage
        const existingHistoryStr = localStorage.getItem('tripkita_my_bookings') || '[]';
        const history = JSON.parse(existingHistoryStr);
        history.unshift(bookingObj);
        localStorage.setItem('tripkita_my_bookings', JSON.stringify(history));
        sessionStorage.setItem('tripkita_recent_guest_booking', JSON.stringify(bookingObj));

        // If paymentUrl exists (Xendit Sandbox URL), REDIRECT DIRECTLY!
        if (bookingObj.paymentUrl && bookingObj.paymentUrl.startsWith('http')) {
          window.location.href = bookingObj.paymentUrl;
          return;
        }

        // Seamless navigation to payment invoice & testing page
        setSelectedBookingForInvoice(bookingObj);
        navigateTo('halaman-pembayaran');
      }
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '80px', paddingTop: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Back Button */}
        <button 
          onClick={() => navigateTo('customer-checkout')}
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
            marginBottom: '24px'
          }}
        >
          <ArrowLeft size={16} /> Ubah Data Pemesan & Peserta
        </button>

        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginBottom: '30px' }}>
          Konfirmasi & Pembayaran Trip
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', alignItems: 'flex-start' }}>
          
          {/* Left Column: Details Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Pemesan & Peserta Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                Daftar Peserta Trip ({guestsCount} Orang)
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {peserta.map((p: any, idx: number) => (
                  <div key={idx} style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0284c7' }}>
                        Peserta {idx + 1}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                        Umur: {calculateAge(p.tanggalLahir)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Nama Lengkap</span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{p.nama || '-'}</strong>
                      </div>

                      <div>
                        <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Nomor HP / WhatsApp</span>
                        <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: '600' }}>{p.hp || '-'}</span>
                      </div>

                      <div>
                        <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Jenis Kelamin</span>
                        <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: '600' }}>{p.gender || '-'}</span>
                      </div>

                      <div>
                        <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Tanggal Lahir</span>
                        <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: '600' }}>{p.tanggalLahir || '-'}</span>
                      </div>

                      <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #f1f5f9', paddingTop: '10px' }}>
                        <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Riwayat Penyakit & Alergi</span>
                        <span style={{ fontSize: '13.5px', fontWeight: '600', color: p.riwayatPenyakit && p.riwayatPenyakit !== 'Tidak Ada' ? '#ef4444' : '#10b981' }}>
                          {p.riwayatPenyakit || 'Tidak Ada'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                Metode Pembayaran
              </h2>

              <div style={{ backgroundColor: '#f0f9ff', borderRadius: '12px', padding: '18px', border: '1.5px solid #0284c7', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: '#e0f2fe', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={24} color="#0284c7" />
                </div>
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                    Transfer Bank (Bank OCBC)
                  </h4>
                  <p style={{ fontSize: '13px', color: '#0369a1', margin: 0, fontWeight: '600' }}>
                    Bank OCBC — Rekening: 693800143473 a.n. TripKita
                  </p>
                </div>
              </div>
            </div>

            {/* Agreement Checkbox Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#0284c7', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                  Saya telah membaca dan menyetujui <strong style={{ color: '#0284c7' }}>Syarat & Ketentuan</strong> serta <strong style={{ color: '#0284c7' }}>Kebijakan Pembatalan TripKita</strong>. Seluruh data peserta yang diisikan adalah benar.
                </span>
              </label>
              {agreementError && (
                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={14} /> {agreementError}
                </span>
              )}
            </div>

          </div>

          {/* Right Column: Pricing Summary Sidebar */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', position: 'sticky', top: '100px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
              Ringkasan Pembayaran
            </h2>

            <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {pkg.category}
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '4px 0 8px 0' }}>
                {pkg.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                <Calendar size={14} color="#94a3b8" />
                <span>{pkg.schedule || 'Jadwal Fleksibel'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b' }}>
                <Users size={14} color="#94a3b8" />
                <span>{guestsCount} Peserta</span>
              </div>
            </div>

            {/* Price breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', fontSize: '13.5px', color: '#64748b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Harga ({guestsCount}x)</span>
                <span style={{ color: '#0f172a', fontWeight: '600' }}>{formatIDR(baseCost)}</span>
              </div>

              {selectedAddOns.map((addon: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#0284c7' }}>
                  <span>Add-On: {addon.name}</span>
                  <span style={{ fontWeight: '600' }}>+{formatIDR(addon.price)}</span>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Biaya Layanan</span>
                <span style={{ color: '#10b981', fontWeight: '700' }}>GRATIS</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1.5px dashed #cbd5e1', marginBottom: '24px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>TOTAL PEMBAYARAN</strong>
              <strong style={{ fontSize: '18px', color: '#0284c7', fontWeight: '800' }}>{formatIDR(totalCost)}</strong>
            </div>

            <button
              onClick={handleOpenConfirmModal}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: submitting ? '#94a3b8' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              {submitting ? 'Memproses Booking...' : 'Konfirmasi & Bayar Sekarang'}
            </button>
          </div>

        </div>

      </div>

      {/* POPUP 1: YES / NO CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '32px 28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              textAlign: 'center'
            }}
          >
            <div style={{ backgroundColor: '#e0f2fe', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
              <HelpCircle size={30} color="#0284c7" />
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>
              Konfirmasi Pemesanan
            </h3>

            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5', margin: '0 0 26px 0' }}>
              Apakah Anda yakin data pemesanan dan seluruh peserta sudah benar dan ingin melanjutkan ke pembayaran sebesar <strong style={{ color: '#0f172a' }}>{formatIDR(totalCost)}</strong>?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* NO Button */}
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Batal (No)
              </button>

              {/* YES Button */}
              <button
                onClick={handleFinalConfirmBooking}
                style={{
                  padding: '12px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)'
                }}
              >
                Ya, Bayar Sekarang
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
