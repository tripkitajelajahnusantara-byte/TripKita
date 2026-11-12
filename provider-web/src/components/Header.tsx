import React, { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Menu, X, User, Settings, LogOut, ChevronDown, Target, House, Ticket, Newspaper, Handshake, Info, LifeBuoy, type LucideIcon } from 'lucide-react';
import type { Route } from '../types';
import { NotificationCenter } from './NotificationCenter';
import { LanguageSwitch } from './LanguageSwitch';
import { useI18n } from '../i18n';

interface NavItem {
  route: Route;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export const Header: React.FC = () => {
  const { route, navigateTo, logout, providerProfile, customerProfile, openAuthModal } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { t } = useI18n();

  // Escape menutup menu yang sedang terbuka, sama seperti klik di luar menu.
  useEffect(() => {
    if (!mobileMenuOpen && !showUserMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileMenuOpen(false);
      setShowUserMenu(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen, showUserMenu]);

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setShowUserMenu(false);
  };

  const handleNav = (targetRoute: Route) => {
    closeMenus();
    navigateTo(targetRoute);
  };

  // Menu Rencana Trip terlihat oleh semua pengunjung; tamu diminta masuk/daftar dulu.
  const openTripPlanner = () => {
    closeMenus();
    if (customerProfile) navigateTo('rencana-trip');
    else openAuthModal('login', () => navigateTo('rencana-trip'));
  };

  const isProviderRoute = ['dashboard', 'kelola-paket', 'booking', 'keuangan-provider', 'profil-provider', 'tambah-paket', 'admin-dashboard', 'provider-login', 'provider-register'].includes(route);
  const handleLogoClick = () => {
    // Halaman login dan pendaftaran mitra adalah halaman publik. Logo di
    // header harus selalu membawa pengunjung kembali ke landing page utama,
    // bukan mencoba membuka dashboard yang membutuhkan sesi provider.
    const isPublicProviderAuthPage = route === 'provider-login' || route === 'provider-register';
    closeMenus();
    navigateTo(isPublicProviderAuthPage ? 'beranda' : (isProviderRoute ? 'dashboard' : 'beranda'));
  };

  // Menu traveler. "Jadi Mitra" sengaja dipisah ke sisi kanan karena untuk audiens berbeda.
  const travelerLinks: NavItem[] = [
    { route: 'beranda', label: 'Home', icon: House },
    { route: 'rencana-trip', label: t('Rencana Trip', 'Trip Planner'), icon: Target, onClick: openTripPlanner },
    { route: 'riwayat-booking', label: t('Cek Booking', 'My Bookings'), icon: Ticket },
    { route: 'berita', label: t('Berita', 'News'), icon: Newspaper },
    { route: 'tentang-kami', label: t('Tentang Kami', 'About Us'), icon: Info },
    { route: 'bantuan', label: t('Bantuan', 'Help'), icon: LifeBuoy },
  ];
  const partnerLink: NavItem = { route: 'partner-landing', label: t('Jadi Mitra', 'Become a Partner'), icon: Handshake };

  const displayName = customerProfile?.picName || customerProfile?.businessName || customerProfile?.email || 'Traveler';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'T';

  return (
    <header className={`site-header${isProviderRoute ? '' : ' site-header--traveler'}`}>
      <div className="container header-container">
        <div
          className="logo-section"
          role="link"
          tabIndex={0}
          aria-label={t('Kembali ke halaman utama TemenTrip', 'Back to TemenTrip home')}
          onClick={handleLogoClick}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleLogoClick();
            }
          }}
        >
          <div className="logo-brand">
            <img src="/tementrip_official_logo.png" alt="TemenTrip" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
            {isProviderRoute && providerProfile ? (
              providerProfile.role === 'ADMIN' ? (
                <span className="logo-badge" style={{ backgroundColor: '#fee2e2', color: '#ef4444', borderColor: '#fecaca' }}>Admin</span>
              ) : (
                <span className="logo-badge">Mitra</span>
              )
            ) : null}
          </div>
        </div>

        {!isProviderRoute && (
          <nav className="main-nav" aria-label={t('Navigasi utama', 'Main navigation')}>
            {travelerLinks.map((link) => (
              <button
                key={link.route}
                type="button"
                className={`nav-link${route === link.route ? ' active' : ''}`}
                aria-current={route === link.route ? 'page' : undefined}
                onClick={link.onClick ?? (() => handleNav(link.route))}
              >
                {link.label}
              </button>
            ))}
          </nav>
        )}

        {/* User Account / Auth Actions */}
        <div className="header-actions">
          {isProviderRoute ? (
            providerProfile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <NotificationCenter />
                {providerProfile.role === 'ADMIN' ? (
                  <button className="masuk-btn header-desktop-only" onClick={() => navigateTo('admin-dashboard')}>Admin Panel</button>
                ) : (
                  <button className="masuk-btn header-desktop-only" onClick={() => navigateTo('dashboard')}>Mitra Panel</button>
                )}
                <button
                  className="header-desktop-only"
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
              <button className="masuk-btn header-desktop-only" onClick={() => navigateTo('provider-login')}>Masuk Mitra</button>
            )
          ) : (
            <>
              {/* Dashboard mitra/admin hanya berbahasa Indonesia, jadi pilihan bahasa khusus halaman customer. */}
              <LanguageSwitch className="traveler-desktop-only" />
              <button
                type="button"
                className={`partner-link traveler-desktop-only${route === partnerLink.route ? ' active' : ''}`}
                aria-current={route === partnerLink.route ? 'page' : undefined}
                onClick={() => handleNav(partnerLink.route)}
              >
                <Handshake size={16} aria-hidden="true" /> {partnerLink.label}
              </button>
              {customerProfile ? (
                <>
                  <NotificationCenter />
                  <div className="user-menu-wrap">
                    <button
                      type="button"
                      className={`user-chip${showUserMenu ? ' open' : ''}`}
                      aria-haspopup="menu"
                      aria-expanded={showUserMenu}
                      aria-label={t('Menu akun', 'Account menu')}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowUserMenu((open) => !open);
                      }}
                    >
                      <span className="user-avatar" aria-hidden="true">{initial}</span>
                      <span className="header-user-name user-chip-name">{displayName}</span>
                      <ChevronDown size={15} className="header-user-name user-chip-chevron" aria-hidden="true" />
                    </button>

                    {showUserMenu && (
                      <>
                        {/* Klik di luar menu menutupnya */}
                        <div className="menu-dismiss" onClick={() => setShowUserMenu(false)} />
                        <div className="user-menu animate-fade-in" role="menu">
                          <div className="user-menu-head">
                            <strong>{customerProfile.picName || t('Pelanggan', 'Traveler')}</strong>
                            {customerProfile.email && <span>{customerProfile.email}</span>}
                          </div>
                          <button type="button" role="menuitem" className="user-menu-item" onClick={openTripPlanner}>
                            <Target size={16} aria-hidden="true" /> {t('Rencana Trip', 'Trip Planner')}
                          </button>
                          <button type="button" role="menuitem" className="user-menu-item" onClick={() => handleNav('pengaturan')}>
                            <Settings size={16} aria-hidden="true" /> {t('Pengaturan (Akun & Favorit)', 'Settings (Account & Favorites)')}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="user-menu-item danger"
                            onClick={() => {
                              closeMenus();
                              logout();
                            }}
                          >
                            <LogOut size={16} aria-hidden="true" /> {t('Keluar', 'Sign out')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <button type="button" className="signin-btn" onClick={() => openAuthModal('login')}>
                  <User size={15} aria-hidden="true" /> {t('Masuk', 'Sign in')}
                </button>
              )}
            </>
          )}

          {/* Mobile menu trigger */}
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={mobileMenuOpen ? t('Tutup menu', 'Close menu') : t('Buka menu', 'Open menu')}
            aria-expanded={mobileMenuOpen}
            onClick={() => {
              setShowUserMenu(false);
              setMobileMenuOpen((open) => !open);
            }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-nav-menu animate-fade-in">
            {isProviderRoute ? (
              <nav className="mobile-nav-links">
                {providerProfile && (
                  <button
                    className="mobile-nav-link"
                    onClick={() => handleNav(providerProfile.role === 'ADMIN' ? 'admin-dashboard' : 'dashboard')}
                  >
                    {providerProfile.role === 'ADMIN' ? 'Admin Panel' : 'Mitra Panel'}
                  </button>
                )}
                <hr className="mobile-divider" />
                {providerProfile ? (
                  <button className="mobile-action-btn logout-btn" onClick={() => { logout(); setMobileMenuOpen(false); }}>Keluar Mitra</button>
                ) : (
                  <button className="mobile-action-btn" onClick={() => handleNav('provider-login')}>Masuk Mitra</button>
                )}
              </nav>
            ) : (
              <nav className="mnav" aria-label={t('Navigasi utama', 'Main navigation')}>
                {[...travelerLinks, partnerLink].map((link) => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={link.route}
                      type="button"
                      className={`mnav-link${route === link.route ? ' active' : ''}`}
                      aria-current={route === link.route ? 'page' : undefined}
                      onClick={link.onClick ?? (() => handleNav(link.route))}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {link.label}
                    </button>
                  );
                })}

                <div className="mnav-divider" />
                <div className="mnav-lang">
                  <span>{t('Bahasa', 'Language')}</span>
                  <LanguageSwitch />
                </div>

                {customerProfile && (
                  <>
                    <div className="mnav-divider" />
                    <button
                      type="button"
                      className={`mnav-link${route === 'pengaturan' ? ' active' : ''}`}
                      onClick={() => handleNav('pengaturan')}
                    >
                      <Settings size={18} aria-hidden="true" />
                      {t('Pengaturan (Akun & Favorit)', 'Settings (Account & Favorites)')}
                    </button>
                    <button
                      type="button"
                      className="mnav-link danger"
                      onClick={() => {
                        closeMenus();
                        logout();
                      }}
                    >
                      <LogOut size={18} aria-hidden="true" />
                      {t('Keluar', 'Sign out')}
                    </button>
                  </>
                )}
              </nav>
            )}
          </div>
        </>
      )}

      <style>{`
        .site-header {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          /* Tanpa backdrop-filter: filter membuat overlay position:fixed di dalam header ikut terkurung. */
          background: #ffffff;
          border-bottom: 1px solid var(--color-border);
          z-index: 1000;
          height: 80px;
          display: flex;
          align-items: center;
        }

        .header-container {
          display: flex;
          align-items: center;
          width: 100%;
        }

        .logo-section {
          cursor: pointer;
          flex-shrink: 0;
          margin-right: 36px;
          border-radius: 8px;
        }

        .logo-section:focus-visible,
        .nav-link:focus-visible,
        .partner-link:focus-visible,
        .signin-btn:focus-visible,
        .user-chip:focus-visible,
        .user-menu-item:focus-visible,
        .mnav-link:focus-visible,
        .mobile-menu-toggle:focus-visible {
          outline: 2px solid #0284c7;
          outline-offset: 2px;
        }

        .logo-brand {
          display: flex;
          align-items: center;
          gap: 8px;
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

        /* Navigasi traveler */
        .main-nav {
          display: flex;
          align-items: center;
          gap: 2px;
          min-width: 0;
        }

        .nav-link {
          font-size: 14.5px;
          font-weight: 600;
          color: #475569;
          padding: 8px 14px;
          border-radius: 999px;
          background: transparent;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          transition: background-color 0.15s ease, color 0.15s ease;
        }

        .nav-link:hover {
          color: #0f172a;
          background-color: #f1f5f9;
        }

        .nav-link.active {
          color: #0369a1;
          background-color: #e0f2fe;
        }

        .header-actions {
          margin-left: auto;
          gap: 10px;
        }

        .partner-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid #ccfbf1;
          background: #f0fdfa;
          color: #0f766e;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        .partner-link:hover,
        .partner-link.active {
          background: #ccfbf1;
          border-color: #99f6e4;
        }

        .signin-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 20px;
          border: none;
          border-radius: 999px;
          background: #0284c7;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(2, 132, 199, 0.2);
          transition: background-color 0.15s ease;
        }

        .signin-btn:hover {
          background: #0369a1;
        }

        /* Akun traveler */
        .user-menu-wrap {
          position: relative;
        }

        .user-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px 4px 4px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          cursor: pointer;
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }

        .user-chip:hover,
        .user-chip.open {
          border-color: #bae6fd;
          background: #f0f9ff;
        }

        .user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #0284c7;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .user-chip-name {
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
        }

        .user-chip-chevron {
          color: #64748b;
          transition: transform 0.15s ease;
        }

        .user-chip.open .user-chip-chevron {
          transform: rotate(180deg);
        }

        .menu-dismiss {
          position: fixed;
          inset: 0;
          z-index: 9998;
        }

        .user-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 250px;
          padding: 6px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 12px 32px -8px rgba(15, 23, 42, 0.18);
          z-index: 9999;
        }

        .user-menu-head {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 12px 12px;
          margin-bottom: 6px;
          border-bottom: 1px solid #f1f5f9;
        }

        .user-menu-head strong {
          font-size: 14px;
          color: #0f172a;
        }

        .user-menu-head span {
          font-size: 12px;
          color: #64748b;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: #334155;
          font-size: 13.5px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
        }

        .user-menu-item svg {
          color: #64748b;
          flex-shrink: 0;
        }

        .user-menu-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .user-menu-item.danger,
        .user-menu-item.danger svg {
          color: #dc2626;
        }

        .user-menu-item.danger:hover {
          background: #fef2f2;
        }

        /* Halaman login/daftar mitra */
        .masuk-btn {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-primary-dark);
          padding: 10px 18px;
        }

        .masuk-btn:hover {
          color: var(--color-accent);
        }

        .mobile-menu-toggle {
          display: none;
          color: var(--color-primary-dark);
        }

        /* Menu mobile */
        .mobile-nav-backdrop {
          position: fixed;
          inset: 80px 0 0 0;
          background: rgba(15, 23, 42, 0.32);
          z-index: 999;
        }

        .mobile-nav-menu {
          position: absolute;
          top: 80px;
          left: 0;
          right: 0;
          z-index: 1000;
          max-height: calc(100dvh - 80px);
          overflow-y: auto;
          background: #ffffff;
          border-bottom: 1px solid var(--color-border);
          padding: 12px 24px 20px;
          box-shadow: 0 16px 32px -12px rgba(15, 23, 42, 0.2);
        }

        .mnav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-width: 560px;
          margin: 0 auto;
        }

        .mnav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 14px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: #334155;
          font-size: 15px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
        }

        .mnav-link svg {
          color: #64748b;
          flex-shrink: 0;
        }

        .mnav-link:hover {
          background: #f8fafc;
        }

        .mnav-link.active {
          background: #e0f2fe;
          color: #0369a1;
        }

        .mnav-link.active svg {
          color: #0284c7;
        }

        .mnav-link.danger,
        .mnav-link.danger svg {
          color: #dc2626;
        }

        .mnav-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 8px 4px;
        }

        .mnav-lang {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 14px;
          font-size: 15px;
          font-weight: 600;
          color: #334155;
        }

        .mobile-nav-links {
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

        @media (max-width: 1280px) {
          .logo-section { margin-right: 20px; }
          .nav-link { padding: 8px 11px; font-size: 14px; }
        }

        /* Menu traveler pindah ke tombol menu sebelum mulai berdesakan. */
        @media (max-width: 1140px) {
          .site-header--traveler .main-nav,
          .site-header--traveler .traveler-desktop-only {
            display: none !important;
          }
          .site-header--traveler .mobile-menu-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            flex-shrink: 0;
            border: 0;
            border-radius: 12px;
            background: transparent;
            cursor: pointer;
          }
          .site-header--traveler .mobile-menu-toggle:hover {
            background: #f1f5f9;
          }
        }

        @media (max-width: 768px) {
          .main-nav, .header-desktop-only {
            display: none !important;
          }
          .header-user-name {
            display: none;
          }
          .user-chip {
            padding: 3px;
          }
          .header-actions {
            gap: 6px;
          }
          .signin-btn {
            padding: 8px 16px;
          }
          .mobile-nav-backdrop {
            top: 64px;
          }
          .mobile-nav-menu {
            padding: 12px 16px 20px !important;
            max-height: calc(100dvh - 64px);
          }
          .mobile-menu-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            flex-shrink: 0;
            background: transparent;
            border: 0;
            cursor: pointer;
          }
        }
      `}</style>
    </header>
  );
};
