import { ImageTypeButton } from "./ImageTypeButton";
import { SettingsButton } from "./SettingsButton";
import { RandomPromptButton } from "./RandomPromptButton";
import { TexturesButton } from "./TexturesButton";
import { Dropdown } from "@/components/ui/dropdown";
import { IconAspectRatio } from "@tabler/icons-react";
import { CreateRegionsButton } from "./CreateRegionsButton";
import { setSelectedStyle, setVariations } from "@/features/customization/customizationSlice";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useState } from "react";

interface ActionButtonsGroupProps {
  onTexturesClick?: () => void;
}

const MODEL_OPTIONS = [
  { label: "Nano Banana", value: "nanobanana" },
  { label: "Seed Dream 4", value: "seedream4" },
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
}: ActionButtonsGroupProps) {
  const { selectedStyle, variations } = useAppSelector((state) => state.customization);
  const { selectedModel } = useAppSelector((state) => state.tweak);

  const dispatch = useAppDispatch();

  const [selectedAspectRatio, setSelectedAspectRatio] =
    useState<AspectRatioOption>("16:9");
  const [selectedSize, setSelectedSize] = useState<SizeOption>("1K");

  return (
    <div className="flex flex-wrap items-center">
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
      />
      <ImageTypeButton />

      {selectedModel !== "sdxl" && (
        <TexturesButton onTexturesClick={onTexturesClick} />
      )}

      {selectedModel === "sdxl" && <CreateRegionsButton />}

      <Dropdown
        options={[...ASPECT_RATIO_OPTIONS]}
        value={selectedAspectRatio}
        defaultValue={"16:9"}
        onChange={(v) => setSelectedAspectRatio(v as AspectRatioOption)}
        ariaLabel="Aspect Ratio"
        tooltipText="Aspect Ratio"
        tooltipDirection="bottom"
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
      />
      <Dropdown
        options={[...SIZE_OPTIONS]}
        value={selectedSize}
        defaultValue={SIZE_OPTIONS[0]}
        onChange={(v) => setSelectedSize(v as SizeOption)}
        ariaLabel="Image Size"
        tooltipText="Image Size"
        tooltipDirection="bottom"
      />
      <Dropdown
        options={[...VARIANT_OPTIONS]}
        value={variations.toString()}
        defaultValue={VARIANT_OPTIONS[0]}
        onChange={(v) => dispatch(setVariations(Number(v)))}
        ariaLabel="Variations Count"
        tooltipText="Variations Count"
        tooltipDirection="bottom"
      />
      <SettingsButton />
      <RandomPromptButton />
    </div>
  );
}
