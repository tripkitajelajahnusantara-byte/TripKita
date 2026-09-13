import { useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useApiData } from '../utils/useApiData';
import { formatRupiah, getBookingStatusLabel, getPaymentInvoiceUrl } from '../utils/payment';
import type { CustomerBooking } from '../utils/payment';

export const CustomerPaymentInvoicePage = () => {
  const { selectedBookingForInvoice, navigateTo } = useNavigation();
  const code = selectedBookingForInvoice?.bookingCode || new URLSearchParams(window.location.hash.split('?')[1] || window.location.search).get('code');
  const { data: booking, loading, error: loadError, reload } = useApiData<CustomerBooking>(code ? '/public/bookings/status/' + encodeURIComponent(code) : null);
  const error = !code ? 'Pilih booking melalui Cek Booking untuk melihat invoice.' : loadError || (!loading && !booking?.id ? 'Data invoice tidak tersedia.' : '');
  useEffect(() => {
    if (!booking?.bookingCode) return;
    const url = new URL(window.location.href);
    url.hash = '/halaman-pembayaran?code=' + encodeURIComponent(booking.bookingCode);
    window.history.replaceState(null, '', url);
  }, [booking?.bookingCode]);
  const paymentUrl = getPaymentInvoiceUrl(booking?.paymentUrl);
  return (
    <main className="container" style={{ maxWidth: '760px', padding: '48px 20px' }}>
      <button onClick={() => navigateTo('riwayat-booking')}>Kembali ke Cek Booking</button>
      <h1>Invoice Pembayaran</h1>
      {loading ? <p role="status">Memuat invoice...</p> : error ? <p role="alert">{error}</p> : booking && (
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
          <h2>{booking.bookingCode}</h2>
          <p>{booking.packageDetails?.name || 'Nama paket belum tersedia'}</p>
          <p>Status: <strong>{getBookingStatusLabel(booking.status)}</strong></p>
          <p>Total pembayaran: <strong>{formatRupiah(booking.totalPrice)}</strong></p>
          {booking.status === 'PENDING_PAYMENT' && (paymentUrl ? (
            <><p>Pilih metode pembayaran dan periksa batas pembayaran di halaman Xendit.</p>
              <a className="primary-btn" href={paymentUrl}>Buka Invoice Xendit</a></>
          ) : <p role="alert">Invoice pembayaran belum tersedia. Hubungi bantuan dengan menyertakan kode booking ini.</p>)}
          <p>Status diperbarui setelah konfirmasi diterima dari penyedia pembayaran.</p>
        </section>
      )}
      {code && <button disabled={loading} onClick={reload} style={{ marginTop: '20px' }}>Periksa status terbaru</button>}
    </main>
  );
};
