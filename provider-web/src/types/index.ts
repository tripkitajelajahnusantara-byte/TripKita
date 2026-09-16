export type Route = 
  | 'beranda' 
  | 'tentang-kami' 
  | 'bantuan' 
  | 'daftar' 
  | 'masuk'
  | 'dashboard' 
  | 'kelola-paket' 
  | 'booking' 
  | 'profil-provider' 
  | 'tambah-paket'
  | 'admin-dashboard'
  | 'paket-detail'
  | 'customer-checkout'
  | 'riwayat-booking'
  | 'customer-register'
  | 'provider-login'
  | 'provider-register'
  | 'partner-landing'
  | 'cari-trip'
  | 'keuangan-provider'
  | 'customer-confirmation'
  | 'halaman-pembayaran'
  | 'provider-public-profile'
  | 'admin-login'
  | 'pengaturan';

export interface Booking {
  id: string;
  dbId?: number;
  customerId?: number;
  bookingCode?: string;
  customerName: string;
  customerInitial: string;
  customerEmail?: string;
  customerPhone?: string;
  package: string;
  tripDate: string;
  guests: number;
  totalPrice: string;
  dpAmount?: string;
  paymentMethod?: string;
  paymentUrl?: string;
  rawEndDate?: string;
  status: 'PENDING_PAYMENT' | 'WAITING_CONFIRMATION' | 'PAID' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED_BY_CUSTOMER' | 'CANCELLED_BY_PROVIDER' | 'REFUND_REQUIRED' | 'REFUNDED' | 'RESCHEDULE_OFFERED';
}

export interface PopularPackage {
  name: string;
  location: string;
  rating: number;
  bookings: number;
}

export interface PackageItem {
  id: string;
  name: string;
  destination: string;
  price: string;
  quota: string;
  schedule: string;
  status: 'Aktif' | 'Draft' | 'Nonaktif';
  rating?: number;
}
