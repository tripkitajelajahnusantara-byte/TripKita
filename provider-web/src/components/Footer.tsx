import React, { useState } from 'react';
import { LegalModalContainer, GeneralTermsContent, PrivacyPolicyContent } from './LegalModals';

export const Footer: React.FC = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <div className="footer-left">
          <div className="logo-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="12" fill="url(#cute-tementrip-ftr-grad)"/>
              <path d="M18 5C12.4772 5 8 9.47715 8 15C8 21.6 18 30 18 30C18 30 28 21.6 28 15C28 9.47715 23.5228 5 18 5Z" fill="white"/>
              <circle cx="18" cy="14" r="6" fill="#F8FAFC"/>
              <circle cx="15" cy="13.5" r="1.3" fill="#0F172A"/>
              <circle cx="21" cy="13.5" r="1.3" fill="#0F172A"/>
              <circle cx="15.4" cy="13" r="0.4" fill="white"/>
              <circle cx="21.4" cy="13" r="0.4" fill="white"/>
              <circle cx="13" cy="15.2" r="1.2" fill="#FF8E8E" opacity="0.8"/>
              <circle cx="23" cy="15.2" r="1.2" fill="#FF8E8E" opacity="0.8"/>
              <path d="M16 15.5C16 16.6 16.9 17.5 18 17.5C19.1 17.5 20 16.6 20 15.5" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M27 5L28.2 7.8L31 9L28.2 10.2L27 13L25.8 10.2L23 9L25.8 7.8L27 5Z" fill="#FFD166"/>
              <defs>
                <linearGradient id="cute-tementrip-ftr-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0284C7"/>
                  <stop offset="0.55" stopColor="#00C9A7"/>
                  <stop offset="1" stopColor="#FF6B81"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="logo-text" style={{ color: '#0284c7', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px' }}>Temen<span style={{ color: '#00c9a7' }}>Trip</span><span style={{ color: '#ff6b81', fontSize: '15px' }}>✨</span></span>
            <span className="logo-badge">Partner</span>
          </div>
          <span className="copyright-text">
            © 2026 TemenTrip. Hak cipta dilindungi undang-undang.
          </span>
        </div>
        <div className="footer-right">
          <button 
            type="button" 
            onClick={() => setShowPrivacy(true)}
            className="footer-link-btn"
          >
            Kebijakan Privasi
          </button>
          <button 
            type="button" 
            onClick={() => setShowTerms(true)}
            className="footer-link-btn"
          >
            Syarat & Ketentuan
          </button>
        </div>
      </div>

      {/* Modals */}
      <LegalModalContainer
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        title="Syarat & Ketentuan Platform TripKita"
      >
        <GeneralTermsContent />
      </LegalModalContainer>

      <LegalModalContainer
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Kebijakan Privasi TemenTrip"
      >
        <PrivacyPolicyContent />
      </LegalModalContainer>

      <style>{`
        .site-footer {
          background-color: #ffffff;
          padding: 24px 0;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
        }

        .footer-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .footer-left .logo-brand {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .footer-left .logo-icon {
          font-size: 18px;
        }

        .footer-left .logo-text {
          font-size: 16px;
          color: #007bff;
          font-weight: 800;
        }

        .footer-left .logo-text span {
          color: #007bff;
        }

        .footer-left .logo-badge {
          background: #e0f2fe;
          color: #007bff;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 20px;
          border: 1px solid #bae6fd;
        }

        .copyright-text {
          font-size: 12px;
          color: #94a3b8;
        }

        .footer-right {
          display: flex;
          gap: 20px;
        }

        .footer-link-btn {
          background: none;
          border: none;
          padding: 0;
          font-size: 12px;
          color: #64748b;
          cursor: pointer;
          transition: color 0.2s;
        }

        .footer-link-btn:hover {
          color: #007bff;
          text-decoration: underline;
        }

        @media (max-width: 640px) {
          .footer-container {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .footer-right {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </footer>
  );
};

