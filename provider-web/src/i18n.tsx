import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';

// Bahasa situs customer. Teks Indonesia tetap menjadi sumber dan ditulis
// berdampingan dengan versi Inggris lewat t('…', '…'), sehingga tidak ada
// berkas kamus terpisah yang bisa tertinggal saat copy diubah.
export type Lang = 'id' | 'en';

const STORAGE_KEY = 'tementrip_lang';

function readStoredLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'id';
  } catch {
    return 'id';
  }
}

// Bahasa aktif untuk kode di luar komponen (utils/formatter). Disinkronkan oleh
// LanguageProvider; komponen pemanggilnya ikut render ulang karena memakai useI18n.
let preferredLang: Lang = readStoredLang();
let indonesianOnlyArea = false;
let activeLang: Lang = preferredLang;
export const getLang = (): Lang => activeLang;

// Nilai baku dari data (kategori, opsi filter) yang disimpan dalam bahasa
// Indonesia. Hanya labelnya yang diterjemahkan, nilainya tidak pernah berubah.
const TERMS_EN: Record<string, string> = {
  'Wisata Budaya & Sejarah': 'Culture & History',
  Pantai: 'Beach',
  Gunung: 'Mountain',
  Curug: 'Waterfall',
  'Keluarga Santai': 'Family Leisure',
  'Semua Tipe': 'All Types',
  'Semua Kategori': 'All Categories',
};

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Pilih teks sesuai bahasa aktif: t('Masuk', 'Sign in'). */
  t: (id: string, en: string) => string;
  /** Label tampilan untuk nilai baku dari data, mis. kategori paket. */
  term: (value: string) => string;
  /** Locale Intl untuk tanggal. Mata uang tetap memakai 'id-ID' (Rp). */
  locale: 'id-ID' | 'en-GB';
  setIndonesianOnly: (on: boolean) => void;
}

function buildValue(lang: Lang, setLang: (lang: Lang) => void, setIndonesianOnly: (on: boolean) => void): I18nValue {
  const en = lang === 'en';
  return {
    lang,
    setLang,
    t: (id, enText) => (en ? enText : id),
    term: (value) => (en ? TERMS_EN[value] ?? value : value),
    locale: en ? 'en-GB' : 'id-ID',
    setIndonesianOnly,
  };
}

const I18nContext = createContext<I18nValue>(buildValue(activeLang, () => undefined, () => undefined));

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferred, setPreferred] = useState<Lang>(preferredLang);
  const [indonesianOnly, setIndonesianOnlyState] = useState(indonesianOnlyArea);
  const lang: Lang = indonesianOnly ? 'id' : preferred;

  const setLang = useCallback((next: Lang) => {
    preferredLang = next;
    activeLang = indonesianOnlyArea ? 'id' : next;
    setPreferred(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Penyimpanan diblokir: pilihan tetap berlaku sampai halaman dimuat ulang.
    }
  }, []);

  const setIndonesianOnly = useCallback((on: boolean) => {
    indonesianOnlyArea = on;
    activeLang = on ? 'id' : preferredLang;
    setIndonesianOnlyState(on);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => buildValue(lang, setLang, setIndonesianOnly), [lang, setLang, setIndonesianOnly]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);

/**
 * Dashboard mitra/admin hanya berbahasa Indonesia. Selama `active`, seluruh
 * aplikasi memakai bahasa Indonesia tanpa menghapus pilihan bahasa customer.
 */
export function useIndonesianOnly(active: boolean) {
  const { setIndonesianOnly } = useI18n();
  useLayoutEffect(() => {
    setIndonesianOnly(active);
  }, [active, setIndonesianOnly]);
}
