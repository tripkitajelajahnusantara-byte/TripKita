import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n, type Lang } from '../i18n';

const OPTIONS: { code: Lang; short: string; name: string }[] = [
  { code: 'id', short: 'ID', name: 'Bahasa Indonesia' },
  { code: 'en', short: 'EN', name: 'English' },
];

// Pilihan bahasa berbentuk segmented control: kedua opsi selalu terlihat,
// jadi pengguna tidak perlu membuka menu untuk tahu bahasa apa yang tersedia.
export const LanguageSwitch: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={t('Pilih bahasa', 'Choose language')}>
      <Globe size={14} aria-hidden="true" className="lang-switch-icon" />
      {OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          lang={option.code}
          title={option.name}
          aria-label={option.name}
          aria-pressed={lang === option.code}
          className={lang === option.code ? 'active' : ''}
          onClick={() => setLang(option.code)}
        >
          {option.short}
        </button>
      ))}
      <style>{`
        .lang-switch {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 3px;
          border-radius: 999px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
        }
        .lang-switch-icon {
          color: #64748b;
          margin: 0 4px 0 6px;
        }
        .lang-switch button {
          min-width: 34px;
          height: 28px;
          padding: 0 8px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }
        .lang-switch button:hover {
          color: #0f172a;
        }
        .lang-switch button.active {
          background: #ffffff;
          color: #0284c7;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
        }
        @media (max-width: 1100px) {
          .lang-switch-icon { display: none; }
        }
        .lang-switch button:focus-visible {
          outline: 2px solid #0284c7;
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
};
