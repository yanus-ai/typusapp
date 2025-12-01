import { useMemo } from 'react';

const DEFAULT_LANGUAGE = 'en';

/**
 * Hook to detect user's browser language
 * Only supports 'de' (German) and 'en' (English)
 * Defaults to 'en' if browser language is not German
 * 
 * @returns The detected language ('de' or 'en')
 */
export function useClientLanguage(): 'de' | 'en' {
  return useMemo(() => {
    // Detect browser language
    if (typeof window !== 'undefined' && navigator.language) {
      const browserLang = navigator.language.toLowerCase();
      
      // Check if browser language starts with 'de' (covers de-DE, de-AT, de-CH, etc.)
      if (browserLang.startsWith('de')) {
        return 'de';
      }
      
      // Check navigator.languages array for more accurate detection
      if (navigator.languages && navigator.languages.length > 0) {
        for (const lang of navigator.languages) {
          const langLower = lang.toLowerCase();
          if (langLower.startsWith('de')) {
            return 'de';
          }
        }
      }
    }
    
    // Default to English
    return DEFAULT_LANGUAGE;
  }, []); // Empty dependency array - language detection only happens once
}

