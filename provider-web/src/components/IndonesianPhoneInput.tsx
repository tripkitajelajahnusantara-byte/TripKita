import React from 'react';
import { formatIndonesianLocalPhone, normalizeIndonesianPhone } from '../utils/phone';

interface IndonesianPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  compact?: boolean;
  ariaLabel?: string;
}

export const IndonesianPhoneInput: React.FC<IndonesianPhoneInputProps> = ({
  value,
  onChange,
  invalid = false,
  required = false,
  readOnly = false,
  disabled = false,
  compact = false,
  ariaLabel = 'Nomor WhatsApp tanpa kode negara'
}) => {
  const locked = readOnly || disabled;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        width: '100%',
        border: invalid ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
        borderRadius: compact ? '8px' : '10px',
        backgroundColor: locked ? '#f1f5f9' : '#ffffff',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '0 9px' : '0 12px',
          borderRight: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          color: '#334155',
          fontSize: compact ? '12.5px' : '13.5px',
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}
      >
        <span
          style={{
            width: '18px',
            height: '12px',
            borderRadius: '2px',
            border: '1px solid #e2e8f0',
            background: 'linear-gradient(to bottom, #ef4444 0 50%, #ffffff 50% 100%)',
            boxSizing: 'border-box'
          }}
        />
        <span>+62</span>
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        aria-label={ariaLabel}
        aria-invalid={invalid}
        placeholder="812 3456 7890"
        value={formatIndonesianLocalPhone(value)}
        onChange={(event) => onChange(normalizeIndonesianPhone(event.target.value))}
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        style={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          padding: compact ? '10px 11px' : '12px 13px',
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          color: '#0f172a',
          fontSize: compact ? '13px' : '14px',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
};
