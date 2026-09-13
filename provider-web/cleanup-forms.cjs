const {ts, read, write, between, removeVars, removeJsx} = require('./cleanup-helpers.cjs');
let s = read('pages/CustomerHistoryPage.tsx');
s = s.replace(/\{\(trackedBooking.status === 'PAID' \|\| trackedBooking.status === 'CONFIRMED'\) && \(\s*\)\}/, '');
write('pages/CustomerHistoryPage.tsx', s);

s = read('pages/ProviderLandingPage.tsx');
s = removeVars(s, ['destinations']);
for (const cls of ['rating-widget', 'hero-widget-container']) s = removeJsx(s, 'div', text => text.startsWith('<div className="' + cls + '">'));
for (const cls of ['stats-ribbon', 'testimonials-section', 'destinations-section']) s = removeJsx(s, 'section', text => text.startsWith('<section className="' + cls + '">'));
s = s.replace('Bergabunglah dengan 2,500+ provider wisata terpercaya. Jangkau jutaan traveler, kelola booking dengan mudah, dan tingkatkan pendapatan bisnis Anda.', 'Kelola paket wisata, pemesanan pelanggan, dan pengajuan pencairan dana melalui portal mitra TemenTrip.');
s = s.replace('AI Platform Partner Wisata Indonesia', 'Platform Partner Wisata Indonesia');
s = s.replace('Sistem escrow aman dan pencairan otomatis. Dana Anda terlindungi dengan jaminan pembayaran 100% setelah trip selesai.', 'Pantau transaksi dan ajukan pencairan dana melalui menu keuangan mitra.');
write('pages/ProviderLandingPage.tsx', s);
write('pages/LandingPage.tsx', "export { ProviderLandingPage as LandingPage } from './ProviderLandingPage';\n");

s = read('pages/AddPackagePage.tsx');
s = removeVars(s, ['[minGuests, setMinGuests]', '[maxGuests, setMaxGuests]', '[minAge, setMinAge]', '[maxAge, setMaxAge]', 'minG', 'maxG']);
s = removeJsx(s, 'div', text => text.startsWith('<div className="input-row-2">') && text.includes('value={minGuests}'));
s = removeJsx(s, 'div', text => text.startsWith('<div className="input-group">') && text.includes('<label>Batas Usia</label>'));
s = between(s, '      if (isNaN(minG)', '      if (!startDate');
s = s.replace("const [duration, setDuration] = useState('5')", "const [duration, setDuration] = useState('1')");
s = s.replace("const [location, setLocation] = useState('DKI Jakarta')", "const [location, setLocation] = useState('')");
s = s.replace("const [quotaMin, setQuotaMin] = useState('14')", "const [quotaMin, setQuotaMin] = useState('')");
s = s.replace("const [quotaMax, setQuotaMax] = useState('15')", "const [quotaMax, setQuotaMax] = useState('')");
s = s.replace(/useState<\{ day: number; activities: \{ time: string; title: string \}\[\] \}\[\]>\(\[[\s\S]*?\n  \]\);/, 'useState<{ day: number; activities: { time: string; title: string }[] }[]>([]);');
for (const state of ['includedFacilities', 'excludedFacilities', 'packagePhotos']) {
  const setter = 'set' + state[0].toUpperCase() + state.slice(1);
  const start = '  const [' + state + ', ' + setter + ']';
  const idx = s.indexOf(start), end = s.indexOf(']);', idx) + 3;
  s = s.slice(0, idx) + start + ' = useState<string[]>([]);' + s.slice(end);
}
s = s.replace("  const [showPreviewModal", "  const [submitting, setSubmitting] = useState(false);\n  const [loadingPackage, setLoadingPackage] = useState(Boolean(editingPackageId));\n  const [loadError, setLoadError] = useState('');\n  const [showPreviewModal");
s = s.replace("          setPackageName(pkg.name || '');", `          setCategory(pkg.category || '');
          setTripType(pkg.tripType || '');
          setQuotaMin(String(pkg.quotaMin ?? ''));
          setStartDate(pkg.startDate || '');
          setEndDate(pkg.endDate || '');
          const days = Math.round((Date.parse(pkg.endDate) - Date.parse(pkg.startDate)) / 86400000) + 1;
          setDuration(String(Number.isFinite(days) && days > 0 ? days : 1));
          setPackageName(pkg.name || '');`);
s = s.replace("          console.error('Failed to load package details:', err);", "          setLoadError('Data paket gagal dimuat. Kembali ke Kelola Paket dan coba lagi.');\n        } finally {\n          setLoadingPackage(false);");
s = s.replace("  const handleSubmit = async (status: 'draft' | 'publish') => {", "  const handleSubmit = async (status: 'draft' | 'publish') => {\n    if (submitting || loadingPackage || loadError || isUploadingPhoto) return;");
s = s.replace("    try {\n      const dbStatus", "    setSubmitting(true);\n    try {\n      const dbStatus");
s = s.replace("alert(err.message || 'Gagal menyimpan paket wisata');\n    }", "alert(err.message || 'Gagal menyimpan paket wisata');\n    } finally { setSubmitting(false); }");
s = s.replace(/onClick=\{\(\) => handleSubmit\('(draft|publish)'\)\}/g, "disabled={submitting || loadingPackage || Boolean(loadError) || isUploadingPhoto} onClick={() => handleSubmit('$1')}");
s = s.replace('        {/* Header toolbar */}', '        {loadError && <p role="alert">{loadError}</p>}\n        {loadingPackage && <p role="status">Memuat data paket...</p>}\n        {/* Header toolbar */}');
write('pages/AddPackagePage.tsx', s);

s = read('pages/CustomerPackageDetailPage.tsx');
s = s.replace("    pkg.bookingDate || (availableSchedules.length > 0 ? availableSchedules[0].dateValue : '')", "    availableSchedules[0]?.dateValue || ''");
s = s.replace("      if (match) {\n        setSelectedScheduleDate(match.dateValue);\n      }", "      setSelectedScheduleDate(match?.dateValue || availableSchedules[0]?.dateValue || '');");
s = s.replace("    if (availableSeats <= 0) {", "    if (isOpenTrip && !availableSchedules.some(schedule => schedule.dateValue === selectedScheduleDate)) {\n      showAlert({ type: 'warning', message: 'Jadwal keberangkatan belum tersedia.' });\n      return;\n    }\n    if (availableSeats <= 0) {");
s = s.replace('                  {availableSchedules.map(', '                  {availableSchedules.length === 0 && <option value="">Jadwal belum tersedia</option>}\n                  {availableSchedules.map(');
s = s.replace('Kurang {quotaShortage} orang lagi agar trip PASTI BERANGKAT!', 'Kurang {quotaShortage} peserta untuk mencapai kuota minimal.');
write('pages/CustomerPackageDetailPage.tsx', s);

s = read('utils/api.ts');
s = s.replace(/hash.includes\('\/provider'\)/g, "hash.startsWith('#/provider/')").replace(/hash.includes\('\/admin'\)/g, "hash.startsWith('#/admin/')");
s = s.replace('const token = getProviderToken() || getCustomerToken();', 'const token = getAuthToken();');
s = s.replace('  if (token) {\n    headers.set(', '  if (token && !headers.has(\'Authorization\')) {\n    headers.set(');
s = s.replace("  return response.json().catch(() => ({}));", "  if (response.status === 204) return null;\n  return response.json().catch(() => { throw new Error('Respons server tidak valid. Silakan coba lagi.'); });");
s = s.replace("token = isProviderRoute ? getProviderToken() : (getCustomerToken() || getProviderToken());", "token = isProviderRoute ? getProviderToken() : getCustomerToken();");
s = s.replace("endpoint.startsWith('/provider') || endpoint.startsWith('/admin') || isProviderRoute", "endpoint.startsWith('/provider') || endpoint.startsWith('/admin')");
write('utils/api.ts', s);
s = read('context/NavigationContext.tsx').replace(/hash.includes\('\/provider'\)/g, "hash.startsWith('#/provider/')").replace(/hash.includes\('\/admin'\)/g, "hash.startsWith('#/admin/')");
write('context/NavigationContext.tsx', s);
