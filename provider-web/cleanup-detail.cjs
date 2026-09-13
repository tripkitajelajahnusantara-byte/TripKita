const {ts, read, write, between, removeNodes, removeVars, removeJsx} = require('./cleanup-helpers.cjs');
let s = read('pages/CustomerPackageDetailPage.tsx');
s = s.replace("import { API_BASE_URL }", "import { request }");
s = between(s, 'const FALLBACK_IMAGE', 'export const CustomerPackageDetailPage', "import { EMPTY_TRIP_IMAGE, getTripImage } from '../utils/tripImages';\nconst FALLBACK_IMAGE = EMPTY_TRIP_IMAGE;\n\n");
s = s.replace('export const CustomerPackageDetailPage: React.FC = () => {', `export const CustomerPackageDetailPage: React.FC = () => {
  const { selectedPackageForDetail, setSelectedPackageForDetail, navigateTo } = useNavigation();
  const urlId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('id');
  const packageId = Number(urlId || selectedPackageForDetail?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    async function loadPackage() {
      try {
        if (!Number.isInteger(packageId) || packageId <= 0) throw new Error('Pilih paket wisata terlebih dahulu.');
        const packages = await request('/public/packages');
        const found = (packages || []).find((pkg: any) => pkg.id === packageId && pkg.status === 'Aktif');
        if (!found) throw new Error('Paket wisata tidak tersedia.');
        if (active) setSelectedPackageForDetail((previous: any) => ({
          ...found, bookingDate: previous?.id === found.id ? previous.bookingDate : undefined
        }));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Paket gagal dimuat.');
      } finally { if (active) setLoading(false); }
    }
    void loadPackage();
    return () => { active = false; };
  }, [packageId, setSelectedPackageForDetail]);
  if (loading || error || !selectedPackageForDetail) return (
    <div className="container" style={{ padding: '80px 20px' }}>
      <p role={error ? 'alert' : 'status'}>{loading ? 'Memuat paket wisata...' : error || 'Paket tidak tersedia.'}</p>
      {!loading && <button onClick={() => navigateTo('cari-trip')}>Kembali ke daftar trip</button>}
    </div>
  );
  return <PackageDetailContent key={packageId} />;
};

const PackageDetailContent: React.FC = () => {`);
s = between(s, '  // Add-ons State', '  const [reviewPage', `  const [reviewsList, setReviewsList] = useState<Array<{ id: number; name: string; avatar: string; rating: number; date: string; comment: string; verified: boolean }>>([]);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    request('/public/reviews/package/' + selectedPackageForDetail.id).then(data => {
      if (active) setReviewsList((data || []).map((review: any) => ({
        id: review.id, name: 'Pelanggan', avatar: 'P', rating: review.rating,
        date: new Date(review.createdAt).toLocaleDateString('id-ID'),
        comment: review.comment, verified: Boolean(review.bookingId)
      })));
    }).catch(() => { if (active) setReviewsError('Ulasan gagal dimuat.'); })
      .finally(() => { if (active) setReviewsLoading(false); });
    return () => { active = false; };
  }, [selectedPackageForDetail.id]);

`);
s = between(s, '  // Auto load package', '  const pkg = selectedPackageForDetail;');
s = between(s, '  const getSpecificMeetingPoint', '  const formatDateIndoFull', "  const activeMeetingPoint = pkg.meetingPoint?.trim() || '';\n\n");
s = between(s, '  const getDefaultDurationDays', '  const [customStartDate', `  const durationFromDates = Math.round((Date.parse(pkg.endDate) - Date.parse(pkg.startDate)) / 86400000);
  const defaultDuration = Number.isFinite(durationFromDates) && durationFromDates >= 0 ? durationFromDates : 0;

`);
s = between(s, '  // Booked / Occupied dates', '  const getBookedDatesInSelectedRange', '  const currentPkgBookedDates: string[] = Array.isArray(pkg.bookedDates) ? pkg.bookedDates : [];\n\n');
s = s.replace('pkg.quotaMax || 15', 'pkg.quotaMax ?? 0');
s = between(s, '  const getDestinationDefaults', '  const getActiveSchedules', `  const photos: string[] = (pkg.images || pkg.image || '').split(',')
    .map((path: string) => path.trim()).filter(Boolean)
    .map((path: string) => getTripImage(pkg.id, pkg.name, pkg.category, path));

`);
s = between(s, '  const getActiveSchedules', '  // Pre-select schedule', `  const availableSchedules: Array<{ label: string; dateValue: string }> = [];
  if (pkg.startDate && Number.isFinite(Date.parse(pkg.startDate)) && Date.parse(pkg.startDate + 'T23:59:59') >= Date.now()) {
    availableSchedules.push({ label: pkg.schedule || formatDateIndoFull(pkg.startDate), dateValue: pkg.startDate });
  }

`);
s = between(s, '  const getScheduleQuotaUsed', '  const currentScheduleQuotaUsed', `  const getScheduleQuotaUsed = (_dateStr: string): number => pkg.quotaUsed ?? 0;

`);
s = between(s, '  const toggleAddOn', '  const getDynamicItinerary');
s = s.replace('desc: `Aktivitas perjalanan Hari ${item.day} bersama tim pemandu profesional TemenTrip.`', "desc: act.description || ''");
s = s.replace(/    return \[\n      \{ day: 'Hari 1',[\s\S]*?\n    \];/, '    return [];');
s = s.replace(/    return \[\n      'Penginapan[\s\S]*?\n    \];/, '    return [];');
s = s.replace(/    return \[\n      'Tiket Pesawat[\s\S]*?\n    \];/, '    return [];');
s = s.replace('    const selectedAddOnObjects = addOnsList.filter(a => selectedAddOnIds.includes(a.id));\n', '');
s = s.replace('selectedAddOns: selectedAddOnObjects', 'selectedAddOns: []');
s = s.replace('`${formatDateIndoFull(customStartDate)} - ${formatDateIndoFull(customEndDate)}`', 'customStartDate');
s = s.replace('bookingDate: finalBookingDate,', 'bookingDate: finalBookingDate,\n      bookingEndDate: isOpenTrip ? pkg.endDate : customEndDate,');
s = between(s, '            {/* Layanan Add-On Tambahan */}', '            {/* Titik Kumpul');
s = between(s, '            {/* Profil Provider Penyelenggara Section */}', '            {/* Ulasan & Rating', `            {pkg.providerId && <div style={{ background: '#fff', padding: '24px', borderRadius: '16px' }}>
              <h2>Paket dari mitra yang sama</h2>
              <button onClick={() => { setSelectedProviderId(pkg.providerId); navigateTo('provider-public-profile'); }}>Lihat paket mitra</button>
            </div>}

`);
s = s.replace(/pkg.description \|\| `Nikmati[^`]+`/, "pkg.description || 'Deskripsi belum tersedia.'");
s = s.replace('{displayItinerary.map(', '{displayItinerary.length === 0 && <p>Itinerary belum tersedia.</p>}\n                {displayItinerary.map(');
s = s.replace('{displayIncludedFacilities.map(', '{displayIncludedFacilities.length === 0 && <p>Belum ada informasi fasilitas.</p>}\n                    {displayIncludedFacilities.map(');
s = s.replace('{displayExcludedFacilities.map(', '{displayExcludedFacilities.length === 0 && <p>Belum ada informasi fasilitas.</p>}\n                    {displayExcludedFacilities.map(');
s = s.replace('<strong>{activeMeetingPoint}</strong>', "<strong>{activeMeetingPoint || 'Titik kumpul belum tersedia.'}</strong>");
s = s.replace('                <iframe\n', '                {activeMeetingPoint && <iframe\n');
s = s.replace('src={`https://maps.google.com/maps?q=${encodeURIComponent(activeMeetingPoint)}&t=m&z=16&output=embed`}\n                />', 'src={`https://maps.google.com/maps?q=${encodeURIComponent(activeMeetingPoint)}&t=m&z=16&output=embed`}\n                />}');
s = s.replace('(reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)', "reviewsList.length ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1) : '—'");
s = s.replace('{currentReviews.map(', '{reviewsLoading ? <p>Memuat ulasan...</p> : reviewsError ? <p role="alert">{reviewsError}</p> : reviewsList.length === 0 && <p>Belum ada ulasan.</p>}\n                {currentReviews.map(');
s = s.replace(/pkg.quotaMin \|\| 4/g, 'pkg.quotaMin ?? 0');
s = removeNodes(s, (n, sf) => ts.isJsxExpression(n) && n.getText(sf).startsWith('{totalAddOnsCost > 0'));
s = s.replace(/ \+ totalAddOnsCost/g, '');
s = s.replace('      openAuthModal(\'login\', () => {\n        // Automatically proceed after successful login in AuthModal\n        handleBookNow();\n      });', "      openAuthModal('login');");
write('pages/CustomerPackageDetailPage.tsx', s);
