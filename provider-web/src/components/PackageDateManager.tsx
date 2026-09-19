import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Lock, Save } from 'lucide-react';
import { request } from '../utils/api';

interface PackageDate {
  id: number;
  date: string;
  status: 'OPEN' | 'BOOKED';
  origin: 'PROVIDER' | 'AUTO';
}

interface Props {
  packageId: number;
  tripType: string;
}

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_LABELS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Format lokal YYYY-MM-DD; toISOString akan menggeser tanggal di zona waktu Indonesia. */
function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Pengaturan tanggal keberangkatan untuk paket selain Open Trip.
 *
 * Mitra menandai tanggal mana saja yang dibuka, paling jauh enam bulan ke depan.
 * Tanggal yang sudah dikunci pesanan pelanggan ditampilkan terkunci dan tidak
 * dapat ditutup dari sini, karena menutupnya akan membuat pesanan yang sudah
 * dibayar menunjuk jadwal yang tidak lagi diakui paketnya.
 */
export const PackageDateManager: React.FC<Props> = ({ packageId, tripType }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [earliest, setEarliest] = useState('');
  const [latest, setLatest] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await request(`/provider/packages/${packageId}/dates`);
      const rows: PackageDate[] = Array.isArray(data?.dates) ? data.dates : [];
      setSelected(new Set(rows.filter((d) => d.origin === 'PROVIDER' || d.status === 'BOOKED').map((d) => d.date)));
      setBooked(new Set(rows.filter((d) => d.status === 'BOOKED').map((d) => d.date)));
      setEarliest(data?.earliestDate || '');
      setLatest(data?.latestDate || '');
      setError('');
    } catch (err) {
      setError((err as Error)?.message || 'Tanggal keberangkatan tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    load();
  }, [load]);

  const months = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  const toggle = (iso: string) => {
    if (booked.has(iso)) return;
    setSuccess('');
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await request(`/provider/packages/${packageId}/dates`, {
        method: 'PUT',
        body: JSON.stringify({ dates: Array.from(selected).sort() }),
      });
      setSuccess(result?.message || 'Tanggal keberangkatan tersimpan.');
      await load();
    } catch (err) {
      setError((err as Error)?.message || 'Tanggal keberangkatan gagal disimpan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const view = months[monthOffset];
  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISO(view.year, view.month, i + 1)),
  ];

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', backgroundColor: '#ffffff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
        <CalendarDays size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
            Tanggal Keberangkatan yang Dibuka
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b', lineHeight: 1.6 }}>
            Pilih tanggal yang boleh dipesan pelanggan untuk paket <strong>{tripType}</strong>, paling jauh enam bulan
            ke depan{latest && ` (sampai ${latest})`}. Satu tanggal hanya untuk satu pesanan — begitu dipilih pelanggan,
            tanggal itu terkunci otomatis.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', marginBottom: '12px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', marginBottom: '12px' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setMonthOffset((v) => Math.max(0, v - 1))}
          disabled={monthOffset === 0}
          style={{ border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: monthOffset === 0 ? 'not-allowed' : 'pointer', opacity: monthOffset === 0 ? 0.5 : 1 }}
        >
          ‹ Sebelumnya
        </button>
        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
          {MONTH_LABELS[view.month]} {view.year}
        </strong>
        <button
          type="button"
          onClick={() => setMonthOffset((v) => Math.min(months.length - 1, v + 1))}
          disabled={monthOffset === months.length - 1}
          style={{ border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: monthOffset === months.length - 1 ? 'not-allowed' : 'pointer', opacity: monthOffset === months.length - 1 ? 0.5 : 1 }}
        >
          Berikutnya ›
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
        {DAY_LABELS.map((label) => (
          <div key={label} style={{ textAlign: 'center', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8' }}>
            {label}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((iso, index) => {
          if (!iso) return <div key={`empty-${index}`} />;
          const outOfWindow = (earliest && iso < earliest) || (latest && iso > latest);
          const isBooked = booked.has(iso);
          const isOpen = selected.has(iso);
          const day = Number(iso.slice(8, 10));

          return (
            <button
              key={iso}
              type="button"
              onClick={() => toggle(iso)}
              disabled={!!outOfWindow || isBooked}
              title={isBooked ? 'Sudah dipesan pelanggan; tidak dapat ditutup' : outOfWindow ? 'Di luar jangkauan enam bulan' : undefined}
              style={{
                aspectRatio: '1',
                border: `1px solid ${isBooked ? '#fca5a5' : isOpen ? '#0284c7' : '#e2e8f0'}`,
                backgroundColor: isBooked ? '#fee2e2' : isOpen ? '#0284c7' : '#ffffff',
                color: isBooked ? '#b91c1c' : isOpen ? '#ffffff' : outOfWindow ? '#cbd5e1' : '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: isOpen || isBooked ? 700 : 500,
                cursor: outOfWindow || isBooked ? 'not-allowed' : 'pointer',
                opacity: outOfWindow ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
              }}
            >
              {day}
              {isBooked && <Lock size={9} />}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', margin: '14px 0', fontSize: '11.5px', color: '#64748b' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: '#0284c7', display: 'inline-block' }} /> Dibuka
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: '#fee2e2', border: '1px solid #fca5a5', display: 'inline-block' }} /> Terkunci pesanan
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'inline-block' }} /> Tutup
        </span>
        <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#0f172a' }}>
          {selected.size} tanggal dibuka
        </span>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          backgroundColor: '#0284c7',
          color: '#ffffff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: saving ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Tanggal'}
      </button>
    </div>
  );
};
