import { useFormContext } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css'
import './FormPhoneInput.css'

interface FormPhoneInputProps {
  name: string;
  label?: string;
  errorClassName?: string;
}

export default function FormPhoneInput({
  name,
  label,
  errorClassName
}: FormPhoneInputProps) {
  const {
    setValue,
    register,
    watch,
    formState: { errors }
  } = useFormContext();

  const error = errors[name];

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <PhoneInput
        {...register(name)}
        enableSearch={true}
        placeholder="Enter your WhatsApp number"
        onChange={(value) => setValue(name, value)}
        country='de'
        value={watch(name)}
      />
      {error && (
        <p className={`text-red-500 text-sm mt-1 ${errorClassName || ''}`}>
          {error.message as string}
        </p>
      )}
    </div>
  );
}

