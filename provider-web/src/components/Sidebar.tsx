import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ProviderHintTour } from './ProviderHintTour';
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
        <div className="sidebar-brand" onClick={() => navigateTo('beranda')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/tementrip_official_logo.jpg" alt="TemenTrip" style={{ height: '36px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
          <span className="logo-subtext" style={{ fontSize: '12px', color: '#00c9a7', fontWeight: 700, backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '10px' }}>Partner Hub</span>
        </div>

        <div className="provider-profile-card">
          <div className="profile-avatar">{providerName.substring(0, 2).toUpperCase()}</div>
          <div className="profile-info">
            <h4>{providerName}</h4>
            <span className="status-badge-verified">✓ Terverifikasi</span>
          </div>
        </div>

        {/* Top Right Floating Hint / Guided Tour Trigger */}
        <div style={{ position: 'fixed', top: '22px', right: '28px', zIndex: 9999 }}>
          <ProviderHintTour />
        </div>


        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              id={`tour-step-${item.id}`}
              className={`menu-btn ${route === item.id ? 'active' : ''}`}
              onClick={() => navigateTo(item.id)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button id="tour-step-tambah-paket" className="add-package-btn" onClick={() => { setEditingPackageId(null); navigateTo('tambah-paket'); }}>
          <Plus size={16} /> Tambah Paket
        </button>
        <button className="sidebar-logout-btn" onClick={logout}>
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </aside>
  );
};
