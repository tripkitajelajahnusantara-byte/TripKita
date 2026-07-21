import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from '../components/Sidebar';
import { 
  Search, 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  Eye, 
  Check,
  X,
  FileSpreadsheet
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

export const ManageBookingPage: React.FC = () => {
  const {  } = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Simulation States
  const [packages, setPackages] = useState<any[]>([]);
  const [simulateName, setSimulateName] = useState('Alice');
  const [simulateGuests, setSimulateGuests] = useState(2);
  const [simulatePkgId, setSimulatePkgId] = useState('');
  const [simulateDate, setSimulateDate] = useState('2026-07-15');
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [createdBookingUrl, setCreatedBookingUrl] = useState('');
  const [simulateLoading, setSimulateLoading] = useState(false);

  const loadPackages = async () => {
    try {
      const data = await request('/provider/packages');
      setPackages(data);
      if (data.length > 0) {
        setSimulatePkgId(data[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
    }
  };

  useEffect(() => {
    if (showSimulateModal) {
      loadPackages();
    }
  }, [showSimulateModal]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const statsData = await request('/provider/dashboard/stats');
      setStats(statsData);

      const data = await request('/provider/bookings');
      const mapped = data.map((b: any) => ({
        id: b.bookingCode || `TK-${b.id}`,
        dbId: b.id, // Keep numeric ID for API requests
        customerName: b.customerName,
        customerInitial: b.customerInitial || b.customerName.charAt(0),
        package: b.packageDetails?.name || 'Paket Wisata',
        tripDate: new Date(b.tripDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        guests: b.guests,
        totalPrice: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(b.totalPrice),
        dpAmount: b.dpAmount ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(b.dpAmount) : '—',
        paymentMethod: b.paymentMethod || 'Transfer Bank',
        paymentUrl: b.paymentUrl,
        status: b.status,
      }));
      setBookings(mapped);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      try {
        await request(`/provider/bookings/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'CANCELLED_BY_PROVIDER' }),
        });
        loadData();
      } catch (err: any) {
        alert(err.message || 'Gagal membatalkan booking');
      }
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

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.package.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Semua' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            <button className="submit-form-btn" onClick={() => setShowSimulateModal(true)} style={{ width: 'auto', padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0d9488' }}>
              <CalendarDays size={16} /> Simulasi Booking
            </button>
            <button className="export-csv-btn" onClick={() => alert('Exporting bookings to CSV...')}>
              <FileSpreadsheet size={16} /> Export CSV
            </button>
          </div>
        </header>

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
            <div className="p-icon bg-orange"><Clock size={18} color="#f59e0b" /></div>
            <div>
              <h3 style={{ color: '#f59e0b' }}>{stats ? stats.pendingBookings : '...'}</h3>
              <p>Menunggu Konfirmasi</p>
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
              <option value="PENDING_PAYMENT">Menunggu Pembayaran</option>
              <option value="PAID">Menunggu Konfirmasi</option>
              <option value="CONFIRMED">Dikonfirmasi</option>
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
                  <th>DP</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBookings.map((b) => (
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
                        <span className="dp-amount">{b.dpAmount}</span>
                        <span className="dp-method">{b.paymentMethod}</span>
                      </div>
                    </td>
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
                    <td>
                      <div className="actions-cell">
                        <button className="action-btn" onClick={() => handleAction('detail', b.id)}>
                          <Eye size={14} />
                        </button>
                        {b.status === 'PAID' && b.dbId && (
                          <>
                            <button className="action-btn text-green" title="Konfirmasi Perjalanan" onClick={() => handleAction('approve', b.dbId!)}>
                              <Check size={14} />
                            </button>
                            <button className="action-btn text-red" title="Tolak / Batalkan" onClick={() => handleAction('reject', b.dbId!)}>
                              <X size={14} />
                            </button>
                          </>
                        )}
                        {b.status === 'CONFIRMED' && b.dbId && (
                          <>
                            <button className="action-btn text-green" title="Selesaikan Perjalanan" onClick={() => handleAction('complete', b.dbId!)}>
                              <Check size={14} />
                            </button>
                            <button className="action-btn text-red" title="Batalkan Perjalanan (Refund)" onClick={() => handleAction('reject', b.dbId!)}>
                              <X size={14} />
                            </button>
                          </>
                        )}
                        {b.status === 'PENDING_PAYMENT' && b.paymentUrl && (
                          <a href={b.paymentUrl} target="_blank" rel="noopener noreferrer" className="action-btn" title="Bayar (Simulasi Xendit)" style={{ color: '#0d9488', borderColor: '#0d9488' }}>
                            💳
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                        selectedBooking.status === 'PAID' ? '#dbeafe' :
                        selectedBooking.status === 'CONFIRMED' ? '#d1fae5' :
                        selectedBooking.status === 'COMPLETED' ? '#ecfdf5' :
                        selectedBooking.status === 'REFUND_REQUIRED' ? '#fee2e2' : '#f1f5f9',
                      color:
                        selectedBooking.status === 'PENDING_PAYMENT' ? '#d97706' :
                        selectedBooking.status === 'PAID' ? '#2563eb' :
                        selectedBooking.status === 'CONFIRMED' ? '#059669' :
                        selectedBooking.status === 'COMPLETED' ? '#047857' :
                        selectedBooking.status === 'REFUND_REQUIRED' ? '#dc2626' : '#475569',
                    }}>
                      {selectedBooking.status === 'PENDING_PAYMENT' ? 'Belum Bayar' :
                       selectedBooking.status === 'PAID' ? 'Perlu Konfirmasi' :
                       selectedBooking.status === 'CONFIRMED' ? 'Dikonfirmasi' :
                       selectedBooking.status === 'COMPLETED' ? 'Selesai' :
                       selectedBooking.status === 'CANCELLED_BY_CUSTOMER' ? 'Batal (Cust)' :
                       selectedBooking.status === 'CANCELLED_BY_PROVIDER' ? 'Batal (Mitra)' :
                       selectedBooking.status === 'REFUND_REQUIRED' ? 'Butuh Refund' : 'Refund Selesai'}
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
                      Email: {selectedBooking.customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      WA: +62 812-{selectedBooking.id.replace(/[^0-9]/g, '').substring(0, 4) || '5432'}-{selectedBooking.id.replace(/[^0-9]/g, '').substring(4, 8) || '9876'}
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
                        <span style={{ color: '#64748b' }}>Uang Muka (DP):</span>
                        <span style={{ fontWeight: 600, color: '#00a896' }}>{selectedBooking.dpAmount !== '—' ? selectedBooking.dpAmount : '—'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>Metode:</span>
                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{selectedBooking.paymentMethod || 'Transfer Bank'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Proof of Payment Preview */}
                  <div className="detail-item">
                    <span className="detail-label">Bukti Pembayaran</span>
                    <div className="proof-preview-container" style={{ display: 'block', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '4px' }}>
                      <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>E-RECEIPT TRANSFER</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Pengirim:</span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBooking.customerName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Tujuan:</span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>BCA - TRIPKITA</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Jumlah:</span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>{selectedBooking.dpAmount !== '—' ? selectedBooking.dpAmount : selectedBooking.totalPrice}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Status:</span>
                          <span style={{ fontWeight: 700, color: isCancelled ? '#ef4444' : '#10b981' }}>
                            {isCancelled ? 'BATAL' : 'BERHASIL'}
                          </span>
                        </div>
                      </div>
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
                          <span className="timeline-title">Uang Muka (DP) Diterima Sistem</span>
                          <span className="timeline-time">1 Hari Lalu • BCA Transfer</span>
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

        .dp-amount {
          font-weight: 600;
          color: var(--color-primary-medium);
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

      {/* Simulation Modal */}
      {showSimulateModal && (
        <div className="detail-modal-overlay">
          <div className="detail-modal-card animate-scale-up" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>Simulasikan Customer Booking</h2>
              <button 
                type="button" 
                className="close-modal-btn" 
                onClick={() => { setShowSimulateModal(false); setCreatedBookingUrl(''); }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {createdBookingUrl ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                  <h3 style={{ marginBottom: '12px' }}>Booking Berhasil Dibuat!</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-medium)', marginBottom: '24px' }}>
                    Sistem telah membuat booking baru dengan status <strong>PENDING_PAYMENT</strong>. Silakan selesaikan pembayaran melalui portal simulasi Xendit.
                  </p>
                  <a 
                    href={createdBookingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="submit-form-btn"
                    style={{ display: 'inline-flex', width: 'auto', padding: '12px 24px', textDecoration: 'none', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 600, borderRadius: '8px' }}
                  >
                    Buka Portal Simulasi Xendit
                  </a>
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!simulatePkgId) {
                    alert('Harap pilih paket wisata terlebih dahulu.');
                    return;
                  }
                  setSimulateLoading(true);
                  try {
                    const res = await request('/public/bookings', {
                      method: 'POST',
                      body: JSON.stringify({
                        packageId: parseInt(simulatePkgId),
                        customerName: simulateName,
                        guests: simulateGuests,
                        tripDate: new Date(simulateDate).toISOString()
                      })
                    });
                    setCreatedBookingUrl(res.paymentUrl);
                    loadData();
                  } catch (err: any) {
                    alert(err.message || 'Gagal membuat simulasi booking');
                  } finally {
                    setSimulateLoading(false);
                  }
                }}>
                  <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>Pilih Paket Wisata *</label>
                    <select 
                      value={simulatePkgId} 
                      onChange={(e) => setSimulatePkgId(e.target.value)} 
                      className="filter-select"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', marginTop: '4px' }}
                    >
                      {packages.length === 0 ? (
                        <option value="">Tidak ada paket aktif</option>
                      ) : (
                        packages.map(p => <option key={p.id} value={p.id}>{p.name} (Rp {p.price.toLocaleString('id-ID')})</option>)
                      )}
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>Nama Customer *</label>
                    <input 
                      type="text" 
                      value={simulateName} 
                      onChange={(e) => setSimulateName(e.target.value)} 
                      placeholder="Nama Lengkap" 
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', marginTop: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div className="input-group">
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>Jumlah Peserta *</label>
                      <input 
                        type="number" 
                        value={simulateGuests} 
                        onChange={(e) => setSimulateGuests(parseInt(e.target.value))} 
                        min="1" 
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', marginTop: '4px' }}
                      />
                    </div>
                    <div className="input-group">
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>Tanggal Perjalanan *</label>
                      <input 
                        type="date" 
                        value={simulateDate} 
                        onChange={(e) => setSimulateDate(e.target.value)} 
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', marginTop: '4px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="cancel-btn" 
                      onClick={() => setShowSimulateModal(false)}
                      style={{ border: '1px solid var(--color-border)', backgroundColor: '#ffffff', color: '#334155', fontWeight: 600, padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      className="submit-form-btn" 
                      disabled={simulateLoading}
                      style={{ width: 'auto', padding: '10px 24px', backgroundColor: '#0d9488' }}
                    >
                      {simulateLoading ? 'Memproses...' : 'Buat Booking'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
