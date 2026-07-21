import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from '../components/Sidebar';
import { 
  Plus, 
  Search, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Package, 
  Edit3, 
  Eye, 
  MoreHorizontal
} from 'lucide-react';
import type { PackageItem } from '../types';
import { request } from '../utils/api';

export const KelolaPaketPage: React.FC = () => {
  const { navigateTo, setEditingPackageId } = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Draft' | 'Nonaktif'>('Semua');

  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const handleClose = () => setActiveMenuId(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  const loadPackages = async () => {
    try {
      const data = await request('/provider/packages');
      const mapped = data.map((pkg: any) => ({
        id: String(pkg.id),
        name: pkg.name,
        destination: pkg.destination,
        price: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(pkg.price),
        quota: `${pkg.quotaUsed}/${pkg.quotaMax}`,
        schedule: pkg.schedule,
        status: pkg.status,
        rating: pkg.rating > 0 ? pkg.rating : undefined,
      }));
      setPackages(mapped);
    } catch (err) {
      console.error('Failed to load packages:', err);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleAction = async (type: string, id: string) => {
    if (type === 'delete') {
      if (confirm('Apakah Anda yakin ingin menghapus paket ini?')) {
        try {
          await request(`/provider/packages/${id}`, { method: 'DELETE' });
          loadPackages();
        } catch (err: any) {
          alert(err.message || 'Gagal menghapus paket');
        }
      }
    } else if (type === 'edit') {
      setEditingPackageId(id);
      navigateTo('tambah-paket');
    } else if (type === 'view') {
      const pkg = packages.find(p => p.id === id);
      if (pkg) {
        setSelectedPackage(pkg);
      }
    } else {
      alert(`Aksi: "${type}" untuk paket ID: ${id} dipicu.`);
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          pkg.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pkg.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Semua' || pkg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPackages.length / itemsPerPage) || 1;
  const paginatedPackages = filteredPackages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="dashboard-layout animate-fade-in">
      <Sidebar />

      <main className="dashboard-main">
        {/* Header Block */}
        <header className="dashboard-header">
          <div className="header-welcome">
            <h1>Kelola Paket</h1>
            <p>Manajemen seluruh paket wisata Anda</p>
          </div>
          <div className="header-actions">
            <button className="add-pkg-top-btn" onClick={() => { setEditingPackageId(null); navigateTo('tambah-paket'); }}>
              <Plus size={16} /> Tambah Paket
            </button>
          </div>
        </header>

        {/* Small stats summary cards */}
        <section className="pkg-stats-row">
          <div className="pkg-stat-card">
            <div className="p-icon bg-cyan"><Package size={18} color="#00a896" /></div>
            <div>
              <h3>{packages.length}</h3>
              <p>Total Paket</p>
            </div>
          </div>
          <div className="pkg-stat-card">
            <div className="p-icon bg-green"><CheckCircle2 size={18} color="#10b981" /></div>
            <div>
              <h3>{packages.filter(p => p.status === 'Aktif').length}</h3>
              <p>Paket Aktif</p>
            </div>
          </div>
          <div className="pkg-stat-card">
            <div className="p-icon bg-orange"><Clock size={18} color="#f59e0b" /></div>
            <div>
              <h3>{packages.filter(p => p.status === 'Draft').length}</h3>
              <p>Draft</p>
            </div>
          </div>
          <div className="pkg-stat-card">
            <div className="p-icon bg-red"><XCircle size={18} color="#ef4444" /></div>
            <div>
              <h3>{packages.filter(p => p.status === 'Nonaktif').length}</h3>
              <p>Nonaktif</p>
            </div>
          </div>
        </section>

        {/* Filters and List */}
        <div className="pkg-table-container">
          <div className="filters-row-bar">
            <div className="search-field">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Cari nama paket atau destinasi..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="status-dropdown"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Draft">Draft</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>

            <span className="results-count">{filteredPackages.length} paket ditemukan</span>
          </div>

          <div className="table-wrapper">
            <table className="pkg-list-table">
              <thead>
                <tr>
                  <th>PAKET WISATA</th>
                  <th>DESTINASI</th>
                  <th>HARGA</th>
                  <th>KUOTA</th>
                  <th>JADWAL</th>
                  <th>STATUS</th>
                  <th>RATING</th>
                  <th style={{ textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPackages.map((pkg) => {
                  const [currentQuota, maxQuota] = pkg.quota.split('/').map(Number);
                  const quotaPercent = maxQuota > 0 ? (currentQuota / maxQuota) * 100 : 0;

                  return (
                    <tr key={pkg.id}>
                      <td>
                        <div className="pkg-item-cell">
                          <div className="pkg-thumb">⛰️</div>
                          <div>
                            <span className="pkg-name-text">{pkg.name}</span>
                            <span className="pkg-id-text">ID: {pkg.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="dest-cell">
                          <MapPin size={14} color="#94a3b8" />
                          <span>{pkg.destination}</span>
                        </div>
                      </td>
                      <td>
                        <span className="price-text">{pkg.price}</span>
                        <span className="price-sub">/orang</span>
                      </td>
                      <td>
                        <div className="quota-bar-wrapper">
                          <div className="quota-labels">
                            👥 {pkg.quota}
                          </div>
                          <div className="quota-progress-track">
                            <div 
                              className={`quota-progress-fill ${pkg.status === 'Nonaktif' ? 'gray' : ''}`}
                              style={{ width: `${quotaPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="schedule-text">{pkg.schedule}</td>
                      <td>
                        <span className={`status-pill ${
                          pkg.status === 'Aktif' ? 'confirmed' :
                          pkg.status === 'Draft' ? 'pending' : 'nonaktif'
                        }`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td>
                        <span className="rating-star">
                          {pkg.rating ? `⭐ ${pkg.rating}` : '—'}
                        </span>
                      </td>
                      <td style={{ position: 'relative' }}>
                        <div className="actions-cell">
                          <button className="action-btn" onClick={() => handleAction('edit', pkg.id)} title="Sunting">
                            <Edit3 size={14} />
                          </button>
                          <button className="action-btn" onClick={() => handleAction('view', pkg.id)} title="Lihat">
                            <Eye size={14} />
                          </button>
                          <button 
                            className={`action-btn ${activeMenuId === pkg.id ? 'active' : ''}`} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === pkg.id ? null : pkg.id);
                            }}
                            title="Menu Aksi"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          
                          {activeMenuId === pkg.id && (
                            <div 
                              className="action-dropdown-menu animate-fade-in"
                              style={{
                                position: 'absolute',
                                right: '16px',
                                top: '44px',
                                backgroundColor: '#ffffff',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                zIndex: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                width: '130px',
                                padding: '4px 0'
                              }}
                            >
                              <button 
                                onClick={async () => {
                                  try {
                                    await request(`/provider/packages/${pkg.id}`, {
                                      method: 'PUT',
                                      body: JSON.stringify({ status: 'Aktif' })
                                    });
                                    loadPackages();
                                    setActiveMenuId(null);
                                  } catch (err: any) {
                                    alert(err.message || 'Gagal mengubah status');
                                  }
                                }}
                                style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, textAlign: 'left', color: '#10b981', background: 'transparent', border: 0, cursor: 'pointer' }}
                              >
                                Set Aktif
                              </button>
                              <button 
                                onClick={async () => {
                                  try {
                                    await request(`/provider/packages/${pkg.id}`, {
                                      method: 'PUT',
                                      body: JSON.stringify({ status: 'Nonaktif' })
                                    });
                                    loadPackages();
                                    setActiveMenuId(null);
                                  } catch (err: any) {
                                    alert(err.message || 'Gagal mengubah status');
                                  }
                                }}
                                style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, textAlign: 'left', color: '#64748b', background: 'transparent', border: 0, cursor: 'pointer' }}
                              >
                                Set Nonaktif
                              </button>
                              <button 
                                onClick={async () => {
                                  try {
                                    await request(`/provider/packages/${pkg.id}`, {
                                      method: 'PUT',
                                      body: JSON.stringify({ status: 'Draft' })
                                    });
                                    loadPackages();
                                    setActiveMenuId(null);
                                  } catch (err: any) {
                                    alert(err.message || 'Gagal mengubah status');
                                  }
                                }}
                                style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, textAlign: 'left', color: '#f59e0b', background: 'transparent', border: 0, cursor: 'pointer' }}
                              >
                                Set Draft
                              </button>
                              <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                              <button 
                                onClick={() => {
                                  handleAction('delete', pkg.id);
                                  setActiveMenuId(null);
                                }}
                                style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, textAlign: 'left', color: '#ef4444', background: 'transparent', border: 0, cursor: 'pointer' }}
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination-wrapper">
            <span className="page-summary">
              Menampilkan {filteredPackages.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(filteredPackages.length, currentPage * itemsPerPage)} dari {filteredPackages.length} paket
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

      {/* View Package Details Modal */}
      {selectedPackage && (
        <div className="detail-modal-overlay" onClick={() => setSelectedPackage(null)}>
          <div className="detail-modal-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Paket Wisata</h2>
              <button className="close-modal-btn" onClick={() => setSelectedPackage(null)}>
                <XCircle size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-hero">
                <span className="detail-icon">⛰️</span>
                <div>
                  <h3>{selectedPackage.name}</h3>
                  <p className="detail-id">ID Paket: {selectedPackage.id}</p>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-item full-width">
                  <span className="detail-label">Destinasi</span>
                  <span className="detail-value">{selectedPackage.destination}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Harga</span>
                  <span className="detail-value text-teal">{selectedPackage.price}/orang</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Kuota</span>
                  <span className="detail-value">{selectedPackage.quota} peserta</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Jadwal Keberangkatan</span>
                  <span className="detail-value">{selectedPackage.schedule}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Rating</span>
                  <span className="detail-value">{selectedPackage.rating ? `⭐ ${selectedPackage.rating}` : '—'}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Status</span>
                  <span className={`status-pill ${
                    selectedPackage.status === 'Aktif' ? 'confirmed' :
                    selectedPackage.status === 'Draft' ? 'pending' : 'nonaktif'
                  }`} style={{ width: 'fit-content' }}>
                    {selectedPackage.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
