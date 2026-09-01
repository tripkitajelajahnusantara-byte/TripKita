import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { API_BASE_URL } from '../utils/api';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';

export const CustomerLoginPage: React.FC = () => {
  const { login, registerCustomer, navigateTo, isRegistered, providerProfile, logout } = useNavigation();

  // Mode state: false = Masuk, true = Daftar
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form States (empty defaults)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Error States
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors: { [key: string]: string } = {};

    if (isRegisterMode) {
      // Validate Name
      if (!name || name.trim().length === 0) {
        errors.name = 'Nama lengkap wajib diisi.';
      } else if (!/^[a-zA-Z\s]{3,50}$/.test(name.trim())) {
        errors.name = 'Nama lengkap (3-50 karakter) hanya boleh berisi huruf dan spasi.';
      }

      // Validate WhatsApp
      if (!whatsapp) {
        errors.whatsapp = 'Nomor WhatsApp wajib diisi.';
      } else if (!/^(081|082|083|085|087|088|089|08|62)\d{7,11}$/.test(whatsapp.trim())) {
        errors.whatsapp = 'Nomor WhatsApp harus diawali 081 atau 08 (10–14 digit angka).';
      }

      // Validate Confirm Password
      if (!confirmPassword) {
        errors.confirmPassword = 'Konfirmasi kata sandi wajib diisi.';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Konfirmasi kata sandi tidak cocok dengan kata sandi di atas.';
      }
    }

    // Validate Email (Both modes)
    if (!email) {
      errors.email = 'Alamat email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Format email tidak valid (harus memiliki "@" dan domain, contoh: user@gmail.com).';
    }

    // Validate Password (Both modes)
    if (!password) {
      errors.password = 'Kata sandi wajib diisi.';
    } else if (password.length < 8) {
      errors.password = 'Kata sandi minimal 8 karakter.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        await registerCustomer(name.trim(), email.trim(), password, whatsapp.trim());
        alert('Pendaftaran berhasil! Akun Anda telah aktif.');
        navigateTo('beranda');
      } else {
        await login(email.trim(), password);
        alert('Berhasil masuk! Selamat datang kembali.');
        navigateTo('beranda');
      }
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.message || 'Proses gagal. Silakan periksa kembali data Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = `${API_BASE_URL}/public/auth/google`;
  };

  if (isRegistered && providerProfile) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '440px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <UserCheck size={28} color="#0284c7" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>Anda Sudah Masuk</h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            Anda saat ini telah terhubung sebagai <br />
            <strong style={{ color: '#0284c7' }}>{providerProfile.picName || providerProfile.businessName}</strong> ({providerProfile.email})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => navigateTo('beranda')}
              style={{ padding: '12px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              Lanjutkan Berkeliling Beranda
            </button>
            <button
              onClick={logout}
              style={{ padding: '11px', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '12px', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}
            >
              Keluar Akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}>
      <div 
        style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '24px', 
          padding: '40px', 
          width: '100%', 
          maxWidth: '440px', 
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          border: '1px solid #e2e8f0',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
            <UserCheck size={26} color="#007bff" />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
            {isRegisterMode ? 'Daftar Akun Baru' : 'Selamat Datang Kembali!'}
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
            {isRegisterMode 
              ? 'Buat akun untuk simpan tiket & riwayat trip kamu dengan mudah.'
              : 'Masuk untuk pesan open trip dan cek tiket perjalanan kamu.'
            }
          </p>
        </div>

        {generalError && (
          <div 
            style={{ 
              backgroundColor: '#fee2e2', 
              color: '#ef4444', 
              padding: '12px 16px', 
              borderRadius: '10px', 
              fontSize: '13px', 
              fontWeight: '600',
              marginBottom: '20px',
              border: '1px solid #fca5a5'
            }}
          >
            {generalError}
          </div>
        )}

        {/* Google Sign-In Option (Clean text without "(Gmail)") */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '700',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s'
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>{isRegisterMode ? 'Daftar dengan Google' : 'Masuk dengan Google'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 20px 0', color: '#94a3b8', fontSize: '12px' }}>
          <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          <span style={{ padding: '0 12px', fontWeight: '600' }}>atau email</span>
          <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Name Field (Daftar Mode Only - Max 50 Chars) */}
          {isRegisterMode && (
            <div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={18} color={fieldErrors.name ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '14px' }} />
                <input 
                  type="text" 
                  placeholder="Nama Lengkap..."
                  maxLength={50}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    border: fieldErrors.name ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {fieldErrors.name && (
                <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={13} /> {fieldErrors.name}
                </span>
              )}
            </div>
          )}

          {/* Email Field (No top text label) */}
          <div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} color={fieldErrors.email ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '14px' }} />
              <input 
                type="email" 
                placeholder="Alamat Email (contoh: nama@gmail.com)..."
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                }}
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: fieldErrors.email ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {fieldErrors.email && (
              <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={13} /> {fieldErrors.email}
              </span>
            )}
          </div>

          {/* WhatsApp Field (Daftar Mode Only) */}
          {isRegisterMode && (
            <div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Phone size={18} color={fieldErrors.whatsapp ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '14px' }} />
                <input 
                  type="tel" 
                  placeholder="Nomor WhatsApp (contoh: 081234567890)..."
                  value={whatsapp}
                  onChange={(e) => {
                    setWhatsapp(e.target.value);
                    if (fieldErrors.whatsapp) setFieldErrors(prev => ({ ...prev, whatsapp: '' }));
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    border: fieldErrors.whatsapp ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {fieldErrors.whatsapp && (
                <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={13} /> {fieldErrors.whatsapp}
                </span>
              )}
            </div>
          )}

          {/* Password Field (With Eye Toggle & Red Error Border) */}
          <div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} color={fieldErrors.password ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '14px' }} />
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Kata Sandi..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                }}
                autoComplete="new-password"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  borderRadius: '10px',
                  border: fieldErrors.password ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: '#94a3b8'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={13} /> {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Confirm Password Field (With Eye Toggle & Red Error Border - Daftar Mode Only) */}
          {isRegisterMode && (
            <div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} color={fieldErrors.confirmPassword ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '14px' }} />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Konfirmasi Kata Sandi..."
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 42px',
                    borderRadius: '10px',
                    border: fieldErrors.confirmPassword ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: '#94a3b8'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={13} /> {fieldErrors.confirmPassword}
                </span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#94a3b8' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '6px',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(2, 132, 199, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? 'Memproses...' : (isRegisterMode ? 'Daftar Akun Sekarang' : 'Masuk Sekarang')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Combined Toggle Link: Belum punya akun? Daftar / Sudah punya akun? Masuk */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: '13.5px', color: '#64748b' }}>
          {isRegisterMode ? (
            <>
              Sudah punya akun?{' '}
              <button 
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setGeneralError('');
                  setFieldErrors({});
                }} 
                style={{ background: 'none', border: 'none', color: '#007bff', fontWeight: '800', cursor: 'pointer', padding: 0 }}
              >
                Masuk sekarang
              </button>
            </>
          ) : (
            <>
              Belum punya akun?{' '}
              <button 
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setGeneralError('');
                  setFieldErrors({});
                }} 
                style={{ background: 'none', border: 'none', color: '#007bff', fontWeight: '800', cursor: 'pointer', padding: 0 }}
              >
                Daftar gratis sekarang
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
