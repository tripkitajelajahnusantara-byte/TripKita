import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { LegalModalContainer, CustomerRegistrationTermsContent } from '../components/LegalModals';
import { IndonesianPhoneInput } from '../components/IndonesianPhoneInput';
import { isValidIndonesianMobilePhone } from '../utils/phone';
import { useI18n } from '../i18n';

export const CustomerRegisterPage: React.FC = () => {
  const { navigateTo, registerCustomer } = useNavigation();
  const { t, lang } = useI18n();
  const termsError = t('Anda wajib menyetujui Syarat dan Ketentuan Pendaftaran Customer TemenTrip.', 'You must agree to the TemenTrip Customer Registration Terms & Conditions.');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showRegTermsModal, setShowRegTermsModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreeTerms) {
      setError(termsError);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('Konfirmasi kata sandi tidak cocok.', "Passwords don't match."));
      return;
    }

    if (!isValidIndonesianMobilePhone(whatsapp)) {
      setError(t('Masukkan 9–12 digit nomor seluler setelah +62, diawali angka 8.', 'Enter 9–12 digits of your mobile number after +62, starting with 8.'));
      return;
    }

    if (password.length < 12) {
      setError(t('Kata sandi minimal harus 12 karakter.', 'Password must be at least 12 characters.'));
      return;
    }

    setLoading(true);
    try {
      await registerCustomer(name, email, password, whatsapp);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('Pendaftaran gagal. Email mungkin sudah terdaftar.', 'Sign-up failed. This email may already be registered.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div 
        style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '16px', 
          padding: '40px', 
          width: '100%', 
          maxWidth: '450px', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
            {t('Daftar Akun TemenTrip', 'Create a TemenTrip Account')}
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            {t('Simpan tiket perjalanan & cek riwayat pesanan dengan mudah.', 'Keep your trip tickets and booking history in one place.')}
          </p>
        </div>

        {error && (
          <div 
            style={{ 
              backgroundColor: '#fee2e2', 
              color: '#ef4444', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              fontSize: '13px', 
              fontWeight: '600',
              marginBottom: '20px',
              border: '1px solid #fca5a5'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              {t('Nama Lengkap', 'Full Name')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type="text" 
                placeholder={t('Masukkan nama lengkap Anda', 'Enter your full name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              {t('Alamat Email', 'Email Address')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type="email" 
                placeholder={t('nama@email.com', 'name@email.com')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              {t('Nomor WhatsApp', 'WhatsApp Number')}
            </label>
            <IndonesianPhoneInput value={whatsapp} onChange={setWhatsapp} required />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              {t('Kata Sandi', 'Password')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder={t('Minimal 12 karakter', 'At least 12 characters')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                {showPassword ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              {t('Konfirmasi Kata Sandi', 'Confirm Password')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder={t('Ulangi kata sandi Anda', 'Re-enter your password')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Mandatory Terms Checkbox Card */}
          <div>
            <div 
              style={{ 
                backgroundColor: error === termsError ? '#fef2f2' : '#f8fafc',
                border: error === termsError ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
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
                }
              }}
            >
              <input 
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{ 
                  cursor: 'pointer', 
                  accentColor: '#007bff', 
                  width: '18px', 
                  height: '18px',
                  flexShrink: 0 
                }}
              />
              <label 
                htmlFor="agreeTerms" 
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
                    color: '#007bff', 
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
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#94a3b8' : '#007bff',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              marginTop: '10px'
            }}
          >
            {loading ? t('Mendaftarkan Akun...', 'Creating account...') : t('Daftar Sekarang', 'Sign Up')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#64748b' }}>
          {t('Sudah punya akun?', 'Already have an account?')}{' '}
          <button 
            onClick={() => navigateTo('masuk')}
            style={{ background: 'none', border: 'none', color: '#007bff', fontWeight: '700', cursor: 'pointer', padding: 0 }}
          >
            {t('Masuk sekarang', 'Sign in')}
          </button>
        </div>

        {/* Dedicated Link to Provider Register */}
        <div style={{ marginTop: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12.5px', color: '#475569' }}>
            {lang === 'en'
              ? <>Want to join as a <strong>partner</strong>?{' '}</>
              : <>Ingin mendaftar sebagai <strong>Mitra Provider</strong>?{' '}</>}
          </span>
          <button 
            onClick={() => navigateTo('provider-register')} 
            style={{ background: 'none', border: 'none', color: '#007bff', fontWeight: '700', cursor: 'pointer', fontSize: '12.5px', textDecoration: 'underline', padding: 0 }}
          >
            {t('Daftar Mitra Provider', 'Register as a Partner')}
          </button>
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

