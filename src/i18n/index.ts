import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';

export type AppLanguage = 'pt-BR' | 'en' | 'es';

export const SUPPORTED_LANGUAGES: { code: AppLanguage; flag: string; label: string }[] = [
  { code: 'pt-BR', flag: '🇧🇷', label: 'Português (BR)' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
];

// Dica inicial vinda do localStorage (a fonte da verdade é o settings persistido no Supabase)
const detectInitialLanguage = (): AppLanguage => {
  try {
    const stored = localStorage.getItem('app_language');
    if (stored === 'pt-BR' || stored === 'en' || stored === 'es') return stored;
  } catch { /* ignore */ }
  return 'pt-BR';
};

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'pt-BR',
  interpolation: { escapeValue: false },
});

export default i18n;
