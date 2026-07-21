import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  LayoutDashboard, 
  Package, 
  CalendarDays, 
  User, 
  Plus, 
  LogOut 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { route, navigateTo, logout, providerProfile, setEditingPackageId } = useNavigation();
  const providerName = providerProfile?.businessName || 'Wisata Nusantara';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'kelola-paket', label: 'Kelola Paket', icon: <Package size={18} /> },
    { id: 'booking', label: 'Booking', icon: <CalendarDays size={18} /> },
    { id: 'profil-provider', label: 'Profil Provider', icon: <User size={18} /> },
  ] as const;

  return (
    <aside className="dashboard-sidebar">
      <div>
        <div className="sidebar-brand" onClick={() => navigateTo('beranda')} style={{ cursor: 'pointer' }}>
          <span className="logo-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="11" fill="#00a896" />
              <path d="M12 6C9.24 6 7 8.24 7 11c0 3.75 5 7 5 7s5-3.25 5-7c0-2.76-2.24-5-5-5zm0 6.75c-.97 0-1.75-.78-1.75-1.75S11.03 9.25 12 9.25s1.75 0.78 1.75 1.75-0.78 1.75-1.75 1.75z" fill="white" />
            </svg>
          </span>
          <div>
            <span className="logo-text">Trip<span>Kita</span></span>
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
