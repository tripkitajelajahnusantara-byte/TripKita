import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from '../components/Sidebar';
import { Package, CalendarDays, Search, CheckCircle, TrendingUp, Star, ChevronRight, ArrowUpRight } from 'lucide-react';
import type { Booking } from '../types';
import { NotificationCenter } from '../components/NotificationCenter';
import { getTripImage } from '../utils/tripImages';
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
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [popularPackages, setPopularPackages] = useState<any[]>([]);

  const providerName = providerProfile?.businessName || 'Mitra';
  const [loadError, setLoadError] = useState('');

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
        if ([statsRes, bookingsRes, packagesRes].some(result => result.status === 'rejected')) {
          setLoadError('Sebagian data dashboard gagal dimuat. Silakan muat ulang halaman.');
        }

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
              rating: pkg.rating || 0,
              bookings: pkg.quotaUsed || 0,
              img: getTripImage(pkg.id, pkg.name, pkg.category, pkg.images || pkg.image),
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
            
            <NotificationCenter />

            <div className="user-profile-circle">{providerName.substring(0, 2).toUpperCase()}</div>
          </div>
        </header>

        {loadError && <p role="alert">{loadError}</p>}

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
                              b.status === 'WAITING_CONFIRMATION' ? '#e0f2fe' :
                              (b.status === 'CONFIRMED' || b.status === 'PAID') ? '#dcfce7' :
                              b.status === 'COMPLETED' ? '#ecfdf5' : '#f1f5f9',
                            color:
                              b.status === 'PENDING_PAYMENT' ? '#d97706' :
                              b.status === 'WAITING_CONFIRMATION' ? '#0284c7' :
                              (b.status === 'CONFIRMED' || b.status === 'PAID') ? '#15803d' :
                              b.status === 'COMPLETED' ? '#047857' : '#475569',
                          }}>
                            {b.status === 'PENDING_PAYMENT' ? 'Menunggu Pembayaran' :
                             b.status === 'WAITING_CONFIRMATION' ? 'Menunggu Konfirmasi' :
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
