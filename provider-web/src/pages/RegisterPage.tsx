import React, { useState, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Check, Upload, ArrowRight, ArrowLeft } from 'lucide-react';
import { PROVINCES, CITIES_BY_PROVINCE } from '../utils/locationData';

export const RegisterPage: React.FC = () => {
  const { 
    registerStep, 
    setRegisterStep, 
    registerData, 
    updateRegisterData, 
    navigateTo 
  } = useNavigation();

  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploading, setUploading] = useState<'document' | 'ktp' | 'nib' | 'npwp' | 'akta' | 'sertifikat' | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const fileInputRefKtp = useRef<HTMLInputElement>(null);
  const fileInputRefSiup = useRef<HTMLInputElement>(null);
  const fileInputRefNib = useRef<HTMLInputElement>(null);
  const fileInputRefNpwp = useRef<HTMLInputElement>(null);
  const fileInputRefAkta = useRef<HTMLInputElement>(null);
  const fileInputRefSertifikat = useRef<HTMLInputElement>(null);

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!registerData.businessName) errors.businessName = 'Nama bisnis harus diisi';
    if (!registerData.businessCategory) errors.businessCategory = 'Kategori bisnis harus dipilih';
    if (!registerData.operationalProvince) errors.operationalProvince = 'Provinsi operasional harus dipilih';
    if (!registerData.operationalCity) errors.operationalCity = 'Kota/Kabupaten operasional harus dipilih';
    if (!registerData.ktpPath) errors.ktp = 'KTP Pemilik harus diunggah';
    if (!registerData.nibPath) errors.nib = 'NIB harus diunggah';
    
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!registerData.picName) errors.picName = 'Nama PIC harus diisi';
    if (!registerData.email) {
      errors.email = 'Email harus diisi';
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      errors.email = 'Format email tidak valid';
    }
    if (!registerData.whatsapp) {
      errors.whatsapp = 'Nomor WhatsApp harus diisi';
    } else {
      const cleaned = registerData.whatsapp.replace(/\s+/g, '');
      if (!cleaned.startsWith('+62')) {
        errors.whatsapp = 'Nomor WhatsApp harus diawali dengan +62';
      } else if (cleaned.length < 11) {
        errors.whatsapp = 'Nomor WhatsApp minimal 11 karakter (contoh: +6281234567890)';
      }
    }
    if (!registerData.password || registerData.password.length < 8) {
      errors.password = 'Password minimal harus 8 karakter';
    }
    if (!registerData.agreeToTerms) errors.agree = 'Anda harus menyetujui Syarat & Ketentuan';
    if (!registerData.instagram && !registerData.tiktok) {
      errors.social = 'Harus mencantumkan minimal satu akun media sosial (Instagram atau TikTok)';
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setRegisterStep(2);
      setLocalErrors({});
    }
  };

  const { registerProvider } = useNavigation();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      try {
        setLocalErrors({});
        await registerProvider();
        setIsSuccess(true);
      } catch (err: any) {
        setLocalErrors({ api: err.message || 'Pendaftaran gagal' });
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'ktp' | 'nib' | 'npwp' | 'akta' | 'sertifikat') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLocalErrors((prev) => ({ ...prev, [type]: 'Ukuran file melebihi batas 5MB' }));
      return;
    }

    setUploading(type);
    setLocalErrors((prev) => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8080/api/v1/public/auth/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal mengupload file');
      }

      const res = await response.json();
      if (type === 'document') {
        updateRegisterData({ documentUploaded: true, documentPath: res.documentPath });
      } else if (type === 'ktp') {
        updateRegisterData({ ktpPath: res.documentPath });
      } else if (type === 'nib') {
        updateRegisterData({ nibPath: res.documentPath });
      } else if (type === 'npwp') {
        updateRegisterData({ npwpPath: res.documentPath });
      } else if (type === 'akta') {
        updateRegisterData({ aktaPath: res.documentPath });
      } else if (type === 'sertifikat') {
        updateRegisterData({ sertifikatPath: res.documentPath });
      }
    } catch (err: any) {
      setLocalErrors((prev) => ({ ...prev, [type]: err.message || 'Gagal mengupload file' }));
    } finally {
      setUploading(null);
    }
  };

  if (isSuccess) {
    return (
      <div className="register-container animate-fade-in">
        <div className="register-grid-layout">
          {/* Left Info Sidebar */}
          <div className="register-sidebar">
            <div className="sidebar-logo">
              <span className="logo-brand">
                <span className="logo-icon">🗺️</span>
                <span className="logo-text">Trip<span>Kita</span></span>
                <span className="logo-badge">Partner</span>
              </span>
            </div>

            <div className="sidebar-content">
              <h2 className="sidebar-title">
                Mulai Perjalanan <br />
                <span>Bisnis Digital</span> <br />
                Anda Hari Ini
              </h2>
              <p className="sidebar-subtitle">
                Bergabung dengan ribuan provider wisata yang sudah berkembang bersama TripKita. Daftar gratis dan mulai terima booking hari ini.
              </p>
            </div>
          </div>

          {/* Right Success Screen */}
          <div className="register-form-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="form-inner-box" style={{ maxWidth: '440px' }}>
              <div className="form-body success-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
                <div className="success-icon-wrapper" style={{ margin: '0 auto 24px', width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={36} color="#10b981" />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '12px' }}>Pendaftaran Berhasil!</h2>
                <p style={{ fontSize: '14px', color: 'var(--color-text-medium)', lineHeight: 1.6, marginBottom: '24px' }}>
                  Terima kasih telah mendaftar sebagai partner TripKita. Akun Anda saat ini <strong>sedang menunggu verifikasi</strong> dari tim Admin kami.
                </p>
                <div style={{ backgroundColor: 'var(--color-bg-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'left', marginBottom: '28px', fontSize: '13px', color: 'var(--color-text-medium)', lineHeight: 1.6 }}>
                  <p style={{ fontWeight: 600, color: 'var(--color-primary-medium)', marginBottom: '8px' }}>Langkah Selanjutnya:</p>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Tim kami akan memverifikasi dokumen legalitas yang Anda unggah.</li>
                    <li>Proses verifikasi biasanya memakan waktu maksimal 1x24 jam.</li>
                    <li>Setelah disetujui, Anda dapat masuk ke dashboard menggunakan email dan password yang telah Anda daftarkan.</li>
                  </ul>
                </div>
                <button className="submit-form-btn" onClick={() => navigateTo('masuk')} style={{ width: '100%', cursor: 'pointer' }}>
                  Ke Halaman Masuk
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container animate-fade-in">
      <div className="register-grid-layout">
        {/* Left Info Sidebar */}
        <div className="register-sidebar">
          <div className="sidebar-logo">
            <span className="logo-brand">
              <span className="logo-icon">🗺️</span>
              <span className="logo-text">Trip<span>Kita</span></span>
              <span className="logo-badge">Partner</span>
            </span>
          </div>

          <div className="sidebar-content">
            <h2 className="sidebar-title">
              Mulai Perjalanan <br />
              <span>Bisnis Digital</span> <br />
              Anda Hari Ini
            </h2>
            <p className="sidebar-subtitle">
              Bergabung dengan ribuan provider wisata yang sudah berkembang bersama TripKita. Daftar gratis dan mulai terima booking hari ini.
            </p>

            <ul className="benefits-checklist">
              <li>
                <div className="chk-icon"><Check size={14} color="#00a896" /></div>
                <span>Gratis daftar, tanpa biaya setup</span>
              </li>
              <li>
                <div className="chk-icon"><Check size={14} color="#00a896" /></div>
                <span>Terima booking dari jutaan traveler</span>
              </li>
              <li>
                <div className="chk-icon"><Check size={14} color="#00a896" /></div>
                <span>Dashboard manajemen terintegrasi</span>
              </li>
              <li>
                <div className="chk-icon"><Check size={14} color="#00a896" /></div>
                <span>Pembayaran aman dan tepat waktu</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="register-form-area">
          <div className="form-inner-box">
            {/* Step Wizard Header */}
            <div className="step-wizard-indicator">
              <div className={`step-badge ${registerStep === 1 ? 'active' : 'completed'}`}>
                <span>1</span> Info Bisnis
              </div>
              <div className="step-connector"></div>
              <div className={`step-badge ${registerStep === 2 ? 'active' : ''}`}>
                <span>2</span> Info Akun & Sosmed
              </div>
            </div>

            {/* Step 1: Info Bisnis */}
            {registerStep === 1 ? (
              <form className="form-body" onSubmit={handleNext}>
                <div className="form-header">
                  <h2>Informasi Bisnis</h2>
                  <p>Ceritakan tentang bisnis wisata Anda</p>
                </div>

                <div className="input-group">
                  <label>Nama Provider / Bisnis *</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Bali Adventure Tours" 
                    value={registerData.businessName}
                    onChange={(e) => updateRegisterData({ businessName: e.target.value })}
                  />
                  {localErrors.businessName && <span className="error-text">{localErrors.businessName}</span>}
                </div>

                <div className="input-group">
                  <label>Kategori Bisnis *</label>
                  <select 
                    value={registerData.businessCategory} 
                    onChange={(e) => updateRegisterData({ businessCategory: e.target.value })}
                  >
                    <option value="">Pilih kategori bisnis Anda</option>
                    <option value="Open Trip">Open Trip</option>
                    <option value="Private Trip">Private Trip</option>
                    <option value="Corporate Trip / Gathering">Corporate Trip / Gathering</option>
                    <option value="Family Trip">Family Trip</option>
                    <option value="Honeymoon Trip">Honeymoon Trip</option>
                    <option value="City Tour">City Tour</option>
                    <option value="Cultural & Heritage Tour">Cultural & Heritage Tour</option>
                  </select>
                  {localErrors.businessCategory && <span className="error-text">{localErrors.businessCategory}</span>}
                </div>

                <div className="input-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Provinsi Operasional *</label>
                    <select
                      value={registerData.operationalProvince || ''}
                      onChange={(e) => {
                        updateRegisterData({ 
                          operationalProvince: e.target.value,
                          operationalCity: ''
                        });
                      }}
                    >
                      <option value="">Pilih Provinsi</option>
                      {PROVINCES.map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                    {localErrors.operationalProvince && <span className="error-text">{localErrors.operationalProvince}</span>}
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Kota Operasional *</label>
                    <select
                      value={registerData.operationalCity || ''}
                      onChange={(e) => updateRegisterData({ operationalCity: e.target.value })}
                      disabled={!registerData.operationalProvince}
                    >
                      <option value="">Pilih Kota/Kabupaten</option>
                      {registerData.operationalProvince && 
                        (CITIES_BY_PROVINCE[registerData.operationalProvince] || []).map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))
                      }
                    </select>
                    {localErrors.operationalCity && <span className="error-text">{localErrors.operationalCity}</span>}
                  </div>
                </div>

                <div className="input-group">
                  <label>Deskripsi Singkat</label>
                  <textarea 
                    placeholder="Ceritakan tentang layanan wisata yang Anda tawarkan..." 
                    rows={3}
                    value={registerData.description}
                    onChange={(e) => updateRegisterData({ description: e.target.value })}
                  />
                </div>
                              {/* Upload Dokumen Section */}
                <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '16px' }}>Upload Dokumen Legalitas</h3>
                  
                  {/* Mandatory KTP block */}
                  <div className="input-group" style={{ marginBottom: '20px' }}>
                    <label>KTP Pemilik <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="file" ref={fileInputRefKtp} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'ktp')} />
                    <div className={`upload-zone-small ${registerData.ktpPath ? 'uploaded' : ''}`} onClick={() => fileInputRefKtp.current?.click()} style={{ padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Upload size={20} />
                      <span>{uploading === 'ktp' ? 'Uploading...' : registerData.ktpPath ? '✓ KTP Uploaded' : 'KTP_PIC.jpg (Wajib)'}</span>
                    </div>
                    {localErrors.ktp && <span className="error-text">{localErrors.ktp}</span>}
                  </div>

                  {/* Mandatory NIB block */}
                  <div className="input-group" style={{ marginBottom: '20px' }}>
                    <label>NIB (Nomor Induk Berusaha) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="file" ref={fileInputRefNib} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'nib')} />
                    <div className={`upload-zone-small ${registerData.nibPath ? 'uploaded' : ''}`} onClick={() => fileInputRefNib.current?.click()} style={{ padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Upload size={20} />
                      <span>{uploading === 'nib' ? 'Uploading...' : registerData.nibPath ? '✓ NIB Uploaded' : 'NIB.pdf (Wajib)'}</span>
                    </div>
                    {localErrors.nib && <span className="error-text">{localErrors.nib}</span>}
                  </div>

                  {/* Informational Notice */}
                  <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px', fontSize: '12px', color: '#1e3a8a', lineHeight: '1.5', marginBottom: '20px' }}>
                    <strong>💡 Info Tambahan Dokumen:</strong> Mengunggah dokumen legalitas bisnis tambahan seperti SIUP, NPWP, Akta Pendirian, dan Sertifikat Pariwisata membantu meningkatkan kredibilitas provider, memperkuat proses verifikasi usaha, meningkatkan kepercayaan wisatawan, serta meningkatkan visibilitas di platform TripKita.
                  </div>

                  {/* Optional Docs Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    
                    {/* SIUP (Optional) */}
                    <div className="input-group">
                      <label>SIUP (Optional)</label>
                      <input type="file" ref={fileInputRefSiup} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'document')} />
                      <div className={`upload-zone-small ${registerData.documentPath ? 'uploaded' : ''}`} onClick={() => fileInputRefSiup.current?.click()}>
                        <Upload size={16} />
                        <span>{uploading === 'document' ? 'Uploading...' : registerData.documentPath ? '✓ SIUP Uploaded' : 'SIUP.pdf'}</span>
                      </div>
                      {localErrors.document && <span className="error-text">{localErrors.document}</span>}
                    </div>

                    {/* NPWP (Optional) */}
                    <div className="input-group">
                      <label>NPWP (Optional)</label>
                      <input type="file" ref={fileInputRefNpwp} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'npwp')} />
                      <div className={`upload-zone-small ${registerData.npwpPath ? 'uploaded' : ''}`} onClick={() => fileInputRefNpwp.current?.click()}>
                        <Upload size={16} />
                        <span>{uploading === 'npwp' ? 'Uploading...' : registerData.npwpPath ? '✓ NPWP Uploaded' : 'NPWP.pdf'}</span>
                      </div>
                      {localErrors.npwp && <span className="error-text">{localErrors.npwp}</span>}
                    </div>

                    {/* Akta Pendirian (Optional) */}
                    <div className="input-group">
                      <label>Akta Pendirian (Optional)</label>
                      <input type="file" ref={fileInputRefAkta} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'akta')} />
                      <div className={`upload-zone-small ${registerData.aktaPath ? 'uploaded' : ''}`} onClick={() => fileInputRefAkta.current?.click()}>
                        <Upload size={16} />
                        <span>{uploading === 'akta' ? 'Uploading...' : registerData.aktaPath ? '✓ Akta Uploaded' : 'Akta.pdf'}</span>
                      </div>
                      {localErrors.akta && <span className="error-text">{localErrors.akta}</span>}
                    </div>

                    {/* Sertifikat Wisata (Optional) */}
                    <div className="input-group">
                      <label>Sertifikat Wisata (Optional)</label>
                      <input type="file" ref={fileInputRefSertifikat} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'sertifikat')} />
                      <div className={`upload-zone-small ${registerData.sertifikatPath ? 'uploaded' : ''}`} onClick={() => fileInputRefSertifikat.current?.click()}>
                        <Upload size={16} />
                        <span>{uploading === 'sertifikat' ? 'Uploading...' : registerData.sertifikatPath ? '✓ Sertifikat Uploaded' : 'Sertifikat.pdf'}</span>
                      </div>
                      {localErrors.sertifikat && <span className="error-text">{localErrors.sertifikat}</span>}
                    </div>

                  </div>
                </div>

                <button type="submit" className="submit-form-btn">
                  Lanjutkan <ArrowRight size={16} />
                </button>

                <p className="login-prompt">
                  Sudah punya akun? <span onClick={() => navigateTo('masuk')}>Masuk di sini</span>
                </p>
              </form>
            ) : (
              /* Step 2: Info Akun & Sosmed */
              <form className="form-body" onSubmit={handleRegister}>
                <div className="form-header">
                  <h2>Buat Akun & Sosmed</h2>
                  <p>Lengkapi data untuk mengakses dashboard</p>
                </div>

                {localErrors.api && <div className="error-alert">{localErrors.api}</div>}
                {localErrors.social && <div className="error-alert">{localErrors.social}</div>}

                <div className="input-group">
                  <label>Nama PIC (Penanggung Jawab) *</label>
                  <input 
                    type="text" 
                    placeholder="Nama lengkap PIC" 
                    value={registerData.picName}
                    onChange={(e) => updateRegisterData({ picName: e.target.value })}
                  />
                  {localErrors.picName && <span className="error-text">{localErrors.picName}</span>}
                </div>

                <div className="input-group">
                  <label>Email Bisnis *</label>
                  <input 
                    type="email" 
                    placeholder="email@bisnis.com" 
                    value={registerData.email}
                    onChange={(e) => updateRegisterData({ email: e.target.value })}
                  />
                  {localErrors.email && <span className="error-text">{localErrors.email}</span>}
                </div>

                <div className="input-group">
                  <label>Nomor WhatsApp *</label>
                  <input 
                    type="text" 
                    placeholder="+62 812 3456 7890" 
                    value={registerData.whatsapp}
                    onChange={(e) => updateRegisterData({ whatsapp: e.target.value })}
                  />
                  {localErrors.whatsapp && <span className="error-text">{localErrors.whatsapp}</span>}
                </div>

                {/* Social Media Links */}
                <div style={{ marginTop: '16px', marginBottom: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '12px' }}>Media Sosial (Wajib Minimal Satu)</h3>
                  
                  <div className="input-group">
                    <label>Instagram URL</label>
                    <div className="input-with-icon">
                      <svg className="field-icon" style={{ left: '14px', position: 'absolute', color: 'var(--color-text-light)', width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                      <input 
                        type="text" 
                        placeholder="https://instagram.com/akunanda" 
                        style={{ paddingLeft: '42px' }}
                        value={registerData.instagram || ''}
                        onChange={(e) => updateRegisterData({ instagram: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>TikTok URL</label>
                    <div className="input-with-icon">
                      <svg className="field-icon" style={{ left: '14px', position: 'absolute', color: 'var(--color-text-light)', width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
                      <input 
                        type="text" 
                        placeholder="https://tiktok.com/@akunanda" 
                        style={{ paddingLeft: '42px' }}
                        value={registerData.tiktok || ''}
                        onChange={(e) => updateRegisterData({ tiktok: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  <label>Password *</label>
                  <input 
                    type="password" 
                    placeholder="Min. 8 karakter" 
                    value={registerData.password || ''}
                    onChange={(e) => updateRegisterData({ password: e.target.value })}
                  />
                  {localErrors.password && <span className="error-text">{localErrors.password}</span>}
                </div>

                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    checked={registerData.agreeToTerms}
                    onChange={(e) => updateRegisterData({ agreeToTerms: e.target.checked })}
                  />
                  <label htmlFor="terms">
                    Saya menyetujui <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTermsModal(true); }} style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Syarat & Ketentuan dan Kebijakan Privasi</span> TripKita Partner
                  </label>
                </div>
                {localErrors.agree && <span className="error-text block-error">{localErrors.agree}</span>}

                <div className="form-actions-row">
                  <button type="button" className="back-form-btn" onClick={() => setRegisterStep(1)}>
                    <ArrowLeft size={16} /> Kembali
                  </button>
                  <button type="submit" className="submit-form-btn">
                    Daftar Sekarang
                  </button>
                </div>

                <p className="login-prompt">
                  Sudah punya akun? <span onClick={() => navigateTo('masuk')}>Masuk di sini</span>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {showTermsModal && (
        <div className="modal-overlay">
          <div className="modal-content premium-terms-modal">
            <div className="modal-header">
              <h2>Syarat & Ketentuan dan Kebijakan Privasi TripKita</h2>
              <button 
                type="button"
                className="close-x-btn" 
                onClick={() => setShowTermsModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body scrollable-terms-body">
              <h3>SYARAT DAN KETENTUAN LAYANAN MITRA TRIPKITA</h3>
              <p>Selamat datang di TripKita. Syarat & Ketentuan Layanan Mitra ("Ketentuan") ini mengatur hubungan hukum antara TripKita (selaku pemilik dan pengelola platform) dengan Mitra Jasa Pariwisata ("Mitra" atau "Anda") yang menggunakan platform kami untuk menawarkan jasa dan layanan pariwisata. Dengan mendaftar, mengakses, atau menggunakan layanan kami, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui Ketentuan ini.</p>
              
              <strong>1. KETENTUAN UMUM</strong>
              <p>1.1 Kemitraan: Kemitraan ini adalah hubungan kontraktual antara pihak akademis/independen dan bukan merupakan hubungan kerja, keagenan, waralaba, atau kemitraan hukum (partnership) lainnya.<br/>
              1.2 Perubahan Ketentuan: TripKita berhak untuk mengubah Ketentuan ini sewaktu-waktu. Perubahan akan diumumkan melalui platform dan akan berlaku efektif 7 (tujuh) hari setelah pengumuman.<br/>
              1.3 Layanan Platform: TripKita menyediakan platform online sebagai sarana bagi Mitra untuk menawarkan dan menjual paket perjalanan wisata kepada pengguna akhir.</p>

              <strong>2. PENDAFTARAN MITRA DAN AKUN</strong>
              <p>2.1 Persyaratan Pendaftaran: Mitra wajib mengunggah dokumen legalitas sebagai berikut:<br/>
              • KTP Pemilik (Wajib)<br/>
              • NIB (Wajib)<br/>
              Opsional: NPWP, Akta Pendirian, Sertifikat Wisata / Sertifikasi Guide.<br/>
              Kategori bisnis yang didukung meliputi: Open Trip, Private Trip, Corporate Trip / Gathering, Family Trip, Honeymoon Trip, City Tour, Cultural & Heritage Tour.<br/>
              2.2 Keakuratan Informasi: Mitra wajib memberikan informasi yang akurat, lengkap, dan terbaru selama proses pendaftaran dan pemeliharaan akun demi kenyamanan pengguna dan kelancaran program.<br/>
              2.3 Keamanan Akun: Mitra bertanggung jawab penuh atas kerahasiaan kredensial akun dan setiap aktivitas yang terjadi di bawah akun Mitra.<br/>
              2.4 Penolakan Pendaftaran: TripKita berhak menolak pendaftaran Mitra tanpa kewajiban memberikan alasan.</p>

              <strong>3. HAK DAN KEWAJIBAN MITRA</strong>
              <p>3.1 Penyediaan Layanan: Mitra wajib menyediakan layanan pariwisata yang ditawarkan secara profesional dan sesuai dengan deskripsi paket yang dipublikasikan. Mitra wajib memastikan keselamatan dan kenyamanan pengguna akhir selama pelaksanaan program wisata.<br/>
              3.2 Harga dan Ketersediaan: Mitra berhak menentukan harga paket wisatanya sendiri. Mitra wajib memperbarui ketersediaan kuota paket wisata secara berkala di platform.<br/>
              3.3 Komunikasi dengan Pengguna: Mitra wajib berkomunikasi dengan pengguna akhir secara sopan, cepat, dan profesional melalui sarana komunikasi yang disetujui.<br/>
              3.4 Larangan Transaksi di Luar Platform: Mitra dilarang keras mengarahkan pengguna akhir untuk melakukan transaksi pembayaran di luar platform TripKita. Pelanggaran terhadap ketentuan ini dapat mengakibatkan penangguhan atau pemutusan akun Mitra secara permanen.</p>

              <strong>4. BIAYA DAN PEMBAYARAN</strong>
              <p>4.1 Biaya Layanan: TripKita mengenakan biaya komisi sebesar 10% (sepuluh persen) dari setiap transaksi pembayaran paket wisata yang berhasil dilakukan melalui platform. Biaya ini akan dipotong sebelum pencairan dana ke Mitra.<br/>
              4.2 Pencairan Dana: Dana hasil penjualan paket wisata akan dicairkan ke rekening bank terdaftar milik Mitra setelah program wisata selesai dilaksanakan dan dikonfirmasi oleh pengguna akhir. Proses pencairan dana membutuhkan waktu 1-3 hari kerja.</p>

              <strong>5. PEMBATALAN DAN PENGEMBALIAN DANA (REFUND)</strong>
              <p>5.1 Pembatalan oleh Pengguna: Pengembalian dana akibat pembatalan oleh pengguna tunduk pada kebijakan pembatalan masing-masing paket wisata yang ditetapkan oleh Mitra.<br/>
              5.2 Pembatalan oleh Mitra: Jika Mitra membatalkan keberangkatan program wisata secara sepihak, Mitra wajib mengembalikan dana 100% kepada pengguna akhir melalui platform, dan TripKita berhak mengenakan denda administrasi kepada Mitra.<br/>
              5.3 Kebijakan Refund Khusus: Dalam hal terjadi force majeure, pengembalian dana akan didasarkan pada kesepakatan bersama antara Mitra, Pengguna, dan TripKita.</p>

              <strong>6. PERNYATAAN DAN JAMINAN</strong>
              <p>6.1 Legalitas Usaha: Mitra menyatakan dan menjamin bahwa ia memiliki seluruh perizinan dan lisensi usaha yang sah untuk menjalankan jasa pariwisata yang ditawarkan.<br/>
              6.2 Kepemilikan Konten: Mitra jamin bahwa seluruh materi promosi, gambar, dan deskripsi paket wisata yang diunggah tidak melanggar hak kekayaan intelektual pihak ketiga.</p>

              <strong>7. BATASAN TANGGUNG JAWAB DAN GANTI RUGI</strong>
              <p>7.1 Tanggung Jawab Platform: TripKita bertindak hanya sebagai platform perantara dan tidak bertanggung jawab atas kerugian, cedera, keterlambatan, atau klaim apa pun yang timbul akibat kelalaian atau kegagalan Mitra.<br/>
              7.2 Ganti Rugi: Mitra setuju untuk membebaskan, membela, dan melindungi TripKita dari segala tuntutan hukum, klaim, kerugian, biaya, dan pengeluaran yang timbul akibat pelanggaran Ketentuan ini oleh Mitra.</p>

              <strong>8. FORCE MAJEURE</strong>
              <p>8.1 Keadaan Kahar: Kedua belah pihak dibebaskan dari tanggung jawab atas kegagalan pelaksanaan kewajiban akibat keadaan di luar kendali yang wajar, termasuk bencana alam, perang, huru-hara, pemogokan massal, wabah penyakit, dan kebijakan pemerintah.</p>

              <strong>9. PENANGGUHAN DAN PEMUTUSAN AKUN</strong>
              <p>9.1 Pelanggaran Mitra: TripKita berhak menangguhkan atau memutuskan akun Mitra secara sepihak jika Mitra terbukti melanggar Ketentuan ini, melakukan penipuan, menerima keluhan berulang dari pengguna, atau merusak reputasi platform.<br/>
              9.2 Pemutusan Sukarela: Mitra dapat mengajukan pemutusan kemitraan dan penuturan akun secara tertulis dengan ketentuan seluruh kewajiban transaksi dan keberangkatan paket wisata telah diselesaikan.</p>

              <strong>10. PENYELESAIAN PERSELISIHAN</strong>
              <p>10.1 Musyawarah untuk Mufakat: Setiap perselisihan yang timbul dari Ketentuan ini akan diselesaikan secara musyawarah untuk mufakat.<br/>
              10.2 Domisili Hukum: Jika perselisihan tidak dapat diselesaikan secara musyawarah dalam waktu 30 (tiga puluh) hari, perselisihan tersebut akan diselesaikan melalui Pengadilan Negeri Jakarta Selatan.</p>

              <strong>11. LAIN-LAIN</strong>
              <p>11.1 Keterpisahan (Severability): Jika ada ketentuan dalam Ketentuan ini yang dinyatakan tidak sah, ketentuan lainnya akan tetap berlaku penuh.<br/>
              11.2 Hukum yang Berlaku: Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Negara Republik Indonesia.<br/>
              11.3 Keseluruhan Perjanjian: Ketentuan ini merupakan keseluruhan perjanjian antara TripKita dan Mitra.</p>

              <strong>12. HUBUNGI KAMI</strong>
              <p>Jika Anda memiliki pertanyaan mengenai Ketentuan ini, Anda dapat menghubungi kami melalui email support@tripkita.id atau WhatsApp +62 800 0000 0000.</p>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={() => setShowTermsModal(false)}
              >
                Tutup
              </button>
              <button 
                type="button" 
                className="agree-btn" 
                onClick={() => {
                  updateRegisterData({ agreeToTerms: true });
                  setShowTermsModal(false);
                }}
              >
                Saya Setuju
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
        }

        .premium-terms-modal {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 900px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(226, 232, 240, 0.8);
          animation: modalPopupScale 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        @keyframes modalPopupScale {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .premium-terms-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px;
          border-bottom: 1px solid #f1f5f9;
        }

        .premium-terms-modal .modal-header h2 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .premium-terms-modal .close-x-btn {
          background: transparent;
          border: none;
          font-size: 28px;
          color: #64748b;
          cursor: pointer;
          transition: color 0.15s ease;
          padding: 0;
          line-height: 1;
        }

        .premium-terms-modal .close-x-btn:hover {
          color: #0f172a;
        }

        .scrollable-terms-body {
          flex: 1;
          overflow-y: auto;
          padding: 32px;
          font-size: 14px;
          color: #334155;
          line-height: 1.6;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .scrollable-terms-body h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-primary-medium);
          margin-top: 0;
          margin-bottom: 8px;
        }

        .scrollable-terms-body strong {
          color: #0f172a;
          font-weight: 700;
          margin-top: 16px;
          display: block;
        }

        .scrollable-terms-body p {
          margin: 0 0 8px 0;
        }

        .premium-terms-modal .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 32px;
          border-top: 1px solid #f1f5f9;
          background-color: #f8fafc;
        }

        .premium-terms-modal .modal-footer .cancel-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-weight: 600;
          padding: 10px 24px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid var(--color-border);
        }

        .premium-terms-modal .modal-footer .cancel-btn:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        .premium-terms-modal .modal-footer .agree-btn {
          background-color: var(--color-accent);
          color: #ffffff;
          font-weight: 600;
          padding: 10px 28px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .premium-terms-modal .modal-footer .agree-btn:hover {
          background-color: var(--color-accent-hover);
        }

        .register-container {
          min-height: calc(100vh - 80px);
          background-color: var(--color-bg-light);
        }

        .register-grid-layout {
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          min-height: calc(100vh - 80px);
        }

        .register-sidebar {
          background: linear-gradient(135deg, rgba(9, 44, 46, 0.96) 0%, rgba(15, 23, 42, 0.94) 100%), 
                      url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80');
          background-size: cover;
          background-position: center;
          color: #ffffff;
          padding: 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .sidebar-logo .logo-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sidebar-logo .logo-icon { font-size: 24px; }
        .sidebar-logo .logo-text { font-size: 22px; font-weight: 800; color: #ffffff; }
        .sidebar-logo .logo-text span { color: var(--color-accent); }
        .sidebar-logo .logo-badge { 
          background: rgba(0, 168, 150, 0.15); 
          color: var(--color-accent); 
          font-size: 11px; 
          padding: 2px 8px; 
          border-radius: 20px; 
        }

        .sidebar-content {
          margin-top: 40px;
        }

        .sidebar-title {
          font-size: 36px;
          color: #ffffff;
          line-height: 1.2;
          margin-bottom: 16px;
        }

        .sidebar-title span {
          color: var(--color-accent);
        }

        .sidebar-subtitle {
          color: var(--color-text-light);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 32px;
          max-width: 440px;
        }

        .benefits-checklist {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 48px;
        }

        .benefits-checklist li {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chk-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(0, 168, 150, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .benefits-checklist span {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.85);
        }

        .register-form-area {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }

        .form-inner-box {
          width: 100%;
          max-width: 520px;
        }

        .step-wizard-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .step-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-light);
        }

        .step-badge span {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--color-border);
          color: var(--color-text-medium);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .step-badge.active {
          color: var(--color-accent);
        }

        .step-badge.active span {
          background: var(--color-accent);
          color: #ffffff;
        }

        .step-badge.completed span {
          background: var(--color-primary-medium);
          color: #ffffff;
        }

        .step-connector {
          flex: 1;
          height: 2px;
          background: var(--color-border);
        }

        .form-body {
          background: #ffffff;
          border-radius: var(--radius-lg);
          padding: 32px;
          box-shadow: var(--shadow-premium);
          border: 1px solid var(--color-border);
        }

        .form-header {
          margin-bottom: 24px;
        }

        .form-header h2 {
          font-size: 22px;
          margin-bottom: 4px;
        }

        .form-header p {
          font-size: 13px;
          color: var(--color-text-light);
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .input-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-medium);
        }

        .input-group input, .input-group select, .input-group textarea {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          font-size: 13px;
          color: var(--color-text-dark);
          transition: var(--transition-fast);
        }

        .input-group input:focus, .input-group select:focus, .input-group textarea:focus {
          border-color: var(--color-accent);
          outline: none;
          box-shadow: 0 0 0 3px rgba(0, 168, 150, 0.1);
        }

        .upload-zone-small {
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-md);
          padding: 14px;
          text-align: center;
          cursor: pointer;
          transition: var(--transition-fast);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--color-text-medium);
          font-weight: 600;
        }

        .upload-zone-small:hover {
          border-color: var(--color-accent);
          background-color: var(--color-accent-light);
        }

        .upload-zone-small.uploaded {
          border-color: var(--color-success);
          background-color: var(--color-success-bg);
          color: var(--color-success);
        }

        .error-text {
          font-size: 11px;
          color: #ef4444;
          margin-top: 2px;
        }

        .error-alert {
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
          color: #ef4444;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 12px;
          margin-bottom: 18px;
        }

        .checkbox-group {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .checkbox-group input {
          margin-top: 4px;
        }

        .checkbox-group label {
          font-size: 12px;
          color: var(--color-text-medium);
          line-height: 1.5;
        }

        .checkbox-group label span {
          color: var(--color-accent);
          font-weight: 600;
          cursor: pointer;
        }

        .submit-form-btn {
          background-color: var(--color-accent);
          color: #ffffff;
          width: 100%;
          padding: 14px;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: var(--transition-fast);
          cursor: pointer;
          border: none;
        }

        .submit-form-btn:hover {
          background-color: var(--color-accent-hover);
        }

        .form-actions-row {
          display: flex;
          gap: 12px;
        }

        .back-form-btn {
          border: 1px solid var(--color-border);
          color: var(--color-text-medium);
          padding: 14px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          cursor: pointer;
        }

        .back-form-btn:hover {
          background-color: var(--color-bg-light);
        }

        .login-prompt {
          text-align: center;
          font-size: 13px;
          color: var(--color-text-medium);
          margin-top: 20px;
        }

        .login-prompt span {
          color: var(--color-accent);
          font-weight: 600;
          cursor: pointer;
        }

        @media (max-width: 992px) {
          .register-grid-layout {
            grid-template-columns: 1fr;
          }
          .register-sidebar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
