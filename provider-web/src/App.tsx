import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AboutPage } from './pages/AboutPage';
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
import { ProviderFinancePage } from './pages/ProviderFinancePage';

const AppContent: React.FC = () => {
  const { route, isRegistered, loadingProfile, providerProfile, navigateTo } = useNavigation();

  React.useEffect(() => {
    const privateRoutes = [
      'dashboard',
      'kelola-paket',
      'booking',
      'keuangan-provider',
      'profil-provider',
      'tambah-paket',
      'admin-dashboard'
    ];

    if (loadingProfile) return;

    // Intercept customer/guest landing on provider booking redirect
    if (route === 'booking' && (!isRegistered || providerProfile?.role !== 'PROVIDER')) {
      navigateTo('riwayat-booking');
      return;
    }

    if (privateRoutes.includes(route) && !isRegistered) {
      navigateTo('masuk');
    } else if (isRegistered && providerProfile) {
      if (providerProfile.role === 'ADMIN' && route !== 'admin-dashboard') {
        navigateTo('admin-dashboard');
      } else if (providerProfile.role === 'PROVIDER' && route === 'admin-dashboard') {
        navigateTo('dashboard');
      } else if (providerProfile.role === 'CUSTOMER' && privateRoutes.includes(route)) {
        navigateTo('riwayat-booking');
      }
    }
  }, [route, isRegistered, loadingProfile, providerProfile]);

  if (loadingProfile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p>Memuat profil...</p>
      </div>
    );
  }

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
      </div>
    );
  }
  if (route === 'customer-checkout') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerBookingPage />
        <Footer />
      </div>
    );
  }
  if (route === 'customer-confirmation') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerConfirmationPage />
        <Footer />
      </div>
    );
  }
  if (route === 'riwayat-booking') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerHistoryPage />
        <Footer />
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
      </div>
    );
  }
  if (route === 'customer-register' || route === 'daftar') {
    return (
      <div className="app-wrapper">
        <Header />
        <CustomerRegisterPage />
        <Footer />
      </div>
    );
  }
  if (route === 'provider-login') {
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
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}

export default App;

