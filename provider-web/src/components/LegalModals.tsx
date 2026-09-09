import React from 'react';
import { X, Shield, FileCheck, Lock, UserCheck } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const LegalModalContainer: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

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
        padding: '20px',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7'
              }}
            >
              <FileCheck size={22} />
            </div>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: '#0284c7',
                  display: 'block',
                  marginBottom: '2px'
                }}
              >
                Dokumen Resmi • TemenTrip
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fee2e2';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '28px',
            overflowY: 'auto',
            fontSize: '14px',
            color: '#334155',
            lineHeight: '1.7',
            backgroundColor: '#fafafa'
          }}
        >
          {children}
        </div>

        {/* Footer Close Button */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <Shield size={16} color="#00c9a7" />
            <span>Terlindungi oleh Kebijakan Resmi TemenTrip</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            Tutup Dokumen
          </button>
        </div>
      </div>
    </div>
  );
};

// Section Card Helper Component for Beautiful Styling
const LegalSection: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
  <div
    style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <span
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          backgroundColor: '#e0f2fe',
          color: '#0284c7',
          fontWeight: '800',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {number}
      </span>
      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
        {title}
      </h4>
    </div>
    <div style={{ color: '#475569', fontSize: '13.5px', lineHeight: '1.75' }}>
      {children}
    </div>
  </div>
);

export const GeneralTermsContent: React.FC = () => (
  <div>
    {/* Intro Banner */}
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}
    >
      <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>
        SYARAT DAN KETENTUAN PLATFORM TRIPKITA
      </h2>
      <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: '1.6' }}>
        Ketentuan yang berlaku bagi setiap pengguna platform TripKita. Dengan mengakses, mendaftar, atau menggunakan layanan TripKita, pengguna dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan di bawah ini.
      </p>
    </div>

    <LegalSection number="1" title="DEFINISI">
      <ul style={{ paddingLeft: '20px', margin: 0 }}>
        <li><strong>TripKita:</strong> Platform digital beserta pengelola dan sistem pendukungnya.</li>
        <li><strong>Customer:</strong> Pengguna yang mencari, memesan, atau menggunakan layanan perjalanan melalui TripKita.</li>
        <li><strong>Provider:</strong> Pihak penyedia layanan perjalanan yang terdaftar di TripKita.</li>
        <li><strong>Platform:</strong> Situs web, aplikasi, dan sarana digital lain milik TemenTrip / TripKita.</li>
        <li><strong>Booking:</strong> Pemesanan layanan perjalanan yang dilakukan melalui Platform.</li>
        <li><strong>Force Majeure:</strong> Keadaan darurat di luar kendali wajar para pihak (bencana alam, cuaca ekstrem, dll).</li>
      </ul>
    </LegalSection>

    <LegalSection number="2" title="LAYANAN TRIPKITA">
      <p style={{ margin: '0 0 8px 0' }}>
        2.1 TripKita menyediakan sarana perantara bagi Customer dan Provider dalam proses pencarian hingga pemesanan trip.
      </p>
      <p style={{ margin: '0 0 8px 0' }}>
        2.2 Kebenaran dan kelengkapan informasi perjalanan sepenuhnya menjadi tanggung jawab Provider yang mempublikasikannya.
      </p>
      <p style={{ margin: 0 }}>
        2.3 TripKita berhak membatasi atau menangguhkan akun jika ditemukan aktivitas yang melanggar ketentuan hukum.
      </p>
    </LegalSection>

    <LegalSection number="3" title="PENGGUNAAN PLATFORM">
      <p style={{ margin: '0 0 8px 0' }}>3.1 Customer wajib memberikan informasi identitas yang valid dan jujur.</p>
      <p style={{ margin: '0 0 8px 0' }}>3.2 Keamanan data akun merupakan tanggung jawab penuh masing-masing pengguna.</p>
      <p style={{ margin: 0 }}>3.3 Dilarang menggunakan platform untuk penipuan, transaksi di luar sistem resmi, atau merugikan pihak lain.</p>
    </LegalSection>

    <LegalSection number="4" title="HAK DAN KEWAJIBAN CUSTOMER">
      <p style={{ margin: '0 0 8px 0' }}>4.1 Customer berhak mendapatkan informasi lengkap dan akurat mengenai paket yang dipesan.</p>
      <p style={{ margin: '0 0 8px 0' }}>4.2 Customer berhak menerima konfirmasi e-tiket / booking setelah pembayaran lunas.</p>
      <p style={{ margin: 0 }}>4.3 Customer wajib mematuhi aturan perjalanan dan petunjuk yang ditetapkan oleh Provider.</p>
    </LegalSection>

    <LegalSection number="5" title="BOOKING, PEMBAYARAN & REFUND">
      <p style={{ margin: '0 0 8px 0' }}>5.1 Pembayaran dilakukan melalui Payment Gateway resmi yang tersedia di Platform (Xendit).</p>
      <p style={{ margin: '0 0 8px 0' }}>5.2 Ketentuan pembatalan dan pengembalian dana (refund) mengikuti kebijakan masing-masing paket trip.</p>
      <p style={{ margin: 0 }}>5.3 Proses refund diselesaikan dalam jangka waktu maksimal 3 hari kerja setelah disetujui.</p>
    </LegalSection>
  </div>
);

export const PrivacyPolicyContent: React.FC = () => (
  <div>
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}
    >
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
        <Lock size={24} color="#0284c7" />
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
        KEBIJAKAN PRIVASI TEMENTRIP
      </h2>
      <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
        Komitmen Kami dalam menjaga keamanan dan kerahasiaan Data Pribadi Anda sesuai UU No. 27 Tahun 2022.
      </p>
    </div>

    <LegalSection number="1" title="INFORMASI YANG DIKUMPULKAN">
      <p style={{ margin: '0 0 8px 0' }}>• <strong>Data Identitas:</strong> Nama lengkap, alamat email, nomor WhatsApp/telepon.</p>
      <p style={{ margin: '0 0 8px 0' }}>• <strong>Data Transaksi:</strong> Riwayat booking, bukti pembayaran, dan tanggal keberangkatan.</p>
      <p style={{ margin: 0 }}>• <strong>Data Teknis:</strong> Alamat IP, jenis peramban, dan log aktivitas platform.</p>
    </LegalSection>

    <LegalSection number="2" title="PENGGUNAAN & KERAHASIAAN DATA">
      <p style={{ margin: '0 0 8px 0' }}>• Data digunakan khusus untuk memproses pendaftaran, pemesanan tiket, dan komunikasi trip.</p>
      <p style={{ margin: 0 }}>• Kami <strong>TIDAK PERNAH</strong> menjual atau menyewakan data pribadi Anda kepada pihak mana pun.</p>
    </LegalSection>

    <LegalSection number="3" title="KEAMANAN TEKNIS">
      <p style={{ margin: 0 }}>
        Seluruh kata sandi dienkripsi menggunakan algoritma standar industri (bcrypt), dan komunikasi data dilindungi oleh enkripsi SSL/TLS.
      </p>
    </LegalSection>
  </div>
);

export const CustomerRegistrationTermsContent: React.FC = () => (
  <div>
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}
    >
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
        <UserCheck size={24} color="#0284c7" />
      </div>
      <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
        SYARAT & KETENTUAN PENDAFTARAN CUSTOMER
      </h2>
      <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
        Dokumen persetujuan pendaftaran akun Customer pada platform TemenTrip.
      </p>
    </div>

    <LegalSection number="1" title="Persyaratan Pendaftaran">
      <p style={{ margin: '0 0 6px 0' }}>1.1 Memberikan data identitas yang sah dan dapat dipertanggungjawabkan.</p>
      <p style={{ margin: '0 0 6px 0' }}>1.2 Menggunakan nama, email, dan nomor WhatsApp yang masih aktif.</p>
      <p style={{ margin: '0 0 6px 0' }}>1.3 Memenuhi persyaratan usia dan kecakapan hukum sesuai perundang-undangan.</p>
      <p style={{ margin: 0 }}>1.4 Tidak diperkenankan membuat akun menggunakan identitas orang lain tanpa hak.</p>
    </LegalSection>

    <LegalSection number="2" title="Kebenaran & Keamanan Informasi">
      <p style={{ margin: '0 0 6px 0' }}>2.1 Customer bertanggung jawab penuh atas kebenaran data yang didaftarkan.</p>
      <p style={{ margin: 0 }}>2.2 Customer wajib menjaga kerahasiaan kata sandi dan keamanan akun masing-masing.</p>
    </LegalSection>

    <LegalSection number="3" title="Larangan Penggunaan">
      <p style={{ margin: 0 }}>
        Customer dilarang menggunakan akun TemenTrip untuk tindakan penipuan, manipulasi promo/sistem, atau kegiatan melanggar hukum.
      </p>
    </LegalSection>

    <LegalSection number="4" title="Persetujuan Elektronik">
      <p style={{ margin: 0 }}>
        Dengan mencentang persetujuan ini, Customer menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan dengan kekuatan hukum mengikat secara elektronik.
      </p>
    </LegalSection>
  </div>
);
