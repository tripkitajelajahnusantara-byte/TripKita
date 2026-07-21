import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { AboutPage } from './pages/AboutPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { KelolaPaketPage } from './pages/KelolaPaketPage';
import { ManageBookingPage } from './pages/ManageBookingPage';
import { ProfileProviderPage } from './pages/ProfileProviderPage';
import { AddPackagePage } from './pages/AddPackagePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

const AppContent: React.FC = () => {
  const { route, isRegistered, loadingProfile, providerProfile, navigateTo } = useNavigation();

  React.useEffect(() => {
    const privateRoutes = [
      'dashboard',
      'kelola-paket',
      'booking',
      'profil-provider',
      'tambah-paket',
      'admin-dashboard'
    ];

    if (loadingProfile) return;

    if (privateRoutes.includes(route) && !isRegistered) {
      navigateTo('masuk');
    } else if (isRegistered && providerProfile) {
      if (providerProfile.role === 'ADMIN' && route !== 'admin-dashboard') {
        navigateTo('admin-dashboard');
      } else if (providerProfile.role === 'PROVIDER' && route === 'admin-dashboard') {
        navigateTo('dashboard');
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
  if (route === 'tambah-paket') {
    return <AddPackagePage />;
  }

  // Auth pages (render with Header but no Footer for specific mock compliance)
  if (route === 'daftar') {
    return (
      <div className="app-wrapper">
        <Header />
        <RegisterPage />
      </div>
    );
  }
  if (route === 'masuk') {
    return (
      <div className="app-wrapper">
        <Header />
        <LoginPage />
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Header />
      <main className="main-content">
        {route === 'beranda' && <LandingPage />}
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

