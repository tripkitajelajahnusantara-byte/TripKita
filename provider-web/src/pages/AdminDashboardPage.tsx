import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  LogOut, 
  FileText, 
  Search, 
  Building, 
  Eye,
  SlidersHorizontal,
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Clock,
  ArrowRight
} from 'lucide-react';
import { request } from '../utils/api';

interface ProviderAdminData {
  id: number;
  businessName: string;
  businessCategory: string;
  operationalProvince?: string;
  operationalCity: string;
  description: string;
  documentUploaded: boolean;
  documentPath?: string;
  ktpPath?: string;
  nibPath?: string;
  npwpPath?: string;
  aktaPath?: string;
  sertifikatPath?: string;
  instagram?: string;
  tiktok?: string;
  picName: string;
  email: string;
  whatsapp: string;
  isVerified: boolean;
  role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationNotes?: string;
  createdAt: string;

  // New fields
  website?: string;
  npwp?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  contactLastUpdatedAt?: string;

  pendingNpwp?: string;
  pendingBankName?: string;
  pendingBankAccount?: string;
  pendingBankAccountName?: string;
  legalVerificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  legalRejectionReason?: string;

  pendingKtpPath?: string;
  pendingNibPath?: string;
  pendingDocumentPath?: string;
  pendingNpwpPath?: string;
  pendingAktaPath?: string;
  pendingSertifikatPath?: string;

  ktpStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  nibStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  siupStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  npwpDocStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  aktaStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  sertifikatStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';

  ktpRejectionReason?: string;
  nibRejectionReason?: string;
  siupRejectionReason?: string;
  npwpDocRejectionReason?: string;
  aktaRejectionReason?: string;
  sertifikatRejectionReason?: string;
}

interface StatusHistoryItem {
  id: number;
  providerId: number;
  status: string;
  notes: string;
  createdAt: string;
}

export const AdminDashboardPage: React.FC = () => {
  const { providerProfile, logout, navigateTo } = useNavigation();
  const [providers, setProviders] = useState<ProviderAdminData[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'kelola-provider' | 'administrasi-refund'>('kelola-provider');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua Kategori');
  const [cityFilter, setCityFilter] = useState('Semua Kota');
  const [statusTab, setStatusTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  
  // Selection & Drawer States
  const [selectedProvider, setSelectedProvider] = useState<ProviderAdminData | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Refund States
  const [refunds, setRefunds] = useState<any[]>([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundSuccess, setRefundSuccess] = useState('');

  const adminName = providerProfile?.picName || 'Administrator';
  const adminEmail = providerProfile?.email || 'admin@tripkita.id';

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await request('/admin/providers');
      setProviders(data);
    } catch (err: any) {
      console.error('Failed to fetch providers:', err);
      setError(err.message || 'Gagal memuat data provider.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRefunds = async () => {
    setRefundLoading(true);
    setRefundError('');
    try {
      const data = await request('/admin/refunds');
      setRefunds(data);
    } catch (err: any) {
      console.error('Failed to fetch refunds:', err);
      setRefundError(err.message || 'Gagal memuat data refund.');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleCompleteRefund = async (bookingId: number) => {
    if (!window.confirm('Apakah Anda yakin sudah memproses refund ini secara manual di dashboard Xendit dan ingin menandai transaksi ini sebagai SELESAI (REFUNDED)?')) {
      return;
    }
    try {
      setRefundError('');
      setRefundSuccess('');
      await request(`/admin/refunds/${bookingId}/complete`, {
        method: 'POST',
      });
      setRefundSuccess('Berhasil mengubah status refund menjadi SELESAI.');
      fetchRefunds();
    } catch (err: any) {
      console.error('Failed to complete refund:', err);
      setRefundError(err.message || 'Gagal memproses refund.');
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (activeView === 'administrasi-refund') {
      fetchRefunds();
    }
  }, [activeView]);

  useEffect(() => {
    if (selectedProvider) {
      setAdminNotes(selectedProvider.verificationNotes || '');
      // Select KTP or other path as default preview doc
      if (selectedProvider.ktpPath) {
        setPreviewDocUrl(selectedProvider.ktpPath);
        setPreviewDocName('KTP_PIC.jpg');
      } else if (selectedProvider.documentPath) {
        setPreviewDocUrl(selectedProvider.documentPath);
        setPreviewDocName('SIUP_NIB.pdf');
      } else if (selectedProvider.nibPath) {
        setPreviewDocUrl(selectedProvider.nibPath);
        setPreviewDocName('NIB.pdf');
      } else if (selectedProvider.npwpPath) {
        setPreviewDocUrl(selectedProvider.npwpPath);
        setPreviewDocName('NPWP.pdf');
      } else if (selectedProvider.aktaPath) {
        setPreviewDocUrl(selectedProvider.aktaPath);
        setPreviewDocName('Akta.pdf');
      } else if (selectedProvider.sertifikatPath) {
        setPreviewDocUrl(selectedProvider.sertifikatPath);
        setPreviewDocName('Sertifikat.pdf');
      } else {
        setPreviewDocUrl(null);
        setPreviewDocName('');
      }

      // Fetch history
      request(`/admin/providers/${selectedProvider.id}/history`)
        .then((data) => setStatusHistory(data))
        .catch((err) => console.error('Failed to load status history:', err));
    } else {
      setStatusHistory([]);
      setPreviewDocUrl(null);
      setPreviewDocName('');
      setAdminNotes('');
    }
  }, [selectedProvider]);

  const handleUpdateStatus = async (id: number, status: 'APPROVED' | 'REJECTED' | 'PENDING', customNotes?: string) => {
    const notesToSubmit = customNotes !== undefined ? customNotes : adminNotes;
    try {
      setError('');
      setSuccessMsg('');
      await request(`/admin/providers/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, verificationNotes: notesToSubmit }),
      });
      setSuccessMsg(`Berhasil memperbarui status provider.`);
      
      // Refresh provider data
      const updatedProviders = await request('/admin/providers');
      setProviders(updatedProviders);
      
      // Update selected provider details
      const found = updatedProviders.find((p: any) => p.id === id);
      if (found) {
        setSelectedProvider(found);
      } else {
        setSelectedProvider(null);
      }
    } catch (err: any) {
      console.error('Failed to update provider status:', err);
      setError(err.message || 'Gagal memperbarui status provider.');
    }
  };

  const handleDeleteProvider = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus permanen provider ini beserta seluruh paket dan data booking terkait? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      await request(`/admin/providers/${id}`, {
        method: 'DELETE',
      });
      setSuccessMsg('Provider berhasil dihapus permanen.');
      setSelectedProvider(null);
      fetchProviders();
    } catch (err: any) {
      console.error('Failed to delete provider:', err);
      setError(err.message || 'Gagal menghapus provider.');
    }
  };

  const handleVerifyLegal = async (id: number, action: 'APPROVE' | 'REJECT') => {
    let reason = '';
    if (action === 'REJECT') {
      const inputReason = window.prompt('Masukkan alasan penolakan data legal/rekening:');
      if (inputReason === null) return; // cancelled
      if (!inputReason.trim()) {
        alert('Alasan penolakan tidak boleh kosong.');
        return;
      }
      reason = inputReason.trim();
    } else {
      if (!window.confirm('Apakah Anda yakin menyetujui perubahan data legal & rekening ini?')) {
        return;
      }
    }

    try {
      setError('');
      setSuccessMsg('');
      await request(`/admin/providers/${id}/verify-legal`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
      setSuccessMsg(`Berhasil memproses verifikasi data legal.`);
      
      // Refresh provider data
      const updatedProviders = await request('/admin/providers');
      setProviders(updatedProviders);
      const found = updatedProviders.find((p: any) => p.id === id);
      if (found) setSelectedProvider(found);
    } catch (err: any) {
      console.error('Failed to verify legal details:', err);
      setError(err.message || 'Gagal memproses verifikasi data legal.');
    }
  };

  const handleVerifyDocument = async (id: number, docType: string, action: 'APPROVE' | 'REJECT') => {
    let reason = '';
    if (action === 'REJECT') {
      const inputReason = window.prompt(`Masukkan alasan penolakan dokumen ${docType.toUpperCase()}:`);
      if (inputReason === null) return; // cancelled
      if (!inputReason.trim()) {
        alert('Alasan penolakan tidak boleh kosong.');
        return;
      }
      reason = inputReason.trim();
    } else {
      if (!window.confirm(`Apakah Anda yakin menyetujui dokumen baru untuk ${docType.toUpperCase()}?`)) {
        return;
      }
    }

    try {
      setError('');
      setSuccessMsg('');
      await request(`/admin/providers/${id}/verify-document`, {
        method: 'POST',
        body: JSON.stringify({ docType, action, reason }),
      });
      setSuccessMsg(`Berhasil memproses verifikasi dokumen.`);
      
      // Refresh provider data
      const updatedProviders = await request('/admin/providers');
      setProviders(updatedProviders);
      const found = updatedProviders.find((p: any) => p.id === id);
      if (found) setSelectedProvider(found);
    } catch (err: any) {
      console.error('Failed to verify document:', err);
      setError(err.message || 'Gagal memproses verifikasi dokumen.');
    }
  };

  const renderAdminDocRow = (
    label: string,
    filename: string,
    activePath: string | undefined,
    pendingPath: string | undefined,
    status: string | undefined,
    rejectionReason: string | undefined,
    docType: string,
    color: string
  ) => {
    // If empty status but provider approved, fallback to APPROVED
    const isApproved = status === 'APPROVED' || (!pendingPath && activePath && selectedProvider?.status === 'APPROVED');
    const isPending = !!pendingPath || status === 'PENDING';
    const isRejected = status === 'REJECTED';

    return (
      <div className="doc-row-container" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={16} color={color} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>{label}</div>
              <span className={`doc-badge ${isApproved ? 'uploaded' : isPending ? 'pending' : isRejected ? 'rejected' : 'optional'}`} style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '4px',
                display: 'inline-block',
                marginTop: '2px',
                backgroundColor: isApproved ? '#f0fdf4' : isPending ? '#fffbeb' : isRejected ? '#fef2f2' : '#f1f5f9',
                color: isApproved ? '#166534' : isPending ? '#d97706' : isRejected ? '#ef4444' : '#64748b'
              }}>
                {isApproved ? 'Terverifikasi' : isPending ? 'Menunggu Verifikasi' : isRejected ? 'Ditolak' : 'Belum Ada'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {activePath && (
              <>
                <button className="doc-action-btn" onClick={() => { setPreviewDocUrl(activePath); setPreviewDocName(`${filename}_active`); }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', background: 'white' }}>Lihat Aktif</button>
              </>
            )}
          </div>
        </div>

        {isRejected && rejectionReason && (
          <div style={{ fontSize: '11px', color: '#ef4444', fontStyle: 'italic', backgroundColor: '#fef2f2', padding: '6px 10px', borderRadius: '4px' }}>
            Penolakan: "{rejectionReason}"
          </div>
        )}

        {isPending && pendingPath && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309' }}>Berkas Baru:</span>
              <button 
                className="doc-action-btn" 
                onClick={() => { setPreviewDocUrl(pendingPath); setPreviewDocName(`${filename}_pending`); }} 
                style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #b45309', cursor: 'pointer', background: 'white', color: '#b45309', fontWeight: 600 }}
              >
                Lihat Berkas Baru
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                type="button"
                style={{ flex: 1, padding: '5px', fontSize: '10px', fontWeight: 700, color: 'white', backgroundColor: '#10b981', border: 0, borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => handleVerifyDocument(selectedProvider!.id, docType, 'APPROVE')}
              >
                Setujui
              </button>
              <button 
                type="button"
                style={{ flex: 1, padding: '5px', fontSize: '10px', fontWeight: 700, color: 'white', backgroundColor: '#ef4444', border: 0, borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => handleVerifyDocument(selectedProvider!.id, docType, 'REJECT')}
              >
                Tolak
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const filteredProviders = providers.filter((p) => {
    const matchesSearch = 
      p.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.picName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.operationalCity.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = p.status === statusTab;
    
    const matchesCategory = categoryFilter === 'Semua Kategori' || 
      p.businessCategory.toLowerCase() === categoryFilter.toLowerCase();
    
    const matchesCity = cityFilter === 'Semua Kota' || 
      p.operationalCity.toLowerCase().includes(cityFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesCategory && matchesCity;
  });

  // Calculate statistics
  const stats = {
    total: providers.length,
    pending: providers.filter(p => p.status === 'PENDING').length,
    approved: providers.filter(p => p.status === 'APPROVED').length,
    rejected: providers.filter(p => p.status === 'REJECTED').length,
  };

  // Categories list
  const categories = ['Semua Kategori', 'Tour', 'Rental', 'Activities', 'Guide'];
  
  // Unique cities list
  const cities = ['Semua Kota', ...Array.from(new Set(providers.map(p => {
    const parts = p.operationalCity.split(',');
    return parts[parts.length - 1].trim();
  })))];

  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') {
      setZoomLevel(prev => Math.min(prev + 20, 200));
    } else {
      setZoomLevel(prev => Math.max(prev - 20, 50));
    }
  };

  return (
    <div className="admin-layout animate-fade-in">
      {/* Sidebar Panel */}
      <aside className="admin-sidebar">
        <div>
          <div className="sidebar-brand" onClick={() => navigateTo('beranda')} style={{ cursor: 'pointer' }}>
            {/* Blue pin logo */}
            <div className="logo-icon-container">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#3b82f6"/>
              </svg>
            </div>
            <div>
              <span className="logo-text">Trip<span>Kita</span></span>
              <span className="logo-subtext">Admin Panel</span>
            </div>
          </div>

          <nav className="sidebar-menu">
            <button 
              className={`menu-btn ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveView('dashboard'); setSelectedProvider(null); }}
            >
              <Users size={18} /> Dashboard
            </button>
            <button 
              className={`menu-btn ${activeView === 'kelola-provider' ? 'active' : ''}`}
              onClick={() => { setActiveView('kelola-provider'); setSelectedProvider(null); }}
            >
              <CheckCircle2 size={18} /> Kelola Provider
            </button>
            <button 
              className={`menu-btn ${activeView === 'administrasi-refund' ? 'active' : ''}`}
              onClick={() => { setActiveView('administrasi-refund'); setSelectedProvider(null); }}
            >
              <FileText size={18} /> Administrasi Refund
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button className="sidebar-logout-btn" onClick={logout}>
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Panel Area */}
      <main className="admin-main-wrapper">
        {/* Top Header */}
        <header className="admin-top-header">
          <div className="header-left">
            <button className="hamburger-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="header-right">
            <button className="notification-bell-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="bell-badge">3</span>
            </button>
            <div className="user-profile-widget">
              <div className="avatar-circle">AD</div>
              <div className="profile-details">
                <span className="name">{adminName}</span>
                <span className="email">{adminEmail}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content-layout">
          {/* Main Section Column */}
          <div className="admin-main-content">
            
            {/* Header Title */}
            <div className="verification-header-box">
              <h1>{activeView === 'administrasi-refund' ? 'Administrasi Refund' : 'Provider Verification Center'}</h1>
              <p>{activeView === 'administrasi-refund' ? 'Pantau dan kelola proses refund dana customer.' : 'Kelola dan verifikasi semua provider yang terdaftar di TripKita.'}</p>
            </div>

            {/* Alert Messages */}
            {successMsg && <div className="alert-message success-alert">{successMsg}</div>}
            {error && <div className="alert-message error-alert">{error}</div>}

            {/* View 1: Dashboard Overview */}
            {activeView === 'dashboard' ? (
              <div className="dashboard-view-panel">
                <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center' }}>
                  <Building size={48} color="#3b82f6" style={{ marginBottom: '16px' }} />
                  <h2>Ringkasan Platform TripKita</h2>
                  <p style={{ color: 'var(--color-text-medium)', maxWidth: '500px', margin: '8px auto 24px' }}>
                    Gunakan menu "Kelola Provider" untuk memverifikasi dokumen kelayakan provider baru atau "Administrasi Refund" untuk memproses refund dana.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button className="submit-form-btn" onClick={() => setActiveView('kelola-provider')} style={{ width: 'auto', padding: '12px 24px', display: 'inline-flex' }}>
                      Menuju Pusat Verifikasi <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                    </button>
                    <button className="back-form-btn" onClick={() => setActiveView('administrasi-refund')} style={{ width: 'auto', padding: '12px 24px', display: 'inline-flex' }}>
                      Kelola Refund <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                    </button>
                  </div>
                </div>
              </div>
            ) : activeView === 'administrasi-refund' ? (
              /* View 3: Administrasi Refund Panel */
              <div className="table-content-container animate-fade-in" style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                {refundSuccess && <div className="alert-message success-alert">{refundSuccess}</div>}
                {refundError && <div className="alert-message error-alert">{refundError}</div>}
                
                <div className="providers-table-wrapper" style={{ marginTop: '0px' }}>
                  {refundLoading ? (
                    <div className="loading-state">Memuat data refund...</div>
                  ) : (
                    <table className="admin-providers-table">
                      <thead>
                        <tr>
                          <th>Kode Booking</th>
                          <th>Pelanggan</th>
                          <th>Paket Wisata</th>
                          <th>Total Refund</th>
                          <th>Metode Pembayaran</th>
                          <th>Terakhir Diperbarui</th>
                          <th>Status</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refunds.length > 0 ? (
                          refunds.map((refund) => (
                            <tr key={refund.id}>
                              <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{refund.bookingCode}</td>
                              <td>{refund.customerName}</td>
                              <td>{refund.packageDetails ? refund.packageDetails.name : `Paket #${refund.packageId}`} &bull; {refund.guests} pax</td>
                              <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>Rp {refund.totalPrice.toLocaleString('id-ID')}</td>
                              <td style={{ textTransform: 'uppercase' }}>{refund.paymentMethod || 'QRIS'}</td>
                              <td>
                                {new Date(refund.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}<br/>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
                                  {new Date(refund.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                </span>
                              </td>
                              <td>
                                <span className={`status-pill-small ${refund.status === 'REFUNDED' ? 'approved' : 'rejected'}`}>
                                  {refund.status === 'REFUNDED' ? 'Selesai di-Refund' : 'Butuh Refund'}
                                </span>
                              </td>
                              <td>
                                {refund.status === 'REFUND_REQUIRED' ? (
                                  <button 
                                    className="submit-form-btn" 
                                    onClick={() => handleCompleteRefund(refund.id)}
                                    style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', backgroundColor: '#0d9488' }}
                                  >
                                    Tandai Selesai
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600 }}>Selesai</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="empty-table-state" style={{ padding: '40px 0' }}>
                              Tidak ada transaksi refund yang perlu diproses saat ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              /* View 2: Kelola Provider (Verification Table & Filters) */
              <>
                {/* Statistics Cards Grid */}
                <section className="stats-cards-row">
                  <div className="stat-card">
                    <div className="card-top">
                      <div className="stat-icon-bg bg-blue">
                        <Users size={20} color="#3b82f6" />
                      </div>
                      <span className="card-label">Total Provider</span>
                    </div>
                    <div className="card-bottom">
                      <h3>2,504</h3>
                      <p>Semua provider terdaftar</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="card-top">
                      <div className="stat-icon-bg bg-orange">
                        <Clock size={20} color="#f59e0b" />
                      </div>
                      <span className="card-label">Pending Approval</span>
                    </div>
                    <div className="card-bottom">
                      <h3>{stats.pending}</h3>
                      <p>Menunggu persetujuan</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="card-top">
                      <div className="stat-icon-bg bg-green">
                        <CheckCircle2 size={20} color="#10b981" />
                      </div>
                      <span className="card-label">Provider Aktif</span>
                    </div>
                    <div className="card-bottom">
                      <h3>2,481</h3>
                      <p>Provider aktif</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="card-top">
                      <div className="stat-icon-bg bg-red">
                        <XCircle size={20} color="#ef4444" />
                      </div>
                      <span className="card-label">Provider Ditolak</span>
                    </div>
                    <div className="card-bottom">
                      <h3>5</h3>
                      <p>Provider ditolak</p>
                    </div>
                  </div>
                </section>

                {/* Tabs, Filter, and Table Card */}
                <div className="table-content-container">
                  
                  {/* Status Tab Filter Bar */}
                  <div className="tab-filters-row">
                    <button 
                      className={`tab-filter-btn ${statusTab === 'PENDING' ? 'active' : ''}`}
                      onClick={() => setStatusTab('PENDING')}
                    >
                      Menunggu Persetujuan <span className="badge-count orange">{stats.pending}</span>
                    </button>
                    <button 
                      className={`tab-filter-btn ${statusTab === 'APPROVED' ? 'active' : ''}`}
                      onClick={() => setStatusTab('APPROVED')}
                    >
                      Provider Aktif <span className="badge-count green">{stats.approved}</span>
                    </button>
                    <button 
                      className={`tab-filter-btn ${statusTab === 'REJECTED' ? 'active' : ''}`}
                      onClick={() => setStatusTab('REJECTED')}
                    >
                      Provider Ditolak <span className="badge-count red">{stats.rejected}</span>
                    </button>
                  </div>

                  {/* Filter / Search Bar */}
                  <div className="filter-controls-row">
                    <div className="search-input-box">
                      <Search size={16} color="#94a3b8" />
                      <input 
                        type="text" 
                        placeholder="Cari nama, email, atau kota provider..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filter-select">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="filter-select">
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <button className="filter-btn-outline">
                      <SlidersHorizontal size={14} /> Filter
                    </button>
                  </div>

                  {/* Main Providers Table */}
                  <div className="providers-table-wrapper">
                    {loading ? (
                      <div className="loading-state">Memuat data mitra...</div>
                    ) : (
                      <table className="admin-providers-table">
                        <thead>
                          <tr>
                            <th>Provider</th>
                            <th>PIC / Kontak</th>
                            <th>Kategori</th>
                            <th>Kota</th>
                            <th>Tanggal Daftar</th>
                            <th>Status</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProviders.length > 0 ? (
                            filteredProviders.map((p) => (
                              <tr key={p.id} className={selectedProvider?.id === p.id ? 'row-selected' : ''}>
                                <td>
                                  <div className="provider-cell">
                                    <div className="logo-avatar-box">
                                      {p.businessName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="name-text">{p.businessName}</div>
                                      <div className="category-subtext">{p.businessCategory}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div className="contact-cell">
                                    <span className="pic-name">{p.picName}</span>
                                    <span className="pic-email">{p.email}</span>
                                    <span className="pic-phone">{p.whatsapp}</span>
                                  </div>
                                </td>
                                <td style={{ textTransform: 'capitalize' }}>{p.businessCategory} & Travel</td>
                                <td>{p.operationalCity}{p.operationalProvince ? `, ${p.operationalProvince}` : ''}</td>
                                <td>
                                  {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}<br/>
                                  <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
                                    {new Date(p.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                  </span>
                                </td>
                                <td>
                                  <span className={`status-pill-small ${p.status.toLowerCase()}`}>
                                    {p.status === 'APPROVED' ? 'Approved' : p.status === 'PENDING' ? 'Pending' : 'Rejected'}
                                  </span>
                                </td>
                                <td>
                                  <button className="detail-view-btn" onClick={() => setSelectedProvider(p)}>
                                    <Eye size={14} /> Detail
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="empty-table-state">
                                Tidak ada data provider yang sesuai dengan kriteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pagination Footer */}
                  <div className="table-pagination-footer">
                    <span className="count-label">Menampilkan 1 - {filteredProviders.length} dari {filteredProviders.length} data</span>
                    <div className="pagination-buttons">
                      <button className="page-nav" disabled>&lt;</button>
                      <button className="page-number active">1</button>
                      <button className="page-nav" disabled>&gt;</button>
                    </div>
                  </div>

                </div>
              </>
            )}

          </div>

          {/* Right Detail Provider Drawer */}
          {selectedProvider && (
            <div className="detail-provider-drawer animate-slide-in">
              <div className="drawer-inner">
                
                {/* Header Row */}
                <div className="drawer-header-row">
                  <h2>Detail Provider</h2>
                  <button className="close-btn" onClick={() => setSelectedProvider(null)}>
                    <X size={20} />
                  </button>
                </div>

                {/* Profile Card Header */}
                <div className="drawer-profile-card">
                  <div className="profile-logo-avatar">
                    {selectedProvider.businessName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3>{selectedProvider.businessName}</h3>
                    <p>{selectedProvider.businessCategory} & Travel</p>
                    <span className={`drawer-status-badge ${selectedProvider.status.toLowerCase()}`}>
                      {selectedProvider.status === 'APPROVED' ? 'Approved' : selectedProvider.status === 'PENDING' ? 'Pending Approval' : 'Rejected'}
                    </span>
                  </div>
                </div>

                {/* Section 1: Informasi Bisnis */}
                <div className="drawer-section">
                  <h4 className="section-title">Informasi Bisnis</h4>
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td className="field-label">Nama Bisnis</td>
                        <td className="field-value">: {selectedProvider.businessName}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Kategori</td>
                        <td className="field-value" style={{ textTransform: 'capitalize' }}>: {selectedProvider.businessCategory} & Travel</td>
                      </tr>
                      <tr>
                        <td className="field-label">Provinsi</td>
                        <td className="field-value">: {selectedProvider.operationalProvince || '—'}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Kota Operasional</td>
                        <td className="field-value">: {selectedProvider.operationalCity}</td>
                      </tr>
                      <tr>
                        <td className="field-label">PIC / Kontak</td>
                        <td className="field-value">: {selectedProvider.picName}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Email</td>
                        <td className="field-value">: {selectedProvider.email}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Telepon</td>
                        <td className="field-value">: {selectedProvider.whatsapp}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Tanggal Daftar</td>
                        <td className="field-value">
                          : {new Date(selectedProvider.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, {new Date(selectedProvider.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </td>
                      </tr>
                      {selectedProvider.instagram && (
                        <tr>
                          <td className="field-label">Instagram</td>
                          <td className="field-value">: <a href={selectedProvider.instagram} target="_blank" rel="noreferrer" className="social-link">{selectedProvider.instagram}</a></td>
                        </tr>
                      )}
                      {selectedProvider.tiktok && (
                        <tr>
                          <td className="field-label">TikTok</td>
                          <td className="field-value">: <a href={selectedProvider.tiktok} target="_blank" rel="noreferrer" className="social-link">{selectedProvider.tiktok}</a></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>                  {/* Section 1.5: Data Legal & Rekening */}
                <div className="drawer-section">
                  <h4 className="section-title">Data Legal & Rekening</h4>
                  
                  {/* Status badge */}
                  <div style={{ marginBottom: '12px' }}>
                    <span className={`drawer-status-badge ${
                      selectedProvider.legalVerificationStatus === 'APPROVED' ? 'approved' :
                      selectedProvider.legalVerificationStatus === 'PENDING' ? 'pending' :
                      selectedProvider.legalVerificationStatus === 'REJECTED' ? 'rejected' : 'pending'
                    }`}>
                      {selectedProvider.legalVerificationStatus === 'PENDING' ? 'Menunggu Verifikasi Legal' :
                       selectedProvider.legalVerificationStatus === 'APPROVED' ? 'Legal Disetujui' :
                       selectedProvider.legalVerificationStatus === 'REJECTED' ? 'Legal Ditolak' : 'Belum Diverifikasi'}
                    </span>
                    {selectedProvider.legalVerificationStatus === 'REJECTED' && selectedProvider.legalRejectionReason && (
                      <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                        Alasan ditolak: "{selectedProvider.legalRejectionReason}"
                      </div>
                    )}
                  </div>

                  {selectedProvider.legalVerificationStatus === 'PENDING' ? (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        Perbandingan Perubahan Data:
                      </div>
                      <table className="info-table" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', width: '100%', marginBottom: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Field</th>
                            <th style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Aktif (Lama)</th>
                            <th style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#b45309' }}>Pending (Baru)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="field-label" style={{ padding: '6px 8px', fontSize: '11px', width: '80px' }}>NPWP</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px' }}>{selectedProvider.npwp || '—'}</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px', color: '#b45309', fontWeight: 'bold' }}>{selectedProvider.pendingNpwp || '—'}</td>
                          </tr>
                          <tr>
                            <td className="field-label" style={{ padding: '6px 8px', fontSize: '11px' }}>Bank</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px' }}>{selectedProvider.bankName || '—'}</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px', color: '#b45309', fontWeight: 'bold' }}>{selectedProvider.pendingBankName || '—'}</td>
                          </tr>
                          <tr>
                            <td className="field-label" style={{ padding: '6px 8px', fontSize: '11px' }}>Rekening</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px' }}>{selectedProvider.bankAccount || '—'}</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px', color: '#b45309', fontWeight: 'bold' }}>{selectedProvider.pendingBankAccount || '—'}</td>
                          </tr>
                          <tr>
                            <td className="field-label" style={{ padding: '6px 8px', fontSize: '11px' }}>Pemilik</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px' }}>{selectedProvider.bankAccountName || '—'}</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px', color: '#b45309', fontWeight: 'bold' }}>{selectedProvider.pendingBankAccountName || '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          type="button"
                          className="action-btn approve-btn" 
                          style={{ padding: '6px 12px', fontSize: '11px', flex: 1, backgroundColor: '#10b981', color: 'white', border: 0, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          onClick={() => handleVerifyLegal(selectedProvider.id, 'APPROVE')}
                        >
                          Setujui
                        </button>
                        <button 
                          type="button"
                          className="action-btn reject-btn" 
                          style={{ padding: '6px 12px', fontSize: '11px', flex: 1, backgroundColor: '#ef4444', color: 'white', border: 0, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          onClick={() => handleVerifyLegal(selectedProvider.id, 'REJECT')}
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  ) : (
                    <table className="info-table">
                      <tbody>
                        <tr>
                          <td className="field-label">NPWP</td>
                          <td className="field-value">: {selectedProvider.npwp || '—'}</td>
                        </tr>
                        <tr>
                          <td className="field-label">Nama Bank</td>
                          <td className="field-value">: {selectedProvider.bankName || '—'}</td>
                        </tr>
                        <tr>
                          <td className="field-label">No. Rekening</td>
                          <td className="field-value">: {selectedProvider.bankAccount || '—'}</td>
                        </tr>
                        <tr>
                          <td className="field-label">Nama Pemilik</td>
                          <td className="field-value">: {selectedProvider.bankAccountName || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Section 2: Dokumen Legalitas */}
                <div className="drawer-section">
                  <h4 className="section-title">Dokumen Legalitas</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {renderAdminDocRow('KTP PIC/Pemilik', 'KTP_PIC.jpg', selectedProvider.ktpPath, selectedProvider.pendingKtpPath, selectedProvider.ktpStatus, selectedProvider.ktpRejectionReason, 'ktp', '#3b82f6')}
                    {renderAdminDocRow('NIB', 'NIB.pdf', selectedProvider.nibPath, selectedProvider.pendingNibPath, selectedProvider.nibStatus, selectedProvider.nibRejectionReason, 'nib', '#f59e0b')}
                    {renderAdminDocRow('SIUP (Dokumen Pendukung)', 'SIUP_NIB.pdf', selectedProvider.documentPath, selectedProvider.pendingDocumentPath, selectedProvider.siupStatus, selectedProvider.siupRejectionReason, 'siup', '#10b981')}
                    {renderAdminDocRow('NPWP Bisnis', 'NPWP.pdf', selectedProvider.npwpPath, selectedProvider.pendingNpwpPath, selectedProvider.npwpDocStatus, selectedProvider.npwpDocRejectionReason, 'npwp', '#6366f1')}
                    {renderAdminDocRow('Akta Pendirian', 'Akta.pdf', selectedProvider.aktaPath, selectedProvider.pendingAktaPath, selectedProvider.aktaStatus, selectedProvider.aktaRejectionReason, 'akta', '#ec4899')}
                    {renderAdminDocRow('Sertifikat Wisata', 'Sertifikat.pdf', selectedProvider.sertifikatPath, selectedProvider.pendingSertifikatPath, selectedProvider.sertifikatStatus, selectedProvider.sertifikatRejectionReason, 'sertifikat', '#14b8a6')}
                  </div>
                </div>

                {/* Section 3: Preview Dokumen */}
                {previewDocUrl && (
                  <div className="drawer-section">
                    <div className="preview-header-row">
                      <h4 className="section-title">Preview Dokumen ({previewDocName})</h4>
                      <div className="preview-controls">
                        <button className="ctrl-btn" onClick={() => handleZoom('out')} title="Zoom Out"><ZoomOut size={14} /></button>
                        <button className="ctrl-btn" onClick={() => handleZoom('in')} title="Zoom In"><ZoomIn size={14} /></button>
                        <a href={`http://localhost:8080${previewDocUrl}`} target="_blank" rel="noreferrer" className="ctrl-btn" title="Fullscreen"><Maximize2 size={14} /></a>
                      </div>
                    </div>
                    <div className="doc-preview-container">
                      {previewDocUrl.endsWith('.pdf') ? (
                        <iframe 
                          src={`http://localhost:8080${previewDocUrl}`} 
                          title="Legal Document Preview"
                          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                        />
                      ) : (
                        <img 
                          src={`http://localhost:8080${previewDocUrl}`} 
                          alt="Document Preview" 
                          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', maxWidth: '100%', height: 'auto' }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Section 4: Catatan Admin */}
                <div className="drawer-section">
                  <h4 className="section-title">Catatan Admin</h4>
                  <textarea 
                    className="admin-notes-textarea"
                    placeholder="Tulis catatan atau komentar untuk provider ini..."
                    maxLength={500}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                  <span className="char-count">{adminNotes.length} / 500 karakter</span>
                </div>

                {/* Section 5: Provider Status History */}
                {statusHistory.length > 0 && (
                  <div className="drawer-section">
                    <h4 className="section-title">Provider Status History</h4>
                    <div className="timeline-container">
                      {statusHistory.map((h) => (
                        <div className="timeline-item" key={h.id}>
                          <div className="timeline-badge-dot"></div>
                          <div className="timeline-content">
                            <div className="timeline-status-header">
                              <span className={`history-pill ${h.status.toLowerCase()}`}>{h.status}</span>
                              <span className="timeline-time">
                                {new Date(h.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} {new Date(h.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="timeline-notes">{h.notes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="drawer-actions-row">
                  {selectedProvider.status === 'PENDING' ? (
                    <>
                      <button className="action-btn approve-btn" onClick={() => handleUpdateStatus(selectedProvider.id, 'APPROVED')}>
                        Approve Provider
                      </button>
                      <button className="action-btn reject-btn" onClick={() => handleUpdateStatus(selectedProvider.id, 'REJECTED')}>
                        Reject Provider
                      </button>
                    </>
                  ) : selectedProvider.status === 'APPROVED' ? (
                    <button className="action-btn disable-btn" onClick={() => handleUpdateStatus(selectedProvider.id, 'PENDING', 'Verifikasi ditangguhkan oleh Administrator.')}>
                      Disable Provider
                    </button>
                  ) : (
                    <button className="action-btn approve-btn" onClick={() => handleUpdateStatus(selectedProvider.id, 'APPROVED', 'Mitra diaktifkan kembali oleh Administrator.')}>
                      Approve Provider
                    </button>
                  )}
                  <button className="action-btn delete-btn" onClick={() => handleDeleteProvider(selectedProvider.id)}>
                    Delete Provider
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      <style>{`
        .admin-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          min-height: 100vh;
          background-color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* Sidebar Styling */
        .admin-sidebar {
          background-color: #0b1329;
          color: #ffffff;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          padding: 0 8px;
        }

        .logo-icon-container {
          background: rgba(59, 130, 246, 0.1);
          padding: 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-brand .logo-text {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
        }

        .sidebar-brand .logo-text span {
          color: #3b82f6;
        }

        .sidebar-brand .logo-subtext {
          display: block;
          font-size: 10px;
          color: #94a3b8;
          font-weight: 500;
        }

        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .menu-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          text-align: left;
          transition: all 0.2s ease;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .menu-btn:hover, .menu-btn.active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        .menu-btn.active {
          background: #3b82f6;
          color: #ffffff;
        }

        .sidebar-bottom {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sidebar-logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 14px;
          padding: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .sidebar-logout-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }

        /* Top Header */
        .admin-main-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .admin-top-header {
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .hamburger-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .notification-bell-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          padding: 4px;
        }

        .bell-badge {
          background-color: #ef4444;
          color: #ffffff;
          font-size: 9px;
          font-weight: 700;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          position: absolute;
          top: -2px;
          right: -2px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-profile-widget {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar-circle {
          width: 36px;
          height: 36px;
          background-color: #eff6ff;
          color: #3b82f6;
          font-size: 13px;
          font-weight: 700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-details {
          display: flex;
          flex-direction: column;
        }

        .profile-details .name {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }

        .profile-details .email {
          font-size: 11px;
          color: #64748b;
        }

        /* Content Layout Split */
        .admin-content-layout {
          display: flex;
          flex: 1;
          position: relative;
        }

        .admin-main-content {
          flex: 1;
          padding: 32px;
          min-width: 0; /* prevents flex blowout */
        }

        .verification-header-box {
          margin-bottom: 24px;
        }

        .verification-header-box h1 {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .verification-header-box p {
          font-size: 14px;
          color: #64748b;
        }

        /* Stats Row */
        .stats-cards-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .stat-card .card-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .stat-icon-bg {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon-bg.bg-blue { background-color: #eff6ff; }
        .stat-icon-bg.bg-orange { background-color: #fffbeb; }
        .stat-icon-bg.bg-green { background-color: #f0fdf4; }
        .stat-icon-bg.bg-red { background-color: #fef2f2; }

        .card-top .card-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }

        .stat-card .card-bottom h3 {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
        }

        .stat-card .card-bottom p {
          font-size: 11px;
          color: #94a3b8;
        }

        /* Alert Banners */
        .alert-message {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .success-alert {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .error-alert {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        /* Filter Tab Bar */
        .table-content-container {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          overflow: hidden;
        }

        .tab-filters-row {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          background-color: #fafafa;
          padding: 0 16px;
        }

        .tab-filter-btn {
          background: transparent;
          border: none;
          padding: 16px 20px;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .tab-filter-btn:hover {
          color: #0f172a;
        }

        .tab-filter-btn.active {
          color: #3b82f6;
        }

        .tab-filter-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #3b82f6;
        }

        .badge-count {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .badge-count.orange { background-color: #fffbeb; color: #f59e0b; }
        .badge-count.green { background-color: #f0fdf4; color: #10b981; }
        .badge-count.red { background-color: #fef2f2; color: #ef4444; }

        /* Filter Row */
        .filter-controls-row {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .search-input-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          background-color: #ffffff;
        }

        .search-input-box input {
          border: none;
          outline: none;
          font-size: 13px;
          color: #0f172a;
          width: 100%;
        }

        .filter-select {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #475569;
          background-color: #ffffff;
          outline: none;
          cursor: pointer;
        }

        .filter-btn-outline {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn-outline:hover {
          background-color: #f8fafc;
        }

        /* Providers Table */
        .providers-table-wrapper {
          overflow-x: auto;
        }

        .admin-providers-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-providers-table th {
          background-color: #f8fafc;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          border-bottom: 1px solid #e2e8f0;
        }

        .admin-providers-table td {
          padding: 16px;
          font-size: 13px;
          color: #0f172a;
          border-bottom: 1px solid #e2e8f0;
        }

        .admin-providers-table tr:hover {
          background-color: #f8fafc;
        }

        .admin-providers-table tr.row-selected {
          background-color: #eff6ff;
        }

        .provider-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-avatar-box {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          border: 1px solid #e2e8f0;
        }

        .provider-cell .name-text {
          font-weight: 700;
          color: #0f172a;
        }

        .provider-cell .category-subtext {
          font-size: 11px;
          color: #64748b;
          text-transform: capitalize;
        }

        .contact-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .contact-cell .pic-name {
          font-weight: 600;
        }

        .contact-cell .pic-email, .contact-cell .pic-phone {
          font-size: 11px;
          color: #64748b;
        }

        .status-pill-small {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          display: inline-block;
        }

        .status-pill-small.pending { background-color: #fffbeb; color: #d97706; }
        .status-pill-small.approved { background-color: #f0fdf4; color: #166534; }
        .status-pill-small.rejected { background-color: #fef2f2; color: #991b1b; }

        .detail-view-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #334155;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .detail-view-btn:hover {
          border-color: #94a3b8;
          background-color: #f8fafc;
        }

        /* Table Pagination Footer */
        .table-pagination-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background-color: #ffffff;
          border-top: 1px solid #e2e8f0;
        }

        .table-pagination-footer .count-label {
          font-size: 12px;
          color: #64748b;
        }

        .pagination-buttons {
          display: flex;
          gap: 4px;
        }

        .page-nav, .page-number {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          color: #334155;
        }

        .page-nav:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-number.active {
          background-color: #eff6ff;
          border-color: #3b82f6;
          color: #3b82f6;
        }

        /* Detail Provider Drawer */
        .detail-provider-drawer {
          width: 440px;
          background-color: #ffffff;
          border-left: 1px solid #e2e8f0;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 64px;
          height: calc(100vh - 64px);
          overflow-y: auto;
          z-index: 5;
        }

        .drawer-inner {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .drawer-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .drawer-header-row h2 {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }

        .drawer-header-row .close-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .drawer-header-row .close-btn:hover {
          background-color: #f1f5f9;
        }

        .drawer-profile-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }

        .profile-logo-avatar {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background-color: #3b82f6;
          color: #ffffff;
          font-size: 18px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .drawer-profile-card h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
        }

        .drawer-profile-card p {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 6px;
          text-transform: capitalize;
        }

        .drawer-status-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-block;
        }

        .drawer-status-badge.pending { background-color: #fffbeb; color: #d97706; }
        .drawer-status-badge.approved { background-color: #f0fdf4; color: #166534; }
        .drawer-status-badge.rejected { background-color: #fef2f2; color: #991b1b; }

        .drawer-section {
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 20px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .info-table {
          width: 100%;
          border-collapse: collapse;
        }

        .info-table td {
          padding: 6px 0;
          font-size: 13px;
          vertical-align: top;
        }

        .info-table .field-label {
          color: #64748b;
          width: 110px;
          font-weight: 500;
        }

        .info-table .field-value {
          color: #0f172a;
          font-weight: 600;
        }

        .social-link {
          color: #3b82f6;
          text-decoration: none;
        }

        .social-link:hover {
          text-decoration: underline;
        }

        /* Legal Docs */
        .document-list-rows {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .doc-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 12px;
          background-color: #ffffff;
        }

        .doc-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .doc-filename {
          font-size: 12px;
          font-weight: 700;
          color: #334155;
        }

        .doc-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 2px;
        }

        .doc-badge.uploaded { background-color: #f0fdf4; color: #166534; }
        .doc-badge.required { background-color: #fef2f2; color: #ef4444; }
        .doc-badge.optional { background-color: #f1f5f9; color: #64748b; }

        .doc-actions {
          display: flex;
          gap: 6px;
        }

        .doc-action-btn {
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
        }

        .doc-action-btn:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
        }

        /* Document Previewer Section */
        .preview-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .preview-controls {
          display: flex;
          gap: 4px;
        }

        .ctrl-btn {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #475569;
          text-decoration: none;
        }

        .ctrl-btn:hover {
          background-color: #f8fafc;
        }

        .doc-preview-container {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          height: 200px;
          overflow: hidden;
          position: relative;
        }

        .doc-preview-container iframe, .doc-preview-container img {
          width: 100%;
          height: 100%;
          border: none;
        }

        /* Catatan Admin */
        .admin-notes-textarea {
          width: 100%;
          height: 80px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          resize: none;
          box-sizing: border-box;
        }

        .admin-notes-textarea:focus {
          border-color: #3b82f6;
        }

        .char-count {
          display: block;
          text-align: right;
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
        }

        /* Timeline History */
        .timeline-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          padding-left: 16px;
          margin-top: 8px;
        }

        .timeline-container::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 4px;
          bottom: 4px;
          width: 2px;
          background-color: #e2e8f0;
        }

        .timeline-item {
          position: relative;
        }

        .timeline-badge-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #3b82f6;
          border: 2px solid #ffffff;
          position: absolute;
          left: -16px;
          top: 4px;
          box-shadow: 0 0 0 2px #eff6ff;
        }

        .timeline-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .timeline-status-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .history-pill {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
          text-transform: uppercase;
        }

        .history-pill.pending { background-color: #fffbeb; color: #d97706; }
        .history-pill.approved { background-color: #f0fdf4; color: #166534; }
        .history-pill.rejected { background-color: #fef2f2; color: #991b1b; }

        .timeline-time {
          font-size: 11px;
          color: #94a3b8;
        }

        .timeline-notes {
          font-size: 12px;
          color: #475569;
          margin: 0;
        }

        /* Drawer Actions Row */
        .drawer-actions-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }

        .drawer-actions-row .action-btn {
          padding: 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-align: center;
          border: none;
          transition: all 0.2s;
        }

        .drawer-actions-row .approve-btn {
          background-color: #10b981;
          color: #ffffff;
          grid-column: span 1;
        }

        .drawer-actions-row .approve-btn:hover {
          background-color: #059669;
        }

        .drawer-actions-row .reject-btn {
          background-color: #ef4444;
          color: #ffffff;
          grid-column: span 1;
        }

        .drawer-actions-row .reject-btn:hover {
          background-color: #dc2626;
        }

        .drawer-actions-row .disable-btn {
          background-color: #f59e0b;
          color: #ffffff;
          grid-column: span 1;
        }

        .drawer-actions-row .disable-btn:hover {
          background-color: #d97706;
        }

        .drawer-actions-row .delete-btn {
          background-color: #ffffff;
          border: 1px solid #ef4444;
          color: #ef4444;
          grid-column: span 1;
        }

        .drawer-actions-row .delete-btn:hover {
          background-color: #fef2f2;
        }

        .empty-table-state {
          text-align: center;
          padding: 60px !important;
          color: #94a3b8;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};
