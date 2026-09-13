const fs = require('fs');
const ts = require('typescript');
const root = __dirname + '/src/';
const read = p => fs.readFileSync(root + p, 'utf8').replace(/\r\n/g, '\n');
const write = (p, s) => fs.writeFileSync(root + p, s);
function between(s, a, b, replacement = '') {
  const start = s.indexOf(a), end = s.indexOf(b, start + a.length);
  if (start < 0 || end < 0) throw Error(`Missing markers: ${a} / ${b}`);
  return s.slice(0, start) + replacement + s.slice(end);
}
function removeNodes(s, predicate) {
  const source = ts.createSourceFile('page.tsx', s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const ranges = [];
  function visit(node) {
    if (predicate(node, source)) ranges.push([node.getStart(source), node.end]);
    else ts.forEachChild(node, visit);
  }
  visit(source);
  for (const [start, end] of ranges.sort((a,b) => b[0]-a[0])) s = s.slice(0,start)+s.slice(end);
  return s;
}
const removeVars = (s, names) => removeNodes(s, (n, sf) => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => names.includes(d.name.getText(sf))));
const removeJsx = (s, tag, match) => removeNodes(s, (n, sf) => ts.isJsxElement(n) && n.openingElement.tagName.getText(sf) === tag && match(n.getText(sf)));

// Catalogs have no fallback inventory or locally persisted favorites.
for (const page of ['CustomerLandingPage.tsx', 'CustomerSearchPage.tsx']) {
  const path = 'pages/' + page;
  let s = read(path);
  if (!s.includes('DEFAULT_PACKAGES')) continue;
  s = removeVars(s, ['DEFAULT_PACKAGES', 'getDynamicScheduleStr', 'getReviewCount', 'toggleFavorite']);
  s = s.replace(/^import .*utils\/wishlist.*\n/m, '');
  s = between(s, '  const [wishlistIds', page === 'CustomerLandingPage.tsx' ? '  const handleSelectPackage' : '  const [selectedPackageForShare');
  s = removeJsx(s, 'button', text => text.includes('toggleFavorite('));
  s = s.replace(/\s*const isFavorite = wishlistIds.includes\(Number\(pkg.id\)\);/g, '');
  s = s.replace(/<span style=\{\{ color: '#94a3b8', fontWeight: 'normal' \}\}>\(\{getReviewCount\(pkg.id\)\}\)<\/span>/g, '');
  s = s.replace(/setPackages\(DEFAULT_PACKAGES\)/g, 'setPackages([])');
  s = s.replace('setPackages(activePkgs.length > 0 ? activePkgs : data)', 'setPackages(activePkgs)');
  s = s.replace('setPackages(activePkgs.length > 0 ? activePkgs : DEFAULT_PACKAGES)', 'setPackages(activePkgs)');
  s = s.replace("!p.status || p.status === 'Aktif' || p.status === 'Published' || p.status === 'published'", "p.status === 'Aktif'");
  s = s.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState('');");
  s = s.replace(/console.error\('Failed to load (?:search )?packages:', err\);/, "$&\n        setLoadError('Daftar paket gagal dimuat. Silakan muat ulang halaman.');");
  s = s.replace('{loading ? (', "{loadError ? <p role=\"alert\">{loadError}</p> : loading ? (");
  s = s.replace(/pkg.rating > 0 \? pkg.rating.toFixed\(1\) : '[45]\.\d'/g, "pkg.rating > 0 ? pkg.rating.toFixed(1) : 'Belum ada ulasan'");
  s = s.replace(/rating \|\| 4\.8/g, 'rating || 0').replace('pkg.quotaMax || 15', 'pkg.quotaMax ?? 0');
  s = s.replace("searchParams.date || pkg.startDate || '2026-05-22'", "searchParams.date || pkg.startDate || ''");
  s = s.replace('pkg.quotaMin || 2', 'pkg.quotaMin ?? 0');
  if (page === 'CustomerLandingPage.tsx') {
    s = s.replace('category: string) => {\n    return getTripImage(pkgId, name, category);', 'category: string, uploadedImage?: string) => {\n    return getTripImage(pkgId, name, category, uploadedImage);');
    s = s.replace(/getImageUrl\(pkg.id, pkg.name, pkg.category\)/g, 'getImageUrl(pkg.id, pkg.name, pkg.category, pkg.images || pkg.image)');
  } else s = removeVars(s, ['getTodayIsoDate']);
  write(path, s);
}

// Provider dashboard uses the existing API notification center.
let s = read('pages/DashboardPage.tsx');
if (s.includes('interface NotificationItem')) {
s = between(s, 'interface NotificationItem', 'export const DashboardPage');
s = between(s, '  // Notification state', '  useEffect(() => {', "  const providerName = providerProfile?.businessName || 'Mitra';\n  const [loadError, setLoadError] = useState('');\n\n");
s = removeVars(s, ['handleMarkAllRead']);
s = between(s, '            {/* Notification Bell', '            <div className="user-profile-circle"', '            <NotificationCenter />\n\n');
s = between(s, '        {/* H-3 Open Trip', '        {/* Stats Grid */}', '        {loadError && <p role="alert">{loadError}</p>}\n\n');
s = s.replace("import { request }", "import { NotificationCenter } from '../components/NotificationCenter';\nimport { getTripImage } from '../utils/tripImages';\nimport { request }");
s = s.replace('rating: pkg.rating || 5.0', 'rating: pkg.rating || 0');
s = between(s, "              img: (pkg.name || '')", '\n            }));', '              img: getTripImage(pkg.id, pkg.name, pkg.category, pkg.images || pkg.image),');
s = s.replace('        if (!isMounted) return;', "        if (!isMounted) return;\n        if ([statsRes, bookingsRes, packagesRes].some(result => result.status === 'rejected')) {\n          setLoadError('Sebagian data dashboard gagal dimuat. Silakan muat ulang halaman.');\n        }");
write('pages/DashboardPage.tsx', s);
}

// Remove the provider-only booking simulator and success-only fallback actions.
s = read('pages/ManageBookingPage.tsx');
s = between(s, '  // Simulation States', '  useEffect(() => {\n    setCurrentPage(1);');
s = removeNodes(s, (n, sf) => ts.isJsxExpression(n) && n.getText(sf).startsWith('{showSimulateModal &&'));
s = removeJsx(s, 'button', text => text.includes('setShowSimulateModal'));
s = s.replace(/\s*else \{\n\s*alert\(`Aksi:[^\n]+\n\s*\}/, '');
write('pages/ManageBookingPage.tsx', s);
s = read('pages/KelolaPaketPage.tsx');
s = s.replace(/\s*else \{\n\s*alert\(`Aksi:[^\n]+\n\s*\}/, '');
write('pages/KelolaPaketPage.tsx', s);

// Draft form state stays in React, rather than a second booking database in the browser.
s = read('context/NavigationContext.tsx');
s = s.replace('useState<number | null>(1)', 'useState<number | null>(null)');
s = between(s, '  } | null>(() => {', '  const [registerData', '  } | null>(null);\n\n  const setBookingFormData = setBookingFormDataState;\n\n');
s = between(s, '            if (data.wishlistData)', '            return data;');
write('context/NavigationContext.tsx', s);
s = read('components/ProviderHintTour.tsx').replace("    localStorage.setItem('tripkita_provider_seen_tour', 'true');\n", '');
write('components/ProviderHintTour.tsx', s);

// Browser-only mandatory terms acceptance has no persistence endpoint.
s = read('App.tsx');
s = s.replace(/^import .*LegalModals.*\n/m, '');
s = between(s, '  const [showGlobalCustomerTerms', '  React.useEffect(() => {\n    const privateProviderRoutes');
s = between(s, '  // Mandatory Terms Modal', '\n  //', '');
s = s.replace(/\s*\{renderGlobalTermsModal\(\)\}/g, '');
write('App.tsx', s);

// Asset placeholders explicitly identify missing photos; facilities come only from API data.
s = read('utils/tripImages.ts');
s = s.slice(0, s.indexOf('// Helper to get 3 highlights')) + `export const EMPTY_TRIP_IMAGE = '/images/trip-image-unavailable.svg';

export function getHighlightsForPackage(pkg: { highlights?: string[]; includedFacilities?: string }): string[] {
  return (pkg.highlights || pkg.includedFacilities?.split('\\n') || []).filter(Boolean).slice(0, 3);
}

export function getTripImage(_id?: number, _name = '', _category = '', uploadedImage?: string): string {
  const path = typeof uploadedImage === 'string' ? uploadedImage.split(',').map(value => value.trim()).find(Boolean) : '';
  if (!path) return EMPTY_TRIP_IMAGE;
  if (/^https?:\\/\\//i.test(path) || path.startsWith('data:image/')) return path;
  if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
    return API_BASE_URL.replace(/\\/api\\/v1\\/?$/, '') + '/' + path.replace(/^\\//, '');
  }
  return path.startsWith('/') ? path : EMPTY_TRIP_IMAGE;
}
`;
s = "import { API_BASE_URL } from './api';\n\n" + s;
write('utils/tripImages.ts', s);
fs.mkdirSync(__dirname + '/public/images', {recursive:true});
fs.writeFileSync(__dirname + '/public/images/trip-image-unavailable.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#e2e8f0"/><text x="400" y="250" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-family="sans-serif" font-size="26">Foto belum tersedia</text></svg>');
