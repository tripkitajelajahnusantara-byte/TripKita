import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LegalModalContainer, CustomerRegistrationTermsContent } from './components/LegalModals';
import { getCustomerToken, getProviderToken } from './utils/api';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageSkeleton } from './components/Skeleton';

// Setiap halaman dimuat sebagai chunk terpisah supaya kunjungan pertama tidak
// perlu mengunduh seluruh aplikasi sekaligus. Loader disimpan terpisah agar
// chunk dapat diunduh lebih dulu saat browser senggang (lihat usePrefetchPages).
const pageLoaders = {
  AboutPage: () => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })),
  CustomerHelpPage: () => import('./pages/CustomerHelpPage').then((m) => ({ default: m.CustomerHelpPage })),
  RegisterPage: () => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
  LoginPage: () => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
  DashboardPage: () => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
  KelolaPaketPage: () => import('./pages/KelolaPaketPage').then((m) => ({ default: m.KelolaPaketPage })),
  ManageBookingPage: () => import('./pages/ManageBookingPage').then((m) => ({ default: m.ManageBookingPage })),
  ProfileProviderPage: () => import('./pages/ProfileProviderPage').then((m) => ({ default: m.ProfileProviderPage })),
  AddPackagePage: () => import('./pages/AddPackagePage').then((m) => ({ default: m.AddPackagePage })),
  AdminDashboardPage: () => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
  CustomerLandingPage: () => import('./pages/CustomerLandingPage').then((m) => ({ default: m.CustomerLandingPage })),
  CustomerPackageDetailPage: () => import('./pages/CustomerPackageDetailPage').then((m) => ({ default: m.CustomerPackageDetailPage })),
  CustomerBookingPage: () => import('./pages/CustomerBookingPage').then((m) => ({ default: m.CustomerBookingPage })),
  CustomerHistoryPage: () => import('./pages/CustomerHistoryPage').then((m) => ({ default: m.CustomerHistoryPage })),
  CustomerRegisterPage: () => import('./pages/CustomerRegisterPage').then((m) => ({ default: m.CustomerRegisterPage })),
  CustomerLoginPage: () => import('./pages/CustomerLoginPage').then((m) => ({ default: m.CustomerLoginPage })),
  ProviderLandingPage: () => import('./pages/ProviderLandingPage').then((m) => ({ default: m.ProviderLandingPage })),
  CustomerSearchPage: () => import('./pages/CustomerSearchPage').then((m) => ({ default: m.CustomerSearchPage })),
  CustomerConfirmationPage: () => import('./pages/CustomerConfirmationPage').then((m) => ({ default: m.CustomerConfirmationPage })),
  CustomerPaymentInvoicePage: () => import('./pages/CustomerPaymentInvoicePage').then((m) => ({ default: m.CustomerPaymentInvoicePage })),
  ProviderFinancePage: () => import('./pages/ProviderFinancePage').then((m) => ({ default: m.ProviderFinancePage })),
  ProviderPublicProfilePage: () => import('./pages/ProviderPublicProfilePage').then((m) => ({ default: m.ProviderPublicProfilePage })),
  CustomerSettingsPage: () => import('./pages/CustomerSettingsPage').then((m) => ({ default: m.CustomerSettingsPage })),
  CustomerTripPlannerPage: () => import('./pages/CustomerTripPlannerPage').then((m) => ({ default: m.CustomerTripPlannerPage })),
} satisfies Record<string, () => Promise<{ default: React.ComponentType }>>;

type PageName = keyof typeof pageLoaders;
const DASHBOARD_PAGES: PageName[] = ['DashboardPage', 'KelolaPaketPage', 'ManageBookingPage', 'ProfileProviderPage', 'AddPackagePage', 'AdminDashboardPage', 'ProviderFinancePage'];
const CUSTOMER_PAGES = (Object.keys(pageLoaders) as PageName[]).filter((name) => !DASHBOARD_PAGES.includes(name));

// Mengunduh chunk halaman di area yang sedang dipakai ketika browser senggang,
// sehingga klik menu berikutnya langsung terbuka tanpa menunggu jaringan.
function usePrefetchPages(isDashboardArea: boolean) {
  React.useEffect(() => {
    const names = isDashboardArea ? DASHBOARD_PAGES : CUSTOMER_PAGES;
    let cancelled = false;
    const run = async () => {
      for (const name of names) {
        if (cancelled) return;
        // Kegagalan prefetch diabaikan; halaman tetap dimuat normal saat dibuka.
        await pageLoaders[name]().catch(() => undefined);
      }
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => { void run(); });
    return () => {
      cancelled = true;
      cancelIdle(handle);
    };
  }, [isDashboardArea]);
}
const AboutPage = React.lazy(pageLoaders.AboutPage);
const CustomerHelpPage = React.lazy(pageLoaders.CustomerHelpPage);
const RegisterPage = React.lazy(pageLoaders.RegisterPage);
const LoginPage = React.lazy(pageLoaders.LoginPage);
const DashboardPage = React.lazy(pageLoaders.DashboardPage);
const KelolaPaketPage = React.lazy(pageLoaders.KelolaPaketPage);
const ManageBookingPage = React.lazy(pageLoaders.ManageBookingPage);
const ProfileProviderPage = React.lazy(pageLoaders.ProfileProviderPage);
const AddPackagePage = React.lazy(pageLoaders.AddPackagePage);
const AdminDashboardPage = React.lazy(pageLoaders.AdminDashboardPage);
const CustomerLandingPage = React.lazy(pageLoaders.CustomerLandingPage);
const CustomerPackageDetailPage = React.lazy(pageLoaders.CustomerPackageDetailPage);
const CustomerBookingPage = React.lazy(pageLoaders.CustomerBookingPage);
const CustomerHistoryPage = React.lazy(pageLoaders.CustomerHistoryPage);
const CustomerRegisterPage = React.lazy(pageLoaders.CustomerRegisterPage);
const CustomerLoginPage = React.lazy(pageLoaders.CustomerLoginPage);
const ProviderLandingPage = React.lazy(pageLoaders.ProviderLandingPage);
const CustomerSearchPage = React.lazy(pageLoaders.CustomerSearchPage);
const CustomerConfirmationPage = React.lazy(pageLoaders.CustomerConfirmationPage);
const CustomerPaymentInvoicePage = React.lazy(pageLoaders.CustomerPaymentInvoicePage);
const ProviderFinancePage = React.lazy(pageLoaders.ProviderFinancePage);
const ProviderPublicProfilePage = React.lazy(pageLoaders.ProviderPublicProfilePage);
const CustomerSettingsPage = React.lazy(pageLoaders.CustomerSettingsPage);
const CustomerTripPlannerPage = React.lazy(pageLoaders.CustomerTripPlannerPage);

const AppContent: React.FC = () => {
  const { route, loadingProfile, providerProfile, customerProfile, navigateTo } = useNavigation();
  const [showGlobalCustomerTerms, setShowGlobalCustomerTerms] = React.useState(false);
  usePrefetchPages(!!providerProfile || ['dashboard', 'kelola-paket', 'booking', 'keuangan-provider', 'profil-provider', 'tambah-paket', 'admin-dashboard'].includes(route));

  React.useEffect(() => {
    if (customerProfile && customerProfile.role === 'CUSTOMER') {
      const accepted = localStorage.getItem(`tementrip_customer_terms_accepted_${customerProfile.id}`);
      if (!accepted) {
        setShowGlobalCustomerTerms(true);
      } else {
        setShowGlobalCustomerTerms(false);
      }
    } else {
      setShowGlobalCustomerTerms(false);
    }
  }, [customerProfile]);

  React.useEffect(() => {
    const privateProviderRoutes = [
      'dashboard',
      'kelola-paket',
      'booking',
      'keuangan-provider',
      'profil-provider',
      'tambah-paket',
      'admin-dashboard'
    ];

    if (loadingProfile) return;

    if (privateProviderRoutes.includes(route)) {
      const hasProviderToken = typeof window !== 'undefined' && getProviderToken();
      if (!hasProviderToken) {
        rememberReturnTo();
        navigateTo('provider-login');
        return;
      }
      if (providerProfile) {
        if (providerProfile.role === 'ADMIN' && route !== 'admin-dashboard') {
          navigateTo('admin-dashboard');
          return;
        }
        if (providerProfile.role === 'PROVIDER') {
          if (route === 'admin-dashboard') {
            navigateTo('dashboard');
            return;
          }
          // Akun mitra baru berstatus PENDING sampai admin menyetujuinya, dan
          // backend menolak seluruh endpoint operasional selama itu. Tanpa
          // penjagaan ini halaman dashboard tetap terbuka tetapi setiap
          // permintaannya gagal tanpa penjelasan, sehingga alur persetujuan
          // admin terlihat seolah tidak berjalan.
          const isOperational = providerProfile.status === 'APPROVED' && providerProfile.isVerified;
          if (!isOperational && route !== 'profil-provider') {
            navigateTo('profil-provider');
          }
        }
      }
    }

    // 'riwayat-booking' sengaja publik: tamu melacak pesanan dengan kode booking.
    const privateCustomerRoutes = ['pengaturan', 'rencana-trip'];
    if (privateCustomerRoutes.includes(route)) {
      const hasCustomerToken = typeof window !== 'undefined' && getCustomerToken();
      if (!hasCustomerToken || !customerProfile) {
        rememberReturnTo();
        navigateTo('masuk');
      }
    }
  }, [route, loadingProfile, providerProfile, customerProfile, navigateTo]);

  if (loadingProfile) {
    return <PageSkeleton fullScreen />;
  }

  // Mandatory Terms Modal Overlay for Google OAuth / First Time Customer Login
  const renderGlobalTermsModal = () => (
    <LegalModalContainer
      isOpen={showGlobalCustomerTerms}
      onClose={() => {}}
      title="Persetujuan Syarat & Ketentuan Customer TemenTrip"
      hideCloseButton={true}
    >
      <div>
        <div style={{ backgroundColor: '#e0f2fe', padding: '12px 16px', borderRadius: '10px', color: '#0369a1', fontSize: '13px', fontWeight: '600', marginBottom: '16px', border: '1px solid #bae6fd' }}>
          Selamat datang di TemenTrip! Sebelum melanjutkan, harap baca dan menyetujui Syarat & Ketentuan Pendaftaran Customer berikut.
        </div>
        <CustomerRegistrationTermsContent />
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => {
              if (customerProfile?.id) {
                localStorage.setItem(`tementrip_customer_terms_accepted_${customerProfile.id}`, 'true');
              }
              setShowGlobalCustomerTerms(false);
            }}
            style={{
              padding: '12px 32px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}
          >
            Saya Menyetujui Syarat & Ketentuan & Lanjutkan
          </button>
        </div>
      </div>
    </LegalModalContainer>
  );

  // Dashboard layout routes (render without standard layout since they have their own sidebar/main structure)
  if (route === 'dashboard') {
    return <DashboardPage />;
  }
  if (route === 'admin-dashboard') {
    return <AdminDashboardPage />;
  }
  if (route === 'kelola-paket') {
    return <KelolaPaketPage />;
  }
  if (route === 'booking') {
    return <ManageBookingPage />;
  }
  if (route === 'profil-provider') {
    return <ProfileProviderPage />;
  }
  if (route === 'keuangan-provider') {
    return <ProviderFinancePage />;
  }
  if (route === 'tambah-paket') {
    return <AddPackagePage />;
  }

  // Customer pages that render in standard layout with Header and Footer
  if (route === 'paket-detail') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerPackageDetailPage />
        <Footer />
        {renderGlobalTermsModal()}
      </div>
    );
  }
  if (route === 'provider-public-profile') {
    return (
      <div className="app-wrapper">
        <Header />
        <ProviderPublicProfilePage />
        <Footer />
        {renderGlobalTermsModal()}
      </div>
    );
  }
  if (route === 'customer-checkout') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerBookingPage />
        <Footer />
        {renderGlobalTermsModal()}
      </div>
    );
  }
  if (route === 'customer-confirmation') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerConfirmationPage />
        <Footer />
        {renderGlobalTermsModal()}
      </div>
    );
  }
  if (route === 'halaman-pembayaran') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerPaymentInvoicePage />
        <Footer />
        {renderGlobalTermsModal()}
      </div>
    );
  }
  if (route === 'riwayat-booking') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerHistoryPage />
        <Footer />
        {renderGlobalTermsModal()}
      </div>
    );
  }

  // Auth pages
  if (route === 'masuk') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerLoginPage />
        <Footer />
        {renderGlobalTermsModal()}
      </div>
    );
  }
  if (route === 'customer-register' || route === 'daftar') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerRegisterPage />
        <Footer />
        {renderGlobalTermsModal()}
      </div>
    );
  }
  if (route === 'provider-login' || route === 'admin-login') {
    return (
      <div className="app-wrapper">
        <Header />
        <LoginPage />
      </div>
    );
  }
  if (route === 'provider-register') {
    return (
      <div className="app-wrapper">
        <Header />
        <RegisterPage />
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Header />
      <main className="main-content">
        {route === 'beranda' && <CustomerLandingPage />}
        {route === 'cari-trip' && <CustomerSearchPage />}
        {route === 'partner-landing' && <ProviderLandingPage />}
        {route === 'tentang-kami' && <AboutPage />}
        {route === 'bantuan' && <CustomerHelpPage />}
        {route === 'pengaturan' && <CustomerSettingsPage />}
        {route === 'rencana-trip' && <CustomerTripPlannerPage />}
      </main>
      <Footer />
      {renderGlobalTermsModal()}
    </div>
  );
};

import { CustomAlertProvider } from './components/CustomAlertModal';

// Fallback hanya terlihat pada pemuatan pertama; perpindahan menu memakai
// transisi (NavigationContext) sehingga halaman lama tetap tampil.
const PageLoadingFallback: React.FC = () => <PageSkeleton fullScreen />;

function App() {
  return (
    <ErrorBoundary>
      <CustomAlertProvider>
        <NavigationProvider>
          <React.Suspense fallback={<PageLoadingFallback />}>
            <AppContent />
          </React.Suspense>
        </NavigationProvider>
      </CustomAlertProvider>
    </ErrorBoundary>
  );
}


// Simpan halaman yang diminta agar setelah login pengguna kembali ke sana
// (redirectAfterAuth membaca kunci yang sama).
function rememberReturnTo() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  if (hash.startsWith('#/') && !hash.startsWith('#//')) {
    try {
      sessionStorage.setItem('tementrip_auth_return_to', hash);
    } catch {
      // abaikan
    }
  }
}

export default App;

