import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  LayoutDashboard, 
  Package, 
  CalendarDays, 
  User, 
  Plus, 
  LogOut,
  Wallet
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { route, navigateTo, logout, providerProfile, setEditingPackageId } = useNavigation();
  const providerName = providerProfile?.businessName || 'Wisata Nusantara';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'kelola-paket', label: 'Kelola Paket', icon: <Package size={18} /> },
    { id: 'booking', label: 'Booking', icon: <CalendarDays size={18} /> },
    { id: 'keuangan-provider', label: 'Keuangan & Saldo', icon: <Wallet size={18} /> },
    { id: 'profil-provider', label: 'Profil Provider', icon: <User size={18} /> },
  ] as const;

  return (
    <aside className="dashboard-sidebar">
      <div>
        <div className="sidebar-brand" onClick={() => navigateTo('beranda')} style={{ cursor: 'pointer' }}>
          <span className="logo-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="10" fill="url(#tementrip-sb-grad)"/>
              <path d="M16 6C12.134 6 9 9.134 9 13C9 18.25 16 26 16 26C16 26 23 18.25 23 13C23 9.134 19.866 6 16 6ZM16 16.5C14.067 16.5 12.5 14.933 12.5 13C12.5 11.067 14.067 9.5 16 9.5C17.933 9.5 19.5 11.067 19.5 13C19.5 14.933 17.933 16.5 16 16.5Z" fill="white"/>
              <path d="M13.5 13C13.5 14.3807 14.6193 15.5 16 15.5C17.3807 15.5 18.5 14.3807 18.5 13" stroke="#007bff" strokeWidth="1.8" strokeLinecap="round"/>
              <defs>
                <linearGradient id="tementrip-sb-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#007bff"/>
                  <stop offset="1" stopColor="#00a896"/>
                </linearGradient>
              </defs>
            </svg>
          </span>
          <div>
            <span className="logo-text" style={{ color: '#007bff', fontWeight: 800 }}>Temen<span style={{ color: '#00a896' }}>Trip</span></span>
            <span className="logo-subtext">Partner Hub</span>
          </div>
        </div>

        <div className="provider-profile-card">
          <div className="profile-avatar">{providerName.substring(0, 2).toUpperCase()}</div>
          <div className="profile-info">
            <h4>{providerName}</h4>
            <span className="status-badge-verified">✓ Terverifikasi</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`menu-btn ${route === item.id ? 'active' : ''}`}
              onClick={() => navigateTo(item.id)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button className="add-package-btn" onClick={() => { setEditingPackageId(null); navigateTo('tambah-paket'); }}>
          <Plus size={16} /> Tambah Paket
        </button>
        <button className="sidebar-logout-btn" onClick={logout}>
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </aside>
  );
};
