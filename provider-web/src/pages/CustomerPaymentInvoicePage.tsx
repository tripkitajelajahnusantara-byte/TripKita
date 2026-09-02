import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { Clock, Copy, CheckCircle2, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';

export const CustomerPaymentInvoicePage: React.FC = () => {
  const { navigateTo, selectedBookingForInvoice } = useNavigation();

  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // 2-hour countdown timer logic (7200 seconds)
  const [timeLeft, setTimeLeft] = useState(7200);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const booking = selectedBookingForInvoice || {
    id: 1,
    bookingCode: 'TK-89412-4029',
    packageName: 'Open Trip Gunung Bromo',
    totalPrice: 350000,
    guests: 1,
    tripDate: '22 Mei 2026',
    vaNumber: '8839001434739102',
    bankName: 'Bank OCBC',
    paymentUrl: ''
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

  // Simulate Instant Payment (Sandbox Test)
  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      if (booking.id) {
        await request(`/public/bookings/${booking.id}/status`, {
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

      setIsPaid(true);
    } catch (err) {
      console.error(err);
      setIsPaid(true);
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

        {/* Main Status Header Card */}
        {isPaid ? (
          <div style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #16a34a', borderRadius: '20px', padding: '32px', textAlign: 'center', marginBottom: '28px', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.08)' }}>
            <div style={{ backgroundColor: '#dcfce7', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <CheckCircle2 size={36} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#14532d', margin: '0 0 6px 0' }}>
              Pembayaran Berhasil! (PAID)
            </h2>
            <p style={{ fontSize: '14.5px', color: '#15803d', margin: '0 0 20px 0', fontWeight: '500' }}>
              Terima kasih! Pemesanan paket <strong>{booking.packageName}</strong> telah terkonfirmasi secara otomatis. E-Ticket telah dikirimkan.
            </p>
            <button 
              onClick={() => navigateTo('riwayat-booking')}
              style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '12px 28px', fontSize: '14.5px', fontWeight: '700', borderRadius: '10px', cursor: 'pointer' }}
            >
              Lihat E-Ticket & Detail Trip
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: '#fffbe6', border: '1.5px solid #f59e0b', borderRadius: '20px', padding: '24px 28px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Status: Menunggu Pembayaran
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#78350f', margin: '4px 0 0 0' }}>
                Selesaikan Pembayaran Sebelum Waktu Habis
              </h2>
            </div>

            {/* Countdown Badge */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #fcd34d', padding: '10px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} color="#d97706" />
              <div>
                <span style={{ fontSize: '11px', color: '#b45309', display: 'block', fontWeight: '600' }}>Sisa Waktu Pembayaran</span>
                <strong style={{ fontSize: '18px', fontWeight: '800', color: '#d97706', fontFamily: 'monospace' }}>
                  {formatTimer(timeLeft)}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* VA Payment Details Card */}
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
              Instruksi Transfer Virtual Account (VA)
            </h3>

            {/* Virtual Account Box */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '14px', padding: '20px 24px', border: '1.5px solid #cbd5e1', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  Nomor Virtual Account Bank ({booking.bankName || 'Bank OCBC'})
                </span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '1.5px', marginTop: '4px' }}>
                  {booking.vaNumber || '8839001434739102'}
                </div>
                <span style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  a.n. <strong>TripKita Official Payment Gateway</strong>
                </span>
              </div>

              <button 
                onClick={() => handleCopy(booking.vaNumber || '8839001434739102')}
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
                {copied ? 'Tersalin!' : 'Salin Nomor VA'}
              </button>
            </div>

            {/* 1-Click Sandbox Test Simulation Box */}
            {!isPaid && (
              <div style={{ backgroundColor: '#f0f9ff', borderRadius: '14px', padding: '20px 24px', border: '1.5px solid #0284c7', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <ShieldCheck size={20} color="#0284c7" />
                  <strong style={{ fontSize: '15px', color: '#0369a1', fontWeight: '800' }}>
                    Simulasi Pengujian Pembayaran Instant (Sandbox Mode)
                  </strong>
                </div>
                <p style={{ fontSize: '13.5px', color: '#0284c7', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                  Ingin mengetes pembayaran tanpa keluar halaman? Klik tombol simulasi di bawah ini untuk mengubah status booking menjadi <strong>LUNAS (PAID)</strong> secara instant.
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={handleSimulatePayment}
                    disabled={simulating}
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 24px',
                      fontSize: '14.5px',
                      fontWeight: '700',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    ⚡ {simulating ? 'Memproses Simulasi...' : 'Simulasi Bayar Sekarang (1-Click Test)'}
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
            )}

            {/* Transfer Instructions */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                Cara Pembayaran via ATM / M-Banking:
              </h4>
              <ol style={{ fontSize: '13.5px', color: '#475569', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                <li>Buka aplikasi Mobile Banking atau ATM Bank Anda.</li>
                <li>Pilih menu <strong>Transfer ➔ Virtual Account (VA)</strong>.</li>
                <li>Masukkan nomor Virtual Account: <strong style={{ color: '#0f172a' }}>{booking.vaNumber || '8839001434739102'}</strong></li>
                <li>Pastikan nama tagihan muncul sebagai <strong>TripKita Official</strong> dan nominal cocok (<strong>{formatIDR(booking.totalPrice || 350000)}</strong>).</li>
                <li>Konfirmasi transaksi. Sistem akan memverifikasi status Anda secara otomatis.</li>
              </ol>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
