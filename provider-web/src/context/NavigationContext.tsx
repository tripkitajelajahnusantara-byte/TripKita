import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Route } from '../types';
import { request, setProviderToken, getProviderToken, removeProviderToken, setCustomerToken, getCustomerToken, removeCustomerToken, revokeSessionToken } from '../utils/api';


import { AuthModal } from '../components/AuthModal';

export function getRouteFromHash(): Route {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isMitraDomain = hostname.startsWith('mitra.') || hostname.startsWith('provider.') || hostname.includes('mitra-') || hostname.includes('provider-');

  if (!hash || hash === '#/' || hash === '#') {
    return isMitraDomain ? 'provider-login' : 'beranda';
  }
  
  if (hash.includes('/provider/dashboard') || hash.includes('#/dashboard')) return 'dashboard';
  if (hash.includes('/provider/kelola-paket')) return 'kelola-paket';
  if (hash.includes('/provider/booking')) return 'booking';
  if (hash.includes('/provider/keuangan')) return 'keuangan-provider';
  if (hash.includes('/provider/profil')) return 'profil-provider';
  if (hash.includes('/provider/tambah-paket')) return 'tambah-paket';
  if (hash.includes('/provider/login')) return 'provider-login';
  if (hash.includes('/provider/register')) return 'provider-register';
  if (hash.includes('/admin/dashboard')) return 'admin-dashboard';
  if (hash.includes('/admin/login')) return 'admin-login';
  
  if (hash.includes('/riwayat-booking')) return 'riwayat-booking';
  if (hash.includes('/cari-trip')) return 'cari-trip';
  if (hash.includes('/customer-checkout')) return 'customer-checkout';
  if (hash.includes('/customer-confirmation')) return 'customer-confirmation';
  if (hash.includes('/halaman-pembayaran')) return 'halaman-pembayaran';
  if (hash.includes('/paket-detail')) return 'paket-detail';
  if (hash.includes('/partner-landing')) return 'partner-landing';
  if (hash.includes('/tentang-kami')) return 'tentang-kami';
  if (hash.includes('/bantuan')) return 'bantuan';
  if (hash.includes('/provider-profile')) return 'provider-public-profile';
  if (hash.includes('/customer-register') || hash.includes('/daftar')) return 'customer-register';
  if (hash.includes('/masuk')) return 'masuk';
  if (hash.includes('/pengaturan')) return 'pengaturan';
  if (hash.includes('/rencana-trip')) return 'rencana-trip';

  return 'beranda';
}

export function getHashFromRoute(r: Route): string {
  switch (r) {
    case 'dashboard': return '#/provider/dashboard';
    case 'kelola-paket': return '#/provider/kelola-paket';
    case 'booking': return '#/provider/booking';
    case 'keuangan-provider': return '#/provider/keuangan';
    case 'profil-provider': return '#/provider/profil';
    case 'tambah-paket': return '#/provider/tambah-paket';
    case 'provider-login': return '#/provider/login';
    case 'provider-register': return '#/provider/register';
    case 'admin-dashboard': return '#/admin/dashboard';
    case 'admin-login': return '#/admin/login';
    
    case 'riwayat-booking': return '#/riwayat-booking';
    case 'cari-trip': return '#/cari-trip';
    case 'customer-checkout': return '#/customer-checkout';
    case 'customer-confirmation': return '#/customer-confirmation';
    case 'halaman-pembayaran': return '#/halaman-pembayaran';
    case 'paket-detail': return '#/paket-detail';
    case 'partner-landing': return '#/partner-landing';
    case 'tentang-kami': return '#/tentang-kami';
    case 'bantuan': return '#/bantuan';
    case 'provider-public-profile': return '#/provider-profile';
    case 'customer-register': return '#/customer-register';
    case 'daftar': return '#/customer-register';
    case 'masuk': return '#/masuk';
    case 'pengaturan': return '#/pengaturan';
    case 'rencana-trip': return '#/rencana-trip';
    default: return '#/';
  }
}


interface RegisterData {
  businessName: string;
  businessCategory: string;
  operationalProvince: string;
  operationalCity: string;
  description: string;
  documentUploaded: boolean;
  documentPath?: string;
  ktpPath?: string;
  nibPath?: string;
  npwpPath?: string;
  aktaPath?: string;
  sertifikatPath?: string;
  instagram?: string;
  tiktok?: string;
  picName: string;
  email: string;
  whatsapp: string;
  agreeToTerms: boolean;
  password?: string;
}

interface ProviderProfile {
  id: number;
  businessName: string;
  businessCategory: string;
  operationalProvince: string;
  operationalCity: string;
  description: string;
  documentUploaded: boolean;
  documentPath?: string;
  ktpPath?: string;
  nibPath?: string;
  npwpPath?: string;
  aktaPath?: string;
  sertifikatPath?: string;
  instagram?: string;
  tiktok?: string;
  picName: string;
  email: string;
  whatsapp: string;
  isVerified: boolean;
  role: 'ADMIN' | 'PROVIDER' | 'CUSTOMER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationNotes?: string;

  // New fields
  website?: string;
  gender?: string;
  birthDate?: string;
  wishlistData?: string;
  npwp?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  contactLastUpdatedAt?: string;

  pendingNpwp?: string;
  pendingBankName?: string;
  pendingBankAccount?: string;
  pendingBankAccountName?: string;
  legalVerificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  legalRejectionReason?: string;

  pendingKtpPath?: string;
  pendingNibPath?: string;
  pendingDocumentPath?: string;
  pendingNpwpPath?: string;
  pendingAktaPath?: string;
  pendingSertifikatPath?: string;

  ktpStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  nibStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  siupStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  npwpDocStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  aktaStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';
  sertifikatStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | '';

  ktpRejectionReason?: string;
  nibRejectionReason?: string;
  siupRejectionReason?: string;
  npwpDocRejectionReason?: string;
  aktaRejectionReason?: string;
  sertifikatRejectionReason?: string;
}

interface NavigationContextType {
  route: Route;
  navigateTo: (newRoute: Route) => void;
  registerStep: 1 | 2;
  setRegisterStep: (step: 1 | 2) => void;
  registerData: RegisterData;
  updateRegisterData: (fields: Partial<RegisterData>) => void;
  isRegistered: boolean;
  setIsRegistered: (registered: boolean) => void;
  customerProfile: ProviderProfile | null;
  setCustomerProfile: (profile: ProviderProfile | null) => void;
  providerProfile: ProviderProfile | null;
  setProviderProfile: (profile: ProviderProfile | null) => void;
  login: (email: string, password: string, options?: { redirect?: boolean }) => Promise<void>;
  registerProvider: () => Promise<void>;
  registerCustomer: (name: string, email: string, password: string, whatsapp: string, options?: { redirect?: boolean }) => Promise<void>;
  updateProfile: (fields: Partial<ProviderProfile>) => Promise<void>;
  logout: () => void;
  loadingProfile: boolean;
  editingPackageId: string | null;
  setEditingPackageId: (id: string | null) => void;
  selectedPackageForDetail: any;
  setSelectedPackageForDetail: (pkg: any) => void;
  selectedProviderId: number | null;
  setSelectedProviderId: (id: number | null) => void;
  selectedBookingForInvoice: any;
  setSelectedBookingForInvoice: (booking: any) => void;
  searchParams: { destination: string; date: string; type: string; category: string };
  setSearchParams: React.Dispatch<React.SetStateAction<{ destination: string; date: string; type: string; category: string }>>;
  bookingFormData: {
    packageId?: number | string;
    tripDate?: string;
    pemesan: { nama: string; email: string; whatsapp: string };
    peserta: Array<{ nama: string; hp: string; gender: string; tanggalLahir?: string; riwayatPenyakit?: string }>;
    selectedAddOns?: Array<{ id: string; name: string; price: number }>;
  } | null;
  setBookingFormData: React.Dispatch<React.SetStateAction<{
    packageId?: number | string;
    tripDate?: string;
    pemesan: { nama: string; email: string; whatsapp: string };
    peserta: Array<{ nama: string; hp: string; gender: string; tanggalLahir?: string; riwayatPenyakit?: string }>;
    selectedAddOns?: Array<{ id: string; name: string; price: number }>;
  } | null>>;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register', onSuccess?: () => void) => void;
  closeAuthModal: () => void;
  authSuccessCallback?: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<Route>(() => getRouteFromHash());
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [customerProfile, setCustomerProfile] = useState<ProviderProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [selectedPackageForDetail, setSelectedPackageForDetail] = useState<any>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<any>(null);

  const [searchParams, setSearchParams] = useState({
    destination: '',
    date: '',
    type: 'Semua Tipe',
    category: 'Semua Kategori'
  });

  const [bookingFormData, setBookingFormDataState] = useState<{
    packageId?: number | string;
    tripDate?: string;
    pemesan: { nama: string; email: string; whatsapp: string };
    peserta: Array<{ nama: string; hp: string; gender: string; tanggalLahir?: string; riwayatPenyakit?: string }>;
    selectedAddOns?: Array<{ id: string; name: string; price: number }>;
  } | null>(() => {
    try {
      const saved = sessionStorage.getItem('tripkita_booking_form_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setBookingFormData: React.Dispatch<React.SetStateAction<{
    packageId?: number | string;
    tripDate?: string;
    pemesan: { nama: string; email: string; whatsapp: string };
    peserta: Array<{ nama: string; hp: string; gender: string; tanggalLahir?: string; riwayatPenyakit?: string }>;
    selectedAddOns?: Array<{ id: string; name: string; price: number }>;
  } | null>> = (valueOrFn) => {
    setBookingFormDataState((prev) => {
      const next = typeof valueOrFn === 'function' ? (valueOrFn as any)(prev) : valueOrFn;
      try {
        if (next) {
          sessionStorage.setItem('tripkita_booking_form_data', JSON.stringify(next));
        } else {
          sessionStorage.removeItem('tripkita_booking_form_data');
        }
      } catch (e) {
        console.error('Failed to save to sessionStorage', e);
      }
      return next;
    });
  };

  const [registerData, setRegisterData] = useState<RegisterData>({
    businessName: '',
    businessCategory: '',
    operationalProvince: '',
    operationalCity: '',
    description: '',
    documentUploaded: false,
    documentPath: '',
    ktpPath: '',
    nibPath: '',
    npwpPath: '',
    aktaPath: '',
    sertifikatPath: '',
    instagram: '',
    tiktok: '',
    picName: '',
    email: '',
    whatsapp: '',
    agreeToTerms: false,
    password: '',
  });

  // Sync hash changes with internal route state
  const navigateTo = useCallback((newRoute: Route) => {
    setRoute(newRoute);
    const targetHash = getHashFromRoute(newRoute);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const targetRoute = getRouteFromHash();
      setRoute(targetRoute);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const fetchSessionProfile = async (targetRoute: Route) => {
    setLoadingProfile(true);
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const isProviderRoute = hash.includes('/provider') || hash.includes('/admin') ||
      ['dashboard', 'kelola-paket', 'booking', 'keuangan-provider', 'profil-provider', 'tambah-paket', 'admin-dashboard'].includes(targetRoute);

    try {
      if (isProviderRoute) {
        setCustomerProfile(null);
        const token = getProviderToken();
        if (token) {
          const data = await request('/provider/profile');
          if (data && (data.role === 'PROVIDER' || data.role === 'ADMIN')) {
            setProviderProfile(data);
            setIsRegistered(true);
            return data;
          }
        }
        setProviderProfile(null);
        setIsRegistered(false);
      } else {
        setProviderProfile(null);
        const token = getCustomerToken();
        if (token) {
          const data = await request('/provider/profile');
          if (data && data.role === 'CUSTOMER') {
            setCustomerProfile(data);
            setIsRegistered(true);
            if (data.wishlistData) {
              try {
                localStorage.setItem('tripkita_customer_wishlist', data.wishlistData);
                window.dispatchEvent(new CustomEvent('tripkita_wishlist_updated', { detail: JSON.parse(data.wishlistData) }));
              } catch (e) {
                console.error('Error parsing DB wishlistData:', e);
              }
            }
            return data;
          }
        }
        setCustomerProfile(null);
        setIsRegistered(false);
      }
      return null;
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      if (isProviderRoute) {
        setProviderProfile(null);
        removeProviderToken();
      } else {
        setCustomerProfile(null);
        removeCustomerToken();
      }
      setIsRegistered(false);
      return null;
    } finally {
      setLoadingProfile(false);
    }
  };

  const redirectAfterAuth = useCallback((profile: Pick<ProviderProfile, 'role' | 'status' | 'isVerified'>, defaultRoute: Route) => {
    const returnHash = sessionStorage.getItem('tementrip_auth_return_to');
    sessionStorage.removeItem('tementrip_auth_return_to');

    // Tujuan harus route internal dan harus sesuai area role pengguna.
    if (returnHash?.startsWith('#/') && !returnHash.startsWith('#//')) {
      const isProviderDestination = returnHash.startsWith('#/provider/');
      const isAdminDestination = returnHash.startsWith('#/admin/');
      const providerIsOperational = profile.status === 'APPROVED' && profile.isVerified;
      const roleMayOpenDestination = profile.role === 'CUSTOMER'
        ? !isProviderDestination && !isAdminDestination
        : profile.role === 'ADMIN'
          ? isProviderDestination || isAdminDestination
          : isProviderDestination && !isAdminDestination
            && (providerIsOperational || returnHash.startsWith('#/provider/profil'));

      if (roleMayOpenDestination) {
        window.location.hash = returnHash;
        setRoute(getRouteFromHash());
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    navigateTo(defaultRoute);
  }, [navigateTo]);

  useEffect(() => {
	const params = new URLSearchParams(window.location.search);
	const oauthCode = params.get('oauth_code');
	const routeParam = params.get('route');

	if (oauthCode) {
	  window.history.replaceState({}, document.title, window.location.pathname);
	  request('/public/auth/google/exchange', {
		method: 'POST',
		body: JSON.stringify({ code: oauthCode })
	  }).then((result) => {
		const data = result.provider;
		const token = result.token;
		if (!data || !token) throw new Error('OAuth exchange response tidak valid');
		if (data?.role === 'CUSTOMER') {
          setCustomerToken(token);
          setCustomerProfile(data);
          setProviderProfile(null);
          setIsRegistered(true);
          redirectAfterAuth(data, 'beranda');
		} else {
          setProviderToken(token);
          setProviderProfile(data);
          setCustomerProfile(null);
          setIsRegistered(true);
          if (data.role === 'ADMIN') redirectAfterAuth(data, 'admin-dashboard');
          else if (data.status !== 'APPROVED' || !data.isVerified || routeParam === 'profil-provider') redirectAfterAuth(data, 'profil-provider');
          else redirectAfterAuth(data, 'dashboard');
        }
	  }).catch((err) => {
		console.error('Token verification failed:', err);
		fetchSessionProfile(route);
	  });
    } else {
      fetchSessionProfile(route);
    }
  }, [route, navigateTo, redirectAfterAuth]);

  const updateRegisterData = (fields: Partial<RegisterData>) => {
    setRegisterData((prev) => ({ ...prev, ...fields }));
  };

  const login = async (email: string, password: string, options: { redirect?: boolean } = {}) => {
    const res = await request('/public/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.provider?.role === 'CUSTOMER') {
      setCustomerToken(res.token);
      setCustomerProfile(res.provider);
      setProviderProfile(null);
      setIsRegistered(true);
      if (options.redirect !== false) redirectAfterAuth(res.provider, 'beranda');
    } else {
      setProviderToken(res.token);
      setProviderProfile(res.provider);
      setCustomerProfile(null);
      setIsRegistered(true);
      if (res.provider?.role === 'ADMIN') {
        redirectAfterAuth(res.provider, 'admin-dashboard');
      } else if (res.provider?.status !== 'APPROVED' || !res.provider?.isVerified) {
        redirectAfterAuth(res.provider, 'profil-provider');
      } else {
        redirectAfterAuth(res.provider, 'dashboard');
      }
    }
  };

  const registerCustomer = async (name: string, email: string, password: string, whatsapp: string, options: { redirect?: boolean } = {}) => {
    const res = await request('/public/auth/register-customer', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, whatsapp }),
    });

    if (res && res.token && (res.customer || res.provider)) {
      const profile = res.customer || res.provider;
      setCustomerToken(res.token);
      setCustomerProfile(profile);
      setProviderProfile(null);
      setIsRegistered(true);
      if (options.redirect !== false) redirectAfterAuth(profile, 'beranda');
    }
  };

  const registerProvider = async () => {
    await request('/public/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        businessName: registerData.businessName,
        businessCategory: registerData.businessCategory,
        operationalProvince: registerData.operationalProvince,
        operationalCity: registerData.operationalCity,
        description: registerData.description,
        documentUploaded: registerData.documentUploaded,
        documentPath: registerData.documentPath,
        ktpPath: registerData.ktpPath,
        nibPath: registerData.nibPath,
        npwpPath: registerData.npwpPath,
        aktaPath: registerData.aktaPath,
        sertifikatPath: registerData.sertifikatPath,
        instagram: registerData.instagram,
        tiktok: registerData.tiktok,
        picName: registerData.picName,
        email: registerData.email,
        whatsapp: registerData.whatsapp,
        password: registerData.password,
      }),
    });
  };

  const updateProfile = async (fields: Partial<ProviderProfile>) => {
    const updated = await request('/provider/profile', {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
    if (updated?.role === 'CUSTOMER') {
      setCustomerProfile(updated);
    } else {
      setProviderProfile(updated);
    }
  };

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const performLogout = () => {
    const destination: Route = providerProfile ? 'provider-login' : 'beranda';
    const activeTokens = [getProviderToken(), getCustomerToken()].filter((token): token is string => Boolean(token));
    removeProviderToken();
    removeCustomerToken();
    void Promise.allSettled([...new Set(activeTokens)].map(revokeSessionToken));
    setIsRegistered(false);
    setProviderProfile(null);
    setCustomerProfile(null);
    setRegisterStep(1);
    setRegisterData({
      businessName: '',
      businessCategory: '',
      operationalProvince: '',
      operationalCity: '',
      description: '',
      documentUploaded: false,
      documentPath: '',
      ktpPath: '',
      nibPath: '',
      npwpPath: '',
      aktaPath: '',
      sertifikatPath: '',
      instagram: '',
      tiktok: '',
      picName: '',
      email: '',
      whatsapp: '',
      agreeToTerms: false,
      password: '',
    });
    sessionStorage.removeItem('tementrip_auth_return_to');
    setIsLogoutConfirmOpen(false);
    navigateTo(destination);
  };

  const logout = () => setIsLogoutConfirmOpen(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authSuccessCallback, setAuthSuccessCallback] = useState<(() => void) | undefined>(undefined);

  const openAuthModal = (mode: 'login' | 'register' = 'login', onSuccess?: () => void) => {
    setAuthModalMode(mode);
    if (onSuccess) {
      setAuthSuccessCallback(() => onSuccess);
    } else {
      setAuthSuccessCallback(undefined);
    }
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <NavigationContext.Provider
      value={{
        route,
        navigateTo,
        registerStep,
        setRegisterStep,
        registerData,
        updateRegisterData,
        isRegistered,
        setIsRegistered,
        providerProfile,
        setProviderProfile,
        customerProfile,
        setCustomerProfile,
        login,
        registerProvider,
        registerCustomer,
        updateProfile,
        logout,
        loadingProfile,
        editingPackageId,
        setEditingPackageId,
        selectedPackageForDetail,
        setSelectedPackageForDetail,
        selectedProviderId,
        setSelectedProviderId,
        selectedBookingForInvoice,
        setSelectedBookingForInvoice,
        searchParams,
        setSearchParams,
        bookingFormData,
        setBookingFormData,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        authSuccessCallback,
      }}
    >
      {children}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
        onSuccess={authSuccessCallback}
      />
      {isLogoutConfirmOpen && (
        <div
          role="presentation"
          onClick={() => setIsLogoutConfirmOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', background: 'rgba(15, 23, 42, 0.62)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            aria-describedby="logout-confirm-description"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%', maxWidth: '420px', padding: '28px',
              borderRadius: '18px', background: '#ffffff',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.24)', textAlign: 'center'
            }}
          >
            <div style={{
              width: '52px', height: '52px', margin: '0 auto 16px',
              borderRadius: '50%', display: 'grid', placeItems: 'center',
              background: '#fee2e2', color: '#dc2626', fontSize: '24px', fontWeight: 800
            }}>
              !
            </div>
            <h2 id="logout-confirm-title" style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '21px' }}>
              Keluar dari akun?
            </h2>
            <p id="logout-confirm-description" style={{ margin: '0 0 24px', color: '#64748b', lineHeight: 1.6, fontSize: '14px' }}>
              Sesi Anda akan diakhiri. Anda perlu masuk kembali untuk mengakses akun.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                autoFocus
                onClick={() => setIsLogoutConfirmOpen(false)}
                style={{
                  flex: 1, padding: '11px 16px', borderRadius: '10px',
                  border: '1px solid #cbd5e1', background: '#ffffff',
                  color: '#334155', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={performLogout}
                style={{
                  flex: 1, padding: '11px 16px', borderRadius: '10px',
                  border: 'none', background: '#dc2626',
                  color: '#ffffff', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

