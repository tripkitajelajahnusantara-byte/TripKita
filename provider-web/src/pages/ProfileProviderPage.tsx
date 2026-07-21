import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from '../components/Sidebar';
import { PROVINCES, CITIES_BY_PROVINCE } from '../utils/locationData';
import { 
  Edit3, 
  MapPin, 
  Star, 
  Award, 
  ShieldCheck, 
  CalendarDays, 
  Package, 
  DollarSign,
  AlertTriangle,
  FileCheck,
  Upload,
  Clock
} from 'lucide-react';
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

export const ProfileProviderPage: React.FC = () => {
  const { providerProfile, updateProfile } = useNavigation();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'bisnis' | 'kontak' | 'legal'>('bisnis');
  const [editFields, setEditFields] = useState({
    businessName: '',
    businessCategory: '',
    operationalProvince: '',
    operationalCity: '',
    description: '',
    picName: '',
    whatsapp: '',
    email: '',
    website: '',
    instagram: '',
    tiktok: '',
    npwp: '',
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
  });

  const lastContactUpdate = providerProfile?.contactLastUpdatedAt ? new Date(providerProfile.contactLastUpdatedAt) : null;
  const isContactLocked = lastContactUpdate 
    ? (new Date().getTime() - lastContactUpdate.getTime()) < 7 * 24 * 60 * 60 * 1000 
    : false;

  const getNextContactUpdateDate = () => {
    if (!lastContactUpdate) return null;
    return new Date(lastContactUpdate.getTime() + 7 * 24 * 60 * 60 * 1000);
  };

  const openEditModal = () => {
    if (providerProfile) {
      setEditFields({
        businessName: providerProfile.businessName,
        businessCategory: providerProfile.businessCategory,
        operationalProvince: providerProfile.operationalProvince || '',
        operationalCity: providerProfile.operationalCity,
        description: providerProfile.description || '',
        picName: providerProfile.picName,
        whatsapp: providerProfile.whatsapp,
        email: providerProfile.email,
        website: providerProfile.website || '',
        instagram: providerProfile.instagram || '',
        tiktok: providerProfile.tiktok || '',
        npwp: providerProfile.npwp || '',
        bankName: providerProfile.bankName || '',
        bankAccount: providerProfile.bankAccount || '',
        bankAccountName: providerProfile.bankAccountName || '',
      });
      setActiveModalTab('bisnis');
      setIsEditModalOpen(true);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(editFields);
      setIsEditModalOpen(false);
      alert('Profil berhasil diperbarui!');
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui profil');
    }
  };

  const providerName = providerProfile?.businessName || 'Wisata Nusantara';
  const categoryLabel = providerProfile?.businessCategory || 'Penyedia Jasa';

  useEffect(() => {
    async function loadStats() {
      try {
        const statsData = await request('/provider/dashboard/stats');
        setStats(statsData);
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    }
    loadStats();
  }, []);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeUploadField, setActiveUploadField] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const triggerUpload = (fieldName: string) => {
    setActiveUploadField(fieldName);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file melebihi batas maksimum 5MB");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await request('/provider/upload', {
        method: 'POST',
        body: formData,
      });
      if (res && res.documentPath) {
        await updateProfile({ [fieldName]: res.documentPath });
        alert("Dokumen berhasil diunggah!");
      }
    } catch (err: any) {
      alert(err.message || "Gagal mengunggah dokumen");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderDocBox = (
    label: string,
    activePath: string | undefined,
    pendingPath: string | undefined,
    status: string | undefined,
    rejectionReason: string | undefined,
    fieldName: string
  ) => {
    const isApproved = status === 'APPROVED' || (!pendingPath && activePath && providerProfile?.status === 'APPROVED');
    const isPending = !!pendingPath || status === 'PENDING';
    const isRejected = status === 'REJECTED';

    if (!activePath && !pendingPath) {
      return (
        <div className="doc-status-box upload-doc" onClick={() => triggerUpload(fieldName)}>
          <Upload size={18} color="#94a3b8" />
          <div>
            <strong>{label}</strong>
            <span style={{ color: '#94a3b8' }}>{isUploading && activeUploadField === fieldName ? 'Mengunggah...' : 'Belum Upload'}</span>
          </div>
        </div>
      );
    }

    if (isApproved) {
      return (
        <div className="doc-status-box success-doc">
          <FileCheck size={18} color="#10b981" />
          <div>
            <strong>{label}</strong>
            <span style={{ color: '#10b981' }}>Terverifikasi</span>
          </div>
          <div style={{ marginTop: '6px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <a href={`http://localhost:8080${activePath}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '9px' }}>Lihat</a>
            <span onClick={() => triggerUpload(fieldName)} style={{ color: 'var(--color-text-medium)', fontWeight: 600, fontSize: '9px', cursor: 'pointer' }}>Ganti</span>
          </div>
        </div>
      );
    }

    if (isPending) {
      return (
        <div className="doc-status-box pending-doc">
          <Clock size={18} color="#f59e0b" />
          <div>
            <strong>{label}</strong>
            <span style={{ color: '#f59e0b' }}>Menunggu</span>
          </div>
          <div style={{ fontSize: '8px', color: 'var(--color-text-light)', marginTop: '2px' }}>
            {pendingPath ? 'Review Berkas Baru' : 'Menunggu Verifikasi'}
          </div>
          <div style={{ marginTop: '6px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <a href={`http://localhost:8080${pendingPath || activePath}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '9px' }}>Lihat</a>
            {activePath && (
              <span onClick={() => triggerUpload(fieldName)} style={{ color: 'var(--color-text-medium)', fontWeight: 600, fontSize: '9px', cursor: 'pointer' }}>Ganti</span>
            )}
          </div>
        </div>
      );
    }

    if (isRejected) {
      return (
        <div className="doc-status-box pending-doc" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
          <AlertTriangle size={18} color="#ef4444" />
          <div>
            <strong style={{ color: '#ef4444' }}>{label}</strong>
            <span style={{ color: '#ef4444' }}>Ditolak</span>
          </div>
          {rejectionReason && (
            <div style={{ fontSize: '8px', color: '#dc2626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', marginTop: '2px' }} title={rejectionReason}>
              {rejectionReason}
            </div>
          )}
          <div style={{ marginTop: '6px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {activePath && (
              <a href={`http://localhost:8080${activePath}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '9px' }}>Lihat</a>
            )}
            <span onClick={() => triggerUpload(fieldName)} style={{ color: 'var(--color-text-medium)', fontWeight: 600, fontSize: '9px', cursor: 'pointer' }}>Ganti</span>
          </div>
        </div>
      );
    }

    return null;
  };

  const reviews = [
    { name: 'Anisa R.', date: '10 Des 2024', rating: 5, comment: 'Pelayanan sangat profesional! Guide sangat informatif dan ramah. Pasti akan kembali lagi.', trip: 'Raja Ampat Diving' },
    { name: 'Dimas P.', date: '5 Des 2024', rating: 5, comment: 'Pengalaman tak terlupakan. Semua sesuai deskripsi bahkan lebih dari ekspektasi.', trip: 'Bali Cultural Tour' },
    { name: 'Rika S.', date: '1 Dis 2024', rating: 4, comment: 'Overall bagus. Hanya penginapan bisa ditingkatkan kualitasnya sedikit.', trip: 'Komodo Adventure' },
  ];

  return (
    <div className="dashboard-layout animate-fade-in">
      <Sidebar />

      <main className="dashboard-main">
        {/* Header Block */}
        <header className="dashboard-header">
          <div className="header-welcome">
            <h1>Profil Provider</h1>
            <p>Kelola informasi bisnis dan akun Anda</p>
          </div>
          <div className="header-actions">
            <button className="edit-profile-btn" onClick={openEditModal}>
              <Edit3 size={16} /> Edit Profil
            </button>
          </div>
        </header>

        {/* Profile Grid Layout */}
        <div className="profile-grid">
          
          {/* Left Column: Visual Card Summary */}
          <div className="profile-left-column">
            
            {/* Visual Header Card */}
            <div className="summary-profile-card">
              <div className="card-banner" />
              <div className="profile-badge-area">
                <div className="profile-avatar-large">WN</div>
                <span className="status-badge-verified">✓ Terverifikasi</span>
              </div>
              <div className="profile-details-info">
                <h3>{providerName}</h3>
                <p className="tagline">Jelajahi keindahan Indonesia bersama kami</p>
                <div className="loc-rating">
                  <span className="loc"><MapPin size={12} /> Sorong, Papua Barat</span>
                  <span className="rating"><Star size={12} fill="#eab308" color="#eab308" /> 4.92 <span>(284 ulasan)</span></span>
                </div>
              </div>
            </div>

            {/* Achievements/Pencapaian Card */}
            <div className="profile-sub-card">
              <h4>Pencapaian</h4>
              <div className="badges-grid-pencapaian">
                <div className="achievement-badge green-badge">
                  <ShieldCheck size={14} /> Verified Partner
                </div>
                <div className="achievement-badge yellow-badge">
                  <Award size={14} /> Top Provider 2024
                </div>
                <div className="achievement-badge blue-badge">
                  <CalendarDays size={14} /> 100+ Bookings
                </div>
                <div className="achievement-badge purple-badge">
                  <Star size={14} /> 4.9+ Rating
                </div>
              </div>
            </div>            {/* Mini Stats Card */}
            <div className="profile-sub-card">
              <h4>Statistik Provider</h4>
              <div className="stats-box-grid">
                <div className="stat-box-item">
                  <Package size={16} color="#00a896" />
                  <div>
                    <strong>{stats ? stats.totalPackages : '...'}</strong>
                    <p>Total Paket</p>
                  </div>
                </div>
                <div className="stat-box-item">
                  <CalendarDays size={16} color="#3b82f6" />
                  <div>
                    <strong>{stats ? stats.totalBookings : '...'}</strong>
                    <p>Total Booking</p>
                  </div>
                </div>
                <div className="stat-box-item">
                  <Star size={16} color="#eab308" />
                  <div>
                    <strong>{stats ? stats.rating.toFixed(2) : '...'}</strong>
                    <p>Rating</p>
                  </div>
                </div>
                <div className="stat-box-item">
                  <DollarSign size={16} color="#8b5cf6" />
                  <div>
                    <strong style={{ fontSize: '12px' }}>
                      {stats ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.totalRevenue) : 'Rp ...'}
                    </strong>
                    <p>Total Pendapatan</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Reviews Card */}
            <div className="profile-sub-card">
              <h4>Ulasan Terbaru</h4>
              <div className="reviews-list">
                {reviews.map((rev, i) => (
                  <div key={i} className="review-log-item">
                    <div className="rev-log-header">
                      <strong>{rev.name}</strong>
                      <span className="rev-date">{rev.date}</span>
                    </div>
                    <div className="rev-log-stars">
                      {[...Array(5)].map((_, idx) => (
                        <Star 
                          key={idx} 
                          size={12} 
                          fill={idx < rev.rating ? "#eab308" : "transparent"} 
                          color="#eab308" 
                        />
                      ))}
                    </div>
                    <p className="rev-comment">"{rev.comment}"</p>
                    <span className="rev-trip-tag">{rev.trip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Forms Data */}
          <div className="profile-right-column">
            
            {/* Informasi Bisnis */}
            <div className="profile-data-block">
              <h3>Informasi Bisnis</h3>
              <div className="fields-grid">
                <div className="field-group">
                  <label>NAMA PROVIDER</label>
                  <span>{providerName}</span>
                </div>
                <div className="field-group">
                  <label>TAGLINE</label>
                  <span>Jelajahi keindahan Indonesia bersama kami</span>
                </div>
                <div className="field-group">
                  <label>KATEGORI</label>
                  <span>{categoryLabel}</span>
                </div>
                <div className="field-group">
                  <label>LOKASI OPERASIONAL</label>
                  <span>
                    {providerProfile?.operationalCity && providerProfile?.operationalProvince 
                      ? `${providerProfile.operationalCity}, ${providerProfile.operationalProvince}`
                      : providerProfile?.operationalCity || providerProfile?.operationalProvince || '—'}
                  </span>
                </div>
                <div className="field-group span-full">
                  <label>DESKRIPSI BISNIS</label>
                  <span className="block-text">
                    {providerProfile?.description || 'Belum ada deskripsi bisnis.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Kontak & Media Sosial */}
            <div className="profile-data-block">
              <h3>Kontak & Media Sosial</h3>
              <div className="fields-grid">
                <div className="field-group">
                  <label>NAMA PIC (PENANGGUNG JAWAB)</label>
                  <span>{providerProfile?.picName || '—'}</span>
                </div>
                <div className="field-group">
                  <label>WHATSAPP</label>
                  <span>{providerProfile?.whatsapp || '—'}</span>
                </div>
                <div className="field-group">
                  <label>EMAIL</label>
                  <span>{providerProfile?.email || '—'}</span>
                </div>
                <div className="field-group">
                  <label>WEBSITE</label>
                  <span>{providerProfile?.website || '—'}</span>
                </div>
                <div className="field-group">
                  <label>INSTAGRAM</label>
                  <span>{providerProfile?.instagram || '—'}</span>
                </div>
                <div className="field-group">
                  <label>TIKTOK</label>
                  <span>{providerProfile?.tiktok || '—'}</span>
                </div>
              </div>
              {isContactLocked && lastContactUpdate && (
                <div className="caution-box-banner" style={{ marginTop: '20px', backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
                  <AlertTriangle size={16} className="caution-icon" color="#3b82f6" />
                  <p>Kontak & Media Sosial terakhir diperbarui pada <strong>{formatDate(lastContactUpdate)}</strong>. Perubahan berikutnya baru dapat dilakukan pada <strong>{formatDate(getNextContactUpdateDate()!)}</strong>.</p>
                </div>
              )}
            </div>

            {/* Data Legal & Rekening */}
            <div className="profile-data-block">
              <div className="block-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3>Data Legal & Rekening</h3>
                  {providerProfile?.legalVerificationStatus && (
                    <span className={`status-pill ${
                      providerProfile.legalVerificationStatus === 'APPROVED' ? 'confirmed' :
                      providerProfile.legalVerificationStatus === 'PENDING' ? 'pending' : 'nonaktif'
                    }`} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                      {providerProfile.legalVerificationStatus === 'PENDING' ? 'Menunggu Verifikasi' :
                       providerProfile.legalVerificationStatus === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                    </span>
                  )}
                </div>
                <span className="warning-pill"><AlertTriangle size={12} /> Sensitif</span>
              </div>
              <div className="fields-grid">
                <div className="field-group">
                  <label>NPWP</label>
                  <span>{providerProfile?.npwp || '—'}</span>
                </div>
                <div className="field-group">
                  <label>NAMA BANK</label>
                  <span>{providerProfile?.bankName || '—'}</span>
                </div>
                <div className="field-group">
                  <label>NO. REKENING</label>
                  <span>{providerProfile?.bankAccount || '—'}</span>
                </div>
                <div className="field-group">
                  <label>NAMA PEMILIK REKENING</label>
                  <span>{providerProfile?.bankAccountName || '—'}</span>
                </div>
              </div>

              {providerProfile?.legalVerificationStatus === 'REJECTED' && providerProfile?.legalRejectionReason && (
                <div className="caution-box-banner" style={{ marginTop: '20px', backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
                  <AlertTriangle size={16} className="caution-icon" color="#ef4444" />
                  <p>Perubahan data legal/rekening ditolak oleh Admin: <strong>"{providerProfile.legalRejectionReason}"</strong>. Silakan periksa kembali data Anda.</p>
                </div>
              )}

              {providerProfile?.legalVerificationStatus === 'PENDING' && (
                <div className="caution-box-banner" style={{ marginTop: '20px', backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#b45309' }}>
                  <Clock size={16} className="caution-icon" color="#f59e0b" />
                  <div>
                    <strong>Perubahan sedang diverifikasi Admin:</strong>
                    <ul style={{ fontSize: '10px', marginTop: '4px', listStyleType: 'disc', paddingLeft: '16px', color: '#b45309' }}>
                      <li>NPWP: {providerProfile.pendingNpwp}</li>
                      <li>Bank: {providerProfile.pendingBankName}</li>
                      <li>No Rekening: {providerProfile.pendingBankAccount}</li>
                      <li>Pemilik: {providerProfile.pendingBankAccountName}</li>
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="caution-box-banner">
                <AlertTriangle size={16} className="caution-icon" />
                <p>Perubahan pada data rekening akan melalui proses verifikasi oleh Admin sebelum berlaku. Rekening lama tetap aktif sampai disetujui.</p>
              </div>
            </div>

            {/* Dokumen Verifikasi Status Boxes */}
            <div className="profile-data-block">
              <h3>Dokumen Verifikasi</h3>
              <div className="verif-docs-grid">
                {renderDocBox('KTP Pemilik', providerProfile?.ktpPath, providerProfile?.pendingKtpPath, providerProfile?.ktpStatus, providerProfile?.ktpRejectionReason, 'ktpPath')}
                {renderDocBox('NIB', providerProfile?.nibPath, providerProfile?.pendingNibPath, providerProfile?.nibStatus, providerProfile?.nibRejectionReason, 'nibPath')}
                {renderDocBox('SIUP', providerProfile?.documentPath, providerProfile?.pendingDocumentPath, providerProfile?.siupStatus, providerProfile?.siupRejectionReason, 'documentPath')}
                {renderDocBox('NPWP', providerProfile?.npwpPath, providerProfile?.pendingNpwpPath, providerProfile?.npwpDocStatus, providerProfile?.npwpDocRejectionReason, 'npwpPath')}
                {renderDocBox('Akta Pendirian', providerProfile?.aktaPath, providerProfile?.pendingAktaPath, providerProfile?.aktaStatus, providerProfile?.aktaRejectionReason, 'aktaPath')}
                {renderDocBox('Sertifikat Wisata', providerProfile?.sertifikatPath, providerProfile?.pendingSertifikatPath, providerProfile?.sertifikatStatus, providerProfile?.sertifikatRejectionReason, 'sertifikatPath')}

                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (activeUploadField) {
                      handleUpload(e, activeUploadField);
                    }
                  }}
                />

              </div>
            </div>
          </div>
        </div>
      </main>

      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header" style={{ flexShrink: 0, marginBottom: '16px' }}>
              <h2>Edit Profil Provider</h2>
              <button className="modal-close-btn" style={{ background: 'transparent', border: 0 }} onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            
            {/* Modal Tabs Header */}
            <div className="modal-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', gap: '16px', flexShrink: 0 }}>
              <button
                type="button"
                className={`tab-btn ${activeModalTab === 'bisnis' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('bisnis')}
                style={{
                  padding: '8px 4px',
                  border: 0,
                  borderBottom: activeModalTab === 'bisnis' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  background: 'transparent',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: activeModalTab === 'bisnis' ? 'var(--color-accent)' : 'var(--color-text-medium)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Informasi Bisnis
              </button>
              <button
                type="button"
                className={`tab-btn ${activeModalTab === 'kontak' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('kontak')}
                style={{
                  padding: '8px 4px',
                  border: 0,
                  borderBottom: activeModalTab === 'kontak' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  background: 'transparent',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: activeModalTab === 'kontak' ? 'var(--color-accent)' : 'var(--color-text-medium)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Kontak & Media Sosial
              </button>
              <button
                type="button"
                className={`tab-btn ${activeModalTab === 'legal' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('legal')}
                style={{
                  padding: '8px 4px',
                  border: 0,
                  borderBottom: activeModalTab === 'legal' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  background: 'transparent',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: activeModalTab === 'legal' ? 'var(--color-accent)' : 'var(--color-text-medium)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Data Legal & Rekening
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="modal-form" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              
              {/* Tab 1: Informasi Bisnis */}
              {activeModalTab === 'bisnis' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="input-group">
                    <label>Nama Provider / Bisnis</label>
                    <input 
                      type="text" 
                      value={editFields.businessName} 
                      onChange={(e) => setEditFields({ ...editFields, businessName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Kategori Bisnis</label>
                    <select 
                      value={editFields.businessCategory} 
                      onChange={(e) => setEditFields({ ...editFields, businessCategory: e.target.value })}
                      required
                    >
                      <option value="Open Trip">Open Trip</option>
                      <option value="Private Trip">Private Trip</option>
                      <option value="Corporate Trip / Gathering">Corporate Trip / Gathering</option>
                      <option value="Family Trip">Family Trip</option>
                      <option value="Honeymoon Trip">Honeymoon Trip</option>
                      <option value="City Tour">City Tour</option>
                      <option value="Cultural & Heritage Tour">Cultural & Heritage Tour</option>
                    </select>
                  </div>
                  <div className="input-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Provinsi Operasional</label>
                      <select
                        value={editFields.operationalProvince}
                        onChange={(e) => setEditFields({ ...editFields, operationalProvince: e.target.value, operationalCity: '' })}
                        required
                      >
                        <option value="">Pilih Provinsi</option>
                        {PROVINCES.map((prov) => (
                          <option key={prov} value={prov}>{prov}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Kota Operasional</label>
                      <select
                        value={editFields.operationalCity}
                        onChange={(e) => setEditFields({ ...editFields, operationalCity: e.target.value })}
                        disabled={!editFields.operationalProvince}
                        required
                      >
                        <option value="">Pilih Kota/Kabupaten</option>
                        {editFields.operationalProvince && 
                          (CITIES_BY_PROVINCE[editFields.operationalProvince] || []).map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Deskripsi Bisnis</label>
                    <textarea 
                      value={editFields.description} 
                      onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Kontak & Media Sosial */}
              {activeModalTab === 'kontak' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {isContactLocked && lastContactUpdate && (
                    <div className="caution-box-banner" style={{ margin: '0 0 8px 0', backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
                      <AlertTriangle size={16} className="caution-icon" color="#3b82f6" />
                      <p style={{ margin: 0 }}>Kontak & Media Sosial terakhir diperbarui pada <strong>{formatDate(lastContactUpdate)}</strong>. Perubahan berikutnya baru dapat dilakukan pada <strong>{formatDate(getNextContactUpdateDate()!)}</strong>.</p>
                    </div>
                  )}
                  
                  <div className="input-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Nama PIC</label>
                      <input 
                        type="text" 
                        value={editFields.picName} 
                        onChange={(e) => setEditFields({ ...editFields, picName: e.target.value })}
                        required
                        disabled={isContactLocked}
                        style={{ backgroundColor: isContactLocked ? '#f1f5f9' : '#ffffff', cursor: isContactLocked ? 'not-allowed' : 'text' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>WhatsApp</label>
                      <input 
                        type="text" 
                        value={editFields.whatsapp} 
                        onChange={(e) => setEditFields({ ...editFields, whatsapp: e.target.value })}
                        required
                        disabled={isContactLocked}
                        style={{ backgroundColor: isContactLocked ? '#f1f5f9' : '#ffffff', cursor: isContactLocked ? 'not-allowed' : 'text' }}
                      />
                    </div>
                  </div>

                  <div className="input-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Email Bisnis</label>
                      <input 
                        type="email" 
                        value={editFields.email} 
                        onChange={(e) => setEditFields({ ...editFields, email: e.target.value })}
                        required
                        disabled={isContactLocked}
                        style={{ backgroundColor: isContactLocked ? '#f1f5f9' : '#ffffff', cursor: isContactLocked ? 'not-allowed' : 'text' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Website</label>
                      <input 
                        type="text" 
                        value={editFields.website} 
                        onChange={(e) => setEditFields({ ...editFields, website: e.target.value })}
                        disabled={isContactLocked}
                        style={{ backgroundColor: isContactLocked ? '#f1f5f9' : '#ffffff', cursor: isContactLocked ? 'not-allowed' : 'text' }}
                      />
                    </div>
                  </div>

                  <div className="input-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Instagram</label>
                      <input 
                        type="text" 
                        value={editFields.instagram} 
                        onChange={(e) => setEditFields({ ...editFields, instagram: e.target.value })}
                        disabled={isContactLocked}
                        style={{ backgroundColor: isContactLocked ? '#f1f5f9' : '#ffffff', cursor: isContactLocked ? 'not-allowed' : 'text' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>TikTok</label>
                      <input 
                        type="text" 
                        value={editFields.tiktok} 
                        onChange={(e) => setEditFields({ ...editFields, tiktok: e.target.value })}
                        disabled={isContactLocked}
                        style={{ backgroundColor: isContactLocked ? '#f1f5f9' : '#ffffff', cursor: isContactLocked ? 'not-allowed' : 'text' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Data Legal & Rekening */}
              {activeModalTab === 'legal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="input-group">
                    <label>NPWP Bisnis</label>
                    <input 
                      type="text" 
                      value={editFields.npwp} 
                      onChange={(e) => setEditFields({ ...editFields, npwp: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Nama Bank</label>
                    <input 
                      type="text" 
                      value={editFields.bankName} 
                      onChange={(e) => setEditFields({ ...editFields, bankName: e.target.value })}
                    />
                  </div>
                  <div className="input-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>No. Rekening</label>
                      <input 
                        type="text" 
                        value={editFields.bankAccount} 
                        onChange={(e) => setEditFields({ ...editFields, bankAccount: e.target.value })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Nama Pemilik Rekening</label>
                      <input 
                        type="text" 
                        value={editFields.bankAccountName} 
                        onChange={(e) => setEditFields({ ...editFields, bankAccountName: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="caution-box-banner" style={{ margin: '8px 0 0 0' }}>
                    <AlertTriangle size={16} className="caution-icon" />
                    <p style={{ margin: 0 }}>Perubahan pada data legal & rekening akan melalui proses verifikasi oleh Admin sebelum berlaku. Data rekening aktif saat ini tetap digunakan hingga disetujui.</p>
                  </div>
                </div>
              )}

              <div className="modal-footer" style={{ flexShrink: 0, marginTop: '20px' }}>
                <button type="button" className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>Batal</button>
                <button type="submit" className="save-btn">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .edit-profile-btn {
          background-color: var(--color-accent);
          color: #ffffff;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .edit-profile-btn:hover {
          background-color: var(--color-accent-hover);
        }

        .profile-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 24px;
        }

        /* Left Column Cards */
        .profile-left-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .summary-profile-card {
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          position: relative;
        }

        .card-banner {
          height: 100px;
          background: linear-gradient(135deg, var(--color-primary-medium), var(--color-accent));
        }

        .profile-badge-area {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 0 20px;
          margin-top: -40px;
          margin-bottom: 16px;
        }

        .profile-avatar-large {
          width: 80px;
          height: 80px;
          background-color: var(--color-accent);
          color: #ffffff;
          border-radius: 50%;
          border: 4px solid #ffffff;
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-details-info {
          padding: 0 20px 20px 20px;
        }

        .profile-details-info h3 {
          font-size: 18px;
          margin-bottom: 4px;
        }

        .profile-details-info .tagline {
          font-size: 12px;
          color: var(--color-text-medium);
          margin-bottom: 12px;
        }

        .loc-rating {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 11px;
          color: var(--color-text-light);
        }

        .loc, .rating {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .rating span {
          color: var(--color-text-medium);
        }

        .profile-sub-card {
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 20px;
        }

        .profile-sub-card h4 {
          font-size: 13px;
          margin-bottom: 16px;
        }

        .badges-grid-pencapaian {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .achievement-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .green-badge { background-color: #ecfdf5; color: #10b981; }
        .yellow-badge { background-color: #fefce8; color: #eab308; }
        .blue-badge { background-color: #eff6ff; color: #3b82f6; }
        .purple-badge { background-color: #faf5ff; color: #8b5cf6; }

        .stats-box-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .stat-box-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: var(--color-bg-light);
          border-radius: var(--radius-md);
        }

        .stat-box-item strong {
          font-size: 14px;
          display: block;
          line-height: 1.2;
        }

        .stat-box-item p {
          font-size: 10px;
          color: var(--color-text-light);
        }

        /* Review Logs */
        .reviews-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .review-log-item {
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 12px;
        }

        .review-log-item:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .rev-log-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        .rev-date {
          color: var(--color-text-light);
          font-size: 10px;
        }

        .rev-log-stars {
          display: flex;
          gap: 2px;
          margin: 4px 0;
        }

        .rev-comment {
          font-size: 11px;
          color: var(--color-text-medium);
          line-height: 1.4;
          margin-bottom: 6px;
        }

        .rev-trip-tag {
          font-size: 9px;
          font-weight: 600;
          color: var(--color-accent);
          background-color: var(--color-accent-light);
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Right Column Form Blocks */
        .profile-right-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .profile-data-block {
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 28px;
        }

        .profile-data-block h3 {
          font-size: 16px;
          margin-bottom: 20px;
          border-left: 3px solid var(--color-accent);
          padding-left: 10px;
        }

        .block-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .block-header-row h3 {
          margin-bottom: 0;
        }

        .warning-pill {
          background-color: #fffbeb;
          color: #d97706;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .field-group.span-full {
          grid-column: span 2;
        }

        .field-group label {
          font-size: 10px;
          font-weight: 700;
          color: var(--color-text-light);
          letter-spacing: 0.5px;
        }

        .field-group span {
          font-size: 13px;
          color: var(--color-text-dark);
          font-weight: 500;
        }

        .field-group .block-text {
          line-height: 1.6;
          color: var(--color-text-medium);
        }

        .caution-box-banner {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          gap: 12px;
          margin-top: 20px;
          font-size: 11px;
          color: #b45309;
          line-height: 1.5;
        }

        .caution-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* Verification docs status list */
        .verif-docs-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }

        .doc-status-box {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .doc-status-box strong {
          font-size: 11px;
          display: block;
          margin-bottom: 2px;
        }

        .doc-status-box span {
          font-size: 9px;
          font-weight: 600;
        }

        .success-doc {
          border-color: #a7f3d0;
          background-color: #ecfdf5;
        }

        .success-doc span {
          color: #10b981;
        }

        .pending-doc {
          border-color: #fde68a;
          background-color: #fffbeb;
        }

        .pending-doc span {
          color: #f59e0b;
        }

        .upload-doc {
          border-style: dashed;
        }

        .upload-doc:hover {
          border-color: var(--color-accent);
          background-color: var(--color-accent-light);
        }

        .upload-doc span {
          color: var(--color-text-light);
        }

        @media (max-width: 1024px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
          .verif-docs-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Modal styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #ffffff;
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 540px;
          padding: 28px;
          box-shadow: var(--shadow-premium);
          border: 1px solid var(--color-border);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 12px;
        }

        .modal-header h2 {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-primary-dark);
          margin: 0;
        }

        .modal-close-btn {
          font-size: 24px;
          color: var(--color-text-light);
          cursor: pointer;
          line-height: 1;
        }

        .modal-close-btn:hover {
          color: #ef4444 !important;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-form .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .modal-form label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-medium);
          text-align: left;
        }

        .modal-form input, .modal-form select, .modal-form textarea {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          font-size: 13px;
          outline: none;
          transition: var(--transition-fast);
        }

        .modal-form input:focus, .modal-form select:focus, .modal-form textarea:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(0, 168, 150, 0.15);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
          border-top: 1px solid var(--color-border);
          padding-top: 16px;
        }

        .modal-footer .cancel-btn {
          padding: 10px 18px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-medium);
          background: transparent;
          cursor: pointer;
        }

        .modal-footer .cancel-btn:hover {
          background-color: var(--color-bg-light);
        }

        .modal-footer .save-btn {
          padding: 10px 18px;
          border-radius: var(--radius-md);
          background-color: var(--color-accent);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          border: 0;
          cursor: pointer;
        }

        .modal-footer .save-btn:hover {
          background-color: var(--color-accent-hover);
        }
      `}</style>
    </div>
  );
};
