import React from 'react';
import { X, FileText } from 'lucide-react';

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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '750px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#0284c7" />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            fontSize: '13.5px',
            color: '#334155',
            lineHeight: '1.75'
          }}
        >
          {children}
        </div>

        {/* Footer Close Button */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            textAlign: 'right'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '13.5px',
              cursor: 'pointer'
            }}
          >
            Tutup Dokumen
          </button>
        </div>
      </div>
    </div>
  );
};

export const GeneralTermsContent: React.FC = () => (
  <div>
    <h2 style={{ textAlign: 'center', fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
      SYARAT DAN KETENTUAN PLATFORM TRIPKITA
    </h2>
    <p>
      Syarat dan Ketentuan ini merupakan ketentuan yang berlaku bagi setiap pengguna platform TripKita. Dengan mengakses, mendaftar, atau menggunakan layanan TripKita, pengguna dianggap telah membaca, memahami, dan menyetujui ketentuan yang tercantum dalam dokumen ini.
    </p>
    <p>
      TripKita merupakan platform digital yang mempertemukan pelanggan dengan penyedia layanan perjalanan. TripKita hadir membantu Customer dan Provider dalam mencari, membandingkan, melakukan pemesanan, dan melakukan pembayaran melalui sistem yang tersedia pada platform.
    </p>
    <p>
      TripKita bukan pihak yang secara langsung menjalankan atau mengoperasikan seluruh layanan perjalanan yang ditawarkan oleh Provider. Pelaksanaan perjalanan, kualitas layanan, kondisi fasilitas, keamanan kegiatan, perizinan, serta kewajiban hukum yang berkaitan dengan layanan menjadi tanggung jawab Provider.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>1. DEFINISI</h4>
    <p>
      <strong>1.1 TripKita</strong> adalah platform digital beserta pengelola dan sistem pendukungnya.<br />
      <strong>1.2 Customer</strong> adalah pengguna yang mencari, memesan, atau menggunakan layanan perjalanan melalui TripKita.<br />
      <strong>1.3 Provider</strong> adalah pihak yang menawarkan dan menyediakan layanan perjalanan melalui TripKita.<br />
      <strong>1.4 Platform</strong> adalah situs web, aplikasi, sistem, dan sarana digital lain yang digunakan untuk mengakses TripKita.<br />
      <strong>1.5 Booking</strong> adalah pemesanan layanan perjalanan yang dilakukan melalui Platform.<br />
      <strong>1.6 Itinerary</strong> adalah informasi mengenai rencana atau rangkaian perjalanan yang ditawarkan oleh Provider kepada Customer.<br />
      <strong>1.7 Force Majeure</strong> adalah keadaan di luar kemampuan wajar para pihak yang menyebabkan suatu kewajiban tidak dapat dilaksanakan sebagaimana mestinya.<br />
      <strong>1.8 Data Pribadi</strong> adalah data yang berkaitan dengan seseorang yang dapat diidentifikasi secara langsung maupun tidak langsung.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>2. LAYANAN TRIPKITA</h4>
    <p>
      2.1 TripKita menyediakan sarana bagi Customer dan Provider untuk melakukan interaksi dalam proses pencarian hingga pemesanan layanan perjalanan.<br />
      2.2 Dalam hal layanan yang dipublikasikan oleh Provider melalui Platform TripKita sepenuhnya menjadi tanggung jawab Provider atas kebenaran, kelengkapan, dan kesesuaian data informasi perjalanan.<br />
      2.3 Apabila ditemukan aktivitas yang diduga melanggar Syarat dan Ketentuan, merugikan pihak lain, atau berpotensi mengganggu keamanan Platform, TripKita berhak mengambil tindakan yang dianggap perlu.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>3. PENGGUNAAN PLATFORM</h4>
    <p>
      3.1 Customer wajib memberikan informasi sesuai identitas yang terdaftar dan dapat dipertanggungjawabkan dalam membuat akun atau melakukan Booking.<br />
      3.2 Akun yang telah terdaftar merupakan tanggung jawab masing-masing pengguna.<br />
      3.3 Platform tidak boleh digunakan untuk tindakan penipuan, menyebarkan informasi palsu, mengganggu sistem, atau melakukan transaksi di luar mekanisme resmi TripKita.<br />
      3.4 TripKita dapat melakukan perubahan, perbaikan, atau penghentian sementara terhadap fitur Platform demi peningkatan layanan.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>4. HAK DAN KEWAJIBAN CUSTOMER</h4>
    <p>
      4.1 Customer berhak memperoleh informasi yang benar, jelas, dan lengkap mengenai layanan yang dipesan.<br />
      4.2 Customer berhak memperoleh layanan sesuai Booking yang dikonfirmasi setelah memenuhi kewajiban pembayaran.<br />
      4.3 Customer berhak memperoleh pengembalian pembayaran (refund) sesuai ketentuan yang berlaku.<br />
      4.4 Customer wajib memberikan data yang benar dan mengikuti ketentuan yang ditetapkan Provider.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>5. HAK DAN KEWAJIBAN PROVIDER</h4>
    <p>
      5.1 Provider berhak menerima pembayaran yang sesuai dengan sistem pembayaran pada Platform TripKita.<br />
      5.2 Provider bertanggung jawab atas pelaksanaan layanan, kualitas, keamanan, fasilitas, dan perizinan usahanya.<br />
      5.3 Provider wajib memberikan informasi yang benar, jelas, dan dapat dipertanggungjawabkan mengenai layanan yang ditawarkan.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>6. BOOKING DAN PEMBAYARAN</h4>
    <p>
      6.1 Booking dianggap resmi apabila Customer telah menyelesaikan proses pemesanan dan memperoleh konfirmasi dari sistem TripKita.<br />
      6.2 Pembayaran dilakukan melalui metode resmi yang tersedia di Platform. Pembayaran di luar sistem resmi berada di luar pengawasan TripKita.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>7. PEMBATALAN DAN PENGEMBALIAN DANA</h4>
    <p>
      7.1 Ketentuan pembatalan dan pengembalian dana mengikuti ketentuan Booking dan kebijakan Provider yang berlaku.<br />
      7.2 Pengembalian dana dilakukan melalui sistem layanan TripKita yang disetujui Para Pihak dengan jangka waktu maksimal penyelesaian 3 (tiga) hari kerja.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>8. FORCE MAJEURE</h4>
    <p>
      8.1 Para pihak tidak dianggap melakukan pelanggaran apabila tidak dapat memenuhi kewajibannya akibat keadaan Force Majeure (bencana alam, cuaca ekstrem, kerusuhan, tindakan pemerintah).<br />
      8.2 Pihak yang mengalami Force Majeure wajib memberikan pemberitahuan maksimal 3 (tiga) hari.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>9. ULASAN DAN KONTEN PENGGUNA</h4>
    <p>
      9.1 Customer dapat memberikan ulasan berdasarkan pengalaman sebenarnya setelah trip selesai.<br />
      9.2 Ulasan tidak boleh mengandung ujaran kebencian, fitnah, atau informasi palsu.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>10. PERLINDUNGAN DATA PRIBADI</h4>
    <p>
      10.1 Data Pribadi dikumpulkan dan diproses untuk pembuatan akun, Booking, pembayaran, dan keamanan transaksi sesuai UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi.<br />
      10.2 Data Pribadi tidak diperjualbelikan kepada pihak ketiga.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>11. BATASAN TANGGUNG JAWAB & KETENTUAN PENUTUP</h4>
    <p>
      11.1 TripKita bertindak sebagai platform perantara. Penyelenggaraan langsung trip merupakan tanggung jawab Provider.<br />
      11.2 Syarat dan Ketentuan ini tunduk dan ditafsirkan berdasarkan hukum Republik Indonesia.
    </p>
  </div>
);

export const PrivacyPolicyContent: React.FC = () => (
  <div>
    <h2 style={{ textAlign: 'center', fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
      KEBIJAKAN PRIVASI PLATFORM TRIPKITA
    </h2>
    <p>
      Kebijakan Privasi ini menjelaskan bagaimana TripKita ("Kami") mengumpulkan, mengolah, menggunakan, menyimpan, dan melindungi Data Pribadi pengguna ("Anda") saat menggunakan platform digital TemenTrip / TripKita.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>1. INFORMASI YANG KAMI KUMPULKAN</h4>
    <p>
      Kami mengumpulkan informasi yang Anda berikan secara langsung kepada Kami saat membuat akun, melakukan booking, atau berkomunikasi dengan Kami, antara lain:<br />
      • <strong>Data Identitas & Kontak:</strong> Nama lengkap, alamat email, nomor telepon/WhatsApp, dan kata sandi.<br />
      • <strong>Data Pemesanan & Transaksi:</strong> Rincian paket wisata yang dipesan, jumlah peserta, tanggal perjalanan, dan informasi bukti pembayaran.<br />
      • <strong>Data Teknis:</strong> Alamat IP, jenis peramban (browser), dan data sesi log.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>2. PENGGUNAAN INFORMASI</h4>
    <p>
      Kami menggunakan informasi yang dikumpulkan untuk:<br />
      • Memproses pendaftaran akun dan verifikasi identitas pengguna.<br />
      • Memfasilitasi pemesanan paket wisata (Booking) dan penerbitan bukti tagihan invoice.<br />
      • Menghubungkan Customer dengan Provider untuk koordinasi perjalanan.<br />
      • Mengirimkan konfirmasi status transaksi dan pemberitahuan penting.<br />
      • Mencegah tindakan penipuan dan menjaga keamanan platform.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>3. KERAHASIAAN DAN BERBAGI DATA</h4>
    <p>
      Kami berkomitmen menjaga kerahasiaan Data Pribadi Anda. Kami tidak menjual atau menyewakan Data Pribadi kepada pihak manapun. Data hanya dibagikan secara terbatas kepada Provider terkait (untuk kebutuhan manifes trip) dan penyedia layanan pembayaran resmi (Xendit) untuk memproses pembayaran.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>4. KEAMANAN DATA</h4>
    <p>
      Kami menerapkan standar keamanan teknis dan organisasi yang layak, seperti enkripsi data (SSL/TLS) dan enkripsi kata sandi (bcrypt) untuk melindungi Data Pribadi Anda dari akses tanpa izin.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>5. HAK PENGGUNA & HUBUNGI KAMI</h4>
    <p>
      Anda berhak memperbarui, memperbaiki, atau meminta penghapusan data akun Anda melalui layanan bantuan resmi TripKita. Jika ada pertanyaan mengenai Kebijakan Privasi ini, silakan hubungi tim kami di <strong>support@tementrip.id</strong>.
    </p>
  </div>
);

export const CustomerRegistrationTermsContent: React.FC = () => (
  <div>
    <h2 style={{ textAlign: 'center', fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
      SYARAT DAN KETENTUAN PENDAFTARAN CUSTOMER TemenTrip
    </h2>
    <p>
      Dengan melakukan pendaftaran akun pada <strong>TemenTrip</strong>, Customer menyatakan telah membaca, memahami, dan menyetujui Syarat dan Ketentuan, Kebijakan Privasi, serta ketentuan lain yang berlaku pada TemenTrip.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>1. Persyaratan Pendaftaran</h4>
    <p>
      Untuk melakukan pendaftaran akun, Customer wajib:<br />
      1.1 memberikan informasi data sesuai dengan identitas yang sah menurut peraturan perundang-undangan dan dapat dipertanggungjawabkan kebenarannya;<br />
      1.2 menggunakan nama, alamat email, dan nomor telepon yang masih aktif;<br />
      1.3 memenuhi persyaratan usia dan kecakapan hukum sesuai dengan ketentuan peraturan perundang-undangan;<br />
      1.4 tidak menggunakan identitas atau informasi data dalam pendaftaran menggunakan data orang lain tanpa hak;<br />
      1.5 memiliki satu akun pribadi untuk mengakses layanan TemenTrip;<br />
      1.6 menyetujui Syarat dan Ketentuan serta Kebijakan Privasi TemenTrip.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>2. Data Pendaftaran</h4>
    <p>
      2.1 Dalam proses pendaftaran, Customer diminta memberikan data yang diperlukan, antara lain: Nama lengkap, Nomor telepon/WhatsApp, Alamat email, Kata sandi, serta informasi pendukung lainnya.<br />
      2.2 TemenTrip dapat meminta informasi tambahan yang dianggap penting apabila diperlukan untuk proses pemesanan, verifikasi, atau keamanan transaksi.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>3. Kebenaran Informasi</h4>
    <p>
      3.1 Customer bertanggung jawab penuh atas kebenaran dan keakuratan seluruh informasi yang diberikan kepada TemenTrip.<br />
      3.2 TemenTrip tidak bertanggung jawab terhadap kerugian yang timbul akibat kesalahan atau ketidaklengkapan data yang diberikan oleh Customer.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>4. Verifikasi & Keamanan Akun</h4>
    <p>
      4.1 TemenTrip dapat melakukan verifikasi akun melalui OTP, email, atau nomor telepon.<br />
      4.2 Customer bertanggung jawab menjaga kerahasiaan kata sandi dan informasi keamanan akun. Dilarang memberikan akses akun kepada pihak lain tanpa izin sah.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>5. Larangan Penggunaan Akun</h4>
    <p>
      Customer dilarang menggunakan akun TemenTrip untuk penipuan, manipulasi transaksi, mengganggu keamanan platform, atau aktivitas lain yang bertentangan dengan hukum.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>6. Penangguhan & Penonaktifan Akun</h4>
    <p>
      6.1 TemenTrip berhak menangguhkan akun jika terdapat indikasi pelanggaran atau penipuan.<br />
      6.2 Penonaktifan akun tidak menghapus kewajiban pembayaran yang telah timbul sebelumnya.
    </p>

    <h4 style={{ fontWeight: '800', color: '#0f172a', marginTop: '16px' }}>7. Penutup</h4>
    <p>
      Dengan menyelesaikan pendaftaran, Customer menyetujui bahwa persetujuan ini mempunyai kekuatan hukum yang mengikat secara elektronik.
    </p>
  </div>
);
