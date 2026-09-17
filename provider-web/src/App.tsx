import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LegalModalContainer, CustomerRegistrationTermsContent } from './components/LegalModals';
import { getProviderToken } from './utils/api';
import { ErrorBoundary } from './components/ErrorBoundary';

// Setiap halaman dimuat sebagai chunk terpisah supaya kunjungan pertama tidak
// perlu mengunduh seluruh aplikasi sekaligus.
const AboutPage = React.lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const CustomerHelpPage = React.lazy(() => import('./pages/CustomerHelpPage').then((m) => ({ default: m.CustomerHelpPage })));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const LoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const KelolaPaketPage = React.lazy(() => import('./pages/KelolaPaketPage').then((m) => ({ default: m.KelolaPaketPage })));
const ManageBookingPage = React.lazy(() => import('./pages/ManageBookingPage').then((m) => ({ default: m.ManageBookingPage })));
const ProfileProviderPage = React.lazy(() => import('./pages/ProfileProviderPage').then((m) => ({ default: m.ProfileProviderPage })));
const AddPackagePage = React.lazy(() => import('./pages/AddPackagePage').then((m) => ({ default: m.AddPackagePage })));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const CustomerLandingPage = React.lazy(() => import('./pages/CustomerLandingPage').then((m) => ({ default: m.CustomerLandingPage })));
const CustomerPackageDetailPage = React.lazy(() => import('./pages/CustomerPackageDetailPage').then((m) => ({ default: m.CustomerPackageDetailPage })));
const CustomerBookingPage = React.lazy(() => import('./pages/CustomerBookingPage').then((m) => ({ default: m.CustomerBookingPage })));
const CustomerHistoryPage = React.lazy(() => import('./pages/CustomerHistoryPage').then((m) => ({ default: m.CustomerHistoryPage })));
const CustomerRegisterPage = React.lazy(() => import('./pages/CustomerRegisterPage').then((m) => ({ default: m.CustomerRegisterPage })));
const CustomerLoginPage = React.lazy(() => import('./pages/CustomerLoginPage').then((m) => ({ default: m.CustomerLoginPage })));
const ProviderLandingPage = React.lazy(() => import('./pages/ProviderLandingPage').then((m) => ({ default: m.ProviderLandingPage })));
const CustomerSearchPage = React.lazy(() => import('./pages/CustomerSearchPage').then((m) => ({ default: m.CustomerSearchPage })));
const CustomerConfirmationPage = React.lazy(() => import('./pages/CustomerConfirmationPage').then((m) => ({ default: m.CustomerConfirmationPage })));
const CustomerPaymentInvoicePage = React.lazy(() => import('./pages/CustomerPaymentInvoicePage').then((m) => ({ default: m.CustomerPaymentInvoicePage })));
const ProviderFinancePage = React.lazy(() => import('./pages/ProviderFinancePage').then((m) => ({ default: m.ProviderFinancePage })));
const ProviderPublicProfilePage = React.lazy(() => import('./pages/ProviderPublicProfilePage').then((m) => ({ default: m.ProviderPublicProfilePage })));
const CustomerSettingsPage = React.lazy(() => import('./pages/CustomerSettingsPage').then((m) => ({ default: m.CustomerSettingsPage })));
const CustomerTripPlannerPage = React.lazy(() => import('./pages/CustomerTripPlannerPage').then((m) => ({ default: m.CustomerTripPlannerPage })));

const AppContent: React.FC = () => {
  const { route, loadingProfile, providerProfile, customerProfile, navigateTo } = useNavigation();
  const [showGlobalCustomerTerms, setShowGlobalCustomerTerms] = React.useState(false);

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
        navigateTo('provider-login');
        return;
      }
      if (providerProfile) {
        if (providerProfile.role === 'ADMIN' && route !== 'admin-dashboard') {
          navigateTo('admin-dashboard');
        } else if (providerProfile.role === 'PROVIDER' && route === 'admin-dashboard') {
          navigateTo('dashboard');
        }
      }
    }
  }, [route, loadingProfile, providerProfile]);

  if (loadingProfile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p>Memuat profil...</p>
      </div>
    );
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

const PageLoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'sans-serif', color: '#475569' }}>
    <p>Memuat halaman...</p>
  </div>
);

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

export default App;

