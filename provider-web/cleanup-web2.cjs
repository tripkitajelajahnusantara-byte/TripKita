const {fs, ts, read, write, between, removeNodes, removeVars, removeJsx} = require('./cleanup-helpers.cjs');
let s = read('pages/CustomerSettingsPage.tsx');
s = s.replace("'akun' | 'favorit' | 'review'", "'akun' | 'review'");
s = s.replace("useState('Laki-laki')", "useState('')").replace("customerProfile.gender || 'Laki-laki'", "customerProfile.gender || ''");
s = removeVars(s, ['[wishlistItems, setWishlistItems]', 'handleRemoveWishlist']);
s = between(s, '  useEffect(() => {\n    const loadWishlist', '  const handleSaveProfile', `  const [reviewsError, setReviewsError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setReviewItems([]);
    if (!customerProfile || activeTab !== 'review') return;
    setReviewsLoading(true);
    setReviewsError('');
    async function loadReviews() {
      try {
        const bookings = await request('/customer/bookings');
        const results = await Promise.all((bookings || []).map(async (booking: any) => {
          const result = await request('/public/reviews/booking/' + booking.id);
          return result.reviewed && result.review ? {
            ...result.review, packageName: booking.packageDetails?.name || 'Paket wisata',
            date: result.review.createdAt
          } : null;
        }));
        if (active) setReviewItems(results.filter(Boolean));
      } catch {
        if (active) setReviewsError('Ulasan gagal dimuat. Silakan buka kembali tab Ulasan.');
      } finally {
        if (active) setReviewsLoading(false);
      }
    }
    void loadReviews();
    return () => { active = false; };
  }, [customerProfile?.id, activeTab]);

`);
s = between(s, '      const updatedProfile = {', '      showAlert({', '      setCustomerProfile(updated);\n\n');
s = between(s, '      // Fallback local update if offline', '    } finally {', `      showAlert({
        type: 'error', title: 'Profil Gagal Disimpan',
        message: err.message || 'Data belum tersimpan. Silakan coba lagi.'
      });
`);
s = removeJsx(s, 'button', text => text.includes("setActiveTab('favorit')"));
s = removeNodes(s, (n,sf) => ts.isJsxExpression(n) && n.getText(sf).startsWith("{activeTab === 'favorit'"));
s = s.replace('Kelola data pribadi, paket favorit yang Anda simpan, dan riwayat ulasan ulasan perjalanan Anda.', 'Kelola data pribadi dan ulasan perjalanan Anda.');
s = s.replace('<option value="Laki-laki">', '<option value="" disabled>Pilih jenis kelamin</option>\n                        <option value="Laki-laki">');
s = s.replace('{reviewItems.length === 0 ? (', '{reviewsLoading ? <p>Memuat ulasan...</p> : reviewsError ? <p role="alert">{reviewsError}</p> : reviewItems.length === 0 ? (');
s = s.replace(/rev.rating \|\| 5/g, 'rev.rating || 0');
write('pages/CustomerSettingsPage.tsx', s);
fs.unlinkSync(__dirname + '/src/utils/wishlist.ts');

s = read('components/NotificationCenter.tsx');
s = s.replace("import React, { useState, useEffect }", "import React, { useState, useEffect, useCallback }");
s = s.replace("import { API_BASE_URL, getAuthHeaders }", "import { request }");
s = between(s, '  const { navigateTo }', '  const getIcon', `  const { navigateTo, providerProfile, customerProfile } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [readingId, setReadingId] = useState<number | null>(null);
  const isCustomer = customerProfile?.role === 'CUSTOMER';
  const endpoint = isCustomer ? '/customer/notifications' : '/provider/notifications';
  const userId = isCustomer ? customerProfile?.id : providerProfile?.id;
  const unreadCount = notifications.filter(item => !item.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!userId) { setNotifications([]); setLoading(false); return; }
    try {
      const data = await request(endpoint);
      setNotifications(data.data || []);
      setError('');
    } catch {
      setError('Notifikasi gagal dimuat. Silakan coba lagi.');
    } finally { setLoading(false); }
  }, [endpoint, userId]);

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => { void fetchNotifications(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotifClick = async (item: NotificationItem) => {
    if (readingId !== null) return;
    setReadingId(item.id);
    try {
      if (!item.isRead) {
        await request(endpoint + '/' + item.id + '/read', { method: 'PUT' });
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
      }
      setIsOpen(false);
      navigateTo(isCustomer ? 'riwayat-booking' : item.type === 'PAYOUT' ? 'keuangan-provider' : 'booking');
    } catch {
      setError('Notifikasi belum berhasil ditandai dibaca. Silakan coba lagi.');
    } finally { setReadingId(null); }
  };

`);
s = s.replace('{notifications.length === 0 ? (', '{loading ? <p>Memuat notifikasi...</p> : error ? <div role="alert"><p>{error}</p><button onClick={() => void fetchNotifications()}>Coba lagi</button></div> : notifications.length === 0 ? (');
write('components/NotificationCenter.tsx', s);

// Remove fabricated provider reputation; reviews come from package review endpoints.
s = read('pages/ProfileProviderPage.tsx');
s = removeVars(s, ['reviews']);
s = s.replace("'Wisata Nusantara'", "'Mitra'");
s = s.replace('  const [stats, setStats]', `  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsError, setReviewsError] = useState('');
  useEffect(() => {
    let active = true;
    async function loadReviews() {
      try {
        const packages = await request('/provider/packages');
        const lists = await Promise.all((packages || []).map(async (pkg: any) => {
          const reviews = await request('/public/reviews/package/' + pkg.id);
          return (reviews || []).map((review: any) => ({
            ...review, name: 'Pelanggan', trip: pkg.name,
            date: new Date(review.createdAt).toLocaleDateString('id-ID')
          }));
        }));
        if (active) setReviews(lists.flat().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3));
      } catch { if (active) setReviewsError('Ulasan gagal dimuat.'); }
    }
    void loadReviews();
    return () => { active = false; };
  }, []);
  const [stats, setStats]`);
s = s.replace('<div className="profile-avatar-large">WN</div>', '<div className="profile-avatar-large">{providerName.slice(0, 2).toUpperCase()}</div>');
s = s.replace('<span className="status-badge-verified">✓ Terverifikasi</span>', "{providerProfile?.status === 'APPROVED' && <span className=\"status-badge-verified\">✓ Terverifikasi</span>}");
s = s.replace('4.92 <span>(284 ulasan)</span>', "{stats?.rating ? stats.rating.toFixed(2) : 'Belum ada ulasan'}");
s = between(s, '            {/* Achievements/Pencapaian Card */}', '{/* Mini Stats Card */}', '            ');
s = s.replace('                {reviews.map((rev, i)', '                {reviewsError ? <p role="alert">{reviewsError}</p> : reviews.length === 0 && <p>Belum ada ulasan.</p>}\n                {reviews.map((rev, i)');
s = removeJsx(s, 'div', text => text.startsWith('<div className="field-group">') && text.includes('<label>TAGLINE</label>'));
s = s.replace('<p className="tagline">Jelajahi keindahan Indonesia bersama kami</p>', '');
write('pages/ProfileProviderPage.tsx', s);
