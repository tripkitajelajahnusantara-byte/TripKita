import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  Heart, 
  Lightbulb, 
  Smile, 
  Award, 
  ChevronUp, 
  ArrowRight,
  TrendingUp,
  Compass
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { navigateTo } = useNavigation();

  const values = [
    { icon: <Heart size={20} color="#ef4444" />, title: 'Kepercayaan', desc: 'Kami membangun ekosistem wisata yang transparan, jujur, dan saling menguntungkan antara provider dan traveler.' },
    { icon: <Lightbulb size={20} color="#3b82f6" />, title: 'Inovasi', desc: 'Terus menerus menghadirkan teknologi terkini untuk mempermudah operasional bisnis wisata digital.' },
    { icon: <Smile size={20} color="#10b981" />, title: 'Inklusivitas', desc: 'Membuka akses bagi semua pelaku wisata, dari UMKM lokal hingga operator besar berskala nasional.' },
    { icon: <Award size={20} color="#f59e0b" />, title: 'Kualitas', desc: 'Standar tinggi dalam seleksi provider demi memberikan pengalaman wisata terbaik bagi setiap traveler.' },
  ];

  const milestones = [
    { year: '2019', title: 'Pendirian TripKita', desc: 'Didirikan oleh tim berpengalaman di industri pariwisata dan teknologi berbasis di Jakarta.' },
    { year: '2020', title: '100 Provider Pertama', desc: 'Berhasil mengajak 100 provider wisata pertama dan melayani 5.000+ pemesanan dalam tahun pertama.' },
    { year: '2021', title: 'Ekspansi Nasional', desc: 'Jangkauan diperluas ke 50+ kota di seluruh Indonesia. Total provider mencapai 500+.' },
    { year: '2022', title: 'Series A Funding', desc: 'Mendapatkan pendanaan Seri A dan meluncurkan fitur manajemen paket & booking terintegrasi.' },
    { year: '2023', title: '1 Juta Traveler', desc: 'Mencapai 1 juta traveler yang terkoneksi dengan 1,500+ provider aktif dan 20,000+ paket wisata.' },
    { year: '2024', title: '2,500+ Provider', desc: 'Tumbuh menjadi platform partner wisata #1 di Indonesia dengan 850K+ wisatawan puas.' },
  ];

  const team = [
    { name: 'Robi Adiyasa', role: 'CEO & Co-Founder', initial: 'RA', bg: '#00a896' },
    { name: 'Nadia Putri', role: 'CTO & Co-Founder', initial: 'NP', bg: '#3b82f6' },
    { name: 'Hendra Wijaya', role: 'Head of Partner Success', initial: 'HW', bg: '#f59e0b' },
    { name: 'Laila Sari', role: 'Head of Marketing', initial: 'LS', bg: '#a855f7' },
  ];

  return (
    <div className="about-page animate-fade-in">
      {/* About Hero */}
      <section className="about-hero">
        <div className="container about-hero-container">
          <span className="about-hero-tag">TENTANG KAMI</span>
          <h1>Kisah di Balik TripKita</h1>
          <p>Misi kami adalah memberdayakan setiap pelaku wisata Indonesia dengan teknologi terbaik.</p>
        </div>
      </section>

      {/* Intro Section */}
      <section className="about-intro">
        <div className="container intro-container">
          <div className="intro-content">
            <span className="section-tag">CERITA KAMI</span>
            <h2>Dimulai dari Passion untuk Pariwisata Indonesia</h2>
            <p>
              TripKita lahir dari sebuah pertanyaan sederhana: mengapa bisnis wisata lokal Indonesia yang luar biasa masih kesulitan menjangkau wisatawan yang tepat? Di tahun 2019, sekelompok anak muda berpengalaman di industri pariwisata dan teknologi berkumpul untuk menjawab pertanyaan ini.
            </p>
            <p>
              Kami percaya bahwa Indonesia memiliki kekayaan wisata yang tak tertandingi — dari ujung Sabang sampai Merauke. Yang dibutuhkan adalah jembatan digital yang menghubungkan keindahan itu dengan jutaan traveler yang ingin menjelajahinya.
            </p>

            <div className="intro-stats">
              <div className="intro-stat-item">
                <h3>5+</h3>
                <p>Tahun Berdiri</p>
              </div>
              <div className="intro-stat-item">
                <h3>2.5K+</h3>
                <p>Provider Aktif</p>
              </div>
              <div className="intro-stat-item">
                <h3>850K+</h3>
                <p>Traveler Puas</p>
              </div>
            </div>
          </div>

          <div className="intro-media">
            <div className="media-wrapper">
              <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" alt="Nusa Penida" />
              <div className="glass-card media-pill">
                <TrendingUp size={16} color="#00a896" />
                <div>
                  <strong>+267% Growth</strong>
                  <p>YoY 2023-2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="vision-mission-section">
        <div className="container vision-mission-grid">
          <div className="vision-card">
            <div className="card-icon-wrapper">
              <Compass size={24} color="#00a896" />
            </div>
            <h3>Visi</h3>
            <p>
              Menjadi platform ekosistem pariwisata digital terbesar dan terpercaya di Asia Tenggara, yang memberdayakan jutaan pelaku wisata lokal untuk berkembang di era digital.
            </p>
          </div>
          <div className="mission-card">
            <div className="card-icon-wrapper">
              <Award size={24} color="#00a896" />
            </div>
            <h3>Misi</h3>
            <ul>
              <li>✓ Mendigitalisasi bisnis wisata lokal dengan teknologi yang mudah digunakan.</li>
              <li>✓ Menghubungkan provider terpercaya dengan jutaan traveler Indonesia.</li>
              <li>✓ Menjamin keamanan transaksi dan kepuasan semua pihak.</li>
              <li>✓ Mendorong pertumbuhan pariwisata domestik yang berkelanjutan.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">NILAI KAMI</span>
            <h2 className="section-title">Prinsip yang Memandu Kami</h2>
          </div>

          <div className="values-grid">
            {values.map((v, i) => (
              <div key={i} className="value-card">
                <div className="value-icon-wrapper">
                  {v.icon}
                </div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="timeline-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">PERJALANAN KAMI</span>
            <h2 className="section-title">Tonggak Pencapaian</h2>
          </div>

          <div className="timeline-list">
            {milestones.map((m, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-year">
                  <span>{m.year}</span>
                  <ChevronUp size={16} color="#00a896" />
                </div>
                <div className="timeline-content">
                  <h3>{m.title}</h3>
                  <p>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">TIM KAMI</span>
            <h2 className="section-title">Orang-orang di Balik TripKita</h2>
          </div>

          <div className="team-grid">
            {team.map((t, i) => (
              <div key={i} className="team-card">
                <div className="team-avatar" style={{ backgroundColor: t.bg }}>
                  {t.initial}
                </div>
                <h3>{t.name}</h3>
                <p>{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Join */}
      <section className="about-cta">
        <div className="container about-cta-container">
          <h2>Jadilah Bagian dari Cerita Ini</h2>
          <p>Bergabunglah dengan ribuan provider yang sudah membuktikan manfaat TripKita.</p>
          <button className="about-cta-btn" onClick={() => navigateTo('daftar')}>
            Daftar Sebagai Partner <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <style>{`
        /* Hero */
        .about-hero {
          background: linear-gradient(135deg, rgba(9, 44, 46, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%), 
                      url('https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1920&q=80');
          background-size: cover;
          background-position: center;
          padding: 80px 0;
          color: #ffffff;
          text-align: center;
        }

        .about-hero-container {
          max-width: 640px;
        }

        .about-hero-tag {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-accent);
          letter-spacing: 1.5px;
          display: block;
          margin-bottom: 12px;
        }

        .about-hero h1 {
          color: #ffffff;
          font-size: 38px;
          margin-bottom: 12px;
        }

        .about-hero p {
          font-size: 15px;
          color: var(--color-text-light);
        }

        /* Intro */
        .about-intro {
          padding: 90px 0;
          background: #ffffff;
        }

        .intro-container {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 60px;
          align-items: center;
        }

        .intro-content h2 {
          font-size: 32px;
          margin-bottom: 24px;
        }

        .intro-content p {
          font-size: 14px;
          color: var(--color-text-medium);
          line-height: 1.7;
          margin-bottom: 20px;
        }

        .intro-stats {
          display: flex;
          gap: 32px;
          margin-top: 40px;
          border-top: 1px solid var(--color-border);
          padding-top: 30px;
        }

        .intro-stat-item h3 {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 800;
          color: var(--color-primary-medium);
        }

        .intro-stat-item p {
          font-size: 13px;
          color: var(--color-text-medium);
          margin-bottom: 0;
        }

        .intro-media .media-wrapper {
          position: relative;
        }

        .intro-media img {
          width: 100%;
          border-radius: var(--radius-lg);
          height: 380px;
          object-fit: cover;
          box-shadow: var(--shadow-md);
        }

        .media-pill {
          position: absolute;
          bottom: 24px;
          left: 24px;
          padding: 12px 20px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .media-pill strong {
          color: #ffffff;
          font-size: 14px;
          display: block;
        }

        .media-pill p {
          color: var(--color-text-light);
          font-size: 11px;
        }

        /* Vision & Mission */
        .vision-mission-section {
          padding: 60px 0;
        }

        .vision-mission-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 24px;
        }

        .vision-card, .mission-card {
          background-color: var(--color-primary-medium);
          color: #ffffff;
          border-radius: var(--radius-lg);
          padding: 40px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .card-icon-wrapper {
          background: rgba(0, 168, 150, 0.15);
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .vision-card h3, .mission-card h3 {
          color: #ffffff;
          font-size: 22px;
          margin-bottom: 16px;
        }

        .vision-card p {
          font-size: 14px;
          color: var(--color-text-light);
          line-height: 1.7;
        }

        .mission-card ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mission-card li {
          font-size: 13px;
          color: var(--color-text-light);
        }

        /* Values */
        .values-section {
          padding: 90px 0;
          background: #ffffff;
        }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .value-card {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 32px;
          transition: var(--transition-normal);
        }

        .value-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .value-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background-color: var(--color-bg-light);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .value-card h3 {
          font-size: 16px;
          margin-bottom: 12px;
        }

        .value-card p {
          font-size: 13px;
          color: var(--color-text-medium);
          line-height: 1.6;
        }

        /* Timeline */
        .timeline-section {
          padding: 90px 0;
        }

        .timeline-list {
          max-width: 768px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .timeline-item {
          display: flex;
          gap: 32px;
        }

        .timeline-year {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 80px;
        }

        .timeline-year span {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 800;
          color: var(--color-accent);
        }

        .timeline-content {
          background: #ffffff;
          padding: 24px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          flex: 1;
        }

        .timeline-content h3 {
          font-size: 16px;
          margin-bottom: 8px;
        }

        .timeline-content p {
          font-size: 13px;
          color: var(--color-text-medium);
        }

        /* Team */
        .team-section {
          padding: 90px 0;
          background: #ffffff;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .team-card {
          text-align: center;
          border: 1px solid var(--color-border);
          padding: 32px 24px;
          border-radius: var(--radius-lg);
        }

        .team-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 800;
          margin: 0 auto 20px auto;
        }

        .team-card h3 {
          font-size: 16px;
          margin-bottom: 4px;
        }

        .team-card p {
          font-size: 13px;
          color: var(--color-text-medium);
        }

        /* CTA */
        .about-cta {
          background-color: var(--color-accent-light);
          padding: 80px 0;
          text-align: center;
        }

        .about-cta-container {
          max-width: 600px;
        }

        .about-cta h2 {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .about-cta p {
          font-size: 15px;
          color: var(--color-text-medium);
          margin-bottom: 30px;
        }

        .about-cta-btn {
          background-color: var(--color-accent);
          color: #ffffff;
          padding: 14px 28px;
          border-radius: var(--radius-full);
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .about-cta-btn:hover {
          background-color: var(--color-accent-hover);
        }

        @media (max-width: 992px) {
          .intro-container, .vision-mission-grid {
            grid-template-columns: 1fr;
          }
          .values-grid, .team-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .values-grid, .team-grid {
            grid-template-columns: 1fr;
          }
          .intro-stats {
            flex-direction: column;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};
