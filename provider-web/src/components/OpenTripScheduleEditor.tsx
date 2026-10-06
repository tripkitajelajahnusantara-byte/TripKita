import { useState } from 'react';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { formatTripRange, tripEndDate } from '../utils/tripDates';
import { weeklyDepartures } from '../utils/departures';
import './TripOptions.css';

export function OpenTripScheduleEditor({ dates, booked, min, max, duration, onChange, disabled }: {
  dates: string[]; booked: string[]; min: string; max: string; duration: number; onChange: (dates: string[]) => void; disabled?: boolean;
}) {
  const [from, setFrom] = useState(min);
  const [until, setUntil] = useState(max);
  const [weekdays, setWeekdays] = useState<number[]>([5]);
  const upcoming = dates.filter(day => day >= min);
  return <div>
    <p style={{ margin: '8px 0 16px', fontSize: 13, lineHeight: 1.6, color: '#64748b' }}>Pilih tanggal mulai setiap keberangkatan hingga tiga bulan ke depan. Durasi {duration} hari, harga, dan kuota berlaku untuk setiap keberangkatan.</p>
    <details className="trip-date-presets">
      <summary>Tambah jadwal mingguan sekaligus</summary>
      <div className="trip-date-range">
        <label>Dari tanggal<input type="date" min={min} max={max} value={from} disabled={disabled} onChange={e => setFrom(e.target.value)} /></label>
        <label>Sampai tanggal<input type="date" min={from || min} max={max} value={until} disabled={disabled} onChange={e => setUntil(e.target.value)} /></label>
      </div>
      <div className="trip-option-chips" role="group" aria-label="Hari keberangkatan mingguan">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, i) => <button type="button" key={day} aria-pressed={weekdays.includes(i)} disabled={disabled} onClick={() => setWeekdays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}>{day}</button>)}
      </div>
      <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} disabled={disabled || !weekdays.length || !from || !until || from < min || until > max || until < from}
        onClick={() => onChange([...new Set([...dates, ...weeklyDepartures(from, until, weekdays)])].sort())}>Tambahkan ke kalender</button>
    </details>
    <AvailabilityCalendar dates={dates} booked={booked} min={min} max={max} disabled={disabled} onChange={onChange} departures />
    <p style={{ fontSize: 13 }} aria-live="polite"><strong>{upcoming.length} keberangkatan mendatang</strong> · Tanggal selesai dihitung otomatis.</p>
    <div className="trip-option-chips">{upcoming.map(day => <button type="button" key={day} disabled={disabled || booked.includes(day)}
      aria-label={`Hapus keberangkatan ${formatTripRange(day)}`} title={booked.includes(day) ? 'Sudah dipesan; kelola melalui Booking' : 'Hapus jadwal'}
      onClick={() => onChange(dates.filter(d => d !== day))}>{formatTripRange(day, tripEndDate(day, duration))}{booked.includes(day) ? ' · Sudah dipesan' : ' ×'}</button>)}</div>
  </div>;
}
