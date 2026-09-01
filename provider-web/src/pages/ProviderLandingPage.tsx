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

export const ProviderLandingPage: React.FC = () => {
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
              <button className="primary-btn" onClick={() => navigateTo('provider-register')}>
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
            <button className="cta-primary-btn" onClick={() => navigateTo('provider-register')}>
              Daftar Gratis Sekarang <ArrowRight size={16} />
            </button>
            <button className="cta-secondary-btn" onClick={() => navigateTo('provider-login')}>
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
    </div>
  );
};
