import React from 'react';
import { X, Shield, FileCheck, Lock, UserCheck } from 'lucide-react';
import { useI18n } from '../i18n';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  hideCloseButton?: boolean;
}

export const LegalModalContainer: React.FC<ModalProps> = ({ isOpen, onClose, title, children, hideCloseButton = false }) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (!hideCloseButton && e.target === e.currentTarget) onClose();
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
                {t('Dokumen Resmi • TemenTrip', 'Official Document • TemenTrip')}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                {title}
              </h3>
            </div>
          </div>

          {!hideCloseButton && (
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
          )}
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

        {/* Footer */}
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
            <span>{t('Terlindungi oleh Kebijakan Resmi TemenTrip', 'Protected by TemenTrip Official Policy')}</span>
          </div>

          {!hideCloseButton && (
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
              {t('Tutup Dokumen', 'Close Document')}
            </button>
          )}
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

interface RefundPolicyProps {
  cancellationRefundDays?: number;
}

// Versi Inggris hanya terjemahan; bila berbeda, versi Indonesia yang berlaku.
const EnglishVersionNote: React.FC = () => {
  const { lang } = useI18n();
  if (lang !== 'en') return null;
  return (
    <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
      This English version is provided for convenience. If there is any difference, the Indonesian version prevails.
    </p>
  );
};

export const GeneralTermsContent: React.FC<RefundPolicyProps> = ({ cancellationRefundDays = 7 }) => {
  const { t, lang } = useI18n();
  return (
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
        {t('SYARAT DAN KETENTUAN PLATFORM TEMENTRIP', 'TEMENTRIP PLATFORM TERMS AND CONDITIONS')}
      </h2>
      <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: '1.6' }}>
        {t(
          'Ketentuan yang berlaku bagi setiap pengguna platform TemenTrip. Dengan mengakses, mendaftar, atau menggunakan layanan TemenTrip, pengguna dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan di bawah ini.',
          'These terms apply to every user of the TemenTrip platform. By accessing, registering for, or using TemenTrip services, users are deemed to have read, understood, and agreed to all of the terms below.'
        )}
      </p>
      <EnglishVersionNote />
    </div>

    <LegalSection number="1" title={t('DEFINISI', 'DEFINITIONS')}>
      <ul style={{ paddingLeft: '20px', margin: 0 }}>
        <li><strong>TemenTrip:</strong> {t('Platform digital beserta pengelola dan sistem pendukungnya.', 'The digital platform together with its operator and supporting systems.')}</li>
        <li><strong>Customer:</strong> {t('Pengguna yang mencari, memesan, atau menggunakan layanan perjalanan melalui TemenTrip.', 'A user who searches for, books, or uses travel services through TemenTrip.')}</li>
        <li><strong>Provider:</strong> {t('Pihak penyedia layanan perjalanan yang terdaftar di TemenTrip.', 'A travel service provider registered on TemenTrip.')}</li>
        <li><strong>Platform:</strong> {t('Situs web, aplikasi, dan sarana digital lain milik TemenTrip.', 'The website, application, and other digital channels owned by TemenTrip.')}</li>
        <li><strong>Booking:</strong> {t('Pemesanan layanan perjalanan yang dilakukan melalui Platform.', 'A reservation of travel services made through the Platform.')}</li>
        <li><strong>Force Majeure:</strong> {t('Keadaan darurat di luar kendali wajar para pihak (bencana alam, cuaca ekstrem, dll).', 'An emergency beyond the reasonable control of the parties (natural disasters, extreme weather, etc.).')}</li>
      </ul>
    </LegalSection>

    <LegalSection number="2" title={t('LAYANAN TEMENTRIP', 'TEMENTRIP SERVICES')}>
      <p style={{ margin: '0 0 8px 0' }}>
        {t(
          '2.1 TemenTrip menyediakan sarana perantara bagi Customer dan Provider dalam proses pencarian hingga pemesanan trip.',
          '2.1 TemenTrip provides an intermediary service for Customers and Providers, from searching for a trip to booking it.'
        )}
      </p>
      <p style={{ margin: '0 0 8px 0' }}>
        {t(
          '2.2 Kebenaran dan kelengkapan informasi perjalanan sepenuhnya menjadi tanggung jawab Provider yang mempublikasikannya.',
          '2.2 The Provider who publishes travel information is fully responsible for its accuracy and completeness.'
        )}
      </p>
      <p style={{ margin: 0 }}>
        {t(
          '2.3 TemenTrip berhak membatasi atau menangguhkan akun jika ditemukan aktivitas yang melanggar ketentuan hukum.',
          '2.3 TemenTrip has the right to restrict or suspend an account if activity that violates the law is found.'
        )}
      </p>
    </LegalSection>

    <LegalSection number="3" title={t('PENGGUNAAN PLATFORM', 'USE OF THE PLATFORM')}>
      <p style={{ margin: '0 0 8px 0' }}>{t('3.1 Customer wajib memberikan informasi identitas yang valid dan jujur.', '3.1 Customers must provide valid and truthful identity information.')}</p>
      <p style={{ margin: '0 0 8px 0' }}>{t('3.2 Keamanan data akun merupakan tanggung jawab penuh masing-masing pengguna.', '3.2 Each user is fully responsible for the security of their account data.')}</p>
      <p style={{ margin: 0 }}>{t('3.3 Dilarang menggunakan platform untuk penipuan, transaksi di luar sistem resmi, atau merugikan pihak lain.', '3.3 Using the platform for fraud, for transactions outside the official system, or to harm others is prohibited.')}</p>
    </LegalSection>

    <LegalSection number="4" title={t('HAK DAN KEWAJIBAN CUSTOMER', 'CUSTOMER RIGHTS AND OBLIGATIONS')}>
      <p style={{ margin: '0 0 8px 0' }}>{t('4.1 Customer berhak mendapatkan informasi lengkap dan akurat mengenai paket yang dipesan.', '4.1 Customers are entitled to complete and accurate information about the package they book.')}</p>
      <p style={{ margin: '0 0 8px 0' }}>{t('4.2 Customer berhak menerima konfirmasi e-tiket / booking setelah pembayaran lunas.', '4.2 Customers are entitled to receive an e-ticket / booking confirmation once payment is made in full.')}</p>
      <p style={{ margin: 0 }}>{t('4.3 Customer wajib mematuhi aturan perjalanan dan petunjuk yang ditetapkan oleh Provider.', '4.3 Customers must follow the travel rules and instructions set by the Provider.')}</p>
    </LegalSection>

    <LegalSection number="5" title={t('PEMBATALAN, REFUND & RESCHEDULE', 'CANCELLATION, REFUND & RESCHEDULE')}>
      {lang === 'en' ? (
        <>
          <p style={{ margin: '0 0 8px 0' }}>
            5.1 <strong>Cancellation by the Customer (D-{cancellationRefundDays} Policy):</strong>
          </p>
          <ul style={{ paddingLeft: '20px', margin: '0 0 8px 0' }}>
            <li>Cancellation made <strong>≥ {cancellationRefundDays} days before departure</strong>: the Customer is entitled to a refund of <strong>100% (Full Refund)</strong>.</li>
            <li>Cancellation made <strong>&lt; {cancellationRefundDays} days before departure</strong>: a 100% cancellation fee applies (<strong>0% Refund / Forfeited</strong>). The payment is passed on to the Provider as compensation for the operational slot.</li>
          </ul>
          <p style={{ margin: '0 0 8px 0' }}>
            5.2 <strong>Cancellation by the Provider / Bad Weather / Quota Not Met:</strong>
          </p>
          <ul style={{ paddingLeft: '20px', margin: '0 0 8px 0' }}>
            <li>If the trip is cancelled by the Provider due to bad weather (Force Majeure) or because the minimum Open Trip quota has not been met at D-3, the Customer may choose a <strong>100% Full Refund</strong> or a <strong>Reschedule</strong>.</li>
            <li>A reschedule due to insufficient quota applies <strong>at most 1 (one) time</strong>. If the quota is still not met at D-3 on the replacement date, the system will automatically issue a 100% Full Refund.</li>
          </ul>
          <p style={{ margin: 0 }}>
            5.3 <strong>Full Payment & Held Funds:</strong> The Customer pays in full upfront online through the Midtrans payment gateway, with no down payment (DP) from the customer. The booking is forwarded to the Provider after the payment is confirmed. After the service fee and platform commission are deducted, the TemenTrip ledger records half of the Provider's share as available to request as preparation costs, and the remaining half becomes available only after the trip is completed.
          </p>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 8px 0' }}>
            5.1 <strong>Pembatalan oleh Customer (H-{cancellationRefundDays} Policy):</strong>
          </p>
          <ul style={{ paddingLeft: '20px', margin: '0 0 8px 0' }}>
            <li>Pembatalan dilakukan <strong>≥ {cancellationRefundDays} hari sebelum keberangkatan</strong>: Customer berhak menerima pengembalian dana <strong>100% (Full Refund)</strong>.</li>
            <li>Pembatalan dilakukan <strong>&lt; {cancellationRefundDays} hari sebelum keberangkatan</strong>: Dikenakan biaya pembatalan 100% (<strong>0% Refund / Uang Hangus</strong>). Pembayaran diteruskan ke Provider sebagai ganti rugi slot operasional.</li>
          </ul>
          <p style={{ margin: '0 0 8px 0' }}>
            5.2 <strong>Pembatalan oleh Provider / Cuaca Buruk / Kuota Tidak Terpenuhi:</strong>
          </p>
          <ul style={{ paddingLeft: '20px', margin: '0 0 8px 0' }}>
            <li>Jika trip dibatalkan oleh Provider karena cuaca buruk (Force Majeure) atau kuota minimal Open Trip belum terpenuhi di H-3, Customer berhak memilih <strong>Full Refund 100%</strong> atau <strong>Pindah Jadwal (Reschedule)</strong>.</li>
            <li>Penjadwalan ulang (Reschedule) akibat kuota kurang berlaku <strong>maksimal 1 (satu) kali</strong>. Jika pada jadwal pengganti kuota masih tidak terpenuhi di H-3, sistem akan melakukan Full Refund 100% otomatis.</li>
          </ul>
          <p style={{ margin: 0 }}>
            5.3 <strong>Pembayaran Penuh & Dana Tertahan:</strong> Customer membayar penuh di muka secara online melalui payment gateway Midtrans, tanpa uang muka (DP) dari customer. Booking diteruskan ke Provider setelah pembayaran terkonfirmasi. Setelah dipotong biaya layanan dan komisi platform, buku besar TemenTrip mencatat separuh hak Provider tersedia untuk diajukan sebagai biaya persiapan dan separuh sisanya baru tersedia setelah trip selesai.
          </p>
        </>
      )}
    </LegalSection>
  </div>
  );
};

export const PrivacyPolicyContent: React.FC = () => {
  const { t, lang } = useI18n();
  return (
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
        {t('KEBIJAKAN PRIVASI TEMENTRIP', 'TEMENTRIP PRIVACY POLICY')}
      </h2>
      <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
        {t(
          'Komitmen Kami dalam menjaga keamanan dan kerahasiaan Data Pribadi Anda sesuai UU No. 27 Tahun 2022.',
          'Our commitment to keeping your Personal Data secure and confidential in accordance with Law No. 27 of 2022.'
        )}
      </p>
      <EnglishVersionNote />
    </div>

    <LegalSection number="1" title={t('INFORMASI YANG DIKUMPULKAN', 'INFORMATION WE COLLECT')}>
      <p style={{ margin: '0 0 8px 0' }}>• <strong>{t('Data Identitas:', 'Identity Data:')}</strong> {t('Nama lengkap, alamat email, nomor WhatsApp/telepon.', 'Full name, email address, WhatsApp/phone number.')}</p>
      <p style={{ margin: '0 0 8px 0' }}>• <strong>{t('Data Transaksi:', 'Transaction Data:')}</strong> {t('Riwayat booking, bukti pembayaran, dan tanggal keberangkatan.', 'Booking history, proof of payment, and departure dates.')}</p>
      <p style={{ margin: 0 }}>• <strong>{t('Data Teknis:', 'Technical Data:')}</strong> {t('Alamat IP, jenis peramban, dan log aktivitas platform.', 'IP address, browser type, and platform activity logs.')}</p>
    </LegalSection>

    <LegalSection number="2" title={t('PENGGUNAAN & KERAHASIAAN DATA', 'DATA USE & CONFIDENTIALITY')}>
      <p style={{ margin: '0 0 8px 0' }}>• {t('Data digunakan khusus untuk memproses pendaftaran, pemesanan tiket, dan komunikasi trip.', 'Data is used only to process registrations, ticket bookings, and trip communication.')}</p>
      {lang === 'en' ? (
        <p style={{ margin: 0 }}>• We <strong>NEVER</strong> sell or rent your personal data to any party.</p>
      ) : (
        <p style={{ margin: 0 }}>• Kami <strong>TIDAK PERNAH</strong> menjual atau menyewakan data pribadi Anda kepada pihak mana pun.</p>
      )}
    </LegalSection>

    <LegalSection number="3" title={t('KEAMANAN TEKNIS', 'TECHNICAL SECURITY')}>
      <p style={{ margin: 0 }}>
        {t(
          'Seluruh kata sandi dienkripsi menggunakan algoritma standar industri (bcrypt), dan komunikasi data dilindungi oleh enkripsi SSL/TLS.',
          'All passwords are encrypted using an industry-standard algorithm (bcrypt), and data communication is protected by SSL/TLS encryption.'
        )}
      </p>
    </LegalSection>
  </div>
  );
};

export const CustomerRegistrationTermsContent: React.FC<RefundPolicyProps> = ({ cancellationRefundDays = 7 }) => {
  const { t, lang } = useI18n();
  return (
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
        {t('SYARAT & KETENTUAN PENDAFTARAN CUSTOMER', 'CUSTOMER REGISTRATION TERMS & CONDITIONS')}
      </h2>
      <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
        {t('Dokumen persetujuan pendaftaran akun Customer pada platform TemenTrip.', 'Consent document for registering a Customer account on the TemenTrip platform.')}
      </p>
      <EnglishVersionNote />
    </div>

    <LegalSection number="1" title={t('Persyaratan Pendaftaran', 'Registration Requirements')}>
      <p style={{ margin: '0 0 6px 0' }}>{t('1.1 Memberikan data identitas yang sah dan dapat dipertanggungjawabkan.', '1.1 Provide valid identity data that you can take responsibility for.')}</p>
      <p style={{ margin: '0 0 6px 0' }}>{t('1.2 Menggunakan nama, email, dan nomor WhatsApp yang masih aktif.', '1.2 Use a name, email, and WhatsApp number that are still active.')}</p>
      <p style={{ margin: '0 0 6px 0' }}>{t('1.3 Memenuhi persyaratan usia dan kecakapan hukum sesuai perundang-undangan.', '1.3 Meet the age and legal capacity requirements under applicable law.')}</p>
      <p style={{ margin: 0 }}>{t('1.4 Tidak diperkenankan membuat akun menggunakan identitas orang lain tanpa hak.', "1.4 Creating an account using another person's identity without the right to do so is not permitted.")}</p>
    </LegalSection>

    <LegalSection number="2" title={t('Kebenaran & Keamanan Informasi', 'Accuracy & Security of Information')}>
      <p style={{ margin: '0 0 6px 0' }}>{t('2.1 Customer bertanggung jawab penuh atas kebenaran data yang didaftarkan.', '2.1 The Customer is fully responsible for the accuracy of the registered data.')}</p>
      <p style={{ margin: 0 }}>{t('2.2 Customer wajib menjaga kerahasiaan kata sandi dan keamanan akun masing-masing.', '2.2 The Customer must keep their password confidential and their account secure.')}</p>
    </LegalSection>

    <LegalSection number="3" title={t(`Kebijakan Pembatalan & Refund (H-${cancellationRefundDays})`, `Cancellation & Refund Policy (D-${cancellationRefundDays})`)}>
      {lang === 'en' ? (
        <>
          <p style={{ margin: '0 0 6px 0' }}>3.1 Cancellation by the Booker ≥ {cancellationRefundDays} days before departure is entitled to a <strong>100% Full Refund</strong>.</p>
          <p style={{ margin: '0 0 6px 0' }}>3.2 Cancellation by the Booker &lt; {cancellationRefundDays} days before departure is <strong>0% Refund (Forfeited)</strong>.</p>
          <p style={{ margin: 0 }}>3.3 If the trip is cancelled by the Provider / due to weather / insufficient quota, the Booker is entitled to a <strong>100% Refund</strong> or a <strong>Reschedule (max. 1x)</strong>.</p>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 6px 0' }}>3.1 Pembatalan oleh Pemesan ≥ {cancellationRefundDays} hari sebelum keberangkatan berhak atas <strong>100% Full Refund</strong>.</p>
          <p style={{ margin: '0 0 6px 0' }}>3.2 Pembatalan oleh Pemesan &lt; {cancellationRefundDays} hari berstatus <strong>0% Refund (Uang Hangus)</strong>.</p>
          <p style={{ margin: 0 }}>3.3 Jika trip dibatalkan oleh Provider/Cuaca/Kuota Kurang, Pemesan berhak atas <strong>100% Refund</strong> atau <strong>Reschedule Maks 1x</strong>.</p>
        </>
      )}
    </LegalSection>

    <LegalSection number="4" title={t('Persetujuan Elektronik', 'Electronic Consent')}>
      <p style={{ margin: 0 }}>
        {t(
          'Dengan mencentang persetujuan ini, Customer menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan dengan kekuatan hukum mengikat secara elektronik.',
          'By ticking this consent, the Customer declares that they have read, understood, and agreed to all of the terms, which are electronically legally binding.'
        )}
      </p>
    </LegalSection>
  </div>
  );
};
