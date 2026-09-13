const {ts, read, write, between, removeVars, removeJsx} = require('./cleanup-helpers.cjs');
let s = read('pages/CustomerPaymentInvoicePage.tsx');
s = s.replace("import { useEffect, useState }", "import { useEffect }").replace("import { request } from '../utils/api';", "import { useApiData } from '../utils/useApiData';");
s = between(s, '  const [booking, setBooking]', '  const paymentUrl', `  const { data: booking, loading, error: loadError, reload } = useApiData<CustomerBooking>(code ? '/public/bookings/status/' + encodeURIComponent(code) : null);
  const error = !code ? 'Pilih booking melalui Cek Booking untuk melihat invoice.' : loadError || (!loading && !booking?.id ? 'Data invoice tidak tersedia.' : '');
  useEffect(() => {
    if (!booking?.bookingCode) return;
    const url = new URL(window.location.href);
    url.hash = '/halaman-pembayaran?code=' + encodeURIComponent(booking.bookingCode);
    window.history.replaceState(null, '', url);
  }, [booking?.bookingCode]);
`);
s = s.replace('onClick={() => setRefresh(value => value + 1)}', 'onClick={reload}');
write('pages/CustomerPaymentInvoicePage.tsx', s);

s = read('pages/ProviderPublicProfilePage.tsx');
s = s.replace("import { useEffect, useState } from 'react';\n", '');
s = s.replace("import { request } from '../utils/api';", "import { useApiData } from '../utils/useApiData';");
s = between(s, '  const [packages, setPackages]', '  return (', `  const { data, loading, error: loadError } = useApiData<ProviderPackage[]>(selectedProviderId ? '/public/packages' : null);
  const packages = (data || []).filter(pkg => pkg.providerId === selectedProviderId && pkg.status === 'Aktif');
  const error = selectedProviderId ? loadError : 'Pilih mitra dari halaman detail paket.';
`);
write('pages/ProviderPublicProfilePage.tsx', s);

s = read('pages/CustomerPackageDetailPage.tsx');
s = s.replace("import { request } from '../utils/api';", "import { request } from '../utils/api';\nimport { useApiData } from '../utils/useApiData';\nimport type { PublicPackage } from '../types';");
s = between(s, '  const { selectedPackageForDetail', '\nconst PackageDetailContent:', `  const { selectedPackageForDetail, navigateTo } = useNavigation();
  const urlId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('id');
  const packageId = Number(urlId || selectedPackageForDetail?.id);
  const validId = Number.isInteger(packageId) && packageId > 0;
  const { data, loading, error: loadError } = useApiData<PublicPackage[]>(validId ? '/public/packages' : null);
  const found = data?.find(pkg => pkg.id === packageId && pkg.status === 'Aktif');
  const error = !validId ? 'Pilih paket wisata terlebih dahulu.' : loadError || (!loading && !found ? 'Paket wisata tidak tersedia.' : '');
  if (loading || error || !found) return (
    <div className="container" style={{ padding: '80px 20px' }}>
      <p role={error ? 'alert' : 'status'}>{loading ? 'Memuat paket wisata...' : error}</p>
      {!loading && <button onClick={() => navigateTo('cari-trip')}>Kembali ke daftar trip</button>}
    </div>
  );
  return <PackageDetailContent key={packageId} pkg={{ ...found, bookingDate: selectedPackageForDetail?.id === found.id ? selectedPackageForDetail.bookingDate : undefined }} />;
};
`);
s = s.replace('const PackageDetailContent: React.FC = () => {', 'const PackageDetailContent: React.FC<{ pkg: PublicPackage & { bookingDate?: string } }> = ({ pkg }) => {');
s = s.replace('navigateTo, selectedPackageForDetail, setSelectedPackageForDetail', 'navigateTo, setSelectedPackageForDetail');
s = s.replaceAll('selectedPackageForDetail.id', 'pkg.id');
s = s.replace('  const pkg = selectedPackageForDetail;\n', '');
s = s.replace('Array.isArray(pkg.bookedDates) ? pkg.bookedDates : []', '[]');
s = s.replace('  const getScheduleQuotaUsed = (_dateStr: string): number => pkg.quotaUsed ?? 0;\n\n  const currentScheduleQuotaUsed = isOpenTrip ? getScheduleQuotaUsed(selectedScheduleDate) : (pkg.quotaUsed || 0);\n  const totalQuotaUsed = currentScheduleQuotaUsed;', '  const totalQuotaUsed = pkg.quotaUsed ?? 0;');
s = s.replace("  const availableSchedules:", "  const [pageOpenedAt] = useState(() => Date.now());\n  const availableSchedules:");
s = s.replace("Date.parse(pkg.startDate + 'T23:59:59') >= Date.now()", "Date.parse(pkg.startDate + 'T23:59:59') >= pageOpenedAt");
write('pages/CustomerPackageDetailPage.tsx', s);

s = read('pages/CustomerHistoryPage.tsx');
s = s.replace("const [searchCode, setSearchCode] = useState('');", "const [searchCode, setSearchCode] = useState(() => new URLSearchParams(window.location.search).get('code') || new URLSearchParams(window.location.hash.split('?')[1] || '').get('code') || '');");
s = s.replace('      setSearchCode(code);\n      setTrackingLoading(true);\n', '');
write('pages/CustomerHistoryPage.tsx',s);
s = read('pages/CustomerSettingsPage.tsx').replace('[customerProfile?.id, activeTab]', '[customerProfile, activeTab]');
write('pages/CustomerSettingsPage.tsx',s);
s = read('pages/ProfileProviderPage.tsx');
s = "import type { PackageReview, PublicPackage } from '../types';\n" + s;
s = s.replace('useState<any[]>([])', 'useState<Array<PackageReview & { name: string; trip: string; date: string }>>([])');
s = s.replace('(pkg: any)', '(pkg: PublicPackage)').replace('(review: any)', '(review: PackageReview)');
write('pages/ProfileProviderPage.tsx',s);
// Unused catch bindings are unnecessary; request errors already appear in the page.
for(const page of ['AddPackagePage','CustomerHistoryPage','KelolaPaketPage','ProviderFinancePage']) {
  s = read('pages/'+page+'.tsx');
  s = s.replace(/catch \(err\) \{\n(\s*)(setLoadError|setHistoryError|setSummary|setPackages)/g, 'catch {\n$1$2');
  write('pages/'+page+'.tsx', s);
}
// Keep the image helper's existing call signature without unused parameter warnings.
s = read('utils/tripImages.ts');
s = s.replace("export function getTripImage(_id?: number, _name = '', _category = '', uploadedImage?: string): string {", "export function getTripImage(...args: [id?: number, name?: string, category?: string, uploadedImage?: string]): string {\n  const uploadedImage = args[3];");
write('utils/tripImages.ts',s);
