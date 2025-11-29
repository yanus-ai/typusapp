import { IconBrandWhatsapp } from '@tabler/icons-react'
import FormPhoneInput from '@/components/form/FormPhoneInput';
import FormCheckbox from '@/components/form/FormCheckbox';
import { useAppSelector } from '@/hooks/useAppSelector';
import { getOnboardingTranslations } from '../translations';

export default function PhoneNumberQuestion() {
  const { user } = useAppSelector((state) => state.auth);
  const t = getOnboardingTranslations(user?.language);
  
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {t.whatsappNumber}
      </h2>
      <div className="space-y-3 pb-4">
        <div className="p-3 bg-green-50 border border-green-200 rounded-none flex items-center gap-3">
          <IconBrandWhatsapp className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />  
          <p className="text-sm text-green-800">
            {t.whatsappInfo}
          </p>
        </div>
        <FormPhoneInput 
          name="phoneNumber"
          label={t.whatsappNumberOptional}
        />
        <div className="pt-2 space-y-3">
          <FormCheckbox
            name="whatsappConsent"
            label={
              <span className="text-sm text-gray-700">
                {t.whatsappConsent}
                <a 
                  href="mailto:support@typus.ai" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {t.whatsappConsentEmail}
                </a>
                {t.whatsappConsentAfterEmail}
                <a 
                  href="/data-privacy" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {t.whatsappConsentPrivacyPolicy}
                </a>
                {t.whatsappConsentEnd}
              </span>
            }
          />
          <FormCheckbox
            name="privacyTermsConsent"
            label={
              <span className="text-sm text-gray-700">
                {t.privacyTermsConsent}
                <a 
                  href="/terms" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {t.privacyTermsConsentTerms}
                </a>
                {t.privacyTermsConsentAnd}
                <a 
                  href="/data-privacy" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {t.privacyTermsConsentPrivacy}
                </a>
                {t.privacyTermsConsentEnd}
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}
