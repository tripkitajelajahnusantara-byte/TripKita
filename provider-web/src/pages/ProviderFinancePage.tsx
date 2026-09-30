import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCustomAlert } from '../components/CustomAlertModal';
import { Sidebar } from '../components/Sidebar';
import { request, API_BASE_URL, getAuthHeaders, openProtectedDocument } from '../utils/api';
import { 
  Wallet, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  Building2, 
  HelpCircle,
  TrendingUp,
  Lock,
  Download,
  FileText,
  LoaderCircle,
  CalendarDays
} from 'lucide-react';
import { useActionLock } from '../utils/useActionLock';
import { SkeletonTable } from '../components/Skeleton';

interface PayoutItem {
  id: number;
  bookingId?: number;
  amount: number;
  type: string;
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'FAILED' | 'REJECTED';
  failureCode?: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  notes?: string;
  proofPath?: string;
  createdAt: string;
}

type PayoutType = 'DP_50' | 'PELUNASAN_50';

interface BookingPayoutStage {
  amount: number;
  remaining: number;
  status: 'AVAILABLE' | 'LOCKED' | 'REQUESTED' | 'PAID' | 'NONE';
  payoutId?: number;
  proofPath?: string;
}

interface BookingPayout {
  bookingId: number;
  bookingCode: string;
  packageName: string;
  customerName: string;
  guests: number;
  tripDate: string;
  tripEndDate: string;
  bookingStatus: string;
  netEarning: number;
  dp: BookingPayoutStage;
  settlement: BookingPayoutStage;
}

interface PayoutSummary {
  platformFeePercent: number;
  serviceFee: number;
  totalEarnings: number;
  platformFee: number;
  netEarnings: number;
  availableDp: number;
  availablePelunasan?: number;
  heldSettlement: number;
  totalPaidOut: number;
  pendingPayout: number;
  providerDebt: number;
  payouts: PayoutItem[];
  bookings?: BookingPayout[];
}

const formatTripDate = (value: string) =>
  new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

const payoutTypeLabel = (type: PayoutType) => type === 'DP_50' ? 'DP 50%' : 'Pelunasan 50%';

export const ProviderFinancePage: React.FC = () => {
  const { providerProfile } = useNavigation();
  const { showAlert } = useCustomAlert();
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  // Pengajuan pencairan menyangkut uang: kunci berbasis ref mencegah klik ganda
  // cepat membuat dua pengajuan sebelum state sempat ter-render ulang.
  const { isBusy: submitting, run } = useActionLock();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTarget, setRequestTarget] = useState<{ booking: BookingPayout; type: PayoutType } | null>(null);
  const [modalNotice, setModalNotice] = useState<{ title: string; message: string; isError?: boolean } | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await request('/provider/payouts/summary');
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch payout summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/provider/payouts/export-excel`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Gagal mengunduh laporan excel');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Keuangan_Provider_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showAlert({ type: 'error', message: err.message || 'Gagal mendownload laporan Excel' });
    }
  };

  // Bukti transfer adalah file yang diunggah admin saat menyetujui pencairan.
  const handleViewProof = async (proofPath: string) => {
    try {
      await openProtectedDocument('provider', proofPath);
    } catch (err: any) {
      showAlert({ type: 'error', message: err.message || 'Bukti transfer tidak dapat dibuka' });
    }
  };

  const bookingCodeById = new Map((summary?.bookings || []).map(b => [b.bookingId, b.bookingCode]));

  const isBankConfigured = !!(providerProfile?.bankName && providerProfile?.bankAccount && providerProfile?.bankAccountName);
  const bankName = providerProfile?.bankName || '';
  const bankAccount = providerProfile?.bankAccount || '';
  const bankAccountName = providerProfile?.bankAccountName || '';

  const handleCreatePayoutRequest = async () => {
    if (submitting || !summary || !requestTarget) return;
    const { booking, type: requestType } = requestTarget;
    const stage = requestType === 'DP_50' ? booking.dp : booking.settlement;

    if (!isBankConfigured) {
      setModalNotice({
        title: 'Rekening Bank Belum Diatur',
        message: 'Pengajuan pencairan tidak dapat dilakukan. Anda wajib mengisi data rekening bank tujuan yang valid pada menu Profil Provider terlebih dahulu.',
        isError: true
      });
      return;
    }

    const reqAmount = stage.remaining;

    if (stage.status !== 'AVAILABLE' || reqAmount <= 0) {
      setModalNotice({
        title: 'Belum Dapat Dicairkan',
        message: requestType === 'DP_50'
          ? 'DP 50% untuk trip ini belum tersedia untuk dicairkan.'
          : 'Pelunasan 50% trip ini baru dapat dicairkan setelah tanggal trip selesai.',
        isError: true
      });
      return;
    }

    await run('payout', async () => {
      try {
        await request('/provider/payouts/request', {
          method: 'POST',
          body: JSON.stringify({
            amount: reqAmount,
            type: requestType,
            bookingId: booking.bookingId
          })
        });

        setShowRequestModal(false);
        setModalNotice({
          title: 'Pengajuan Berhasil Dikirim!',
          message: `Pengajuan pencairan ${payoutTypeLabel(requestType)} trip ${booking.bookingCode} sebesar ${formatIDR(reqAmount)} telah dikirim. Setelah disetujui admin, transfer diproses ke rekening Mitra yang terdaftar.`
        });
        fetchSummary();
      } catch (err: any) {
        console.error(err);
        setModalNotice({
          title: 'Gagal Mengirim Pengajuan',
          message: err.message || 'Terjadi kesalahan saat membuat pengajuan pencairan.',
          isError: true
        });
      }
    });
  };

  return (
    <div className="dashboard-layout animate-fade-in" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />

      <main className="dashboard-main" style={{ padding: '32px' }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ backgroundColor: '#e0f2fe', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={20} color="#0284c7" />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Keuangan & Saldo Mitra
              </h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Pencairan dilakukan per trip: DP 50% setelah booking lunas dan Pelunasan 50% setelah trip selesai, langsung ke rekening bank Mitra Anda.
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '13.5px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(16, 185, 129, 0.2)',
              transition: 'all 0.2s'
            }}
          >
            <Download size={16} /> Unduh Laporan Excel (.xlsx / CSV)
          </button>
        </div>

        {/* 4 Summary Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          
          {/* Card 1: Total Pendapatan Bersih Mitra */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pendapatan Bersih Mitra
              </span>
              <div style={{ backgroundColor: '#dcfce7', padding: '6px', borderRadius: '8px' }}>
                <TrendingUp size={18} color="#16a34a" />
              </div>
            </div>
            <strong style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
              {formatIDR(summary?.netEarnings || 0)}
            </strong>
            <span style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: '600' }}>
              Tarif booking baru {summary?.platformFeePercent ?? providerProfile?.platformFeePercent ?? 0}% + biaya layanan {formatIDR(summary?.serviceFee ?? 0)}; transaksi lama mengikuti tarif saat dibuat
            </span>
          </div>

          {/* Card 2: Saldo DP 50% (Awal) */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '22px', border: '1.5px solid #0284c7', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                DP 50% Siap Dicairkan
              </span>
              <div style={{ backgroundColor: '#e0f2fe', padding: '6px', borderRadius: '8px' }}>
                <DollarSign size={18} color="#0284c7" />
              </div>
            </div>
            <strong style={{ fontSize: '20px', fontWeight: '800', color: '#0284c7', display: 'block', marginBottom: '4px' }}>
              {formatIDR(summary?.availableDp || 0)}
            </strong>
            <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: '600' }}>Bisa dicairkan awal booking lunas</span>
          </div>

          {/* Card 3: Saldo Pelunasan 50% (Akhir Trip) */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '22px', border: '1.5px solid #16a34a', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pelunasan 50% Siap Dicairkan
              </span>
              <div style={{ backgroundColor: '#dcfce7', padding: '6px', borderRadius: '8px' }}>
                <CheckCircle2 size={18} color="#16a34a" />
              </div>
            </div>
            <strong style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a', display: 'block', marginBottom: '4px' }}>
              {formatIDR(summary?.availablePelunasan || 0)}
            </strong>
            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>Aktif dicairkan (Trip Selesai)</span>
          </div>

          {/* Card 4: Saldo Pelunasan 50% (Tertahan Sebelum Trip) */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pelunasan 50% (Tertahan)
              </span>
              <div style={{ backgroundColor: '#fef3c7', padding: '6px', borderRadius: '8px' }}>
                <Lock size={18} color="#d97706" />
              </div>
            </div>
            <strong style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
              {formatIDR(summary?.heldSettlement || 0)}
            </strong>
            <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '600' }}>Aktif saat tanggal trip selesai</span>
          </div>

        </div>

        {(summary?.providerDebt || 0) > 0 && (
          <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '14px', padding: '16px 18px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="#c2410c" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong style={{ color: '#9a3412', display: 'block', marginBottom: '3px' }}>Penyesuaian saldo refund: {formatIDR(summary?.providerDebt || 0)}</strong>
              <span style={{ color: '#7c2d12', fontSize: '13px', lineHeight: 1.5 }}>
                Dana booking yang sebelumnya sudah dicairkan kemudian wajib direfund. Pendapatan berikutnya otomatis menutup penyesuaian ini sebelum saldo baru dapat diajukan.
              </span>
            </div>
          </div>
        )}

        {/* Action Banner: Request Payout & Destination Bank Info */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Rekening Bank Tujuan Pencairan Dana
            </span>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: isBankConfigured ? '#0f172a' : '#dc2626', margin: '4px 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color={isBankConfigured ? '#0284c7' : '#dc2626'} /> {isBankConfigured ? `${bankName} — ${bankAccount}` : 'Belum Diatur (Wajib Diisi di Profil Provider)'}
            </h3>
            <span style={{ fontSize: '13.5px', color: '#475569' }}>
              Atas Nama: <strong>{isBankConfigured ? bankAccountName : '—'}</strong>
            </span>
          </div>

          <span style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px', lineHeight: 1.5 }}>
            Pilih trip pada daftar di bawah untuk mengajukan pencairan DP atau pelunasan.
          </span>
        </div>

        {/* Pencairan per Trip */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            Pencairan per Trip
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
            Setiap booking memiliki pencairan DP 50% dan Pelunasan 50% masing-masing.
          </p>

          {loading ? (
            <SkeletonTable rows={4} columns={5} label="Memuat daftar booking" />
          ) : !summary?.bookings || summary.bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              Belum ada booking lunas yang dapat dicairkan.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '12.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px' }}>Trip</th>
                    <th style={{ padding: '12px' }}>Tanggal Trip</th>
                    <th style={{ padding: '12px' }}>Hak Bersih</th>
                    <th style={{ padding: '12px' }}>DP 50%</th>
                    <th style={{ padding: '12px' }}>Pelunasan 50%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.bookings.map(b => (
                    <tr key={b.bookingId} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <strong style={{ display: 'block', color: '#0f172a' }}>{b.packageName || 'Paket'}</strong>
                        <span style={{ display: 'block', fontSize: '12px', color: '#0284c7', fontWeight: 700 }}>{b.bookingCode}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{b.customerName} · {b.guests} peserta</span>
                      </td>
                      <td style={{ padding: '14px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                        <CalendarDays size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} aria-hidden="true" />
                        {formatTripDate(b.tripDate)} – {formatTripDate(b.tripEndDate)}
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 800, color: '#0f172a' }}>{formatIDR(b.netEarning)}</td>
                      {(['DP_50', 'PELUNASAN_50'] as PayoutType[]).map(type => {
                        const stage = type === 'DP_50' ? b.dp : b.settlement;
                        return (
                          <td key={type} style={{ padding: '14px 12px', minWidth: '170px' }}>
                            <strong style={{ display: 'block', color: '#0f172a', marginBottom: '6px' }}>{formatIDR(stage.amount)}</strong>
                            {stage.status === 'AVAILABLE' ? (
                              <button
                                onClick={() => {
                                  if (!isBankConfigured) {
                                    setModalNotice({
                                      title: 'Rekening Bank Belum Diatur',
                                      message: 'Isi data rekening bank tujuan pada menu Profil Provider terlebih dahulu.',
                                      isError: true
                                    });
                                    return;
                                  }
                                  setRequestTarget({ booking: b, type });
                                  setShowRequestModal(true);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', backgroundColor: type === 'DP_50' ? '#0284c7' : '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                              >
                                <ArrowUpRight size={14} /> Cairkan {formatIDR(stage.remaining)}
                              </button>
                            ) : stage.status === 'LOCKED' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#d97706', fontWeight: 600 }}>
                                <Lock size={13} /> Terbuka setelah {formatTripDate(b.tripEndDate)}
                              </span>
                            ) : stage.status === 'REQUESTED' ? (
                              <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 700 }}>⏳ Menunggu diproses admin</span>
                            ) : stage.status === 'PAID' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>✓ Sudah dicairkan</span>
                                {stage.proofPath && (
                                  <button type="button" onClick={() => handleViewProof(stage.proofPath!)} style={{ padding: 0, background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                                    Lihat bukti transfer
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Tidak ada saldo</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payout History Table */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>
            Riwayat Pengajuan Pencairan Dana
          </h2>

          {loading ? (
            <SkeletonTable rows={4} columns={5} label="Memuat riwayat pencairan" />
          ) : !summary?.payouts || summary.payouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              Belum ada riwayat pengajuan pencairan dana. Pilih trip pada daftar di atas untuk mengajukan pencairan.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '12.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px' }}>Tanggal</th>
                    <th style={{ padding: '12px' }}>Trip</th>
                    <th style={{ padding: '12px' }}>Tipe Pencairan</th>
                    <th style={{ padding: '12px' }}>Nominal</th>
                    <th style={{ padding: '12px' }}>Bank Tujuan</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Catatan Admin</th>
                    <th style={{ padding: '12px' }}>Bukti Transfer</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.payouts.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 12px', color: '#64748b' }}>
                        {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#0284c7', fontWeight: 700, fontSize: '13px' }}>
                        {(p.bookingId && bookingCodeById.get(p.bookingId)) || (p.bookingId ? `Booking #${p.bookingId}` : 'Gabungan (lama)')}
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: '700', color: '#0f172a' }}>
                        {p.type === 'DP_50' ? 'Uang Muka (DP 50%)' : 'Pelunasan Akhir (50%)'}
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: '800', color: '#0284c7' }}>
                        {formatIDR(p.amount)}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#475569' }}>
                        {p.bankName} — {p.bankAccount} ({p.bankAccountName})
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span 
                          style={{
                            padding: '4px 10px',
                            borderRadius: '30px',
                            fontSize: '12px',
                            fontWeight: '700',
                            backgroundColor:
                              p.status === 'APPROVED' ? '#dcfce7' :
                              (p.status === 'REJECTED' || p.status === 'FAILED') ? '#fee2e2' :
                              p.status === 'PROCESSING' ? '#e0f2fe' : '#fef3c7',
                            color:
                              p.status === 'APPROVED' ? '#16a34a' :
                              (p.status === 'REJECTED' || p.status === 'FAILED') ? '#dc2626' :
                              p.status === 'PROCESSING' ? '#0284c7' : '#d97706'
                          }}
                        >
                          {p.status === 'APPROVED' ? '✓ Dana Diterima' :
                           p.status === 'PROCESSING' ? '↻ Sedang Ditransfer' :
                           p.status === 'FAILED' ? '✕ Transfer Gagal' :
                           p.status === 'REJECTED' ? '✕ Ditolak' : '⏳ Menunggu Diproses'}
                        </span>
                        {p.status === 'FAILED' && (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#dc2626' }}>
                            Dana dikembalikan ke saldo Anda. Periksa data rekening lalu ajukan ulang.
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', color: '#64748b', fontSize: '13px' }}>
                        {p.notes || '-'}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {p.status === 'APPROVED' && p.proofPath ? (
                          <button
                            onClick={() => handleViewProof(p.proofPath!)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#e0f2fe',
                              color: '#0284c7',
                              border: '1px solid #bae6fd',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            <FileText size={14} /> Lihat Bukti
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* MODAL REQUEST PAYOUT */}
      {showRequestModal && requestTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', maxWidth: '460px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            <div style={{ backgroundColor: '#e0f2fe', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <HelpCircle size={28} color="#0284c7" />
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', textAlign: 'center', margin: '0 0 8px 0' }}>
              {requestTarget.type === 'DP_50' ? 'Konfirmasi Pengajuan DP (50% Awal)' : 'Konfirmasi Pencairan Pelunasan (50% Akhir Trip)'}
            </h3>

            <p style={{ fontSize: '13.5px', color: '#64748b', textAlign: 'center', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              {requestTarget.type === 'DP_50' ? 'Pencairan Uang Muka DP 50%' : 'Pencairan Sisa Pelunasan 50%'} untuk trip{' '}
              <strong style={{ color: '#0f172a' }}>{requestTarget.booking.packageName} ({requestTarget.booking.bookingCode})</strong>{' '}
              ke rekening bank Mitra sebesar:
            </p>

            <div style={{ backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd', textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', color: '#0369a1', display: 'block', marginBottom: '2px' }}>Nominal Pencairan:</span>
              <strong style={{ fontSize: '22px', color: '#0284c7', fontWeight: '800' }}>
                {formatIDR(requestTarget.type === 'DP_50' ? requestTarget.booking.dp.remaining : requestTarget.booking.settlement.remaining)}
              </strong>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569', marginBottom: '24px' }}>
              <div><strong>Bank Tujuan:</strong> {bankName}</div>
              <div><strong>No. Rekening:</strong> {bankAccount}</div>
              <div><strong>Atas Nama:</strong> {bankAccountName}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => setShowRequestModal(false)}
                // Modal tidak boleh ditutup saat pengajuan masih diproses agar hasilnya tetap terlihat.
                disabled={submitting}
                style={{ padding: '12px', backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
              >
                Batal
              </button>
              <button
                onClick={handleCreatePayoutRequest}
                disabled={submitting}
                aria-busy={submitting}
                style={{ padding: '12px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.75 : 1, boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {submitting ? (<><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> Mengirim...</>) : 'Ya, Ajukan Pencairan'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* NOTICE MODAL */}
      {modalNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', maxWidth: '440px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center' }}>
            
            <div style={{ backgroundColor: modalNotice.isError ? '#fee2e2' : '#dcfce7', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
              {modalNotice.isError ? <AlertCircle size={32} color="#ef4444" /> : <CheckCircle2 size={32} color="#16a34a" />}
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>
              {modalNotice.title}
            </h3>

            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px 0' }}>
              {modalNotice.message}
            </p>

            <button
              onClick={() => setModalNotice(null)}
              style={{ width: '100%', padding: '12px', backgroundColor: modalNotice.isError ? '#ef4444' : '#0284c7', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }}
            >
              OK, Mengerti
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
