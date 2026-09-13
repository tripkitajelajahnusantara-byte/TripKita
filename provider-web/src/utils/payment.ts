export function getPaymentInvoiceUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (url.hostname !== 'xendit.co' && !url.hostname.endsWith('.xendit.co')) return null;
    return url.href;
  } catch { return null; }
}

export interface CustomerBooking {
  id: number;
  customerId?: number;
  bookingCode: string;
  customerName: string;
  packageId?: number;
  packageDetails?: { name: string; destination?: string };
  tripDate: string;
  guests: number;
  totalPrice: number;
  paymentUrl?: string;
  status: string;
  createdAt: string;
}

export function getBookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: 'Menunggu pembayaran',
    WAITING_CONFIRMATION: 'Menunggu konfirmasi pembayaran',
    PAID: 'Lunas', CONFIRMED: 'Dikonfirmasi', COMPLETED: 'Trip selesai',
    EXPIRED: 'Kedaluwarsa', CANCELLED_BY_CUSTOMER: 'Dibatalkan pelanggan',
    CANCELLED_BY_PROVIDER: 'Dibatalkan mitra',
    REFUND_REQUIRED: 'Menunggu pengembalian dana', REFUNDED: 'Dana dikembalikan',
  };
  return labels[status] || status || 'Status belum tersedia';
}

export const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(value);
