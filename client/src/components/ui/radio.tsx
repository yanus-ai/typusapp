import { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface RadioGroupProps extends ComponentProps<"div"> {
  name: string;
  options: RadioGroupItemProps[];
  value: string;
  onValueChange: (value: string) => void;
}

export interface RadioGroupItemProps {
  label: ReactNode;
  value: string;
}

export default function RadioGroup({
  name,
  options,
  className,
  value,
  onValueChange,
  ...props
}: RadioGroupProps) {
  return (
    <div className={cn("relative w-full space-y-3", className)} {...props}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex items-center p-3 rounded-lg border cursor-pointer transition-colors",
            value === option.value
              ? "border-red-500 bg-red-50"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            className="sr-only"
            onChange={(e) => onValueChange(e.target.value)}
          />
          <div
            className={cn(
              "w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center border-gray-300",
              value === option.value
                ? "border-red-500 bg-red-500"
                : "border-gray-300"
            )}
          >
            {value === option.value && (
              <div className="w-2 h-2 rounded-full bg-white"></div>
            )}
          </div>
          {option.label}
        </label>
      ))}
    </div>
  );
}
