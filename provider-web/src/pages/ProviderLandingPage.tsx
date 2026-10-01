import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import {
  ArrowRight, BellRing, CalendarCheck, Check, Clock, FileSpreadsheet, MapPin, ShieldCheck, Store, Users, Wallet,
} from 'lucide-react';

// Halaman ini hanya memuat klaim yang sesuai dengan cara kerja platform saat
// ini. Angka pengguna, rating, dan testimoni sengaja tidak ditampilkan sampai
// ada data nyata yang bisa dipertanggungjawabkan. Kartu trip di bawah adalah
// contoh tampilan dan selalu diberi keterangan "contoh" di halaman.

const tripPhoto = (id: string, width = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=75`;

const SAMPLE_TRIPS = [
  { name: 'Open Trip Bromo Sunrise', location: 'Probolinggo, Jawa Timur', type: 'Open Trip', category: 'Gunung', duration: '2 hari 1 malam', price: 'Rp450.000', photo: '1588668214407-6ea9a6d8c272' },
  { name: 'Snorkeling Raja Ampat', location: 'Raja Ampat, Papua Barat Daya', type: 'Private Trip', category: 'Diving & Snorkeling', duration: '4 hari 3 malam', price: 'Rp6.500.000', photo: '1544551763-46a013bb70d5' },
  { name: 'Family Trip Curug Cilember', location: 'Bogor, Jawa Barat', type: 'Family', category: 'Curug', duration: '1 hari', price: 'Rp275.000', photo: '1432405972618-c60b0225b8f9' },
  { name: 'Sunset Tanah Lot & Uluwatu', location: 'Tabanan, Bali', type: 'Private Trip', category: 'Budaya & Sejarah', duration: '1 hari', price: 'Rp850.000', photo: '1518548419970-58e3b4079ab2' },
];

const PAYOUT_FLOW = [
  { title: 'Pelanggan membayar', detail: 'Pelanggan transfer ke rekening TemenTrip dan mengunggah bukti pembayaran.' },
  { title: 'Pencairan tahap 1 (50%)', detail: 'Separuh hak Anda (disebut DP 50% di menu Keuangan) dapat diajukan sebelum trip berangkat. Pelanggan tetap membayar penuh di awal.' },
  { title: 'Pencairan tahap 2 (50%)', detail: 'Sisa hak Anda (pelunasan) terbuka otomatis setelah tanggal trip berakhir.' },
  { title: 'Transfer ke rekening', detail: 'Tim TemenTrip mentransfer dan mengunggah bukti transfer yang bisa Anda unduh.' },
];

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Booking dan pembayaran di satu tempat',
    body: 'Traveler memilih tanggal, membayar, dan mengunggah bukti transfer. Booking masuk ke dashboard Anda setelah pembayaran diverifikasi admin.',
  },
  {
    icon: Users,
    title: 'Open Trip atau private trip',
    body: 'Bagi kuota per keberangkatan untuk Open Trip, atau buka tanggal khusus untuk paket private agar tidak ada dua rombongan di hari yang sama.',
  },
  {
    icon: BellRing,
    title: 'Pengingat H-3 sebelum berangkat',
    body: 'Tiga hari sebelum trip, Anda menerima ringkasan kuota atau prakiraan cuaca lokasi. Keputusan tetap di tangan Anda: lanjut, batalkan, atau tawarkan jadwal baru.',
  },
  {
    icon: ShieldCheck,
    title: 'Pembatalan dengan aturan yang jelas',
    body: 'Refund dihitung otomatis sesuai jarak ke tanggal trip, dan setiap pembatalan tercatat di riwayat keuangan Anda.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Laporan keuangan siap unduh',
    body: 'Pantau saldo tersedia dan tertahan serta riwayat pencairan, lalu unduh laporan Excel atau bukti pencairan dalam PDF.',
  },
  {
    icon: Store,
    title: 'Profil mitra publik',
    body: 'Halaman profil berisi paket aktif dan ulasan dari pelanggan yang benar-benar sudah berangkat, jadi calon traveler bisa mengenal usaha Anda.',
  },
];

const STEPS = [
  { title: 'Daftar akun', body: 'Isi data usaha, kontak, rekening, dan unggah dokumen legalitas.' },
  { title: 'Tunggu peninjauan', body: 'Tim TemenTrip memeriksa dokumen Anda. Hasilnya dikirim lewat notifikasi, termasuk alasan bila ada yang perlu diperbaiki.' },
  { title: 'Buat paket', body: 'Tambahkan foto, itinerary, harga, kuota, dan tanggal keberangkatan.' },
  { title: 'Terima booking', body: 'Paket aktif tampil di pencarian pelanggan dan siap dipesan.' },
];

const FAQ = [
  {
    q: 'Apakah ada biaya pendaftaran?',
    a: 'Tidak. TemenTrip mengambil potongan dari setiap transaksi. Besarannya terlihat di menu Keuangan setelah akun Anda disetujui, dan perubahan potongan hanya berlaku untuk transaksi baru.',
  },
  {
    q: 'Kapan dana bisa dicairkan?',
    a: 'Hak Anda dicairkan dalam dua tahap. Tahap pertama (DP 50%) dapat diajukan setelah pelanggan membayar, tahap kedua (pelunasan) setelah trip selesai. Pencairan ditransfer manual oleh tim TemenTrip ke rekening yang sudah diverifikasi.',
  },
  {
    q: 'Bagaimana jika saya harus membatalkan trip?',
    a: 'Pelanggan yang sudah membayar menerima refund penuh. Bila pencairan tahap pertama sudah Anda terima, nilainya dipotong dari pendapatan berikutnya.',
  },
  {
    q: 'Dokumen apa yang dibutuhkan?',
    a: 'KTP penanggung jawab dan NIB wajib. SIUP, NPWP, akta, dan sertifikat lain bersifat opsional tetapi mempercepat peninjauan.',
  },
];

export const ProviderLandingPage: React.FC = () => {
  const { navigateTo } = useNavigation();

  return (
    <div className="landing-page animate-fade-in">
      <section className="hero-section pl-hero">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="pl-eyebrow">Untuk operator dan agen wisata</span>
            <h1 className="hero-title">
              Tingkatkan bisnis trip Anda bersama <span className="accent-text">TemenTrip</span>
            </h1>
            <p className="hero-subtitle">
              Tampilkan paket Anda ke traveler yang sedang mencari jadwal trip. Booking, pembayaran,
              dan pencairan dana tercatat di satu dashboard, jadi Anda bisa fokus menyiapkan perjalanannya.
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => navigateTo('provider-register')}>
                Daftar sebagai mitra <ArrowRight size={16} />
              </button>
              <button className="secondary-btn" onClick={() => navigateTo('provider-login')}>
                Masuk ke dashboard
              </button>
            </div>
            <ul className="pl-hero-points">
              <li><Check size={15} aria-hidden="true" /> Pendaftaran gratis</li>
              <li><Check size={15} aria-hidden="true" /> Akun aktif setelah dokumen ditinjau</li>
              <li><Check size={15} aria-hidden="true" /> Pencairan dua tahap</li>
            </ul>
          </div>

          <figure className="pl-hero-visual">
            <article className="pl-hero-card">
              <div className="pl-hero-card-media">
                <img src={tripPhoto('1507525428034-b723cf961d3e', 720)} alt="Pantai berpasir putih saat matahari terbenam" />
                <span className="pl-chip">Open Trip</span>
              </div>
              <div className="pl-hero-card-body">
                <h3>Open Trip Pulau Tidung 2H1M</h3>
                <p className="pl-meta"><MapPin size={14} aria-hidden="true" /> Kepulauan Seribu, Jakarta</p>
                <div className="pl-hero-card-row">
                  <p className="pl-price"><small>Mulai</small> <strong>Rp450.000</strong> <small>/orang</small></p>
                  <span className="pl-date-chip"><CalendarCheck size={13} aria-hidden="true" /> Sab, 17 Okt</span>
                </div>
                <div className="pl-quota">
                  <div className="pl-quota-head"><span>Kuota keberangkatan</span><strong>9/12 kursi</strong></div>
                  <div className="pl-quota-bar"><span style={{ width: '75%' }} /></div>
                </div>
              </div>
            </article>
            <div className="pl-float pl-float-booking">
              <span className="pl-float-icon"><BellRing size={16} aria-hidden="true" /></span>
              <div><strong>Booking baru masuk</strong><small>2 peserta · pembayaran terverifikasi</small></div>
            </div>
            <div className="pl-float pl-float-payout">
              <span className="pl-float-icon pl-float-icon-green"><Wallet size={16} aria-hidden="true" /></span>
              <div><strong>Pencairan tahap 1</strong><small>Siap diajukan sebelum trip</small></div>
            </div>
            <figcaption className="pl-visual-note">Contoh tampilan. Nama, harga, dan angka hanya ilustrasi.</figcaption>
          </figure>
        </div>
      </section>

      <section className="pl-section">
        <div className="container">
          <div className="pl-section-head">
            <h2>Pasarkan trip apa pun yang Anda kelola</h2>
            <p>
              Dari open trip akhir pekan sampai private trip keluarga dan rombongan kantor. Tampilkan paket
              dengan foto, itinerary, dan jadwal yang mudah dipahami traveler.
            </p>
          </div>
          <div className="pl-trip-grid">
            {SAMPLE_TRIPS.map((trip) => (
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
                    <span>mulai <strong>{trip.price}</strong></span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="pl-grid-note">Contoh paket untuk ilustrasi. Harga, kuota, dan jadwal sepenuhnya Anda tentukan.</p>
        </div>
      </section>

      <section className="pl-section pl-section-muted">
        <div className="container">
          <div className="pl-section-head">
            <h2>Yang Anda dapat sebagai mitra</h2>
            <p>Semua fitur di bawah ini sudah bisa dipakai di dashboard mitra hari ini.</p>
          </div>
          <div className="pl-feature-grid">
            {FEATURES.map(({ icon: Icon, title, body }) => (
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
            <h2>Dana Anda, alurnya jelas</h2>
            <p>
              Traveler membayar penuh di awal. Hak Anda dicairkan dalam dua tahap, dan setiap transfer
              disertai bukti yang bisa diunduh kapan saja.
            </p>
            <ul className="pl-split-points">
              <li><Check size={15} aria-hidden="true" /> Separuh hak Anda bisa diajukan sebelum trip berangkat</li>
              <li><Check size={15} aria-hidden="true" /> Pelunasan terbuka otomatis setelah trip selesai</li>
              <li><Check size={15} aria-hidden="true" /> Riwayat pencairan tercatat di menu Keuangan</li>
            </ul>
          </div>
          <div className="pl-flow-card">
            <h3 className="pl-flow-title">Alur dana untuk mitra</h3>
            <ol className="pl-flow-list">
              {PAYOUT_FLOW.map((step, index) => (
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
            <h2>Cara bergabung</h2>
            <p>Empat langkah dari pendaftaran sampai booking pertama.</p>
          </div>
          <ol className="pl-steps">
            {STEPS.map((step, index) => (
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
            <h2>Pertanyaan yang sering diajukan</h2>
          </div>
          <div className="pl-faq">
            {FAQ.map((item) => (
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
            <h2>Siap mengembangkan bisnis trip Anda?</h2>
            <ul className="pl-cta-points">
              <li><Check size={15} aria-hidden="true" /> Tanpa biaya pendaftaran</li>
              <li><Check size={15} aria-hidden="true" /> Pembayaran pelanggan diproses online</li>
              <li><Check size={15} aria-hidden="true" /> Pencairan dengan bukti transfer</li>
            </ul>
          </div>
          <div className="pl-cta-actions">
            <button className="primary-btn" onClick={() => navigateTo('provider-register')}>
              Daftar sebagai mitra <ArrowRight size={16} />
            </button>
            <button className="pl-cta-link" onClick={() => navigateTo('bantuan')}>
              Punya pertanyaan lain? Buka Bantuan
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
