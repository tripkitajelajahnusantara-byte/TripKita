import { useEffect, useState } from 'react';
import { request } from './api';

export interface CheckoutConfig {
  serviceFee: number;
  paymentWindowSeconds: number;
  adminReviewWindowSeconds: number;
  manualPayment: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  cancellationRefundDays: number;
}

// Konfigurasi checkout (biaya layanan & batas waktu pembayaran) bersumber dari backend.
// Tidak ada angka cadangan: pemanggil wajib menangani kegagalan secara eksplisit.
export async function fetchCheckoutConfig(): Promise<CheckoutConfig> {
  const data = await request('/public/checkout-config');
  const serviceFee = Number(data?.serviceFee);
  const paymentWindowSeconds = Number(data?.paymentWindowSeconds);
  const adminReviewWindowSeconds = Number(data?.adminReviewWindowSeconds);
  const cancellationRefundDays = Number(data?.cancellationRefundDays);
  const manualPayment = {
    bankName: String(data?.manualPayment?.bankName || '').trim(),
    accountNumber: String(data?.manualPayment?.accountNumber || '').trim(),
    accountHolder: String(data?.manualPayment?.accountHolder || '').trim(),
  };
  if (!Number.isFinite(serviceFee) || serviceFee < 0 || !Number.isFinite(paymentWindowSeconds) || paymentWindowSeconds <= 0 || !Number.isFinite(adminReviewWindowSeconds) || adminReviewWindowSeconds <= 0 || !Number.isInteger(cancellationRefundDays) || cancellationRefundDays <= 0) {
    throw new Error('Konfigurasi checkout dari server tidak valid.');
  }
  return { serviceFee, paymentWindowSeconds, adminReviewWindowSeconds, manualPayment, cancellationRefundDays };
}

// Satu permintaan dibagi semua komponen yang hanya butuh angka kebijakan.
let sharedConfigPromise: Promise<CheckoutConfig> | null = null;
function getSharedCheckoutConfig(): Promise<CheckoutConfig> {
  if (!sharedConfigPromise) {
    sharedConfigPromise = fetchCheckoutConfig().catch((err) => {
      sharedConfigPromise = null;
      throw err;
    });
  }
  return sharedConfigPromise;
}

/** Batas hari pembatalan untuk refund penuh dari backend; null selama/ bila gagal dimuat. */
export function useCancellationRefundDays(): number | null {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    getSharedCheckoutConfig()
      .then((cfg) => { if (active) setDays(cfg.cancellationRefundDays); })
      .catch(() => { /* teks memakai kalimat umum */ });
    return () => { active = false; };
  }, []);
  return days;
}
