import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Menahan error render agar pengguna tidak melihat halaman kosong di production.
 * Tanpa batas ini, satu error di satu komponen akan melepas seluruh React tree
 * dan menyisakan layar putih tanpa jalan pulih.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Detail hanya dicatat di konsol browser; pesan yang dilihat pengguna tetap umum.
    console.error('[TemenTrip] Render error:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleBackToHome = () => {
    window.location.hash = '#/beranda';
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          color: '#0f172a',
        }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Halaman gagal dimuat</h1>
        <p style={{ margin: 0, color: '#475569', fontSize: '14px', maxWidth: '420px' }}>
          Terjadi gangguan saat menampilkan halaman ini. Data pesanan dan pembayaran Anda tidak
          terpengaruh. Silakan muat ulang halaman atau kembali ke beranda.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '12px 24px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Muat Ulang
          </button>
          <button
            type="button"
            onClick={this.handleBackToHome}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ffffff',
              color: '#0284c7',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }
}
