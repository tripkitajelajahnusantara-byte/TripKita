import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, CreditCard, RefreshCw, Calendar, Wallet, Info } from 'lucide-react';
import { request } from '../utils/api';
import { useNavigation } from '../context/NavigationContext';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string; // PAYMENT, REFUND, RESCHEDULE, PAYOUT, GENERAL
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export const NotificationCenter: React.FC = () => {
  const { navigateTo, providerProfile, customerProfile } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [readingId, setReadingId] = useState<number | null>(null);
  const isCustomer = customerProfile?.role === 'CUSTOMER';
  const endpoint = isCustomer ? '/customer/notifications' : '/provider/notifications';
  const userId = isCustomer ? customerProfile?.id : providerProfile?.id;
  const unreadCount = notifications.filter(item => !item.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!userId) { setNotifications([]); setLoading(false); return; }
    try {
      const data = await request(endpoint);
      setNotifications(data.data || []);
      setError('');
    } catch {
      setError('Notifikasi gagal dimuat. Silakan coba lagi.');
    } finally { setLoading(false); }
  }, [endpoint, userId]);

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => { void fetchNotifications(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotifClick = async (item: NotificationItem) => {
    if (readingId !== null) return;
    setReadingId(item.id);
    try {
      if (!item.isRead) {
        await request(endpoint + '/' + item.id + '/read', { method: 'PUT' });
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
      }
      setIsOpen(false);
      navigateTo(isCustomer ? 'riwayat-booking' : item.type === 'PAYOUT' ? 'keuangan-provider' : 'booking');
    } catch {
      setError('Notifikasi belum berhasil ditandai dibaca. Silakan coba lagi.');
    } finally { setReadingId(null); }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return <CreditCard size={16} color="#059669" />;
      case 'REFUND':
        return <RefreshCw size={16} color="#dc2626" />;
      case 'RESCHEDULE':
        return <Calendar size={16} color="#d97706" />;
      case 'PAYOUT':
        return <Wallet size={16} color="#0284c7" />;
      default:
        return <Info size={16} color="#0284c7" />;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '8px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #cbd5e1',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        title="Notifikasi Aktivitas"
      >
        <Bell size={18} color="#334155" />
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
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: '0',
            width: '340px',
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color="#0284c7" />
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Notifikasi Aktivitas</strong>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {loading ? <p>Memuat notifikasi...</p> : error ? <div role="alert"><p>{error}</p><button onClick={() => void fetchNotifications()}>Coba lagi</button></div> : notifications.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Belum ada notifikasi baru.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotifClick(item)}
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

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.title}</strong>
                      {!item.isRead && (
                        <span style={{ height: '7px', width: '7px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.4' }}>
                      {item.message}
                    </p>
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
