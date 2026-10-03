import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { request } from '../utils/api';
import './AdminBookingMonitor.css';

const statuses: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu pembayaran', PAYMENT_REVIEW: 'Verifikasi pembayaran',
  PAID: 'Lunas', CONFIRMED: 'Dikonfirmasi', COMPLETED: 'Selesai',
  RESCHEDULE_OFFERED: 'Penawaran jadwal ulang', REFUND_REQUIRED: 'Perlu refund',
  REFUNDED: 'Sudah direfund', CANCELLED_BY_CUSTOMER: 'Dibatalkan customer',
  CANCELLED_BY_PROVIDER: 'Dibatalkan provider', EXPIRED: 'Kedaluwarsa', FAILED: 'Pembayaran gagal',
};

interface BookingItem {
  id: number; bookingCode: string; providerId: number; providerName: string;
  packageName: string; customerName: string; status: string; tripDate: string;
  guests: number; totalPrice: number; createdAt: string;
}
interface MonitorData {
  items: BookingItem[]; total: number; page: number; pageSize: number;
  summary: { total: number; byStatus: Record<string, number> };
}
interface Props {
  providers?: { id: number; businessName: string }[];
  providerId?: number;
  compact?: boolean;
  onViewAll?: () => void;
  onProviderSelect?: (id: number) => void;
}

const date = (value: string, withTime = false) => new Date(value).toLocaleString('id-ID', {
  timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
  ...(withTime ? { hour: '2-digit', minute: '2-digit' } as const : {}),
});
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export function AdminBookingMonitor({ providers = [], providerId, compact = false, onViewAll, onProviderSelect }: Props) {
  const [selectedProvider, setSelectedProvider] = useState(providerId ? String(providerId) : '');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), pageSize: compact ? '5' : '20' });
    if (selectedProvider) params.set('providerId', selectedProvider);
    if (status) params.set('status', status);
    if (query) params.set('q', query);
    request(`/admin/booking-monitor?${params}`).then((result: MonitorData) => {
      if (cancelled) return;
      // Status may change while the admin is on a later page.
      const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setData(result);
    }).catch((err: unknown) => {
      if (!cancelled) {
        setData(null);
        setError(err instanceof Error ? err.message : 'Gagal memuat monitoring booking.');
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedProvider, status, query, page, compact, refresh]);

  const changeStatus = (value: string) => { setStatus(value); setPage(1); };
  return <section className={`booking-monitor ${compact ? 'booking-monitor-compact' : ''}`} aria-label={compact ? 'Booking provider' : 'Monitoring semua pesanan'}>
    <div className="booking-monitor-heading">
      <div><h3>{compact ? 'Booking Terbaru' : 'Semua Pesanan'}</h3><p>{compact ? 'Lima booking terbaru dan rekap status provider ini.' : 'Pesanan seluruh provider, termasuk yang belum dibayar dan dibatalkan.'}</p></div>
      <button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading} aria-label="Muat ulang booking"><RefreshCw size={15} /> Muat ulang</button>
    </div>
    {!compact && <form className="booking-monitor-filters" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}>
      <label>Provider<select value={selectedProvider} onChange={event => { setSelectedProvider(event.target.value); setPage(1); }}><option value="">Semua provider</option>{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.businessName}</option>)}</select></label>
      <label>Status pesanan<select value={status} onChange={event => changeStatus(event.target.value)}><option value="">Semua status</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="booking-monitor-search">Cari pesanan<input value={search} maxLength={150} onChange={event => setSearch(event.target.value)} placeholder="Kode booking, customer, paket, provider" /></label>
      <button type="submit">Cari</button>
    </form>}
    {error && <p className="booking-monitor-error" role="alert">{error} <button type="button" onClick={() => setRefresh(value => value + 1)}>Coba lagi</button></p>}
    {loading ? <p role="status">Memuat booking...</p> : data && <>
      <div className="booking-monitor-summary" aria-label="Jumlah booking per status">
        <button type="button" disabled={compact} aria-pressed={!status} onClick={() => changeStatus('')}>Total booking <strong>{data.summary.total.toLocaleString('id-ID')}</strong></button>
        {Object.entries(data.summary.byStatus).sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => <button type="button" disabled={compact} key={value} aria-pressed={status === value} onClick={() => changeStatus(value)}>{statuses[value] || value} <strong>{count.toLocaleString('id-ID')}</strong></button>)}
      </div>
      {!compact && <p className="booking-monitor-hint">Rekap mengikuti provider dan pencarian. Pilih status untuk menyaring daftar.</p>}
      {data.items.length === 0 ? <p className="booking-monitor-empty">{compact ? 'Provider ini belum menerima booking.' : 'Tidak ada booking yang sesuai dengan filter.'}</p> : compact ? <div className="booking-monitor-recent">{data.items.map(booking => <article key={booking.id}>
        <div><strong>{booking.bookingCode}</strong><span className="booking-monitor-status">{statuses[booking.status] || booking.status}</span></div>
        <p>{booking.packageName || 'Paket tidak tersedia'} · {booking.customerName}</p>
        <small>Dibuat {date(booking.createdAt, true)} WIB</small>
        <small>Berangkat {date(booking.tripDate)} · {booking.guests} peserta · {money(booking.totalPrice)}</small>
      </article>)}</div> : <div className="booking-monitor-table-wrap"><table><thead><tr><th>Booking / Masuk</th><th>Provider</th><th>Customer / Paket</th><th>Keberangkatan</th><th>Total</th><th>Status</th></tr></thead><tbody>{data.items.map(booking => <tr key={booking.id}>
        <td><strong>{booking.bookingCode}</strong><small>{date(booking.createdAt, true)} WIB</small></td>
        <td>{onProviderSelect && providers.some(provider => provider.id === booking.providerId) ? <button type="button" className="booking-monitor-link" onClick={() => onProviderSelect(booking.providerId)}>{booking.providerName}</button> : booking.providerName || `Provider #${booking.providerId}`}</td>
        <td><strong>{booking.customerName}</strong><small>{booking.packageName || 'Paket tidak tersedia'}</small></td>
        <td>{date(booking.tripDate)}<small>{booking.guests} peserta</small></td><td>{money(booking.totalPrice)}</td><td><span className="booking-monitor-status">{statuses[booking.status] || booking.status}</span></td>
      </tr>)}</tbody></table></div>}
      {!compact && <div className="booking-monitor-pagination"><span>{data.total === 0 ? 0 : (page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} dari {data.total} booking</span><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Sebelumnya</button><button type="button" disabled={page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>Berikutnya</button></div>}
    </>}
    {compact && onViewAll && <button type="button" className="booking-monitor-view-all" onClick={onViewAll}>Lihat semua pesanan provider</button>}
  </section>;
}
