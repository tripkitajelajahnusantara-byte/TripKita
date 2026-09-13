const {read, write, between} = require('./cleanup-helpers.cjs');
write('pages/CustomerPaymentInvoicePage.tsx', `import { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { formatRupiah, getBookingStatusLabel, getPaymentInvoiceUrl } from '../utils/payment';
import type { CustomerBooking } from '../utils/payment';

export const CustomerPaymentInvoicePage = () => {
  const { selectedBookingForInvoice, navigateTo } = useNavigation();
  const code = selectedBookingForInvoice?.bookingCode || new URLSearchParams(window.location.hash.split('?')[1] || window.location.search).get('code');
  const [booking, setBooking] = useState<CustomerBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setBooking(null);
    async function loadInvoice() {
      try {
        if (!code) throw new Error('Pilih booking melalui Cek Booking untuk melihat invoice.');
        const data = await request('/public/bookings/status/' + encodeURIComponent(code));
        if (!data?.id || !data.bookingCode) throw new Error('Data invoice tidak tersedia.');
        if (active) setBooking(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Invoice gagal dimuat.');
      } finally { if (active) setLoading(false); }
    }
    void loadInvoice();
    return () => { active = false; };
  }, [code, refresh]);
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
      {code && <button disabled={loading} onClick={() => setRefresh(value => value + 1)} style={{ marginTop: '20px' }}>Periksa status terbaru</button>}
    </main>
  );
};
`);
write('pages/CustomerXenditCheckoutPage.tsx', "// Legacy links resolve to the API-backed invoice page.\nexport { CustomerPaymentInvoicePage as CustomerXenditCheckoutPage } from './CustomerPaymentInvoicePage';\n");

let s = read('pages/CustomerConfirmationPage.tsx');
s = s.replace("import { request }", "import { getPaymentInvoiceUrl } from '../utils/payment';\nimport { request }");
s = s.replace('customerProfile, bookingFormData }', 'customerProfile, bookingFormData, setBookingFormData, setSelectedBookingForInvoice }');
s = between(s, '    const nowIso', '      const payload: any = {', `    try {
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

`);
s = s.replace('packageId: safePackageId,\n        bookingCode: randomCode,', 'packageId,');
s = s.replace("customerName: pemesan.nama || 'Pelanggan TripKita'", 'customerName: pemesan.nama.trim()');
s = s.replace('        totalPrice: totalCost,', '        totalPrice: 0, // Let the server calculate the invoice amount.');
s = between(s, "        participants: peserta.map", '\n      };', '');
s = between(s, '      const paymentUrl = response.paymentUrl', '\n    } catch (err: any)', `      if (!response.id || !response.bookingCode) throw new Error('Respons booking tidak lengkap. Periksa Cek Booking sebelum mencoba lagi.');
      setSelectedBookingForInvoice(response);
      setBookingFormData(null);
      const paymentUrl = getPaymentInvoiceUrl(response.paymentUrl);
      if (paymentUrl) window.location.assign(paymentUrl);
      else navigateTo('halaman-pembayaran');
`);
s = s.replace('const serviceFee = 5000;', 'const serviceFee = 4000; // Matches the current backend booking fee.');
write('pages/CustomerConfirmationPage.tsx', s);
s = read('context/NavigationContext.tsx');
s = s.replace("  if (!hash || hash === '#/' || hash === '#') {", "  if ((!hash || hash === '#/' || hash === '#') && window.location.pathname.replace(/\\/$/, '') === '/riwayat-booking') return 'riwayat-booking';\n  if ((!hash || hash === '#/' || hash === '#') && window.location.pathname.replace(/\\/$/, '') === '/xendit-checkout') return 'xendit-checkout';\n  if (!hash || hash === '#/' || hash === '#') {");
write('context/NavigationContext.tsx', s);
