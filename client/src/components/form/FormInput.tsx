import { useFormContext } from 'react-hook-form';
import { InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label?: string;
  errorClassName?: string;
}

export default function FormInput({
  name,
  label,
  className,
  errorClassName,
  ...props
}: FormInputProps) {
  const {
    register,
    formState: { errors }
  } = useFormContext();

  const error = errors[name];
  const hasError = !!error;

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {props.required ? <span className="text-red-500">*</span> : ''}
        </label>
      )}
      <input
        {...register(name)}
        className={`w-full p-3 border rounded-none ${
          hasError
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-gray-500 focus:border-gray-500'
        } ${className || ''}`}
        {...props}
      />
      {error && (
        <p className={`text-red-500 text-sm mt-1 ${errorClassName || ''}`}>
          {error.message as string}
        </p>
      )}
    </div>
  );
}

