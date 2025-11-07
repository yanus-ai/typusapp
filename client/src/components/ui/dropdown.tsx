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
}) {
  const normalized = options.map(normalizeOption);
  const initial = value ?? defaultValue ?? normalized[0]?.value ?? "";

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>(initial);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelected(value);
    }
  }, [value]);

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
    setSelected(val);
    onChange?.(val);
    setIsOpen(false);
  };

  const selectedLabel = normalized.find((o) => o.value === selected)?.label ?? selected;

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex text-sm font-sans", className)}
    >
      <LightTooltip text={tooltipText ?? ""} direction={tooltipDirection ?? "bottom"}>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            "px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-lg transition-colors hover:bg-gray-50 cursor-pointer text-xs",
            buttonClassName
          )}
          onClick={() => setIsOpen((v) => !v)}
        >
          {renderLabel ? renderLabel(selected) : selectedLabel}
        </button>
      </LightTooltip>

      <div
        role="listbox"
        aria-label={ariaLabel}
        className={cn(
          "absolute z-20 mt-1 w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg",
          "origin-top transition-all duration-150 ease-out",
          isOpen ? "opacity-100 scale-100 translate-y-0" : "pointer-events-none opacity-0 scale-95 -translate-y-1",
          listClassName
        )}
      >
        <ul className="max-h-60 overflow-auto py-1">
          {normalized.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={selected === opt.value}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left",
                  "transition-colors duration-150",
                  selected === opt.value ? "bg-primary-50 text-primary-900" : "hover:bg-gray-50"
                )}
                onClick={() => handleSelect(opt.value)}
              >
                <span>{opt.label}</span>
                {selected === opt.value && <Check className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
