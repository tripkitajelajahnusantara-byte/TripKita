import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface PhotoPlaceholderProps {
  style?: React.CSSProperties;
  className?: string;
  iconSize?: number;
  showText?: boolean;
}

// Placeholder netral saat mitra belum mengunggah foto (tanpa foto stok)
export const PhotoPlaceholder: React.FC<PhotoPlaceholderProps> = ({ style, className, iconSize = 32, showText = true }) => (
  <div
    className={className}
    role="img"
    aria-label="Foto belum tersedia"
    style={{
      width: '100%',
      height: '100%',
      ...style,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f7ff 100%)',
      color: '#64748b',
      boxSizing: 'border-box'
    }}
  >
    <ImageIcon size={iconSize} color="#7dd3fc" strokeWidth={1.5} />
    {showText && (
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Foto belum tersedia</span>
    )}
  </div>
);

type TripImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  placeholderIconSize?: number;
  placeholderShowText?: boolean;
};

// <img> yang otomatis beralih ke placeholder saat src kosong atau gagal dimuat
export const TripImage: React.FC<TripImageProps> = ({ src, style, className, onError, placeholderIconSize, placeholderShowText, ...rest }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const cleanSrc = typeof src === 'string' ? src.trim() : '';

  if (!cleanSrc || failedSrc === cleanSrc) {
    return <PhotoPlaceholder style={style} className={className} iconSize={placeholderIconSize} showText={placeholderShowText} />;
  }

  return (
    <img
      {...rest}
      src={cleanSrc}
      style={style}
      className={className}
      onError={(e) => {
        setFailedSrc(cleanSrc);
        onError?.(e);
      }}
    />
  );
};
