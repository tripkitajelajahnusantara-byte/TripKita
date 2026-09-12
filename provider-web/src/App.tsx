import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AboutPage } from './pages/AboutPage';
import { CustomerHelpPage } from './pages/CustomerHelpPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { KelolaPaketPage } from './pages/KelolaPaketPage';
import { ManageBookingPage } from './pages/ManageBookingPage';
import { ProfileProviderPage } from './pages/ProfileProviderPage';
import { AddPackagePage } from './pages/AddPackagePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CustomerLandingPage } from './pages/CustomerLandingPage';
import { CustomerPackageDetailPage } from './pages/CustomerPackageDetailPage';
import { CustomerBookingPage } from './pages/CustomerBookingPage';
import { CustomerHistoryPage } from './pages/CustomerHistoryPage';
import { CustomerRegisterPage } from './pages/CustomerRegisterPage';
import { CustomerLoginPage } from './pages/CustomerLoginPage';
import { ProviderLandingPage } from './pages/ProviderLandingPage';
import { CustomerSearchPage } from './pages/CustomerSearchPage';
import { CustomerConfirmationPage } from './pages/CustomerConfirmationPage';
import { CustomerPaymentInvoicePage } from './pages/CustomerPaymentInvoicePage';
import { CustomerXenditCheckoutPage } from './pages/CustomerXenditCheckoutPage';
import { ProviderFinancePage } from './pages/ProviderFinancePage';
import { ProviderPublicProfilePage } from './pages/ProviderPublicProfilePage';
import { CustomerSettingsPage } from './pages/CustomerSettingsPage';
import { LegalModalContainer, CustomerRegistrationTermsContent } from './components/LegalModals';

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
      const hasProviderToken = typeof window !== 'undefined' && (localStorage.getItem('tementrip_partner_token') || localStorage.getItem('tripkita_partner_token'));
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
  if (route === 'xendit-checkout') {
    return (
      <>
        <CustomerXenditCheckoutPage />
        {renderGlobalTermsModal()}
      </>
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
      </main>
      <Footer />
      {renderGlobalTermsModal()}
    </div>
  );
};

import { CustomAlertProvider } from './components/CustomAlertModal';

function App() {
  return (
    <CustomAlertProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </CustomAlertProvider>
  );
}

export default App;

