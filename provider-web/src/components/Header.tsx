import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Menu, X, User } from 'lucide-react';

export const Header: React.FC = () => {
  const { route, navigateTo, isRegistered, logout, providerProfile } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (targetRoute: 'beranda' | 'tentang-kami' | 'daftar' | 'dashboard' | 'masuk') => {
    navigateTo(targetRoute as any);
    setMobileMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="container header-container">
        <div className="logo-section" onClick={() => navigateTo('beranda')}>
          <div className="logo-brand">
            <span className="logo-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="#007bff" />
                <path d="M12 6C9.24 6 7 8.24 7 11c0 3.75 5 7 5 7s5-3.25 5-7c0-2.76-2.24-5-5-5zm0 6.75c-.97 0-1.75-.78-1.75-1.75S11.03 9.25 12 9.25s1.75 0.78 1.75 1.75-0.78 1.75-1.75 1.75z" fill="white" />
              </svg>
            </span>
            <span className="logo-text" style={{ color: '#007bff', fontWeight: 800, fontSize: '22px' }}>Trip<span style={{ color: '#007bff' }}>Kita</span></span>
            {isRegistered && providerProfile ? (
              providerProfile.role === 'ADMIN' ? (
                <span className="logo-badge" style={{ backgroundColor: '#fee2e2', color: '#ef4444', borderColor: '#fecaca' }}>Admin</span>
              ) : providerProfile.role === 'PROVIDER' ? (
                <span className="logo-badge">Mitra</span>
              ) : null
            ) : null}
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="desktop-nav">
          <button 
            className={`nav-link ${route === 'beranda' ? 'active' : ''}`}
            onClick={() => handleNav('beranda' as any)}
          >
            Home
          </button>
          <button 
            className={`nav-link ${route === 'riwayat-booking' ? 'active' : ''}`}
            onClick={() => handleNav('riwayat-booking' as any)}
          >
            Cek Booking
          </button>
          <button 
            className={`nav-link ${route === 'partner-landing' ? 'active' : ''}`}
            onClick={() => handleNav('partner-landing' as any)}
          >
            Jadi Mitra
          </button>
          <button 
            className={`nav-link ${route === 'tentang-kami' ? 'active' : ''}`}
            onClick={() => handleNav('tentang-kami' as any)}
          >
            Bantuan
          </button>
        </nav>

        <div className="auth-buttons">
          {isRegistered && providerProfile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {providerProfile.role === 'ADMIN' && (
                <button className="masuk-btn" onClick={() => navigateTo('admin-dashboard')}>Admin Panel</button>
              )}
              {providerProfile.role === 'PROVIDER' && (
                <button className="masuk-btn" onClick={() => navigateTo('dashboard')}>Mitra Panel</button>
              )}
              {providerProfile.role === 'CUSTOMER' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0f9ff', padding: '6px 14px', borderRadius: '30px', border: '1px solid #bae6fd' }}>
                  <User size={16} color="#0284c7" />
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0369a1' }}>
                    {providerProfile.picName || providerProfile.businessName || 'Traveler'}
                  </span>
                </div>
              )}
              <button 
                onClick={logout}
                style={{ 
                  padding: '7px 16px', 
                  backgroundColor: '#fee2e2', 
                  color: '#ef4444', 
                  border: '1px solid #fca5a5', 
                  borderRadius: '20px', 
                  fontSize: '12.5px', 
                  fontWeight: '700', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Keluar
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigateTo('masuk')}
              style={{ 
                padding: '9px 24px', 
                backgroundColor: '#0284c7', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '30px', 
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.2s'
              }} 
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
            >
              <User size={16} /> Masuk
            </button>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-nav-menu animate-fade-in">
          <nav className="mobile-nav-links">
            <button 
              className={`mobile-nav-link ${route === 'beranda' ? 'active' : ''}`}
              onClick={() => handleNav('beranda' as any)}
            >
              Home
            </button>
            <button 
              className={`mobile-nav-link ${route === 'riwayat-booking' ? 'active' : ''}`}
              onClick={() => handleNav('riwayat-booking' as any)}
            >
              Cek Booking
            </button>
            <button 
              className={`mobile-nav-link ${route === 'partner-landing' ? 'active' : ''}`}
              onClick={() => handleNav('partner-landing' as any)}
            >
              Jadi Mitra
            </button>
            <button 
              className={`mobile-nav-link ${route === 'tentang-kami' ? 'active' : ''}`}
              onClick={() => handleNav('tentang-kami' as any)}
            >
              Bantuan
            </button>
            <hr className="mobile-divider" />
            {isRegistered && providerProfile ? (
              <>
                {providerProfile.role === 'ADMIN' && (
                  <button className="mobile-nav-link" onClick={() => { handleNav('admin-dashboard' as any); }}>Admin Panel</button>
                )}
                {providerProfile.role === 'PROVIDER' && (
                  <button className="mobile-nav-link" onClick={() => { handleNav('dashboard' as any); }}>Mitra Panel</button>
                )}
                <button className="mobile-action-btn logout-btn" onClick={() => { logout(); setMobileMenuOpen(false); }}>Keluar</button>
              </>
            ) : (
              <button className="mobile-action-btn" onClick={() => handleNav('masuk')}>Masuk</button>
            )}
          </nav>
        </div>
      )}

      <style>{`
        .site-header {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          background: #ffffff;
          border-bottom: 1px solid var(--color-border);
          z-index: 1000;
          height: 80px;
          display: flex;
          align-items: center;
          transition: background var(--transition-normal);
        }

        .header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .logo-section {
          cursor: pointer;
        }

        .logo-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          font-size: 24px;
        }

        .logo-text {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 800;
          color: var(--color-primary-dark);
        }

        .logo-text span {
          color: var(--color-accent);
        }

        .logo-badge {
          background: #e6f7f5;
          color: var(--color-accent);
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 20px;
          margin-left: 4px;
          border: 1px solid rgba(0, 168, 150, 0.15);
        }

        .desktop-nav {
          display: flex;
          gap: 32px;
        }

        .nav-link {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-medium);
          padding: 8px 4px;
          position: relative;
        }

        .nav-link:hover, .nav-link.active {
          color: var(--color-accent);
        }

        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--color-accent);
          border-radius: 2px;
        }

        .auth-buttons {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .admin-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-medium);
          transition: var(--transition-fast);
          background-color: transparent;
        }

        .admin-btn:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
          background-color: var(--color-accent-light);
        }

        .masuk-btn {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-primary-dark);
          padding: 10px 18px;
        }

        .masuk-btn:hover {
          color: var(--color-accent);
        }

        .daftar-btn {
          background: var(--color-accent);
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 22px;
          border-radius: var(--radius-full);
          transition: var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .daftar-btn:hover {
          background: var(--color-accent-hover);
          transform: translateY(-1px);
        }

        .mobile-menu-toggle {
          display: none;
          color: var(--color-primary-dark);
        }

        /* Mobile Dropdown */
        .mobile-nav-menu {
          position: absolute;
          top: 80px;
          left: 0;
          right: 0;
          background: #ffffff;
          border-bottom: 1px solid var(--color-border);
          padding: 24px;
          box-shadow: var(--shadow-lg);
        }

        .mobile-nav-links {
          display: flex;
          flex-col: column;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mobile-nav-link {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-text-medium);
          text-align: left;
          padding: 8px 0;
        }

        .mobile-nav-link.active, .mobile-nav-link:hover {
          color: var(--color-accent);
        }

        .mobile-divider {
          border: 0;
          border-top: 1px solid var(--color-border);
          margin: 8px 0;
        }

        .mobile-action-btn {
          background: var(--color-accent);
          color: #ffffff;
          padding: 12px;
          border-radius: var(--radius-md);
          font-weight: 600;
          text-align: center;
        }

        .logout-btn {
          background: #ef4444;
        }

        @media (max-width: 768px) {
          .desktop-nav, .auth-buttons {
            display: none;
          }
          .mobile-menu-toggle {
            display: block;
          }
        }
      `}</style>
    </header>
  );
};
