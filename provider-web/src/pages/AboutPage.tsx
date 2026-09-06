import React, { useState } from 'react';
import { 
  HelpCircle, 
  CreditCard, 
  Calendar, 
  ShieldCheck, 
  MessageSquare, 
  Mail, 
  PhoneCall, 
  ChevronDown, 
  Search,
  CheckCircle2
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export const AboutPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('semua');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const faqs: FAQItem[] = [
    {
      id: 'faq-1',
      category: 'pemesanan',
      question: 'Bagaimana cara memesan paket wisata di TemenTrip?',
      answer: 'Sangat mudah! Pilih paket wisata pilihan Anda dari Beranda, tentukan tanggal keberangkatan dan jumlah peserta, lalu klik "Pesan Sekarang". Anda dapat memesan langsung tanpa ribet dan pembayaran diproses secara instan.'
    },
    {
      id: 'faq-2',
      category: 'pembayaran',
      question: 'Bagaimana skema pembayaran DP 50% & Pelunasan bekerja?',
      answer: 'Untuk menjamin keamanan transaksi Anda dan kenyamanan mitra provider, pembayaran dilakukan dalam 2 tahap: DP 50% dibayarkan saat memesan awal, dan sisa 50% dilunasi saat perjalanan wisata telah selesai dilaksanakan.'
    },
    {
      id: 'faq-3',
      category: 'pembayaran',
      question: 'Metode pembayaran apa saja yang didukung?',
      answer: 'TemenTrip mendukung pembayaran digital cepat via Xendit QRIS (GoPay, OVO, DANA, ShopeePay, LinkAja) serta Virtual Account Bank resmi (BCA, Mandiri, BNI, BRI).'
    },
    {
      id: 'faq-4',
      category: 'grup-wa',
      question: 'Bagaimana cara bergabung dengan WhatsApp Group Mitra / Pemandu Trip?',
      answer: 'Setelah pembayaran berhasil, buka menu "Cek Booking" di bagian navigasi atas, masukkan Kode Booking Anda (contoh: TK-14108-xxxx), lalu klik tombol hijau "Join WA Group Mitra" untuk terhubung langsung dengan tour guide dan peserta lainnya.'
    },
    {
      id: 'faq-5',
      category: 'tiket',
      question: 'Bagaimana jika saya tidak sengaja lupa atau kehilangan Kode Booking?',
      answer: 'Jangan khawatir! Anda dapat masuk (login) ke akun Customer Anda untuk melihat seluruh e-voucher dan riwayat transaksi. Atau Anda dapat menghubungi tim Customer Service kami melalui email support@tementrip.id.'
    },
    {
      id: 'faq-6',
      category: 'refund',
      question: 'Bagaimana kebijakan refund jika terjadi cuaca ekstrem atau bencana alam (Force Majeure)?',
      answer: 'Jika trip dibatalkan secara sepihak oleh mitra provider demi alasan keselamatan akibat cuaca ekstrem atau bencana alam, dana pembayaran Anda dijamin dikembalikan 100% (Full Refund) melalui platform TemenTrip.'
    },
    {
      id: 'faq-7',
      category: 'keamanan',
      question: 'Apakah transaksi dan data pribadi saya di TemenTrip aman?',
      answer: 'Sangat aman. Seluruh transaksi pembayaran dilindungi enkripsi SSL 256-bit berstandar internasional dan dana disimpan di rekening penampung resmi sampai jadwal perjalanan Anda selesai.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCat = activeCategory === 'semua' || faq.category === activeCategory;
    const matchesQuery = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <div className="help-page animate-fade-in">
      {/* Help Hero Header */}
      <section className="help-hero">
        <div className="container help-hero-container">
          <span className="help-hero-tag">PUSAT BANTUAN TEMENTRIP</span>
          <h1>Ada yang Bisa Kami Bantu?</h1>
          <p>Temukan jawaban lengkap atas pertanyaan seputar pemesanan paket wisata, skema pembayaran DP 50%, akses grup WA, dan layanan pelanggan TemenTrip.</p>

          {/* Search Box */}
          <div className="help-search-box">
            <Search size={20} color="#0284c7" />
            <input 
              type="text" 
              placeholder="Cari pertanyaan... (contoh: cara bayar, DP 50%, refund, WA Group)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Category Shortcut Cards */}
      <section className="help-categories-section">
        <div className="container">
          <div className="categories-grid">
            <div className={`category-card ${activeCategory === 'semua' ? 'active' : ''}`} onClick={() => setActiveCategory('semua')}>
              <div className="cat-icon bg-blue"><HelpCircle size={22} color="#0284c7" /></div>
              <h3>Semua Bantuan</h3>
              <p>Panduan lengkap platform TemenTrip</p>
            </div>
            <div className={`category-card ${activeCategory === 'pemesanan' ? 'active' : ''}`} onClick={() => setActiveCategory('pemesanan')}>
              <div className="cat-icon bg-teal"><Calendar size={22} color="#00c9a7" /></div>
              <h3>Pemesanan & Tiket</h3>
              <p>Cara booking & cek voucher</p>
            </div>
            <div className={`category-card ${activeCategory === 'pembayaran' ? 'active' : ''}`} onClick={() => setActiveCategory('pembayaran')}>
              <div className="cat-icon bg-purple"><CreditCard size={22} color="#8b5cf6" /></div>
              <h3>Pembayaran & DP 50%</h3>
              <p>Xendit QRIS & Bank Transfer</p>
            </div>
            <div className={`category-card ${activeCategory === 'refund' ? 'active' : ''}`} onClick={() => setActiveCategory('refund')}>
              <div className="cat-icon bg-green"><ShieldCheck size={22} color="#10b981" /></div>
              <h3>Garansi & Refund</h3>
              <p>Keamanan transaksi & garansi 100%</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="faq-section">
        <div className="container faq-container">
          <div className="section-header">
            <span className="section-tag">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="section-title">Pertanyaan Sering Diajukan</h2>
            <p className="section-subtitle">Jawaban cepat untuk pertanyaan yang sering ditanyakan oleh wisatawan kami.</p>
          </div>

          <div className="faq-list">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className={`faq-item ${isOpen ? 'open' : ''}`}>
                    <div className="faq-question" onClick={() => toggleFaq(faq.id)}>
                      <h3>{faq.question}</h3>
                      <ChevronDown size={20} className="faq-arrow" />
                    </div>
                    {isOpen && (
                      <div className="faq-answer animate-fade-in">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                <HelpCircle size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Pertanyaan tidak ditemukan. Silakan hubungi Customer Service kami di bawah ini.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Support Section */}
      <section className="contact-support-section">
        <div className="container contact-container">
          <div className="contact-card-main">
            <div className="contact-info-left">
              <span className="contact-badge">KONTAK BANTUAN TEMENTRIP</span>
              <h2>Butuh Bantuan Lebih Lanjut?</h2>
              <p>Tim Customer Support TemenTrip siap membantu Anda 24 jam setiap hari untuk memastikan liburan Anda berjalan lancar tanpa kendala.</p>

              <div className="contact-methods-list">
                <div className="contact-method-item">
                  <div className="method-icon-box">
                    <Mail size={20} color="#0284c7" />
                  </div>
                  <div>
                    <span className="method-label">Email Dukungan Pelanggan Resmi:</span>
                    <a href="mailto:support@tementrip.id" className="method-value">support@tementrip.id</a>
                  </div>
                </div>

                <div className="contact-method-item">
                  <div className="method-icon-box">
                    <MessageSquare size={20} color="#00c9a7" />
                  </div>
                  <div>
                    <span className="method-label">WhatsApp Fast Response CS:</span>
                    <a href="https://wa.me/6280000000000" target="_blank" rel="noreferrer" className="method-value">+62 800 0000 0000</a>
                  </div>
                </div>

                <div className="contact-method-item">
                  <div className="method-icon-box">
                    <PhoneCall size={20} color="#8b5cf6" />
                  </div>
                  <div>
                    <span className="method-label">Jam Operasional Layanan:</span>
                    <span className="method-value-text">24 Jam / 7 Hari Seminggu (Senin - Minggu)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="contact-guarantee-right">
              <div className="guarantee-box">
                <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '12px' }} />
                <h3>Jaminan Respon Cepat</h3>
                <p>Setiap pesan email dan WhatsApp akan dibalas oleh tim Customer Service profesional dalam waktu kurang dari 15 menit pada jam operasional.</p>
                <button className="contact-action-btn" onClick={() => window.location.href = 'mailto:support@tementrip.id'}>
                  Kirim Email ke support@tementrip.id
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        /* Help Hero */
        .help-hero {
          background: linear-gradient(135deg, #092c2e 0%, #0f172a 100%);
          padding: 70px 0 80px;
          color: #ffffff;
          text-align: center;
        }

        .help-hero-container {
          max-width: 720px;
        }

        .help-hero-tag {
          font-size: 12px;
          font-weight: 800;
          color: #00c9a7;
          letter-spacing: 1.5px;
          display: block;
          margin-bottom: 12px;
        }

        .help-hero h1 {
          color: #ffffff;
          font-size: 36px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .help-hero p {
          font-size: 15px;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 28px;
        }

        .help-search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #ffffff;
          border-radius: 40px;
          padding: 12px 24px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          max-width: 600px;
          margin: 0 auto;
        }

        .help-search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 14px;
          color: #0f172a;
        }

        /* Categories */
        .help-categories-section {
          padding: 40px 0;
          margin-top: -40px;
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .category-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .category-card:hover, .category-card.active {
          border-color: #0284c7;
          transform: translateY(-3px);
          box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.15);
        }

        .category-card.active {
          background-color: #f0f9ff;
        }

        .cat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .cat-icon.bg-blue { background: #e0f2fe; }
        .cat-icon.bg-teal { background: #e6f7f5; }
        .cat-icon.bg-purple { background: #f3e8ff; }
        .cat-icon.bg-green { background: #dcfce7; }

        .category-card h3 {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .category-card p {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        /* FAQ List */
        .faq-section {
          padding: 60px 0 80px;
        }

        .faq-container {
          max-width: 800px;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 32px;
        }

        .faq-item {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .faq-item.open {
          border-color: #38bdf8;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08);
        }

        .faq-question {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
          background: #ffffff;
        }

        .faq-question h3 {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .faq-arrow {
          color: #64748b;
          transition: transform 0.2s ease;
        }

        .faq-item.open .faq-arrow {
          transform: rotate(180deg);
          color: #0284c7;
        }

        .faq-answer {
          padding: 0 24px 20px 24px;
          color: #475569;
          font-size: 14px;
          line-height: 1.7;
          border-top: 1px dashed #f1f5f9;
          margin-top: 4px;
          padding-top: 16px;
        }

        /* Contact Support Section */
        .contact-support-section {
          background: #f8fafc;
          padding: 70px 0;
          border-top: 1px solid #e2e8f0;
        }

        .contact-container {
          max-width: 960px;
        }

        .contact-card-main {
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          padding: 40px;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 40px;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
        }

        .contact-badge {
          font-size: 11px;
          font-weight: 800;
          color: #0284c7;
          letter-spacing: 1px;
          display: block;
          margin-bottom: 8px;
        }

        .contact-info-left h2 {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 10px;
        }

        .contact-info-left p {
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .contact-methods-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .contact-method-item {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .method-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #f0f9ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .method-label {
          font-size: 11px;
          color: #94a3b8;
          display: block;
          font-weight: 600;
        }

        .method-value {
          font-size: 14.5px;
          font-weight: 700;
          color: #0284c7;
          text-decoration: underline;
        }

        .method-value-text {
          font-size: 13.5px;
          font-weight: 700;
          color: #1e293b;
        }

        .contact-guarantee-right {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 18px;
          padding: 28px;
          display: flex;
          align-items: center;
        }

        .guarantee-box h3 {
          font-size: 18px;
          font-weight: 800;
          color: #0369a1;
          margin-bottom: 8px;
        }

        .guarantee-box p {
          font-size: 12.5px;
          color: #0c4a6e;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .contact-action-btn {
          width: 100%;
          padding: 12px;
          background: #0284c7;
          color: #ffffff;
          border: none;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
        }

        .contact-action-btn:hover {
          background: #0369a1;
        }

        @media (max-width: 868px) {
          .categories-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .contact-card-main {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }

        @media (max-width: 540px) {
          .categories-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
