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
  | 'xendit-checkout'
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
  package: string;
  tripDate: string;
  guests: number;
  totalPrice: string;
  dpAmount?: string;
  paymentMethod?: string;
  paymentUrl?: string;
  status: 'PENDING_PAYMENT' | 'WAITING_CONFIRMATION' | 'PAID' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED_BY_CUSTOMER' | 'CANCELLED_BY_PROVIDER' | 'REFUND_REQUIRED' | 'REFUNDED';
}

export interface PopularPackage {
  name: string;
  location: string;
  rating: number;
  bookings: number;
}

export interface PackageItem {
  image?: string;
  id: string;
  name: string;
  destination: string;
  price: string;
  quota: string;
  schedule: string;
  status: 'Aktif' | 'Draft' | 'Nonaktif';
  rating?: number;
}

export interface PublicPackage {
  id: number;
  providerId: number;
  name: string;
  destination: string;
  meetingPoint: string;
  category: string;
  tripType: string;
  price: number;
  quotaMin: number;
  quotaUsed: number;
  quotaMax: number;
  startDate: string;
  endDate: string;
  schedule: string;
  status: string;
  rating: number;
  description: string;
  includedFacilities: string;
  excludedFacilities: string;
  itinerary: string;
  image: string;
  images: string;
}

export interface PackageReview {
  id: number;
  bookingId: number;
  customerId: number;
  packageId: number;
  rating: number;
  comment: string;
  createdAt: string;
}
