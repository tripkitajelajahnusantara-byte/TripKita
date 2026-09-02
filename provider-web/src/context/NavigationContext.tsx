import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Route } from '../types';
import { request, setAuthToken, removeAuthToken, getAuthToken } from '../utils/api';

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
  providerProfile: ProviderProfile | null;
  setProviderProfile: (profile: ProviderProfile | null) => void;
  login: (email: string, password: string) => Promise<void>;
  registerProvider: () => Promise<void>;
  registerCustomer: (name: string, email: string, password: string, whatsapp: string) => Promise<void>;
  updateProfile: (fields: Partial<ProviderProfile>) => Promise<void>;
  logout: () => void;
  loadingProfile: boolean;
  editingPackageId: string | null;
  setEditingPackageId: (id: string | null) => void;
  selectedPackageForDetail: any;
  setSelectedPackageForDetail: (pkg: any) => void;
  selectedBookingForInvoice: any;
  setSelectedBookingForInvoice: (booking: any) => void;
  searchParams: { destination: string; date: string; type: string; category: string };
  setSearchParams: React.Dispatch<React.SetStateAction<{ destination: string; date: string; type: string; category: string }>>;
  bookingFormData: {
    pemesan: { nama: string; email: string; whatsapp: string };
    peserta: Array<{ nama: string; hp: string; gender: string; tanggalLahir?: string; riwayatPenyakit?: string }>;
    selectedAddOns?: Array<{ id: string; name: string; price: number }>;
  } | null;
  setBookingFormData: React.Dispatch<React.SetStateAction<{
    pemesan: { nama: string; email: string; whatsapp: string };
    peserta: Array<{ nama: string; hp: string; gender: string; tanggalLahir?: string; riwayatPenyakit?: string }>;
    selectedAddOns?: Array<{ id: string; name: string; price: number }>;
  } | null>>;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<Route>('beranda');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [isRegistered, setIsRegistered] = useState<boolean>(!!getAuthToken());
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [selectedPackageForDetail, setSelectedPackageForDetail] = useState<any>(null);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<any>(null);
  const [searchParams, setSearchParams] = useState({
    destination: '',
    date: '',
    type: 'Semua Tipe',
    category: 'Semua Kategori'
  });
  const [bookingFormData, setBookingFormData] = useState<{
    pemesan: { nama: string; email: string; whatsapp: string };
    peserta: Array<{ nama: string; hp: string; gender: string }>;
    selectedAddOns?: Array<{ id: string; name: string; price: number }>;
  } | null>(null);
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

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const data = await request('/provider/profile');
      setProviderProfile(data);
      setIsRegistered(true);
      return data;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      logout();
      return null;
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setAuthToken(token);
      // Clean query parameters from URL bar
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchProfile().then((profile) => {
        if (profile?.role === 'CUSTOMER') {
          navigateTo('beranda');
        } else {
          navigateTo('dashboard');
        }
      });
    } else if (getAuthToken()) {
      fetchProfile();
    }
  }, []);

  const navigateTo = (newRoute: Route) => {
    setRoute(newRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateRegisterData = (fields: Partial<RegisterData>) => {
    setRegisterData((prev) => ({ ...prev, ...fields }));
  };

  const login = async (email: string, password: string) => {
    const res = await request('/public/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    setProviderProfile(res.provider);
    setIsRegistered(true);
    if (res.provider.role === 'ADMIN') {
      navigateTo('admin-dashboard');
    } else if (res.provider.role === 'PROVIDER') {
      navigateTo('dashboard');
    } else {
      navigateTo('beranda');
    }
  };

  const registerCustomer = async (name: string, email: string, password: string, whatsapp: string) => {
    await request('/public/auth/register-customer', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, whatsapp }),
    });
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
    setProviderProfile(updated);
  };

  const logout = () => {
    removeAuthToken();
    setIsRegistered(false);
    setProviderProfile(null);
    setRoute('beranda');
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
        selectedBookingForInvoice,
        setSelectedBookingForInvoice,
        searchParams,
        setSearchParams,
        bookingFormData,
        setBookingFormData,
      }}
    >
      {children}
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

