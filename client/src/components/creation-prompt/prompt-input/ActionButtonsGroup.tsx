import { ImageTypeButton } from "./ImageTypeButton";
import { SettingsButton } from "./SettingsButton";
import { TexturesButton } from "./TexturesButton";
import { Dropdown } from "@/components/ui/dropdown";
import { IconAspectRatio } from "@tabler/icons-react";
import { CreateRegionsButton } from "./CreateRegionsButton";
import { setSelectedStyle, setVariations, setAspectRatio, setSize } from "@/features/customization/customizationSlice";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useMemo, useState } from "react";
import { setSelectedModel } from "@/features/tweak/tweakSlice";
import { CustomDialog } from "../ui/CustomDialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ActionButtonsGroupProps {
  onTexturesClick?: () => void;
  onCreateRegionsClick?: () => void;
  onNewSession?: () => void;
  setIsCatalogOpen?: (isOpen: boolean) => void;
}

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

export type SizeOption = "1K" | "2K" | "4K";

const VARIANT_OPTIONS = ["1", "2", "3", "4"] as const;
export type VariantOption = (typeof VARIANT_OPTIONS)[number];

export function ActionButtonsGroup({
  onTexturesClick,
  setIsCatalogOpen,
}: ActionButtonsGroupProps) {
  const { selectedStyle, variations, aspectRatio, size } = useAppSelector((state) => state.customization);
  const { selectedModel } = useAppSelector((state) => state.tweak);
  const subscription = useAppSelector((state) => state.auth.subscription);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showProPlanDialog, setShowProPlanDialog] = useState(false);

  // When SDXL is selected, disable all buttons except Create Regions
  const isSDXL = selectedModel === "sdxl";
  // Settings (expressivity, creativity, etc.) should only be available for SDXL
  const isSettingsEnabled = isSDXL;
  const hasProAccess = subscription?.planType === 'PRO' && subscription?.status === 'ACTIVE';

  const modelOptions = useMemo(() => {
    const proLabel = hasProAccess ? "Nano Banana Pro" : "Nano Banana Pro (PRO only)";
    const options = [
      { label: 'Nano Banana', value: "nanobanana" },
      { label: proLabel, value: "nanobananapro" },
      { label: "Seedream 4", value: "seedream4" },
      { label: "SDXL", value: "sdxl" },
    ];
    return options;
  }, [subscription, hasProAccess])

  const handleModelChange = (value: typeof modelOptions[number]["value"]) => {
    if (value === "nanobananapro" && !hasProAccess) {
      setShowProPlanDialog(true);
      return;
    }
    dispatch(setSelectedModel(value));
  }

  const handleViewPlans = () => {
    setShowProPlanDialog(false);
    navigate("/subscription");
  };

  // Ensure the displayed value is always a valid option
  const displayModel = modelOptions.find(opt => opt.value === selectedModel) 
    ? selectedModel 
    : modelOptions[0].value;

  // Temporary disabled 4K for Seedream 4
  const sizeOptions = selectedModel === "seedream4" ? ["1K", "2K"] : ["1K", "2K", "4K"];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown
        options={[...modelOptions]}
        value={displayModel}
        defaultValue={modelOptions[0].value}
        onChange={handleModelChange}
        ariaLabel="Model"
        tooltipText="Model"
        tooltipDirection="bottom"
        disabled={false} // Model selection should always be enabled
      />

      <ImageTypeButton />

      {selectedModel !== "sdxl" && (
        <TexturesButton onTexturesClick={onTexturesClick} />
      )}

      {selectedModel === "sdxl" && <CreateRegionsButton setIsCatalogOpen={setIsCatalogOpen} />}

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
        options={[...sizeOptions]}
        value={size}
        defaultValue={sizeOptions[1]} // Default to 2K
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

      <CustomDialog
        open={showProPlanDialog}
        onClose={() => setShowProPlanDialog(false)}
        title="Nano Banana Pro requires the Pro plan"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upgrade to the Pro plan to unlock Nano Banana Pro along with faster generation speeds,
            4 concurrent jobs, higher resolutions, premium support, and more.
          </p>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-none space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Pro Plan Highlights</span>
            </div>
            <ul className="list-disc ml-5 space-y-1">
              <li>1000 credits per month</li>
              <li>Resolution up to 13K</li>
              <li>Premium live video support</li>
              <li>All plugin integrations & edit by chat</li>
            </ul>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowProPlanDialog(false)} size="sm">
              Maybe later
            </Button>
            <Button onClick={handleViewPlans} size="sm">
              View subscription plans
            </Button>
          </div>
        </div>
      </CustomDialog>
    </div>
  );
}
