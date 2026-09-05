import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { QrCode, CreditCard, Building2, CheckCircle2, AlertCircle, Copy, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';

export const CustomerXenditCheckoutPage: React.FC = () => {
  const { navigateTo, selectedBookingForInvoice } = useNavigation();

  const [selectedMethod, setSelectedMethod] = useState<'qris' | 'va' | 'card'>('qris');
  const [selectedBank, setSelectedBank] = useState<string>('BCA');
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Fallback booking object if navigated directly
  const booking = selectedBookingForInvoice || {
    id: Date.now(),
    bookingCode: `TK-${Math.floor(Math.random() * 90000 + 10000)}`,
    packageName: 'Open Trip Gunung Bromo',
    totalPrice: 350000,
    guests: 1,
    tripDate: '22 Mei 2026',
    status: 'PENDING_PAYMENT'
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

  const handleSimulatePaymentSuccess = async () => {
    setProcessing(true);

    // Simulate Xendit webhook processing delay
    setTimeout(() => {
      // 1. Update local storage history
      try {
        const existingStr = localStorage.getItem('tripkita_my_bookings') || '[]';
        const history = JSON.parse(existingStr);
        const updatedHistory = history.map((item: any) => {
          if (item.id === booking.id || item.bookingCode === booking.bookingCode) {
            return { ...item, status: 'PAID', paymentMethod: `Xendit (${selectedMethod.toUpperCase()})` };
          }
          return item;
        });

        // If booking wasn't in history yet, add it
        const exists = history.some((item: any) => item.id === booking.id || item.bookingCode === booking.bookingCode);
        if (!exists) {
          updatedHistory.unshift({
            ...booking,
            status: 'PAID',
            paymentMethod: `Xendit (${selectedMethod.toUpperCase()})`
          });
        }

        localStorage.setItem('tripkita_my_bookings', JSON.stringify(updatedHistory));
        sessionStorage.setItem('tripkita_recent_guest_booking', JSON.stringify({
          ...booking,
          status: 'PAID'
        }));
      } catch (e) {
        console.error(e);
      }

      setProcessing(false);
      setPaymentSuccess(true);

      // Redirect to riwayat-booking after 1.5s
      setTimeout(() => {
        navigateTo('riwayat-booking');
      }, 1500);
    }, 800);
  };

  const handleSimulateExpired = () => {
    setProcessing(true);
    setTimeout(() => {
      try {
        const existingStr = localStorage.getItem('tripkita_my_bookings') || '[]';
        const history = JSON.parse(existingStr);
        const updatedHistory = history.map((item: any) => {
          if (item.id === booking.id || item.bookingCode === booking.bookingCode) {
            return { ...item, status: 'EXPIRED' };
          }
          return item;
        });
        localStorage.setItem('tripkita_my_bookings', JSON.stringify(updatedHistory));
      } catch (e) {
        console.error(e);
      }
      setProcessing(false);
      navigateTo('riwayat-booking');
    }, 500);
  };

  const getVaNumber = (bank: string) => {
    switch (bank) {
      case 'BCA': return '88001894124029';
      case 'Mandiri': return '89008894124029';
      case 'BRI': return '12388894124029';
      case 'BNI': return '98888894124029';
      default: return '8839001434739102';
    }
  };

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '40px 20px', fontFamily: 'Inter, sans-serif', color: '#f8fafc' }}>
      <div style={{ maxWidth: '580px', margin: '0 auto' }}>

        {/* Xendit Header Branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#0284c7', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '20px', color: '#fff' }}>
              X
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px' }}>xendit</span>
              <span style={{ display: 'block', fontSize: '11px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Payment Gateway (Mode Tes / Sandbox)
              </span>
            </div>
          </div>

          <button 
            onClick={() => navigateTo('customer-confirmation')}
            style={{ backgroundColor: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Batal
          </button>
        </div>

        {/* Success Modal Overlay */}
        {paymentSuccess && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.9)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '24px', padding: '40px 30px', textAlign: 'center', maxWidth: '400px', width: '100%', border: '1.5px solid #10b981', boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.3)' }}>
              <div style={{ backgroundColor: '#064e3b', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <CheckCircle2 size={44} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>Pembayaran Berhasil!</h3>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 20px 0' }}>
                Xendit Sandbox berhasil memverifikasi pembayaran Anda sebesar <strong>{formatIDR(booking.totalPrice)}</strong>.
              </p>
              <span style={{ fontSize: '12.5px', color: '#34d399', fontWeight: '700' }}>Mengalihkan ke Riwayat Pemesanan...</span>
            </div>
          </div>
        )}

        {/* Merchant & Amount Card */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '28px', border: '1px solid #334155', marginBottom: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Penyedia Layanan / Merchant</span>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: '4px 0 0 0' }}>TripKita</h2>
              <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: '600', marginTop: '2px', display: 'block' }}>{booking.packageName}</span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Total Tagihan</span>
              <strong style={{ fontSize: '24px', fontWeight: '800', color: '#38bdf8', display: 'block', marginTop: '2px' }}>
                {formatIDR(booking.totalPrice || 350000)}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#94a3b8' }}>
            <span>Kode Invoice: <strong style={{ color: '#f8fafc' }}>{booking.bookingCode}</strong></span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: '600' }}>
              <Clock size={14} /> <span>Berlaku 24 Jam</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection Card */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '28px', border: '1px solid #334155', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', margin: '0 0 16px 0' }}>
            Pilih Metode Pembayaran Xendit
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
            <button
              onClick={() => setSelectedMethod('qris')}
              style={{
                padding: '14px 10px',
                borderRadius: '14px',
                border: selectedMethod === 'qris' ? '2px solid #0284c7' : '1px solid #334155',
                backgroundColor: selectedMethod === 'qris' ? '#0369a1' : '#0f172a',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <QrCode size={22} color={selectedMethod === 'qris' ? '#ffffff' : '#38bdf8'} />
              <span>QRIS / E-Wallet</span>
            </button>

            <button
              onClick={() => setSelectedMethod('va')}
              style={{
                padding: '14px 10px',
                borderRadius: '14px',
                border: selectedMethod === 'va' ? '2px solid #0284c7' : '1px solid #334155',
                backgroundColor: selectedMethod === 'va' ? '#0369a1' : '#0f172a',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Building2 size={22} color={selectedMethod === 'va' ? '#ffffff' : '#38bdf8'} />
              <span>Virtual Account</span>
            </button>

            <button
              onClick={() => setSelectedMethod('card')}
              style={{
                padding: '14px 10px',
                borderRadius: '14px',
                border: selectedMethod === 'card' ? '2px solid #0284c7' : '1px solid #334155',
                backgroundColor: selectedMethod === 'card' ? '#0369a1' : '#0f172a',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CreditCard size={22} color={selectedMethod === 'card' ? '#ffffff' : '#38bdf8'} />
              <span>Kartu Kredit</span>
            </button>
          </div>

          {/* METHOD 1: QRIS */}
          {selectedMethod === 'qris' && (
            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #334155' }}>
              <span style={{ fontSize: '12.5px', color: '#94a3b8', display: 'block', marginBottom: '14px', fontWeight: '600' }}>
                Scan QR Code ini menggunakan GoPay, OVO, DANA, LinkAja, atau Mobile Banking Anda:
              </span>
              
              <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', width: '180px', height: '180px', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=XENDIT_TRIPKITA_${booking.bookingCode}`} 
                  alt="QRIS Code" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '700' }}>NMID: ID1020039412402 • Xendit QRIS Simulator</span>
            </div>
          )}

          {/* METHOD 2: VIRTUAL ACCOUNT */}
          {selectedMethod === 'va' && (
            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', padding: '20px', border: '1px solid #334155' }}>
              <label style={{ display: 'block', fontSize: '12.5px', color: '#94a3b8', marginBottom: '10px', fontWeight: '700' }}>
                Pilih Bank Virtual Account:
              </label>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '18px' }}>
                {['BCA', 'Mandiri', 'BRI', 'BNI'].map((bank) => (
                  <button
                    key={bank}
                    onClick={() => setSelectedBank(bank)}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: selectedBank === bank ? '2px solid #0284c7' : '1px solid #334155',
                      backgroundColor: selectedBank === bank ? '#0284c7' : '#1e293b',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    {bank}
                  </button>
                ))}
              </div>

              <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Nomor Virtual Account {selectedBank}</span>
                  <strong style={{ fontSize: '20px', color: '#38bdf8', display: 'block', letterSpacing: '1px', marginTop: '2px' }}>
                    {getVaNumber(selectedBank)}
                  </strong>
                </div>

                <button
                  onClick={() => handleCopy(getVaNumber(selectedBank))}
                  style={{ backgroundColor: copied ? '#10b981' : '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>
          )}

          {/* METHOD 3: CREDIT CARD */}
          {selectedMethod === 'card' && (
            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', padding: '20px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>Nomor Kartu (Test Card)</label>
                  <input type="text" value="4000 0000 0000 0000" readOnly style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#38bdf8', fontWeight: '700', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>Masa Berlaku</label>
                    <input type="text" value="12 / 28" readOnly style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontWeight: '700', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>CVV</label>
                    <input type="text" value="123" readOnly style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontWeight: '700', fontSize: '14px' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons: Instant Payment Test Simulation */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '24px', border: '1.5px solid #0284c7', boxShadow: '0 4px 20px rgba(2, 132, 199, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <ShieldCheck size={22} color="#38bdf8" />
            <strong style={{ fontSize: '15px', color: '#ffffff', fontWeight: '800' }}>
              Simulasi Pengujian Pembayaran Xendit Sandbox
            </strong>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 18px 0', lineHeight: '1.5' }}>
            Klik tombol di bawah untuk menyimulasikan respon sukses dari Xendit Payment Gateway secara instant.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleSimulatePaymentSuccess}
              disabled={processing}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: processing ? '#047857' : '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '800',
                cursor: processing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {processing ? 'Memproses Webhook Xendit...' : '⚡ SIMULASIKAN PEMBAYARAN SUKSES (XENDIT TEST)'}
            </button>

            <button
              onClick={handleSimulateExpired}
              disabled={processing}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#f87171',
                border: '1px solid #991b1b',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: processing ? 'not-allowed' : 'pointer'
              }}
            >
              ❌ Simulasikan Waktu Pembayaran Habis (EXPIRED)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
