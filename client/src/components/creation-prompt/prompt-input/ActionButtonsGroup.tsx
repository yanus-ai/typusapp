import { ImageTypeButton } from "./ImageTypeButton";
import { SettingsButton } from "./SettingsButton";
import { TexturesButton } from "./TexturesButton";
import { Dropdown } from "@/components/ui/dropdown";
import { IconAspectRatio } from "@tabler/icons-react";
import { CreateRegionsButton } from "./CreateRegionsButton";
import { setSelectedStyle, setVariations, setAspectRatio, setSize } from "@/features/customization/customizationSlice";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";

interface ActionButtonsGroupProps {
  onTexturesClick?: () => void;
  onCreateRegionsClick?: () => void;
  onNewSession?: () => void;
}

const MODEL_OPTIONS = [
  { label: "Nano Banana", value: "nanobanana" },
  { label: "Seedream 4", value: "seedream4" },
  { label: "SDXL", value: "sdxl" },
] as const;

const ASPECT_RATIO_OPTIONS = [
  "Match Input",
  "16:9",
  "9:16",
  "1:1",
  "4:3",
  "3:4",
] as const;
export type AspectRatioOption = (typeof ASPECT_RATIO_OPTIONS)[number];

const STYLE_OPTIONS = [
  { label: "Photorealistic", value: "photorealistic" },
  { label: "Art", value: "art" },
] as const;

const SIZE_OPTIONS = ["1K", "2K", "4K"] as const;
export type SizeOption = (typeof SIZE_OPTIONS)[number];

const VARIANT_OPTIONS = ["1", "2", "3", "4"] as const;
export type VariantOption = (typeof VARIANT_OPTIONS)[number];

export function ActionButtonsGroup({
  onTexturesClick,
  onCreateRegionsClick,
  onNewSession,
}: ActionButtonsGroupProps) {
  const { selectedStyle, variations, aspectRatio, size } = useAppSelector((state) => state.customization);
  const { selectedModel } = useAppSelector((state) => state.tweak);

  const dispatch = useAppDispatch();

  // When SDXL is selected, disable all buttons except Create Regions
  const isSDXL = selectedModel === "sdxl";
  // Settings (expressivity, creativity, etc.) should only be available for SDXL
  const isSettingsEnabled = isSDXL;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onNewSession && (
        <button
          onClick={onNewSession}
          className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
          title="New Session"
        >
          New Session
        </button>
      )}
      <Dropdown
        options={[...MODEL_OPTIONS]}
        value={selectedModel}
        defaultValue={MODEL_OPTIONS[0].value}
        onChange={(v) =>
          dispatch({
            type: "tweak/setSelectedModel",
            payload: v as (typeof MODEL_OPTIONS)[number]["value"],
          })
        }
        ariaLabel="Model"
        tooltipText="Model"
        tooltipDirection="bottom"
        disabled={false} // Model selection should always be enabled
      />
      <ImageTypeButton disabled={isSDXL} />

      {selectedModel !== "sdxl" && (
        <TexturesButton onTexturesClick={onTexturesClick} />
      )}

      {selectedModel === "sdxl" && <CreateRegionsButton onClick={onCreateRegionsClick} />}

      <Dropdown
        options={[...ASPECT_RATIO_OPTIONS]}
        value={aspectRatio}
        defaultValue={"16:9"}
        onChange={(v) => dispatch(setAspectRatio(v as AspectRatioOption))}
        ariaLabel="Aspect Ratio"
        tooltipText="Aspect Ratio"
        tooltipDirection="bottom"
        disabled={isSDXL}
        renderLabel={(v) => (
          <div className="flex items-center justify-center space-x-2 text-xs">
            <IconAspectRatio size={16} />
            <span className="font-sans">{v}</span>
          </div>
        )}
      />
      <Dropdown
        options={[...STYLE_OPTIONS]}
        value={selectedStyle}
        defaultValue="photorealistic"
        onChange={(v) =>
          dispatch(setSelectedStyle(v as "photorealistic" | "art"))
        }
        ariaLabel="Image Style"
        tooltipText="Image Style"
        tooltipDirection="bottom"
        disabled={isSDXL}
      />
      <Dropdown
        options={[...SIZE_OPTIONS]}
        value={size}
        defaultValue={SIZE_OPTIONS[1]} // Default to 2K
        onChange={(v) => dispatch(setSize(v as SizeOption))}
        ariaLabel="Image Size"
        tooltipText="Image Size"
        tooltipDirection="bottom"
        disabled={isSDXL}
      />
      <Dropdown
        options={[...VARIANT_OPTIONS]}
        value={variations.toString()}
        defaultValue={VARIANT_OPTIONS[1]} // Default to 2
        onChange={(v) => dispatch(setVariations(Number(v)))}
        ariaLabel="Variations Count"
        tooltipText="Variations Count"
        tooltipDirection="bottom"
        disabled={isSDXL || size === '1K' || size === '4K'} // Disable when 1K or 4K is selected
      />
      {isSettingsEnabled && <SettingsButton disabled={!isSettingsEnabled} />}
    </div>
  );
}
