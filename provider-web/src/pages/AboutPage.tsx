import React from 'react';
import { 
  Heart, 
  Lightbulb, 
  Smile, 
  Award, 
  ChevronUp, 
  TrendingUp,
  Compass,
  Users
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const values = [
    { icon: <Heart size={20} color="#ef4444" />, title: 'Kepercayaan', desc: 'Kami membangun ekosistem wisata yang transparan, jujur, dan saling menguntungkan antara provider dan traveler.' },
    { icon: <Lightbulb size={20} color="#0284c7" />, title: 'Inovasi', desc: 'Terus menerus menghadirkan teknologi terkini untuk mempermudah operasional bisnis wisata digital.' },
    { icon: <Smile size={20} color="#00c9a7" />, title: 'Inklusivitas', desc: 'Membuka akses bagi semua pelaku wisata, dari UMKM lokal hingga operator besar berskala nasional.' },
    { icon: <Award size={20} color="#f59e0b" />, title: 'Kualitas', desc: 'Standar tinggi dalam seleksi provider demi memberikan pengalaman wisata terbaik bagi setiap traveler.' },
  ];

  const milestones = [
    { year: '2019', title: 'Pendirian TemenTrip', desc: 'Dibuat di Jakarta oleh sekumpulan talenta Indonesia yang luar biasa di industri pariwisata dan teknologi.' },
    { year: '2020', title: '100 Provider Pertama', desc: 'Berhasil mengajak 100 provider wisata pertama dan melayani 5.000+ pemesanan dalam tahun pertama.' },
    { year: '2021', title: 'Ekspansi Nasional', desc: 'Jangkauan diperluas ke 50+ kota di seluruh Indonesia. Total provider mencapai 500+.' },
    { year: '2022', title: 'Inovasi Digital Escrow', desc: 'Meluncurkan sistem pembayaran aman escrow & pencairan DP 50% otomatis bagi mitra provider.' },
    { year: '2023', title: '1 Juta Traveler', desc: 'Mencapai 1 juta traveler yang terkoneksi dengan 1,500+ provider aktif dan 20,000+ paket wisata.' },
    { year: '2024 - 2026', title: '2,500+ Provider Aktif', desc: 'Tumbuh menjadi platform partner wisata #1 di Indonesia dengan 850K+ wisatawan puas.' },
  ];

  const team = [
    { name: 'Evan', role: 'Co-Founder & Product/Project Lead', initial: 'EV', bg: '#0284c7' },
    { name: 'Garry', role: 'Co-Founder & Tech Strategy Lead', initial: 'GA', bg: '#00c9a7' },
    { name: 'Kris', role: 'Provider & Partnership Lead', initial: 'KR', bg: '#f59e0b' },
    { name: 'Bakri', role: 'Legal & Compliance Lead', initial: 'BA', bg: '#8b5cf6' },
    { name: 'Cindy', role: 'Business Analyst Lead', initial: 'CI', bg: '#ec4899' },
    { name: 'Farza', role: 'FSD & Documentation Lead', initial: 'FA', bg: '#3b82f6' },
    { name: 'Heaven', role: 'Marketing Lead', initial: 'HE', bg: '#10b981' },
    { name: 'Ilham', role: 'Customer Relations Lead', initial: 'IL', bg: '#f97316' },
    { name: 'Kevin', role: 'QA Lead', initial: 'KE', bg: '#14b8a6' },
    { name: 'Ando', role: 'Business Development Associate', initial: 'AN', bg: '#6366f1' },
    { name: 'Aan', role: 'Support Lead', initial: 'AA', bg: '#84cc16' },
  ];

  return (
    <div className="about-page animate-fade-in">
      {/* About Hero */}
      <section className="about-hero">
        <div className="container about-hero-container">
          <span className="about-hero-tag">TENTANG KAMI</span>
          <h1>Kisah di Balik TemenTrip</h1>
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
              TemenTrip lahir dari passion untuk pariwisata Indonesia, dibuat di Jakarta oleh sekumpulan talenta Indonesia yang luar biasa. Kami berkumpul untuk menjawab tantangan bagaimana menghubungkan keindahan destinasi Nusantara dengan traveler secara aman dan digital.
            </p>
            <p>
              Kami percaya bahwa Indonesia memiliki kekayaan wisata yang tak tertandingi — dari ujung Sabang sampai Merauke. Yang dibutuhkan adalah jembatan digital terpercaya yang memberikan kemudahan bagi traveler sekaligus memberdayakan usaha jasa pariwisata lokal.
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
              <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" alt="Wisata Indonesia" />
              <div className="glass-card media-pill">
                <TrendingUp size={16} color="#00c9a7" />
                <div>
                  <strong>+267% Pertumbuhan</strong>
                  <p>Kepercayaan Mitra & Traveler</p>
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
              <Compass size={24} color="#00c9a7" />
            </div>
            <h3>Visi</h3>
            <p>
              Menjadi platform ekosistem pariwisata digital terbesar dan terpercaya di Asia Tenggara, yang memberdayakan jutaan pelaku wisata lokal untuk berkembang di era digital.
            </p>
          </div>
          <div className="mission-card">
            <div className="card-icon-wrapper">
              <Award size={24} color="#00c9a7" />
            </div>
            <h3>Misi</h3>
            <ul>
              <li>✓ Mendigitalisasi bisnis wisata lokal dengan teknologi yang mudah digunakan.</li>
              <li>✓ Menghubungkan provider terpercaya dengan jutaan traveler Indonesia.</li>
              <li>✓ Menjamin keamanan transaksi escrow & garansi kepuasan semua pihak.</li>
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
                  <ChevronUp size={16} color="#00c9a7" />
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

      {/* Team Section (11 Members) */}
      <section className="team-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag"><Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> TIM KAMI</span>
            <h2 className="section-title">Orang-orang di Balik TemenTrip</h2>
            <p className="section-subtitle">Talenta hebat Indonesia yang berdedikasi membangun platform wisata digital terbaik.</p>
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
          font-weight: 800;
          color: #00c9a7;
          letter-spacing: 1.5px;
          display: block;
          margin-bottom: 12px;
        }

        .about-hero h1 {
          color: #ffffff;
          font-size: 38px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .about-hero p {
          font-size: 15px;
          color: #94a3b8;
        }

        /* Intro */
        .about-intro {
          padding: 80px 0;
          background: #ffffff;
        }

        .intro-container {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 60px;
          align-items: center;
        }

        .intro-content h2 {
          font-size: 30px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 20px;
        }

        .intro-content p {
          font-size: 14px;
          color: #475569;
          line-height: 1.7;
          margin-bottom: 16px;
        }

        .intro-stats {
          display: flex;
          gap: 32px;
          margin-top: 32px;
          border-top: 1px solid #e2e8f0;
          padding-top: 24px;
        }

        .intro-stat-item h3 {
          font-size: 26px;
          font-weight: 800;
          color: #0284c7;
        }

        .intro-stat-item p {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 0;
        }

        .intro-media .media-wrapper {
          position: relative;
        }

        .intro-media img {
          width: 100%;
          border-radius: 20px;
          height: 360px;
          object-fit: cover;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        }

        .media-pill {
          position: absolute;
          bottom: 24px;
          left: 24px;
          padding: 12px 20px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
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
          color: #94a3b8;
          font-size: 11px;
          margin: 0;
        }

        /* Vision & Mission */
        .vision-mission-section {
          padding: 60px 0;
          background: #f8fafc;
        }

        .vision-mission-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 24px;
        }

        .vision-card, .mission-card {
          background-color: #0f172a;
          color: #ffffff;
          border-radius: 20px;
          padding: 36px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .card-icon-wrapper {
          background: rgba(0, 201, 167, 0.15);
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .vision-card h3, .mission-card h3 {
          color: #ffffff;
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 14px;
        }

        .vision-card p {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.7;
        }

        .mission-card ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0;
        }

        .mission-card li {
          font-size: 13px;
          color: #cbd5e1;
        }

        /* Values */
        .values-section {
          padding: 80px 0;
          background: #ffffff;
        }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .value-card {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 28px 24px;
          transition: all 0.2s ease;
        }

        .value-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.08);
          border-color: #0284c7;
        }

        .value-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background-color: #f0f9ff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .value-card h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .value-card p {
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
        }

        /* Timeline */
        .timeline-section {
          padding: 80px 0;
          background: #f8fafc;
        }

        .timeline-list {
          max-width: 768px;
          margin: 32px auto 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .timeline-item {
          display: flex;
          gap: 24px;
        }

        .timeline-year {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 90px;
        }

        .timeline-year span {
          font-size: 18px;
          font-weight: 800;
          color: #0284c7;
        }

        .timeline-content {
          background: #ffffff;
          padding: 20px 24px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          flex: 1;
        }

        .timeline-content h3 {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .timeline-content p {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }

        /* Team (11 members grid) */
        .team-section {
          padding: 80px 0;
          background: #ffffff;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 36px;
        }

        .team-card {
          text-align: center;
          border: 1px solid #e2e8f0;
          padding: 24px 16px;
          border-radius: 16px;
          background: #ffffff;
          transition: all 0.2s ease;
        }

        .team-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.06);
          border-color: #00c9a7;
        }

        .team-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 800;
          margin: 0 auto 16px auto;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        }

        .team-card h3 {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .team-card p {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          line-height: 1.4;
          margin: 0;
        }

        @media (max-width: 992px) {
          .intro-container, .vision-mission-grid {
            grid-template-columns: 1fr;
          }
          .values-grid, .team-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 640px) {
          .values-grid, .team-grid {
            grid-template-columns: repeat(2, 1fr);
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
