import { SettingsButton } from "./SettingsButton";
import { Dropdown } from "@/components/ui/dropdown";
import { IconAspectRatio } from "@tabler/icons-react";
import { CreateRegionsButton } from "./CreateRegionsButton";
import { setSelectedStyle, setVariations, setAspectRatio, setSize } from "@/features/customization/customizationSlice";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useMemo, useState, useEffect } from "react";
import { setSelectedModel } from "@/features/tweak/tweakSlice";
import { CustomDialog } from "../ui/CustomDialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useClientLanguage } from "@/hooks/useClientLanguage";

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

export function ActionButtonsGroup() {
  const { selectedStyle, variations, aspectRatio, size } = useAppSelector((state) => state.customization);
  const { selectedModel } = useAppSelector((state) => state.tweak);
  const subscription = useAppSelector((state) => state.auth.subscription);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const language = useClientLanguage();
  const [showProPlanDialog, setShowProPlanDialog] = useState(false);
  const [show4KProDialog, setShow4KProDialog] = useState(false);

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
    // When switching to nanobanana or seedream4, automatically set size to 2K
    if (value === "nanobanana" || value === "seedream4") {
      dispatch(setSize("2K"));
    }
    // When switching to nanobananapro, automatically set size to 4K
    if (value === "nanobananapro") {
      dispatch(setSize("4K"));
    }
  }

  const handleViewPlans = () => {
    setShowProPlanDialog(false);
    navigate("/subscription");
  };

  // Ensure the displayed value is always a valid option
  const displayModel = modelOptions.find(opt => opt.value === selectedModel) 
    ? selectedModel 
    : modelOptions[0].value;

  // Ensure size is set correctly based on model
  useEffect(() => {
    if ((selectedModel === "nanobanana" || selectedModel === "seedream4") && size !== "2K") {
      dispatch(setSize("2K"));
    }
    if (selectedModel === "nanobananapro" && size !== "4K") {
      dispatch(setSize("4K"));
    }
  }, [selectedModel, size, dispatch]);

  const sizeOptions = useMemo(() => {
    if (selectedModel === "nanobanana" || selectedModel === "seedream4") {
      return ["2K", "4K"];
    }
    if (selectedModel === "nanobananapro") {
      return ["4K"];
    }
    // For SDXL, show all options including 4K
    return ["1K", "2K", "4K"];
  }, [selectedModel]);

  const handleSizeChange = (value: string) => {
    const sizeValue = value as SizeOption;
    // If user selects 4K
    if (sizeValue === "4K") {
      // Check if user has PRO access
      if (hasProAccess) {
        // Auto-switch to nanobananapro model
        dispatch(setSelectedModel("nanobananapro"));
        dispatch(setSize("4K"));
      } else {
        // Show dialog for non-PRO users
        setShow4KProDialog(true);
        // Don't change the size - keep current selection
        return;
      }
    } else {
      // For other sizes, just update normally
      dispatch(setSize(sizeValue));
    }
  };

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

      {selectedModel === "sdxl" && <CreateRegionsButton />}

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
        value={sizeOptions.includes(size) ? size : sizeOptions[0]} // Ensure value is valid for current model
        defaultValue={sizeOptions[0]} // Default to first available option
        onChange={handleSizeChange}
        ariaLabel="Image Size"
        tooltipText="Image Size"
        tooltipDirection="bottom"
        disabled={selectedModel === "nanobananapro"} // Disable for nanobanana (2K only), seedream4 (2K only), and nanobananapro (4K only). SDXL dropdown is enabled to allow 4K selection.
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

      <CustomDialog
        open={show4KProDialog}
        onClose={() => setShow4KProDialog(false)}
        title={language === 'de' ? '4K-Auflösung erfordert den Pro-Plan' : '4K resolution requires the Pro plan'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {language === 'de' 
              ? '4K-Auflösung ist nur für Pro-Plan-Abonnenten verfügbar. Upgraden Sie, um höhere Auflösungen zusammen mit dem Nano Banana Pro-Modell, schnelleren Generierungsgeschwindigkeiten und mehr freizuschalten.'
              : '4K resolution is only available for Pro plan subscribers. Upgrade to unlock higher resolutions along with Nano Banana Pro model, faster generation speeds, and more.'}
          </p>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-none space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {language === 'de' ? 'Pro-Plan-Highlights' : 'Pro Plan Highlights'}
              </span>
            </div>
            <ul className="list-disc ml-5 space-y-1">
              <li>{language === 'de' ? '1000 Credits pro Monat' : '1000 credits per month'}</li>
              <li>{language === 'de' ? '4K-Auflösungsunterstützung' : '4K resolution support'}</li>
              <li>{language === 'de' ? 'Zugang zum Nano Banana Pro-Modell' : 'Nano Banana Pro model access'}</li>
              <li>{language === 'de' ? 'Auflösung bis zu 13K' : 'Resolution up to 13K'}</li>
              <li>{language === 'de' ? 'Premium Live-Video-Unterstützung' : 'Premium live video support'}</li>
              <li>{language === 'de' ? 'Alle Plugin-Integrationen & Bearbeitung per Chat' : 'All plugin integrations & edit by chat'}</li>
            </ul>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShow4KProDialog(false)} size="sm">
              {language === 'de' ? 'Vielleicht später' : 'Maybe later'}
            </Button>
            <Button onClick={() => {
              setShow4KProDialog(false);
              navigate("/subscription");
            }} size="sm">
              {language === 'de' ? 'Abonnementpläne anzeigen' : 'View subscription plans'}
            </Button>
          </div>
        </div>
      </CustomDialog>
    </div>
  );
}
