import React, { useCallback, useEffect, useState } from 'react';
import { AlertOctagon, Send } from 'lucide-react';
import { request } from '../utils/api';

interface UpcomingDeparture {
  packageId: number;
  departureDay: string;
  departureAt: string;
  seatsBooked: number;
  bookingCount: number;
}

interface PackageOption {
  id: number;
  name: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Pembatalan keberangkatan karena keadaan kahar (force majeure).
 *
 * Berlaku untuk seluruh tipe paket, bukan hanya open trip, dan boleh dikirim
 * sampai hari keberangkatan berakhir — termasuk pada hari-H. Pelanggan menerima
 * pilihan yang sama seperti alur kuota: menerima tanggal pengganti, atau menolak
 * dan mendapat pengembalian dana penuh.
 */
export const ForceMajeureForm: React.FC<{ onSubmitted?: () => void }> = ({ onSubmitted }) => {
  const [departures, setDepartures] = useState<UpcomingDeparture[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [selected, setSelected] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const [upcoming, pkgs] = await Promise.all([
        request('/provider/departures/upcoming'),
        request('/provider/packages'),
      ]);
      setDepartures(Array.isArray(upcoming) ? upcoming : []);
      setPackages(
        Array.isArray(pkgs) ? pkgs.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })) : [],
      );
      setError('');
    } catch (err) {
      setError((err as Error)?.message || 'Jadwal keberangkatan tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const packageName = (id: number) => packages.find((p) => p.id === id)?.name || `Paket #${id}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const departure = departures.find((d) => `${d.packageId}|${d.departureDay}` === selected);
    if (!departure) {
      setError('Pilih keberangkatan yang dibatalkan terlebih dahulu.');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Alasan pembatalan wajib diisi minimal 10 karakter dan akan dibaca pelanggan.');
      return;
    }
    if (!proposedDate) {
      setError('Tanggal pengganti wajib diisi.');
      return;
    }
    if (
      !window.confirm(
        `Batalkan keberangkatan ${packageName(departure.packageId)} tanggal ${formatDate(departure.departureAt)}?\n\n` +
          `${departure.bookingCount} pesanan akan menerima notifikasi dan email untuk memilih: menerima tanggal pengganti ${proposedDate}, atau menolak dan menerima pengembalian dana penuh.`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const result = await request('/provider/departures/force-majeure', {
        method: 'POST',
        body: JSON.stringify({
          packageId: departure.packageId,
          departureDay: departure.departureDay,
          proposedDate,
          reason: reason.trim(),
        }),
      });
      setSuccess(result?.message || 'Pembatalan tercatat dan pelanggan telah diberi tahu.');
      setSelected('');
      setProposedDate('');
      setReason('');
      await load();
      onSubmitted?.();
    } catch (err) {
      setError((err as Error)?.message || 'Pembatalan gagal dikirim.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '13px',
    fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: '#7f1d1d',
    marginBottom: '6px',
    letterSpacing: '0.02em',
  };

  return (
    <section
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #fecaca',
        borderRadius: '20px',
        padding: '22px 24px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px' }}>
        <AlertOctagon size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#b91c1c' }}>
            Pembatalan Karena Keadaan Kahar (Force Majeure)
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b', lineHeight: 1.6 }}>
            Gunakan hanya untuk keadaan di luar kendali Anda, misalnya cuaca ekstrem, bencana alam, atau penutupan
            destinasi oleh pihak berwenang. Seluruh pelanggan pada keberangkatan tersebut akan menerima notifikasi
            dan email untuk memilih tanggal pengganti atau pengembalian dana penuh.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', marginBottom: '14px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', marginBottom: '14px' }}>
          {success}
        </div>
      )}

      {departures.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Tidak ada keberangkatan terjadwal dengan pesanan aktif saat ini.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={labelStyle} htmlFor="fm-departure">KEBERANGKATAN YANG DIBATALKAN</label>
            <select
              id="fm-departure"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Pilih keberangkatan —</option>
              {departures.map((d) => (
                <option key={`${d.packageId}|${d.departureDay}`} value={`${d.packageId}|${d.departureDay}`}>
                  {packageName(d.packageId)} — {formatDate(d.departureAt)} ({d.bookingCount} pesanan, {d.seatsBooked} peserta)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle} htmlFor="fm-date">TANGGAL PENGGANTI YANG DITAWARKAN</label>
            <input
              id="fm-date"
              type="date"
              value={proposedDate}
              min={tomorrowISO()}
              onChange={(e) => setProposedDate(e.target.value)}
              style={{ ...inputStyle, maxWidth: '240px' }}
            />
            <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Pelanggan yang menolak tanggal ini otomatis masuk proses pengembalian dana penuh.
            </p>
          </div>

          <div>
            <label style={labelStyle} htmlFor="fm-reason">ALASAN PEMBATALAN (DIBACA PELANGGAN)</label>
            <textarea
              id="fm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Contoh: Status Gunung Bromo dinaikkan ke Siaga III dan jalur pendakian ditutup BPBD sejak pagi ini."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Minimal 10 karakter. Alasan ini tersimpan sebagai jejak audit dan dikirim ke pelanggan.
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '11px 22px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: submitting ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Send size={15} /> {submitting ? 'Mengirim...' : 'Batalkan & Kirim Pilihan ke Pelanggan'}
            </button>
            <span style={{ fontSize: '11.5px', color: '#94a3b8', marginLeft: '12px' }}>
              Berlaku juga pada hari keberangkatan ({formatDate(todayISO())}).
            </span>
          </div>
        </form>
      )}
    </section>
  );
};
