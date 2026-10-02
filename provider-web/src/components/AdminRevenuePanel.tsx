import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, Download, Landmark, Receipt, Search } from 'lucide-react';
import { request } from '../utils/api';

interface RevenueItem {
  bookingId: number;
  bookingCode: string;
  providerId: number;
  providerName: string;
  packageName: string;
  customerName: string;
  guests: number;
  bookingStatus: string;
  paidAt: string;
  tripDate: string;
  tripEndDate: string;
  totalPaid: number;
  platformFeePercent: number;
  serviceFee: number;
  commission: number;
  platformRevenue: number;
  providerNet: number;
  revenueStatus: 'REALIZED' | 'PENDING';
}

interface RevenueMonth { month: string; revenue: number; realized: number; pending: number; bookings: number }

interface RevenueReport {
  totalRevenue: number;
  realizedRevenue: number;
  pendingRevenue: number;
  serviceFeeTotal: number;
  commissionTotal: number;
  grossPaid: number;
  providerNetTotal: number;
  bookingCount: number;
  months: RevenueMonth[];
  items: RevenueItem[];
}

type Preset = 'this-month' | 'last-3-months' | 'this-year' | 'all' | 'custom';

const PRESETS: { key: Exclude<Preset, 'custom'>; label: string }[] = [
  { key: 'this-month', label: 'Bulan ini' },
  { key: 'last-3-months', label: '3 bulan terakhir' },
  { key: 'this-year', label: 'Tahun ini' },
  { key: 'all', label: 'Semua' },
];

const PAGE_SIZE = 50;
const rupiah = (value: number) => `Rp${Math.round(value).toLocaleString('id-ID')}`;
// Periode dihitung dalam WIB agar sama dengan pembagian bulan di backend.
const wibDate = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
const formatMonth = (month: string) => {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString('id-ID', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

function presetRange(preset: Exclude<Preset, 'custom'>) {
  const today = wibDate(new Date());
  const [year, month] = today.split('-').map(Number);
  const firstOf = (y: number, m: number) => {
    const d = new Date(Date.UTC(y, m - 1, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
  };
  switch (preset) {
    case 'this-month': return { from: firstOf(year, month), to: today };
    case 'last-3-months': return { from: firstOf(year, month - 2), to: today };
    case 'this-year': return { from: `${year}-01-01`, to: today };
    default: return { from: '', to: '' };
  }
}

function downloadCsv(items: RevenueItem[], from: string, to: string) {
  const header = ['Tanggal bayar', 'Kode booking', 'Mitra', 'Paket', 'Customer', 'Status booking', 'Dibayar customer', 'Potongan (%)', 'Biaya layanan', 'Komisi', 'Penghasilan TemenTrip', 'Hak mitra', 'Status penghasilan'];
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = items.map(item => [
    wibDate(new Date(item.paidAt)), item.bookingCode, item.providerName, item.packageName, item.customerName, item.bookingStatus,
    item.totalPaid, item.platformFeePercent, item.serviceFee, item.commission, item.platformRevenue, item.providerNet,
    item.revenueStatus === 'REALIZED' ? 'Sudah diterima' : 'Masih berjalan',
  ].map(escape).join(','));
  // BOM agar Excel membaca karakter UTF-8 dengan benar.
  const blob = new Blob(['﻿' + [header.map(escape).join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `penghasilan-tementrip_${from || 'awal'}_${to || wibDate(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminRevenuePanel() {
  const [preset, setPreset] = useState<Preset>('this-month');
  const [range, setRange] = useState(() => presetRange('this-month'));
  // Hasil disimpan bersama kunci periodenya; loading berarti hasil terakhir
  // belum untuk periode yang sedang dipilih (data lama tetap tampil sementara).
  const [result, setResult] = useState<{ key: string; report?: RevenueReport; error?: string } | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'REALIZED' | 'PENDING'>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const rangeKey = `${range.from}|${range.to}`;
  const loading = result?.key !== rangeKey;
  const report = result?.report ?? null;
  const error = result?.key === rangeKey ? result.error ?? '' : '';
  const reportKey = useRef('');

  useEffect(() => {
    let cancelled = false;
    const [from, to] = rangeKey.split('|');
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const queryString = params.toString();
    request(`/admin/revenue${queryString ? `?${queryString}` : ''}`)
      .then((data: RevenueReport) => {
        if (cancelled) return;
        if (reportKey.current !== rangeKey) setVisible(PAGE_SIZE);
        reportKey.current = rangeKey;
        setResult({ key: rangeKey, report: data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult(prev => ({ key: rangeKey, report: prev?.report, error: err instanceof Error ? err.message : 'Gagal memuat penghasilan.' }));
      });
    return () => { cancelled = true; };
  }, [rangeKey]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (report?.items ?? []).filter(item =>
      (statusFilter === 'all' || item.revenueStatus === statusFilter) &&
      (!term || [item.bookingCode, item.providerName, item.packageName, item.customerName].some(v => v?.toLowerCase().includes(term))));
  }, [report, query, statusFilter]);

  const maxMonth = Math.max(1, ...(report?.months ?? []).map(m => m.revenue));
  const choosePreset = (key: Exclude<Preset, 'custom'>) => { setPreset(key); setRange(presetRange(key)); };
  const setCustom = (field: 'from' | 'to', value: string) => { setPreset('custom'); setRange(prev => ({ ...prev, [field]: value })); };

  return (
    <div className="rv-panel animate-fade-in">
      <div className="rv-toolbar">
        <div className="rv-presets" role="group" aria-label="Periode">
          {PRESETS.map(p => (
            <button key={p.key} type="button" className={`rv-chip ${preset === p.key ? 'active' : ''}`} onClick={() => choosePreset(p.key)}>{p.label}</button>
          ))}
        </div>
        <div className="rv-dates">
          <label>Dari <input type="date" value={range.from} max={range.to || undefined} onChange={e => setCustom('from', e.target.value)} /></label>
          <label>Sampai <input type="date" value={range.to} min={range.from || undefined} onChange={e => setCustom('to', e.target.value)} /></label>
        </div>
      </div>

      {error && <div className="alert-message error-alert">{error}</div>}

      <section className="stats-cards-row">
        <div className="stat-card">
          <div className="card-top"><div className="stat-icon-bg bg-blue"><Landmark size={20} color="#2563eb" /></div><span className="card-label">Total penghasilan</span></div>
          <div className="card-bottom">
            <h3>{report ? rupiah(report.totalRevenue) : '—'}</h3>
            <p>{report ? `Biaya layanan ${rupiah(report.serviceFeeTotal)} · Komisi ${rupiah(report.commissionTotal)}` : 'Memuat…'}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-top"><div className="stat-icon-bg bg-green"><CheckCircle2 size={20} color="#16a34a" /></div><span className="card-label">Sudah diterima</span></div>
          <div className="card-bottom">
            <h3>{report ? rupiah(report.realizedRevenue) : '—'}</h3>
            <p>Trip selesai, tidak dapat direfund lagi</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-top"><div className="stat-icon-bg bg-orange"><Clock size={20} color="#d97706" /></div><span className="card-label">Masih berjalan</span></div>
          <div className="card-bottom">
            <h3>{report ? rupiah(report.pendingRevenue) : '—'}</h3>
            <p>Trip belum selesai, masih bisa direfund</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-top"><div className="stat-icon-bg bg-blue"><Receipt size={20} color="#2563eb" /></div><span className="card-label">Dibayar customer</span></div>
          <div className="card-bottom">
            <h3>{report ? rupiah(report.grossPaid) : '—'}</h3>
            <p>{report ? `${report.bookingCount.toLocaleString('id-ID')} booking · hak mitra ${rupiah(report.providerNetTotal)}` : 'Memuat…'}</p>
          </div>
        </div>
      </section>

      <section className="rv-card">
        <div className="rv-card-head">
          <h2>Penghasilan per bulan</h2>
          <p>Dikelompokkan menurut tanggal pembayaran disetujui (WIB).</p>
        </div>
        {report && report.months.length > 0 ? (
          <ul className="rv-months">
            {report.months.map(m => (
              <li key={m.month} tabIndex={0} className={activeMonth === m.month ? 'active' : ''}
                onMouseEnter={() => setActiveMonth(m.month)} onMouseLeave={() => setActiveMonth(null)}
                onFocus={() => setActiveMonth(m.month)} onBlur={() => setActiveMonth(null)}
                aria-label={`${formatMonth(m.month)}: ${rupiah(m.revenue)}, sudah diterima ${rupiah(m.realized)}, masih berjalan ${rupiah(m.pending)}, ${m.bookings} booking`}>
                <span className="rv-month-label">{formatMonth(m.month)}</span>
                <span className="rv-month-track">
                  {/* Lebar linear terhadap nilai; sisa ruang dipakai label nilai di ujung bar. */}
                  <span className="rv-month-bar" style={{ width: `max(2px, calc((100% - var(--rv-label-room)) * ${m.revenue / maxMonth}))` }} />
                  <span className="rv-month-value">{rupiah(m.revenue)}</span>
                </span>
                {activeMonth === m.month && (
                  <span className="rv-tooltip" role="tooltip">
                    <strong>{formatMonth(m.month)}</strong>
                    <span>Sudah diterima <b>{rupiah(m.realized)}</b></span>
                    <span>Masih berjalan <b>{rupiah(m.pending)}</b></span>
                    <span>{m.bookings.toLocaleString('id-ID')} booking</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rv-empty">{loading ? 'Memuat…' : 'Belum ada penghasilan pada periode ini.'}</p>
        )}
      </section>

      <section className="table-content-container rv-table-card">
        <div className="rv-table-toolbar">
          <div className="rv-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" value={query} onChange={e => { setQuery(e.target.value); setVisible(PAGE_SIZE); }} placeholder="Cari kode booking, mitra, paket, atau customer…" aria-label="Cari transaksi" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setVisible(PAGE_SIZE); }} aria-label="Status penghasilan">
            <option value="all">Semua status</option>
            <option value="REALIZED">Sudah diterima</option>
            <option value="PENDING">Masih berjalan</option>
          </select>
          <button type="button" className="rv-download" disabled={!filtered.length} onClick={() => downloadCsv(filtered, range.from, range.to)}>
            <Download size={15} aria-hidden="true" /> Unduh CSV
          </button>
        </div>
        <div className="providers-table-wrapper">
          <table className="admin-providers-table rv-table">
            <thead>
              <tr>
                <th>Tanggal bayar</th>
                <th>Booking</th>
                <th>Mitra</th>
                <th className="num">Dibayar customer</th>
                <th className="num">Biaya layanan</th>
                <th className="num">Komisi</th>
                <th className="num">Penghasilan TemenTrip</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && !report ? (
                <tr><td colSpan={8} className="empty-table-state">Memuat data penghasilan…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="empty-table-state">Tidak ada transaksi yang cocok.</td></tr>
              ) : filtered.slice(0, visible).map(item => (
                <tr key={item.bookingId}>
                  <td>{formatDate(item.paidAt)}</td>
                  <td><strong>{item.bookingCode}</strong><small>{item.packageName || '-'}</small></td>
                  <td>{item.providerName || '-'}</td>
                  <td className="num">{rupiah(item.totalPaid)}</td>
                  <td className="num">{rupiah(item.serviceFee)}</td>
                  <td className="num">{rupiah(item.commission)}<small>{item.platformFeePercent}% dari paket</small></td>
                  <td className="num"><strong>{rupiah(item.platformRevenue)}</strong></td>
                  <td>
                    {item.revenueStatus === 'REALIZED'
                      ? <span className="rv-status realized"><CheckCircle2 size={13} aria-hidden="true" /> Sudah diterima</span>
                      : <span className="rv-status pending"><Clock size={13} aria-hidden="true" /> Masih berjalan</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rv-table-foot">
          <span>Menampilkan {Math.min(visible, filtered.length).toLocaleString('id-ID')} dari {filtered.length.toLocaleString('id-ID')} transaksi</span>
          {visible < filtered.length && <button type="button" onClick={() => setVisible(v => v + PAGE_SIZE)}>Tampilkan lebih banyak</button>}
        </div>
      </section>

      <style>{`
        .rv-panel { display: flex; flex-direction: column; gap: 0; }
        /* Angka utama sejajar antar kartu walau keterangannya terlipat dua baris. */
        .rv-panel .stat-card { justify-content: flex-start; }
        .rv-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
        .rv-presets { display: flex; flex-wrap: wrap; gap: 8px; }
        .rv-chip { padding: 7px 14px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; }
        .rv-chip:hover { border-color: #93c5fd; }
        .rv-chip.active { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; }
        .rv-dates { display: flex; flex-wrap: wrap; gap: 10px; }
        .rv-dates label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; }
        .rv-dates input { padding: 7px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #0f172a; background: #fff; }
        .rv-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .rv-card-head { margin-bottom: 16px; }
        .rv-card-head h2 { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
        .rv-card-head p, .rv-empty { font-size: 12.5px; color: #64748b; }
        .rv-months { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .rv-months li { position: relative; display: grid; grid-template-columns: 84px minmax(0, 1fr); align-items: center; gap: 12px; padding: 4px 6px; border-radius: 8px; outline: none; cursor: default; }
        .rv-months li.active, .rv-months li:focus-visible { background: #f8fafc; }
        .rv-months li:focus-visible { box-shadow: 0 0 0 2px #93c5fd; }
        .rv-month-label { font-size: 12.5px; font-weight: 600; color: #475569; font-variant-numeric: tabular-nums; }
        .rv-month-track { --rv-label-room: 120px; display: flex; align-items: center; gap: 10px; min-width: 0; }
        .rv-month-bar { flex: 0 0 auto; height: 14px; background: #007bff; border-radius: 0 4px 4px 0; }
        .rv-month-value { font-size: 12.5px; font-weight: 700; color: #0f172a; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .rv-tooltip { position: absolute; z-index: 5; left: 96px; top: calc(100% + 4px); display: flex; flex-direction: column; gap: 2px; min-width: 210px; padding: 10px 12px; background: #0f172a; color: #e2e8f0; border-radius: 8px; font-size: 12px; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.2); pointer-events: none; }
        .rv-tooltip strong { color: #fff; margin-bottom: 2px; }
        .rv-tooltip b { color: #fff; font-weight: 700; }
        .rv-table-card { margin-bottom: 8px; }
        .rv-table-toolbar { display: flex; flex-wrap: wrap; gap: 10px; padding: 16px; border-bottom: 1px solid #e2e8f0; }
        .rv-search { flex: 1 1 260px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 8px; color: #94a3b8; }
        .rv-search input { flex: 1; min-width: 0; border: 0; outline: none; padding: 9px 0; font-size: 13px; color: #0f172a; background: transparent; }
        .rv-table-toolbar select { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #0f172a; background: #fff; }
        .rv-download { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; }
        .rv-download:disabled { opacity: 0.5; cursor: not-allowed; }
        .rv-table td small { display: block; font-size: 11.5px; color: #94a3b8; margin-top: 2px; }
        .rv-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .rv-status { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .rv-status.realized { background: #f0fdf4; color: #15803d; }
        .rv-status.pending { background: #fffbeb; color: #b45309; }
        .rv-table-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px; font-size: 12.5px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .rv-table-foot button { border: 1px solid #cbd5e1; background: #fff; border-radius: 8px; padding: 7px 12px; font-size: 12.5px; font-weight: 600; color: #334155; cursor: pointer; }
        @media (max-width: 640px) {
          .rv-months li { grid-template-columns: 70px minmax(0, 1fr); }
          .rv-month-track { --rv-label-room: 100px; }
          .rv-tooltip { left: 8px; }
        }
      `}</style>
    </div>
  );
}
