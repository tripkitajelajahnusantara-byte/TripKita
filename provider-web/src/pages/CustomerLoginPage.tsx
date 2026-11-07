import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { API_BASE_URL } from '../utils/api';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { LegalModalContainer, CustomerRegistrationTermsContent } from '../components/LegalModals';
import { IndonesianPhoneInput } from '../components/IndonesianPhoneInput';
import { isValidIndonesianMobilePhone } from '../utils/phone';
import { useI18n } from '../i18n';

export const CustomerLoginPage: React.FC = () => {
  const { login, registerCustomer, navigateTo, customerProfile, logout } = useNavigation();
  const { t } = useI18n();

  // Mode state: false = Masuk, true = Daftar
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form States (empty defaults)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showRegTermsModal, setShowRegTermsModal] = useState(false);

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
      // Validate Terms Checkbox
      if (!agreeTerms) {
        errors.agreeTerms = t('Anda wajib menyetujui Syarat dan Ketentuan Pendaftaran Customer TemenTrip.', 'You must agree to the TemenTrip Customer Registration Terms & Conditions.');
      }

      // Validate Name
      if (!name || name.trim().length === 0) {
        errors.name = t('Nama lengkap wajib diisi.', 'Full name is required.');
      } else if (!/^[a-zA-Z\s]{3,50}$/.test(name.trim())) {
        errors.name = t('Nama lengkap (3-50 karakter) hanya boleh berisi huruf dan spasi.', 'Full name (3-50 characters) may only contain letters and spaces.');
      }

      // Validate WhatsApp
      if (!whatsapp) {
        errors.whatsapp = t('Nomor WhatsApp wajib diisi.', 'WhatsApp number is required.');
      } else if (!isValidIndonesianMobilePhone(whatsapp)) {
        errors.whatsapp = t('Masukkan 9–12 digit nomor seluler setelah +62, diawali angka 8.', 'Enter 9–12 digits of your mobile number after +62, starting with 8.');
      }

      // Validate Confirm Password
      if (!confirmPassword) {
        errors.confirmPassword = t('Konfirmasi kata sandi wajib diisi.', 'Please confirm your password.');
      } else if (password !== confirmPassword) {
        errors.confirmPassword = t('Konfirmasi kata sandi tidak cocok dengan kata sandi di atas.', "Password confirmation doesn't match the password above.");
      }
    }

    // Validate Email (Both modes)
    if (!email) {
      errors.email = t('Alamat email wajib diisi.', 'Email address is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = t('Format email tidak valid (harus memiliki "@" dan domain, contoh: user@gmail.com).', 'Invalid email format (must include "@" and a domain, e.g. user@gmail.com).');
    }

    // Validate Password (Both modes)
    if (!password) {
      errors.password = t('Kata sandi wajib diisi.', 'Password is required.');
    } else if (isRegisterMode && password.length < 12) {
      errors.password = t('Kata sandi minimal 12 karakter.', 'Password must be at least 12 characters.');
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
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.message || t('Proses gagal. Silakan periksa kembali data Anda.', 'Something went wrong. Please check your details and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (isRegisterMode && !agreeTerms) {
      setGeneralError(t('Anda wajib menyetujui Syarat dan Ketentuan Pendaftaran Customer TemenTrip sebelum mendaftar.', 'You must agree to the TemenTrip Customer Registration Terms & Conditions before signing up.'));
      setFieldErrors(prev => ({ ...prev, agreeTerms: t('Centang kotak ini untuk menyetujui Syarat dan Ketentuan.', 'Tick this box to agree to the Terms & Conditions.') }));
      return;
    }
    window.location.href = `${API_BASE_URL}/public/auth/google?type=customer`;
  };

  if (customerProfile) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '440px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <UserCheck size={28} color="#0284c7" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>{t('Anda Sudah Masuk', "You're Already Signed In")}</h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            {t('Anda saat ini telah terhubung sebagai', "You're currently signed in as")} <br />
            <strong style={{ color: '#0284c7' }}>{customerProfile.picName || customerProfile.businessName}</strong> ({customerProfile.email})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => navigateTo('beranda')}
              style={{ padding: '12px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              {t('Lanjutkan Berkeliling Beranda', 'Continue to Home')}
            </button>
            <button
              onClick={logout}
              style={{ padding: '11px', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '12px', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}
            >
              {t('Keluar Akun', 'Sign Out')}
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
            {isRegisterMode ? t('Daftar Akun Baru', 'Create a New Account') : t('Selamat Datang Kembali!', 'Welcome Back!')}
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
            {isRegisterMode 
              ? t('Buat akun untuk simpan tiket & riwayat trip kamu dengan mudah.', 'Create an account to keep your tickets and trip history in one place.')
              : t('Masuk untuk pesan open trip dan cek tiket perjalanan kamu.', 'Sign in to book open trips and check your trip tickets.')
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

        {/* Google Sign-In Option */}
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
          <span>{isRegisterMode ? t('Daftar dengan Google', 'Sign up with Google') : t('Masuk dengan Google', 'Sign in with Google')}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 20px 0', color: '#94a3b8', fontSize: '12px' }}>
          <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          <span style={{ padding: '0 12px', fontWeight: '600' }}>{t('atau email', 'or with email')}</span>
          <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Name Field */}
          {isRegisterMode && (
            <div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={18} color={fieldErrors.name ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '14px' }} />
                <input 
                  type="text" 
                  placeholder={t('Nama Lengkap...', 'Full name...')}
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

          {/* Email Field */}
          <div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} color={fieldErrors.email ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '14px' }} />
              <input 
                type="email" 
                placeholder={t('Alamat Email (contoh: nama@gmail.com)...', 'Email address (e.g. name@gmail.com)...')}
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

          {/* WhatsApp Field */}
          {isRegisterMode && (
            <div>
              <IndonesianPhoneInput
                value={whatsapp}
                onChange={(value) => {
                  setWhatsapp(value);
                  if (fieldErrors.whatsapp) setFieldErrors(prev => ({ ...prev, whatsapp: '' }));
                }}
                invalid={Boolean(fieldErrors.whatsapp)}
                required
              />
              {fieldErrors.whatsapp && (
                <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={13} /> {fieldErrors.whatsapp}
                </span>
              )}
            </div>
          )}

          {/* Password Field */}
          <div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} color={fieldErrors.password ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '14px' }} />
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder={t('Kata Sandi...', 'Password...')}
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

          {/* Confirm Password Field */}
          {isRegisterMode && (
            <div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} color={fieldErrors.confirmPassword ? '#ef4444' : '#94a3b8'} style={{ position: 'absolute', left: '14px' }} />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('Konfirmasi Kata Sandi...', 'Confirm password...')}
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

          {/* Mandatory Terms Checkbox Card */}
          {isRegisterMode && (
            <div>
              <div 
                style={{ 
                  backgroundColor: fieldErrors.agreeTerms ? '#fef2f2' : '#f8fafc',
                  border: fieldErrors.agreeTerms ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '4px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                    setAgreeTerms(!agreeTerms);
                    if (fieldErrors.agreeTerms) setFieldErrors(prev => ({ ...prev, agreeTerms: '' }));
                  }
                }}
              >
                <input 
                  type="checkbox"
                  id="agreeTermsCustomerLogin"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    if (fieldErrors.agreeTerms) setFieldErrors(prev => ({ ...prev, agreeTerms: '' }));
                  }}
                  style={{ 
                    cursor: 'pointer', 
                    accentColor: '#0284c7', 
                    width: '18px', 
                    height: '18px',
                    flexShrink: 0 
                  }}
                />
                <label 
                  htmlFor="agreeTermsCustomerLogin" 
                  style={{ 
                    fontSize: '13px', 
                    color: '#334155', 
                    cursor: 'pointer', 
                    lineHeight: '1.4',
                    margin: 0
                  }}
                >
                  {t('Saya menyetujui', 'I agree to the')}{' '}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRegTermsModal(true);
                    }}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#0284c7', 
                      fontWeight: '700', 
                      cursor: 'pointer', 
                      padding: 0, 
                      textDecoration: 'underline',
                      fontSize: '13px'
                    }}
                  >
                    {t('Syarat & Ketentuan Pendaftaran', 'Registration Terms & Conditions')}
                  </button>
                </label>
              </div>
              {fieldErrors.agreeTerms && (
                <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={13} /> {fieldErrors.agreeTerms}
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
            {loading ? t('Memproses...', 'Processing...') : (isRegisterMode ? t('Daftar Akun Sekarang', 'Create Account') : t('Masuk Sekarang', 'Sign In'))}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Combined Toggle Link */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: '13.5px', color: '#64748b' }}>
          {isRegisterMode ? (
            <>
              {t('Sudah punya akun?', 'Already have an account?')}{' '}
              <button 
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setGeneralError('');
                  setFieldErrors({});
                }} 
                style={{ background: 'none', border: 'none', color: '#007bff', fontWeight: '800', cursor: 'pointer', padding: 0 }}
              >
                {t('Masuk sekarang', 'Sign in')}
              </button>
            </>
          ) : (
            <>
              {t('Belum punya akun?', "Don't have an account?")}{' '}
              <button 
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setGeneralError('');
                  setFieldErrors({});
                }} 
                style={{ background: 'none', border: 'none', color: '#007bff', fontWeight: '800', cursor: 'pointer', padding: 0 }}
              >
                {t('Daftar gratis sekarang', 'Sign up for free')}
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12.5px', color: '#475569' }}>
            {t('Mitra Provider / Pemilik Tour?', 'Tour operator or partner?')}{' '}
          </span>
          <span 
            onClick={() => navigateTo('provider-login')} 
            style={{ color: '#00a896', fontWeight: 700, cursor: 'pointer', fontSize: '12.5px', textDecoration: 'underline' }}
          >
            {t('Masuk ke Dashboard Provider', 'Sign in to Partner Dashboard')}
          </span>
        </div>

      </div>

      {/* Registration Terms Modal */}
      <LegalModalContainer
        isOpen={showRegTermsModal}
        onClose={() => setShowRegTermsModal(false)}
        title={t('Syarat & Ketentuan Pendaftaran Customer', 'Customer Registration Terms & Conditions')}
      >
        <CustomerRegistrationTermsContent />
      </LegalModalContainer>
    </div>
  );
};

