import React, { useState } from 'react';
import { LegalModalContainer, GeneralTermsContent, PrivacyPolicyContent } from './LegalModals';
import { useNavigation } from '../context/NavigationContext';
import { useI18n } from '../i18n';
import { Mail, Phone, MapPin, Clock, ShieldCheck, ChevronRight } from 'lucide-react';

export const Footer: React.FC = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const { navigateTo, route } = useNavigation();
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="container footer-top-container">
        <div className="footer-grid">
          {/* Column 1: Brand & About */}
          <div className="footer-col brand-col">
            <div className="logo-brand">
              <img src="/tementrip_official_logo.png" alt="TemenTrip" className="footer-logo" />
              {route === 'partner-landing' && <span className="logo-badge">Partner</span>}
            </div>
            <p className="brand-description">
              {t('TemenTrip (PT TripKita Jelajah Nusantara) adalah platform untuk memesan paket wisata dari mitra lokal di Indonesia: Open Trip, Private Trip, serta trip keluarga dan rombongan.', 'TemenTrip (PT TripKita Jelajah Nusantara) is a platform for booking tour packages from local partners across Indonesia: Open Trip, Private Trip, and family or group trips.')}
            </p>
            <div className="security-badge">
              <ShieldCheck size={16} color="#00c9a7" />
              <span>{t('Pembayaran aman & otomatis lewat Midtrans', 'Secure, automatic payment via Midtrans')}</span>
            </div>
          </div>

          {/* Column 2: Kontak resmi */}
          <div className="footer-col contact-col">
            <h4 className="footer-col-title">{t('Kontak', 'Contact')}</h4>
            <ul className="contact-info-list">
              <li>
                <Mail size={16} className="contact-icon email-icon" />
                <div>
                  <span className="contact-label">Email:</span>
                  <a href="mailto:tripkitajelajahnusantara@gmail.com" className="contact-link">
                    tripkitajelajahnusantara@gmail.com
                  </a>
                </div>
              </li>
              <li>
                <Phone size={16} className="contact-icon wa-icon" />
                <div>
                  <span className="contact-label">WhatsApp:</span>
                  <a href="https://wa.me/628132008875" target="_blank" rel="noreferrer" className="contact-link">
                    +62 813 2008 875
                  </a>
                </div>
              </li>
              <li>
                <Clock size={16} className="contact-icon time-icon" />
                <div>
                  <span className="contact-label">{t('Layanan pelanggan:', 'Customer service:')}</span>
                  <span className="contact-text">{t('Hubungi kami melalui WhatsApp atau email.', 'Reach us via WhatsApp or email.')}</span>
                </div>
              </li>
              <li>
                <MapPin size={16} className="contact-icon map-icon" />
                <div>
                  <span className="contact-label">{t('Alamat:', 'Address:')}</span>
                  <span className="contact-text">
                    Jl. Puskesmas No.35-22, RT.11/RW.7, Duri Kosambi, Kec. Cengkareng, Kota Jakarta Barat, DKI Jakarta 11750
                  </span>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 3: Quick Links */}
          <div className="footer-col nav-col">
            <h4 className="footer-col-title">{t('Navigasi Utama', 'Menu')}</h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" onClick={() => navigateTo('beranda')} className="footer-nav-btn">
                  <ChevronRight size={14} /> {t('Beranda', 'Home')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('cari-trip')} className="footer-nav-btn">
                  <ChevronRight size={14} /> {t('Cari Trip Wisata', 'Find Trips')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('riwayat-booking')} className="footer-nav-btn">
                  <ChevronRight size={14} /> {t('Cek Booking & Voucher', 'My Bookings')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('rencana-trip')} className="footer-nav-btn">
                  <ChevronRight size={14} /> {t('Perencana Trip (Tabungan)', 'Trip Planner')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('partner-landing')} className="footer-nav-btn highlight-partner">
                  <ChevronRight size={14} /> {t('Jadi Mitra Provider', 'Become a Partner')}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Customer Help & Info */}
          <div className="footer-col info-col">
            <h4 className="footer-col-title">{t('Pusat Informasi', 'Information')}</h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" onClick={() => navigateTo('tentang-kami')} className="footer-nav-btn">
                  <ChevronRight size={14} /> {t('Tentang Kami', 'About Us')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('berita')} className="footer-nav-btn">
                  <ChevronRight size={14} /> {t('Cerita Travel', 'Travel Stories')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('bantuan')} className="footer-nav-btn">
                  <ChevronRight size={14} /> {t('Pusat Bantuan & FAQ', 'Help & FAQ')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setShowPrivacy(true)} className="footer-nav-btn">
                  <ChevronRight size={14} /> {t('Kebijakan Privasi', 'Privacy Policy')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setShowTerms(true)} className="footer-nav-btn">
                  <ChevronRight size={14} /> {t('Syarat & Ketentuan', 'Terms & Conditions')}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-bottom">
        <div className="container footer-bottom-container">
          <span className="copyright-text">
            © {new Date().getFullYear()} TemenTrip (PT TripKita Jelajah Nusantara). {t('Hak cipta dilindungi undang-undang.', 'All rights reserved.')}
          </span>
          <div className="footer-legal-links">
            <button type="button" onClick={() => setShowPrivacy(true)} className="footer-legal-btn">
              {t('Kebijakan Privasi', 'Privacy Policy')}
            </button>
            <span className="legal-dot">•</span>
            <button type="button" onClick={() => setShowTerms(true)} className="footer-legal-btn">
              {t('Syarat & Ketentuan', 'Terms & Conditions')}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <LegalModalContainer
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        title={t('Syarat & Ketentuan TemenTrip', 'TemenTrip Terms & Conditions')}
      >
        <GeneralTermsContent />
      </LegalModalContainer>

      <LegalModalContainer
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title={t('Kebijakan Privasi TemenTrip', 'TemenTrip Privacy Policy')}
      >
        <PrivacyPolicyContent />
      </LegalModalContainer>

      <style>{`
        .site-footer {
          background-color: #0f172a;
          color: #94a3b8;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          border-top: 1px solid #1e293b;
          padding-top: 48px;
        }

        .footer-top-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px 40px;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.4fr 0.8fr 0.8fr;
          gap: 32px;
        }

        .footer-col-title {
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 16px 0;
          letter-spacing: 0.3px;
        }

        /* Brand Column */
        .brand-col .logo-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .footer-logo {
          height: 32px;
          width: auto;
          object-fit: contain;
          filter: brightness(0) invert(1);
        }

        .logo-badge {
          background: rgba(14, 165, 233, 0.15);
          color: #38bdf8;
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .brand-description {
          font-size: 13px;
          line-height: 1.6;
          color: #94a3b8;
          margin: 0 0 16px 0;
        }

        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid #334155;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          color: #cbd5e1;
          font-weight: 600;
        }

        /* Contact Info Column */
        .contact-info-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .contact-info-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 12.5px;
        }

        .contact-icon {
          flex-shrink: 0;
          margin-top: 3px;
        }

        .email-icon { color: #38bdf8; }
        .wa-icon { color: #4ade80; }
        .time-icon { color: #a78bfa; }
        .map-icon { color: #fbbf24; }

        .contact-label {
          display: block;
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .contact-link {
          color: #e2e8f0;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }

        .contact-link:hover {
          color: #38bdf8;
          text-decoration: underline;
        }

        .contact-text {
          color: #cbd5e1;
          line-height: 1.4;
          font-weight: 500;
        }

        /* Nav & Info Columns */
        .footer-links-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .footer-nav-btn {
          background: none;
          border: none;
          padding: 0;
          color: #cbd5e1;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
          text-align: left;
        }

        .footer-nav-btn:hover {
          color: #38bdf8;
          transform: translateX(3px);
        }

        .highlight-partner {
          color: #38bdf8;
          font-weight: 700;
        }

        /* Footer Bottom Bar */
        .footer-bottom {
          background-color: #020617;
          border-top: 1px solid #1e293b;
          padding: 18px 0;
        }

        .footer-bottom-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .copyright-text {
          font-size: 12px;
          color: #64748b;
        }

        .footer-legal-links {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .footer-legal-btn {
          background: none;
          border: none;
          padding: 0;
          font-size: 12px;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.2s;
        }

        .footer-legal-btn:hover {
          color: #38bdf8;
          text-decoration: underline;
        }

        .legal-dot {
          color: #475569;
          font-size: 10px;
        }

        @media (max-width: 992px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 28px;
          }
        }

        @media (max-width: 640px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .footer-bottom-container {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </footer>
  );
};


