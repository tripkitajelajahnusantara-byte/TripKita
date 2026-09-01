import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from '../components/Sidebar';
import { 
  Package, 
  CalendarDays, 
  Search, 
  Bell,
  Clock,
  CheckCircle,
  TrendingUp,
  Star,
  ChevronRight,
  ArrowUpRight
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

export const DashboardPage: React.FC = () => {
  const { providerProfile, navigateTo } = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [popularPackages, setPopularPackages] = useState<any[]>([]);

  const providerName = providerProfile?.businessName || 'Wisata Nusantara';

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const statsData = await request('/provider/dashboard/stats');
        setStats(statsData);

        const bookingsData = await request('/provider/bookings');
        // Map backend response fields to React types
        const mappedBookings = bookingsData.map((b: any) => ({
          id: b.bookingCode || `TK-${b.id}`,
          customerName: b.customerName,
          customerInitial: b.customerInitial || b.customerName.charAt(0),
          package: b.packageDetails?.name || 'Paket Wisata',
          tripDate: new Date(b.tripDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          guests: b.guests,
          totalPrice: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(b.totalPrice),
          status: b.status,
        }));
        setBookings(mappedBookings);

        const packagesData = await request('/provider/packages');
        const sortedPackages = packagesData
          .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 3)
          .map((pkg: any) => ({
            name: pkg.name,
            location: pkg.destination.split(',').pop()?.trim() || pkg.destination,
            rating: pkg.rating || 5.0,
            bookings: pkg.quotaUsed || 0,
            img: pkg.name.toLowerCase().includes('bromo')
              ? 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=80&q=80'
              : pkg.name.toLowerCase().includes('baduy')
              ? 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=80&q=80'
              : pkg.name.toLowerCase().includes('bandung')
              ? 'https://images.unsplash.com/photo-1584810359583-96fc3448beaa?auto=format&fit=crop&w=80&q=80'
              : 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=80&q=80',
          }));
        setPopularPackages(sortedPackages);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    }
    loadDashboardData();
  }, []);

  const handleAction = (actionName: string) => {
    alert(`Aksi: "${actionName}" berhasil dipicu.`);
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.package.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Semua' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard-layout animate-fade-in">
      <Sidebar />

      {/* Main Content Pane */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
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
            <button className="notification-btn" onClick={() => handleAction('Notifikasi')}>
              <Bell size={18} />
              <span className="bell-badge"></span>
            </button>
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
              <div className="stat-icon-bg bg-orange">
                <Clock size={20} color="#f59e0b" />
              </div>
              <span className="trend-warning">Perlu Tindakan</span>
            </div>
            <div className="card-bottom">
              <h3>{stats ? stats.pendingBookings : '...'}</h3>
              <p>Menunggu Konfirmasi</p>
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
              <p>Total Pendapatan</p>
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
                  { value: 'PAID', label: 'Perlu Konfirmasi' },
                  { value: 'CONFIRMED', label: 'Dikonfirmasi' },
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
                  {filteredBookings.length > 0 ? (
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
                              b.status === 'PAID' ? '#dbeafe' :
                              b.status === 'CONFIRMED' ? '#d1fae5' :
                              b.status === 'COMPLETED' ? '#ecfdf5' :
                              b.status === 'REFUND_REQUIRED' ? '#fee2e2' : '#f1f5f9',
                            color:
                              b.status === 'PENDING_PAYMENT' ? '#d97706' :
                              b.status === 'PAID' ? '#2563eb' :
                              b.status === 'CONFIRMED' ? '#059669' :
                              b.status === 'COMPLETED' ? '#047857' :
                              b.status === 'REFUND_REQUIRED' ? '#dc2626' : '#475569',
                          }}>
                            {b.status === 'PENDING_PAYMENT' ? 'Belum Bayar' :
                             b.status === 'PAID' ? 'Perlu Konfirmasi' :
                             b.status === 'CONFIRMED' ? 'Dikonfirmasi' :
                             b.status === 'COMPLETED' ? 'Selesai' :
                             b.status === 'CANCELLED_BY_CUSTOMER' ? 'Batal (Cust)' :
                             b.status === 'CANCELLED_BY_PROVIDER' ? 'Batal (Mitra)' :
                             b.status === 'REFUND_REQUIRED' ? 'Butuh Refund' : 'Refund Selesai'}
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
