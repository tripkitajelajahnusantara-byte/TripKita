import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';

export const CustomerRegisterPage: React.FC = () => {
  const { navigateTo, registerCustomer } = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (password.length < 8) {
      setError('Kata sandi minimal harus 8 karakter.');
      return;
    }

    setLoading(true);
    try {
      await registerCustomer(name, email, password, whatsapp);
      alert('Pendaftaran berhasil! Silakan masuk ke akun baru Anda.');
      navigateTo('masuk');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Pendaftaran gagal. Email mungkin sudah terdaftar.');
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
            Daftar Akun TripKita
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Simpan tiket perjalanan & cek riwayat pesanan dengan mudah.
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
              Nama Lengkap
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type="text" 
                placeholder="Masukkan nama lengkap Anda"
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
              Alamat Email
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type="email" 
                placeholder="nama@email.com"
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
              Nomor WhatsApp
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type="tel" 
                placeholder="Contoh: 081234567890"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
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

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              Kata Sandi
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Minimal 8 karakter"
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
              Konfirmasi Kata Sandi
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Ulangi kata sandi Anda"
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
            {loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#64748b' }}>
          Sudah punya akun?{' '}
          <button 
            onClick={() => navigateTo('masuk')}
            style={{ background: 'none', border: 'none', color: '#007bff', fontWeight: '700', cursor: 'pointer', padding: 0 }}
          >
            Masuk sekarang
          </button>
        </div>

        {/* Dedicated Link to Provider Register */}
        <div style={{ marginTop: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12.5px', color: '#475569' }}>
            Ingin mendaftar sebagai <strong>Mitra Provider</strong>?{' '}
          </span>
          <button 
            onClick={() => navigateTo('provider-register')} 
            style={{ background: 'none', border: 'none', color: '#007bff', fontWeight: '700', cursor: 'pointer', fontSize: '12.5px', textDecoration: 'underline', padding: 0 }}
          >
            Daftar Mitra Provider
          </button>
        </div>
      </div>
    </div>
  );
};
