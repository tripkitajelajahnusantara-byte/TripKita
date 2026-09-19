import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from '../components/Sidebar';
import { 
  Search, 
  CalendarDays, 
  CheckCircle2, 
  DollarSign, 
  Eye, 
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react';
import type { Booking } from '../types';
import { request } from '../utils/api';
import { ForceMajeureForm } from '../components/ForceMajeureForm';

interface DashboardStats {
  totalPackages: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  rating: number;
  activePackages: number;
}

export const ManageBookingPage: React.FC = () => {
  const { providerProfile } = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Cancel/Reschedule Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<number | null>(null);
  const [cancelActionType, setCancelActionType] = useState<'REFUND' | 'RESCHEDULE' | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, bookingsRes] = await Promise.allSettled([
        request('/provider/dashboard/stats'),
        request('/provider/bookings')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }

      if (bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value)) {
        const mapped = bookingsRes.value.map((b: any) => ({
          id: b.bookingCode || `TK-${b.id}`,
          dbId: b.id, // Keep numeric ID for API requests
          customerName: b.customerName || 'Pelanggan',
          customerInitial: b.customerInitial || (b.customerName ? b.customerName.charAt(0) : 'P'),
          customerEmail: b.customerEmail || '',
          customerPhone: b.customerPhone || '',
          package: b.packageDetails?.name || 'Paket Wisata',
          tripDate: b.tripDate ? new Date(b.tripDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
          guests: b.guests || 1,
          totalPrice: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(b.totalPrice || 0),
          paymentMethod: b.paymentMethod || 'Xendit Invoice',
          createdAt: b.createdAt || '',
          paidAt: b.updatedAt || '',
          paymentUrl: b.paymentUrl,
          rawEndDate: b.tripEndDate,
          status: b.status,
        }));
        setBookings(mapped);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [providerProfile]);

  const handleAction = async (type: string, id: string | number) => {
    if (type === 'approve') {
      try {
        await request(`/provider/bookings/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'CONFIRMED' }),
        });
        loadData();
      } catch (err: any) {
        alert(err.message || 'Gagal menyetujui booking');
      }
    } else if (type === 'reject') {
      setCancelBookingId(id as number);
      setCancelActionType(null);
      setNewRescheduleDate('');
      setShowCancelModal(true);
    } else if (type === 'complete') {
      try {
        await request(`/provider/bookings/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'COMPLETED' }),
        });
        loadData();
      } catch (err: any) {
        alert(err.message || 'Gagal menyelesaikan booking');
      }
    } else if (type === 'detail') {
      const found = bookings.find(b => b.id === id);
      if (found) {
        setSelectedBooking(found);
      }
    } else {
      alert(`Aksi: "${type}" untuk booking ID: ${id} dipicu.`);
    }
  };

  const handleSubmitCancel = async () => {
    if (!cancelBookingId || !cancelActionType) return;
    setCancelLoading(true);
    try {
      if (cancelActionType === 'REFUND') {
        await request(`/provider/bookings/${cancelBookingId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'CANCELLED_BY_PROVIDER' }),
        });
        alert('Booking berhasil dibatalkan dan direfund 100%.');
      } else if (cancelActionType === 'RESCHEDULE') {
        if (!newRescheduleDate) {
          alert('Silakan pilih tanggal reschedule.');
          setCancelLoading(false);
          return;
        }
        await request(`/provider/bookings/${cancelBookingId}/reschedule`, {
          method: 'PUT',
          body: JSON.stringify({ newTripDate: newRescheduleDate }),
        });
        alert('Jadwal booking berhasil diubah (Reschedule).');
      }
      setShowCancelModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat memproses permintaan.');
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.package.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Semua' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    if (!bookings || bookings.length === 0) {
      alert('Belum ada data booking untuk di-export.');
      return;
    }

    const headers = ['Kode Booking', 'Nama Pelanggan', 'Paket Wisata', 'Tanggal Trip', 'Jumlah Peserta', 'Total Harga', 'Status', 'Metode Pembayaran'];
    const rows = bookings.map(b => [
      `"${b.bookingCode || b.id || ''}"`,
      `"${b.customerName || ''}"`,
      `"${b.package || ''}"`,
      `"${b.tripDate || ''}"`,
      `"${b.guests || 1}"`,
      `"${b.totalPrice || 0}"`,
      `"${b.status || ''}"`,
      `"${b.paymentMethod || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Booking_Mitra_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (

    <div className="dashboard-layout animate-fade-in">
      <Sidebar />

      <main className="dashboard-main">
        {/* Header Section */}
        <header className="dashboard-header">
          <div className="header-welcome">
            <h1>Manajemen Booking</h1>
            <p>Monitor dan kelola semua pemesanan</p>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="export-csv-btn" onClick={handleExportCSV}>
              <FileSpreadsheet size={16} /> Export CSV
            </button>
          </div>
        </header>

        {/* Pembatalan keberangkatan karena keadaan kahar; seluruh data dari backend. */}
        <ForceMajeureForm onSubmitted={loadData} />


        {/* Counters Block */}
        <section className="pkg-stats-row">
          <div className="pkg-stat-card">
            <div className="p-icon bg-cyan"><CalendarDays size={18} color="#00a896" /></div>
            <div>
              <h3>{stats ? stats.totalBookings : '...'}</h3>
              <p>Total Booking</p>
            </div>
          </div>
          <div className="pkg-stat-card">
            <div className="p-icon bg-green"><CheckCircle2 size={18} color="#10b981" /></div>
            <div>
              <h3 style={{ color: '#10b981' }}>{stats ? stats.completedBookings : '...'}</h3>
              <p>Selesai</p>
            </div>
          </div>
          <div className="pkg-stat-card">
            <div className="p-icon bg-purple"><DollarSign size={18} color="#8b5cf6" /></div>
            <div>
              <h3 style={{ color: '#8b5cf6', fontSize: '15px' }}>
                {stats ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.totalRevenue) : 'Rp ...'}
              </h3>
              <p>Total Pendapatan</p>
            </div>
          </div>
        </section>

        {/* Filter Toolbar and Table */}
        <div className="pkg-table-container">
          <div className="filters-row-bar">
            <div className="search-field">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Cari ID, nama, atau paket..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-dropdown"
            >
              <option value="Semua">Semua Status</option>
              <option value="CONFIRMED">Lunas & Aktif</option>
              <option value="PENDING_PAYMENT">Menunggu Pembayaran</option>
              <option value="COMPLETED">Selesai</option>
              <option value="CANCELLED_BY_CUSTOMER">Batal (Customer)</option>
              <option value="CANCELLED_BY_PROVIDER">Batal (Mitra)</option>
              <option value="REFUND_REQUIRED">Butuh Refund</option>
              <option value="REFUNDED">Refund Selesai</option>
            </select>

            <span className="results-count">{filteredBookings.length} booking</span>
          </div>

          <div className="table-wrapper">
            <table className="pkg-list-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>PELANGGAN</th>
                  <th>PAKET</th>
                  <th>TGL TRIP</th>
                  <th>PESERTA</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center' }}>AKSI</th>
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
                      <td><span style={{ display: 'inline-block', width: '60px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></span></td>
                      <td><span style={{ display: 'inline-block', width: '90px', height: '22px', backgroundColor: '#e2e8f0', borderRadius: '12px' }}></span></td>
                      <td><span style={{ display: 'inline-block', width: '40px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></span></td>
                    </tr>
                  ))
                ) : paginatedBookings.length > 0 ? (
                  paginatedBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="booking-id-cell">{b.id}</td>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-avatar">{b.customerInitial}</span>
                          <span>{b.customerName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="pkg-name-text">{b.package}</span>
                      </td>
                      <td>{b.tripDate}</td>
                      <td>👥 {b.guests}</td>
                      <td className="price-cell">{b.totalPrice}</td>
                      <td>
                        <div className="dp-cell">
                          <span className="dp-method">{b.paymentMethod}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill`} style={{
                          backgroundColor: 
                            b.status === 'PENDING_PAYMENT' ? '#fef3c7' :
                            (b.status === 'CONFIRMED' || b.status === 'PAID') ? '#dcfce7' :
                            b.status === 'COMPLETED' ? '#ecfdf5' :
                            b.status === 'REFUND_REQUIRED' ? '#fee2e2' : '#f1f5f9',
                          color:
                            b.status === 'PENDING_PAYMENT' ? '#d97706' :
                            (b.status === 'CONFIRMED' || b.status === 'PAID') ? '#15803d' :
                            b.status === 'COMPLETED' ? '#047857' :
                            b.status === 'REFUND_REQUIRED' ? '#dc2626' : '#475569',
                        }}>
                          {b.status === 'PENDING_PAYMENT' ? 'Menunggu Pembayaran' :
                           (b.status === 'CONFIRMED' || b.status === 'PAID') ? 'Lunas & Aktif' :
                           b.status === 'COMPLETED' ? 'Selesai' :
                           b.status === 'CANCELLED_BY_CUSTOMER' ? 'Batal (Cust)' :
                           b.status === 'CANCELLED_BY_PROVIDER' ? 'Batal (Mitra)' :
                           b.status === 'REFUND_REQUIRED' ? 'Butuh Refund' :
                           b.status === 'REFUNDED' ? 'Refund Selesai' : 'Expired / Dibatalkan'}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="action-btn" onClick={() => handleAction('detail', b.id)} title="Lihat Detail Booking">
                            <Eye size={14} />
                          </button>
                          {(b.status === 'CONFIRMED' || b.status === 'PAID') && b.dbId && (
                            <>
                              {b.rawEndDate && new Date() >= new Date(b.rawEndDate) ? (
                                <button className="action-btn text-green" title="Selesaikan Perjalanan" onClick={() => handleAction('complete', b.dbId!)}>
                                  <Check size={14} />
                                </button>
                              ) : (
                                <button className="action-btn text-gray" title="Perjalanan belum selesai" style={{ cursor: 'not-allowed', opacity: 0.5 }}>
                                  <Check size={14} />
                                </button>
                              )}
                            </>
                          )}
                          {(b.status === 'CONFIRMED' || b.status === 'PAID' || b.status === 'PENDING_PAYMENT') && b.dbId && (
                            <button className="action-btn text-red" title="Batalkan Pesanan" onClick={() => handleAction('reject', b.dbId!)}>
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="empty-table-row">
                      Tidak ada booking yang cocok dengan pencarian Anda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-wrapper">
            <span className="page-summary">
              Menampilkan {filteredBookings.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(filteredBookings.length, currentPage * itemsPerPage)} dari {filteredBookings.length} booking
            </span>
            <div className="page-buttons">
              <button 
                type="button"
                className="page-btn" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                &laquo;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  type="button"
                  key={pageNum}
                  className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
              <button 
                type="button"
                className="page-btn" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                &raquo;
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Detail Modal */}
      {selectedBooking && (() => {
        const isCancelled = selectedBooking.status === 'CANCELLED_BY_CUSTOMER' || 
                            selectedBooking.status === 'CANCELLED_BY_PROVIDER' || 
                            selectedBooking.status === 'REFUND_REQUIRED' || 
                            selectedBooking.status === 'REFUNDED';
        const isPending = selectedBooking.status === 'PENDING_PAYMENT' || selectedBooking.status === 'PAID';
        const isCompleted = selectedBooking.status === 'COMPLETED';
        
        return (
          <div className="detail-modal-overlay" onClick={() => setSelectedBooking(null)}>
            <div className="detail-modal-card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
              <div className="modal-header">
                <h2>Detail Booking & Transaksi</h2>
                <button className="close-modal-btn" onClick={() => setSelectedBooking(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                {/* Hero Status Row */}
                <div className="detail-hero" style={{ background: isCancelled ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', border: isCancelled ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(45, 212, 191, 0.2)' }}>
                  <span className="detail-icon">{isCancelled ? '❌' : '✈️'}</span>
                  <div>
                    <h3 style={{ color: isCancelled ? '#ef4444' : '#0f172a' }}>Kode Booking: {selectedBooking.id}</h3>
                    <p className="detail-id" style={{ fontFamily: 'sans-serif' }}>Pemesanan oleh {selectedBooking.customerName}</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span className={`status-pill`} style={{
                      backgroundColor: 
                        selectedBooking.status === 'PENDING_PAYMENT' ? '#fef3c7' :
                        (selectedBooking.status === 'CONFIRMED' || selectedBooking.status === 'PAID') ? '#dcfce7' :
                        selectedBooking.status === 'COMPLETED' ? '#ecfdf5' :
                        (selectedBooking.status === 'CANCELLED_BY_CUSTOMER' || selectedBooking.status === 'CANCELLED_BY_PROVIDER') ? '#fee2e2' : '#f1f5f9',
                      color:
                        selectedBooking.status === 'PENDING_PAYMENT' ? '#d97706' :
                        (selectedBooking.status === 'CONFIRMED' || selectedBooking.status === 'PAID') ? '#15803d' :
                        selectedBooking.status === 'COMPLETED' ? '#047857' :
                        (selectedBooking.status === 'CANCELLED_BY_CUSTOMER' || selectedBooking.status === 'CANCELLED_BY_PROVIDER') ? '#dc2626' : '#475569',
                    }}>
                      {selectedBooking.status === 'PENDING_PAYMENT' ? 'Pending' :
                       (selectedBooking.status === 'CONFIRMED' || selectedBooking.status === 'PAID') ? 'Lunas' :
                       selectedBooking.status === 'COMPLETED' ? 'Selesai' :
                       (selectedBooking.status === 'CANCELLED_BY_CUSTOMER' || selectedBooking.status === 'CANCELLED_BY_PROVIDER') ? 'Batal' :
                       (selectedBooking.status === 'REFUND_REQUIRED' || selectedBooking.status === 'REFUNDED') ? 'Refund' : 'Lainnya'}
                    </span>
                  </div>
                </div>

                {/* Detail Info Grid */}
                <div className="detail-grid">
                  {/* Customer Data */}
                  <div className="detail-item">
                    <span className="detail-label">Pelanggan</span>
                    <span className="detail-value">{selectedBooking.customerName}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Email: {selectedBooking.customerEmail || 'Tidak tersedia'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      WA: {selectedBooking.customerPhone || 'Tidak tersedia'}
                    </span>
                  </div>

                  {/* Package Info */}
                  <div className="detail-item">
                    <span className="detail-label">Paket Wisata</span>
                    <span className="detail-value text-teal">{selectedBooking.package}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Tanggal: {selectedBooking.tripDate}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Peserta: {selectedBooking.guests} Orang
                    </span>
                  </div>

                  {/* Payment Info */}
                  <div className="detail-item">
                    <span className="detail-label">Rincian Pembayaran</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>Total Harga:</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedBooking.totalPrice}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>Metode:</span>
                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{selectedBooking.paymentMethod || 'Transfer Bank'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Pembayaran (data sebenarnya dari payment gateway) */}
                  <div className="detail-item">
                    <span className="detail-label">Status Pembayaran</span>
                    <div className="proof-preview-container" style={{ display: 'block', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Dibayar Pelanggan:</span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>{selectedBooking.totalPrice}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Kanal:</span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBooking.paymentMethod}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Status:</span>
                          <span style={{ fontWeight: 700, color: isCancelled ? '#ef4444' : (isPending ? '#f59e0b' : '#10b981') }}>
                            {isCancelled ? 'BATAL' : (isPending ? 'MENUNGGU PEMBAYARAN' : 'LUNAS')}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: '8px 0 0', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '9px', color: '#64748b', lineHeight: 1.5 }}>
                        Pelanggan membayar penuh di muka melalui payment gateway. Dana diteruskan ke Anda
                        melalui menu Keuangan sesuai jadwal pencairan, bukan melalui transfer langsung.
                      </p>
                    </div>
                  </div>

                  {/* Booking Timeline */}
                  <div className="detail-item full-width">
                    <span className="detail-label" style={{ marginBottom: '8px', display: 'block' }}>Timeline Pemesanan</span>
                    <div className="detail-timeline">
                      <div className="timeline-step">
                        <div className="timeline-dot active"></div>
                        <div className="timeline-content">
                          <span className="timeline-title">Booking Dibuat oleh Pelanggan</span>
                          <span className="timeline-time">1 Hari Lalu</span>
                        </div>
                      </div>
                      <div className="timeline-step">
                        <div className="timeline-dot active"></div>
                        <div className="timeline-content">
                          <span className="timeline-title">Pembayaran Diterima Sistem</span>
                          <span className="timeline-time">{selectedBooking.paymentMethod}</span>
                        </div>
                      </div>
                      {isCancelled ? (
                        <div className="timeline-step">
                          <div className="timeline-dot active" style={{ backgroundColor: '#ef4444' }}></div>
                          <div className="timeline-content">
                            <span className="timeline-title" style={{ color: '#ef4444' }}>Booking Dibatalkan / Ditolak</span>
                            <span className="timeline-time">Hari ini</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="timeline-step">
                            <div className={`timeline-dot ${!isPending ? 'active' : ''}`}></div>
                            <div className="timeline-content">
                              <span className="timeline-title">
                                {isPending ? 'Menunggu Konfirmasi Provider' : 'Booking Dikonfirmasi oleh Provider'}
                              </span>
                              <span className="timeline-time">
                                {isPending ? 'Menunggu tindakan Anda' : 'Hari ini'}
                              </span>
                            </div>
                          </div>
                          <div className="timeline-step">
                            <div className={`timeline-dot ${isCompleted ? 'active' : ''}`}></div>
                            <div className="timeline-content">
                              <span className="timeline-title">Trip Selesai & Selesai</span>
                              <span className="timeline-time">
                                {isCompleted ? 'Selesai' : 'Belum berlangsung'}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        .export-csv-btn {
          border: 1px solid var(--color-border);
          background: #ffffff;
          padding: 10px 18px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .export-csv-btn:hover {
          background-color: var(--color-bg-light);
        }

        .booking-id-cell {
          font-family: monospace;
          font-weight: 600;
          color: var(--color-accent);
        }

        .dp-cell {
          display: flex;
          flex-direction: column;
        }

        .dp-method {
          font-size: 10px;
          color: var(--color-text-light);
        }

        .status-pill.cancelled {
          background-color: #fef2f2;
          color: #ef4444;
        }

        .text-green {
          color: #10b981 !important;
          border-color: #10b981 !important;
        }

        .text-green:hover {
          background-color: #ecfdf5 !important;
        }

        .text-red {
          color: #ef4444 !important;
          border-color: #ef4444 !important;
        }

        .text-red:hover {
          background-color: #fef2f2 !important;
        }
      `}</style>

      {/* Cancel Action Modal */}
      {showCancelModal && (
        <div className="detail-modal-overlay">
          <div className="detail-modal-card" style={{ maxWidth: '400px', padding: '24px' }}>
            <div className="modal-header">
              <h2>Tindakan Pembatalan</h2>
              <button className="close-modal" onClick={() => setShowCancelModal(false)}>✕</button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Pilih jenis pembatalan untuk pesanan ini. Anda dapat mengembalikan dana 100% atau menawarkan perubahan tanggal (reschedule).</p>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button 
                  type="button" 
                  onClick={() => setCancelActionType('REFUND')}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid', borderColor: cancelActionType === 'REFUND' ? '#dc2626' : '#cbd5e1', backgroundColor: cancelActionType === 'REFUND' ? '#fef2f2' : '#ffffff', color: cancelActionType === 'REFUND' ? '#dc2626' : '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Refund 100%
                </button>
                <button 
                  type="button" 
                  onClick={() => setCancelActionType('RESCHEDULE')}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid', borderColor: cancelActionType === 'RESCHEDULE' ? '#0d9488' : '#cbd5e1', backgroundColor: cancelActionType === 'RESCHEDULE' ? '#f0fdfa' : '#ffffff', color: cancelActionType === 'RESCHEDULE' ? '#0d9488' : '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Reschedule
                </button>
              </div>

              {cancelActionType === 'RESCHEDULE' && (
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Pilih Tanggal Baru</label>
                  <input 
                    type="date" 
                    value={newRescheduleDate} 
                    onChange={(e) => setNewRescheduleDate(e.target.value)} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', marginTop: '6px' }}
                  />
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Maksimal penjadwalan ulang hanya diperbolehkan 1 kali.</p>
                </div>
              )}

              {cancelActionType === 'REFUND' && (
                <div style={{ padding: '12px', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#c2410c', margin: 0 }}>
                    <strong>Perhatian:</strong> Memilih refund 100% akan membatalkan booking ini secara permanen. Jika pembayaran sudah cair, saldo Anda akan dipotong sebesar nilai transaksi ini.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setShowCancelModal(false)}
                style={{ border: '1px solid var(--color-border)', backgroundColor: '#ffffff', color: '#334155', fontWeight: 600, padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Kembali
              </button>
              <button 
                type="button" 
                onClick={handleSubmitCancel}
                disabled={cancelLoading || !cancelActionType}
                style={{ width: 'auto', padding: '10px 24px', backgroundColor: cancelActionType === 'REFUND' ? '#dc2626' : (cancelActionType === 'RESCHEDULE' ? '#0d9488' : '#94a3b8'), color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: (cancelLoading || !cancelActionType) ? 'not-allowed' : 'pointer' }}
              >
                {cancelLoading ? 'Memproses...' : 'Konfirmasi Tindakan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
