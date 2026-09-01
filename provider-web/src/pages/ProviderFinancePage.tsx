import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from '../components/Sidebar';
import { request } from '../utils/api';
import { 
  Wallet, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  Building2, 
  HelpCircle,
  TrendingUp,
  Lock
} from 'lucide-react';

interface PayoutItem {
  id: number;
  amount: number;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  notes?: string;
  createdAt: string;
}

interface PayoutSummary {
  totalEarnings: number;
  platformFee: number;
  netEarnings: number;
  availableDp: number;
  heldSettlement: number;
  totalPaidOut: number;
  pendingPayout: number;
  payouts: PayoutItem[];
}

export const ProviderFinancePage: React.FC = () => {
  const { providerProfile } = useNavigation();
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'DP_50' | 'PELUNASAN_50'>('DP_50');
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

  const handleCreatePayoutRequest = async () => {
    if (!summary) return;

    const reqAmount = requestType === 'DP_50' ? summary.availableDp : summary.heldSettlement;

    if (reqAmount <= 0) {
      setModalNotice({
        title: 'Saldo Tidak Mencukupi',
        message: 'Saat ini belum ada saldo yang siap untuk dicairkan.',
        isError: true
      });
      return;
    }

    setSubmitting(true);
    try {
      await request('/provider/payouts/request', {
        method: 'POST',
        body: JSON.stringify({
          amount: reqAmount,
          type: requestType
        })
      });

      setShowRequestModal(false);
      setModalNotice({
        title: 'Pengajuan Berhasil Dikirim!',
        message: `Pengajuan pencairan ${requestType === 'DP_50' ? 'DP 50%' : 'Pelunasan 50%'} sebesar ${formatIDR(reqAmount)} telah dikirim ke Admin TripKita.`
      });
      fetchSummary();
    } catch (err: any) {
      console.error(err);
      setModalNotice({
        title: 'Gagal Mengirim Pengajuan',
        message: err.message || 'Terjadi kesalahan saat membuat pengajuan pencairan.',
        isError: true
      });
    } finally {
      setSubmitting(false);
    }
  };

  const bankName = providerProfile?.bankName || 'Bank BCA';
  const bankAccount = providerProfile?.bankAccount || '1234567890';
  const bankAccountName = providerProfile?.bankAccountName || providerProfile?.picName || 'Wisata Nusantara';

  return (
    <div className="dashboard-layout animate-fade-in" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />

      <main className="dashboard-main" style={{ padding: '32px' }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ backgroundColor: '#e0f2fe', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} color="#0284c7" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Keuangan & Saldo Mitra
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Kelola pendapatan trip, saldo DP 50%, dan pengajuan pencairan dana ke rekening bank Anda.
          </p>
        </div>

        {/* 4 Summary Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          
          {/* Card 1: Total Pendapatan Bersih (86%) */}
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
              86% Net Share (Omset Kotor: {formatIDR(summary?.totalEarnings || 0)})
            </span>
          </div>

          {/* Card 2: Saldo DP 50% (Available) */}
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
            <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: '600' }}>Bisa dicairkan sekarang</span>
          </div>

          {/* Card 3: Saldo Pelunasan 50% (Held) */}
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
            <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '600' }}>Dicairkan setelah trip selesai</span>
          </div>

          {/* Card 4: Fee Platform TripKita 14% */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Komisi TripKita (14%)
              </span>
              <div style={{ backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '8px' }}>
                <CheckCircle2 size={18} color="#475569" />
              </div>
            </div>
            <strong style={{ fontSize: '20px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>
              {formatIDR(summary?.platformFee || 0)}
            </strong>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Potongan biaya platform 14%</span>
          </div>

        </div>

        {/* Action Banner: Request Payout & Destination Bank Info */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Rekening Bank Tujuan Pencairan
            </span>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '4px 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="#0284c7" /> {bankName} — {bankAccount}
            </h3>
            <span style={{ fontSize: '13.5px', color: '#475569' }}>
              Atas Nama: <strong>{bankAccountName}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                setRequestType('DP_50');
                setShowRequestModal(true);
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowUpRight size={18} /> Ajukan Pencairan DP (50%)
            </button>
          </div>
        </div>

        {/* Payout History Table */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>
            Riwayat Pengajuan Pencairan Dana
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              Sedang memuat riwayat pencairan...
            </div>
          ) : !summary?.payouts || summary.payouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              Belum ada riwayat pengajuan pencairan dana. Klik tombol di atas untuk mengajukan pencairan DP 50%.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '12.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px' }}>Tanggal</th>
                    <th style={{ padding: '12px' }}>Tipe Pencairan</th>
                    <th style={{ padding: '12px' }}>Nominal</th>
                    <th style={{ padding: '12px' }}>Bank Tujuan</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Catatan Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.payouts.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 12px', color: '#64748b' }}>
                        {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                            backgroundColor: p.status === 'APPROVED' ? '#dcfce7' : p.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                            color: p.status === 'APPROVED' ? '#16a34a' : p.status === 'REJECTED' ? '#dc2626' : '#d97706'
                          }}
                        >
                          {p.status === 'APPROVED' ? '✓ Berhasil Transfer' : p.status === 'REJECTED' ? '✕ Ditolak' : '⏳ Menunggu Transfer Admin'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', color: '#64748b', fontSize: '13px' }}>
                        {p.notes || '-'}
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
      {showRequestModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', maxWidth: '460px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            <div style={{ backgroundColor: '#e0f2fe', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <HelpCircle size={28} color="#0284c7" />
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', textAlign: 'center', margin: '0 0 8px 0' }}>
              Konfirmasi Pengajuan DP (50%)
            </h3>

            <p style={{ fontSize: '13.5px', color: '#64748b', textAlign: 'center', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Anda akan mengajukan pencairan Uang Muka DP 50% sebesar:
            </p>

            <div style={{ backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd', textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', color: '#0369a1', display: 'block', marginBottom: '2px' }}>Nominal Pencairan:</span>
              <strong style={{ fontSize: '22px', color: '#0284c7', fontWeight: '800' }}>
                {formatIDR(summary?.availableDp || 0)}
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
                style={{ padding: '12px', backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={handleCreatePayoutRequest}
                disabled={submitting}
                style={{ padding: '12px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }}
              >
                {submitting ? 'Mengirim...' : 'Ya, Ajukan Pencairan'}
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
