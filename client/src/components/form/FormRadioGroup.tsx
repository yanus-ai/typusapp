import { useFormContext } from 'react-hook-form';
import RadioGroup from '@/components/ui/radio';

export interface RadioOption {
  label: string;
  value: string;
}

interface FormRadioGroupProps {
  name: string;
  options: RadioOption[];
  className?: string;
  errorClassName?: string;
}

export default function FormRadioGroup({
  name,
  options,
  className,
  errorClassName
}: FormRadioGroupProps) {
  const {
    watch,
    setValue,
    formState: { errors }
  } = useFormContext();

  const value = watch(name);
  const onValueChange = (selectedValue: string) => setValue(name, selectedValue);
  const error = errors[name];

  return (
    <div className={className}>
      <RadioGroup
        name={name}
        options={options}
        value={value}
        onValueChange={onValueChange}
      />
      {error && (
        <p className={`text-red-500 text-sm mt-2 ${errorClassName || ''}`}>
          {error.message as string}
        </p>
      )}
    </div>
  );
}

