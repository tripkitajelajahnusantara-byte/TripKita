import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X, CreditCard, RefreshCw, Calendar, Wallet, Info, UserPlus, ShieldCheck, CheckCheck } from 'lucide-react';
import { request } from '../utils/api';
import { useNavigation } from '../context/NavigationContext';

export type NotificationType =
  | 'PAYMENT'
  | 'REFUND'
  | 'RESCHEDULE'
  | 'PAYOUT'
  | 'REGISTRATION'
  | 'ACCOUNT'
  | 'GENERAL'
  | string;

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  /**
   * Dashboard admin memakai navigasi internal (state view), bukan route global,
   * sehingga tujuan klik notifikasi ditentukan oleh pemanggil bila diisi.
   */
  onSelect?: (item: NotificationItem) => void;
  /** Gaya tombol mengikuti header tempat lonceng dipasang. */
  variant?: 'light' | 'dark';
  /**
   * Sisi panel yang disejajarkan dengan tombol. Lonceng di sidebar kiri wajib
   * memakai 'left', jika tidak panel selebar 340px terpotong tepi layar.
   */
  align?: 'left' | 'right';
}

const POLL_INTERVAL_MS = 30_000;

function formatRelativeTime(iso: string): string {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return '';

  const diffSeconds = Math.round((Date.now() - created) / 1000);
  if (diffSeconds < 60) return 'Baru saja';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} menit lalu`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} jam lalu`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} hari lalu`;

  return new Date(created).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onSelect, variant = 'light', align = 'right' }) => {
  const { navigateTo, providerProfile, customerProfile } = useNavigation();

  // Customer dan mitra/admin memakai token yang berbeda, dan `request()`
  // memilih token dari prefiks endpoint. Memakai satu prefiks untuk keduanya
  // membuat salah satu peran selalu mengirim permintaan tanpa token.
  const basePath = !providerProfile && customerProfile ? '/customer' : '/provider';
  const isSignedIn = Boolean(providerProfile || customerProfile);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    // Tanpa sesi tidak ada notifikasi untuk diambil, dan polling tanpa token
    // hanya akan memicu penanganan sesi kedaluwarsa berulang kali.
    if (!isSignedIn) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const res = await request(`${basePath}/notifications`);
      const list: NotificationItem[] = res?.data || [];
      setNotifications(list);
      // Backend memotong daftar pada 50 baris terakhir, jadi badge memakai
      // hitungan server bila tersedia agar tidak ikut terpotong.
      setUnreadCount(
        typeof res?.unreadCount === 'number'
          ? res.unreadCount
          : list.filter((n) => !n.isRead).length,
      );
      setError('');
    } catch (err: any) {
      // Notifikasi bukan fungsi utama halaman; kegagalan muat hanya dilaporkan
      // di dalam panel dan tidak boleh mengosongkan daftar yang sudah tampil.
      setError(err?.message || 'Notifikasi tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [basePath, isSignedIn]);

  useEffect(() => {
    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  // Panel ditutup saat klik di luar atau menekan Escape, supaya tidak menutupi
  // isi halaman setelah pengguna beralih fokus.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const togglePanel = () => {
    const next = !isOpen;
    setIsOpen(next);
    // Muat ulang saat dibuka agar isi panel tidak tertinggal dari polling.
    if (next) fetchNotifications();
  };

  const markAsRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await request(`${basePath}/notifications/${id}/read`, { method: 'PUT' });
    } catch {
      // Status baca akan tersinkron kembali pada polling berikutnya.
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await request(`${basePath}/notifications/read-all`, { method: 'PUT' });
    } catch {
      fetchNotifications();
    }
  };

  const handleNotifClick = (item: NotificationItem) => {
    if (!item.isRead) markAsRead(item.id);
    setIsOpen(false);

    if (onSelect) {
      onSelect(item);
      return;
    }

    if (basePath === '/customer') {
      navigateTo('riwayat-booking');
      return;
    }

    switch (item.type) {
      case 'PAYOUT':
        navigateTo('keuangan-provider');
        break;
      case 'ACCOUNT':
        navigateTo('profil-provider');
        break;
      default:
        navigateTo('booking');
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'PAYMENT':
        return <CreditCard size={16} color="#059669" />;
      case 'REFUND':
        return <RefreshCw size={16} color="#dc2626" />;
      case 'RESCHEDULE':
        return <Calendar size={16} color="#d97706" />;
      case 'PAYOUT':
        return <Wallet size={16} color="#0284c7" />;
      case 'REGISTRATION':
        return <UserPlus size={16} color="#7c3aed" />;
      case 'ACCOUNT':
        return <ShieldCheck size={16} color="#0f766e" />;
      default:
        return <Info size={16} color="#0284c7" />;
    }
  };

  const isDark = variant === 'dark';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={togglePanel}
        aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          padding: '8px',
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1'}`,
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        title="Notifikasi Aktivitas"
      >
        <Bell size={18} color={isDark ? '#e2e8f0' : '#334155'} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: '800',
              height: '18px',
              minWidth: '18px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            ...(align === 'left' ? { left: '0' } : { right: '0' }),
            width: '340px',
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color="#0284c7" />
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Notifikasi Aktivitas</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Tandai semua dibaca"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#0284c7',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: 0,
                  }}
                >
                  <CheckCheck size={14} /> Tandai dibaca
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup notifikasi"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {error && (
              <div style={{ padding: '10px 18px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px' }}>
                {error}
              </div>
            )}

            {loading && notifications.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Memuat notifikasi...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Belum ada notifikasi baru.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotifClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotifClick(item);
                    }
                  }}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: item.isRead ? '#ffffff' : '#f0f9ff',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: '50%',
                      backgroundColor: item.isRead ? '#f1f5f9' : '#e0f2fe',
                      marginTop: '2px',
                    }}
                  >
                    {getIcon(item.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.title}</strong>
                      {!item.isRead && (
                        <span style={{ height: '7px', width: '7px', borderRadius: '50%', backgroundColor: '#0284c7', flexShrink: 0 }} />
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.4' }}>
                      {item.message}
                    </p>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
