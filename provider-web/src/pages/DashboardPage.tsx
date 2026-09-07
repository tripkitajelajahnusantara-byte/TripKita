import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from '../components/Sidebar';
import { 
  Package, 
  CalendarDays, 
  Search, 
  Bell,
  CheckCircle,
  TrendingUp,
  Star,
  ChevronRight,
  ArrowUpRight,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import type { Booking } from '../types';
import { request } from '../utils/api';

interface DashboardStats {
  totalPackages: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  rating: number;
  activePackages: number;
}

interface NotificationItem {
  id: string;
  type: 'ORDER_IN' | 'PAYOUT_SUCCESS' | 'PAYOUT_REJECTED';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const DashboardPage: React.FC = () => {
  const { providerProfile, navigateTo } = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [popularPackages, setPopularPackages] = useState<any[]>([]);

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      type: 'ORDER_IN',
      title: 'Pesanan Baru Masuk',
      message: 'Booking TK-20260906-7891 dari Antonius (Yogyakarta City Tour). Status: Lunas & Aktif.',
      time: '5 menit yang lalu',
      read: false,
    },
    {
      id: 'n2',
      type: 'PAYOUT_SUCCESS',
      title: 'Pencairan Berhasil',
      message: 'Pengajuan pencairan saldo sebesar Rp 1.500.000 telah berhasil ditransfer ke rekening BCA ***8821 Anda.',
      time: '1 jam yang lalu',
      read: false,
    },
    {
      id: 'n3',
      type: 'PAYOUT_REJECTED',
      title: 'Pencairan Ditolak',
      message: 'Pengajuan pencairan saldo Rp 500.000 ditolak. Alasan: Nama pemilik rekening tidak cocok dengan dokumen identitas provider.',
      time: 'Kemarin',
      read: false,
    },
  ]);

  const providerName = providerProfile?.businessName || 'Wisata Nusantara';
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [statsRes, bookingsRes, packagesRes] = await Promise.allSettled([
          request('/provider/dashboard/stats'),
          request('/provider/bookings'),
          request('/provider/packages')
        ]);

        if (!isMounted) return;

        if (statsRes.status === 'fulfilled' && statsRes.value) {
          setStats(statsRes.value);
        }

        if (bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value)) {
          const mappedBookings = bookingsRes.value.map((b: any) => ({
            id: b.bookingCode || `TK-${b.id}`,
            customerName: b.customerName || 'Pelanggan',
            customerInitial: b.customerInitial || (b.customerName ? b.customerName.charAt(0) : 'P'),
            package: b.packageDetails?.name || 'Paket Wisata',
            tripDate: b.tripDate ? new Date(b.tripDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
            guests: b.guests || 1,
            totalPrice: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(b.totalPrice || 0),
            status: b.status,
          }));
          setBookings(mappedBookings);
        }

        if (packagesRes.status === 'fulfilled' && Array.isArray(packagesRes.value)) {
          const sortedPackages = packagesRes.value
            .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 3)
            .map((pkg: any) => ({
              name: pkg.name,
              location: pkg.destination ? (pkg.destination.split(',').pop()?.trim() || pkg.destination) : 'Indonesia',
              rating: pkg.rating || 5.0,
              bookings: pkg.quotaUsed || 0,
              img: (pkg.name || '').toLowerCase().includes('bromo')
                ? 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=80&q=80'
                : (pkg.name || '').toLowerCase().includes('baduy')
                ? 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=80&q=80'
                : (pkg.name || '').toLowerCase().includes('bandung')
                ? 'https://images.unsplash.com/photo-1584810359583-96fc3448beaa?auto=format&fit=crop&w=80&q=80'
                : 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=80&q=80',
            }));
          setPopularPackages(sortedPackages);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDashboardData();
    return () => { isMounted = false; };
  }, [providerProfile]);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.package.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Semua' || 
      (statusFilter === 'CONFIRMED' && (b.status === 'CONFIRMED' || b.status === 'PAID')) ||
      b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard-layout animate-fade-in">
      <Sidebar />

      {/* Main Content Pane */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header" style={{ position: 'relative' }}>
          <div className="header-welcome">
            <h1>Dashboard</h1>
            <p>Selamat pagi, {providerName}! 👋</p>
          </div>
          <div className="header-actions">
            <div className="search-bar">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Cari paket, booking..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Notification Bell with Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                className="notification-btn" 
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifikasi"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '48px',
                    right: '0',
                    width: '360px',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
                    border: '1px solid #e2e8f0',
                    zIndex: 100,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.2s ease-out'
                  }}
                >
                  <div style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bell size={16} color="#0284c7" />
                      <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Notifikasi Mitra</span>
                      {unreadCount > 0 && (
                        <span style={{ backgroundColor: '#0284c7', color: '#ffffff', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                          {unreadCount} baru
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllRead} 
                          style={{ border: 'none', background: 'none', color: '#0284c7', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Tandai Dibaca
                        </button>
                      )}
                      <button 
                        onClick={() => setShowNotifications(false)} 
                        style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        onClick={() => setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item))}
                        style={{
                          padding: '14px 18px',
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: n.read ? '#ffffff' : '#f0f9ff',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <div style={{
                          padding: '8px',
                          borderRadius: '10px',
                          backgroundColor: n.type === 'ORDER_IN' ? '#e0f2fe' : n.type === 'PAYOUT_SUCCESS' ? '#dcfce7' : '#fee2e2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {n.type === 'ORDER_IN' && <ShoppingBag size={16} color="#0284c7" />}
                          {n.type === 'PAYOUT_SUCCESS' && <CheckCircle2 size={16} color="#16a34a" />}
                          {n.type === 'PAYOUT_REJECTED' && <XCircle size={16} color="#dc2626" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: n.type === 'ORDER_IN' ? '#0369a1' : n.type === 'PAYOUT_SUCCESS' ? '#15803d' : '#b91c1c' }}>
                              {n.title}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{n.time}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.4' }}>
                            {n.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '10px', textAlign: 'center', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>Hanya menampilkan notifikasi terbaru Mitra</span>
                  </div>
                </div>
              )}
            </div>

            <div className="user-profile-circle">{providerName.substring(0, 2).toUpperCase()}</div>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="stats-cards-grid">
          <div className="stat-card">
            <div className="card-top">
              <div className="stat-icon-bg bg-cyan">
                <Package size={20} color="#00a896" />
              </div>
              <span className="trend-up">Aktif</span>
            </div>
            <div className="card-bottom">
              <h3>{stats ? stats.totalPackages : '...'}</h3>
              <p>Total Paket</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-top">
              <div className="stat-icon-bg bg-blue">
                <CalendarDays size={20} color="#3b82f6" />
              </div>
              <span className="trend-up">Semua</span>
            </div>
            <div className="card-bottom">
              <h3>{stats ? stats.totalBookings : '...'}</h3>
              <p>Total Booking</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-top">
              <div className="stat-icon-bg bg-green">
                <CheckCircle size={20} color="#10b981" />
              </div>
              <span className="trend-up">Selesai</span>
            </div>
            <div className="card-bottom">
              <h3>{stats ? stats.completedBookings : '...'}</h3>
              <p>Booking Selesai</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-top">
              <div className="stat-icon-bg bg-purple">
                <TrendingUp size={20} color="#8b5cf6" />
              </div>
              <span className="trend-up">Total</span>
            </div>
            <div className="card-bottom">
              <h3 style={{ fontSize: '15px' }}>
                {stats ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.totalRevenue) : 'Rp ...'}
              </h3>
              <p>Total Pendapatan (Kotor)</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-top">
              <div className="stat-icon-bg bg-yellow">
                <Star size={20} color="#eab308" />
              </div>
              <span className="trend-up">Rating</span>
            </div>
            <div className="card-bottom">
              <h3>{stats ? stats.rating.toFixed(2) : '...'}</h3>
              <p>Rating Provider</p>
            </div>
          </div>
        </section>

        {/* Dashboard Split Sections */}
        <div className="dashboard-details-split">
          {/* Recent Bookings Table */}
          <div className="bookings-section-card">
            <div className="card-header-row">
              <h3>Booking Terbaru</h3>
              <div className="table-filter-tabs">
                {[
                  { value: 'Semua', label: 'Semua' },
                  { value: 'CONFIRMED', label: 'Dikonfirmasi / Lunas' },
                  { value: 'PENDING_PAYMENT', label: 'Menunggu Pembayaran' },
                  { value: 'COMPLETED', label: 'Selesai' }
                ].map((tab) => (
                  <button 
                    key={tab.value} 
                    className={`tab-btn ${statusFilter === tab.value ? 'active' : ''}`}
                    onClick={() => setStatusFilter(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-wrapper">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>ID BOOKING</th>
                    <th>PELANGGAN</th>
                    <th>PAKET</th>
                    <th>TGL TRIP</th>
                    <th>PESERTA</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    [1, 2, 3].map((n) => (
                      <tr key={n} style={{ opacity: 0.6 }}>
                        <td><span style={{ display: 'inline-block', width: '80px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></span></td>
                        <td>
                          <div className="customer-cell">
                            <span className="customer-avatar" style={{ backgroundColor: '#cbd5e1' }}>...</span>
                            <span style={{ display: 'inline-block', width: '90px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></span>
                          </div>
                        </td>
                        <td><span style={{ display: 'inline-block', width: '120px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></span></td>
                        <td><span style={{ display: 'inline-block', width: '70px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></span></td>
                        <td><span style={{ display: 'inline-block', width: '30px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></span></td>
                        <td><span style={{ display: 'inline-block', width: '80px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></span></td>
                        <td><span style={{ display: 'inline-block', width: '90px', height: '22px', backgroundColor: '#e2e8f0', borderRadius: '12px' }}></span></td>
                      </tr>
                    ))
                  ) : filteredBookings.length > 0 ? (
                    filteredBookings.map((b) => (
                      <tr key={b.id}>
                        <td className="booking-id-cell">{b.id}</td>
                        <td>
                          <div className="customer-cell">
                            <span className="customer-avatar">{b.customerInitial}</span>
                            <span>{b.customerName}</span>
                          </div>
                        </td>
                        <td className="package-cell">{b.package}</td>
                        <td>{b.tripDate}</td>
                        <td>👥 {b.guests}</td>
                        <td className="price-cell">{b.totalPrice}</td>
                        <td>
                          <span className={`status-pill`} style={{
                            backgroundColor: 
                              b.status === 'PENDING_PAYMENT' ? '#fef3c7' :
                              (b.status === 'CONFIRMED' || b.status === 'PAID') ? '#dcfce7' :
                              b.status === 'COMPLETED' ? '#ecfdf5' : '#f1f5f9',
                            color:
                              b.status === 'PENDING_PAYMENT' ? '#d97706' :
                              (b.status === 'CONFIRMED' || b.status === 'PAID') ? '#15803d' :
                              b.status === 'COMPLETED' ? '#047857' : '#475569',
                          }}>
                            {b.status === 'PENDING_PAYMENT' ? 'Menunggu Pembayaran' :
                             (b.status === 'CONFIRMED' || b.status === 'PAID') ? 'Lunas & Aktif' :
                             b.status === 'COMPLETED' ? 'Selesai' : 'Expired / Dibatalkan'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="empty-table-row">
                        Tidak ada booking yang cocok dengan pencarian Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel Cards */}
          <div className="dashboard-right-panel">
            {/* Quick Actions */}
            <div className="quick-actions-card">
              <h3>Aksi Cepat</h3>
              <div className="action-links-list">
                <div className="action-item" onClick={() => navigateTo('tambah-paket')}>
                  <span>Tambah Paket Baru</span>
                  <ChevronRight size={16} />
                </div>
                <div className="action-item" onClick={() => navigateTo('booking')}>
                  <span>Lihat Semua Booking</span>
                  <ChevronRight size={16} />
                </div>
                <div className="action-item" onClick={() => navigateTo('kelola-paket')}>
                  <span>Kelola Paket</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>

            {/* Popular Packages */}
            <div className="popular-packages-card">
              <h3>Paket Terpopuler</h3>
              <div className="packages-list">
                {popularPackages.map((p, i) => (
                  <div key={i} className="popular-package-item">
                    <img src={p.img} alt={p.name} />
                    <div className="pack-details">
                      <h4>{p.name}</h4>
                      <p>{p.location} • ⭐ {p.rating}</p>
                    </div>
                    <span className="pack-bookings">{p.bookings} booking</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Summary Card */}
            <div className="revenue-summary-card">
              <div className="rev-header">
                <h3>Ringkasan Pendapatan</h3>
                <ArrowUpRight size={18} color="#00a896" />
              </div>
              <div className="rev-body">
                <div className="rev-row">
                  <div>
                    <span className="rev-label">Total Pendapatan</span>
                    <span className="rev-amount">
                      {stats ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.totalRevenue) : 'Rp 0'}
                    </span>
                  </div>
                  <span className="rev-trend positive">+100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
