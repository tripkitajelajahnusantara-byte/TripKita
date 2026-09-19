import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ProviderHintTour } from './ProviderHintTour';
import { NotificationCenter } from './NotificationCenter';
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  User,
  Plus,
  LogOut,
  Wallet
} from 'lucide-react';


/**
 * Lencana status akun mitra. Backend menutup seluruh endpoint operasional sampai
 * status APPROVED dan isVerified bernilai true, jadi sidebar harus menampilkan
 * keadaan sebenarnya; sebelumnya lencana ini selalu tertulis "Terverifikasi"
 * sehingga mitra yang masih menunggu persetujuan mengira akunnya sudah aktif.
 */
function verificationBadge(status?: string, isVerified?: boolean) {
  if (status === 'APPROVED' && isVerified) {
    return { label: '✓ Terverifikasi', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
  }
  if (status === 'REJECTED') {
    return { label: '✕ Ditolak', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
  }
  return { label: '⏳ Menunggu Verifikasi', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
}

export const Sidebar: React.FC = () => {
  const { route, navigateTo, logout, providerProfile, setEditingPackageId } = useNavigation();
  const providerName = providerProfile?.businessName || 'Mitra TemenTrip';

  // Selama akun belum disetujui admin, hanya halaman profil yang berguna; menu
  // lain hanya akan menghasilkan 403 dari backend.
  const isOperational = providerProfile?.status === 'APPROVED' && providerProfile?.isVerified === true;
  const badge = verificationBadge(providerProfile?.status, providerProfile?.isVerified);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'kelola-paket', label: 'Kelola Paket', icon: <Package size={18} /> },
    { id: 'booking', label: 'Booking', icon: <CalendarDays size={18} /> },
    { id: 'keuangan-provider', label: 'Keuangan & Saldo', icon: <Wallet size={18} /> },
    { id: 'profil-provider', label: 'Profil Provider', icon: <User size={18} /> },
  ] as const;

  const lockedHint = 'Menu ini terbuka setelah akun Anda disetujui admin.';

  return (
    <aside className="dashboard-sidebar">
      <div>
        <div className="sidebar-brand" onClick={() => navigateTo('beranda')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/tementrip_official_logo.png" alt="TemenTrip" style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
          <span className="logo-subtext" style={{ fontSize: '12px', color: '#00c9a7', fontWeight: 700, backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '10px' }}>Partner Hub</span>
        </div>

        <div className="provider-profile-card">
          <div className="profile-avatar">{providerName.substring(0, 2).toUpperCase()}</div>
          <div className="profile-info" style={{ minWidth: 0, flex: 1 }}>
            <h4 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={providerName}>
              {providerName}
            </h4>
            <span
              className="status-badge-verified"
              style={{ background: badge.background, color: badge.color, whiteSpace: 'nowrap', display: 'inline-block' }}
            >
              {badge.label}
            </span>
          </div>
          <NotificationCenter variant="dark" align="left" />
        </div>

        {/* Top Right Floating Hint / Guided Tour Trigger */}
        <div style={{ position: 'fixed', top: '22px', right: '28px', zIndex: 9999 }}>
          <ProviderHintTour />
        </div>


        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const locked = !isOperational && item.id !== 'profil-provider';
            return (
              <button
                key={item.id}
                id={`tour-step-${item.id}`}
                className={`menu-btn ${route === item.id ? 'active' : ''}`}
                onClick={() => !locked && navigateTo(item.id)}
                disabled={locked}
                title={locked ? lockedHint : undefined}
                style={locked ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              >
                {item.icon} {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button
          id="tour-step-tambah-paket"
          className="add-package-btn"
          onClick={() => { setEditingPackageId(null); navigateTo('tambah-paket'); }}
          disabled={!isOperational}
          title={!isOperational ? lockedHint : undefined}
          style={!isOperational ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
        >
          <Plus size={16} /> Tambah Paket
        </button>
        <button className="sidebar-logout-btn" onClick={logout}>
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </aside>
  );
};
