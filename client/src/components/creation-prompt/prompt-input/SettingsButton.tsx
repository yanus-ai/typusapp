import { SlidersHorizontalIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import LightTooltip from "@/components/ui/light-tooltip";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setCreativity, setExpressivity, setResemblance } from "@/features/customization/customizationSlice";

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { creativity, resemblance, expressivity } = useAppSelector(state => state.customization)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useAppDispatch();

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
      <LightTooltip text="Settings" direction="bottom">
        <button
          type="button"
          aria-label="Settings"
          aria-expanded={isOpen}
          className={cn(
            "px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-lg transition-colors hover:bg-gray-50 cursor-pointer text-xs"
          )}
          onClick={() => setIsOpen((v) => !v)}
        >
          <SlidersHorizontalIcon size={16} />
        </button>
      </LightTooltip>

      {/* Settings Dropdown */}
      <div
        role="dialog"
        aria-label="Settings"
        className={cn(
          "absolute z-20 mt-1 right-0 w-[280px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg",
          "origin-top-right transition-all duration-150 ease-out",
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "pointer-events-none opacity-0 scale-95 -translate-y-1"
        )}
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

