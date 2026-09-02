import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { Clock, Copy, CheckCircle2, ArrowLeft, ExternalLink, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

export const CustomerPaymentInvoicePage: React.FC = () => {
  const { navigateTo, selectedBookingForInvoice } = useNavigation();

  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [openGuide, setOpenGuide] = useState<'mobile' | 'atm' | null>(null);

  // 1-minute countdown timer logic (60 seconds testing limit)
  const [timeLeft, setTimeLeft] = useState(60);

  const booking = selectedBookingForInvoice || {
    id: 1,
    bookingCode: 'TK-89412-4029',
    packageName: 'Open Trip Gunung Bromo',
    totalPrice: 350000,
    guests: 1,
    tripDate: '22 Mei 2026',
    accountNumber: '693800143473',
    bankName: 'Bank OCBC',
    paymentUrl: ''
  };

  useEffect(() => {
    if (timeLeft <= 0) {
      // Auto-expire: update local history & redirect straight to riwayat-booking!
      const existingStr = localStorage.getItem('tripkita_my_bookings') || '[]';
      const history = JSON.parse(existingStr);
      const updatedHistory = history.map((item: any) => {
        if (item.id === booking.id || item.bookingCode === booking.bookingCode) {
          return { ...item, status: 'EXPIRED' };
        }
        return item;
      });
      localStorage.setItem('tripkita_my_bookings', JSON.stringify(updatedHistory));
      navigateTo('riwayat-booking');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simulate Instant Payment (Sandbox Test) ➔ Redirects straight to Cek Booking!
  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      const targetId = booking.bookingCode || booking.id;
      if (targetId) {
        await request(`/public/bookings/${targetId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'PAID' })
        }).catch(() => {});
      }

      // Update local storage history
      const existingStr = localStorage.getItem('tripkita_my_bookings') || '[]';
      const history = JSON.parse(existingStr);
      const updatedHistory = history.map((item: any) => {
        if (item.id === booking.id || item.bookingCode === booking.bookingCode) {
          return { ...item, status: 'PAID' };
        }
        return item;
      });
      localStorage.setItem('tripkita_my_bookings', JSON.stringify(updatedHistory));

      // Redirect straight to Cek Booking with PAID status!
      navigateTo('riwayat-booking');
    } catch (err) {
      console.error(err);
      navigateTo('riwayat-booking');
    } finally {
      setSimulating(false);
    }
  };

  // Simulate Timer Expired (Sandbox Test)
  const handleSimulateExpired = async () => {
    setSimulating(true);
    try {
      const targetId = booking.bookingCode || booking.id;
      if (targetId) {
        await request(`/public/bookings/${targetId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'EXPIRED' })
        }).catch(() => {});
      }

      // Update local storage history
      const existingStr = localStorage.getItem('tripkita_my_bookings') || '[]';
      const history = JSON.parse(existingStr);
      const updatedHistory = history.map((item: any) => {
        if (item.id === booking.id || item.bookingCode === booking.bookingCode) {
          return { ...item, status: 'EXPIRED' };
        }
        return item;
      });
      localStorage.setItem('tripkita_my_bookings', JSON.stringify(updatedHistory));

      // Redirect straight to Cek Booking with EXPIRED status!
      navigateTo('riwayat-booking');
    } catch (err) {
      console.error(err);
      navigateTo('riwayat-booking');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '80px', paddingTop: '28px', fontFamily: 'Inter, sans-serif' }}>
      <div className="container" style={{ maxWidth: '840px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button 
            onClick={() => navigateTo('riwayat-booking')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Cek Riwayat Pemesanan
          </button>

          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
            Kode Booking: <strong style={{ color: '#0f172a' }}>{booking.bookingCode}</strong>
          </span>
        </div>

        {/* Status Header Banner */}
        <div style={{ backgroundColor: '#fffbe6', border: '1.5px solid #f59e0b', borderRadius: '20px', padding: '24px 28px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Status: Menunggu Pembayaran (Testing Mode: 1 Menit)
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#78350f', margin: '4px 0 0 0' }}>
              Transfer Sebelum Waktu Batas 1 Menit Habis
            </h2>
          </div>

          {/* Countdown Badge */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #fcd34d', padding: '10px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={20} color="#d97706" />
            <div>
              <span style={{ fontSize: '11px', color: '#b45309', display: 'block', fontWeight: '600' }}>Sisa Waktu Testing</span>
              <strong style={{ fontSize: '18px', fontWeight: '800', color: '#d97706', fontFamily: 'monospace' }}>
                {formatTimer(timeLeft)}
              </strong>
            </div>
          </div>
        </div>

        {/* Payment Details Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '20px 28px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: '700' }}>
                Total Tagihan Anda
              </span>
              <strong style={{ fontSize: '24px', fontWeight: '800', display: 'block', color: '#38bdf8', marginTop: '2px' }}>
                {formatIDR(booking.totalPrice || 350000)}
              </strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Paket Trip:</span>
              <strong style={{ fontSize: '14px', color: '#ffffff' }}>{booking.packageName}</strong>
            </div>
          </div>

          <div style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0' }}>
              Informasi Rekening Bank Tujuan Transfer
            </h3>

            {/* Bank Rekening Box */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '14px', padding: '20px 24px', border: '1.5px solid #cbd5e1', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  Bank OCBC
                </span>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#0284c7', letterSpacing: '1px', marginTop: '4px' }}>
                  693800143473
                </div>
                <span style={{ fontSize: '13px', color: '#475569', marginTop: '2px', display: 'block' }}>
                  Atas Nama: <strong>TripKita</strong>
                </span>
              </div>

              <button 
                onClick={() => handleCopy('693800143473')}
                style={{
                  backgroundColor: copied ? '#10b981' : '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? 'Tersalin!' : 'Salin No. Rekening'}
              </button>
            </div>

            {/* 1-Click Sandbox Test Simulation Box */}
            <div style={{ backgroundColor: '#f0f9ff', borderRadius: '14px', padding: '20px 24px', border: '1.5px solid #0284c7', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ShieldCheck size={20} color="#0284c7" />
                <strong style={{ fontSize: '15px', color: '#0369a1', fontWeight: '800' }}>
                  Simulasi Pengujian Pembayaran Instant (Test Mode)
                </strong>
              </div>
              <p style={{ fontSize: '13.5px', color: '#0284c7', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                Klik tombol simulasi di bawah ini untuk menyelesaikan pembayaran dan langsung melihat status <strong>LUNAS (PAID)</strong> di Cek Booking.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '700',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ⚡ {simulating ? 'Memproses...' : 'Simulasi Bayar Lunas (LUNAS / PAID)'}
                </button>

                <button 
                  onClick={handleSimulateExpired}
                  disabled={simulating}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    border: '1px solid #fca5a5',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '700',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ❌ {simulating ? 'Memproses...' : 'Simulasi Waktu Habis (EXPIRED)'}
                </button>

                {booking.paymentUrl && (
                  <a 
                    href={booking.paymentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: '700',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    Buka Invoice Xendit <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* Collapsible / Accordion Transfer Instructions */}
            <div>
              <h4 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
                Tata Cara Pembayaran Transfer Bank OCBC:
              </h4>

              {/* Accordion Item 1: OCBC Mobile App */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenGuide(openGuide === 'mobile' ? null : 'mobile')}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    backgroundColor: openGuide === 'mobile' ? '#f0f9ff' : '#ffffff',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '14px',
                    color: openGuide === 'mobile' ? '#0284c7' : '#0f172a',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>📱 Via Aplikasi OCBC Mobile (ONe Mobile)</span>
                  {openGuide === 'mobile' ? <ChevronUp size={18} color="#0284c7" /> : <ChevronDown size={18} color="#64748b" />}
                </button>

                {openGuide === 'mobile' && (
                  <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #f1f5f9' }}>
                    <ol style={{ fontSize: '13.5px', color: '#475569', paddingLeft: '20px', margin: '14px 0 0 0', lineHeight: '1.8' }}>
                      <li>Buka aplikasi <strong>OCBC Mobile</strong> di smartphone Anda lalu login.</li>
                      <li>Pilih menu <strong>Transfer ➔ Ke Rekening Bank OCBC</strong>.</li>
                      <li>Masukkan Nomor Rekening: <strong style={{ color: '#0f172a' }}>693800143473</strong></li>
                      <li>Pastikan Nama Pemilik Rekening tertera: <strong style={{ color: '#0284c7' }}>TripKita</strong>.</li>
                      <li>Masukkan nominal transfer sebesar <strong style={{ color: '#0f172a' }}>{formatIDR(booking.totalPrice || 350000)}</strong>.</li>
                      <li>Konfirmasi transaksi & masukkan PIN OCBC Mobile Anda. Sistem akan memverifikasi pembayaran secara otomatis.</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Accordion Item 2: ATM Bank OCBC / ATM Bersama */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenGuide(openGuide === 'atm' ? null : 'atm')}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    backgroundColor: openGuide === 'atm' ? '#f0f9ff' : '#ffffff',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '14px',
                    color: openGuide === 'atm' ? '#0284c7' : '#0f172a',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>🏧 Via ATM Bank OCBC / ATM Bank Lain</span>
                  {openGuide === 'atm' ? <ChevronUp size={18} color="#0284c7" /> : <ChevronDown size={18} color="#64748b" />}
                </button>

                {openGuide === 'atm' && (
                  <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #f1f5f9' }}>
                    <ol style={{ fontSize: '13.5px', color: '#475569', paddingLeft: '20px', margin: '14px 0 0 0', lineHeight: '1.8' }}>
                      <li>Masukkan Kartu ATM & PIN Bank Anda di mesin ATM.</li>
                      <li>Pilih menu <strong>Transaksi Lainnya ➔ Transfer ➔ Ke Rekening Bank OCBC</strong>.</li>
                      <li>Gunakan Kode Bank OCBC: <strong>028</strong> *(jika mentransfer dari bank lain)*.</li>
                      <li>Masukkan Nomor Rekening: <strong style={{ color: '#0f172a' }}>693800143473</strong>.</li>
                      <li>Masukkan nominal transfer tepat sebesar <strong style={{ color: '#0f172a' }}>{formatIDR(booking.totalPrice || 350000)}</strong>.</li>
                      <li>Konfirmasi nama penerima <strong>TripKita</strong> & simpan resi bukti transaksi Anda.</li>
                    </ol>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

