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
  CalendarX2,
  FileSpreadsheet,
  LoaderCircle
} from 'lucide-react';
import type { Booking, BookingParticipant } from '../types';
import { request } from '../utils/api';
import { BookingPickupSummary } from '../components/TripPickup';
import { SkeletonTableRows } from '../components/Skeleton';
import { TripChangeModal } from '../components/TripChangeModal';
import { useCustomAlert } from '../components/CustomAlertModal';
import { jakartaToday } from '../utils/tripDates';
import { useActionLock } from '../utils/useActionLock';

// Format tanggal lahir peserta (YYYY-MM-DD) beserta umur saat ini
const formatParticipantBirth = (birthDate?: string) => {
  if (!birthDate) return '-';
  const iso = birthDate.slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return birthDate;
  const birth = new Date(y, m - 1, d);
  if (isNaN(birth.getTime())) return birthDate;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() < m - 1 || (now.getMonth() === m - 1 && now.getDate() < d)) age--;
  const label = birth.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${label} (${Math.max(age, 0)} Tahun)`;
};

const isSettledPayment = (status: string, paidAt?: string) =>
  Boolean(paidAt) || ['PAID', 'CONFIRMED', 'COMPLETED', 'REFUND_REQUIRED', 'REFUNDED'].includes(status);

const getBookingStatusMeta = (status: string) => {
  switch (status) {
    case 'PENDING_PAYMENT':
      return { label: 'Menunggu Pembayaran', shortLabel: 'Pending', background: '#fef3c7', color: '#b45309' };
    case 'PAID':
    case 'CONFIRMED':
      return { label: 'Lunas & Aktif', shortLabel: 'Lunas', background: '#dcfce7', color: '#15803d' };
    case 'COMPLETED':
      return { label: 'Selesai', shortLabel: 'Selesai', background: '#ecfdf5', color: '#047857' };
    case 'FAILED':
      return { label: 'Pembayaran Gagal', shortLabel: 'Gagal', background: '#fee2e2', color: '#dc2626' };
    case 'EXPIRED':
      return { label: 'Pembayaran Kadaluwarsa', shortLabel: 'Kadaluwarsa', background: '#fff7ed', color: '#c2410c' };
    case 'CANCELLED_BY_CUSTOMER':
      return { label: 'Batal (Customer)', shortLabel: 'Batal', background: '#fee2e2', color: '#dc2626' };
    case 'CANCELLED_BY_PROVIDER':
      return { label: 'Batal (Mitra)', shortLabel: 'Batal', background: '#fee2e2', color: '#dc2626' };
    case 'REFUND_REQUIRED':
      return { label: 'Butuh Refund', shortLabel: 'Proses Refund', background: '#ffedd5', color: '#c2410c' };
    case 'REFUNDED':
      return { label: 'Refund Selesai', shortLabel: 'Refund', background: '#e0f2fe', color: '#0369a1' };
    case 'RESCHEDULE_OFFERED':
      return { label: 'Menunggu Jawaban Reschedule', shortLabel: 'Reschedule', background: '#ede9fe', color: '#6d28d9' };
    default:
      return { label: 'Status Tidak Dikenal', shortLabel: 'Tidak Dikenal', background: '#f1f5f9', color: '#475569' };
  }
};

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
  const { showAlert } = useCustomAlert();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Pesanan yang sedang dibuka di dialog "Ubah atau batalkan trip".
  const [changeBookingId, setChangeBookingId] = useState<number | null>(null);
  // Satu kunci untuk semua aksi yang mengubah status booking agar klik ganda
  // atau dua aksi berbeda tidak terkirim bersamaan.
  const { pending, isBusy, run } = useActionLock();
  const changeBooking = bookings.find(b => b.dbId === changeBookingId);

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
          paymentMethod: b.paymentMethod || 'Transfer Bank Manual',
          createdAt: b.createdAt || '',
          paidAt: b.paidAt || '',
          paymentUrl: b.paymentUrl,
          rawEndDate: b.tripEndDate,
          rawTripDate: b.tripDate,
          packageId: b.packageId || b.packageDetails?.id,
          tripType: b.packageDetails?.tripType || '',
          rescheduleCount: b.rescheduleCount || 0,
          rescheduleDate: b.rescheduleDate || '',
          rescheduleResponseDeadline: b.rescheduleResponseDeadline || '',
          cancellationReason: b.cancellationReason || '',
          pickupMode: b.pickupMode,
          pickupInstructions: b.pickupInstructions,
          participants: Array.isArray(b.participants)
            ? [...b.participants].sort((x: BookingParticipant, y: BookingParticipant) => (x.position || 0) - (y.position || 0))
            : [],
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
    if (type === 'change') {
      if (isBusy) return;
      setChangeBookingId(id as number);
    } else if (type === 'complete') {
      if (isBusy) return;
      // Menyelesaikan trip tidak dapat dibatalkan dan melepas dana pelunasan,
      // sehingga provider wajib mengonfirmasi terlebih dahulu.
      if (!window.confirm('Tandai perjalanan ini sebagai selesai? Status tidak dapat dikembalikan.')) return;
      await run(`complete-${id}`, async () => {
        try {
          await request(`/provider/bookings/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'COMPLETED' }),
          });
          await loadData();
        } catch (err: any) {
          alert(err.message || 'Gagal menyelesaikan booking');
        }
      });
    } else if (type === 'detail') {
      const found = bookings.find(b => b.id === id);
      if (found) {
        setSelectedBooking(found);
      }
    } else {
      alert(`Aksi: "${type}" untuk booking ID: ${id} dipicu.`);
    }
  };

  // Open Trip berangkat bersama: tawaran jadwal pengganti berlaku untuk semua
  // pesanan aktif pada paket dan tanggal yang sama.
  const departureBookingCount = (target: Booking) => {
    if (!target.packageId || !target.rawTripDate) return 1;
    const day = jakartaToday(new Date(target.rawTripDate));
    return bookings.filter(b => b.packageId === target.packageId && b.rawTripDate &&
      (b.status === 'PAID' || b.status === 'CONFIRMED') && jakartaToday(new Date(b.rawTripDate)) === day).length || 1;
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
              <option value="FAILED">Pembayaran Gagal</option>
              <option value="EXPIRED">Pembayaran Kadaluwarsa</option>
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
                  <SkeletonTableRows rows={5} columns={8} />
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
                        {(() => {
                          const meta = getBookingStatusMeta(b.status);
                          return (
                            <>
                              <span className="status-pill" style={{ backgroundColor: meta.background, color: meta.color }}>
                                {meta.label}
                              </span>
                              {b.status === 'RESCHEDULE_OFFERED' && b.rescheduleDate && (
                                <small style={{ display: 'block', marginTop: 6, fontSize: 11.5, lineHeight: 1.45, color: '#6d28d9', maxWidth: 180 }}>
                                  Ditawarkan {new Date(b.rescheduleDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                                  {b.rescheduleResponseDeadline && <> · jawab s/d {new Date(b.rescheduleResponseDeadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB</>}
                                </small>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td>
                        <div className="actions-cell" style={{ flexDirection: 'column', alignItems: 'flex-start', minWidth: 165 }}>
                          <button className="action-btn" style={{ width: 'auto', borderRadius: 8, padding: '6px 10px', gap: 6 }} onClick={() => handleAction('detail', b.id)} title="Lihat Detail Booking">
                            <Eye size={14} /> Detail
                          </button>
                          {(b.status === 'CONFIRMED' || b.status === 'PAID') && b.dbId && (() => {
                            const end = b.rawEndDate ? new Date(b.rawEndDate) : null;
                            const canComplete = Boolean(end && Number.isFinite(end.getTime()) && Date.now() >= end.getTime());
                            const hint = canComplete ? 'Tandai perjalanan selesai.' : end && Number.isFinite(end.getTime())
                              ? `Tersedia setelah ${end.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB.`
                              : 'Jadwal selesai belum tersedia. Hubungi admin.';
                            return <div style={{ display: 'grid', gap: 4, maxWidth: 190 }}>
                              <button type="button" className={`action-btn ${canComplete ? 'text-green' : 'text-gray'}`}
                                title={hint} aria-describedby={`complete-${b.dbId}-hint`}
                                onClick={() => handleAction('complete', b.dbId!)} disabled={!canComplete || isBusy}
                                aria-busy={pending === `complete-${b.dbId}`}
                                style={{ width: 'auto', height: 'auto', borderRadius: 8, padding: '8px 10px', gap: 6, fontSize: 12, cursor: !canComplete || isBusy ? 'not-allowed' : 'pointer', opacity: !canComplete || isBusy ? 0.6 : 1 }}>
                                {pending === `complete-${b.dbId}` ? <LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> : <Check size={14} />}
                                Selesaikan Perjalanan
                              </button>
                              {!canComplete && <small id={`complete-${b.dbId}-hint`} style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{hint}</small>}
                            </div>;
                          })()}
                          {(b.status === 'CONFIRMED' || b.status === 'PAID' || b.status === 'RESCHEDULE_OFFERED') && b.dbId && (
                            <button
                              className="action-btn text-red"
                              title="Jadwalkan ulang atau batalkan trip"
                              aria-label={`Ubah jadwal atau batalkan pesanan ${b.id}`}
                              onClick={() => handleAction('change', b.dbId!)}
                              disabled={isBusy}
                              style={{ width: 'auto', borderRadius: 8, padding: '6px 10px', gap: 6, cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.5 : 1 }}
                            >
                              <CalendarX2 size={14} /> Ubah / Batalkan
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
        const isPending = selectedBooking.status === 'PENDING_PAYMENT';
        const isFailed = selectedBooking.status === 'FAILED';
        const isExpired = selectedBooking.status === 'EXPIRED';
        const paymentSettled = isSettledPayment(selectedBooking.status, selectedBooking.paidAt);
        const statusMeta = getBookingStatusMeta(selectedBooking.status);
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
                    <span className="status-pill" style={{ backgroundColor: statusMeta.background, color: statusMeta.color }}>
                      {statusMeta.shortLabel}
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

                  {/* Status pembayaran yang sudah lolos verifikasi admin */}
                  <div className="detail-item">
                    <span className="detail-label">Status Pembayaran</span>
                    <div className="proof-preview-container" style={{ display: 'block', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Dibayar Pelanggan:</span>
                          <span style={{ fontWeight: 700, color: paymentSettled ? '#10b981' : '#64748b' }}>
                            {paymentSettled ? selectedBooking.totalPrice : 'Rp0'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Kanal:</span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBooking.paymentMethod}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Status:</span>
                          <span style={{ fontWeight: 700, color: statusMeta.color }}>
                            {isFailed ? 'GAGAL' : isExpired ? 'KADALUWARSA' : isPending ? 'MENUNGGU PEMBAYARAN' : paymentSettled ? 'LUNAS' : isCancelled ? 'BATAL' : statusMeta.shortLabel.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: '8px 0 0', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '9px', color: '#64748b', lineHeight: 1.5 }}>
                        {paymentSettled
                          ? 'Pembayaran telah diverifikasi admin TemenTrip. Dana diteruskan melalui menu Keuangan sesuai jadwal pencairan.'
                          : isFailed
                            ? 'Pembayaran tidak berhasil diverifikasi. Tidak ada dana pelanggan yang dicatat sebagai lunas.'
                            : isExpired
                              ? 'Batas waktu tagihan telah habis dan tidak ada pembayaran yang tercatat.'
                              : 'Pembayaran belum terverifikasi. Booking baru dapat diproses setelah disetujui admin TemenTrip.'}
                      </p>
                    </div>
                  </div>

                  {/* Data Peserta Trip */}
                  <div className="detail-item full-width">
                    <span className="detail-label" style={{ marginBottom: '8px', display: 'block' }}>
                      Data Peserta ({selectedBooking.participants?.length || 0}/{selectedBooking.guests} Orang)
                    </span>
                    {selectedBooking.participants && selectedBooking.participants.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedBooking.participants.map((p) => {
                          const medical = (p.medicalNotes || '').trim();
                          return (
                            <div key={p.id ?? p.position} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', backgroundColor: '#f8fafc' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                  {p.position}. {p.name || '-'}
                                </span>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>{p.gender || '-'}</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '4px 12px', fontSize: '12px', color: '#475569' }}>
                                <span>HP: <strong style={{ color: '#1e293b', fontWeight: 600 }}>{p.phone || '-'}</strong></span>
                                <span>Lahir: <strong style={{ color: '#1e293b', fontWeight: 600 }}>{formatParticipantBirth(p.birthDate)}</strong></span>
                              </div>
                              <div style={{
                                marginTop: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: medical ? '#dc2626' : '#64748b',
                                backgroundColor: medical ? '#fef2f2' : 'transparent',
                                border: medical ? '1px solid #fecaca' : 'none',
                                borderRadius: '6px',
                                padding: medical ? '4px 8px' : 0
                              }}>
                                Riwayat Penyakit & Alergi: {medical || 'Tidak ada'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                        Data peserta tidak tersedia (pesanan lama)
                      </span>
                    )}
                  </div>

                  <div className="detail-item full-width"><BookingPickupSummary mode={selectedBooking.pickupMode} instructions={selectedBooking.pickupInstructions} participants={selectedBooking.participants} /></div>
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

      {changeBooking && (
        <TripChangeModal
          booking={changeBooking}
          departureBookingCount={departureBookingCount(changeBooking)}
          onClose={() => setChangeBookingId(null)}
          onCompleted={(title, message) => {
            setChangeBookingId(null);
            showAlert({ type: 'success', title, message });
            void loadData();
          }}
        />
      )}
    </div>
  );
};
