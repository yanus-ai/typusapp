import { IconBrandWhatsapp } from '@tabler/icons-react'
import FormPhoneInput from '@/components/form/FormPhoneInput';
import FormCheckbox from '@/components/form/FormCheckbox';

export default function PhoneNumberQuestion() {
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        What is your WhatsApp number?
      </h2>
      <div className="space-y-3 pb-4">
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <IconBrandWhatsapp className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />  
          <p className="text-sm text-green-800">
            Enter your WhatsApp number to get more exclusive deals and support
          </p>
        </div>
        <FormPhoneInput 
          name="phoneNumber"
          label="WhatsApp Number"
        />
        <div className="pt-2 space-y-3">
          <FormCheckbox
            name="whatsappConsent"
            label={
              <span className="text-sm text-gray-700">
                By submitting this form, I agree to be contacted by Typus via WhatsApp at the phone number provided, for the purpose of receiving information about products, updates, and offers. I understand that I can withdraw my consent at any time by replying &quot;STOP&quot; or contacting{' '}
                <a 
                  href="mailto:support@typus.ai" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  support@typus.ai
                </a>
                . I have read and agree to the{' '}
                <a 
                  href="/data-privacy" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Privacy Policy
                </a>
                .
              </span>
            }
          />
          <FormCheckbox
            name="privacyTermsConsent"
            label={
              <span className="text-sm text-gray-700">
                I agree to the{' '}
                <a 
                  href="/terms" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Terms of Service
                </a>
                {' '}and{' '}
                <a 
                  href="/data-privacy" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Privacy Policy
                </a>
                .
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}
