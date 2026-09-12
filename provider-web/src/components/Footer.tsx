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
            <img src="/tementrip_official_logo.png" alt="TemenTrip" style={{ height: '30px', width: 'auto', objectFit: 'contain' }} />
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

