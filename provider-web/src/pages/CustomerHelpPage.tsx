import React, { useState } from 'react';
import { useCancellationRefundDays } from '../utils/checkoutConfig';
import { 
  HelpCircle, 
  CreditCard, 
  Calendar, 
  ShieldCheck, 
  MessageSquare, 
  Mail, 
  ChevronDown, 
  Search,
  MapPin
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export const CustomerHelpPage: React.FC = () => {
  const refundDays = useCancellationRefundDays();
  const [activeCategory, setActiveCategory] = useState<string>('semua');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const faqs: FAQItem[] = [
    {
      id: 'faq-1',
      category: 'pemesanan',
      question: 'Bagaimana cara memesan paket wisata di TemenTrip?',
      answer: 'Pilih paket dari Beranda, tentukan tanggal keberangkatan dan jumlah peserta, lalu klik "Pesan Sekarang". Setelah Booking ID dibuat, kuota ditahan 24 jam dan Anda diarahkan ke halaman transfer serta upload bukti pembayaran.'
    },
    {
      id: 'faq-2',
      category: 'pembayaran',
      question: 'Bagaimana skema pembayaran di TemenTrip?',
      answer: 'Pembayaran dilakukan penuh di muka melalui transfer ke rekening TemenTrip, tanpa uang muka (DP) dari customer. Batas pembayaran mengikuti countdown 24 jam. Setelah bukti disetujui admin, buku besar TemenTrip mencatat separuh hak mitra tersedia untuk diajukan dan separuh sisanya setelah perjalanan selesai.'
    },
    {
      id: 'faq-3',
      category: 'pembayaran',
      question: 'Metode pembayaran apa saja yang didukung?',
      answer: 'Untuk sementara pembayaran dilakukan melalui transfer bank manual ke rekening TemenTrip yang tercantum pada halaman pembayaran, lalu customer mengunggah bukti transfer.'
    },
    {
      id: 'faq-4',
      category: 'pemesanan',
      question: 'Bagaimana cara menghubungi provider setelah pembayaran?',
      answer: 'Masuk ke akun Anda lalu buka riwayat booking. Setelah pembayaran terkonfirmasi, tombol "Hubungi Provider" akan tersedia bila provider memiliki nomor WhatsApp aktif.'
    },
    {
      id: 'faq-5',
      category: 'pemesanan',
      question: 'Bagaimana jika saya tidak sengaja lupa atau kehilangan Kode Booking?',
      answer: 'Masuk ke akun Anda untuk melihat semua e-voucher dan riwayat transaksi. Anda juga bisa menghubungi kami melalui email tripkitajelajahnusantara@gmail.com.'
    },
    {
      id: 'faq-6',
      category: 'refund',
      question: 'Bagaimana jika trip dibatalkan atau dijadwal ulang oleh mitra?',
      answer: 'Tiga hari sebelum keberangkatan (H-3), mitra memeriksa kuota untuk Open Trip atau kondisi cuaca untuk jenis trip lainnya. Jika mitra membatalkan trip, pembayaran Anda dikembalikan penuh. Jika mitra menawarkan jadwal baru, jadwal itu hanya berlaku setelah Anda setujui; jika Anda menolak atau tidak menanggapi, pembayaran Anda dikembalikan penuh.'
    },
    {
      id: 'faq-7',
      category: 'pembayaran',
      question: 'Bagaimana pembayaran saya diproses?',
      answer: 'Setelah transfer, unggah bukti pembayaran sebelum countdown berakhir. Status berubah menjadi Menunggu Konfirmasi Admin dan wajib diperiksa maksimal 1×24 jam. Status dapat dipantau melalui Cek Booking.'
    },
    {
      id: 'faq-8',
      category: 'refund',
      question: 'Bagaimana jika saya ingin membatalkan pesanan?',
      answer: refundDays
        ? `Jika Anda membatalkan paling lambat ${refundDays} hari sebelum tanggal trip, pembayaran dikembalikan penuh. Pembatalan kurang dari ${refundDays} hari sebelum trip tidak mendapat refund.`
        : 'Pembatalan sebelum batas waktu kebijakan refund mendapat pengembalian penuh; setelah batas itu tidak mendapat refund. Detail batasnya tertera di halaman konfirmasi pesanan.'
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
          <h1>Pusat bantuan</h1>
          <p>Jawaban untuk pertanyaan seputar pemesanan, pembayaran, pembatalan, dan cara menghubungi mitra.</p>

          {/* Search Box */}
          <div className="help-search-box">
            <Search size={20} color="#0284c7" />
            <input 
              type="text" 
              placeholder="Cari pertanyaan... (contoh: cara bayar, refund, provider)"
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
            <div role="button" tabIndex={0} aria-pressed={activeCategory === 'semua'} className={`category-card ${activeCategory === 'semua' ? 'active' : ''}`} onClick={() => setActiveCategory('semua')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveCategory('semua'); } }}>
              <div className="cat-icon bg-blue"><HelpCircle size={22} color="#0284c7" /></div>
              <h3>Semua Bantuan</h3>
              <p>Tampilkan semua pertanyaan</p>
            </div>
            <div role="button" tabIndex={0} aria-pressed={activeCategory === 'pemesanan'} className={`category-card ${activeCategory === 'pemesanan' ? 'active' : ''}`} onClick={() => setActiveCategory('pemesanan')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveCategory('pemesanan'); } }}>
              <div className="cat-icon bg-teal"><Calendar size={22} color="#00c9a7" /></div>
              <h3>Pemesanan</h3>
              <p>Cara booking & cek voucher</p>
            </div>
            <div role="button" tabIndex={0} aria-pressed={activeCategory === 'pembayaran'} className={`category-card ${activeCategory === 'pembayaran' ? 'active' : ''}`} onClick={() => setActiveCategory('pembayaran')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveCategory('pembayaran'); } }}>
              <div className="cat-icon bg-purple"><CreditCard size={22} color="#8b5cf6" /></div>
              <h3>Pembayaran</h3>
              <p>Transfer manual & upload bukti</p>
            </div>
            <div role="button" tabIndex={0} aria-pressed={activeCategory === 'refund'} className={`category-card ${activeCategory === 'refund' ? 'active' : ''}`} onClick={() => setActiveCategory('refund')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveCategory('refund'); } }}>
              <div className="cat-icon bg-green"><ShieldCheck size={22} color="#10b981" /></div>
              <h3>Pembatalan & refund</h3>
              <p>Aturan refund dan jadwal ulang</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="faq-section">
        <div className="container faq-container">
          <div className="section-header">
            <h2 className="section-title">Pertanyaan yang sering diajukan</h2>
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
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Pertanyaan tidak ditemukan. Silakan hubungi kami melalui kontak di bawah.</p>
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
              <h2>Masih butuh bantuan?</h2>
              <p>Hubungi kami melalui WhatsApp atau email.</p>

              <div className="contact-methods-list">
                <div className="contact-method-item">
                  <div className="method-icon-box">
                    <Mail size={20} color="#0284c7" />
                  </div>
                  <div>
                    <span className="method-label">Email:</span>
                    <a href="mailto:tripkitajelajahnusantara@gmail.com" className="method-value">tripkitajelajahnusantara@gmail.com</a>
                  </div>
                </div>

                <div className="contact-method-item">
                  <div className="method-icon-box">
                    <MessageSquare size={20} color="#00c9a7" />
                  </div>
                  <div>
                    <span className="method-label">WhatsApp:</span>
                    <a href="https://wa.me/628132008875" target="_blank" rel="noreferrer" className="method-value">+62 813 2008 875</a>
                  </div>
                </div>

                <div className="contact-method-item">
                  <div className="method-icon-box">
                    <MapPin size={20} color="#f59e0b" />
                  </div>
                  <div>
                    <span className="method-label">Alamat:</span>
                    <span className="method-value-text">Jl. Puskesmas No.35-22, RT.11/RW.7, Duri Kosambi, Kecamatan Cengkareng, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta</span>
                  </div>
                </div>
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
          max-width: 640px;
          margin: 0 auto;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
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
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .category-card {
            padding: 14px !important;
          }
          .category-card p {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
