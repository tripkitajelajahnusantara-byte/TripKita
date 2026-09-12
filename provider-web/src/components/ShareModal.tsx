import React, { useState } from 'react';
import { X, Copy, Check, MessageCircle, Share2, Camera } from 'lucide-react';
import { getTripImage } from '../utils/tripImages';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: any;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, pkg }) => {
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  if (!isOpen || !pkg) return null;

  const shareUrl = `${window.location.origin}${window.location.pathname}#/paket-detail?id=${pkg.id}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setToastMsg('Link detail paket berhasil disalin!');
      setTimeout(() => setCopied(false), 2500);
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Halo! Cek paket wisata "${pkg.name}" di TripKita!\n\n📍 Destinasi: ${pkg.destination || 'Indonesia'}\n💰 Harga: Rp ${(pkg.price || 0).toLocaleString('id-ID')} / orang\n\nLihat detail paket selengkapnya di sini:\n${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleInstagramShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${pkg.name} - Rp ${(pkg.price || 0).toLocaleString('id-ID')}\nLink: ${shareUrl}`);
      setToastMsg('Link & caption disalin! Buka Instagram untuk membuat Story / Post.');
      setTimeout(() => setToastMsg(''), 3500);
    }
    window.open('https://www.instagram.com/', '_blank');
  };

  const pkgImg = getTripImage(pkg.id, pkg.name || '', pkg.category || '', pkg.image || pkg.images);

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '460px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          position: 'relative',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            backgroundColor: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 size={20} color="#007bff" /> Bagikan Paket Wisata
        </h3>

        {/* Package Preview Box */}
        <div style={{ display: 'flex', gap: '14px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', alignItems: 'center' }}>
          <img 
            src={pkgImg} 
            alt={pkg.name} 
            style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} 
          />
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pkg.name}
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
              📍 {pkg.destination || 'Indonesia'}
            </span>
            <strong style={{ fontSize: '13.5px', color: '#007bff' }}>
              Rp {(pkg.price || 0).toLocaleString('id-ID')} <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>/ orang</span>
            </strong>
          </div>
        </div>

        {/* Share Social Buttons Grid */}
        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '10px' }}>
          Bagikan Langsung Ke:
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 8px',
              borderRadius: '12px',
              border: '1px solid #bbf7d0',
              backgroundColor: '#f0fdf4',
              color: '#166534',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ backgroundColor: '#25d366', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={20} />
            </div>
            <span>WhatsApp</span>
          </button>

          {/* Instagram */}
          <button
            type="button"
            onClick={handleInstagramShare}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 8px',
              borderRadius: '12px',
              border: '1px solid #fbcfe8',
              backgroundColor: '#fdf2f8',
              color: '#9d174d',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={20} />
            </div>
            <span>Instagram</span>
          </button>

          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 8px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#334155',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ backgroundColor: '#0284c7', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </div>
            <span>Salin Link</span>
          </button>
        </div>

        {/* Input Copy Box */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="text" 
            readOnly 
            value={shareUrl} 
            style={{
              flexGrow: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '12.5px',
              color: '#334155',
              backgroundColor: '#f8fafc',
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: copied ? '#10b981' : '#007bff',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        </div>

        {toastMsg && (
          <div style={{ marginTop: '14px', padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>
            ✅ {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
};
