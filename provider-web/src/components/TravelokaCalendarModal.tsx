import { useState } from 'react';
import { DateRangeCalendar } from './DateRangeCalendar';
import { rangeAvailable, threeMonthLimit, tripEndDate } from '../utils/tripDates';

interface Props {
  isOpen: boolean; onClose: () => void; startDateIso: string; endDateIso: string;
  onSelectRange: (start: string, end: string) => void; bookedDates: string[];
  availableDates?: string[]; minDateIso: string; maxDateIso?: string;
  tripType?: string; durationDays?: number;
}
export function TravelokaCalendarModal(props: Props) {
  return props.isOpen ? <CalendarDialog {...props} /> : null;
}
function CalendarDialog(props: Props) {
  const max = props.maxDateIso && props.maxDateIso < threeMonthLimit() ? props.maxDateIso : threeMonthLimit();
  const duration = Math.max(1, Number(props.durationDays) || 1);
  const initialValid = props.endDateIso === tripEndDate(props.startDateIso, duration) && rangeAvailable(props.startDateIso, props.endDateIso, props.minDateIso, max, props.availableDates ?? [], props.bookedDates);
  const [start, setStart] = useState(initialValid ? props.startDateIso : '');
  const [end, setEnd] = useState(initialValid ? props.endDateIso : '');
  const valid = end === tripEndDate(start, duration) && rangeAvailable(start, end, props.minDateIso, max, props.availableDates ?? [], props.bookedDates);
  return <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#0f172aaa', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label="Tanggal perjalanan" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') props.onClose(); }} style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <h3 style={{ margin: 0 }}>Tanggal Perjalanan ({props.tripType})</h3>
        <button type="button" onClick={props.onClose} aria-label="Tutup kalender">✕</button>
      </div>
      <p style={{ fontSize: 13, color: '#64748b' }}>Hanya tanggal yang dibuka provider dan tersedia selama seluruh perjalanan yang dapat dipilih.</p>
      <DateRangeCalendar start={start} end={end} min={props.minDateIso} max={max} duration={duration} available={props.availableDates ?? []} booked={props.bookedDates} onChange={(a, b) => { setStart(a); setEnd(b); }} />
      {!valid && <p role="status" style={{ color: '#b45309', fontSize: 13 }}>Pilih tanggal yang tersedia. Jika semua tanggal abu-abu, belum ada jadwal yang bisa dipesan.</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
        <button type="button" className="btn" onClick={props.onClose}>Batal</button>
        <button type="button" className="btn btn-primary" disabled={!valid} onClick={() => { if (valid) { props.onSelectRange(start, end); props.onClose(); } }}>Terapkan Tanggal</button>
      </div>
    </div>
  </div>;
}
