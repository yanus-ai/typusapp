import { IconBrandWhatsapp } from '@tabler/icons-react'
import FormPhoneInput from '@/components/form/FormPhoneInput';

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
      </div>
    </div>
  );
}
