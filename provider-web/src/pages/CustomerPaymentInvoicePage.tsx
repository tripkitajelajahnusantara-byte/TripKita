import React, { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { useNavigation } from '../context/NavigationContext';

export const CustomerPaymentInvoicePage: React.FC = () => {
  const { navigateTo, selectedBookingForInvoice } = useNavigation();
  const [message, setMessage] = useState('Mengarahkan ke halaman pembayaran aman Xendit...');

  useEffect(() => {
    const paymentURL = selectedBookingForInvoice?.paymentUrl;
    if (!paymentURL) {
      setMessage('Tautan pembayaran tidak tersedia. Silakan buka kembali riwayat booking.');
      return;
    }

    try {
      const parsed = new URL(paymentURL);
      const host = parsed.hostname.toLowerCase();
      if (parsed.protocol !== 'https:' || (host !== 'xendit.co' && !host.endsWith('.xendit.co'))) throw new Error('invalid payment URL');
      window.location.replace(parsed.toString());
    } catch {
      setMessage('Tautan pembayaran tidak valid. Jangan melanjutkan pembayaran dan hubungi layanan pelanggan.');
    }
  }, [selectedBookingForInvoice]);

  return (
    <main style={{ minHeight: '65vh', display: 'grid', placeItems: 'center', padding: '32px' }}>
      <section style={{ textAlign: 'center', maxWidth: '520px' }}>
        <LoaderCircle size={36} aria-hidden="true" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>Pembayaran TripKita</h1>
        <p style={{ color: '#64748b', lineHeight: 1.6 }}>{message}</p>
        <button type="button" onClick={() => navigateTo('riwayat-booking')} style={{ marginTop: '20px', padding: '10px 18px', cursor: 'pointer' }}>
          Kembali ke riwayat booking
        </button>
      </section>
    </main>
  );
};
