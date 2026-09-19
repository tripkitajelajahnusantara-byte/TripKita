import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, RefreshCw, Users, XCircle } from 'lucide-react';
import { request } from '../utils/api';

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
  reason: 'QUOTA_SHORTFALL' | 'FORCE_MAJEURE';
  responseDeadline?: string | null;
  decision: string;
  proposedDate?: string | null;
  decisionNotes?: string;
  acceptedCount: number;
  declinedCount: number;
  packageDetails?: { id: number; name: string; tripType: string; quotaMin: number };
  bookings?: DepartureBooking[];
}

type DecisionAction = 'CONTINUE' | 'CANCEL' | 'RESCHEDULE';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

/** Tanggal minimal untuk input jadwal pengganti: besok, dalam format YYYY-MM-DD. */
function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Panel keputusan H-3 untuk open trip yang kuota minimalnya belum terpenuhi.
 *
 * Seluruh isinya berasal dari `/provider/open-trips/departures`; baris
 * keberangkatan hanya muncul bila job latar belakang sudah mencatat kekurangan
 * kuota pada batas H-3 pukul 00:01.
 */
export const TripDepartureAlert: React.FC = () => {
  const [departures, setDepartures] = useState<TripDeparture[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
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
      setError(err?.message || 'Data keberangkatan tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitDecision = async (departure: TripDeparture, action: DecisionAction) => {
    if (action === 'RESCHEDULE' && !proposedDate) {
      setError('Tanggal pengganti wajib diisi sebelum mengirim penjadwalan ulang.');
      return;
    }

    const confirmText =
      action === 'CONTINUE'
        ? 'Tetap berangkatkan trip ini meski peserta di bawah kuota minimal?'
        : action === 'CANCEL'
          ? 'Batalkan keberangkatan ini? Seluruh pesanan akan diteruskan ke admin untuk pengembalian dana penuh.'
          : `Tawarkan tanggal pengganti ${proposedDate} kepada seluruh pelanggan? Pelanggan yang menolak akan masuk proses pengembalian dana.`;
    if (!window.confirm(confirmText)) return;

    setSubmittingId(departure.id);
    setError('');
    setSuccess('');
    try {
      await request(`/provider/departures/${departure.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          proposedDate: action === 'RESCHEDULE' ? proposedDate : '',
          notes: '',
        }),
      });
      setSuccess(
        action === 'CONTINUE'
          ? 'Keberangkatan dikonfirmasi tetap jalan. Pelanggan telah diberi tahu.'
          : action === 'CANCEL'
            ? 'Keberangkatan dibatalkan. Admin menerima permintaan pengembalian dana.'
            : 'Tawaran jadwal pengganti telah dikirim ke seluruh pelanggan melalui notifikasi dan email.',
      );
      setRescheduleFor(null);
      setProposedDate('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Keputusan gagal disimpan.');
    } finally {
      setSubmittingId(null);
    }
  };

  const pending = departures.filter((d) => d.status === 'AWAITING_PROVIDER');
  const awaitingCustomers = departures.filter((d) => d.status === 'RESCHEDULE_OFFERED');

  if (loading || (pending.length === 0 && awaitingCustomers.length === 0 && !success)) {
    return null;
  }

  return (
    <section style={{ margin: '20px 0 10px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '12px', padding: '12px 16px', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '12px', padding: '12px 16px', fontSize: '13px' }}>
          {success}
        </div>
      )}

      {pending.map((departure) => {
        const packageName = departure.packageDetails?.name || 'Open Trip';
        const isSubmitting = submittingId === departure.id;
        return (
          <div
            key={departure.id}
            style={{
              backgroundColor: '#fffbeb',
              border: '1.5px solid #fde68a',
              borderRadius: '20px',
              padding: '20px 24px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#92400e' }}>
                  Keputusan H-3: Kuota Open Trip Belum Terpenuhi
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#b45309', lineHeight: 1.6 }}>
                  <strong>{packageName}</strong> berangkat <strong>{formatDate(departure.departureAt)}</strong> baru terisi{' '}
                  <strong>{departure.seatsBooked} dari minimal {departure.seatsRequired} kursi</strong> ({departure.bookingCount} pesanan).
                  Tentukan keputusan Anda sebelum tanggal keberangkatan.
                </p>
              </div>
            </div>

            {departure.bookings && departure.bookings.length > 0 && (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #fde68a', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                  <Users size={13} /> Pesanan terdampak
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {departure.bookings.map((b) => (
                    <span key={b.id} style={{ fontSize: '11.5px', color: '#475569', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 10px' }}>
                      #{b.bookingCode} — {b.customerName} ({b.guests} orang)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {rescheduleFor === departure.id && (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                  TANGGAL PENGGANTI YANG DITAWARKAN
                </label>
                <input
                  type="date"
                  value={proposedDate}
                  min={tomorrowISO()}
                  onChange={(e) => setProposedDate(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', width: '100%', maxWidth: '240px' }}
                />
                <p style={{ margin: '8px 0 0 0', fontSize: '11.5px', color: '#b45309', lineHeight: 1.5 }}>
                  Setiap pelanggan akan menerima notifikasi dan email untuk menerima atau menolak tanggal ini.
                  Yang menolak otomatis masuk proses pengembalian dana.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px dashed #fde68a' }}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => submitDecision(departure, 'CONTINUE')}
                style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: isSubmitting ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={14} /> Tetap Berangkat
              </button>

              {rescheduleFor === departure.id ? (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => submitDecision(departure, 'RESCHEDULE')}
                    style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: isSubmitting ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CalendarClock size={14} /> Kirim Tawaran Jadwal
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => { setRescheduleFor(null); setProposedDate(''); }}
                    style={{ backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Batal
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setRescheduleFor(departure.id); setProposedDate(''); setError(''); }}
                  style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: isSubmitting ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <CalendarClock size={14} /> Jadwalkan Ulang
                </button>
              )}

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => submitDecision(departure, 'CANCEL')}
                style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: isSubmitting ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <XCircle size={14} /> Batalkan (Refund)
              </button>
            </div>
          </div>
        );
      })}

      {awaitingCustomers.map((departure) => {
        const packageName = departure.packageDetails?.name || 'Open Trip';
        const responded = departure.acceptedCount + departure.declinedCount;
        return (
          <div
            key={departure.id}
            style={{ backgroundColor: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '20px', padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <RefreshCw size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12.5px', color: '#1e40af', lineHeight: 1.6 }}>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>
                  Menunggu Jawaban Pelanggan
                </strong>
                Tawaran jadwal pengganti{' '}
                {departure.proposedDate && <strong>{formatDate(departure.proposedDate)}</strong>} untuk{' '}
                <strong>{packageName}</strong> ({formatDate(departure.departureAt)}) sudah dikirim
                {departure.reason === 'FORCE_MAJEURE' ? ' karena keadaan kahar' : ' karena kuota minimal tidak terpenuhi'}.
                {departure.responseDeadline && (
                  <> Batas jawaban pelanggan: <strong>{formatDate(departure.responseDeadline)}</strong>.</>
                )}
                Sejauh ini <strong>{departure.acceptedCount} menerima</strong> dan{' '}
                <strong>{departure.declinedCount} menolak</strong> dari {departure.bookingCount} pesanan
                {responded < departure.bookingCount && ' — sisanya belum menjawab'}.
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};
