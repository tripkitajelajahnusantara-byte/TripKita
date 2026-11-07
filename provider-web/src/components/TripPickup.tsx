import { MapPin, Route } from 'lucide-react';
import './TripOptions.css';
import { useI18n } from '../i18n';

export interface PickupConfig {
  pickupMode?: string;
  pickupArea?: string;
  pickupNotes?: string;
  pickupPoints?: string[];
}

export function FlexiblePickupDetails({ pkg }: { pkg: PickupConfig }) {
  const { t } = useI18n();
  if (pkg.pickupMode !== 'FLEXIBLE') return null;
  return <section className="trip-option-panel">
    <h4><Route size={18} aria-hidden="true" /> {t('Penjemputan fleksibel', 'Flexible pickup')}</h4>
    <p><strong>{t('Area / rute:', 'Area / route:')}</strong> {pkg.pickupArea}</p>
    {!!pkg.pickupPoints?.length && <div className="trip-option-chips">{pkg.pickupPoints.map(point => <span key={point}>{point}</span>)}</div>}
    {pkg.pickupNotes && <p className="trip-option-notes">{pkg.pickupNotes}</p>}
    <p className="trip-option-hint">{t('Isi titik jemput setiap peserta saat memesan. Lokasi dan jam jemput perlu disepakati dengan mitra sesuai area dan arah perjalanan.', 'Enter a pickup point for each participant when booking. Pickup location and time are agreed with the partner based on the area and route.')}</p>
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
  const { t } = useI18n();
  const listed = points.includes(value);
  return <div className="participant-pickup">
    <label htmlFor={points.length ? `${id}-choice` : id}>{t('Titik jemput peserta *', 'Participant pickup point *')}</label>
    {!!points.length && <select id={`${id}-choice`} value={listed ? value : ''} onChange={e => onChange(e.target.value)}>
      <option value="">{t('Tulis lokasi lain dalam area penjemputan', 'Enter another location in the pickup area')}</option>
      {points.map(point => <option key={point} value={point}>{point}</option>)}
    </select>}
    {!listed && <textarea id={id} aria-label={t('Alamat atau patokan titik jemput', 'Pickup address or landmark')} aria-invalid={!!error} aria-describedby={`${id}-hint`} value={value} maxLength={500} rows={2}
      placeholder={t('Contoh: depan pintu keluar Stasiun Bekasi, Jl. Ir. H. Juanda', 'Example: in front of Bekasi Station exit, Jl. Ir. H. Juanda')} onChange={e => onChange(e.target.value)} />}
    <small id={`${id}-hint`}>{t('Cantumkan lokasi dan patokan yang jelas. Konfirmasikan dengan mitra sebelum berangkat.', 'Give a clear location and landmark. Confirm with the partner before departure.')}</small>
    {previous && onCopy && <button type="button" className="trip-text-button" onClick={onCopy}>{t('Samakan dengan peserta pertama', 'Same as first participant')}</button>}
    {error && <span className="trip-field-error" role="alert">{error}</span>}
  </div>;
}

export function BookingPickupSummary({ mode, instructions, participants }: { mode?: string; instructions?: string; participants?: { name: string; pickupPoint?: string }[] }) {
  const { t } = useI18n();
  if (!instructions && !participants?.some(p => p.pickupPoint)) return null;
  return <section className="trip-option-panel">
    <h4><MapPin size={18} aria-hidden="true" /> {mode === 'FLEXIBLE' ? t('Rencana penjemputan peserta', 'Participant pickup plan') : t('Titik kumpul', 'Meeting point')}</h4>
    {instructions && <p className="trip-option-notes">{instructions}</p>}
    {mode === 'FLEXIBLE' && <>
      <dl className="pickup-manifest">{participants?.map((p, index) => <div key={index}><dt>{p.name}</dt><dd>{p.pickupPoint || t('Belum diisi', 'Not filled in yet')}</dd></div>)}</dl>
      <p className="trip-option-hint">{t('Titik dan jam jemput dikonfirmasi langsung antara peserta dan mitra.', 'Pickup point and time are confirmed directly between participants and the partner.')}</p>
    </>}
  </section>;
}
