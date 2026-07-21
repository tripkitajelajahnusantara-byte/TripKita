import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Headphones, 
  Globe, 
  MapPin, 
  Star, 
  Compass, 
  Briefcase, 
  Users 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { navigateTo } = useNavigation();

  const destinations = [
    { name: 'Bali', packages: '2,400+ Paket', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=400&q=80' },
    { name: 'Raja Ampat', packages: '850+ Paket', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80' },
    { name: 'Lombok', packages: '1,100+ Paket', img: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=400&q=80' },
    { name: 'Labuan Bajo', packages: '950+ Paket', img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80' },
    { name: 'Yogyakarta', packages: '1,300+ Paket', img: 'https://images.unsplash.com/photo-1584810359583-96fc3448beaa?auto=format&fit=crop&w=400&q=80' },
    { name: 'Manado', packages: '640+ Paket', img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=400&q=80' },
  ];

  return (
    <div className="landing-page animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="hero-badge">
              <Compass size={14} className="badge-icon" /> AI Platform Partner Wisata Indonesia
            </span>
            <h1 className="hero-title">
              Kembangkan Bisnis <br />
              <span className="accent-text">Wisata Anda</span> <br />
              Bersama TripKita
            </h1>
            <p className="hero-subtitle">
              Bergabunglah dengan 2,500+ provider wisata terpercaya. Jangkau jutaan traveler, kelola booking dengan mudah, dan tingkatkan pendapatan bisnis Anda.
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => navigateTo('daftar')}>
                Mulai Gratis Sekarang <ArrowRight size={16} />
              </button>
              <button className="secondary-btn" onClick={() => navigateTo('tentang-kami')}>
                Pelajari Lebih Lanjut
              </button>
            </div>

            <div className="rating-widget">
              <div className="avatar-group">
                <span className="avatar" style={{ backgroundColor: '#22d3ee' }}>RA</span>
                <span className="avatar" style={{ backgroundColor: '#3b82f6' }}>NP</span>
                <span className="avatar" style={{ backgroundColor: '#f59e0b' }}>HW</span>
                <span className="avatar" style={{ backgroundColor: '#a855f7' }}>LS</span>
              </div>
              <div className="rating-info">
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="#eab308" color="#eab308" />
                  ))}
                </div>
                <span className="rating-text">4.8/5 dari 2,500+ partner</span>
              </div>
            </div>
          </div>

          <div className="hero-widget-container">
            <div className="glass-card stat-widget animate-fade-in-scale">
              <span className="widget-header">STATISTIK REAL-TIME</span>
              <div className="widget-grid">
                <div className="widget-stat-item">
                  <span className="stat-number">2,500+</span>
                  <span className="stat-label">Provider Aktif</span>
                </div>
                <div className="widget-stat-item">
                  <span className="stat-number">48,000+</span>
                  <span className="stat-label">Paket Wisata</span>
                </div>
                <div className="widget-stat-item">
                  <span className="stat-number">127</span>
                  <span className="stat-label">Destinasi</span>
                </div>
                <div className="widget-stat-item">
                  <span className="stat-number">850K+</span>
                  <span className="stat-label">Wisatawan Puas</span>
                </div>
              </div>
              <div className="widget-footer-pill">
                <TrendingUp size={14} color="#00a896" />
                <span>Pendapatan rata-rata partner: <strong>Rp 28.5 Juta/bulan</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <section className="stats-ribbon">
        <div className="container ribbon-container">
          <div className="ribbon-item">
            <Users size={24} />
            <div>
              <h3>2,500+</h3>
              <p>Provider Aktif</p>
            </div>
          </div>
          <div className="ribbon-item">
            <Briefcase size={24} />
            <div>
              <h3>48,000+</h3>
              <p>Paket Wisata</p>
            </div>
          </div>
          <div className="ribbon-item">
            <MapPin size={24} />
            <div>
              <h3>127</h3>
              <p>Destinasi</p>
            </div>
          </div>
          <div className="ribbon-item">
            <Star size={24} />
            <div>
              <h3>850K+</h3>
              <p>Wisatawan Puas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">KEUNTUNGAN PARTNER</span>
            <h2 className="section-title">Kenapa Pilih TripKita?</h2>
            <p className="section-subtitle">
              Platform terlengkap untuk mengembangkan bisnis wisata Anda secara digital.
            </p>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="icon-wrapper bg-green">
                <TrendingUp size={20} color="#10b981" />
              </div>
              <h3>Tingkatkan Pendapatan</h3>
              <p>
                Akses jutaan traveler Indonesia & mancanegara. Provider kami rata-rata meningkatkan pendapatan hingga 4x lipat dalam 9 bulan pertama.
              </p>
            </div>
            <div className="benefit-card">
              <div className="icon-wrapper bg-blue">
                <ShieldCheck size={20} color="#3b82f6" />
              </div>
              <h3>Pembayaran Terjamin</h3>
              <p>
                Sistem escrow aman dan pencairan otomatis. Dana Anda terlindungi dengan jaminan pembayaran 100% setelah trip selesai.
              </p>
            </div>
            <div className="benefit-card">
              <div className="icon-wrapper bg-orange">
                <Headphones size={20} color="#f59e0b" />
              </div>
              <h3>Dukungan 24/7</h3>
              <p>
                Tim dedicated partner support siap membantu kapan saja. Onboarding gratis, pelatihan, dan pendampingan bisnis.
              </p>
            </div>
            <div className="benefit-card">
              <div className="icon-wrapper bg-purple">
                <Globe size={20} color="#8b5cf6" />
              </div>
              <h3>Jangkauan Nasional</h3>
              <p>
                Tampil di aplikasi & website TripKita yang dikunjungi 1M+ juta user setiap bulan dari seluruh Indonesia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Destinations Section */}
      <section className="destinations-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="section-tag">DESTINASI UNGGULAN</span>
              <h2 className="section-title">Jelajahi Indonesia</h2>
            </div>
            <button className="link-btn">Lihat semua &rarr;</button>
          </div>

          <div className="destinations-grid">
            {destinations.map((dest, i) => (
              <div key={i} className="destination-card" style={{ backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0)), url(${dest.img})` }}>
                <div className="destination-info">
                  <h3>{dest.name}</h3>
                  <p>{dest.packages}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stepper Steps Section */}
      <section className="steps-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">CARA BERGABUNG</span>
            <h2 className="section-title">Mulai dalam 4 Langkah Mudah</h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">01</div>
              <h3>Daftar Akun</h3>
              <p>Isi formulir pendaftaran dan upload dokumen legalitas bisnis Anda.</p>
            </div>
            <div className="step-card">
              <div className="step-num">02</div>
              <h3>Verifikasi</h3>
              <p>Tim kami memverifikasi dokumen dalam 1-2 hari kerja.</p>
            </div>
            <div className="step-card">
              <div className="step-num">03</div>
              <h3>Buat Paket</h3>
              <p>Tambahkan paket wisata dengan detail foto, itinerary, dan harga.</p>
            </div>
            <div className="step-card">
              <div className="step-num">04</div>
              <h3>Mulai Terima Booking</h3>
              <p>Paket Anda langsung tampil dan siap menerima pemesanan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="testimonials-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">TESTIMONI PARTNER</span>
            <h2 className="section-title">Cerita Sukses Partner Kami</h2>
          </div>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#eab308" color="#eab308" />
                ))}
              </div>
              <p className="testimonial-quote">
                "Bergabung dengan TripKita adalah keputusan terbaik untuk bisnis wisata saya. Dalam 3 bulan, booking meningkat 4x lipat dan pendapatan naik signifikan."
              </p>
              <div className="testimonial-user">
                <span className="avatar bg-green">BS</span>
                <div>
                  <h4>Budi Santoso</h4>
                  <p>Raja Ampat Adventure - Papua Barat</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#eab308" color="#eab308" />
                ))}
              </div>
              <p className="testimonial-quote">
                "Platform yang sangat mudah digunakan. Kelola paket, terima booking, dan monitor pembayaran semua dalam satu dashboard yang intuitif."
              </p>
              <div className="testimonial-user">
                <span className="avatar bg-blue">SD</span>
                <div>
                  <h4>Sari Dewi</h4>
                  <p>Bali Cultural Tours - Bali</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#eab308" color="#eab308" />
                ))}
              </div>
              <p className="testimonial-quote">
                "Support team TripKita luar biasa responsif. Setiap pertanyaan langsung dijawab dan masalah teknis diselesaikan dengan cepat."
              </p>
              <div className="testimonial-user">
                <span className="avatar bg-orange">AF</span>
                <div>
                  <h4>Ahmad Fauzi</h4>
                  <p>Lombok Surf & Adventure - Nusa Tenggara Barat</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container cta-container">
          <div className="cta-icon-wrapper">
            <Compass size={36} color="#00a896" />
          </div>
          <h2>Siap Bergabung dengan TripKita?</h2>
          <p>Daftar sekarang dan mulai terima booking dalam 24 jam. Gratis tanpa biaya setup.</p>
          
          <div className="cta-actions">
            <button className="cta-primary-btn" onClick={() => navigateTo('daftar')}>
              Daftar Gratis Sekarang <ArrowRight size={16} />
            </button>
            <button className="cta-secondary-btn" onClick={() => navigateTo('daftar')}>
              Sudah Punya Akun? Masuk
            </button>
          </div>

          <div className="cta-benefits-list">
            <span>✓ Gratis Daftar</span>
            <span>✓ Tanpa Biaya Setup</span>
            <span>✓ Support 24/7</span>
            <span>✓ Pembayaran Aman</span>
          </div>
        </div>
      </section>

      <style>{`
        /* Hero Styling */
        .hero-section {
          background: linear-gradient(135deg, rgba(9, 44, 46, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%), 
                      url('https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1920&q=80');
          background-size: cover;
          background-position: center;
          color: #ffffff;
          padding: 100px 0 120px 0;
          position: relative;
          overflow: hidden;
        }

        .hero-container {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 60px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 500;
          color: #22d3ee;
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: 48px;
          line-height: 1.15;
          color: #ffffff;
          margin-bottom: 24px;
        }

        .hero-title .accent-text {
          color: var(--color-accent);
          text-shadow: 0 0 20px rgba(0, 168, 150, 0.2);
        }

        .hero-subtitle {
          font-size: 16px;
          color: var(--color-text-light);
          line-height: 1.6;
          margin-bottom: 36px;
          max-width: 540px;
        }

        .hero-actions {
          display: flex;
          gap: 16px;
          margin-bottom: 40px;
        }

        .primary-btn {
          background: var(--color-accent);
          color: #ffffff;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 600;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: var(--transition-fast);
        }

        .primary-btn:hover {
          background: var(--color-accent-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
        }

        .secondary-btn {
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #ffffff;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 600;
          border-radius: var(--radius-full);
          transition: var(--transition-fast);
        }

        .secondary-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: #ffffff;
        }

        .rating-widget {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .avatar-group {
          display: flex;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid var(--color-primary-dark);
          margin-right: -10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
        }

        .rating-info {
          display: flex;
          flex-direction: column;
        }

        .rating-text {
          font-size: 12px;
          color: var(--color-text-light);
        }

        /* Stat Widget */
        .stat-widget {
          padding: 32px;
          border-radius: var(--radius-lg);
          max-width: 440px;
          margin-left: auto;
        }

        .widget-header {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: var(--color-text-light);
          display: block;
          margin-bottom: 20px;
        }

        .widget-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .widget-stat-item {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
        }

        .stat-label {
          font-size: 13px;
          color: var(--color-text-light);
        }

        .widget-footer-pill {
          background: rgba(0, 168, 150, 0.15);
          border: 1px solid rgba(0, 168, 150, 0.3);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #e6f7f5;
        }

        /* Ribbon */
        .stats-ribbon {
          background: var(--color-primary-dark);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 30px 0;
        }

        .ribbon-container {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }

        .ribbon-item {
          display: flex;
          align-items: center;
          gap: 16px;
          color: #ffffff;
        }

        .ribbon-item h3 {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
        }

        .ribbon-item p {
          font-size: 13px;
          color: var(--color-text-light);
        }

        /* Generic Header UI */
        .section-header {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 56px auto;
        }

        .section-tag {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-accent);
          letter-spacing: 1.5px;
          display: block;
          margin-bottom: 8px;
        }

        .section-title {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .section-subtitle {
          font-size: 15px;
          color: var(--color-text-medium);
        }

        /* Benefits */
        .benefits-section {
          padding: 90px 0;
          background: #ffffff;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .benefit-card {
          background: var(--color-bg-light);
          padding: 32px;
          border-radius: var(--radius-lg);
          transition: var(--transition-normal);
          border: 1px solid var(--color-border);
        }

        .benefit-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .bg-green { background-color: #ecfdf5; }
        .bg-blue { background-color: #eff6ff; }
        .bg-orange { background-color: #fffbeb; }
        .bg-purple { background-color: #faf5ff; }

        .benefit-card h3 {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .benefit-card p {
          font-size: 13px;
          color: var(--color-text-medium);
          line-height: 1.6;
        }

        /* Destinations */
        .destinations-section {
          padding: 90px 0;
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 40px;
        }

        .link-btn {
          font-weight: 600;
          font-size: 14px;
          color: var(--color-accent);
        }

        .destinations-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }

        .destination-card {
          height: 240px;
          border-radius: var(--radius-md);
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: flex-end;
          padding: 16px;
          position: relative;
          overflow: hidden;
          transition: var(--transition-normal);
          cursor: pointer;
        }

        .destination-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.1);
          transition: var(--transition-fast);
        }

        .destination-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .destination-card:hover::before {
          background: rgba(0,0,0,0.3);
        }

        .destination-info {
          position: relative;
          z-index: 2;
        }

        .destination-info h3 {
          color: #ffffff;
          font-size: 16px;
          margin-bottom: 2px;
        }

        .destination-info p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
        }

        /* Steps */
        .steps-section {
          padding: 90px 0;
          background: #ffffff;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .step-card {
          padding: 32px;
          background: var(--color-bg-light);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          position: relative;
        }

        .step-num {
          background: var(--color-accent);
          color: #ffffff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .step-card h3 {
          font-size: 18px;
          margin-bottom: 8px;
        }

        .step-card p {
          font-size: 13px;
          color: var(--color-text-medium);
          line-height: 1.6;
        }

        /* Testimonials */
        .testimonials-section {
          padding: 90px 0;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .testimonial-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          padding: 32px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .testimonial-quote {
          font-size: 14px;
          font-style: italic;
          color: var(--color-text-medium);
          line-height: 1.6;
          margin: 20px 0;
        }

        .testimonial-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .testimonial-user h4 {
          font-size: 14px;
          font-weight: 700;
        }

        .testimonial-user p {
          font-size: 12px;
          color: var(--color-text-light);
        }

        /* CTA */
        .cta-section {
          background-color: var(--color-primary-medium);
          padding: 80px 0;
          color: #ffffff;
          text-align: center;
        }

        .cta-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 720px;
        }

        .cta-icon-wrapper {
          background: rgba(0, 168, 150, 0.15);
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          border: 1px solid rgba(0, 168, 150, 0.3);
        }

        .cta-section h2 {
          color: #ffffff;
          font-size: 36px;
          margin-bottom: 12px;
        }

        .cta-section p {
          color: var(--color-text-light);
          font-size: 16px;
          margin-bottom: 32px;
        }

        .cta-actions {
          display: flex;
          gap: 16px;
          margin-bottom: 40px;
        }

        .cta-primary-btn {
          background: var(--color-accent);
          color: #ffffff;
          padding: 14px 28px;
          border-radius: var(--radius-full);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cta-primary-btn:hover {
          background: var(--color-accent-hover);
        }

        .cta-secondary-btn {
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 14px 28px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        .cta-secondary-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .cta-benefits-list {
          display: flex;
          gap: 24px;
          font-size: 13px;
          color: var(--color-text-light);
        }

        @media (max-width: 1024px) {
          .benefits-grid, .steps-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .destinations-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .testimonials-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .hero-container {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .stat-widget {
            margin: 0 auto;
          }
          .ribbon-container {
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .benefits-grid, .steps-grid, .destinations-grid {
            grid-template-columns: 1fr;
          }
          .cta-actions {
            flex-direction: column;
            width: 100%;
          }
          .cta-primary-btn, .cta-secondary-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
