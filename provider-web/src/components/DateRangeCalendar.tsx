import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, formatTripRange, rangeAvailable, tripEndDate, validDate } from '../utils/tripDates';

interface Props {
  start: string; end: string; min: string; max: string;
  onChange: (start: string, end: string) => void;
  duration?: number; available?: string[]; booked?: string[]; disabled?: boolean;
}
export function DateRangeCalendar({ start, end, min, max, onChange, duration, available, booked = [], disabled = false }: Props) {
  const firstMonth = min.slice(0, 7);
  const lastMonth = max.slice(0, 7);
  const [month, setMonth] = useState(start >= min && start <= max ? start.slice(0, 7) : firstMonth);
  const [choosingEnd, setChoosingEnd] = useState(false);
  const view = month < firstMonth ? firstMonth : month > lastMonth ? lastMonth : month;
  const shift = (offset: number) => {
    const d = new Date(`${view}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + offset);
    return d.toISOString().slice(0, 7);
  };
  const select = (day: string) => {
    if (duration) { onChange(day, tripEndDate(day, duration)); return; }
    if (choosingEnd && start && day >= start) { onChange(start, day); setChoosingEnd(false); }
    else { onChange(day, day); setChoosingEnd(true); }
  };
  const renderMonth = (ym: string) => {
    const first = new Date(`${ym}-01T00:00:00Z`);
    const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const offset = (first.getUTCDay() + 6) % 7;
    return <div key={ym}>
      <h4 style={{ textAlign: 'center', margin: '12px 0' }}>{first.toLocaleDateString('id-ID', { timeZone: 'UTC', month: 'long', year: 'numeric' })}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => <span key={day} style={{ fontSize: 12, textAlign: 'center', color: '#64748b' }}>{day}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const day = addDays(`${ym}-01`, i);
          const occupied = booked.includes(day);
          const allowed = duration ? rangeAvailable(day, tripEndDate(day, duration), min, max, available, booked) : day >= min && day <= max;
          const selected = validDate(start) && day >= start && day <= end;
          return <button key={day} type="button" aria-label={day} aria-pressed={selected} disabled={disabled || !allowed}
            title={occupied ? 'Sudah dipesan' : !allowed ? 'Tidak tersedia untuk seluruh durasi perjalanan' : day}
            onClick={() => select(day)} style={{ height: 38, borderRadius: 8, border: '1px solid #e2e8f0', cursor: allowed && !disabled ? 'pointer' : 'not-allowed', background: occupied ? '#fee2e2' : selected ? '#0284c7' : '#fff', color: occupied ? '#b91c1c' : selected ? '#fff' : !allowed ? '#cbd5e1' : '#0f172a', textDecoration: occupied ? 'line-through' : 'none', fontWeight: 600 }}>{i + 1}</button>;
        })}
      </div>
    </div>;
  };
  return <div>
    <div aria-live="polite" style={{ padding: 12, borderRadius: 10, background: '#f0f9ff', color: '#075985' }}>
      <strong>{formatTripRange(start, end)}</strong>
      <div style={{ fontSize: 12, marginTop: 4 }}>{duration ? `Pilih tanggal mulai. Tanggal selesai mengikuti durasi ${duration} hari.` : choosingEnd ? 'Sekarang pilih tanggal akhir rentang.' : 'Pilih tanggal awal, lalu tanggal akhir rentang.'}</div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
      <button type="button" aria-label="Bulan sebelumnya" disabled={disabled || view <= firstMonth} onClick={() => setMonth(shift(-1))}><ChevronLeft size={20} /></button>
      <small>{formatTripRange(min, max)}</small>
      <button type="button" aria-label="Bulan berikutnya" disabled={disabled || shift(1) >= lastMonth} onClick={() => setMonth(shift(1))}><ChevronRight size={20} /></button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 20 }}>
      {renderMonth(view)}{shift(1) <= lastMonth && renderMonth(shift(1))}
    </div>
    <p style={{ fontSize: 12, color: '#64748b', margin: '12px 0 0' }}>Biru: dipilih · Merah: sudah dipesan · Abu-abu: tidak tersedia</p>
  </div>;
}
