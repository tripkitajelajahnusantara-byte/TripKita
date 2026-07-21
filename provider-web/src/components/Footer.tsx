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
          background-color: var(--color-primary-dark);
          padding: 40px 0;
          color: #ffffff;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .footer-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
        }

        .footer-left {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .footer-left .logo-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .footer-left .logo-icon {
          font-size: 20px;
        }

        .footer-left .logo-text {
          font-size: 18px;
          color: #ffffff;
          font-weight: 700;
        }

        .footer-left .logo-text span {
          color: var(--color-accent);
        }

        .footer-left .logo-badge {
          background: rgba(0, 168, 150, 0.15);
          color: var(--color-accent);
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 20px;
          border: 1px solid rgba(0, 168, 150, 0.3);
        }

        .copyright-text {
          font-size: 13px;
          color: var(--color-text-light);
        }

        .footer-right {
          display: flex;
          gap: 24px;
        }

        .footer-link {
          font-size: 13px;
          color: var(--color-text-light);
          transition: var(--transition-fast);
        }

        .footer-link:hover {
          color: #ffffff;
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
