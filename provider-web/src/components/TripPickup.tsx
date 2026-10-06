import { MapPin, Route } from 'lucide-react';
import './TripOptions.css';

export interface PickupConfig {
  pickupMode?: string;
  pickupArea?: string;
  pickupNotes?: string;
  pickupPoints?: string[];
}

export function FlexiblePickupDetails({ pkg }: { pkg: PickupConfig }) {
  if (pkg.pickupMode !== 'FLEXIBLE') return null;
  return <section className="trip-option-panel">
    <h4><Route size={18} aria-hidden="true" /> Penjemputan fleksibel</h4>
    <p><strong>Area / rute:</strong> {pkg.pickupArea}</p>
    {!!pkg.pickupPoints?.length && <div className="trip-option-chips">{pkg.pickupPoints.map(point => <span key={point}>{point}</span>)}</div>}
    {pkg.pickupNotes && <p className="trip-option-notes">{pkg.pickupNotes}</p>}
    <p className="trip-option-hint">Isi titik jemput setiap peserta saat memesan. Lokasi dan jam jemput perlu disepakati dengan mitra sesuai area dan arah perjalanan.</p>
  </section>;
}

export function PickupModeEditor({ mode, onChange }: { mode: string; onChange: (mode: string) => void }) {
  return <div className="trip-option-choices" role="group" aria-label="Mode penjemputan">
    {[{ value: 'MEETING_POINT', title: 'Titik kumpul', text: 'Semua peserta bertemu di satu lokasi pada peta.', icon: MapPin },
      { value: 'FLEXIBLE', title: 'Penjemputan fleksibel', text: 'Peserta memilih atau mengusulkan lokasi di sepanjang rute.', icon: Route }].map(option => <button
        key={option.value} type="button" aria-pressed={mode === option.value} className={mode === option.value ? 'selected' : ''} onClick={() => onChange(option.value)}>
        <option.icon size={20} aria-hidden="true" /><strong>{option.title}</strong><span>{option.text}</span>
      </button>)}
  </div>;
}

export function ParticipantPickupInput({ value, onChange, points, id, error, previous, onCopy }: {
  value: string; onChange: (value: string) => void; points: string[]; id: string; error?: string; previous?: string; onCopy?: () => void;
}) {
  const listed = points.includes(value);
  return <div className="participant-pickup">
    <label htmlFor={points.length ? `${id}-choice` : id}>Titik jemput peserta *</label>
    {!!points.length && <select id={`${id}-choice`} value={listed ? value : ''} onChange={e => onChange(e.target.value)}>
      <option value="">Tulis lokasi lain dalam area penjemputan</option>
      {points.map(point => <option key={point} value={point}>{point}</option>)}
    </select>}
    {!listed && <textarea id={id} aria-label="Alamat atau patokan titik jemput" aria-invalid={!!error} aria-describedby={`${id}-hint`} value={value} maxLength={500} rows={2}
      placeholder="Contoh: depan pintu keluar Stasiun Bekasi, Jl. Ir. H. Juanda" onChange={e => onChange(e.target.value)} />}
    <small id={`${id}-hint`}>Cantumkan lokasi dan patokan yang jelas. Konfirmasikan dengan mitra sebelum berangkat.</small>
    {previous && onCopy && <button type="button" className="trip-text-button" onClick={onCopy}>Samakan dengan peserta pertama</button>}
    {error && <span className="trip-field-error" role="alert">{error}</span>}
  </div>;
}

export function BookingPickupSummary({ mode, instructions, participants }: { mode?: string; instructions?: string; participants?: { name: string; pickupPoint?: string }[] }) {
  if (!instructions && !participants?.some(p => p.pickupPoint)) return null;
  return <section className="trip-option-panel">
    <h4><MapPin size={18} aria-hidden="true" /> {mode === 'FLEXIBLE' ? 'Rencana penjemputan peserta' : 'Titik kumpul'}</h4>
    {instructions && <p className="trip-option-notes">{instructions}</p>}
    {mode === 'FLEXIBLE' && <>
      <dl className="pickup-manifest">{participants?.map((p, index) => <div key={index}><dt>{p.name}</dt><dd>{p.pickupPoint || 'Belum diisi'}</dd></div>)}</dl>
      <p className="trip-option-hint">Titik dan jam jemput dikonfirmasi langsung antara peserta dan mitra.</p>
    </>}
  </section>;
}
