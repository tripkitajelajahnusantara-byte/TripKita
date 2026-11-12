import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useI18n } from '../i18n';
import {
  ArrowRight, BellRing, CalendarCheck, Check, Clock, FileSpreadsheet, MapPin, ShieldCheck, Store, Users, Wallet,
} from 'lucide-react';

// Halaman ini hanya memuat klaim yang sesuai dengan cara kerja platform saat
// ini. Angka pengguna, rating, dan testimoni sengaja tidak ditampilkan sampai
// ada data nyata yang bisa dipertanggungjawabkan. Kartu trip di bawah adalah
// contoh tampilan dan selalu diberi keterangan "contoh" di halaman.

const tripPhoto = (id: string, width = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=75`;

type Translate = (id: string, en: string) => string;

const sampleTrips = (t: Translate) => [
  { name: 'Open Trip Bromo Sunrise', location: t('Probolinggo, Jawa Timur', 'Probolinggo, East Java'), type: 'Open Trip', category: t('Gunung', 'Mountain'), duration: t('2 hari 1 malam', '2 days 1 night'), price: 'Rp450.000', photo: '1588668214407-6ea9a6d8c272' },
  { name: 'Snorkeling Raja Ampat', location: t('Raja Ampat, Papua Barat Daya', 'Raja Ampat, Southwest Papua'), type: 'Private Trip', category: 'Diving & Snorkeling', duration: t('4 hari 3 malam', '4 days 3 nights'), price: 'Rp6.500.000', photo: '1544551763-46a013bb70d5' },
  { name: 'Family Trip Curug Cilember', location: t('Bogor, Jawa Barat', 'Bogor, West Java'), type: 'Family', category: t('Curug', 'Waterfall'), duration: t('1 hari', '1 day'), price: 'Rp275.000', photo: '1432405972618-c60b0225b8f9' },
  { name: 'Sunset Tanah Lot & Uluwatu', location: 'Tabanan, Bali', type: 'Private Trip', category: t('Budaya & Sejarah', 'Culture & History'), duration: t('1 hari', '1 day'), price: 'Rp850.000', photo: '1518548419970-58e3b4079ab2' },
];

const payoutFlow = (t: Translate) => [
  { title: t('Pelanggan membayar', 'Customer pays'), detail: t('Pelanggan membayar penuh secara online melalui Midtrans dan pembayaran terkonfirmasi otomatis.', 'The customer pays in full online through Midtrans, and the payment is confirmed automatically.') },
  { title: t('Pencairan tahap 1 (50%)', 'Payout stage 1 (50%)'), detail: t('Separuh hak Anda (disebut DP 50% di menu Keuangan) dapat diajukan sebelum trip berangkat. Pelanggan tetap membayar penuh di awal.', 'Half of your share (labelled "DP 50%" in the Keuangan/Finance menu) can be requested before the trip departs. The customer still pays in full upfront.') },
  { title: t('Pencairan tahap 2 (50%)', 'Payout stage 2 (50%)'), detail: t('Sisa hak Anda (pelunasan) terbuka otomatis setelah tanggal trip berakhir.', 'The rest of your share (final payment) opens automatically after the trip end date.') },
  { title: t('Transfer ke rekening', 'Bank transfer'), detail: t('Tim TemenTrip mentransfer dan mengunggah bukti transfer yang bisa Anda unduh.', 'The TemenTrip team makes the transfer and uploads a transfer proof you can download.') },
];

const features = (t: Translate) => [
  {
    icon: CalendarCheck,
    title: t('Booking dan pembayaran di satu tempat', 'Bookings and payments in one place'),
    body: t('Traveler memilih tanggal dan membayar online melalui Midtrans. Booking masuk ke dashboard Anda otomatis setelah pembayaran terkonfirmasi.', 'Travelers pick a date and pay online through Midtrans. The booking lands in your dashboard automatically once payment is confirmed.'),
  },
  {
    icon: Users,
    title: t('Open Trip atau private trip', 'Open Trip or private trip'),
    body: t('Bagi kuota per keberangkatan untuk Open Trip, atau buka tanggal khusus untuk paket private agar tidak ada dua rombongan di hari yang sama.', 'Split the quota per departure for Open Trips, or open specific dates for private packages so no two groups share the same day.'),
  },
  {
    icon: BellRing,
    title: t('Pengingat H-3 sebelum berangkat', 'D-3 reminder before departure'),
    body: t('Tiga hari sebelum trip, Anda menerima ringkasan kuota atau prakiraan cuaca lokasi. Keputusan tetap di tangan Anda: lanjut, batalkan, atau tawarkan jadwal baru.', 'Three days before the trip, you get a quota summary or the local weather forecast. The decision stays with you: go ahead, cancel, or offer a new date.'),
  },
  {
    icon: ShieldCheck,
    title: t('Pembatalan dengan aturan yang jelas', 'Cancellations with clear rules'),
    body: t('Refund dihitung otomatis sesuai jarak ke tanggal trip, dan setiap pembatalan tercatat di riwayat keuangan Anda.', 'Refunds are calculated automatically based on how close it is to the trip date, and every cancellation is recorded in your finance history.'),
  },
  {
    icon: FileSpreadsheet,
    title: t('Laporan keuangan siap unduh', 'Downloadable financial reports'),
    body: t('Pantau saldo tersedia dan tertahan serta riwayat pencairan, lalu unduh laporan Excel atau bukti pencairan dalam PDF.', 'Track your available and held balances and payout history, then download Excel reports or payout proofs as PDF.'),
  },
  {
    icon: Store,
    title: t('Profil mitra publik', 'Public partner profile'),
    body: t('Halaman profil berisi paket aktif dan ulasan dari pelanggan yang benar-benar sudah berangkat, jadi calon traveler bisa mengenal usaha Anda.', 'Your profile page shows your active packages and reviews from customers who actually took the trip, so travelers can get to know your business.'),
  },
];

const steps = (t: Translate) => [
  { title: t('Daftar akun', 'Sign up'), body: t('Isi data usaha, kontak, rekening, dan unggah dokumen legalitas.', 'Enter your business details, contacts, and bank account, and upload your legal documents.') },
  { title: t('Tunggu peninjauan', 'Wait for review'), body: t('Tim TemenTrip memeriksa dokumen Anda. Hasilnya dikirim lewat notifikasi, termasuk alasan bila ada yang perlu diperbaiki.', 'The TemenTrip team reviews your documents. You get the result by notification, including the reasons if anything needs fixing.') },
  { title: t('Buat paket', 'Create packages'), body: t('Tambahkan foto, itinerary, harga, kuota, dan tanggal keberangkatan.', 'Add photos, itinerary, price, quota, and departure dates.') },
  { title: t('Terima booking', 'Receive bookings'), body: t('Paket aktif tampil di pencarian pelanggan dan siap dipesan.', 'Active packages appear in customer searches and are ready to book.') },
];

const faq = (t: Translate) => [
  {
    q: t('Apakah ada biaya pendaftaran?', 'Is there a registration fee?'),
    a: t('Tidak. TemenTrip mengambil potongan dari setiap transaksi. Besarannya terlihat di menu Keuangan setelah akun Anda disetujui, dan perubahan potongan hanya berlaku untuk transaksi baru.', 'No. TemenTrip takes a commission from each transaction. You can see the rate in the Keuangan (Finance) menu once your account is approved, and any change to the commission only applies to new transactions.'),
  },
  {
    q: t('Kapan dana bisa dicairkan?', 'When can I withdraw my funds?'),
    a: t('Hak Anda dicairkan dalam dua tahap. Tahap pertama (DP 50%) dapat diajukan setelah pelanggan membayar, tahap kedua (pelunasan) setelah trip selesai. Pencairan ditransfer manual oleh tim TemenTrip ke rekening yang sudah diverifikasi.', 'Your share is paid out in two stages. The first stage (DP 50%) can be requested once the customer has paid, and the second (final payment) after the trip is completed. Payouts are transferred manually by the TemenTrip team to your verified bank account.'),
  },
  {
    q: t('Bagaimana jika saya harus membatalkan trip?', 'What if I have to cancel a trip?'),
    a: t('Pelanggan yang sudah membayar menerima refund penuh. Bila pencairan tahap pertama sudah Anda terima, nilainya dipotong dari pendapatan berikutnya.', 'Customers who have paid get a full refund. If you have already received the first-stage payout, that amount is deducted from your next earnings.'),
  },
  {
    q: t('Dokumen apa yang dibutuhkan?', 'What documents are required?'),
    a: t('KTP penanggung jawab dan NIB wajib. SIUP, NPWP, akta, dan sertifikat lain bersifat opsional tetapi mempercepat peninjauan.', 'The ID card (KTP) of the person in charge and a business ID number (NIB) are required. SIUP, NPWP, deed of establishment, and other certificates are optional but speed up the review.'),
  },
];

export const ProviderLandingPage: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { t } = useI18n();

  return (
    <div className="landing-page animate-fade-in">
      <section className="hero-section pl-hero">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="pl-eyebrow">{t('Untuk operator dan agen wisata', 'For tour operators and travel agents')}</span>
            <h1 className="hero-title">
              {t('Tingkatkan bisnis trip Anda bersama', 'Grow your trip business with')} <span className="accent-text">TemenTrip</span>
            </h1>
            <p className="hero-subtitle">
              {t(
                'Tampilkan paket Anda ke traveler yang sedang mencari jadwal trip. Booking, pembayaran, dan pencairan dana tercatat di satu dashboard, jadi Anda bisa fokus menyiapkan perjalanannya.',
                'Show your packages to travelers looking for trip dates. Bookings, payments, and payouts are recorded in one dashboard, so you can focus on preparing the trip.'
              )}
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => navigateTo('provider-register')}>
                {t('Daftar sebagai mitra', 'Join as a partner')} <ArrowRight size={16} />
              </button>
              <button className="secondary-btn" onClick={() => navigateTo('provider-login')}>
                {t('Masuk ke dashboard', 'Sign in to dashboard')}
              </button>
            </div>
            <ul className="pl-hero-points">
              <li><Check size={15} aria-hidden="true" /> {t('Pendaftaran gratis', 'Free registration')}</li>
              <li><Check size={15} aria-hidden="true" /> {t('Akun aktif setelah dokumen ditinjau', 'Account active after document review')}</li>
              <li><Check size={15} aria-hidden="true" /> {t('Pencairan dua tahap', 'Two-stage payouts')}</li>
            </ul>
          </div>

          <figure className="pl-hero-visual">
            <article className="pl-hero-card">
              <div className="pl-hero-card-media">
                <img src={tripPhoto('1507525428034-b723cf961d3e', 720)} alt={t('Pantai berpasir putih saat matahari terbenam', 'White sand beach at sunset')} />
                <span className="pl-chip">Open Trip</span>
              </div>
              <div className="pl-hero-card-body">
                <h3>{t('Open Trip Pulau Tidung 2H1M', 'Open Trip Pulau Tidung 2D1N')}</h3>
                <p className="pl-meta"><MapPin size={14} aria-hidden="true" /> Kepulauan Seribu, Jakarta</p>
                <div className="pl-hero-card-row">
                  <p className="pl-price"><small>{t('Mulai', 'From')}</small> <strong>Rp450.000</strong> <small>{t('/orang', '/person')}</small></p>
                  <span className="pl-date-chip"><CalendarCheck size={13} aria-hidden="true" /> {t('Sab, 17 Okt', 'Sat, 17 Oct')}</span>
                </div>
                <div className="pl-quota">
                  <div className="pl-quota-head"><span>{t('Kuota keberangkatan', 'Departure quota')}</span><strong>{t('9/12 kursi', '9/12 seats')}</strong></div>
                  <div className="pl-quota-bar"><span style={{ width: '75%' }} /></div>
                </div>
              </div>
            </article>
            <div className="pl-float pl-float-booking">
              <span className="pl-float-icon"><BellRing size={16} aria-hidden="true" /></span>
              <div><strong>{t('Booking baru masuk', 'New booking received')}</strong><small>{t('2 peserta · pembayaran terverifikasi', '2 participants · payment confirmed')}</small></div>
            </div>
            <div className="pl-float pl-float-payout">
              <span className="pl-float-icon pl-float-icon-green"><Wallet size={16} aria-hidden="true" /></span>
              <div><strong>{t('Pencairan tahap 1', 'Payout stage 1')}</strong><small>{t('Siap diajukan sebelum trip', 'Ready to request before the trip')}</small></div>
            </div>
            <figcaption className="pl-visual-note">{t('Contoh tampilan. Nama, harga, dan angka hanya ilustrasi.', 'Sample view. Names, prices, and figures are for illustration only.')}</figcaption>
          </figure>
        </div>
      </section>

      <section className="pl-section">
        <div className="container">
          <div className="pl-section-head">
            <h2>{t('Pasarkan trip apa pun yang Anda kelola', 'Market any trip you run')}</h2>
            <p>
              {t(
                'Dari open trip akhir pekan sampai private trip keluarga dan rombongan kantor. Tampilkan paket dengan foto, itinerary, dan jadwal yang mudah dipahami traveler.',
                'From weekend open trips to private family trips and company outings. Show your packages with photos, itineraries, and schedules that travelers can easily understand.'
              )}
            </p>
          </div>
          <div className="pl-trip-grid">
            {sampleTrips(t).map((trip) => (
              <article key={trip.name} className="pl-trip">
                <div className="pl-trip-media">
                  <img src={tripPhoto(trip.photo, 600)} alt="" loading="lazy" />
                  <span className="pl-chip">{trip.type}</span>
                </div>
                <div className="pl-trip-body">
                  <span className="pl-trip-category">{trip.category}</span>
                  <h3>{trip.name}</h3>
                  <p className="pl-meta"><MapPin size={14} aria-hidden="true" /> {trip.location}</p>
                  <div className="pl-trip-foot">
                    <span><Clock size={13} aria-hidden="true" /> {trip.duration}</span>
                    <span>{t('mulai', 'from')} <strong>{trip.price}</strong></span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="pl-grid-note">{t('Contoh paket untuk ilustrasi. Harga, kuota, dan jadwal sepenuhnya Anda tentukan.', 'Sample packages for illustration. You set the price, quota, and schedule.')}</p>
        </div>
      </section>

      <section className="pl-section pl-section-muted">
        <div className="container">
          <div className="pl-section-head">
            <h2>{t('Yang Anda dapat sebagai mitra', 'What you get as a partner')}</h2>
            <p>{t('Semua fitur di bawah ini sudah bisa dipakai di dashboard mitra hari ini.', 'All the features below are available in the partner dashboard today.')}</p>
          </div>
          <div className="pl-feature-grid">
            {features(t).map(({ icon: Icon, title, body }) => (
              <div key={title} className="pl-feature">
                <span className="pl-feature-icon"><Icon size={20} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pl-section">
        <div className="container pl-split">
          <div className="pl-split-copy">
            <h2>{t('Dana Anda, alurnya jelas', 'Your funds, a clear flow')}</h2>
            <p>
              {t(
                'Traveler membayar penuh di awal. Hak Anda dicairkan dalam dua tahap, dan setiap transfer disertai bukti yang bisa diunduh kapan saja.',
                'Travelers pay in full upfront. Your share is paid out in two stages, and every transfer comes with proof you can download anytime.'
              )}
            </p>
            <ul className="pl-split-points">
              <li><Check size={15} aria-hidden="true" /> {t('Separuh hak Anda bisa diajukan sebelum trip berangkat', 'Half of your share can be requested before the trip departs')}</li>
              <li><Check size={15} aria-hidden="true" /> {t('Pelunasan terbuka otomatis setelah trip selesai', 'The final payment opens automatically after the trip ends')}</li>
              <li><Check size={15} aria-hidden="true" /> {t('Riwayat pencairan tercatat di menu Keuangan', 'Payout history is recorded in the Keuangan (Finance) menu')}</li>
            </ul>
          </div>
          <div className="pl-flow-card">
            <h3 className="pl-flow-title">{t('Alur dana untuk mitra', 'Partner fund flow')}</h3>
            <ol className="pl-flow-list">
              {payoutFlow(t).map((step, index) => (
                <li key={step.title}>
                  <span className="pl-flow-index">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="pl-section pl-section-muted">
        <div className="container">
          <div className="pl-section-head">
            <h2>{t('Cara bergabung', 'How to join')}</h2>
            <p>{t('Empat langkah dari pendaftaran sampai booking pertama.', 'Four steps from sign-up to your first booking.')}</p>
          </div>
          <ol className="pl-steps">
            {steps(t).map((step, index) => (
              <li key={step.title}>
                <span className="pl-step-index">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pl-section">
        <div className="container pl-faq-wrap">
          <div className="pl-section-head">
            <h2>{t('Pertanyaan yang sering diajukan', 'Frequently asked questions')}</h2>
          </div>
          <div className="pl-faq">
            {faq(t).map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pl-cta">
        <div className="container pl-cta-inner">
          <div>
            <h2>{t('Siap mengembangkan bisnis trip Anda?', 'Ready to grow your trip business?')}</h2>
            <ul className="pl-cta-points">
              <li><Check size={15} aria-hidden="true" /> {t('Tanpa biaya pendaftaran', 'No registration fee')}</li>
              <li><Check size={15} aria-hidden="true" /> {t('Pembayaran pelanggan diproses online', 'Customer payments processed online')}</li>
              <li><Check size={15} aria-hidden="true" /> {t('Pencairan dengan bukti transfer', 'Payouts with transfer proof')}</li>
            </ul>
          </div>
          <div className="pl-cta-actions">
            <button className="primary-btn" onClick={() => navigateTo('provider-register')}>
              {t('Daftar sebagai mitra', 'Join as a partner')} <ArrowRight size={16} />
            </button>
            <button className="pl-cta-link" onClick={() => navigateTo('bantuan')}>
              {t('Punya pertanyaan lain? Buka Bantuan', 'Other questions? Visit Help')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
