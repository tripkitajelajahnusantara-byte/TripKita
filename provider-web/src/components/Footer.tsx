import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <div className="footer-left">
          <div className="logo-brand">
            <span className="logo-icon">🗺️</span>
            <span className="logo-text">Trip<span>Kita</span></span>
            <span className="logo-badge">Partner</span>
          </div>
          <span className="copyright-text">
            © 2026 TripKita. Hak cipta dilindungi undang-undang.
          </span>
        </div>
        <div className="footer-right">
          <a href="#" className="footer-link">Kebijakan Privasi</a>
          <a href="#" className="footer-link">Syarat & Ketentuan</a>
        </div>
      </div>

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

        .footer-link {
          font-size: 12px;
          color: #64748b;
          transition: var(--transition-fast);
        }

        .footer-link:hover {
          color: #007bff;
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
