import React from 'react';
import { 
  Heart, 
  Lightbulb, 
  Smile, 
  Award, 
  ChevronUp, 
  Compass,
  Users,
  Sparkles
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const values = [
    { icon: <Heart size={20} color="#ef4444" />, title: 'Kepercayaan', desc: 'Kami membangun ekosistem wisata yang transparan, jujur, dan saling menguntungkan antara provider dan traveler.' },
    { icon: <Lightbulb size={20} color="#0284c7" />, title: 'Inovasi', desc: 'Terus menerus menghadirkan teknologi terkini untuk mempermudah operasional bisnis wisata digital.' },
    { icon: <Smile size={20} color="#00c9a7" />, title: 'Inklusivitas', desc: 'Membuka akses bagi semua pelaku wisata, dari UMKM lokal hingga operator besar berskala nasional.' },
    { icon: <Award size={20} color="#f59e0b" />, title: 'Kualitas', desc: 'Standar tinggi dalam seleksi provider demi memberikan pengalaman wisata terbaik bagi setiap traveler.' },
  ];

  const milestones = [
    { year: '2026', title: 'Peluncuran Resmi TemenTrip', desc: 'TemenTrip resmi hadir di Jakarta sebagai platform digital open trip modern bagi wisatawan Indonesia.' },
    { year: '2026', title: 'Sistem Escrow & DP 50%', desc: 'Penerapan skema transaksi aman dengan DP 50% dan pencairan otomatis untuk melindungi provider dan traveler.' },
    { year: '2026', title: 'Jaringan Mitra Destinasi Nusantara', desc: 'Mengintegrasikan paket wisata unggulan terverifikasi dari Bromo, Bali, Lombok, hingga Raja Ampat.' },
  ];

  const teamMembers = [
    { name: 'Evan', role: 'Co-Founder & Product/Project Lead', initial: 'EV', bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', dept: 'Co-Founder & Product' },
    { name: 'Garry', role: 'Co-Founder & Tech Strategy Lead', initial: 'GA', bg: 'linear-gradient(135deg, #00c9a7 0%, #0f766e 100%)', dept: 'Co-Founder & Tech' },
    { name: 'Kris', role: 'Provider & Partnership Lead', initial: 'KR', bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', dept: 'Partnership' },
    { name: 'Bakri', role: 'Legal & Compliance Lead', initial: 'BA', bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', dept: 'Legal' },
    { name: 'Cindy', role: 'Business Analyst Lead', initial: 'CI', bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', dept: 'Analytics' },
    { name: 'Farza', role: 'FSD & Documentation Lead', initial: 'FA', bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', dept: 'Engineering' },
    { name: 'Heaven', role: 'Marketing Lead', initial: 'HE', bg: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', dept: 'Marketing' },
    { name: 'Ilham', role: 'Customer Relations Lead', initial: 'IL', bg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', dept: 'Relations' },
    { name: 'Kevin', role: 'QA Lead', initial: 'KE', bg: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)', dept: 'Quality Assurance' },
    { name: 'Ando', role: 'Business Development Associate', initial: 'AN', bg: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', dept: 'Business Dev' },
    { name: 'Aan', role: 'Support Lead', initial: 'AA', bg: 'linear-gradient(135deg, #84cc16 0%, #4d7c0f 100%)', dept: 'Customer Support' },
  ];

  return (
    <div className="about-page animate-fade-in">
      {/* About Hero */}
      <section className="about-hero">
        <div className="container about-hero-container">
          <span className="about-hero-tag">TENTANG KAMI</span>
          <h1>Kisah di Balik TemenTrip</h1>
          <p>Platform digital open trip terpercaya yang lahir dari semangat memajukan pariwisata Indonesia.</p>
        </div>
      </section>

      {/* Intro Section */}
      <section className="about-intro">
        <div className="container intro-container">
          <div className="intro-content">
            <span className="section-tag">CERITA KAMI</span>
            <h2>Dimulai dari Passion untuk Pariwisata Indonesia</h2>
            <p>
              TemenTrip lahir dari passion untuk pariwisata Indonesia, dibuat di Jakarta oleh sekumpulan talenta Indonesia yang luar biasa. Kami berkumpul untuk menjawab tantangan dalam menghubungkan keindahan destinasi Nusantara dengan traveler secara aman dan serba digital.
            </p>
            <p>
              Kami percaya bahwa Indonesia memiliki kekayaan wisata yang luar biasa dari Sabang sampai Merauke. Yang dibutuhkan adalah jembatan digital terpercaya yang memberikan kemudahan bagi traveler sekaligus memberdayakan usaha jasa pariwisata lokal.
            </p>

            <div className="intro-stats">
              <div className="intro-stat-item">
                <h3>2026</h3>
                <p>Tahun Peluncuran</p>
              </div>
              <div className="intro-stat-item">
                <h3>100%</h3>
                <p>Karya Talenta Lokal</p>
              </div>
              <div className="intro-stat-item">
                <h3>8+</h3>
                <p>Destinasi Utama Terintegrasi</p>
              </div>
            </div>
          </div>

          <div className="intro-media">
            <div className="media-wrapper">
              <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" alt="Wisata Indonesia" />
              <div className="glass-card media-pill">
                <Sparkles size={18} color="#00c9a7" />
                <div>
                  <strong>Platform Digital Terbaru 2026</strong>
                  <p>Aman, Cepat, dan Transparan</p>
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
              Menjadi platform ekosistem pariwisata digital terbesar dan terpercaya di Indonesia, yang memberdayakan pelaku wisata lokal untuk berkembang pesat di era digital.
            </p>
          </div>
          <div className="mission-card">
            <div className="card-icon-wrapper">
              <Award size={24} color="#00c9a7" />
            </div>
            <h3>Misi</h3>
            <ul>
              <li>✓ Mendigitalisasi bisnis wisata lokal dengan teknologi praktis dan ramah pengguna.</li>
              <li>✓ Menghubungkan provider terpercaya dengan para traveler di seluruh Nusantara.</li>
              <li>✓ Menjamin keamanan transaksi escrow & garansi kepuasan semua pihak.</li>
              <li>✓ Mendorong pertumbuhan pariwisata domestik secara berkelanjutan.</li>
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
            <span className="section-tag">LENGKAH AWAL KAMI</span>
            <h2 className="section-title">Fokus & Komitmen 2026</h2>
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

      {/* Professional Team Section - Equal Grid Layout with Circular Avatars */}
      <section className="team-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag"><Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> TIM KAMI</span>
            <h2 className="section-title">Orang-orang di Balik TemenTrip</h2>
            <p className="section-subtitle">Talenta hebat Indonesia yang berdedikasi tinggi membangun platform wisata digital terbaik.</p>
          </div>

          {/* Equal Grid of All Team Members */}
          <div className="unified-team-grid">
            {teamMembers.map((t, i) => (
              <div key={i} className="team-member-card">
                <div className="member-avatar-circle" style={{ background: t.bg }}>
                  {t.initial}
                </div>
                <div className="member-info">
                  <h3>{t.name}</h3>
                  <p className="member-role">{t.role}</p>
                  <span className="member-dept-badge">{t.dept}</span>
                </div>
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
          font-size: 16px;
          color: #e2e8f0;
          line-height: 1.6;
        }

        /* Intro */
        .about-intro {
          padding: 80px 0;
          background: #ffffff;
        }

        .intro-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .section-tag {
          font-size: 12px;
          font-weight: 800;
          color: #0284c7;
          letter-spacing: 1px;
          display: block;
          margin-bottom: 8px;
        }

        .intro-content h2 {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 20px;
          line-height: 1.3;
        }

        .intro-content p {
          font-size: 15px;
          color: #475569;
          line-height: 1.7;
          margin-bottom: 16px;
        }

        .intro-stats {
          display: flex;
          gap: 32px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .intro-stat-item h3 {
          font-size: 28px;
          font-weight: 800;
          color: #00c9a7;
          margin-bottom: 4px;
        }

        .intro-stat-item p {
          font-size: 12px;
          color: #64748b;
          margin: 0;
          font-weight: 600;
        }

        .intro-media {
          position: relative;
        }

        .media-wrapper {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.15);
        }

        .media-wrapper img {
          width: 100%;
          height: 380px;
          object-fit: cover;
          display: block;
        }

        .media-pill {
          position: absolute;
          bottom: 24px;
          left: 24px;
          right: 24px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          padding: 16px 20px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .media-pill strong {
          display: block;
          font-size: 14px;
          color: #0f172a;
        }

        .media-pill p {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        /* Vision & Mission */
        .vision-mission-section {
          padding: 80px 0;
          background: #f8fafc;
        }

        .vision-mission-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .vision-card, .mission-card {
          background: #ffffff;
          padding: 36px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }

        .card-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #e6fffa;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .vision-card h3, .mission-card h3 {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .vision-card p {
          font-size: 15px;
          color: #475569;
          line-height: 1.7;
        }

        .mission-card ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .mission-card li {
          font-size: 14px;
          color: #475569;
          margin-bottom: 12px;
          line-height: 1.5;
        }

        /* Values */
        .values-section {
          padding: 80px 0;
          background: #ffffff;
        }

        .section-header {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 48px auto;
        }

        .section-title {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 6px;
        }

        .section-subtitle {
          font-size: 15px;
          color: #64748b;
          margin-top: 8px;
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
          min-width: 80px;
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

        /* Team Section - Equal Grid Layout with Circular Avatars */
        .team-section {
          padding: 85px 0;
          background: #ffffff;
        }

        .unified-team-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1020px;
          margin: 36px auto 0 auto;
        }

        .team-member-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .team-member-card:hover {
          border-color: #00c9a7;
          transform: translateY(-3px);
          box-shadow: 0 12px 24px -6px rgba(0, 201, 167, 0.15);
        }

        .member-avatar-circle {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          color: #ffffff;
          font-size: 17px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          border: 2.5px solid #ffffff;
        }

        .member-info {
          flex: 1;
          min-width: 0;
        }

        .member-info h3 {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 2px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .member-role {
          font-size: 12.5px;
          font-weight: 600;
          color: #475569;
          margin: 0 0 6px 0;
          line-height: 1.35;
        }

        .member-dept-badge {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 700;
          color: #0284c7;
          background-color: #f0f9ff;
          border: 1px solid #bae6fd;
          padding: 2px 9px;
          border-radius: 12px;
        }

        @media (max-width: 900px) {
          .unified-team-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .unified-team-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
