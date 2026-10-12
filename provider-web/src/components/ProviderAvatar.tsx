import React, { useState } from 'react';
import { resolveMediaUrl } from '../utils/tripImages';

interface Props {
  photo?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** Isi pengganti (inisial nama) saat foto belum ada atau gagal dimuat. */
  children: React.ReactNode;
}

// Avatar mitra: foto profil bila ada, selain itu inisial nama bisnis. Nama
// selalu tampil di sebelahnya, jadi foto bersifat dekoratif (alt kosong).
export const ProviderAvatar: React.FC<Props> = ({ photo, className, style, onClick, children }) => {
  const src = resolveMediaUrl(photo);
  const [failedSrc, setFailedSrc] = useState('');
  const showPhoto = src !== '' && failedSrc !== src;
  return (
    <div className={className} onClick={onClick} style={{ overflow: 'hidden', ...style }}>
      {showPhoto
        ? <img src={src} alt="" onError={() => setFailedSrc(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : children}
    </div>
  );
};
