import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import deTranslations from './locales/de.json';

// Detect browser language
const getBrowserLanguage = (): string => {
  if (typeof window !== 'undefined' && navigator.language) {
    const browserLang = navigator.language.toLowerCase();
    
    // Check if browser language starts with 'de'
    if (browserLang.startsWith('de')) {
      return 'de';
    }
    
    // Check navigator.languages array
    if (navigator.languages && navigator.languages.length > 0) {
      for (const lang of navigator.languages) {
        const langLower = lang.toLowerCase();
        if (langLower.startsWith('de')) {
          return 'de';
        }
        if (langLower.startsWith('en')) {
          return 'en';
        }
      }
    }
  }
  
  return 'en'; // Default to English
};

// Get saved language from localStorage or detect from browser
const getInitialLanguage = (): string => {
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'de')) {
    return savedLanguage;
  }
  return getBrowserLanguage();
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      de: {
        translation: deTranslations,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },
  });

export default i18n;

