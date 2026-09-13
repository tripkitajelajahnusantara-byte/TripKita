import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ArrowRight, TrendingUp, ShieldCheck, Headphones, Globe, Compass } from 'lucide-react';

export const ProviderLandingPage: React.FC = () => {
  const { navigateTo } = useNavigation();

  

  return (
    <div className="landing-page animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="hero-badge">
              <Compass size={14} className="badge-icon" /> Platform Partner Wisata Indonesia
            </span>
            <h1 className="hero-title">
              Kembangkan Bisnis <br />
              <span className="accent-text">Wisata Anda</span> <br />
              Bersama TemenTrip
            </h1>
            <p className="hero-subtitle">
              Kelola paket wisata, pemesanan pelanggan, dan pengajuan pencairan dana melalui portal mitra TemenTrip.
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => navigateTo('provider-register')}>
                Mulai Gratis Sekarang <ArrowRight size={16} />
              </button>
              <button className="secondary-btn" onClick={() => navigateTo('tentang-kami')}>
                Pelajari Lebih Lanjut
              </button>
            </div>

            
          </div>

          
        </div>
      </section>

      {/* Stats Ribbon */}
      

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">KEUNTUNGAN PARTNER</span>
            <h2 className="section-title">Kenapa Pilih TemenTrip?</h2>
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
                Pantau transaksi dan ajukan pencairan dana melalui menu keuangan mitra.
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
                Tampilkan paket wisata Anda di katalog TemenTrip agar dapat ditemukan dan dipesan pelanggan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Destinations Section */}
      

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
      

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container cta-container">
          <div className="cta-icon-wrapper">
            <Compass size={36} color="#00a896" />
          </div>
          <h2>Siap Bergabung dengan TemenTrip?</h2>
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
