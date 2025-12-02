import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  labelLeft?: string;
  labelRight?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled = false, labelLeft, labelRight, ...props }, ref) => {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {labelLeft && (
          <span className={cn("text-sm font-medium", !checked ? "text-gray-900" : "text-gray-500")}>
            {labelLeft}
          </span>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          ref={ref}
          onClick={() => !disabled && onCheckedChange(!checked)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            checked ? "bg-black" : "bg-gray-300"
          )}
          {...props}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-none bg-white transition-transform",
              checked ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
        {labelRight && (
          <span className={cn("text-sm font-medium", checked ? "text-gray-900" : "text-gray-500")}>
            {labelRight}
          </span>
        )}
      </div>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }

