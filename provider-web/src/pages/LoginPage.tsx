import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ArrowRight, CalendarCheck2, Eye, EyeOff, LoaderCircle, Lock, Mail, ShieldCheck, WalletCards } from 'lucide-react';
import { request } from '../utils/api';

export const LoginPage: React.FC = () => {
  const { login, navigateTo, route } = useNavigation();
  const isAdminMode = route === 'admin-login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!forgotEmail) {
      setForgotError('Email harus diisi');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      await request('/public/auth/provider/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail })
      });
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.message || 'Terjadi kesalahan');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotOtp || !forgotNewPassword) {
      setForgotError('Semua kolom harus diisi');
      return;
    }
    if (forgotNewPassword.length < 12) {
      setForgotError('Password minimal 12 karakter');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      await request('/public/auth/provider/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPassword })
      });
      
      alert('Password berhasil direset! Silakan login dengan password baru.');
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotEmail('');
      setForgotOtp('');
      setForgotNewPassword('');
    } catch (err: any) {
      setForgotError(err.message || 'Kode OTP salah atau sudah kedaluwarsa');
    } finally {
      setForgotLoading(false);
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }
    setIsLoading(true);
    try {
      setError('');
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Email atau password salah');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="login-container animate-fade-in">
      <div className="login-grid-layout">
        {/* Left Side: Brand Highlights & Stats (Dark Teal Panel) */}
        <div className="login-sidebar">
          <div className="sidebar-brand-box">
            <span className="sidebar-logo-surface">
              <img src="/tementrip_official_logo.png" alt="TemenTrip" />
            </span>
            <span className="portal-badge">{isAdminMode ? 'Portal Admin' : 'Portal Mitra'}</span>
          </div>

          <div className="sidebar-main-content">
            <h1 className="sidebar-title">
              {isAdminMode ? 'Portal administrator TemenTrip' : 'Masuk ke dashboard mitra'}
            </h1>
            <p className="sidebar-description">
              {isAdminMode
                ? 'Verifikasi mitra, cek transaksi, dan proses pencairan dana mitra.'
                : 'Atur paket wisata, cek booking yang masuk, dan lihat status pencairan dana Anda.'}
            </p>

            <div className="stats-cards-grid">
              <div className="stat-card-item">
                <span className="stat-icon"><CalendarCheck2 size={19} /></span>
                <span><strong>Booking dan jadwal</strong><small>Daftar peserta, tanggal trip, dan cek kuota H-3</small></span>
              </div>
              <div className="stat-card-item">
                <span className="stat-icon"><WalletCards size={19} /></span>
                <span><strong>Pencairan dua tahap</strong><small>DP 50% setelah customer bayar, pelunasan setelah trip selesai</small></span>
              </div>
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="security-badge">
              <div className="security-icon-circle">
                <ShieldCheck size={15} />
              </div>
              <span className="security-text">
                {isAdminMode
                  ? 'Akses ini hanya untuk admin TemenTrip.'
                  : 'Akun mitra diverifikasi admin TemenTrip sebelum paket bisa tayang.'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Form Card Area (White Panel) */}
        <div className="login-form-area">
          <div className="form-inner-box">
            <form className="form-body" onSubmit={handleLogin}>
              <div className="form-header">
                <h2>{isAdminMode ? 'Masuk Portal Admin' : 'Masuk ke Dashboard'}</h2>
                <p>{isAdminMode ? 'Masukkan email dan password akun administrator' : 'Masukkan email dan password akun provider Anda'}</p>
              </div>

              {error && <div className="error-alert">{error}</div>}

              {/* Email Input Field */}
              <div className="input-group">
                <label className="field-label">Email</label>
                <div className="input-with-icon">
                  <Mail size={16} className="field-icon" />
                  <input 
                    type="email" 
                    placeholder={isAdminMode ? 'admin@tementrip.id' : 'email@bisnis.com'} 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Input Field */}
              <div className="input-group">
                <div className="label-row">
                  <label className="field-label">Password</label>
                  {!isAdminMode && (
                    <span className="forgot-password-link" onClick={() => {
                      setForgotStep(1);
                      setForgotError('');
                      setShowForgotModal(true);
                    }}>
                      Lupa password?
                    </span>
                  )}
                </div>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="checkbox-row">
                <input 
                  type="checkbox" 
                  id="remember-checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="custom-checkbox"
                />
                <label htmlFor="remember-checkbox">Ingat saya selama 30 hari</label>
              </div>

              {/* Submit Button */}
              <button type="submit" className="submit-form-btn" disabled={isLoading}>
                {isLoading ? <><LoaderCircle size={17} className="login-spinner" /> Memverifikasi akun</> : <>{isAdminMode ? 'Masuk Portal Admin' : 'Masuk ke Dashboard'} <ArrowRight size={16} className="arrow-btn-icon" /></>}
              </button>

              {/* Register Prompt */}
              {!isAdminMode && (
                <p className="register-prompt-text">
                  Belum punya akun Provider? <span onClick={() => navigateTo('provider-register')} className="register-link">Daftar sebagai mitra</span>
                </p>
              )}

              {/* Bottom Switcher Links */}
              <div style={{ marginTop: '18px', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                {isAdminMode ? (
                  <span style={{ fontSize: '12.5px', color: '#475569' }}>
                    Bukan Admin? <span onClick={() => navigateTo('provider-login')} style={{ color: '#00a896', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Masuk Portal Mitra Provider</span>
                  </span>
                ) : (
                  <span style={{ fontSize: '12.5px', color: '#475569' }}>
                    Bukan Mitra Provider? <span onClick={() => navigateTo('masuk')} style={{ color: '#007bff', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Masuk sebagai Customer / Traveler</span>
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="modal-content" style={{
            background: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#092c2e' }}>Reset Password</h2>
              <button onClick={() => setShowForgotModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            {forgotError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px 15px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>
                {forgotError}
              </div>
            )}

            {forgotStep === 1 ? (
              <div>
                <p style={{ fontSize: '14px', color: '#475569', marginBottom: '15px' }}>Masukkan email yang terdaftar untuk menerima kode reset password (OTP).</p>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Email</label>
                  <input 
                    type="email" 
                    value={forgotEmail} 
                    onChange={e => setForgotEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    placeholder="email@bisnis.com"
                  />
                </div>
                <button 
                  onClick={handleRequestOtp} 
                  disabled={forgotLoading}
                  style={{ width: '100%', padding: '12px', background: '#00a896', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: forgotLoading ? 'not-allowed' : 'pointer' }}
                >
                  {forgotLoading ? 'Mengirim...' : 'Kirim Kode Reset'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '14px', color: '#475569', marginBottom: '15px' }}>Masukkan kode OTP yang telah dikirim ke email Anda beserta password baru.</p>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Kode OTP</label>
                  <input 
                    type="text" 
                    value={forgotOtp} 
                    onChange={e => setForgotOtp(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', letterSpacing: '2px', textAlign: 'center' }}
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Password Baru</label>
                  <input 
                    type="password" 
                    value={forgotNewPassword} 
                    onChange={e => setForgotNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    placeholder="Minimal 12 karakter"
                  />
                </div>
                <button 
                  onClick={handleResetPassword} 
                  disabled={forgotLoading}
                  style={{ width: '100%', padding: '12px', background: '#00a896', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: forgotLoading ? 'not-allowed' : 'pointer' }}
                >
                  {forgotLoading ? 'Memproses...' : 'Simpan Password Baru'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .login-container {
          min-height: calc(100vh - 80px);
          background-color: #f8fafc;
          display: flex;
          flex-direction: column;
        }

        .login-grid-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          flex-grow: 1;
          min-height: calc(100vh - 80px);
        }

        /* Left Sidebar: Green/Teal Gradient Panel */
        .login-sidebar {
          background:
            radial-gradient(circle at 12% 18%, rgba(20, 184, 166, .18), transparent 34%),
            radial-gradient(circle at 88% 85%, rgba(14, 116, 144, .13), transparent 38%),
            linear-gradient(145deg, #073b3d 0%, #05272a 52%, #041c1f 100%);
          color: #ffffff;
          padding: clamp(36px, 5vw, 72px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        .login-sidebar::after {
          content: '';
          position: absolute;
          width: 360px;
          height: 360px;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 50%;
          right: -190px;
          top: 22%;
          box-shadow: 0 0 0 52px rgba(255,255,255,.018), 0 0 0 104px rgba(255,255,255,.012);
          pointer-events: none;
        }

        .sidebar-brand-box {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sidebar-logo-surface {
          display: inline-flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid rgba(255,255,255,.55);
          padding: 9px 13px;
          border-radius: 13px;
          box-shadow: 0 10px 30px rgba(0,0,0,.14);
        }

        .sidebar-logo-surface img {
          display: block;
          width: 144px;
          height: 35px;
          object-fit: contain;
        }

        .portal-badge {
          border: 1px solid rgba(94, 234, 212, .28);
          background: rgba(13, 148, 136, .2);
          color: #99f6e4;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 750;
          letter-spacing: .03em;
        }

        .sidebar-main-content {
          position: relative;
          z-index: 1;
          width: min(100%, 560px);
          margin: auto 0;
          padding: 58px 0;
        }

        .sidebar-description {
          max-width: 520px;
          font-size: 16px;
          color: rgba(255,255,255,.72);
          line-height: 1.75;
          margin: 0;
        }

        .stats-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 30px;
        }

        .stat-card-item {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 84px;
          padding: 16px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 15px;
          backdrop-filter: blur(8px);
        }

        .stat-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: rgba(45,212,191,.14);
          color: #5eead4;
          flex: 0 0 auto;
        }

        .stat-card-item strong {
          display: block;
          color: #ffffff;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .stat-card-item small {
          display: block;
          color: rgba(255,255,255,.56);
          font-size: 10.5px;
          line-height: 1.45;
        }

        .sidebar-footer { position: relative; z-index: 1; }

        .security-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,.66);
        }

        .security-icon-circle {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          color: #5eead4;
          background: rgba(45,212,191,.12);
          border-radius: 9px;
          flex: 0 0 auto;
        }

        .sidebar-logo {
          margin-bottom: 40px;
        }

        .logo-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-text {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 800;
          color: #ffffff;
        }

        .logo-text .accent-text {
          color: #00a896;
        }

        .logo-badge {
          background: rgba(0, 168, 150, 0.15);
          color: #2dd4bf;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid rgba(45, 212, 191, 0.2);
          margin-left: 6px;
        }

        .sidebar-content-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex-grow: 1;
          gap: 48px;
        }

        .sidebar-header-box {
          max-width: 500px;
        }

        .sidebar-title {
          font-family: var(--font-display);
          font-size: 38px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 16px;
        }

        .sidebar-subtitle {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }

        /* Stats Grid */
        .highlights-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          max-width: 500px;
        }

        .highlight-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 20px 24px;
          border-radius: 12px;
          transition: transform 0.2s ease, background-color 0.2s ease;
        }

        .highlight-card:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-2px);
        }

        .highlight-val {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .highlight-lbl {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
        }

        /* Security Banner */
        .security-notice-banner {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          max-width: 500px;
        }

        .check-icon-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00a896;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .security-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
        }

        /* Right Panel: White Area */
        .login-form-area {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 64px;
          background:
            radial-gradient(circle at 90% 8%, rgba(20,184,166,.06), transparent 28%),
            #f8fafc;
        }

        .form-inner-box {
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 24px 60px -32px rgba(15, 23, 42, .28);
          border: 1px solid #e2e8f0;
        }

        .form-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-header {
          margin-bottom: 12px;
        }

        .form-header h2 {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 800;
          color: var(--color-primary-dark);
          margin-bottom: 8px;
        }

        .form-header p {
          font-size: 14px;
          color: var(--color-text-medium);
        }

        /* Input Styles */
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-dark);
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .forgot-password-link {
          font-size: 12px;
          color: var(--color-accent);
          font-weight: 600;
          cursor: pointer;
          transition: color 0.15s ease;
        }

        .forgot-password-link:hover {
          color: var(--color-accent-hover);
          text-decoration: underline;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon .field-icon {
          position: absolute;
          left: 16px;
          color: var(--color-text-light);
          pointer-events: none;
        }

        .input-with-icon input {
          width: 100%;
          padding: 14px 16px 14px 44px;
          font-size: 14px;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-dark);
          background-color: #ffffff;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .input-with-icon input::placeholder {
          color: var(--color-text-light);
        }

        .input-with-icon input:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(0, 168, 150, 0.1);
        }

        .password-toggle-btn {
          position: absolute;
          right: 16px;
          color: var(--color-text-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }

        .password-toggle-btn:hover {
          color: var(--color-text-medium);
        }

        /* Checkbox */
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 4px;
        }

        .custom-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid var(--color-border);
          accent-color: var(--color-accent);
          cursor: pointer;
        }

        .checkbox-row label {
          font-size: 13px;
          color: var(--color-text-medium);
          cursor: pointer;
          user-select: none;
        }

        /* Submit Button */
        .submit-form-btn {
          background-color: var(--color-accent);
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          padding: 14px 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 168, 150, 0.15);
          transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
        }

        .submit-form-btn:hover:not(:disabled) {
          background-color: var(--color-accent-hover);
          box-shadow: 0 6px 16px rgba(0, 168, 150, 0.25);
        }

        .submit-form-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .submit-form-btn:disabled {
          background-color: var(--color-text-light);
          cursor: not-allowed;
          box-shadow: none;
        }

        .login-spinner { animation: login-spin .8s linear infinite; }
        @keyframes login-spin { to { transform: rotate(360deg); } }

        .arrow-btn-icon {
          transition: transform 0.2s ease;
        }

        .submit-form-btn:hover:not(:disabled) .arrow-btn-icon {
          transform: translateX(3px);
        }

        /* Error Alert */
        .error-alert {
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
        }

        /* Divider */
        .divider-or {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 10px 0;
          color: var(--color-text-light);
          font-size: 12px;
          font-weight: 500;
        }

        .divider-or::before, .divider-or::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--color-border);
          margin: 0 12px;
        }

        /* Prompt */
        .register-prompt-text {
          text-align: center;
          font-size: 13.5px;
          color: var(--color-text-medium);
          margin-top: 8px;
        }

        .register-link {
          color: var(--color-accent);
          font-weight: 700;
          cursor: pointer;
          transition: color 0.15s ease;
        }

        .register-link:hover {
          color: var(--color-accent-hover);
          text-decoration: underline;
        }

        @media (max-width: 992px) {
          .login-grid-layout {
            grid-template-columns: 1fr;
          }
          .login-sidebar {
            display: none;
          }
          .login-form-area {
            padding: 32px 16px;
          }
          .form-inner-box {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
};
