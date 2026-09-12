import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { API_BASE_URL } from '../utils/api';
import { X, Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle, ArrowRight } from 'lucide-react';
import { LegalModalContainer, CustomerRegistrationTermsContent } from './LegalModals';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess
}) => {
  const { login, registerCustomer } = useNavigation();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showRegTermsModal, setShowRegTermsModal] = useState(false);

  // Visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Errors & Loading
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const errors: { [key: string]: string } = {};

    if (mode === 'register') {
      if (!agreeTerms) {
        errors.agreeTerms = 'Anda wajib menyetujui Syarat & Ketentuan Pendaftaran Customer.';
      }
      if (!name || name.trim().length === 0) {
        errors.name = 'Nama lengkap wajib diisi.';
      } else if (!/^[a-zA-Z\s]{3,50}$/.test(name.trim())) {
        errors.name = 'Nama lengkap (3-50 karakter) hanya boleh huruf dan spasi.';
      }
      if (!whatsapp) {
        errors.whatsapp = 'Nomor WhatsApp wajib diisi.';
      } else if (!/^(081|082|083|085|087|088|089|08|62)\d{7,11}$/.test(whatsapp.trim())) {
        errors.whatsapp = 'Nomor WhatsApp harus diawali 081 atau 08 (10–14 digit angka).';
      }
      if (!confirmPassword) {
        errors.confirmPassword = 'Konfirmasi kata sandi wajib diisi.';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Konfirmasi kata sandi tidak cocok dengan kata sandi.';
      }
    }

    if (!email) {
      errors.email = 'Alamat email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Format email tidak valid (contoh: user@gmail.com).';
    }

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

    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'register') {
        await registerCustomer(name.trim(), email.trim(), password, whatsapp.trim());
      } else {
        await login(email.trim(), password);
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.message || 'Proses gagal. Silakan periksa kembali data Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (mode === 'register' && !agreeTerms) {
      setGeneralError('Anda wajib menyetujui Syarat & Ketentuan sebelum mendaftar.');
      setFieldErrors(prev => ({ ...prev, agreeTerms: 'Centang untuk menyetujui Syarat & Ketentuan.' }));
      return;
    }
    window.location.href = `${API_BASE_URL}/public/auth/google?type=customer`;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '460px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          position: 'relative',
          padding: '32px 28px',
          boxSizing: 'border-box'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.2s'
          }}
        >
          <X size={20} />
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/tementrip_official_logo.png"
            alt="TemenTrip"
            style={{ height: '36px', width: 'auto', marginBottom: '12px', objectFit: 'contain' }}
          />
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
            {mode === 'login' ? 'Masuk ke TemenTrip' : 'Daftar Akun TemenTrip'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
            {mode === 'login'
              ? 'Silakan masuk untuk melanjutkan pemesanan paket wisata.'
              : 'Daftar akun baru untuk pesan open trip & kelola tiket Anda.'
            }
          </p>
        </div>

        {/* Mode Tab Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: '#f1f5f9',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '20px'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setGeneralError('');
              setFieldErrors({});
            }}
            style={{
              padding: '10px',
              border: 'none',
              borderRadius: '9px',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: mode === 'login' ? '#ffffff' : 'transparent',
              color: mode === 'login' ? '#0284c7' : '#64748b',
              boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setGeneralError('');
              setFieldErrors({});
            }}
            style={{
              padding: '10px',
              border: 'none',
              borderRadius: '9px',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: mode === 'register' ? '#ffffff' : 'transparent',
              color: mode === 'register' ? '#0284c7' : '#64748b',
              boxShadow: mode === 'register' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Daftar Akun
          </button>
        </div>

        {/* Error Alert */}
        {generalError && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: '600',
              marginBottom: '18px',
              border: '1px solid #fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{generalError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Register: Nama Lengkap */}
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                Nama Lengkap
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '10px',
                    border: fieldErrors.name ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
              {fieldErrors.name && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{fieldErrors.name}</span>}
            </div>
          )}

          {/* Email (Login & Register) */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
              Alamat Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '10px',
                  border: fieldErrors.email ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
            {fieldErrors.email && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{fieldErrors.email}</span>}
          </div>

          {/* Register: WhatsApp */}
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                Nomor WhatsApp
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '10px',
                    border: fieldErrors.whatsapp ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
              {fieldErrors.whatsapp && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{fieldErrors.whatsapp}</span>}
            </div>
          )}

          {/* Password (Login & Register) */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
              Kata Sandi
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 38px 10px 38px',
                  borderRadius: '10px',
                  border: fieldErrors.password ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{fieldErrors.password}</span>}
          </div>

          {/* Register: Confirm Password */}
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                Konfirmasi Kata Sandi
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Ulangi kata sandi"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: '10px',
                    border: fieldErrors.confirmPassword ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{fieldErrors.confirmPassword}</span>}
            </div>
          )}

          {/* Register: Terms Agreement Checkbox */}
          {mode === 'register' && (
            <div style={{ marginTop: '2px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{ accentColor: '#0284c7', width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                />
                <span>
                  Saya menyetujui{' '}
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      setShowRegTermsModal(true);
                    }}
                    style={{ color: '#0284c7', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Syarat dan Ketentuan Pendaftaran Customer
                  </span>{' '}
                  TemenTrip.
                </span>
              </label>
              {fieldErrors.agreeTerms && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{fieldErrors.agreeTerms}</span>}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14.5px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk Sekarang' : 'Daftar Akun'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>atau</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            padding: '11px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontWeight: '700',
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            transition: 'all 0.2s'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          {mode === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
        </button>

      </div>

      {/* Legal Modal Container for Customer Registration Terms */}
      <LegalModalContainer
        isOpen={showRegTermsModal}
        onClose={() => setShowRegTermsModal(false)}
        title="Syarat & Ketentuan Pendaftaran Customer"
      >
        <CustomerRegistrationTermsContent />
      </LegalModalContainer>
    </div>
  );
};
