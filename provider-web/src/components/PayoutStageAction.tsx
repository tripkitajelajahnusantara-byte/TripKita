import { ArrowUpRight, CheckCircle2, Clock3, Lock } from 'lucide-react';

export interface PayoutStage {
  amount: number;
  remaining: number;
  status: 'AVAILABLE' | 'LOCKED' | 'REQUESTED' | 'PAID' | 'NONE';
  availableAt?: string;
  blockedReason?: string;
  proofPath?: string;
}

interface Props {
  stage: PayoutStage; type: 'DP_50' | 'PELUNASAN_50'; bookingId: number;
  bankConfigured: boolean; availableBalance: number; busy: boolean;
  onRequest: () => void; onBankSettings: () => void; onViewProof: (path: string) => void;
}

export function PayoutStageAction({ stage, type, bookingId, bankConfigured, availableBalance, busy, onRequest, onBankSettings, onViewProof }: Props) {
  const dp = type === 'DP_50';
  const formatIDR = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  const eligibleDate = stage.availableAt ? new Date(stage.availableAt) : null;
  const eligibleLabel = eligibleDate && Number.isFinite(eligibleDate.getTime())
    ? new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(eligibleDate) + ' WIB'
    : '';
  const enabled = stage.status === 'AVAILABLE' && stage.remaining > 0 && bankConfigured && availableBalance >= stage.remaining && !busy;
  let message: string;
  switch (stage.status) {
    case 'LOCKED': message = eligibleLabel ? (dp ? `Tersedia mulai ${eligibleLabel} (H-3).` : `Tersedia setelah ${eligibleLabel}.`) : stage.blockedReason || 'Jadwal pencairan belum tersedia.'; break;
    case 'REQUESTED': message = 'Pengajuan sedang diproses admin.'; break;
    case 'PAID': message = 'Dana sudah dicairkan.'; break;
    case 'NONE': message = 'Tidak ada saldo untuk tahap ini.'; break;
    default:
      message = !bankConfigured ? 'Lengkapi rekening bank tujuan terlebih dahulu.' : availableBalance < stage.remaining ? 'Saldo tersedia belum cukup setelah penyesuaian refund atau pengajuan lain.' : busy ? 'Pengajuan sedang dikirim.' : 'Siap diajukan ke admin.';
  }
  const descriptionId = `payout-${bookingId}-${type}-reason`;
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, maxWidth: 260 }}>
    <strong style={{ color: '#0f172a' }}>{formatIDR(stage.amount)}</strong>
    <button type="button" disabled={!enabled} aria-describedby={descriptionId} title={message} onClick={() => { if (enabled) onRequest(); }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', backgroundColor: enabled ? (dp ? '#0284c7' : '#15803d') : '#e2e8f0', color: enabled ? '#fff' : '#475569', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: enabled ? 'pointer' : 'not-allowed' }}>
      {enabled ? <ArrowUpRight size={14} /> : stage.status === 'PAID' ? <CheckCircle2 size={14} /> : stage.status === 'REQUESTED' ? <Clock3 size={14} /> : <Lock size={14} />}
      {dp ? 'Cairkan DP' : 'Cairkan Pelunasan'}
    </button>
    <span id={descriptionId} style={{ fontSize: 12, lineHeight: 1.5, color: stage.status === 'PAID' ? '#15803d' : '#64748b' }}>{message}</span>
    {stage.status === 'AVAILABLE' && stage.remaining !== stage.amount && <small style={{ color: '#64748b' }}>Sisa pencairan: {formatIDR(stage.remaining)}</small>}
    {stage.status === 'AVAILABLE' && !bankConfigured && <button type="button" onClick={onBankSettings} style={{ border: 0, padding: 0, background: 'none', color: '#0284c7', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Lengkapi rekening</button>}
    {stage.status === 'PAID' && stage.proofPath && <button type="button" onClick={() => onViewProof(stage.proofPath!)} style={{ border: 0, padding: 0, background: 'none', color: '#0284c7', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Lihat bukti transfer</button>}
  </div>;
}
