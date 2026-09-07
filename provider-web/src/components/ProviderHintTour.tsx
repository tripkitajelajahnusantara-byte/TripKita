import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronRight, ChevronLeft, X, Sparkles, LayoutDashboard, Package, CalendarDays, Wallet, User, PlusCircle } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export interface TourStep {
  id: string;
  title: string;
  menuName: string;
  icon: React.ReactNode;
  description: string;
  tips: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'dashboard',
    title: '1. Dashboard Utama',
    menuName: 'Dashboard',
    icon: <LayoutDashboard size={24} color="#0284c7" />,
    description: 'Menu ini adalah pusat kendali bisnis Anda. Di sini Anda dapat memantau ringkasan omset pendapatan bersih, total pesanan masuk, kuota terisi, serta grafik performa usaha Anda secara real-time.',
    tips: 'Cek halaman ini setiap hari untuk melihat perkembangan transaksi terbaru.'
  },
  {
    id: 'kelola-paket',
    title: '2. Kelola Paket Wisata',
    menuName: 'Kelola Paket',
    icon: <Package size={24} color="#00c9a7" />,
    description: 'Tempat Anda mengelola seluruh produk tur & trip. Anda dapat melihat daftar paket, mengedit harga, mengatur kuota peserta (min/max), serta mengaktifkan atau menonaktifkan paket.',
    tips: 'Pastikan paket memiliki minimal 5 foto menarik agar meningkatkan minat booking pelanggan.'
  },
  {
    id: 'booking',
    title: '3. Kelola Pesanan (Booking)',
    menuName: 'Booking',
    icon: <CalendarDays size={24} color="#f59e0b" />,
    description: 'Menu ini mencatat seluruh transaksi pesanan dari pelanggan. Anda dapat melihat detail pemesan, daftar peserta trip, status pembayaran Xendit/Transfer, serta mengubah status perjalanan.',
    tips: 'Anda dapat meninjau bukti pembayaran dan menghubungi pelanggan langsung via WhatsApp.'
  },
  {
    id: 'keuangan-provider',
    title: '4. Keuangan & Saldo (Payouts)',
    menuName: 'Keuangan & Saldo',
    icon: <Wallet size={24} color="#16a34a" />,
    description: 'Sistem pencairan dana transparan! Anda dapat mengajukan pencairan 50% Uang Muka (DP) di awal saat booking lunas, dan 50% Pelunasan setelah trip selesai langsung ke rekening bank Mitra Anda.',
    tips: 'Uang 50% DP siap dicairkan diawal, dan 50% sisa pelunasan otomatis aktif setelah trip selesai.'
  },
  {
    id: 'profil-provider',
    title: '5. Profil & Legalitas Mitra',
    menuName: 'Profil Provider',
    icon: <User size={24} color="#6366f1" />,
    description: 'Di sini Anda dapat mengelola informasi profil usaha, mengunggah dokumen legalitas (KTP, NIB, NPWP, Akta Usaha), serta mengatur nomor rekening bank tujuan pencairan dana.',
    tips: 'Pastikan data rekening bank sesuai dengan nama pemilik usaha agar verifikasi pencairan lancar.'
  },
  {
    id: 'tambah-paket',
    title: '6. Buat Paket Wisata Baru',
    menuName: 'Tambah Paket',
    icon: <PlusCircle size={24} color="#ff6b81" />,
    description: 'Gunakan tombol "+ Tambah Paket" di bagian bawah sidebar untuk membuat paket perjalanan baru melalui 5 langkah mudah (Info dasar, Itinerary, Fasilitas, Harga & Upload foto).',
    tips: 'Isi itinerary lengkap per hari agar calon peserta lebih yakin melakukan pemesanan.'
  }
];

export const ProviderHintTour: React.FC = () => {
  const { navigateTo } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Check if provider is opening for the first time
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('tripkita_provider_seen_tour');
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, []);

  const handleOpenTour = () => {
    setCurrentStepIndex(0);
    setIsOpen(true);
  };

  const handleCloseTour = () => {
    localStorage.setItem('tripkita_provider_seen_tour', 'true');
    setIsOpen(false);
  };

  const handleNextStep = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      // Navigate to menu if corresponding route
      const nextStep = TOUR_STEPS[nextIdx];
      if (nextStep.id !== 'tambah-paket') {
        navigateTo(nextStep.id as any);
      }
    } else {
      handleCloseTour();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      const prevStep = TOUR_STEPS[prevIdx];
      if (prevStep.id !== 'tambah-paket') {
        navigateTo(prevStep.id as any);
      }
    }
  };

  const step = TOUR_STEPS[currentStepIndex];

  return (
    <>
      {/* Trigger Button in Top Right Header */}
      <button
        onClick={handleOpenTour}
        className="hint-tour-trigger-btn"
        title="Bantuan & Panduan Fitur Provider"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '8px 14px',
          backgroundColor: '#ffffff',
          color: '#0284c7',
          border: '1.5px solid #bae6fd',
          borderRadius: '20px',
          fontSize: '12.5px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.08)',
          transition: 'all 0.2s ease',
        }}
      >
        <HelpCircle size={16} color="#0284c7" />
        <span>Panduan Fitur (Hint)</span>
      </button>

      {/* Modal Tour Dialog */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',

            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              animation: 'scaleUp 0.25s ease-out'
            }}
          >
            {/* Top Bar inside Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Panduan Mitra • Langkah {currentStepIndex + 1} dari {TOUR_STEPS.length}
                </span>
              </div>
              
              <button
                onClick={handleCloseTour}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Tutup Panduan"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Content */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div style={{ backgroundColor: '#f0f9ff', padding: '14px', borderRadius: '16px', border: '1px solid #bae6fd', flexShrink: 0 }}>
                {step.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                  {step.title}
                </h3>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>
                  Menu: <strong>{step.menuName}</strong>
                </span>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              {step.description}
            </p>

            {/* Tips Box */}
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '14px 16px', marginBottom: '28px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Sparkles size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12.5px', color: '#92400e', lineHeight: '1.5' }}>
                <strong style={{ display: 'block', marginBottom: '2px', color: '#78350f' }}>Tips Praktis:</strong>
                {step.tips}
              </div>
            </div>

            {/* Navigation Progress Dots & Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              
              {/* Progress Dots */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {TOUR_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setCurrentStepIndex(idx);
                      const target = TOUR_STEPS[idx];
                      if (target.id !== 'tambah-paket') navigateTo(target.id as any);
                    }}
                    style={{
                      width: currentStepIndex === idx ? '22px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: currentStepIndex === idx ? '#0284c7' : '#cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease'
                    }}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCloseTour}
                  style={{
                    padding: '9px 14px',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Skip (Lewati)
                </button>

                {currentStepIndex > 0 && (
                  <button
                    onClick={handlePrevStep}
                    style={{
                      padding: '9px 14px',
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ChevronLeft size={16} /> Kembali
                  </button>
                )}

                <button
                  onClick={handleNextStep}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {currentStepIndex === TOUR_STEPS.length - 1 ? 'Selesai & Mengerti 🎉' : 'Selanjutnya (Next)'}
                  {currentStepIndex < TOUR_STEPS.length - 1 && <ChevronRight size={16} />}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
};
