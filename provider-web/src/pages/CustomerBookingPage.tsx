import { useState } from 'react';
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
