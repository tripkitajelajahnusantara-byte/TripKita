import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <div className="footer-left">
          <div className="logo-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="10" fill="url(#tementrip-ftr-grad)"/>
              <path d="M16 6C12.134 6 9 9.134 9 13C9 18.25 16 26 16 26C16 26 23 18.25 23 13C23 9.134 19.866 6 16 6ZM16 16.5C14.067 16.5 12.5 14.933 12.5 13C12.5 11.067 14.067 9.5 16 9.5C17.933 9.5 19.5 11.067 19.5 13C19.5 14.933 17.933 16.5 16 16.5Z" fill="white"/>
              <path d="M13.5 13C13.5 14.3807 14.6193 15.5 16 15.5C17.3807 15.5 18.5 14.3807 18.5 13" stroke="#007bff" strokeWidth="1.8" strokeLinecap="round"/>
              <defs>
                <linearGradient id="tementrip-ftr-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#007bff"/>
                  <stop offset="1" stopColor="#00a896"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="logo-text" style={{ color: '#007bff', fontWeight: 800, fontSize: '18px' }}>Temen<span style={{ color: '#00a896' }}>Trip</span></span>
            <span className="logo-badge">Partner</span>
          </div>
          <span className="copyright-text">
            © 2026 TemenTrip. Hak cipta dilindungi undang-undang.
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
