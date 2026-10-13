import React from 'react';
import { useCancellationRefundDays } from '../utils/checkoutConfig';
import { useNavigation } from '../context/NavigationContext';
import {
  Heart,
  Lightbulb,
  Smile,
  Award,
  CheckCircle2,
  Compass
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const refundDays = useCancellationRefundDays();
  const { navigateTo } = useNavigation();
  const values = [
    { icon: <Heart size={20} color="#ef4444" />, title: 'Keterbukaan', desc: 'Harga, jadwal, dan aturan refund ditampilkan sebelum Anda membayar. Ulasan hanya bisa ditulis oleh peserta yang sudah menyelesaikan trip.' },
    { icon: <Lightbulb size={20} color="#0284c7" />, title: 'Kemudahan', desc: 'Mitra mengelola paket, kuota, dan jadwal dari satu dasbor, sehingga tidak perlu mencatat pesanan secara manual.' },
    { icon: <Smile size={20} color="#00c9a7" />, title: 'Inklusivitas', desc: 'Pelaku wisata lokal, termasuk usaha kecil, bisa mendaftar sebagai mitra dan menjual paketnya di TemenTrip.' },
    { icon: <Award size={20} color="#f59e0b" />, title: 'Verifikasi mitra', desc: 'Setiap mitra diperiksa oleh admin TemenTrip sebelum bisa menerbitkan paket.' },
  ];

  const milestones = [
    { title: 'TemenTrip diluncurkan', desc: 'TemenTrip mulai beroperasi dari Jakarta sebagai tempat memesan open trip dan paket wisata lainnya.' },
    { title: 'Pembayaran penuh, dana mitra bertahap', desc: 'Pembayaran penuh di muka melalui transfer yang diverifikasi admin; buku besar TemenTrip menyediakan separuh hak mitra setelah pembayaran dan separuh sisanya setelah trip selesai.' },
    { title: 'Membangun jaringan mitra', desc: 'Mengajak mitra lokal di berbagai daerah untuk mendaftar dan menerbitkan paket setelah diverifikasi admin.' },
  ];

  const teamMembers = [
    { name: 'Evan', role: 'Co-Founder & Product/Project Lead', initial: 'EV' },
    { name: 'Gerry', role: 'Co-Founder & Tech Strategy Lead', initial: 'GE' },
    { name: 'Liviani', role: 'Finance & Investor Relations Lead', initial: 'LI' },
    { name: 'Kris', role: 'Provider & Partnership Lead', initial: 'KR' },
    { name: 'Bakri', role: 'Legal & Compliance Lead', initial: 'BA' },
    { name: 'Cindy', role: 'Business Analyst Lead', initial: 'CI' },
    { name: 'Farza', role: 'FSD & Documentation Lead', initial: 'FA' },
    { name: 'Heaven', role: 'Marketing Lead', initial: 'HE' },
    { name: 'Ilham', role: 'Customer Relations Lead', initial: 'IL' },
    { name: 'Kevin', role: 'QA Lead', initial: 'KE' },
    { name: 'Ando', role: 'Business Development Associate', initial: 'AN' },
    { name: 'Aan', role: 'Support Lead', initial: 'AA' },
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
              Banyak penyelenggara trip lokal masih menerima pesanan lewat chat dan transfer manual. Kami membuat proses itu lebih rapi: Booking ID unik, hold kuota otomatis, upload bukti transfer, verifikasi admin, dan aturan pembatalan yang sama untuk semua pihak.
            </p>

            <div className="intro-stats">
              <div className="intro-stat-item">
                <h3>2026</h3>
                <p>Tahun Peluncuran</p>
              </div>
              <div className="intro-stat-item">
                <h3>Jakarta</h3>
                <p>Basis Operasional</p>
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
              {[
                'Menyediakan alat sederhana bagi mitra untuk mengelola paket, kuota, dan jadwal.',
                'Memverifikasi setiap mitra sebelum paketnya bisa dipesan.',
                `Menerapkan aturan refund yang sama untuk semua pesanan: pembatalan ${refundDays ? `paling lambat ${refundDays} hari sebelum trip` : 'sebelum batas waktu kebijakan refund'} atau pembatalan oleh mitra, dana kembali penuh.`,
                'Mendorong lebih banyak orang berwisata di dalam negeri.',
              ].map((item) => (
                <li key={item}>
                  <CheckCircle2 size={18} color="#00c9a7" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
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

          <ol className="timeline-list">
            {milestones.map((m, i) => (
              <li key={i} className="timeline-item">
                <div className="about-step" aria-hidden="true">{i + 1}</div>
                <div className="timeline-content">
                  <h3>{m.title}</h3>
                  <p>{m.desc}</p>
                </div>
              </li>
            ))}
          </ol>
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
                <div className="member-avatar-circle" aria-hidden="true">
                  {t.initial}
                </div>
                <div className="member-info">
                  <h3>{t.name}</h3>
                  <p className="member-role">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="container about-cta-container">
          <h2>Siap jalan bareng TemenTrip?</h2>
          <p>Cari trip yang cocok, atau daftarkan usaha wisata Anda sebagai mitra.</p>
          <div className="about-cta-actions">
            <button type="button" className="btn btn-primary" onClick={() => navigateTo('cari-trip')}>Cari Trip</button>
            <button type="button" className="btn btn-outline" onClick={() => navigateTo('partner-landing')}>Jadi Mitra</button>
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
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14px;
          color: #475569;
          margin-bottom: 12px;
          line-height: 1.5;
        }

        .mission-card li svg {
          flex-shrink: 0;
          margin-top: 1px;
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
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .timeline-item {
          position: relative;
          display: flex;
          gap: 20px;
        }

        /* Garis penghubung antar langkah */
        .timeline-item:not(:last-child)::before {
          content: '';
          position: absolute;
          left: 17px;
          top: 36px;
          bottom: -24px;
          width: 2px;
          background: #bae6fd;
        }

        .about-step {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0284c7;
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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
          line-height: 1.6;
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
          margin: 0;
          line-height: 1.35;
        }

        /* CTA */
        .about-cta {
          padding: 64px 0 80px;
          background: #f8fafc;
          text-align: center;
        }

        .about-cta-container {
          max-width: 640px;
        }

        .about-cta h2 {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .about-cta p {
          font-size: 15px;
          color: #64748b;
          margin-bottom: 24px;
        }

        .about-cta-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        @media (max-width: 900px) {
          .unified-team-grid,
          .values-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .intro-container,
          .vision-mission-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .intro-media img {
            max-width: 100%;
          }
        }

        @media (max-width: 600px) {
          .values-grid {
            grid-template-columns: 1fr;
          }
          .unified-team-grid {
            gap: 12px;
          }
          .team-member-card {
            flex-direction: column;
            text-align: center;
            padding: 16px 12px;
            gap: 10px;
          }
          .member-info h3 {
            white-space: normal;
          }
          .about-hero,
          .about-intro,
          .vision-mission-section,
          .values-section,
          .timeline-section,
          .team-section {
            padding: 48px 0;
          }
          .about-hero h1 {
            font-size: 30px;
          }
          .intro-content h2,
          .section-title {
            font-size: 26px;
          }
          .section-header {
            margin-bottom: 28px;
          }
          .vision-card, .mission-card {
            padding: 24px;
          }
          .media-wrapper img {
            height: 240px;
          }
          .about-cta-actions .btn {
            flex: 1 1 140px;
          }
        }
      `}</style>
    </div>
  );
};
