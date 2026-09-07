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
    icon: <LayoutDashboard size={20} color="#0284c7" />,
    description: 'Menu ini adalah pusat kendali bisnis Anda untuk memantau ringkasan omset pendapatan bersih, total pesanan masuk, kuota terisi, dan statistik bisnis.',
    tips: 'Cek halaman ini setiap hari untuk melihat perkembangan transaksi terbaru.'
  },
  {
    id: 'kelola-paket',
    title: '2. Kelola Paket Wisata',
    menuName: 'Kelola Paket',
    icon: <Package size={20} color="#00c9a7" />,
    description: 'Tempat Anda membuat, melihat, dan mengedit paket wisata. Anda dapat mengatur harga, kuota peserta, lokasi destinasi, serta mengaktifkan/nonaktifkan paket.',
    tips: 'Tambahkan foto berkualitas tinggi pada setiap paket untuk menarik calon pembeli.'
  },
  {
    id: 'booking',
    title: '3. Kelola Pesanan (Booking)',
    menuName: 'Booking',
    icon: <CalendarDays size={20} color="#f59e0b" />,
    description: 'Menu ini mencatat seluruh pemesanan dari pelanggan. Anda dapat melihat detail pemesan, daftar peserta, verifikasi pembayaran, dan update status trip.',
    tips: 'Gunakan tombol Export CSV untuk mengunduh rekap laporan pesanan pelanggan ke Excel.'
  },
  {
    id: 'keuangan-provider',
    title: '4. Keuangan & Saldo (Payouts)',
    menuName: 'Keuangan & Saldo',
    icon: <Wallet size={20} color="#16a34a" />,
    description: 'Sistem pencairan dana otomatis! Anda dapat mencairkan 50% Uang Muka (DP) di awal saat lunas, dan 50% Pelunasan setelah trip selesai langsung ke rekening Anda.',
    tips: 'Saldo DP 50% bisa langsung dicairkan saat order lunas, sisa 50% aktif setelah trip selesai.'
  },
  {
    id: 'profil-provider',
    title: '5. Profil & Legalitas Mitra',
    menuName: 'Profil Provider',
    icon: <User size={20} color="#6366f1" />,
    description: 'Kelola profil usaha Anda, dokumen legalitas (KTP, NIB, NPWP), serta nomor rekening bank tujuan pencairan dana.',
    tips: 'Pastikan nama rekening bank sesuai dengan nama pemilik usaha agar verifikasi pencairan cepat.'
  },
  {
    id: 'tambah-paket',
    title: '6. Buat Paket Wisata Baru',
    menuName: 'Tambah Paket',
    icon: <PlusCircle size={20} color="#ff6b81" />,
    description: 'Gunakan tombol "+ Tambah Paket" untuk membuat paket wisata baru melalui 5 langkah mudah (Info dasar, Itinerary, Fasilitas, Harga & Upload foto).',
    tips: 'Isi rencana perjalanan (itinerary) per hari secara rinci agar peserta mantap mendaftar.'
  }
];

export const ProviderHintTour: React.FC = () => {
  const { route, navigateTo } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Sync step index with current route if open
  useEffect(() => {
    const idx = TOUR_STEPS.findIndex(s => s.id === route);
    if (idx !== -1) {
      setCurrentStepIndex(idx);
    }
  }, [route]);

  const handleOpenTour = () => {
    // Determine step from current route or default to 0
    const idx = TOUR_STEPS.findIndex(s => s.id === route);
    setCurrentStepIndex(idx !== -1 ? idx : 0);
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

  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  return (
    <>
      {/* Compact Trigger Button in Top Right Header */}
      <button
        onClick={handleOpenTour}
        className="hint-tour-trigger-btn"
        title="Bantuan & Panduan Fitur"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          backgroundColor: '#ffffff',
          color: '#0284c7',
          border: '1.5px solid #bae6fd',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(2, 132, 199, 0.1)',
          transition: 'all 0.2s ease',
        }}
      >
        <HelpCircle size={15} color="#0284c7" />
        <span>Panduan</span>
      </button>

      {/* Floating Side Card (No Screen-Blocking Dark Overlay!) */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(2, 132, 199, 0.15)',
            animation: 'slideUp 0.25s ease-out'
          }}
        >
          {/* Header inside Compact Side Card */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '3px 9px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Panduan • {currentStepIndex + 1} dari {TOUR_STEPS.length}
            </span>
            
            <button
              onClick={handleCloseTour}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '3px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Tutup Panduan"
            >
              <X size={18} />
            </button>
          </div>

          {/* Step Icon & Title */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ backgroundColor: '#f0f9ff', padding: '10px', borderRadius: '12px', border: '1px solid #bae6fd', flexShrink: 0 }}>
              {step.icon}
            </div>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>
                {step.title}
              </h4>
              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>
                Halaman: <strong>{step.menuName}</strong>
              </span>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.55', margin: '0 0 14px 0' }}>
            {step.description}
          </p>

          {/* Compact Tips Box */}
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '10px 12px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Sparkles size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '11.5px', color: '#92400e', lineHeight: '1.45' }}>
              <strong style={{ color: '#78350f' }}>Tips: </strong>
              {step.tips}
            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            
            <button
              onClick={handleCloseTour}
              style={{
                padding: '7px 12px',
                backgroundColor: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Skip
            </button>

            <div style={{ display: 'flex', gap: '6px' }}>
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrevStep}
                  style={{
                    padding: '7px 10px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <ChevronLeft size={14} /> Back
                </button>
              )}

              <button
                onClick={handleNextStep}
                style={{
                  padding: '7px 14px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {currentStepIndex === TOUR_STEPS.length - 1 ? 'Selesai 🎉' : 'Next'}
                {currentStepIndex < TOUR_STEPS.length - 1 && <ChevronRight size={14} />}
              </button>
            </div>

          </div>

        </div>
      )}
    </>
  );
};
