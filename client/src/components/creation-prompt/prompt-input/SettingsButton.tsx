import { SlidersHorizontalIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import LightTooltip from "@/components/ui/light-tooltip";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setCreativity, setExpressivity, setResemblance } from "@/features/customization/customizationSlice";
import { useTranslation } from "@/hooks/useTranslation";

interface SettingsButtonProps {
  disabled?: boolean;
}

export function SettingsButton({ disabled = false }: SettingsButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [positionAbove, setPositionAbove] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const { creativity, resemblance, expressivity } = useAppSelector(state => state.customization)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useAppDispatch();

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
      
      // Estimate dropdown height (approximately 250px for settings panel)
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

  return (
    <div ref={containerRef} className="relative inline-flex">
      <LightTooltip text={t('create.settings.settings')} direction="bottom">
        <button
          ref={buttonRef}
          type="button"
          aria-label={t('create.settings.settingsAria')}
          aria-expanded={isOpen}
          className={cn(
            "px-2 py-2 border border-transparent shadow-none bg-transparent rounded-none transition-colors text-xs",
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-gray-200 hover:bg-gray-50 cursor-pointer"
          )}
          onClick={disabled ? undefined : () => setIsOpen((v) => !v)}
          disabled={disabled}
        >
          <SlidersHorizontalIcon size={16} />
        </button>
      </LightTooltip>

      {/* Settings Dropdown */}
      <div
        ref={dropdownRef}
        role="dialog"
        aria-label={t('create.settings.settingsAria')}
        className={cn(
          "absolute z-20 right-0 w-[280px] overflow-hidden rounded-none border border-gray-200 bg-white shadow-lg",
          "transition-all duration-150 ease-out",
          positionAbove 
            ? "bottom-full mb-1 origin-bottom" 
            : "top-full mt-1 origin-top",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "pointer-events-none opacity-0 scale-95",
          positionAbove && !isOpen ? "translate-y-1" : !positionAbove && !isOpen ? "-translate-y-1" : ""
        )}
        style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}
      >
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Creativity</label>
              <span className="text-sm text-gray-600">{creativity}</span>
            </div>
            <Slider
              value={[creativity]}
              onValueChange={(value) => dispatch(setCreativity(value[0]))}
              min={0}
              max={6}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Expressivity</label>
              <span className="text-sm text-gray-600">{expressivity}</span>
            </div>
            <Slider
              value={[expressivity]}
              onValueChange={(value) => dispatch(setExpressivity(value[0]))}
              min={0}
              max={6}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Resemblance</label>
              <span className="text-sm text-gray-600">{resemblance}</span>
            </div>
            <Slider
              value={[resemblance]}
              onValueChange={(value) => dispatch(setResemblance(value[0]))}
              min={0}
              max={6}
              step={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

