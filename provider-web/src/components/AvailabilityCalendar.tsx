import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, dateRange, formatTripRange } from '../utils/tripDates';

interface Props {
  dates: string[]; booked: string[]; min: string; max: string; disabled?: boolean;
  onChange: (dates: string[]) => void;
}

/** Provider availability is a set of dates, including multiple separate ranges. */
export function AvailabilityCalendar({ dates, booked, min, max, disabled, onChange }: Props) {
  const [month, setMonth] = useState(min.slice(0, 7));
  const [mode, setMode] = useState<'day' | 'open' | 'close'>('day');
  const [anchor, setAnchor] = useState('');
  const firstMonth = min.slice(0, 7), lastMonth = max.slice(0, 7);
  const view = month < firstMonth ? firstMonth : month > lastMonth ? lastMonth : month;
  const shift = (offset: number) => {
    const d = new Date(`${view}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + offset);
    return d.toISOString().slice(0, 7);
  };
  const choose = (day: string) => {
    if (mode !== 'day' && !anchor) { setAnchor(day); return; }
    const affected = mode === 'day' ? [day] : dateRange(day < anchor ? day : anchor, day > anchor ? day : anchor);
    const next = new Set(dates);
    for (const d of affected) {
      if (booked.includes(d)) continue;
      if (mode === 'close' || (mode === 'day' && next.has(d))) next.delete(d); else next.add(d);
    }
    setAnchor('');
    onChange([...next].sort());
  };
  const renderMonth = (ym: string) => {
    const first = new Date(`${ym}-01T00:00:00Z`);
    const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return <section key={ym}>
      <h4 style={{ textAlign: 'center', margin: '16px 0' }}>{first.toLocaleDateString('id-ID', { timeZone: 'UTC', month: 'long', year: 'numeric' })}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => <span key={day} style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>{day}</span>)}
        {Array.from({ length: (first.getUTCDay() + 6) % 7 }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const day = addDays(`${ym}-01`, i), busy = booked.includes(day), open = dates.includes(day), outside = day < min || day > max;
          return <button type="button" key={day} aria-label={day} aria-pressed={open} disabled={disabled || outside || busy}
            title={busy ? 'Provider sudah menerima booking' : open ? 'Tersedia' : 'Tidak tersedia'} onClick={() => choose(day)}
            style={{ height: 38, borderRadius: 8, border: day === anchor ? '2px solid #0f172a' : '1px solid #e2e8f0', background: busy ? '#fee2e2' : open ? '#0284c7' : '#f8fafc', color: busy ? '#b91c1c' : open ? '#fff' : outside ? '#cbd5e1' : '#64748b', cursor: disabled || outside || busy ? 'not-allowed' : 'pointer', textDecoration: busy ? 'line-through' : 'none' }}>{i + 1}</button>;
        })}
      </div>
    </section>;
  };
  return <div>
    <div role="group" aria-label="Mode availability" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {([['day', 'Pilih per tanggal'], ['open', 'Buka rentang'], ['close', 'Tutup rentang']] as const).map(([value, label]) => <button key={value} type="button" className="btn" aria-pressed={mode === value} disabled={disabled} onClick={() => { setMode(value); setAnchor(''); }} style={{ background: mode === value ? '#e0f2fe' : '#fff', border: '1px solid #cbd5e1' }}>{label}</button>)}
    </div>
    <p aria-live="polite" style={{ fontSize: 13 }}>{mode === 'day' ? 'Klik tanggal untuk membuka atau menutup availability.' : anchor ? `Mulai ${formatTripRange(anchor)}. Pilih tanggal akhir.` : 'Pilih tanggal awal dan akhir rentang.'} {dates.filter(d => d >= min && d <= max && !booked.includes(d)).length} tanggal tersedia.</p>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button type="button" aria-label="Bulan sebelumnya" disabled={disabled || view <= firstMonth} onClick={() => setMonth(shift(-1))}><ChevronLeft size={20} /></button>
      <small>{formatTripRange(min, max)}</small>
      <button type="button" aria-label="Bulan berikutnya" disabled={disabled || shift(1) >= lastMonth} onClick={() => setMonth(shift(1))}><ChevronRight size={20} /></button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 20 }}>{renderMonth(view)}{shift(1) <= lastMonth && renderMonth(shift(1))}</div>
    <p style={{ fontSize: 12, color: '#64748b' }}>Biru: tersedia · Abu-abu: tidak tersedia · Merah: provider sudah menerima booking</p>
  </div>;
}
