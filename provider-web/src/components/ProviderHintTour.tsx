import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronRight, ChevronLeft, X, Sparkles, LayoutDashboard, Package, CalendarDays, Wallet, User, PlusCircle } from 'lucide-react';

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
    icon: <LayoutDashboard size={18} color="#0284c7" />,
    description: 'Pusat kendali bisnis Anda untuk memantau ringkasan omset pendapatan bersih, total pesanan masuk, kuota terisi, dan statistik bisnis.',
    tips: 'Cek halaman ini setiap hari untuk melihat perkembangan transaksi terbaru.'
  },
  {
    id: 'kelola-paket',
    title: '2. Kelola Paket Wisata',
    menuName: 'Kelola Paket',
    icon: <Package size={18} color="#00c9a7" />,
    description: 'Tempat membuat, melihat, dan mengedit paket wisata. Atur harga, kuota peserta, destinasi, serta status paket.',
    tips: 'Tambahkan foto berkualitas tinggi pada setiap paket untuk menarik calon pembeli.'
  },
  {
    id: 'booking',
    title: '3. Kelola Pesanan (Booking)',
    menuName: 'Booking',
    icon: <CalendarDays size={18} color="#f59e0b" />,
    description: 'Mencatat seluruh pemesanan pelanggan. Lihat detail pemesan, daftar peserta, verifikasi pembayaran, dan update status trip.',
    tips: 'Gunakan tombol Export CSV untuk mengunduh rekap laporan pesanan ke Excel.'
  },
  {
    id: 'keuangan-provider',
    title: '4. Keuangan & Saldo (Payouts)',
    menuName: 'Keuangan & Saldo',
    icon: <Wallet size={18} color="#16a34a" />,
    description: 'Cairkan 50% DP di awal saat lunas, dan sisa 50% Pelunasan setelah trip selesai langsung ke rekening bank Anda.',
    tips: 'Saldo DP 50% aktif dicairkan saat order lunas, sisa 50% setelah trip terlaksana.'
  },
  {
    id: 'profil-provider',
    title: '5. Profil & Legalitas Mitra',
    menuName: 'Profil Provider',
    icon: <User size={18} color="#6366f1" />,
    description: 'Kelola profil usaha Anda, dokumen legalitas (KTP, NIB, NPWP), serta nomor rekening bank tujuan pencairan saldo.',
    tips: 'Pastikan nama di rekening bank cocok dengan identitas usaha agar verifikasi cepat.'
  },
  {
    id: 'tambah-paket',
    title: '6. Buat Paket Wisata Baru',
    menuName: 'Tambah Paket',
    icon: <PlusCircle size={18} color="#ff6b81" />,
    description: 'Gunakan tombol "+ Tambah Paket" untuk membuat paket wisata baru melalui 5 langkah mudah.',
    tips: 'Isi rencana perjalanan (itinerary) per hari secara rinci agar peserta yakin mendaftar.'
  }
];

export const ProviderHintTour: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; arrowTop: number } | null>(null);

  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const el = document.getElementById(`tour-step-${step.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const cardHeight = 290; // Safe upper bound height for calculations
        const targetCenterY = rect.top + (rect.height / 2);
        
        let computedTop = rect.top - 8;
        
        // Prevent card from overflowing viewport bottom and causing page scrollbars
        if (computedTop + cardHeight > window.innerHeight - 20) {
          computedTop = window.innerHeight - cardHeight - 20;
        }

        computedTop = Math.max(16, computedTop);

        // Arrow top relative to the card's top, pointing precisely at targetCenterY
        let computedArrowTop = targetCenterY - computedTop - 7;
        computedArrowTop = Math.max(14, Math.min(250, computedArrowTop));

        setCoords({
          top: computedTop,
          left: rect.right + 14,
          arrowTop: computedArrowTop,
        });
      } else {
        setCoords({ top: 100, left: 270, arrowTop: 18 });
      }
    };

    updatePosition();
    const timer = setTimeout(updatePosition, 50);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, currentStepIndex, step.id]);

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
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleCloseTour();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <>
      {/* Sleek Compact Trigger Button in Top Right Header */}
      <button
        onClick={handleOpenTour}
        className="hint-tour-trigger-btn"
        title="Bantuan & Panduan Fitur"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 9px',
          backgroundColor: '#ffffff',
          color: '#0284c7',
          border: '1px solid #bae6fd',
          borderRadius: '16px',
          fontSize: '11px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(2, 132, 199, 0.1)',
          transition: 'all 0.2s ease',
        }}
      >
        <HelpCircle size={13} color="#0284c7" />
        <span>Panduan</span>
      </button>

      {/* Floating Side Card Aligned Directly Next to Active Menu Item */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: coords ? `${coords.top}px` : '100px',
            left: coords ? `${coords.left}px` : '270px',
            zIndex: 99999,
            width: '310px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 32px)',
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '12px 15px',
            boxShadow: '0 12px 32px -8px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(2, 132, 199, 0.18)',
            animation: 'fadeIn 0.2s ease-out',
            transition: 'top 0.2s ease, left 0.2s ease'
          }}
        >
          {/* Pointer Arrow pointing left towards target sidebar button */}
          <div
            style={{
              position: 'absolute',
              left: '-7px',
              top: coords ? `${coords.arrowTop}px` : '18px',
              width: '0',
              height: '0',
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              borderRight: '7px solid #ffffff',
              filter: 'drop-shadow(-2px 0 1px rgba(2, 132, 199, 0.12))',
              transition: 'top 0.2s ease'
            }}
          />

          {/* Card Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '2px 7px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Panduan • {currentStepIndex + 1} dari {TOUR_STEPS.length}
            </span>
            
            <button
              onClick={handleCloseTour}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Tutup Panduan"
            >
              <X size={16} />
            </button>
          </div>

          {/* Icon + Title */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ backgroundColor: '#f0f9ff', padding: '7px', borderRadius: '10px', border: '1px solid #bae6fd', flexShrink: 0 }}>
              {step.icon}
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0 0 1px 0' }}>
                {step.title}
              </h4>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600' }}>
                Halaman: <strong>{step.menuName}</strong>
              </span>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: '11.5px', color: '#334155', lineHeight: '1.4', margin: '0 0 8px 0' }}>
            {step.description}
          </p>

          {/* Tips Box */}
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '6px 8px', marginBottom: '10px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <Sparkles size={13} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '10.5px', color: '#92400e', lineHeight: '1.35' }}>
              <strong style={{ color: '#78350f' }}>Tips: </strong>
              {step.tips}
            </div>
          </div>

          {/* Footer Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCloseTour}
              style={{
                padding: '4px 9px',
                backgroundColor: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Skip
            </button>

            <div style={{ display: 'flex', gap: '5px' }}>
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrevStep}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <ChevronLeft size={12} /> Back
                </button>
              )}

              <button
                onClick={handleNextStep}
                style={{
                  padding: '4px 11px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                {currentStepIndex === TOUR_STEPS.length - 1 ? 'Selesai 🎉' : 'Next'}
                {currentStepIndex < TOUR_STEPS.length - 1 && <ChevronRight size={12} />}
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
};
