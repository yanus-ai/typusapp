import { ComponentProps } from 'react';
import { useFormContext } from 'react-hook-form';

interface FormSelectProps extends ComponentProps<'select'> {
  name: string;
  label?: string;
  options: { label: string; value: string }[];
  errorClassName?: string;
  placeholder?: string;
}

export default function FormSelect({
  name,
  label,
  options,
  className,
  errorClassName,
  placeholder,
  ...props
}: FormSelectProps) {
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
      <select
        {...register(name)}
        className={`w-full p-3 border rounded-lg bg-transparent ${
          hasError
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-gray-500 focus:border-gray-500'
        } ${className || ''}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className={`text-red-500 text-sm mt-1 ${errorClassName || ''}`}>
          {error.message as string}
        </p>
      )}
    </div>
  );
}

