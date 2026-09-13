const {ts, read, write, between, removeVars, removeNodes, removeJsx} = require('./cleanup-helpers.cjs');
let s = read('context/NavigationContext.tsx');
if (!s.includes('interface BookingFormData')) {
s = s.replace('interface NavigationContextType', `interface BookingFormData {
  packageId: number;
  tripDate: string;
  pemesan: { nama: string };
  guests: number;
}

interface NavigationContextType`);
s = between(s, '  bookingFormData: {', '  isAuthModalOpen:', '  bookingFormData: BookingFormData | null;\n  setBookingFormData: React.Dispatch<React.SetStateAction<BookingFormData | null>>;\n');
s = between(s, '  const [bookingFormData, setBookingFormDataState]', '  const [registerData', '  const [bookingFormData, setBookingFormData] = useState<BookingFormData | null>(null);\n\n');
write('context/NavigationContext.tsx', s);
}

write('pages/CustomerBookingPage.tsx', `import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { formatRupiah } from '../utils/payment';

export const CustomerBookingPage = () => {
  const { navigateTo, selectedPackageForDetail: pkg, customerProfile, setBookingFormData, bookingFormData, openAuthModal } = useNavigation();
  const savedForm = bookingFormData?.packageId === pkg?.id ? bookingFormData : null;
  const [name, setName] = useState(savedForm?.pemesan.nama || customerProfile?.picName || '');
  const [error, setError] = useState('');
  const guests = pkg?.bookingGuests;
  const tripDate = pkg?.bookingDate;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!customerProfile) { openAuthModal('login'); return; }
    if (!name.trim() || !Number.isInteger(guests) || guests < 1 || !tripDate || !Number.isFinite(Date.parse(tripDate))) {
      setError('Lengkapi nama pemesan dan pilih tanggal serta jumlah peserta dari detail paket.');
      return;
    }
    setBookingFormData({ packageId: Number(pkg.id), tripDate, guests, pemesan: { nama: name.trim() } });
    navigateTo('customer-confirmation');
  };
  if (!pkg) return <main className="container" style={{ padding: '60px 20px' }}><p>Pilih paket wisata terlebih dahulu.</p><button onClick={() => navigateTo('cari-trip')}>Cari trip</button></main>;
  return (
    <main className="container" style={{ maxWidth: '800px', padding: '40px 20px 80px' }}>
      <button onClick={() => navigateTo('paket-detail')}>Kembali ke detail paket</button>
      <h1>Data Pemesanan</h1>
      <section style={{ background: '#fff', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', marginBottom: '24px' }}>
        <h2>{pkg.name}</h2><p>{pkg.destination}</p>
        <p>Tanggal keberangkatan: {tripDate || 'Belum dipilih'}</p>
        <p>Jumlah peserta: {guests || 'Belum dipilih'}</p>
        <p>Harga paket: {formatRupiah(pkg.price)} / orang</p>
      </section>
      {!customerProfile ? <button onClick={() => openAuthModal('login')}>Masuk untuk melanjutkan</button> : (
        <form onSubmit={submit} style={{ background: '#fff', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
          <label htmlFor="booking-name">Nama pemesan</label>
          <input id="booking-name" value={name} onChange={event => setName(event.target.value)} required autoComplete="name" maxLength={255} style={{ display: 'block', width: '100%', padding: '12px', margin: '8px 0 20px' }} />
          {error && <p role="alert">{error}</p>}
          <button type="submit" className="primary-btn">Periksa pemesanan</button>
        </form>
      )}
    </main>
  );
};
`);
s = read('pages/CustomerConfirmationPage.tsx');
s = s.replace('const { pemesan, peserta } = bookingFormData;\n  const guestsCount = peserta.length;', 'const { pemesan, guests: guestsCount } = bookingFormData;');
s = removeVars(s, ['selectedAddOns', 'addOnsTotal', 'calculateAge']);
s = s.replace(' + addOnsTotal', '');
s = removeNodes(s, (node, sf) => ts.isJsxExpression(node) && node.getText(sf).startsWith('{selectedAddOns.map'));
s = between(s, '          {/* Pemesan & Peserta Card */}', '          {/* Ringkasan Pembayaran', `          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h2>Data Pemesan</h2><p>{pemesan.nama}</p><p>{guestsCount} peserta</p>
          </div>

`);
s = s.replace("    setShowConfirmModal(false);\n    setSubmitting(true);", "    if (submitting) return;\n    setShowConfirmModal(false);\n    setSubmitting(true);");
s = s.replace("const totalCost = baseCost + serviceFee;", "const totalCost = baseCost + serviceFee;");
s = s.replace('guests: guestsCount || 1', 'guests: guestsCount');
s = s.replace('Ringkasan Pembayaran', 'Estimasi Pembayaran');
write('pages/CustomerConfirmationPage.tsx', s);
s = read('pages/CustomerPackageDetailPage.tsx').replace('      selectedAddOns: []\n', '');
write('pages/CustomerPackageDetailPage.tsx', s);

s = read('pages/AdminDashboardPage.tsx');
for(const cls of ['hamburger-btn','notification-bell-btn','filter-btn-outline']) s = removeJsx(s,'button',text=>text.startsWith('<button className="'+cls+'">'));
s = removeJsx(s,'div',text=>text.startsWith('<div className="pagination-buttons">'));
s = s.replace('Menampilkan 1 - {filteredProviders.length} dari {filteredProviders.length} data', 'Menampilkan {filteredProviders.length} data');
s = s.replace('Verifikasi bukti transfer pembayaran manual Bank OCBC.', 'Verifikasi bukti pembayaran manual yang dikirim pelanggan.');
write('pages/AdminDashboardPage.tsx',s);
s = read('pages/CustomerSettingsPage.tsx').replace("import { getTripImage } from '../utils/tripImages';\n",'');
write('pages/CustomerSettingsPage.tsx', s);
