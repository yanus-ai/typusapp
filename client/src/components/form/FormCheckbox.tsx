import { useFormContext } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface FormCheckboxProps {
  name: string;
  label?: string | ReactNode;
  errorClassName?: string;
  className?: string;
}

export default function FormCheckbox({
  name,
  label,
  errorClassName,
  className,
}: FormCheckboxProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors }
  } = useFormContext();

  const error = errors[name];
  const hasError = !!error;
  const checked = watch(name) || false;

  return (
    <div className="relative">
      <div className={cn("flex items-start gap-3", className)}>
        <Checkbox
          id={name}
          checked={checked}
          onCheckedChange={(checked) => setValue(name, checked, { shouldValidate: true })}
          className={cn(
            "mt-0.5",
            hasError && "border-red-500"
          )}
          aria-invalid={hasError}
        />
        {label && (
          <label
            htmlFor={name}
            className={cn(
              "text-sm text-gray-700 cursor-pointer",
              hasError && "text-red-600"
            )}
          >
            {label}
          </label>
        )}
      </div>
      {error && (
        <p className={cn("text-red-500 text-sm mt-1", errorClassName)}>
          {error.message as string}
        </p>
      )}
    </div>
  );
}

