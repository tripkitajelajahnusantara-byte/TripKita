import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Info, LoaderCircle, Users, XCircle } from 'lucide-react';
import type { Booking } from '../types';
import { request } from '../utils/api';
import { addDays, jakartaToday, threeMonthLimit } from '../utils/tripDates';
import { useActionLock } from '../utils/useActionLock';

type Choice = 'RESCHEDULE' | 'CANCEL';

const REASON_MIN = 10;
const REASON_MAX = 200;
// Pelanggan selalu punya minimal 2x24 jam untuk menjawab (sama dengan backend).
const RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000;

const isOpenTrip = (tripType?: string) => (tripType || '').replace(/\s+/g, '').toLowerCase() === 'opentrip';
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const formatDay = (day: string) =>
  new Date(`${day}T00:00:00+07:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const formatDateTime = (iso: string) =>
  `${new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`;

// Tanggal pengganti paling awal: jam keberangkatan semula pada hari pertama
// yang masih memberi pelanggan 2x24 jam untuk menjawab.
function earliestReplacementDay(rawTripDate?: string): string {
  const earliest = new Date(Date.now() + RESPONSE_WINDOW_MS);
  let day = jakartaToday(earliest);
  const trip = rawTripDate ? new Date(rawTripDate) : null;
  if (trip && Number.isFinite(trip.getTime())) {
    const time = trip.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
    if (new Date(`${day}T${time}:00+07:00`).getTime() < earliest.getTime()) day = addDays(day, 1);
  }
  return day;
}

interface Props {
  booking: Booking;
  /** Jumlah pesanan aktif pada keberangkatan yang sama (khusus Open Trip). */
  departureBookingCount: number;
  onClose: () => void;
  onCompleted: (title: string, message: string) => void;
}

/**
 * Dialog mitra untuk trip yang tidak dapat berjalan sesuai jadwal. Hanya ada
 * dua pilihan untuk semua tipe trip: menawarkan jadwal pengganti (pelanggan
 * menerima atau menolak dengan refund penuh), atau membatalkan dengan refund
 * penuh. Keduanya wajib menyertakan alasan yang dibaca pelanggan.
 */
export function TripChangeModal({ booking, departureBookingCount, onClose, onCompleted }: Props) {
  const awaitingAnswer = booking.status === 'RESCHEDULE_OFFERED';
  const alreadyRescheduled = (booking.rescheduleCount || 0) >= 1;
  const rescheduleBlocked = awaitingAnswer
    ? 'Tawaran jadwal pengganti sebelumnya masih menunggu jawaban pelanggan.'
    : alreadyRescheduled ? 'Pesanan ini sudah pernah dijadwalkan ulang (maksimal 1 kali).' : '';

  const [choice, setChoice] = useState<Choice | null>(rescheduleBlocked ? 'CANCEL' : null);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const { isBusy, run } = useActionLock();
  const errorRef = useRef<HTMLDivElement>(null);

  // Pesan gagal dari server harus terlihat walau dialog sedang digulir.
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [error]);

  const openTrip = isOpenTrip(booking.tripType);
  const originalDay = booking.rawTripDate ? jakartaToday(new Date(booking.rawTripDate)) : '';
  const minDay = useMemo(() => earliestReplacementDay(booking.rawTripDate), [booking.rawTripDate]);
  const maxDay = openTrip ? undefined : threeMonthLimit();
  const reasonLength = reason.trim().length;
  const reasonValid = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX;
  const dateValid = Boolean(newDate) && newDate >= minDay && (!maxDay || newDate <= maxDay) && newDate !== originalDay;
  const canSubmit = !isBusy && reasonValid && (choice === 'RESCHEDULE' ? dateValid : choice === 'CANCEL' && acknowledged);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isBusy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isBusy, onClose]);

  const choose = (next: Choice) => { setChoice(next); setError(''); };

  const submit = () => run('trip-change', async () => {
    if (!canSubmit || !booking.dbId) return;
    setError('');
    try {
      if (choice === 'RESCHEDULE') {
        const result = await request(`/provider/bookings/${booking.dbId}/reschedule`, {
          method: 'PUT',
          body: JSON.stringify({ newTripDate: newDate, reason: reason.trim() }),
        });
        onCompleted('Tawaran Jadwal Terkirim', result?.message || 'Pelanggan menerima email dan notifikasi untuk menjawab tawaran jadwal pengganti.');
      } else {
        await request(`/provider/bookings/${booking.dbId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'CANCELLED_BY_PROVIDER', cancellationReason: reason.trim() }),
        });
        onCompleted('Trip Dibatalkan', 'Pesanan dibatalkan. Pelanggan menerima email dan notifikasi berisi alasan Anda, dan refund 100% diproses admin.');
      }
    } catch (err) {
      setError(capitalize((err as Error)?.message || 'Permintaan gagal diproses. Coba lagi.'));
    }
  });

  const option = (value: Choice, icon: ReactNode, title: string, description: string, disabledReason = '') => {
    const selected = choice === value;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={Boolean(disabledReason) || isBusy}
        onClick={() => choose(value)}
        className={`tc-option ${selected ? 'selected' : ''} ${value === 'CANCEL' ? 'danger' : ''}`}
      >
        <span className="tc-option-icon">{icon}</span>
        <span className="tc-option-text">
          <strong>{title}</strong>
          <small>{disabledReason || description}</small>
        </span>
        <span className="tc-radio" aria-hidden="true" />
      </button>
    );
  };

  const reasonField = (label: string, placeholder: string) => (
    <div className="tc-field">
      <label htmlFor="tc-reason">{label}</label>
      <textarea
        id="tc-reason"
        rows={3}
        maxLength={REASON_MAX}
        value={reason}
        disabled={isBusy}
        onChange={(event) => setReason(event.target.value)}
        placeholder={placeholder}
      />
      <span className={`tc-hint ${reasonLength > 0 && reasonLength < REASON_MIN ? 'warn' : ''}`}>
        Dibaca pelanggan di email dan notifikasi. {reasonLength}/{REASON_MAX} karakter{reasonLength < REASON_MIN ? `, minimal ${REASON_MIN}` : ''}.
      </span>
    </div>
  );

  return (
    <div className="detail-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !isBusy) onClose(); }}>
      <div className="detail-modal-card tc-card" role="dialog" aria-modal="true" aria-labelledby="tc-title">
        <div className="tc-header">
          <div>
            <h2 id="tc-title">Ubah atau batalkan trip</h2>
            <p>Pesanan {booking.id}</p>
          </div>
          <button type="button" className="close-modal" aria-label="Tutup" onClick={onClose} disabled={isBusy}>✕</button>
        </div>

        <div className="tc-summary">
          <div><span>Paket</span><strong>{booking.package}</strong></div>
          <div><span>Pelanggan</span><strong>{booking.customerName} · {booking.guests} orang</strong></div>
          <div><span>Jadwal</span><strong>{originalDay ? formatDay(originalDay) : booking.tripDate}</strong></div>
          <div><span>Tipe trip</span><strong>{booking.tripType || 'Open Trip'}</strong></div>
        </div>

        {awaitingAnswer && booking.rescheduleDate && (
          <div className="tc-callout info">
            <Info size={16} aria-hidden="true" />
            <span>
              Tawaran jadwal pengganti <strong>{formatDay(jakartaToday(new Date(booking.rescheduleDate)))}</strong> masih menunggu jawaban pelanggan
              {booking.rescheduleResponseDeadline ? <> sampai <strong>{formatDateTime(booking.rescheduleResponseDeadline)}</strong></> : null}.
              Anda tetap dapat membatalkan pesanan dengan refund penuh.
            </span>
          </div>
        )}

        <p className="tc-question" id="tc-question">Apa yang ingin Anda lakukan?</p>
        <div className="tc-options" role="radiogroup" aria-labelledby="tc-question">
          {option('RESCHEDULE', <CalendarClock size={20} />, 'Jadwalkan ulang',
            'Tawarkan tanggal baru. Pelanggan menerima jadwal baru, atau menolak dan mendapat refund penuh.', rescheduleBlocked)}
          {option('CANCEL', <XCircle size={20} />, 'Batalkan & refund penuh',
            'Trip dibatalkan. Pelanggan menerima refund 100% yang diproses admin.')}
        </div>

        {choice === 'RESCHEDULE' && (
          <div className="tc-panel">
            <div className="tc-field">
              <label htmlFor="tc-date">Tanggal pengganti</label>
              <input id="tc-date" type="date" value={newDate} min={minDay} max={maxDay} disabled={isBusy}
                onChange={(event) => { setNewDate(event.target.value); setError(''); }} />
              <span className="tc-hint">
                Paling cepat {formatDay(minDay)} agar pelanggan punya waktu minimal 2×24 jam untuk menjawab
                {maxDay ? `, paling lambat ${formatDay(maxDay)}` : ''}. Jam keberangkatan tetap sama.
              </span>
            </div>
            {openTrip && departureBookingCount > 1 ? (
              <div className="tc-callout warn">
                <Users size={16} aria-hidden="true" />
                <span>Open Trip berangkat bersama: tawaran ini dikirim ke <strong>seluruh {departureBookingCount} pesanan</strong> pada keberangkatan {originalDay ? formatDay(originalDay) : 'ini'}. Setiap pelanggan menjawab sendiri.</span>
              </div>
            ) : !openTrip && (
              <div className="tc-callout info">
                <CalendarClock size={16} aria-hidden="true" />
                <span>Tanggal ini langsung ditahan untuk pelanggan ini sampai ia menjawab, sehingga tidak dapat dipesan orang lain.</span>
              </div>
            )}
            {reasonField('Alasan perubahan jadwal', 'Contoh: Jalur pendakian ditutup sementara oleh BPBD karena cuaca ekstrem.')}
            <ol className="tc-steps" aria-label="Yang terjadi selanjutnya">
              <li>Pelanggan menerima email dan notifikasi berisi tanggal baru beserta alasan Anda.</li>
              <li>Pelanggan menjawab sebelum jadwal semula (minimal 2×24 jam dari sekarang).</li>
              <li>Diterima: jadwal pindah otomatis. Ditolak atau tidak dijawab: refund penuh diproses admin.</li>
            </ol>
          </div>
        )}

        {choice === 'CANCEL' && (
          <div className="tc-panel">
            {reasonField('Alasan pembatalan', 'Contoh: Kapal penyeberangan tidak beroperasi karena gelombang tinggi.')}
            <div className="tc-callout danger">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>Pembatalan tidak dapat diurungkan. Bila hasil booking ini sudah dicairkan, nilainya dipotong dari pendapatan Anda berikutnya.</span>
            </div>
            <label className="tc-check">
              <input type="checkbox" checked={acknowledged} disabled={isBusy} onChange={(event) => setAcknowledged(event.target.checked)} />
              Saya mengerti pesanan ini dibatalkan permanen dan pelanggan menerima refund 100%.
            </label>
          </div>
        )}

        {error && <div ref={errorRef} className="tc-callout danger" role="alert"><AlertTriangle size={16} aria-hidden="true" /><span>{error}</span></div>}

        <div className="tc-footer">
          <button type="button" className="tc-btn ghost" onClick={onClose} disabled={isBusy}>Kembali</button>
          {choice && (
            <button type="button" className={`tc-btn ${choice === 'CANCEL' ? 'danger' : 'primary'}`} onClick={() => void submit()} disabled={!canSubmit} aria-busy={isBusy}>
              {isBusy ? <><LoaderCircle size={15} className="btn-spinner" aria-hidden="true" /> Memproses…</>
                : choice === 'RESCHEDULE' ? <><CheckCircle2 size={15} aria-hidden="true" /> Kirim tawaran ke pelanggan</>
                : <><XCircle size={15} aria-hidden="true" /> Batalkan & refund</>}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .tc-card { max-width: 620px; width: calc(100vw - 32px); max-height: 92vh; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .tc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .tc-header h2 { font-size: 19px; font-weight: 800; color: #0f172a; margin: 0; }
        .tc-header p { margin: 2px 0 0; font-size: 13px; color: #64748b; }
        .tc-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
        .tc-summary span { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #94a3b8; }
        .tc-summary strong { font-size: 13.5px; color: #0f172a; }
        .tc-question { margin: 0; font-size: 14px; font-weight: 700; color: #0f172a; }
        .tc-options { display: grid; gap: 10px; }
        .tc-option { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 14px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; background: #fff; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
        .tc-option:hover:not(:disabled) { border-color: #94a3b8; }
        .tc-option.selected { border-color: #0d9488; background: #f0fdfa; }
        .tc-option.danger.selected { border-color: #dc2626; background: #fef2f2; }
        .tc-option:disabled { cursor: not-allowed; opacity: 0.6; background: #f8fafc; }
        .tc-option-icon { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; background: #ccfbf1; color: #0f766e; }
        .tc-option.danger .tc-option-icon { background: #fee2e2; color: #b91c1c; }
        .tc-option-text { flex: 1; min-width: 0; }
        .tc-option-text strong { display: block; font-size: 14.5px; color: #0f172a; }
        .tc-option-text small { display: block; margin-top: 2px; font-size: 12.5px; line-height: 1.5; color: #64748b; }
        .tc-radio { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #cbd5e1; }
        .tc-option.selected .tc-radio { border: 5px solid #0d9488; }
        .tc-option.danger.selected .tc-radio { border-color: #dc2626; }
        .tc-panel { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
        .tc-field { display: flex; flex-direction: column; gap: 6px; }
        .tc-field label { font-size: 13px; font-weight: 700; color: #334155; }
        .tc-field input, .tc-field textarea { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-family: inherit; color: #0f172a; background: #fff; box-sizing: border-box; }
        .tc-field input { max-width: 260px; }
        .tc-field textarea { resize: vertical; }
        .tc-field input:focus, .tc-field textarea:focus { outline: 2px solid #99f6e4; border-color: #0d9488; }
        .tc-hint { font-size: 12px; line-height: 1.5; color: #64748b; }
        .tc-hint.warn { color: #b45309; }
        .tc-callout { display: flex; gap: 10px; align-items: flex-start; padding: 11px 13px; border-radius: 10px; font-size: 12.5px; line-height: 1.55; }
        .tc-callout svg { flex-shrink: 0; margin-top: 2px; }
        .tc-callout.info { background: #f0f9ff; border: 1px solid #bae6fd; color: #075985; }
        .tc-callout.warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .tc-callout.danger { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
        .tc-steps { margin: 0; padding: 12px 16px 12px 32px; background: #f8fafc; border-radius: 10px; font-size: 12.5px; line-height: 1.6; color: #475569; display: grid; gap: 4px; }
        .tc-check { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.5; color: #334155; cursor: pointer; }
        .tc-check input { margin-top: 3px; width: 16px; height: 16px; flex-shrink: 0; }
        .tc-footer { position: sticky; bottom: -24px; display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; margin: 0 -24px -24px; padding: 14px 24px; background: #fff; border-top: 1px solid #e2e8f0; }
        .tc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
        .tc-btn.ghost { background: #fff; border-color: #cbd5e1; color: #334155; }
        .tc-btn.primary { background: #0d9488; color: #fff; }
        .tc-btn.danger { background: #dc2626; color: #fff; }
        .tc-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        @media (max-width: 560px) {
          .tc-card { padding: 18px; }
          .tc-footer { bottom: -18px; margin: 0 -18px -18px; padding: 12px 18px; }
          .tc-summary { grid-template-columns: 1fr; }
          .tc-footer .tc-btn { flex: 1 1 100%; }
          .tc-field input { max-width: none; }
        }
      `}</style>
    </div>
  );
}
