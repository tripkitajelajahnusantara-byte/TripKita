import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Menu, X, User } from 'lucide-react';

export const Header: React.FC = () => {
  const { route, navigateTo, logout, providerProfile, customerProfile } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (targetRoute: 'beranda' | 'tentang-kami' | 'partner-landing' | 'bantuan' | 'riwayat-booking' | 'masuk') => {
    navigateTo(targetRoute as any);
    setMobileMenuOpen(false);
  };

  const isProviderRoute = ['dashboard', 'kelola-paket', 'booking', 'keuangan-provider', 'profil-provider', 'tambah-paket', 'admin-dashboard', 'provider-login', 'provider-register'].includes(route);

  return (
    <header className="site-header">
      <div className="container header-container">
        <div className="logo-section" onClick={() => navigateTo(isProviderRoute ? 'dashboard' : 'beranda')}>
          <div className="logo-brand">
            <span className="logo-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="36" height="36" rx="12" fill="url(#cute-tementrip-hdr-grad)"/>
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
                  <linearGradient id="cute-tementrip-hdr-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0284C7"/>
                    <stop offset="0.55" stopColor="#00C9A7"/>
                    <stop offset="1" stopColor="#FF6B81"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <span className="logo-text" style={{ color: '#0284c7', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.5px' }}>Temen<span style={{ color: '#00c9a7' }}>Trip</span><span style={{ color: '#ff6b81', fontSize: '18px' }}>✨</span></span>
            {isProviderRoute && providerProfile ? (
              providerProfile.role === 'ADMIN' ? (
                <span className="logo-badge" style={{ backgroundColor: '#fee2e2', color: '#ef4444', borderColor: '#fecaca' }}>Admin</span>
              ) : (
                <span className="logo-badge">Mitra</span>
              )
            ) : null}
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="desktop-nav">
          <button 
            className={`nav-link ${route === 'beranda' ? 'active' : ''}`}
            onClick={() => handleNav('beranda')}
          >
            Home
          </button>
          <button 
            className={`nav-link ${route === 'riwayat-booking' ? 'active' : ''}`}
            onClick={() => handleNav('riwayat-booking')}
          >
            Cek Booking
          </button>
          <button 
            className={`nav-link ${route === 'partner-landing' ? 'active' : ''}`}
            onClick={() => handleNav('partner-landing')}
          >
            Jadi Mitra
          </button>
          <button 
            className={`nav-link ${route === 'tentang-kami' ? 'active' : ''}`}
            onClick={() => handleNav('tentang-kami')}
          >
            Tentang Kami
          </button>
          <button 
            className={`nav-link ${route === 'bantuan' ? 'active' : ''}`}
            onClick={() => handleNav('bantuan')}
          >
            Bantuan
          </button>
        </nav>

        <div className="auth-buttons">
          {isProviderRoute ? (
            providerProfile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {providerProfile.role === 'ADMIN' ? (
                  <button className="masuk-btn" onClick={() => navigateTo('admin-dashboard')}>Admin Panel</button>
                ) : (
                  <button className="masuk-btn" onClick={() => navigateTo('dashboard')}>Mitra Panel</button>
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
              <button className="masuk-btn" onClick={() => navigateTo('provider-login')}>Masuk Mitra</button>
            )
          ) : (
            customerProfile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0f9ff', padding: '6px 14px', borderRadius: '30px', border: '1px solid #bae6fd' }}>
                  <User size={16} color="#0284c7" />
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0369a1' }}>
                    {customerProfile.picName || customerProfile.businessName || customerProfile.email || 'Traveler'}
                  </span>
                </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={() => navigateTo('masuk')}
                  style={{ 
                    padding: '8px 22px', 
                    backgroundColor: '#0284c7', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '30px', 
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 10px rgba(2, 132, 199, 0.2)',
                    transition: 'all 0.2s'
                  }} 
                >
                  <User size={15} /> Masuk
                </button>
              </div>
            )
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
              onClick={() => handleNav('beranda')}
            >
              Home
            </button>
            <button 
              className={`mobile-nav-link ${route === 'riwayat-booking' ? 'active' : ''}`}
              onClick={() => handleNav('riwayat-booking')}
            >
              Cek Booking
            </button>
            <button 
              className={`mobile-nav-link ${route === 'partner-landing' ? 'active' : ''}`}
              onClick={() => handleNav('partner-landing')}
            >
              Jadi Mitra
            </button>
            <button 
              className={`mobile-nav-link ${route === 'tentang-kami' ? 'active' : ''}`}
              onClick={() => handleNav('tentang-kami')}
            >
              Tentang Kami
            </button>
            <button 
              className={`mobile-nav-link ${route === 'bantuan' ? 'active' : ''}`}
              onClick={() => handleNav('bantuan')}
            >
              Bantuan
            </button>
            <hr className="mobile-divider" />
            {isProviderRoute ? (
              providerProfile ? (
                <button className="mobile-action-btn logout-btn" onClick={() => { logout(); setMobileMenuOpen(false); }}>Keluar Mitra</button>
              ) : (
                <button className="mobile-action-btn" onClick={() => handleNav('provider-login' as any)}>Masuk Mitra</button>
              )
            ) : (
              customerProfile ? (
                <button className="mobile-action-btn logout-btn" onClick={() => { logout(); setMobileMenuOpen(false); }}>Keluar</button>
              ) : (
                <button className="mobile-action-btn" onClick={() => handleNav('masuk')}>Masuk</button>
              )
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
