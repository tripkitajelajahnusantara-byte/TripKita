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
            <svg width="30" height="30" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="12" fill="url(#cute-tementrip-sb-grad)"/>
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
                <linearGradient id="cute-tementrip-sb-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0284C7"/>
                  <stop offset="0.55" stopColor="#00C9A7"/>
                  <stop offset="1" stopColor="#FF6B81"/>
                </linearGradient>
              </defs>
            </svg>
          </span>
          <div>
            <span className="logo-text" style={{ color: '#0284c7', fontWeight: 800 }}>Temen<span style={{ color: '#00c9a7' }}>Trip</span><span style={{ color: '#ff6b81', fontSize: '14px' }}>✨</span></span>
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
