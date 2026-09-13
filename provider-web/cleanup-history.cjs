const {ts, read, write, between, removeVars, removeJsx, removeNodes} = require('./cleanup-helpers.cjs');
let s = read('pages/CustomerHistoryPage.tsx');
s = between(s, 'const CountdownTimer:', 'export const CustomerHistoryPage');
s = between(s, '  const handleExpireBooking', '  const fetchHistory', `  const [historyError, setHistoryError] = useState('');
  const [sendingReview, setSendingReview] = useState(false);
  useEffect(() => {
    // Redirect parameters identify the booking only; the API owns its payment status.
    const code = new URLSearchParams(window.location.search).get('code') || new URLSearchParams(window.location.hash.split('?')[1] || '').get('code');
    if (code) {
      setSearchCode(code);
      setTrackingLoading(true);
      request('/public/bookings/status/' + encodeURIComponent(code))
        .then(data => setTrackedBooking(data))
        .catch(err => setTrackingError(err.message || 'Booking gagal dimuat.'))
        .finally(() => setTrackingLoading(false));
    }
    void fetchHistory();
  }, [customerProfile]);

`);
s = s.replace('    setLoading(true);\n    try {', "    setLoading(true);\n    setHistoryError('');\n    try {");
s = s.replace("        setSearchCode('');\n        setTrackedBooking(null);", '');
s = s.replace("      console.error('Failed to fetch booking history:', err);", "      setBookings([]);\n      setHistoryError('Riwayat booking gagal dimuat. Silakan coba lagi.');");
s = s.replace('`/public/bookings/status/${searchCode.trim()}`', '`/public/bookings/status/${encodeURIComponent(searchCode.trim())}`');
s = s.replace("setTrackingError('Kode booking tidak ditemukan. Mohon masukkan Kode Booking secara lengkap dan tepat (contoh: TK-2824-1889).');", "setTrackingError(err.message || 'Booking gagal dilacak. Silakan coba lagi.');");
s = removeVars(s, ['isBookingExpired']);
s = s.replace("booking.status === 'EXPIRED' || (booking.status === 'PENDING_PAYMENT' && isBookingExpired(booking.createdAt))", "booking.status === 'EXPIRED'");
s = s.replace('    if (!selectedReviewBooking) return;\n    try {', '    if (!selectedReviewBooking || sendingReview) return;\n    setSendingReview(true);\n    try {');
s = s.replace("message: 'Terima kasih! Ulasan dan penilaian bintang Anda telah berhasil dikirim dan tersimpan di database.'", "message: 'Terima kasih! Ulasan dan penilaian Anda berhasil dikirim.'");
s = s.replace("message: err.message || 'Gagal menyimpan ulasan ke database.',\n        isError: true\n      });\n    }", "message: err.message || 'Gagal menyimpan ulasan.',\n        isError: true\n      });\n    } finally { setSendingReview(false); }");
s = s.replace("case 'WAITING_CONFIRMATION':\n        return {\n          label: 'Lunas & Aktif'", "case 'WAITING_CONFIRMATION':\n        return {\n          label: 'Menunggu Konfirmasi Pembayaran'");
s = s.replace("      case 'REFUND_REQUIRED':", "      case 'CANCELLED_BY_CUSTOMER':\n      case 'CANCELLED_BY_PROVIDER':\n        return { label: 'Dibatalkan', color: '#ef4444', bgColor: '#fee2e2', icon: <XCircle size={14} /> };\n      case 'REFUNDED':\n        return { label: 'Dana Dikembalikan', color: '#0284c7', bgColor: '#eff6ff', icon: <CheckCircle2 size={14} /> };\n      case 'REFUND_REQUIRED':");
s = removeJsx(s, 'a', text => text.includes('https://wa.me/6281234567890'));
s = s.replace(/\s*accountNumber: '693800143473',/g, '').replace(/\s*bankName: 'Bank OCBC',/g, '');
s = removeNodes(s, (n, sf) => ts.isJsxExpression(n) && n.getText(sf).startsWith("{booking.status === 'PENDING_PAYMENT' &&"));
s = s.replace("                  <div style={{ borderTop: '1px dotted #e2e8f0'", `                  {booking.status === 'PENDING_PAYMENT' && <button onClick={() => {
                    setSelectedBookingForInvoice(booking);
                    navigateTo('halaman-pembayaran');
                  }}>Lihat invoice pembayaran</button>}
                  <div style={{ borderTop: '1px dotted #e2e8f0'`);
s = s.replace('{loading ? (', '{historyError ? <div role="alert"><p>{historyError}</p><button onClick={() => void fetchHistory()}>Coba lagi</button></div> : loading ? (');
s = s.replace("        {/* History List Header */}", "        {customerProfile && <button disabled={loading} onClick={() => void fetchHistory()}>Perbarui riwayat</button>}\n        {/* History List Header */}");
s = s.replace('onClick={handleSendReview}', 'disabled={sendingReview}\n                  onClick={handleSendReview}');
s = s.replace('onClick={() => setSelectedReviewBooking(null)}', 'disabled={sendingReview} onClick={() => setSelectedReviewBooking(null)}');
s = s.replace('packageName?: string; // Fallback for local history items', 'packageName?: string;');
write('pages/CustomerHistoryPage.tsx', s);

write('pages/ProviderPublicProfilePage.tsx', `import { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { getTripImage } from '../utils/tripImages';
import { formatRupiah } from '../utils/payment';

interface ProviderPackage {
  id: number; providerId: number; name: string; destination: string; status: string;
  price: number; image?: string; images?: string; category: string;
}

export const ProviderPublicProfilePage = () => {
  const { selectedProviderId, setSelectedPackageForDetail, navigateTo } = useNavigation();
  const [packages, setPackages] = useState<ProviderPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setPackages([]); setError('');
    async function loadPackages() {
      try {
        if (!selectedProviderId) throw new Error('Pilih mitra dari halaman detail paket.');
        const data = await request('/public/packages');
        if (active) setPackages((data || []).filter((pkg: ProviderPackage) => pkg.providerId === selectedProviderId && pkg.status === 'Aktif'));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Paket mitra gagal dimuat.');
      } finally { if (active) setLoading(false); }
    }
    void loadPackages();
    return () => { active = false; };
  }, [selectedProviderId]);
  return (
    <main className="container" style={{ padding: '40px 20px 80px' }}>
      <button onClick={() => navigateTo('cari-trip')}>Kembali ke daftar trip</button>
      <h1>Paket Wisata Mitra</h1>
      {loading ? <p>Memuat paket...</p> : error ? <p role="alert">{error}</p> : packages.length === 0 ? <p>Belum ada paket aktif dari mitra ini.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {packages.map(pkg => <article key={pkg.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
            <img src={getTripImage(pkg.id, pkg.name, pkg.category, pkg.images || pkg.image)} alt={pkg.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
            <div style={{ padding: '20px' }}><h2>{pkg.name}</h2><p>{pkg.destination}</p><p>{formatRupiah(pkg.price)} / orang</p>
              <button onClick={() => { setSelectedPackageForDetail(pkg); navigateTo('paket-detail'); }}>Lihat detail</button>
            </div>
          </article>)}
        </div>
      )}
    </main>
  );
};
`);
