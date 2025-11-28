import { ReactNode, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import LightTooltip from "./light-tooltip";

export type DropdownOption = string | { label: ReactNode; value: string };

function normalizeOption(option: DropdownOption): { label: ReactNode; value: string } {
  if (typeof option === "string") return { label: option, value: option };
  return option;
}

export function Dropdown({
  options,
  value,
  defaultValue,
  onChange,
  className,
  buttonClassName,
  listClassName,
  ariaLabel,
  renderLabel,
  tooltipText,
  tooltipDirection,
  disabled = false,
}: {
  options: DropdownOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  buttonClassName?: string;
  listClassName?: string;
  ariaLabel?: string;
  renderLabel?: (value: string) => ReactNode;
  tooltipText?: string;
  tooltipDirection?: "top" | "bottom" | "left" | "right";
  disabled?: boolean;
}) {
  const normalized = options.map(normalizeOption);
  
  // The actual displayed value should come from the value prop, not internal state
  const currentValue = value ?? defaultValue ?? normalized[0]?.value ?? "";

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [positionAbove, setPositionAbove] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  // Calculate dropdown position and max height when opened
  useEffect(() => {
    if (!isOpen || !buttonRef.current || !dropdownRef.current) return;

    const calculatePosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      const dropdown = dropdownRef.current;
      if (!buttonRect || !dropdown) return;

      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      // Estimate dropdown height (max-h-60 = 15rem = 240px, plus padding)
      const estimatedDropdownHeight = 250;
      
      // Check if we should position above
      const shouldPositionAbove = spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow;
      
      setPositionAbove(shouldPositionAbove);
      
      // Calculate max height to fit within viewport
      const availableSpace = shouldPositionAbove ? spaceAbove : spaceBelow;
      // Reserve some space (padding) and account for border/padding
      const calculatedMaxHeight = Math.max(100, availableSpace - 20);
      setMaxHeight(calculatedMaxHeight);
    };

    calculatePosition();
    
    // Recalculate on scroll or resize
    const handleRecalculate = () => {
      if (isOpen) calculatePosition();
    };
    
    window.addEventListener('scroll', handleRecalculate, true);
    window.addEventListener('resize', handleRecalculate);
    
    return () => {
      window.removeEventListener('scroll', handleRecalculate, true);
      window.removeEventListener('resize', handleRecalculate);
    };
  }, [isOpen]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSelect = (val: string) => {
    onChange?.(val);
    setIsOpen(false);
  };

  // Get the label for the current value (from prop, not internal state)
  const currentLabel = normalized.find((o) => o.value === currentValue)?.label ?? currentValue;

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex text-sm font-sans", className)}
    >
      <LightTooltip text={tooltipText ?? ""} direction={tooltipDirection ?? "bottom"}>
        <button
          ref={buttonRef}
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            "px-2 py-2 border border-transparent shadow-none bg-transparent rounded-none transition-colors text-xs",
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-gray-200 hover:bg-gray-50 cursor-pointer",
            buttonClassName
          )}
          onClick={disabled ? undefined : () => setIsOpen((v) => !v)}
          disabled={disabled}
        >
          {renderLabel ? renderLabel(currentValue) : currentLabel}
        </button>
      </LightTooltip>

      <div
        ref={dropdownRef}
        role="listbox"
        aria-label={ariaLabel}
        className={cn(
          "absolute z-20 w-[220px] overflow-hidden rounded-none border border-gray-200 bg-white shadow-lg",
          "transition-all duration-150 ease-out",
          positionAbove 
            ? "bottom-full mb-1 origin-bottom" 
            : "top-full mt-1 origin-top",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "pointer-events-none opacity-0 scale-95",
          positionAbove && !isOpen ? "translate-y-1" : !positionAbove && !isOpen ? "-translate-y-1" : "",
          listClassName
        )}
        style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}
      >
        <ul className="overflow-auto py-1" style={{ maxHeight: maxHeight ? `${maxHeight - 8}px` : undefined }}>
          {normalized.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={currentValue === opt.value}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left",
                  "transition-colors duration-150",
                  currentValue === opt.value ? "bg-primary-50 text-primary-900" : "hover:bg-gray-50"
                )}
                onClick={() => handleSelect(opt.value)}
              >
                <span>{opt.label}</span>
                {currentValue === opt.value && <Check className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
