import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface CustomAlertContextType {
  showAlert: (options: AlertOptions | string) => void;
  showConfirm: (options: AlertOptions) => void;
}

const CustomAlertContext = createContext<CustomAlertContextType | undefined>(undefined);

export const useCustomAlert = () => {
  const context = useContext(CustomAlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within a CustomAlertProvider');
  }
  return context;
};

export const CustomAlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertOptions>({
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Mengerti'
  });

  const showAlert = (options: AlertOptions | string) => {
    if (typeof options === 'string') {
      setAlertConfig({
        title: 'Pemberitahuan',
        message: options,
        type: 'info',
        confirmText: 'Mengerti'
      });
    } else {
      setAlertConfig({
        title: options.title || (options.type === 'error' ? 'Terjadi Kesalahan' : options.type === 'warning' ? 'Peringatan' : options.type === 'success' ? 'Berhasil' : 'Pemberitahuan'),
        message: options.message,
        type: options.type || 'info',
        confirmText: options.confirmText || 'Mengerti',
        cancelText: options.cancelText,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel
      });
    }
    setIsOpen(true);
  };

  const showConfirm = (options: AlertOptions) => {
    setAlertConfig({
      title: options.title || 'Konfirmasi Aksi',
      message: options.message,
      type: options.type || 'warning',
      confirmText: options.confirmText || 'Ya, Lanjutkan',
      cancelText: options.cancelText || 'Batal',
      onConfirm: options.onConfirm,
      onCancel: options.onCancel
    });
    setIsOpen(true);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (alertConfig.onConfirm) {
      alertConfig.onConfirm();
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (alertConfig.onCancel) {
      alertConfig.onCancel();
    }
  };

  const getIcon = () => {
    switch (alertConfig.type) {
      case 'success':
        return <CheckCircle2 size={32} color="#10b981" />;
      case 'error':
        return <XCircle size={32} color="#ef4444" />;
      case 'warning':
        return <AlertTriangle size={32} color="#f59e0b" />;
      case 'info':
      default:
        return <Info size={32} color="#0284c7" />;
    }
  };

  const getHeaderBg = () => {
    switch (alertConfig.type) {
      case 'success':
        return '#ecfdf5';
      case 'error':
        return '#fef2f2';
      case 'warning':
        return '#fffbeb';
      case 'info':
      default:
        return '#f0f9ff';
    }
  };

  const getButtonBg = () => {
    switch (alertConfig.type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
      default:
        return '#0284c7';
    }
  };

  return (
    <CustomAlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(5px)',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              animation: 'scaleUp 0.15s ease-out',
              boxSizing: 'border-box'
            }}
          >
            {/* Header Icon Badge */}
            <div
              style={{
                backgroundColor: getHeaderBg(),
                padding: '24px 24px 18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flexShrink: 0 }}>
                  {getIcon()}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.3' }}>
                  {alertConfig.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Message Body */}
            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '14px', color: '#334155', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {alertConfig.message}
              </p>
            </div>

            {/* Actions */}
            <div style={{ padding: '0 24px 20px 24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {alertConfig.cancelText && (
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    flex: '1'
                  }}
                >
                  {alertConfig.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: getButtonBg(),
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  flex: alertConfig.cancelText ? '1' : 'none',
                  minWidth: '100px'
                }}
              >
                {alertConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomAlertContext.Provider>
  );
};
