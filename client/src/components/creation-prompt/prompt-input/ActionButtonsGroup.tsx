import { SettingsButton } from "./SettingsButton";
import { Dropdown } from "@/components/ui/dropdown";
import { IconAspectRatio, IconInfoCircle } from "@tabler/icons-react";
import { CreateRegionsButton } from "./CreateRegionsButton";
import { setSelectedStyle, setVariations, setAspectRatio, setSize } from "@/features/customization/customizationSlice";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useMemo, useState, useEffect } from "react";
import { setSelectedModel } from "@/features/tweak/tweakSlice";
import { CustomDialog } from "../ui/CustomDialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { ColorMapInfoDialog } from "./ColorMapInfoDialog";
import { setIsCatalogOpen } from "@/features/create/createUISlice";
import toast from "react-hot-toast";
import { cn } from "@/utils/helpers";

const ASPECT_RATIO_OPTIONS = [
  "Match Input",
  "16:9",
  "9:16",
  "1:1",
  "4:3",
  "3:4",
] as const;
export type AspectRatioOption = (typeof ASPECT_RATIO_OPTIONS)[number];

// Style options will be created dynamically with translations

export type SizeOption = "1K" | "2K" | "4K";

const VARIANT_OPTIONS = ["1", "2", "3", "4"] as const;
export type VariantOption = (typeof VARIANT_OPTIONS)[number];

const COLOR_MAP_DIALOG_PREFERENCE_KEY = "sdxl_colormap_dialog_dont_show";

interface ActionButtonsGroupProps {
  currentStep?: number;
  setCurrentStep?: (step: number) => void;
}

export function ActionButtonsGroup({ currentStep, setCurrentStep }: ActionButtonsGroupProps = {} as ActionButtonsGroupProps) {
  const { selectedStyle, variations, aspectRatio, size } = useAppSelector((state) => state.customization);
  const { selectedModel } = useAppSelector((state) => state.tweak);
  const subscription = useAppSelector((state) => state.auth.subscription);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showProPlanDialog, setShowProPlanDialog] = useState(false);
  const [show4KProDialog, setShow4KProDialog] = useState(false);
  const [showColorMapDialog, setShowColorMapDialog] = useState(false);

  const STYLE_OPTIONS = useMemo(() => [
    { label: t('create.styleOptions.photorealistic'), value: "photorealistic" },
    { label: t('create.styleOptions.art'), value: "art" },
  ] as const, [t]);

  // Check if user has opted out of seeing the color map dialog
  const shouldShowColorMapDialog = () => {
    const dontShow = localStorage.getItem(COLOR_MAP_DIALOG_PREFERENCE_KEY);
    return dontShow !== "true";
  };

  const handleDontShowColorMapAgain = () => {
    localStorage.setItem(COLOR_MAP_DIALOG_PREFERENCE_KEY, "true");
  };

  // Switch to nanobanana model during onboarding step 6
  useEffect(() => {
    if (currentStep === 1) {
      // Switch to SDXL model for onboarding
      dispatch(setSelectedModel("sdxl"));
    } else if (currentStep === 0 || currentStep === 2) {
      dispatch(setSelectedModel("nanobanana"));
    }
  }, [currentStep, dispatch]);

  // When SDXL is selected, disable all buttons except Create Regions
  const isSDXL = selectedModel === "sdxl";
  // Settings (expressivity, creativity, etc.) should only be available for SDXL
  const isSettingsEnabled = isSDXL;
  const hasProAccess = subscription?.planType === 'PRO' && subscription?.status === 'ACTIVE';

  const modelOptions = useMemo(() => {
    const proLabel = hasProAccess ? t('create.modelOptions.nanoBananaPro') : t('create.modelOptions.nanoBananaProProOnly');
    const options = [
      { label: t('create.modelOptions.nanoBanana'), value: "nanobanana" },
      { label: proLabel, value: "nanobananapro" },
      { label: t('create.modelOptions.seedream4'), value: "seedream4" },
      { label: t('create.modelOptions.sdxl'), value: "sdxl" },
    ];
    return options;
  }, [subscription, hasProAccess, t])

  const handleModelChange = (value: typeof modelOptions[number]["value"]) => {
    if (value === "nanobananapro" && !hasProAccess) {
      setShowProPlanDialog(true);
      return;
    }
    dispatch(setSelectedModel(value));
    // When switching away from SDXL to other models, reset style to photorealistic
    if (selectedModel === "sdxl" && value !== "sdxl") {
      dispatch(setSelectedStyle("photorealistic"));
    }
    // When switching to nanobanana or seedream4, automatically set size to 2K
    if (value === "nanobanana" || value === "seedream4") {
      dispatch(setSize("2K"));
    }
    // When switching to nanobananapro, automatically set size to 4K
    if (value === "nanobananapro") {
      dispatch(setSize("4K"));
    }
    // Show color map dialog when SDXL is selected (if user hasn't opted out)
    if (value === "sdxl" && shouldShowColorMapDialog()) {
      setShowColorMapDialog(true);
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

  // Reset style to photorealistic when switching away from SDXL
  useEffect(() => {
    if (selectedModel !== "sdxl" && selectedStyle === "art") {
      dispatch(setSelectedStyle("photorealistic"));
    }
  }, [selectedModel, selectedStyle, dispatch]);

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
      <div
        className={cn(
          currentStep === 1 ? "z-[1001] relative bg-white" : ""
        )}
      >
        <Dropdown
          options={[...modelOptions]}
          value={displayModel}
          defaultValue={modelOptions[0].value}
          onChange={handleModelChange}
          ariaLabel={t('create.model')}
          tooltipText={t('create.model')}
          tooltipDirection="bottom"
          disabled={false} // Model selection should always be enabled
        />
      </div>

      {selectedModel === "sdxl" && (
        <div className="flex items-center gap-1">
          <CreateRegionsButton />
          <button
            type="button"
            onClick={() => setShowColorMapDialog(true)}
            className="px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-none transition-colors hover:bg-gray-50 cursor-pointer flex items-center justify-center"
            aria-label={t('create.showColorMapInfo')}
            title={t('create.colorMapExamples')}
          >
            <IconInfoCircle size={16} className="text-gray-600" />
          </button>
        </div>
      )}

      <Dropdown
        options={[...ASPECT_RATIO_OPTIONS]}
        value={aspectRatio}
        defaultValue={"16:9"}
        onChange={(v) => dispatch(setAspectRatio(v as AspectRatioOption))}
        ariaLabel={t('create.aspectRatio')}
        tooltipText={t('create.aspectRatio')}
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
        onChange={(v) => {
          const newStyle = v as "photorealistic" | "art";
          if (newStyle === "art") {
            // Switch to SDXL when art mode is selected
            dispatch(setSelectedModel("sdxl"));
            // Show notification
            toast(t('create.artModeOnlySDXL'), {
              icon: 'ℹ️',
              duration: 3000,
              position: 'top-right',
            });
            // Open catalog automatically
            dispatch(setIsCatalogOpen(true));
          }
          dispatch(setSelectedStyle(newStyle));
        }}
        ariaLabel={t('create.imageStyle')}
        tooltipText={t('create.imageStyle')}
        tooltipDirection="bottom"
        disabled={isSDXL}
      />

      <Dropdown
        options={[...sizeOptions]}
        value={sizeOptions.includes(size) ? size : sizeOptions[0]} // Ensure value is valid for current model
        defaultValue={sizeOptions[0]} // Default to first available option
        onChange={handleSizeChange}
        ariaLabel={t('create.imageSize')}
        tooltipText={t('create.imageSize')}
        tooltipDirection="bottom"
        disabled={selectedModel === "nanobananapro"} // Disable for nanobanana (2K only), seedream4 (2K only), and nanobananapro (4K only). SDXL dropdown is enabled to allow 4K selection.
      />

      <Dropdown
        options={[...VARIANT_OPTIONS]}
        value={variations.toString()}
        defaultValue={VARIANT_OPTIONS[1]} // Default to 2
        onChange={(v) => dispatch(setVariations(Number(v)))}
        ariaLabel={t('create.variationsCount')}
        tooltipText={t('create.variationsCount')}
        tooltipDirection="bottom"
        disabled={isSDXL || size === '1K' || size === '4K'} // Disable when 1K or 4K is selected
      />
      {isSettingsEnabled && <SettingsButton disabled={!isSettingsEnabled} />}

      <CustomDialog
        open={showProPlanDialog}
        onClose={() => setShowProPlanDialog(false)}
        title={t('create.proPlanDialog.title')}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('create.proPlanDialog.description')}
          </p>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-none space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t('create.proPlanDialog.highlights')}</span>
            </div>
            <ul className="list-disc ml-5 space-y-1">
              <li>{t('create.proPlanDialog.creditsPerMonth')}</li>
              <li>{t('create.proPlanDialog.resolutionUpTo13K')}</li>
              <li>{t('create.proPlanDialog.premiumSupport')}</li>
              <li>{t('create.proPlanDialog.pluginIntegrations')}</li>
            </ul>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowProPlanDialog(false)} size="sm">
              {t('create.proPlanDialog.maybeLater')}
            </Button>
            <Button onClick={handleViewPlans} size="sm">
              {t('create.proPlanDialog.viewPlans')}
            </Button>
          </div>
        </div>
      </CustomDialog>

      <CustomDialog
        open={show4KProDialog}
        onClose={() => setShow4KProDialog(false)}
        title={t('create.pro4KDialog.title')}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('create.pro4KDialog.description')}
          </p>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-none space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {t('create.pro4KDialog.highlights')}
              </span>
            </div>
            <ul className="list-disc ml-5 space-y-1">
              <li>{t('create.pro4KDialog.creditsPerMonth')}</li>
              <li>{t('create.pro4KDialog.resolutionSupport')}</li>
              <li>{t('create.pro4KDialog.modelAccess')}</li>
              <li>{t('create.pro4KDialog.resolutionUpTo13K')}</li>
              <li>{t('create.pro4KDialog.premiumSupport')}</li>
              <li>{t('create.pro4KDialog.pluginIntegrations')}</li>
            </ul>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShow4KProDialog(false)} size="sm">
              {t('create.pro4KDialog.maybeLater')}
            </Button>
            <Button onClick={() => {
              setShow4KProDialog(false);
              navigate("/subscription");
            }} size="sm">
              {t('create.pro4KDialog.viewPlans')}
            </Button>
          </div>
        </div>
      </CustomDialog>

      <ColorMapInfoDialog
        open={showColorMapDialog}
        onClose={() => {
          setShowColorMapDialog(false);
          // Advance to next step if in onboarding
          if (currentStep === 7 && setCurrentStep) {
            setCurrentStep(8);
          }
        }}
        onDontShowAgain={handleDontShowColorMapAgain}
      />
    </div>
  );
}
