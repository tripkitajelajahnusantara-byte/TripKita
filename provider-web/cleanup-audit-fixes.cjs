const {read, write, between, removeJsx} = require('./cleanup-helpers.cjs');
let s = read('pages/LoginPage.tsx');
s = removeJsx(s, 'div', text => text.includes('className="') && text.includes('2,500+') && !text.includes('<form') && !text.includes('<h1') && !text.includes('<h2'));
write('pages/LoginPage.tsx', s);
s = read('pages/ProviderLandingPage.tsx');
s = s.replace('Tampil di aplikasi & website TemenTrip yang dikunjungi 1M+ juta user setiap bulan dari seluruh Indonesia.', 'Tampilkan paket wisata Anda di katalog TemenTrip agar dapat ditemukan dan dipesan pelanggan.');
write('pages/ProviderLandingPage.tsx', s);

s = read('utils/api.ts');
s += `\nexport function getUploadUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\\/\\//i.test(path)) return path;
  if (!path.startsWith('/uploads/') && !path.startsWith('uploads/')) return undefined;
  return API_BASE_URL.replace(/\\/api\\/v1\\/?$/, '') + '/' + path.replace(/^\\//, '');
}\n`;
write('utils/api.ts', s);
for(const page of ['ProfileProviderPage.tsx','AdminDashboardPage.tsx']) {
  s = read('pages/'+page);
  s = s.replace("from '../utils/api';", "from '../utils/api';\nimport { getUploadUrl } from '../utils/api';");
  s = s.replace(/`http:\/\/localhost:8080\$\{([^}]+)\}`/g, 'getUploadUrl($1)');
  if(page === 'ProfileProviderPage.tsx') s = s.replace("status === 'APPROVED' || (!pendingPath && activePath && providerProfile?.status === 'APPROVED')", "status === 'APPROVED'");
  else {
    s = s.replace("providerProfile?.email || 'admin@tripkita.id'", "providerProfile?.email || '—'");
    s = s.replace("docStatus || (selectedProvider?.status === 'APPROVED' ? 'APPROVED' : 'PENDING')", "docStatus || 'PENDING'");
  }
  write('pages/'+page, s);
}
s = read('pages/RegisterPage.tsx');
s = "import { API_BASE_URL } from '../utils/api';\n" + s;
s = s.replace("fetch('http://localhost:8080/api/v1/public/auth/upload'", "fetch(API_BASE_URL + '/public/auth/upload'");
write('pages/RegisterPage.tsx', s);

s = read('pages/ProviderFinancePage.tsx');
s = s.replace("  const [loading, setLoading]", "  const [loadError, setLoadError] = useState('');\n  const [loading, setLoading]");
s = s.replace('    setLoading(true);', "    setLoading(true);\n    setLoadError('');");
s = s.replace("      console.error('Failed to fetch payout summary:', err);", "      setSummary(null);\n      setLoadError('Data keuangan gagal dimuat. Silakan coba lagi.');");
s = s.replace('telah dikirim dan akan langsung ditransfer ke rekening bank Mitra Anda.', 'telah dikirim untuk diproses oleh admin.');
s = s.replace('  return (\n    <div className="dashboard-layout', `  if (loading || loadError || !summary) return (
    <div className="dashboard-layout"><Sidebar /><main className="dashboard-main">
      <h1>Keuangan & Saldo Mitra</h1>
      <p role={loadError ? 'alert' : 'status'}>{loading ? 'Memuat data keuangan...' : loadError || 'Data keuangan belum tersedia.'}</p>
      {!loading && <button onClick={() => void fetchSummary()}>Coba lagi</button>}
    </main></div>
  );
  return (
    <div className="dashboard-layout`);
write('pages/ProviderFinancePage.tsx', s);

s = read('pages/KelolaPaketPage.tsx');
s = s.replace("  const [packages, setPackages]", "  const [loadError, setLoadError] = useState('');\n  const [loading, setLoading] = useState(true);\n  const [packages, setPackages]");
s = between(s, '  const loadPackages = async () => {', '      if (Array.isArray(data))', "  const loadPackages = async () => {\n    setLoading(true); setLoadError('');\n    try {\n      const data = await request('/provider/packages');\n");
s = s.replace("          category: pkg.category || '',", "          category: pkg.category || '',\n          image: pkg.images || pkg.image || '',");
s = s.replace("      console.error('Failed to load packages:', err);\n    }", "      setPackages([]);\n      setLoadError('Paket gagal dimuat. Silakan coba lagi.');\n    } finally { setLoading(false); }");
s = s.replace("      <main className=\"dashboard-main\">", '      <main className="dashboard-main">\n        {loading && <p role="status">Memuat paket...</p>}\n        {loadError && <div role="alert"><p>{loadError}</p><button onClick={() => void loadPackages()}>Coba lagi</button></div>}');
s = s.replace('getTripImage(Number(pkg.id), pkg.name, (pkg as any).category)', 'getTripImage(Number(pkg.id), pkg.name, (pkg as any).category, pkg.image)');
write('pages/KelolaPaketPage.tsx', s);
s = read('types/index.ts').replace('export interface PackageItem {', 'export interface PackageItem {\n  image?: string;');
write('types/index.ts', s);
s = read('pages/ManageBookingPage.tsx');
s = s.replace("  const [isLoading, setIsLoading]", "  const [loadError, setLoadError] = useState('');\n  const [isLoading, setIsLoading]");
s = s.replace('    setIsLoading(true);', "    setIsLoading(true); setLoadError('');");
s = s.replace("      if (statsRes.status === 'fulfilled'", "      if (statsRes.status === 'rejected' || bookingsRes.status === 'rejected') {\n        setLoadError('Sebagian data booking gagal dimuat. Silakan coba lagi.');\n        if (statsRes.status === 'rejected') setStats(null);\n        if (bookingsRes.status === 'rejected') setBookings([]);\n      }\n      if (statsRes.status === 'fulfilled'");
s = s.replace('      <main className="dashboard-main">', '      <main className="dashboard-main">\n        {loadError && <div role="alert"><p>{loadError}</p><button onClick={() => void loadData()}>Coba lagi</button></div>}');
s = s.replace("paymentMethod: b.paymentMethod || 'Transfer Bank'", "paymentMethod: b.paymentMethod || '—'");
write('pages/ManageBookingPage.tsx', s);

s = read('components/ShareModal.tsx');
s = s.replace('const handleCopyLink = () => {\n    if (navigator.clipboard) {\n      navigator.clipboard.writeText(shareUrl);', "const handleCopyLink = async () => {\n    try {\n      await navigator.clipboard.writeText(shareUrl);");
s = s.replace("      setTimeout(() => setToastMsg(''), 3000);\n    }", "      setTimeout(() => setToastMsg(''), 3000);\n    } catch { setToastMsg('Link belum berhasil disalin. Silakan salin dari kolom tautan.'); }");
// Instagram has no direct share endpoint; remove the button that only opens its home page.
s = between(s, '  const handleInstagramShare', '  const pkgImg');
s = removeJsx(s, 'button', text=>text.includes('onClick={handleInstagramShare}'));
s = s.replace(', Camera }', ' }');
write('components/ShareModal.tsx', s);

s = read('pages/CustomerHelpPage.tsx');
s = s.replace('Setelah pembayaran berhasil, buka menu "Cek Booking" di bagian navigasi atas, masukkan Kode Booking Anda (contoh: TK-14108-xxxx), lalu klik tombol hijau "Join WA Group Mitra" untuk terhubung langsung dengan tour guide dan peserta lainnya.', 'Tautan grup perjalanan belum tersedia melalui website. Hubungi bantuan dengan menyertakan kode booking untuk informasi kontak penyelenggara.');
write('pages/CustomerHelpPage.tsx', s);
s = read('components/ProviderHintTour.tsx').replace('Lihat detail pemesan, daftar peserta, verifikasi pembayaran, dan update status trip.', 'Lihat nama pemesan, jumlah peserta, pembayaran, dan status trip.');
write('components/ProviderHintTour.tsx', s);
