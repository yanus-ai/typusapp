import { useRef, useCallback } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

export const useRecaptcha = () => {
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const getRecaptchaToken = useCallback(async () => {
    if (!recaptchaRef.current) {
      console.log('reCAPTCHA ref not available');
      return null;
    }

    try {
      const token = recaptchaRef.current.getValue();
      if (!token) {
        console.log('Please complete the reCAPTCHA');
        return null;
      }
      return token;
    } catch (error) {
      console.error('Error getting reCAPTCHA token:', error);
      return null;
    }
  }, []);

  const resetRecaptcha = useCallback(() => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  }, []);

  return {
    recaptchaRef,
    getRecaptchaToken,
    resetRecaptcha
  };
};