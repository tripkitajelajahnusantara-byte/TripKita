import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CloudRain,
  CloudSun,
  Droplets,
  Info,
  LoaderCircle,
  RefreshCw,
  ThermometerSun,
  Users,
  Wind,
  XCircle,
} from 'lucide-react';
import { request } from '../utils/api';
import { useActionLock } from '../utils/useActionLock';
import { addDays, jakartaToday } from '../utils/tripDates';

interface DepartureBooking {
  id: number;
  bookingCode: string;
  customerName: string;
  guests: number;
  status: string;
}

export interface TripDeparture {
  id: number;
  packageId: number;
  departureDay: string;
  departureAt: string;
  reviewDeadline: string;
  seatsBooked: number;
  seatsRequired: number;
  bookingCount: number;
  status: 'AWAITING_PROVIDER' | 'CONTINUED' | 'CANCELLED' | 'RESCHEDULE_OFFERED' | 'RESOLVED';
  reason: 'QUOTA_SHORTFALL' | 'FORCE_MAJEURE' | 'WEATHER_FORECAST' | 'PROVIDER_RESCHEDULE';
  responseDeadline?: string | null;
  decision: string;
  proposedDate?: string | null;
  decisionNotes?: string;
  acceptedCount: number;
  declinedCount: number;
  weatherLocation?: string;
  weatherCondition?: string;
  weatherMinTempC?: number;
  weatherMaxTempC?: number;
  weatherRainChance?: number;
  weatherPrecipMm?: number;
  weatherMaxWindKph?: number;
  weatherIsAdverse?: boolean;
  weatherAdvisory?: string;
  weatherForecastedAt?: string;
  packageDetails?: { id: number; name: string; tripType: string; quotaMin: number; endDate?: string };
  bookings?: DepartureBooking[];
}

type DecisionAction = 'CONTINUE' | 'CANCEL' | 'RESCHEDULE';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const weatherMetric = (value: number | undefined, suffix: string) =>
  Number.isFinite(value) ? `${value}${suffix}` : '—';

// Tanggal pengganti paling awal (WIB): pelanggan selalu punya minimal 2x24 jam
// untuk menjawab, sama dengan aturan backend.
function earliestReplacementISO(): string {
  return addDays(jakartaToday(), 2);
}

const decisionCause = (departure: TripDeparture) => {
  if (departure.reason === 'WEATHER_FORECAST') return 'berdasarkan pertimbangan prakiraan cuaca H-3';
  if (departure.reason === 'FORCE_MAJEURE') return 'karena keadaan kahar';
  if (departure.reason === 'PROVIDER_RESCHEDULE') return 'karena perubahan jadwal dari Anda';
  return 'karena kuota minimal belum terpenuhi';
};

export const TripDepartureAlert: React.FC = () => {
  const [departures, setDepartures] = useState<TripDeparture[]>([]);
  const [loading, setLoading] = useState(true);
  // Kunci berformat `idKeberangkatan:aksi` agar indikator tampil hanya pada
  // tombol keputusan yang diklik, sementara seluruh tombol lain ikut terkunci.
  const { pending: pendingAction, isBusy, run } = useActionLock();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rescheduleFor, setRescheduleFor] = useState<number | null>(null);
  const [proposedDate, setProposedDate] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await request('/provider/departures');
      setDepartures(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Data pertimbangan keberangkatan tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitDecision = async (departure: TripDeparture, action: DecisionAction) => {
    if (isBusy) return;
    if (action === 'RESCHEDULE' && !proposedDate) {
      setError('Tanggal pengganti wajib diisi sebelum mengirim penjadwalan ulang.');
      return;
    }
    const isWeather = departure.reason === 'WEATHER_FORECAST';
    const confirmText = action === 'CONTINUE'
      ? isWeather
        ? 'Tetap melanjutkan trip ini? Trip berjalan seperti biasa dan payout tetap mengikuti ketentuan yang berlaku.'
        : 'Tetap berangkatkan trip ini meski peserta di bawah kuota minimal?'
      : action === 'CANCEL'
        ? 'Batalkan trip ini? Pesanan akan diteruskan ke admin untuk pengembalian dana penuh.'
        : `Tawarkan tanggal pengganti ${proposedDate} kepada pelanggan? Pelanggan yang menolak akan masuk proses pengembalian dana.`;
    if (!window.confirm(confirmText)) return;

    setError('');
    setSuccess('');
    await run(`${departure.id}:${action}`, async () => {
      try {
        await request(`/provider/departures/${departure.id}/decision`, {
          method: 'POST',
          body: JSON.stringify({ action, proposedDate: action === 'RESCHEDULE' ? proposedDate : '', notes: '' }),
        });
        setSuccess(action === 'CONTINUE'
          ? isWeather
            ? 'Trip tetap berjalan. Status booking dan ketentuan payout tidak berubah.'
            : 'Keberangkatan dikonfirmasi tetap jalan. Pelanggan telah diberi tahu.'
          : action === 'CANCEL'
            ? 'Trip dibatalkan. Admin menerima permintaan pengembalian dana.'
            : 'Tawaran jadwal pengganti telah dikirim kepada pelanggan melalui notifikasi dan email.');
        setRescheduleFor(null);
        setProposedDate('');
        await load();
      } catch (err: any) {
        setError(err?.message || 'Keputusan gagal disimpan.');
      }
    });
  };

  const pending = departures.filter((item) => item.status === 'AWAITING_PROVIDER');
  const awaitingCustomers = departures.filter((item) => item.status === 'RESCHEDULE_OFFERED');
  if (loading || (pending.length === 0 && awaitingCustomers.length === 0 && !success && !error)) return null;

  return (
    <section className="departure-review" aria-label="Pertimbangan keberangkatan H-3">
      {error && <div className="departure-feedback error">{error}</div>}
      {success && <div className="departure-feedback success">{success}</div>}

      {pending.map((departure) => {
        const isWeather = departure.reason === 'WEATHER_FORECAST';
        const isAdverse = Boolean(departure.weatherIsAdverse);
        const packageName = departure.packageDetails?.name || 'Paket Wisata';
        // Semua baris dikunci selama ada keputusan yang sedang dikirim, karena
        // kunci aksi bersifat tunggal untuk seluruh daftar.
        const isSubmitting = isBusy;
        const isPendingAction = (action: DecisionAction) => pendingAction === `${departure.id}:${action}`;
        const spinner = <LoaderCircle size={15} className="btn-spinner" aria-hidden="true" />;

        return (
          <article key={departure.id} className={`departure-card ${isWeather ? (isAdverse ? 'weather-adverse' : 'weather-clear') : 'quota-alert'}`}>
            <header className="departure-card-header">
              <div className="departure-icon">
                {isWeather ? (isAdverse ? <CloudRain size={22} /> : <CloudSun size={22} />) : <AlertTriangle size={22} />}
              </div>
              <div>
                <span className="departure-eyebrow">PERTIMBANGAN H-3 • {departure.packageDetails?.tripType || 'Trip'}</span>
                <h3>{isWeather ? (isAdverse ? 'Potensi Cuaca Kurang Mendukung' : 'Prakiraan Cuaca Trip') : 'Kuota Open Trip Belum Terpenuhi'}</h3>
                <p>
                  <strong>{packageName}</strong> • {formatDate(departure.departureAt)}
                  {isWeather && departure.weatherLocation ? ` • ${departure.weatherLocation}` : ''}
                </p>
              </div>
            </header>

            {isWeather ? (
              <>
                <div className="weather-summary">
                  <div className="weather-condition"><span>Kondisi diperkirakan</span><strong>{departure.weatherCondition || 'Tidak tersedia'}</strong></div>
                  <div className="weather-metric"><ThermometerSun size={17} /><span><small>Suhu</small><strong>{Number.isFinite(departure.weatherMinTempC) && Number.isFinite(departure.weatherMaxTempC) ? `${departure.weatherMinTempC}–${departure.weatherMaxTempC}°C` : '—'}</strong></span></div>
                  <div className="weather-metric"><Droplets size={17} /><span><small>Peluang hujan</small><strong>{weatherMetric(departure.weatherRainChance, '%')}</strong></span></div>
                  <div className="weather-metric"><CloudRain size={17} /><span><small>Curah hujan</small><strong>{weatherMetric(departure.weatherPrecipMm, ' mm')}</strong></span></div>
                  <div className="weather-metric"><Wind size={17} /><span><small>Angin maks.</small><strong>{weatherMetric(departure.weatherMaxWindKph, ' km/jam')}</strong></span></div>
                </div>
                <div className="weather-disclaimer">
                  <Info size={17} />
                  <p><strong>Prakiraan ini hanya bahan pertimbangan, bukan keputusan otomatis sistem.</strong> {departure.weatherAdvisory} Jika Anda memilih tetap berangkat, trip berjalan seperti biasa dan pencairan DP 50% tetap mengikuti ketentuan payout yang berlaku.</p>
                </div>
              </>
            ) : (
              <p className="quota-copy">Baru terisi <strong>{departure.seatsBooked} dari minimal {departure.seatsRequired} kursi</strong> ({departure.bookingCount} pesanan). Tentukan keputusan sebelum tanggal keberangkatan.</p>
            )}

            {departure.bookings && departure.bookings.length > 0 && (
              <div className="affected-bookings">
                <div className="affected-title"><Users size={14} /> Pesanan terdampak</div>
                <div className="affected-list">
                  {departure.bookings.map((booking) => <span key={booking.id}>#{booking.bookingCode} — {booking.customerName} ({booking.guests} orang)</span>)}
                </div>
              </div>
            )}

            {rescheduleFor === departure.id && (
              <div className="reschedule-box">
                <label htmlFor={`reschedule-${departure.id}`}>Tanggal pengganti yang ditawarkan</label>
                <input id={`reschedule-${departure.id}`} type="date" value={proposedDate} min={earliestReplacementISO()} max={departure.packageDetails?.endDate || undefined} disabled={isSubmitting} onChange={(event) => setProposedDate(event.target.value)} />
                <p>Pelanggan menerima notifikasi dan email untuk menerima atau menolak. Penolakan diteruskan ke proses refund.</p>
              </div>
            )}

            <div className="decision-actions">
              <button type="button" className="decision-button continue" disabled={isSubmitting} aria-busy={isPendingAction('CONTINUE')} onClick={() => submitDecision(departure, 'CONTINUE')}>
                {isPendingAction('CONTINUE') ? <>{spinner} Memproses...</> : <><CheckCircle2 size={15} /> Tetap Berangkat</>}
              </button>
              {rescheduleFor === departure.id ? (
                <>
                  <button type="button" className="decision-button reschedule" disabled={isSubmitting} aria-busy={isPendingAction('RESCHEDULE')} onClick={() => submitDecision(departure, 'RESCHEDULE')}>
                    {isPendingAction('RESCHEDULE') ? <>{spinner} Mengirim...</> : <><CalendarClock size={15} /> Kirim Jadwal</>}
                  </button>
                  <button type="button" className="decision-button neutral" disabled={isSubmitting} onClick={() => { setRescheduleFor(null); setProposedDate(''); }}>Tutup</button>
                </>
              ) : (
                <button type="button" className="decision-button reschedule" disabled={isSubmitting} onClick={() => { setRescheduleFor(departure.id); setProposedDate(''); setError(''); }}><CalendarClock size={15} /> Reschedule</button>
              )}
              <button type="button" className="decision-button cancel" disabled={isSubmitting} aria-busy={isPendingAction('CANCEL')} onClick={() => submitDecision(departure, 'CANCEL')}>
                {isPendingAction('CANCEL') ? <>{spinner} Memproses...</> : <><XCircle size={15} /> Batalkan &amp; Refund</>}
              </button>
            </div>
          </article>
        );
      })}

      {awaitingCustomers.map((departure) => {
        const responded = departure.acceptedCount + departure.declinedCount;
        return (
          <article key={departure.id} className="awaiting-card">
            <RefreshCw size={19} />
            <div><strong>Menunggu jawaban pelanggan</strong><p>Tawaran tanggal {departure.proposedDate && <b>{formatDate(departure.proposedDate)}</b>} untuk <b>{departure.packageDetails?.name || 'Paket Wisata'}</b> sudah dikirim {decisionCause(departure)}. {departure.acceptedCount} menerima dan {departure.declinedCount} menolak dari {departure.bookingCount} pesanan{responded < departure.bookingCount ? '; sisanya belum menjawab.' : '.'}</p></div>
          </article>
        );
      })}

      <style>{`
        .departure-review { margin: 22px 0 10px; display: grid; gap: 14px; }
        .departure-feedback { border-radius: 12px; padding: 12px 16px; font-size: 13px; font-weight: 600; }
        .departure-feedback.error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
        .departure-feedback.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
        .departure-card { border-radius: 20px; padding: 22px; border: 1px solid; box-shadow: 0 14px 35px rgba(15, 23, 42, .06); }
        .departure-card.weather-adverse, .departure-card.quota-alert { background: linear-gradient(135deg, #fffaf0, #fff); border-color: #fcd34d; }
        .departure-card.weather-clear { background: linear-gradient(135deg, #effcf9, #fff); border-color: #99f6e4; }
        .departure-card-header { display: flex; gap: 13px; align-items: flex-start; }
        .departure-icon { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; flex: 0 0 auto; color: #0f766e; background: #ccfbf1; }
        .weather-adverse .departure-icon, .quota-alert .departure-icon { color: #b45309; background: #fef3c7; }
        .departure-eyebrow { display: block; color: #64748b; font-size: 10.5px; font-weight: 800; letter-spacing: .08em; margin-bottom: 3px; }
        .departure-card h3 { margin: 0; color: #0f172a; font-size: 17px; line-height: 1.35; }
        .departure-card-header p { margin: 5px 0 0; color: #64748b; font-size: 12.5px; }
        .weather-summary { display: grid; grid-template-columns: minmax(180px, 1.5fr) repeat(4, minmax(105px, 1fr)); gap: 9px; margin: 18px 0 12px; }
        .weather-condition, .weather-metric { min-height: 66px; padding: 11px 13px; border: 1px solid rgba(148, 163, 184, .24); border-radius: 13px; background: rgba(255,255,255,.82); }
        .weather-condition span, .weather-metric small { display: block; color: #64748b; font-size: 10.5px; margin-bottom: 5px; }
        .weather-condition strong { color: #0f172a; font-size: 13.5px; }
        .weather-metric { display: flex; align-items: center; gap: 9px; color: #0f8b8d; }
        .weather-metric strong { color: #1e293b; font-size: 12.5px; white-space: nowrap; }
        .weather-disclaimer { display: flex; align-items: flex-start; gap: 10px; background: rgba(255,255,255,.75); border-radius: 12px; padding: 12px 14px; color: #475569; }
        .weather-disclaimer svg { color: #0f8b8d; flex: 0 0 auto; margin-top: 2px; }
        .weather-disclaimer p, .quota-copy { margin: 0; font-size: 12px; line-height: 1.65; }
        .quota-copy { color: #92400e; margin: 14px 0; }
        .affected-bookings { margin-top: 12px; padding: 11px 13px; background: rgba(255,255,255,.82); border: 1px solid rgba(148,163,184,.24); border-radius: 12px; }
        .affected-title { display: flex; gap: 6px; align-items: center; color: #475569; font-size: 11px; font-weight: 800; margin-bottom: 7px; }
        .affected-list { display: flex; flex-wrap: wrap; gap: 7px; }
        .affected-list span { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #475569; font-size: 11px; padding: 4px 9px; }
        .reschedule-box { margin-top: 12px; padding: 13px; background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; }
        .reschedule-box label { display: block; color: #334155; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 7px; }
        .reschedule-box input { width: min(100%, 250px); padding: 9px 11px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
        .reschedule-box p { margin: 7px 0 0; color: #64748b; font-size: 11px; line-height: 1.5; }
        .decision-actions { display: flex; gap: 9px; flex-wrap: wrap; padding-top: 15px; margin-top: 15px; border-top: 1px dashed rgba(148,163,184,.55); }
        .decision-button { border: 0; border-radius: 9px; padding: 9px 14px; display: inline-flex; align-items: center; gap: 6px; color: #fff; font-size: 11.5px; font-weight: 750; cursor: pointer; transition: transform .15s ease, opacity .15s ease; }
        .decision-button:hover:not(:disabled) { transform: translateY(-1px); }
        .decision-button:disabled { opacity: .55; cursor: wait; }
        .decision-button.continue { background: #059669; }
        .decision-button.reschedule { background: #d97706; }
        .decision-button.cancel { background: #dc2626; }
        .decision-button.neutral { background: #64748b; }
        .awaiting-card { display: flex; gap: 11px; align-items: flex-start; padding: 16px 18px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; color: #1d4ed8; }
        .awaiting-card svg { flex: 0 0 auto; margin-top: 2px; }
        .awaiting-card strong { font-size: 13.5px; }
        .awaiting-card p { margin: 4px 0 0; color: #1e40af; font-size: 12px; line-height: 1.6; }
        @media (max-width: 920px) { .weather-summary { grid-template-columns: repeat(2, 1fr); } .weather-condition { grid-column: 1 / -1; } }
        @media (max-width: 560px) { .departure-card { padding: 17px; border-radius: 16px; } .weather-summary { grid-template-columns: 1fr 1fr; } .decision-button { flex: 1 1 145px; justify-content: center; } }
      `}</style>
    </section>
  );
};
