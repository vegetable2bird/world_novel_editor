import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN/translation.json';
import en from './locales/en/translation.json';

export const SUPPORTED_LOCALES = ['zh-CN', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('wx-locale')) || 'zh-CN';

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: stored,
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

export default i18n;
