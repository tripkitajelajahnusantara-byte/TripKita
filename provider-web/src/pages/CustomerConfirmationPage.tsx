import { bookingTimestamp, formatTripRange, validDate } from '../utils/tripDates';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { fetchCheckoutConfig } from '../utils/checkoutConfig';
import { FlexiblePickupDetails } from '../components/TripPickup';
import { useActionLock } from '../utils/useActionLock';
import { ArrowLeft, Calendar, Users, AlertCircle, HelpCircle, ShieldCheck, LoaderCircle } from 'lucide-react';
import { LegalModalContainer, GeneralTermsContent, CustomerRegistrationTermsContent } from '../components/LegalModals';
import { Skeleton } from '../components/Skeleton';
import { useCustomAlert } from '../components/CustomAlertModal';
import {
  getMeetingPointAddress,
  getMeetingPointCoordinates,
  MeetingPointMap,
} from '../components/MeetingPointMap';

export const CustomerConfirmationPage: React.FC = () => {
  const { navigateTo, selectedPackageForDetail, bookingFormData, setBookingFormData, setSelectedBookingForInvoice, setSelectedPackageForDetail } = useNavigation();
  const { showAlert } = useCustomAlert();
  // POST /public/bookings membuat pesanan baru; kunci berbasis ref mencegah
  // klik ganda di tick yang sama membuat dua booking dan dua tagihan.
  const { pending, isBusy, run } = useActionLock();
  // Menjaga tombol tetap nonaktif selama perpindahan ke halaman pembayaran.
  const redirectingRef = useRef(false);
  const [redirecting, setRedirecting] = useState(false);
  const submitting = pending === 'create-booking' || redirecting;
  
  // Agreement Checkbox state
  const [isAgreed, setIsAgreed] = useState(false);
  const [agreementError, setAgreementError] = useState('');

  // Legal Modals state
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'cancellation' | null>(null);

  // Confirmation Modal Popup state (YES / NO)
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Biaya layanan diambil dari backend (sama persis dengan yang ditambahkan server ke total)
  const [serviceFee, setServiceFee] = useState<number | null>(null);
  const [cancellationRefundDays, setCancellationRefundDays] = useState<number | null>(null);
  const [checkoutConfigError, setCheckoutConfigError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchCheckoutConfig()
      .then((cfg) => {
        if (!cancelled) {
          setServiceFee(cfg.serviceFee);
          setCancellationRefundDays(cfg.cancellationRefundDays);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setCheckoutConfigError(err instanceof Error && err.message ? err.message : 'Gagal memuat biaya layanan.');
      });
    return () => { cancelled = true; };
  }, []);

  const [restoring, setRestoring] = useState(!selectedPackageForDetail && !!bookingFormData?.packageId);
  const [restoreError, setRestoreError] = useState('');
  useEffect(() => {
    if (selectedPackageForDetail || !bookingFormData?.packageId) return;
    let cancelled = false;
    request('/public/packages').then((packages) => {
      if (cancelled) return;
      const found = Array.isArray(packages) ? packages.find(p => Number(p.id) === Number(bookingFormData.packageId)) : null;
      if (!found) throw new Error('Paket tidak tersedia. Silakan pilih ulang paket dan tanggal.');
      setSelectedPackageForDetail({ ...found, bookingDate: bookingFormData.tripDate, bookingEndDate: bookingFormData.tripEndDate, bookingGuests: bookingFormData.peserta.length });
    }).catch(error => { if (!cancelled) setRestoreError(error.message || 'Gagal memuat paket.'); })
      .finally(() => { if (!cancelled) setRestoring(false); });
    return () => { cancelled = true; };
  }, [selectedPackageForDetail, bookingFormData, setSelectedPackageForDetail]);

  if (restoring && !selectedPackageForDetail) return <p role="status" style={{ padding: 40 }}>Memuat pilihan perjalanan...</p>;

  // Setelah booking dibuat, data form dikosongkan sementara halaman tagihan
  // masih dimuat; tampilkan status pengalihan, bukan pesan "tidak ditemukan".
  if (redirecting) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }} role="status" aria-live="polite">
        <LoaderCircle size={20} className="btn-spinner" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Booking berhasil dibuat. Membuka halaman pembayaran...
      </div>
    );
  }

  if (!selectedPackageForDetail || !bookingFormData) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
        <p>{restoreError || 'Data pemesanan tidak ditemukan. Silakan isi data pemesan terlebih dahulu.'}</p>
        <button onClick={() => navigateTo('beranda')} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const pkg = selectedPackageForDetail;
  const meetingPointCoordinates = getMeetingPointCoordinates(pkg);
  const meetingPointAddress = getMeetingPointAddress(pkg);
  const { pemesan, peserta } = bookingFormData;
  const guestsCount = peserta.length;
  const selectedAddOns = pkg.selectedAddOns || bookingFormData?.selectedAddOns || [];
  const addOnsTotal = selectedAddOns.reduce((sum: number, a: any) => sum + (a.price || 0), 0);
  const baseCost = pkg.price * guestsCount;
  const checkoutConfigLoading = (serviceFee === null || cancellationRefundDays === null) && !checkoutConfigError;
  const checkoutReady = serviceFee !== null && cancellationRefundDays !== null;
  const totalCost = baseCost + addOnsTotal + (serviceFee ?? 0);

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleOpenConfirmModal = () => {
    if (isBusy || redirectingRef.current || !checkoutReady) return;
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
    if (isBusy || redirectingRef.current || !checkoutReady) return;
    // Modal tetap terbuka selama permintaan berjalan agar tombol "Ya, Bayar"
    // menampilkan indikator dan tidak bisa ditekan ulang.
    await run('create-booking', async () => {
	const nowIso = new Date().toISOString();

    try {
      const selectedTripSchedule = bookingFormData.tripDate || pkg.bookingDate || '';
      if (!validDate(selectedTripSchedule) || Number(bookingFormData.packageId) !== Number(pkg.id)) {
        throw new Error('Pilihan tanggal tidak valid untuk paket ini. Kembali ke detail paket dan pilih tanggal pada kalender.');
      }
      const tripTimestamp = bookingTimestamp(selectedTripSchedule);

	  const rawPkgId = Number(pkg.id);
	  if (!Number.isInteger(rawPkgId) || rawPkgId <= 0) {
		throw new Error('Paket yang dipilih tidak valid. Silakan kembali dan pilih paket lagi.');
	  }

      const payload: any = {
		packageId: rawPkgId,
        customerName: pemesan.nama || 'Pelanggan TemenTrip',
        customerEmail: pemesan.email,
        customerPhone: pemesan.whatsapp,
        customerInitial: (pemesan.nama || 'P').charAt(0).toUpperCase(),
        guests: guestsCount || 1,
        tripDate: tripTimestamp,
        addOnIds: selectedAddOns.map((item: any) => item.id),
        participants: peserta.map((p) => {
          const medical = String(p.riwayatPenyakit || '').trim();
          return {
            name: String(p.nama || '').trim(),
            phone: String(p.hp || '').trim(),
            gender: p.gender,
            birthDate: p.tanggalLahir,
            medicalNotes: (medical === '' || medical === '-' || medical.toLowerCase() === 'tidak ada') ? '' : medical,
            pickupPoint: p.pickupPoint || ''
          };
        })
      };

      const response = await request('/public/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

	  const finalBookingCode = response.bookingCode || response.booking_code;
	  if (!finalBookingCode) throw new Error('Backend tidak mengembalikan kode booking');
      const bookingObj = {
        id: response.id || Date.now(),
        bookingCode: finalBookingCode,
        packageName: pkg.name,
        totalPrice: response.totalPrice,
        guests: guestsCount,
        tripDate: selectedTripSchedule,
        createdAt: response.createdAt || nowIso,
        status: response.status || 'PENDING_PAYMENT',
        paymentMethod: response.paymentMethod || 'Transfer Bank Manual'
      };

      // Riwayat lokal lama tidak pernah dibaca dan menumpuk data pemesan di
      // perangkat bersama, jadi dibersihkan; invoice cukup memakai sessionStorage.
      localStorage.removeItem('tripkita_my_bookings');
      sessionStorage.setItem('tripkita_recent_guest_booking', JSON.stringify(bookingObj));

	  // Booking telah dibuat dan kuota langsung ditahan selama 24 jam.
	  redirectingRef.current = true;
	  setRedirecting(true);
	  setSelectedBookingForInvoice(bookingObj);
	  navigateTo('halaman-pembayaran');
	  // Data form dikosongkan agar tombol Back tidak dapat membuat booking kedua.
	  setBookingFormData(null);

    } catch (err: any) {
      console.error('[Booking Error]', err);
      setShowConfirmModal(false);
      showAlert({
        title: 'Pembayaran Belum Dapat Diproses',
        message: err?.message || 'Booking belum dapat dibuat. Silakan coba kembali.',
        type: 'error',
        confirmText: 'Coba Lagi',
      });
    }
    });
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
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
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

                    <div>
                      <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Umur</span>
                      <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: '600' }}>{calculateAge(p.tanggalLahir)}</span>
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

          <FlexiblePickupDetails pkg={pkg} />
          {pkg.pickupMode === 'FLEXIBLE' && <section className="trip-option-panel">
            <h4>Titik jemput yang diajukan</h4>
            <dl className="pickup-manifest">{bookingFormData.peserta.map((p, i) => <div key={i}><dt>{p.nama}</dt><dd>{p.pickupPoint || 'Belum diisi — kembali ke data peserta untuk melengkapi.'}</dd></div>)}</dl>
          </section>}
          {meetingPointCoordinates && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
                Titik Kumpul
              </h2>
              {meetingPointAddress && (
                <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 14px', lineHeight: 1.6 }}>
                  <strong>{meetingPointAddress}</strong>
                </p>
              )}
              <MeetingPointMap position={meetingPointCoordinates} height={220} />
              <a
                href={`https://www.google.com/maps?q=${meetingPointCoordinates.lat},${meetingPointCoordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', marginTop: '12px', color: '#0284c7', fontSize: '13px', fontWeight: 700 }}
              >
                Buka petunjuk arah
              </a>
            </div>
          )}

          {/* Ringkasan Pembayaran Card (Positioned directly below Data Peserta) */}
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
                <span>{formatTripRange(bookingFormData.tripDate || pkg.bookingDate, bookingFormData.tripEndDate || pkg.bookingEndDate)}</span>
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

              {(serviceFee === null || serviceFee > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Biaya Admin</span>
                  <span style={{ color: checkoutConfigError ? '#ef4444' : '#0f172a', fontWeight: '600' }}>
                    {serviceFee !== null ? formatIDR(serviceFee) : (checkoutConfigError ? 'Gagal dimuat' : <Skeleton width={90} height={16} style={{ display: 'inline-block', verticalAlign: 'middle' }} />)}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1.5px dashed #cbd5e1' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>TOTAL PEMBAYARAN</strong>
              <strong style={{ fontSize: '18px', color: '#0284c7', fontWeight: '800' }}>{checkoutReady ? formatIDR(totalCost) : (checkoutConfigError ? '-' : <Skeleton width={90} height={16} style={{ display: 'inline-block', verticalAlign: 'middle' }} />)}</strong>
            </div>

            {checkoutConfigError && (
              <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} /> Gagal memuat biaya layanan: {checkoutConfigError} Muat ulang halaman untuk mencoba lagi.
              </span>
            )}
          </div>

          {/* Cancellation Policy Banner */}
          <div style={{ backgroundColor: '#f0f9ff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #bae6fd', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#0369a1" /> Kebijakan Pembatalan H-{cancellationRefundDays ?? '—'} TemenTrip
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#0c4a6e', lineHeight: '1.5' }}>
              • Pembatalan <strong>≥ {cancellationRefundDays ?? '—'} hari sebelum trip</strong> berhak pengembalian dana <strong>100% Full Refund</strong>.<br/>
              • Pembatalan <strong>&lt; {cancellationRefundDays ?? '—'} hari sebelum trip</strong> dikenakan biaya pembatalan 100% (<strong>0% Refund / Uang Hangus</strong>).<br/>
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
                  Kebijakan Pembatalan H-{cancellationRefundDays ?? '—'} TemenTrip
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
            disabled={submitting || !checkoutReady}
            aria-busy={submitting}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: (submitting || !checkoutReady) ? '#94a3b8' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: (submitting || !checkoutReady) ? 'not-allowed' : 'pointer',
              boxShadow: (submitting || !checkoutReady) ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.3)',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {submitting ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> Memproses Booking...</> : checkoutConfigLoading ? 'Memuat Biaya Layanan...' : 'Konfirmasi & Bayar Sekarang'}
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
                // Menutup modal tidak membatalkan POST yang sudah terkirim, jadi
                // tombol ini ikut dikunci agar pengguna tidak mengira batal.
                disabled={submitting}
                style={{
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                Batal (No)
              </button>

              {/* YES Button */}
              <button
                onClick={handleFinalConfirmBooking}
                disabled={submitting || !checkoutReady}
                aria-busy={submitting}
                style={{
                  padding: '12px',
                  backgroundColor: submitting ? '#94a3b8' : '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting ? 'none' : '0 4px 10px rgba(2, 132, 199, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {submitting ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> Memproses Booking...</> : 'Ya, Bayar Sekarang'}
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
        <GeneralTermsContent cancellationRefundDays={cancellationRefundDays ?? undefined} />
      </LegalModalContainer>

      {/* Kebijakan Pembatalan Strict H-7 Modal */}
      <LegalModalContainer
        isOpen={activeLegalModal === 'cancellation'}
        onClose={() => setActiveLegalModal(null)}
        title={`Kebijakan Pembatalan H-${cancellationRefundDays ?? '—'} TemenTrip`}
      >
        <CustomerRegistrationTermsContent cancellationRefundDays={cancellationRefundDays ?? undefined} />
      </LegalModalContainer>
    </div>
  );
};
