import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { getPaymentInvoiceUrl } from '../utils/payment';
import { request } from '../utils/api';
import { ArrowLeft, Calendar, Users, AlertCircle, HelpCircle, ShieldCheck } from 'lucide-react';
import { LegalModalContainer, GeneralTermsContent, CustomerRegistrationTermsContent } from '../components/LegalModals';

export const CustomerConfirmationPage: React.FC = () => {
  const { navigateTo, selectedPackageForDetail, customerProfile, bookingFormData, setBookingFormData, setSelectedBookingForInvoice } = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  
  // Agreement Checkbox state
  const [isAgreed, setIsAgreed] = useState(false);
  const [agreementError, setAgreementError] = useState('');

  // Legal Modals state
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'cancellation' | null>(null);

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
  const { pemesan, guests: guestsCount } = bookingFormData;
  
  
  const baseCost = pkg.price * guestsCount;
  const serviceFee = 4000; // Matches the current backend booking fee.
  const totalCost = baseCost + serviceFee;

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
    if (submitting) return;
    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      const selectedTripSchedule = bookingFormData.tripDate || pkg.bookingDate || pkg.startDate || '';
      const parsedTripDate = new Date(selectedTripSchedule);
      const packageId = Number(pkg.id);
      if (!Number.isInteger(packageId) || packageId <= 0 || !Number.isFinite(parsedTripDate.getTime()) || parsedTripDate.getTime() <= Date.now()) {
        throw new Error('Paket atau tanggal keberangkatan tidak valid. Silakan pilih kembali paket dan tanggal.');
      }
      if (!customerProfile || !pemesan.nama.trim() || guestsCount < 1) throw new Error('Lengkapi data pemesanan terlebih dahulu.');
      const packages = await request('/public/packages');
      const currentPackage = (packages || []).find((item: any) => item.id === packageId && item.status === 'Aktif');
      if (!currentPackage) throw new Error('Paket sudah tidak tersedia. Silakan pilih paket lain.');
      if (currentPackage.price !== pkg.price) throw new Error('Harga paket berubah. Silakan buka kembali detail paket.');
      if (guestsCount > currentPackage.quotaMax - currentPackage.quotaUsed) throw new Error('Sisa kuota tidak mencukupi.');

      const payload: any = {
        packageId,
        customerName: pemesan.nama.trim(),
        customerInitial: (pemesan.nama || 'P').charAt(0).toUpperCase(),
        guests: guestsCount,
        totalPrice: 0, // Let the server calculate the invoice amount.
        tripDate: parsedTripDate.toISOString(),
        paymentMethod: 'Xendit Invoice',

      };

      if (customerProfile && customerProfile.role === 'CUSTOMER') {
        payload.customerId = customerProfile.id;
      }

      const response = await request('/public/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.id || !response.bookingCode) throw new Error('Respons booking tidak lengkap. Periksa Cek Booking sebelum mencoba lagi.');
      setSelectedBookingForInvoice(response);
      setBookingFormData(null);
      const paymentUrl = getPaymentInvoiceUrl(response.paymentUrl);
      if (paymentUrl) window.location.assign(paymentUrl);
      else navigateTo('halaman-pembayaran');

    } catch (err: any) {
      console.error('[Booking Error]', err);
      alert(`Gagal membuat Invoice Xendit: ${err?.message || 'Terjadi kesalahan sistem'}`);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '80px', paddingTop: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Back Button */}
        <button 
          onClick={() => navigateTo('customer-checkout')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'transparent', border: 'none', color: '#0284c7', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginBottom: '20px' }}
        >
          <ArrowLeft size={18} /> Ubah Data Pemesan & Peserta
        </button>

        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginBottom: '30px' }}>
          Konfirmasi & Pembayaran Trip
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h2>Data Pemesan</h2><p>{pemesan.nama}</p><p>{guestsCount} peserta</p>
          </div>

          {/* Estimasi Pembayaran Card (Positioned directly below Data Peserta) */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
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
                <span>{bookingFormData?.tripDate || pkg.bookingDate || pkg.schedule || 'Jadwal Fleksibel'}</span>
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

              

              {serviceFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Biaya Admin</span>
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>{formatIDR(serviceFee)}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1.5px dashed #cbd5e1' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>TOTAL PEMBAYARAN</strong>
              <strong style={{ fontSize: '18px', color: '#0284c7', fontWeight: '800' }}>{formatIDR(totalCost)}</strong>
            </div>
          </div>

          {/* Cancellation Policy Banner */}
          <div style={{ backgroundColor: '#f0f9ff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #bae6fd', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#0369a1" /> Kebijakan Pembatalan Strict H-7 TripKita
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#0c4a6e', lineHeight: '1.5' }}>
              • Pembatalan <strong>≥ 7 hari sebelum trip</strong> berhak pengembalian dana <strong>100% Full Refund</strong>.<br/>
              • Pembatalan <strong>&lt; 7 hari sebelum trip (H-6 s/d Hari H)</strong> dikenakan biaya pembatalan 100% (<strong>0% Refund / Uang Hangus</strong>).<br/>
              • Jika trip dibatalkan oleh Provider/Cuaca/Kuota Kurang, Pemesan berhak atas <strong>100% Refund</strong> atau <strong>Reschedule Maks 1x</strong>.
            </p>
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
                Saya telah membaca dan menyetujui{' '}
                <button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveLegalModal('terms'); }}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#0284c7', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Syarat & Ketentuan
                </button>
                {' '}serta{' '}
                <button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveLegalModal('cancellation'); }}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#0284c7', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Kebijakan Pembatalan Strict H-7 TripKita
                </button>
                . Seluruh data peserta yang diisikan adalah benar.
              </span>
            </label>
            {agreementError && (
              <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} /> {agreementError}
              </span>
            )}
          </div>

          {/* Action CTA Button */}
          <button
            onClick={handleOpenConfirmModal}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: submitting ? '#94a3b8' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
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

      {/* Syarat & Ketentuan Modal */}
      <LegalModalContainer
        isOpen={activeLegalModal === 'terms'}
        onClose={() => setActiveLegalModal(null)}
        title="Syarat & Ketentuan Customer TemenTrip"
      >
        <GeneralTermsContent />
      </LegalModalContainer>

      {/* Kebijakan Pembatalan Strict H-7 Modal */}
      <LegalModalContainer
        isOpen={activeLegalModal === 'cancellation'}
        onClose={() => setActiveLegalModal(null)}
        title="Kebijakan Pembatalan Strict H-7 TripKita"
      >
        <CustomerRegistrationTermsContent />
      </LegalModalContainer>
    </div>
  );
};
