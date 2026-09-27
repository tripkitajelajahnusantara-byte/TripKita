import React from 'react';
import { 
  Heart, 
  Lightbulb, 
  Smile, 
  Award, 
  ChevronUp, 
  Compass
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const values = [
    { icon: <Heart size={20} color="#ef4444" />, title: 'Keterbukaan', desc: 'Harga, jadwal, dan aturan refund ditampilkan sebelum Anda membayar. Ulasan hanya bisa ditulis oleh peserta yang sudah menyelesaikan trip.' },
    { icon: <Lightbulb size={20} color="#0284c7" />, title: 'Kemudahan', desc: 'Mitra mengelola paket, kuota, dan jadwal dari satu dasbor, sehingga tidak perlu mencatat pesanan secara manual.' },
    { icon: <Smile size={20} color="#00c9a7" />, title: 'Inklusivitas', desc: 'Pelaku wisata lokal, termasuk usaha kecil, bisa mendaftar sebagai mitra dan menjual paketnya di TemenTrip.' },
    { icon: <Award size={20} color="#f59e0b" />, title: 'Verifikasi mitra', desc: 'Setiap mitra diperiksa oleh admin TemenTrip sebelum bisa menerbitkan paket.' },
  ];

  const milestones = [
    { year: '2026', title: 'TemenTrip diluncurkan', desc: 'TemenTrip mulai beroperasi dari Jakarta sebagai tempat memesan open trip dan paket wisata lainnya.' },
    { year: '2026', title: 'Pembayaran penuh, dana mitra bertahap', desc: 'Pembayaran penuh di muka melalui iPaymu; buku besar TemenTrip menyediakan separuh hak mitra setelah pembayaran dan separuh sisanya setelah trip selesai.' },
    { year: '2026', title: 'Membangun jaringan mitra', desc: 'Mengajak mitra lokal di berbagai daerah untuk mendaftar dan menerbitkan paket setelah diverifikasi admin.' },
  ];

  const teamMembers = [
    { name: 'Evan', role: 'Co-Founder & Product/Project Lead', initial: 'EV', dept: 'Co-Founder & Product' },
    { name: 'Garry', role: 'Co-Founder & Tech Strategy Lead', initial: 'GA', dept: 'Co-Founder & Tech' },
    { name: 'Liviani', role: 'Finance & Investor Relations Lead', initial: 'LI', dept: 'Finance & Investor Relations' },
    { name: 'Kris', role: 'Provider & Partnership Lead', initial: 'KR', dept: 'Partnership' },
    { name: 'Bakri', role: 'Legal & Compliance Lead', initial: 'BA', dept: 'Legal' },
    { name: 'Cindy', role: 'Business Analyst Lead', initial: 'CI', dept: 'Analytics' },
    { name: 'Farza', role: 'FSD & Documentation Lead', initial: 'FA', dept: 'Engineering' },
    { name: 'Heaven', role: 'Marketing Lead', initial: 'HE', dept: 'Marketing' },
    { name: 'Ilham', role: 'Customer Relations Lead', initial: 'IL', dept: 'Relations' },
    { name: 'Kevin', role: 'QA Lead', initial: 'KE', dept: 'Quality Assurance' },
    { name: 'Ando', role: 'Business Development Associate', initial: 'AN', dept: 'Business Dev' },
    { name: 'Aan', role: 'Support Lead', initial: 'AA', dept: 'Customer Support' },
  ];

  return (
    <div className="about-page animate-fade-in">
      {/* About Hero */}
      <section className="about-hero">
        <div className="container about-hero-container">
          <h1>Tentang TemenTrip</h1>
          <p>TemenTrip mempertemukan traveler dengan mitra penyelenggara trip lokal di Indonesia.</p>
        </div>
      </section>

      {/* Intro Section */}
      <section className="about-intro">
        <div className="container intro-container">
          <div className="intro-content">
            <h2>Cerita kami</h2>
            <p>
              TemenTrip dibuat di Jakarta oleh tim yang ingin memudahkan orang menemukan dan memesan trip dari penyelenggara lokal. Traveler bisa melihat paket, memesan, dan membayar di satu tempat, sementara mitra mengelola pesanan tanpa harus mencatatnya satu per satu.
            </p>
            <p>
              Banyak penyelenggara trip lokal masih menerima pesanan lewat chat dan transfer manual. Kami ingin proses itu lebih rapi: pembayaran online melalui iPaymu, kuota tercatat otomatis, dan aturan pembatalan yang sama untuk semua pihak.
            </p>

            <div className="intro-stats">
              <div className="intro-stat-item">
                <h3>2026</h3>
                <p>Tahun Peluncuran</p>
              </div>
            </div>
          </div>

          <div className="intro-media">
            <div className="media-wrapper">
              <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" alt="Wisata Indonesia" />
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
              Membantu pelaku wisata lokal di Indonesia menjual paketnya secara online, dan membantu traveler menemukan trip yang jelas harga, jadwal, dan aturannya.
            </p>
          </div>
          <div className="mission-card">
            <div className="card-icon-wrapper">
              <Award size={24} color="#00c9a7" />
            </div>
            <h3>Misi</h3>
            <ul>
              <li>Menyediakan alat sederhana bagi mitra untuk mengelola paket, kuota, dan jadwal.</li>
              <li>Memverifikasi setiap mitra sebelum paketnya bisa dipesan.</li>
              <li>Menerapkan aturan refund yang sama untuk semua pesanan: pembatalan paling lambat 7 hari sebelum trip atau pembatalan oleh mitra, dana kembali penuh.</li>
              <li>Mendorong lebih banyak orang berwisata di dalam negeri.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Prinsip kami</h2>
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
            <h2 className="section-title">Langkah awal di 2026</h2>
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
            <h2 className="section-title">Tim TemenTrip</h2>
            <p className="section-subtitle">Orang-orang yang membangun dan menjalankan TemenTrip.</p>
          </div>

          {/* Equal Grid of All Team Members */}
          <div className="unified-team-grid">
            {teamMembers.map((t, i) => (
              <div key={i} className="team-member-card">
                <div className="member-avatar-circle">
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
          background: #e2e8f0;
          color: #334155;
          font-size: 17px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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
