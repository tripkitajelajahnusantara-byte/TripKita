import { request } from './api';

export interface CheckoutConfig {
  serviceFee: number;
  paymentWindowSeconds: number;
}

// Konfigurasi checkout (biaya layanan & batas waktu pembayaran) bersumber dari backend.
// Tidak ada angka cadangan: pemanggil wajib menangani kegagalan secara eksplisit.
export async function fetchCheckoutConfig(): Promise<CheckoutConfig> {
  const data = await request('/public/checkout-config');
  const serviceFee = Number(data?.serviceFee);
  const paymentWindowSeconds = Number(data?.paymentWindowSeconds);
  if (!Number.isFinite(serviceFee) || serviceFee < 0 || !Number.isFinite(paymentWindowSeconds) || paymentWindowSeconds <= 0) {
    throw new Error('Konfigurasi checkout dari server tidak valid.');
  }
  return { serviceFee, paymentWindowSeconds };
}
