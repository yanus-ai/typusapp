import { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export const useRecaptcha = () => {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    // Load reCAPTCHA v3 script if not already loaded
    if (!window.grecaptcha && siteKey) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [siteKey]);

  const getRecaptchaToken = useCallback(async (action: string = 'register') => {
    if (!siteKey) {
      console.log('reCAPTCHA site key not available');
      return null;
    }

    if (!window.grecaptcha) {
      console.log('reCAPTCHA not loaded yet');
      return null;
    }

    try {
      return await new Promise<string>((resolve) => {
        window.grecaptcha.ready(async () => {
          try {
            const token = await window.grecaptcha.execute(siteKey, { action });
            resolve(token);
          } catch (error) {
            console.error('Error executing reCAPTCHA:', error);
            resolve('');
          }
        });
      });
    } catch (error) {
      console.error('Error getting reCAPTCHA token:', error);
      return null;
    }
  }, [siteKey]);

  const resetRecaptcha = useCallback(() => {
    // reCAPTCHA v3 doesn't need explicit reset
    console.log('reCAPTCHA v3 reset not needed');
  }, []);

  return {
    getRecaptchaToken,
    resetRecaptcha
  };
};