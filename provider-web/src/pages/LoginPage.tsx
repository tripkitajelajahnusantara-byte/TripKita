import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { request, API_BASE_URL } from '../utils/api';

export const LoginPage: React.FC = () => {
  const { login, navigateTo, route } = useNavigation();
  const isAdminMode = route === 'admin-login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

  useEffect(() => {
    async function checkOauth() {
      try {
        const config = await request('/public/auth/config');
        setGoogleOAuthEnabled(!!config.googleOAuthEnabled);
      } catch (err) {
        console.error('Failed to load auth config:', err);
      }
    }
    checkOauth();
  }, []);

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
            <span className="brand-logo-icon">🛡️</span>
            <span className="brand-name-text">TemenTrip Admin & Provider</span>
          </div>

          <div className="sidebar-main-content">
            <h1 className="sidebar-title">
              {isAdminMode ? 'Portal Administrator TemenTrip' : 'Selamat Datang Kembali, Partner!'}
            </h1>
            <p className="sidebar-description">
              {isAdminMode 
                ? 'Kelola sistem, verifikasi mitra tour, pantau transaksi sistem, dan kelola saldo secara terpusat.' 
                : 'Kelola paket wisata, pantau booking, dan tingkatkan pendapatan bisnis Anda dari satu dashboard terintegrasi.'}
            </p>

            <div className="stats-cards-grid">
              <div className="stat-card-item">
                <span className="stat-number">2,500+</span>
                <span className="stat-label">Provider Aktif</span>
              </div>
              <div className="stat-card-item">
                <span className="stat-number">850K+</span>
                <span className="stat-label">Wisatawan</span>
              </div>
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="security-badge">
              <div className="security-icon-circle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="security-text">
                <strong>Keamanan terjamin.</strong> Sistem dilindungi dengan enkripsi SSL 256-bit.
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

              {isAdminMode && (
                <div style={{ backgroundColor: '#eff6ff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '18px', fontSize: '13px', color: '#1e40af' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>🛡️ Testing Login Admin Default:</div>
                  <div style={{ fontSize: '12px', color: '#3b82f6', marginBottom: '8px' }}>
                    Email: <strong>admin@tementrip.id</strong> | Pass: <strong>Admin123!</strong>
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setEmail('admin@tementrip.id'); setPassword('Admin123!'); }}
                    style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                  >
                    ⚡ Isi Akun Admin Otomatis
                  </button>
                </div>
              )}

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
                    <span className="forgot-password-link" onClick={() => alert('Fitur lupa password sedang disiapkan.')}>
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
                {isLoading ? 'Memproses...' : (isAdminMode ? 'Masuk Portal Admin' : 'Masuk ke Dashboard')} <ArrowRight size={16} className="arrow-btn-icon" />
              </button>

              {/* Register Prompt */}
              {!isAdminMode && (
                <p className="register-prompt-text">
                  Belum punya akun Provider? <span onClick={() => navigateTo('provider-register')} className="register-link">Daftar Mitra gratis sekarang</span>
                </p>
              )}

              {/* Bottom Switcher Links */}
              <div style={{ marginTop: '18px', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isAdminMode ? (
                  <>
                    <span style={{ fontSize: '12.5px', color: '#475569' }}>
                      Bukan Admin? <span onClick={() => navigateTo('provider-login')} style={{ color: '#00a896', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Masuk Portal Mitra Provider</span>
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#475569' }}>
                      <span onClick={() => navigateTo('masuk')} style={{ color: '#007bff', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Masuk sebagai Customer / Traveler</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '12.5px', color: '#475569' }}>
                      Bukan Mitra Provider? <span onClick={() => navigateTo('masuk')} style={{ color: '#007bff', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Masuk sebagai Customer</span>
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#475569' }}>
                      Pengelola Sistem? <span onClick={() => navigateTo('admin-login')} style={{ color: '#2563eb', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Masuk Portal Administrator</span>
                    </span>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

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
          background: linear-gradient(180deg, #092c2e 0%, #061d1f 100%);
          color: #ffffff;
          padding: 64px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
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
          background-color: #ffffff;
        }

        .form-inner-box {
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.04);
          border: 1px solid #f1f5f9;
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

        /* Demo Card */
        .demo-account-card {
          background-color: #f8fafc;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }

        .demo-account-card h4 {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-primary-dark);
          margin-bottom: 10px;
        }

        .demo-credentials-text {
          font-size: 11.5px;
          color: var(--color-text-medium);
          margin-bottom: 12px;
          line-height: 1.6;
        }

        .demo-credentials-text p {
          margin: 2px 0;
        }

        .use-demo-action-btn {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--color-accent);
          transition: color 0.15s ease;
          background: none;
          border: none;
          cursor: pointer;
        }

        .use-demo-action-btn:hover:not(:disabled) {
          color: var(--color-accent-hover);
          text-decoration: underline;
        }

        .use-demo-action-btn:disabled {
          color: var(--color-text-light);
          cursor: not-allowed;
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
