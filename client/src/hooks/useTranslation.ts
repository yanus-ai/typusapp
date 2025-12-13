import { useTranslation as useI18nextTranslation } from 'react-i18next';

/**
 * Custom hook for translations
 * Provides a convenient wrapper around react-i18next's useTranslation hook
 * 
 * @example
 * const { t, changeLanguage, currentLanguage } = useTranslation();
 * 
 * // Use translation
 * <p>{t('create.promptPlaceholder')}</p>
 * 
 * // Change language
 * changeLanguage('de');
 * 
 * // Get current language
 * console.log(currentLanguage); // 'en' or 'de'
 */
export function useTranslation() {
  const { t, i18n } = useI18nextTranslation();

  const changeLanguage = (lang: 'en' | 'de') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return {
    t,
    changeLanguage,
    currentLanguage: i18n.language as 'en' | 'de',
    i18n,
  };
}
