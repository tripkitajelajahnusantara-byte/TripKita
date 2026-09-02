import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { ArrowLeft, Calendar, Users, CreditCard, AlertCircle, HelpCircle, CheckCircle2 } from 'lucide-react';

export const CustomerConfirmationPage: React.FC = () => {
  const { navigateTo, selectedPackageForDetail, providerProfile, bookingFormData } = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  
  // Agreement Checkbox state
  const [isAgreed, setIsAgreed] = useState(false);
  const [agreementError, setAgreementError] = useState('');

  // Confirmation Modal Popup state (YES / NO)
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Success Modal Popup state (matches Screenshot 2 design)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successBookingCode, setSuccessBookingCode] = useState('');

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

  const handleFinalConfirmBooking = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const payload: any = {
        packageId: Number(pkg.id),
        customerName: pemesan.nama,
        customerInitial: pemesan.nama.charAt(0).toUpperCase(),
        guests: guestsCount,
        tripDate: new Date(pkg.bookingDate || '2026-05-22').toISOString(),
        paymentMethod: 'Xendit Invoice'
      };

      if (providerProfile && providerProfile.role === 'CUSTOMER') {
        payload.customerId = providerProfile.id;
      }

      const response = await request('/public/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const paymentUrl = response.paymentUrl || response.payment_url || `https://tripkita-production.up.railway.app/public/mock-checkout/${response.id}`;

      // Save into local history
      const existingHistoryStr = localStorage.getItem('tripkita_my_bookings') || '[]';
      const history = JSON.parse(existingHistoryStr);
      
      const newHistoryItem = {
        id: response.id,
        bookingCode: response.bookingCode,
        packageName: pkg.name,
        totalPrice: totalCost,
        guests: guestsCount,
        tripDate: pkg.bookingDate || '2026-05-22',
        paymentUrl: paymentUrl,
        createdAt: new Date().toISOString()
      };
      
      history.unshift(newHistoryItem);
      localStorage.setItem('tripkita_my_bookings', JSON.stringify(history));

      // Redirect straight to Xendit Payment Invoice URL!
      if (paymentUrl) {
        window.open(paymentUrl, '_blank');
      }

      // Show Custom High-End Success Modal
      setSuccessBookingCode(response.bookingCode || 'TK-OFFICIAL');
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal memproses pemesanan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {peserta.map((p, idx) => (
                  <div key={idx} style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', display: 'block', marginBottom: '4px' }}>
                        Peserta {idx + 1}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{p.nama}</strong>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '13px', color: '#64748b' }}>
                      <div>{p.hp || '-'}</div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{p.gender}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                Metode Pembayaran (Xendit Payment Gateway)
              </h2>

              <div style={{ backgroundColor: '#f0f9ff', borderRadius: '12px', padding: '18px', border: '1.5px solid #0284c7', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: '#e0f2fe', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={24} color="#0284c7" />
                </div>
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                    Pembayaran Otomatis Xendit (Bank OCBC, BCA, QRIS, E-Wallet)
                  </h4>
                  <p style={{ fontSize: '13px', color: '#0369a1', margin: 0, fontWeight: '600' }}>
                    Otomatis Terverifikasi 24/7 • Tanpa Perlu Unggah Bukti Bayar
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

      {/* POPUP 2: HIGH-END SUCCESS MODAL (Replaces browser alert - Matches Screenshot 2) */}
      {showSuccessModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 10000,
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
              maxWidth: '460px',
              width: '100%',
              padding: '36px 30px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'center'
            }}
          >
            <div style={{ backgroundColor: '#dcfce7', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <CheckCircle2 size={36} color="#16a34a" />
            </div>

            <h3 style={{ fontSize: '21px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>
              Pemesanan Berhasil!
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Kode Booking Anda:</span>
              <strong style={{ fontSize: '18px', color: '#0284c7', letterSpacing: '1px', fontWeight: '800' }}>{successBookingCode}</strong>
            </div>

            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 26px 0' }}>
              Invoice pembayaran Xendit untuk paket <strong style={{ color: '#0f172a' }}>{pkg.name}</strong> telah diterbitkan! Silakan selesaikan pembayaran via <strong>Bank OCBC (Virtual Account), QRIS, atau E-Wallet</strong>. Sistem akan memverifikasi secara otomatis 24/7 tanpa perlu unggah bukti transfer.
            </p>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                navigateTo('riwayat-booking');
              }}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              Cek Riwayat Pemesanan
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
