import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ArrowRight, Check } from 'lucide-react';

// Halaman ini hanya memuat klaim yang sesuai dengan cara kerja platform saat
// ini. Angka pengguna, rating, dan testimoni sengaja tidak ditampilkan sampai
// ada data nyata yang bisa dipertanggungjawabkan.

const PAYOUT_FLOW = [
  { title: 'Pelanggan membayar', detail: 'Pembayaran online melalui iPaymu. Booking tercatat lunas setelah pembayaran terverifikasi.' },
  { title: 'Pencairan tahap 1 (50%)', detail: 'Separuh hak Anda (disebut DP 50% di menu Keuangan) dapat diajukan sebelum trip berangkat. Pelanggan tetap membayar penuh di awal.' },
  { title: 'Pencairan tahap 2 (50%)', detail: 'Sisa hak Anda (pelunasan) terbuka otomatis setelah tanggal trip berakhir.' },
  { title: 'Transfer ke rekening', detail: 'Tim TemenTrip mentransfer dan mengunggah bukti transfer yang bisa Anda unduh.' },
];

const FEATURES = [
  {
    title: 'Booking dan pembayaran di satu tempat',
    body: 'Pelanggan memilih tanggal, membayar online, dan booking langsung muncul di dashboard Anda lengkap dengan data peserta.',
  },
  {
    title: 'Open Trip atau private trip',
    body: 'Open Trip berbagi kuota per keberangkatan. Paket private memakai tanggal yang Anda buka sendiri, sehingga tidak ada dua rombongan di tanggal yang sama.',
  },
  {
    title: 'Pengingat H-3 sebelum berangkat',
    body: 'Tiga hari sebelum trip, Anda mendapat ringkasan kuota Open Trip atau prakiraan cuaca lokasi. Keputusan tetap di tangan Anda: lanjut, batalkan, atau tawarkan jadwal baru.',
  },
  {
    title: 'Pembatalan dengan aturan yang jelas',
    body: 'Refund dihitung otomatis sesuai jarak ke tanggal trip, dan setiap pembatalan tercatat di riwayat keuangan Anda.',
  },
  {
    title: 'Laporan keuangan',
    body: 'Lihat saldo tersedia dan tertahan, riwayat pencairan, lalu unduh laporan Excel atau bukti pencairan dalam PDF.',
  },
  {
    title: 'Profil mitra publik',
    body: 'Setiap mitra punya halaman profil berisi paket aktif dan ulasan dari pelanggan yang benar-benar sudah berangkat.',
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
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Jual paket wisata Anda di TemenTrip
            </h1>
            <p className="hero-subtitle">
              Tampilkan paket Anda ke pelanggan yang sedang mencari trip, terima pembayaran online,
              dan kelola booking sampai pencairan dana dari satu dashboard.
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => navigateTo('provider-register')}>
                Daftar sebagai mitra <ArrowRight size={16} />
              </button>
              <button className="secondary-btn" onClick={() => navigateTo('provider-login')}>
                Masuk ke dashboard
              </button>
            </div>
            <p className="pl-hero-note">
              Pendaftaran gratis. Akun aktif setelah dokumen ditinjau tim TemenTrip.
            </p>
          </div>

          <div className="hero-widget-container">
            <div className="pl-flow-card">
              <h2 className="pl-flow-title">Alur dana untuk mitra</h2>
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
        </div>
      </section>

      <section className="pl-section">
        <div className="container">
          <div className="pl-section-head">
            <h2>Yang Anda dapat sebagai mitra</h2>
            <p>Fitur yang sudah tersedia di dashboard mitra hari ini.</p>
          </div>
          <div className="pl-feature-grid">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="pl-feature">
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pl-section pl-section-muted">
        <div className="container">
          <div className="pl-section-head">
            <h2>Cara bergabung</h2>
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
            <h2>Siap menawarkan paket Anda?</h2>
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
