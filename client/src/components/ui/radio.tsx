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
            "flex items-center p-3 cursor-pointer group/sub relative w-full text-left transition-all duration-200 ease-out rounded-lg overflow-hidden",
            value === option.value
              ? "text-black shadow-sm bg-white"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            className="sr-only"
            onChange={(e) => onValueChange(e.target.value)}
          />
          <div className='w-4 h-4 rounded-sm flex items-center justify-center bg-gray-100 group-hover/sub:bg-gray-200 transition-colors duration-200 mr-3'>
            <div
              className={`w-1.5 h-1.5 rounded-xs transition-all duration-200 ${
                value === option.value
                  ? 'bg-black shadow-sm animate-pulse'
                  : 'bg-gray-300 group-hover/sub:bg-gray-400'
              }`}
            ></div>
          </div>
          {option.label}
        </label>
      ))}
    </div>
  );
}
