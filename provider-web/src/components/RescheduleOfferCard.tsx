import { useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Clock, LoaderCircle, XCircle } from 'lucide-react';

interface OfferBooking {
  id?: number;
  tripDate: string;
  rescheduleDate?: string | null;
  rescheduleResponseDeadline?: string | null;
  cancellationReason?: string;
}

interface Props {
  booking: OfferBooking;
  /** Kunci aksi yang sedang berjalan dari useActionLock di halaman induk. */
  pending: string | null;
  busy: boolean;
  /** Tanpa onRespond (pesanan tamu), kartu hanya menampilkan informasi. */
  onRespond?: (accept: boolean) => void;
}

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const formatDeadline = (iso: string) =>
  `${new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`;

/**
 * Tawaran jadwal pengganti dari penyelenggara. Pelanggan melihat jadwal semula
 * dan jadwal baru berdampingan, sebab perubahan, batas waktu menjawab, lalu
 * mengonfirmasi pilihannya di dalam kartu sebelum dikirim.
 */
export function RescheduleOfferCard({ booking, pending, busy, onRespond }: Props) {
  const [confirming, setConfirming] = useState<'accept' | 'reject' | null>(null);
  if (!booking.rescheduleDate) return null;

  const acceptKey = `reschedule-${booking.id}-accept`;
  const rejectKey = `reschedule-${booking.id}-reject`;
  const sending = pending === acceptKey || pending === rejectKey;
  const reason = booking.cancellationReason?.trim();

  return (
    <div className="ro-card" role="region" aria-label="Tawaran jadwal pengganti">
      <div className="ro-head">
        <CalendarClock size={18} aria-hidden="true" />
        <strong>Penyelenggara menawarkan jadwal pengganti</strong>
      </div>

      <div className="ro-dates">
        <div className="ro-date old">
          <span>Jadwal semula</span>
          <strong>{formatDay(booking.tripDate)}</strong>
        </div>
        <ArrowRight size={18} className="ro-arrow" aria-hidden="true" />
        <div className="ro-date new">
          <span>Jadwal baru</span>
          <strong>{formatDay(booking.rescheduleDate)}</strong>
        </div>
      </div>

      {reason && <p className="ro-reason"><strong>Sebab:</strong> {reason}</p>}

      <p className="ro-deadline">
        <Clock size={14} aria-hidden="true" />
        <span>
          {booking.rescheduleResponseDeadline
            ? <>Jawab sebelum <strong>{formatDeadline(booking.rescheduleResponseDeadline)}</strong>. </>
            : null}
          Bila tidak dijawab, pesanan otomatis dibatalkan dan dana dikembalikan penuh.
        </span>
      </p>

      {!onRespond ? (
        <p className="ro-note">Masuk dengan akun pemesan untuk menerima atau menolak tawaran ini.</p>
      ) : confirming ? (
        <div className={`ro-confirm ${confirming}`} role="alertdialog" aria-live="polite">
          <p>
            {confirming === 'accept'
              ? <>Terima jadwal baru <strong>{formatDay(booking.rescheduleDate)}</strong>? Jadwal trip Anda langsung diperbarui.</>
              : <>Tolak jadwal baru? Pesanan dibatalkan dan dana Anda <strong>dikembalikan penuh</strong> setelah diproses admin.</>}
          </p>
          <div className="ro-actions">
            <button type="button" className={`ro-btn ${confirming === 'accept' ? 'accept' : 'reject-solid'}`} disabled={busy}
              aria-busy={sending} onClick={() => onRespond(confirming === 'accept')}>
              {sending ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> Mengirim…</>
                : confirming === 'accept' ? 'Ya, terima jadwal baru' : 'Ya, tolak & minta refund'}
            </button>
            <button type="button" className="ro-btn ghost" disabled={busy} onClick={() => setConfirming(null)}>Batal</button>
          </div>
        </div>
      ) : (
        <div className="ro-actions">
          <button type="button" className="ro-btn accept" disabled={busy} onClick={() => setConfirming('accept')}>
            <CheckCircle2 size={15} aria-hidden="true" /> Terima jadwal baru
          </button>
          <button type="button" className="ro-btn reject" disabled={busy} onClick={() => setConfirming('reject')}>
            <XCircle size={15} aria-hidden="true" /> Tolak & minta refund
          </button>
        </div>
      )}

      <style>{`
        .ro-card { display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 14px; background: #fffbeb; border: 1.5px solid #fde68a; }
        .ro-head { display: flex; align-items: center; gap: 8px; color: #b45309; font-size: 14px; }
        .ro-dates { display: flex; align-items: stretch; gap: 10px; flex-wrap: wrap; }
        .ro-date { flex: 1 1 180px; padding: 10px 12px; border-radius: 10px; background: #fff; border: 1px solid #fde68a; }
        .ro-date span { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #a16207; }
        .ro-date strong { display: block; margin-top: 2px; font-size: 13.5px; color: #0f172a; }
        .ro-date.old strong { color: #64748b; text-decoration: line-through; text-decoration-color: #cbd5e1; }
        .ro-date.new { border-color: #34d399; background: #ecfdf5; }
        .ro-date.new span { color: #047857; }
        .ro-arrow { align-self: center; color: #d97706; flex-shrink: 0; }
        .ro-reason { margin: 0; padding: 9px 12px; border-radius: 8px; background: #fff; border: 1px solid #fde68a; font-size: 12.5px; line-height: 1.55; color: #7c2d12; }
        .ro-deadline { display: flex; gap: 8px; align-items: flex-start; margin: 0; font-size: 12.5px; line-height: 1.55; color: #92400e; }
        .ro-deadline svg { flex-shrink: 0; margin-top: 2px; }
        .ro-note { margin: 0; font-size: 12.5px; color: #92400e; }
        .ro-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .ro-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1.5px solid transparent; }
        .ro-btn.accept { background: #16a34a; color: #fff; }
        .ro-btn.reject { background: #fff; color: #dc2626; border-color: #fca5a5; }
        .ro-btn.reject-solid { background: #dc2626; color: #fff; }
        .ro-btn.ghost { background: #fff; color: #334155; border-color: #cbd5e1; }
        .ro-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ro-confirm { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border-radius: 10px; background: #fff; border: 1px solid #bbf7d0; }
        .ro-confirm.reject { border-color: #fecaca; }
        .ro-confirm p { margin: 0; font-size: 13px; line-height: 1.55; color: #0f172a; }
        @media (max-width: 520px) {
          .ro-arrow { transform: rotate(90deg); }
          .ro-btn { flex: 1 1 100%; }
        }
      `}</style>
    </div>
  );
}
