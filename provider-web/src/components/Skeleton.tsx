import React from 'react';

// Placeholder shimmer dipakai selama data atau halaman dimuat. Bentuknya
// meniru tata letak akhir supaya halaman langsung terlihat terbuka tanpa teks
// "memuat"; label hanya dibacakan pembaca layar.

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: React.CSSProperties;
  className?: string;
};

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 14, radius = 6, style, className = '' }) => (
  <span
    className={`skeleton ${className}`}
    aria-hidden="true"
    style={{ width, height, borderRadius: radius, ...style }}
  />
);

const SrLoading: React.FC<{ label?: string }> = ({ label = 'Memuat data' }) => (
  <span className="sr-only">{label}</span>
);

// Lebar kolom sedikit bervariasi agar baris tidak terlihat seperti blok seragam.
const CELL_WIDTHS = ['72%', '88%', '60%', '80%', '54%', '66%'];

type SkeletonTableRowsProps = { rows?: number; columns: number };

// Baris <tr> untuk dipasang di dalam <tbody> tabel yang sudah ada, sehingga
// header tabel tetap tampil selama data dimuat.
export const SkeletonTableRows: React.FC<SkeletonTableRowsProps> = ({ rows = 5, columns }) => (
  <>
    {Array.from({ length: rows }, (_, row) => (
      <tr key={row} className="skeleton-row" aria-hidden="true">
        {Array.from({ length: columns }, (_, col) => (
          <td key={col}>
            <Skeleton width={CELL_WIDTHS[(row + col) % CELL_WIDTHS.length]} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

type SkeletonTableProps = { rows?: number; columns: number; label?: string };

// Tabel shimmer lengkap untuk tempat yang sebelumnya menampilkan teks memuat
// sebagai pengganti seluruh tabel.
export const SkeletonTable: React.FC<SkeletonTableProps> = ({ rows = 5, columns, label }) => (
  <div className="skeleton-table" role="status" aria-live="polite">
    <SrLoading label={label} />
    <div className="skeleton-table-head" aria-hidden="true">
      {Array.from({ length: columns }, (_, col) => (
        <Skeleton key={col} height={10} width={`${50 + ((col * 17) % 40)}%`} />
      ))}
    </div>
    {Array.from({ length: rows }, (_, row) => (
      <div key={row} className="skeleton-table-row" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, col) => (
          <Skeleton key={col} width={CELL_WIDTHS[(row + col) % CELL_WIDTHS.length]} />
        ))}
      </div>
    ))}
  </div>
);

type SkeletonCardsProps = { count?: number; label?: string; minWidth?: number };

// Kartu shimmer untuk daftar berbentuk grid (paket wisata, rencana trip).
export const SkeletonCards: React.FC<SkeletonCardsProps> = ({ count = 6, label, minWidth = 240 }) => (
  <div
    className="skeleton-cards"
    role="status"
    aria-live="polite"
    style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))` }}
  >
    <SrLoading label={label} />
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="skeleton-card" aria-hidden="true">
        <Skeleton height={150} radius={12} />
        <Skeleton width="80%" height={16} />
        <Skeleton width="55%" />
        <Skeleton width="40%" height={18} />
      </div>
    ))}
  </div>
);

type SkeletonListProps = { rows?: number; label?: string };

// Daftar baris sederhana (riwayat, notifikasi, detail).
export const SkeletonList: React.FC<SkeletonListProps> = ({ rows = 4, label }) => (
  <div className="skeleton-list" role="status" aria-live="polite">
    <SrLoading label={label} />
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skeleton-list-item" aria-hidden="true">
        <Skeleton width={40} height={40} radius={10} />
        <div className="skeleton-list-lines">
          <Skeleton width="62%" height={14} />
          <Skeleton width="85%" />
        </div>
      </div>
    ))}
  </div>
);

// Kerangka halaman penuh untuk pemuatan pertama aplikasi dan chunk halaman.
export const PageSkeleton: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => (
  <div className={`page-skeleton ${fullScreen ? 'is-fullscreen' : ''}`} role="status" aria-live="polite">
    <SrLoading label="Memuat halaman" />
    <div className="page-skeleton-bar" aria-hidden="true">
      <Skeleton width={132} height={28} radius={8} />
      <Skeleton width={220} height={14} className="page-skeleton-hide-sm" />
      <Skeleton width={36} height={36} radius={18} />
    </div>
    <div className="page-skeleton-body" aria-hidden="true">
      <Skeleton width="38%" height={26} radius={8} />
      <Skeleton width="58%" />
      <div className="page-skeleton-grid">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height={96} radius={14} />
        ))}
      </div>
      <Skeleton height={260} radius={14} />
    </div>
  </div>
);
