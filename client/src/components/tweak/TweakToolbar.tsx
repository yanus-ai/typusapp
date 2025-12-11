import React, { useState, useEffect, useRef } from "react";
import {
  Edit3,
  Brush,
  Square,
  Play,
  Pencil,
  ImagePlus,
  Crop,
} from "lucide-react";
import { useCreditCheck } from "@/hooks/useCreditCheck";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setCanvasBounds, setPan, setZoom } from "@/features/tweak/tweakSlice";
import { Dropdown } from "@/components/ui/dropdown";
import { GenerateButton } from "@/components/creation-prompt/prompt-input/GenerateButton";

type OutpaintOption =
  | "Zoom out 1.5x"
  | "Zoom out 2x"
  | "Make square";

interface TweakToolbarProps {
  currentTool:
    | "select"
    | "region"
    | "cut"
    | "add"
    | "rectangle"
    | "brush"
    | "move"
    | "pencil"
    | "editByText";
  onToolChange: (
    tool:
      | "select"
      | "region"
      | "cut"
      | "add"
      | "rectangle"
      | "brush"
      | "move"
      | "pencil"
      | "editByText"
  ) => void;
  onGenerate: () => void;
  onAddImage?: (file: File) => void;
  prompt?: string;
  onPromptChange: (prompt: string) => void;
  variations?: number;
  onVariationsChange?: (variations: number) => void;
  disabled?: boolean;
  loading?: boolean;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  // New props for per-image generation tracking
  isGenerating?: boolean;
  selectedImageType?: "input" | "generated";
  selectedImageId?: number;
  generatingInputImageId?: number;
  operationType?: "outpaint" | "inpaint";
  // Outpaint option values
  outpaintOption?: OutpaintOption;
  onOutpaintOptionChange?: (option: OutpaintOption) => void;
  runFluxKonectHandler?: any;
  selectedImageUrl?: any;
}

const TweakToolbar: React.FC<TweakToolbarProps> = ({
  currentTool,
  onToolChange,
  onGenerate,
  prompt = "",
  onPromptChange,
  variations = 1,
  onVariationsChange,
  disabled = false,
  loading = false,
  selectedModel = 'nanobanana', // Default model is nanobanana
  onModelChange,
  // New props for per-image generation tracking
  isGenerating = false,
  selectedImageType,
  selectedImageId,
  generatingInputImageId,
  operationType = "outpaint",
  // Outpaint option values
  outpaintOption = "Zoom out 1.5x",
  onOutpaintOptionChange,
  runFluxKonectHandler,
}) => {
  const dispatch = useAppDispatch();
  const { canvasBounds, originalImageBounds } = useAppSelector(
    (state) => state.tweak
  );

  const [showOutpaintOptions, setShowOutpaintOptions] =
    useState<boolean>(false);

  const { checkCreditsBeforeAction } = useCreditCheck();

  // Reference images state for Edit By Text
  const [referenceImageUrls] = useState<string[]>([]);

  // Determine if we should show generation loading for current image
  const shouldShowGenerationLoading =
    isGenerating &&
    // For input images: show loading if this specific input image is generating
    ((selectedImageType === "input" &&
      selectedImageId === generatingInputImageId) ||
      // For generated images: show loading during immediate generation phase
      // (will be stopped by server response for generated images)
      selectedImageType === "generated");

  // Sync outpaint options visibility when currentTool changes
  useEffect(() => {
    const isDrawingTool =
      currentTool === "rectangle" ||
      currentTool === "brush" ||
      currentTool === "pencil";
    if (isDrawingTool) {
      setShowOutpaintOptions(false); // Hide outpaint options when switching to drawing tools
    }
  }, [currentTool]);

  // Center and fit the extended canvas properly (like reset zoom button)
  const centerAndFitExtendedCanvas = () => {
    // Simulate canvas dimensions (this should match TweakCanvas logic)
    const panelWidth = 396; // Width of side panels
    const padding = 150; // Padding from edges
    const canvasWidth = window.innerWidth; // Approximate canvas width
    const canvasHeight = window.innerHeight; // Approximate canvas height
    const availableWidth = canvasWidth - panelWidth - padding * 2;
    const availableHeight = canvasHeight - padding * 2;

    // Use current canvas bounds (which include extensions)
    const currentBounds = canvasBounds;

    const scaleX = availableWidth / currentBounds.width;
    const scaleY = availableHeight / currentBounds.height;
    const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size

    // Set zoom and center
    dispatch(setZoom(fitScale));
    dispatch(setPan({ x: 0, y: 0 })); // Center position
  };

  // Extend canvas boundaries based on outpaint option
  const extendCanvasBounds = (option: OutpaintOption) => {
    if (!originalImageBounds) return;

    // Always start from the original image bounds, not current canvas bounds
    const originalWidth = originalImageBounds.width;
    const originalHeight = originalImageBounds.height;

    let newBounds = { ...originalImageBounds };

    switch (option) {
      case "Zoom out 1.5x": {
        // Extend all sides by 25% to achieve 1.5x total size
        const extension15 = {
          horizontal: Math.round(originalWidth * 0.25),
          vertical: Math.round(originalHeight * 0.25),
        };
        newBounds = {
          x: originalImageBounds.x - extension15.horizontal / 2,
          y: originalImageBounds.y - extension15.vertical / 2,
          width: originalWidth + extension15.horizontal,
          height: originalHeight + extension15.vertical,
        };
        break;
      }

      case "Zoom out 2x": {
        // Extend all sides by 50% to achieve 2x total size
        const extension2x = {
          horizontal: Math.round(originalWidth * 0.5),
          vertical: Math.round(originalHeight * 0.5),
        };
        newBounds = {
          x: originalImageBounds.x - extension2x.horizontal / 2,
          y: originalImageBounds.y - extension2x.vertical / 2,
          width: originalWidth + extension2x.horizontal,
          height: originalHeight + extension2x.vertical,
        };
        break;
      }

      case "Make square": {
        // Make the canvas square by extending the shorter dimension
        const maxDimension = Math.max(originalWidth, originalHeight);
        const widthDiff = maxDimension - originalWidth;
        const heightDiff = maxDimension - originalHeight;
        newBounds = {
          x: originalImageBounds.x - widthDiff / 2,
          y: originalImageBounds.y - heightDiff / 2,
          width: maxDimension,
          height: maxDimension,
        };
        break;
      }

      default:
        return; // No extension for unknown options
    }

    console.log("🔧 Extending canvas bounds:", {
      option,
      original: originalImageBounds,
      current: canvasBounds,
      new: newBounds,
      extension: {
        left: newBounds.x - originalImageBounds.x,
        right:
          newBounds.x +
          newBounds.width -
          (originalImageBounds.x + originalImageBounds.width),
        top: newBounds.y - originalImageBounds.y,
        bottom:
          newBounds.y +
          newBounds.height -
          (originalImageBounds.y + originalImageBounds.height),
      },
    });

    // First reset to original bounds to clear any previous extensions
    dispatch(setCanvasBounds({ ...originalImageBounds }));

    // Then apply the new bounds after a small delay to ensure the reset is processed
    setTimeout(() => {
      dispatch(setCanvasBounds(newBounds));

      // Center and fit the extended canvas after another delay
      setTimeout(() => {
        centerAndFitExtendedCanvas();
      }, 100);
    }, 50);
  };

  // Handle generate with credit check
  const handleGenerateWithCreditCheck = () => {
    // Check credits before proceeding with generation
    if (!checkCreditsBeforeAction(1)) {
      return; // Credit check handles the error display
    }

    // If credit check passes, proceed with generation. Use Flux handler for editByText
    if (currentTool === "editByText") {
      if (typeof runFluxKonectHandler === "function") {
        runFluxKonectHandler({ referenceImageUrls });
      } else {
        // Fallback to the generic onGenerate if Flux handler not provided
        onGenerate();
      }
    } else {
      onGenerate();
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 20;
      const maxHeight = 200;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [prompt]);

  const VARIANT_OPTIONS = ["1", "2"] as const;

  // Model options for Edit By Text
  const editByTextModelOptions = [
    { label: 'Nano Banana', value: "nanobanana" },
    { label: "Qwen-Image", value: "qwen-image" },
  ];

  // Top tools (drawing tools)
  const topToolButtons = [
    {
      id: "rectangle" as const,
      icon: Square,
      label: "Rectangle",
      onClick: () => {
        setShowOutpaintOptions(false);
        if (originalImageBounds) {
          dispatch(setCanvasBounds(originalImageBounds));
          setTimeout(() => {
            centerAndFitExtendedCanvas();
          }, 50);
        }
        onToolChange("rectangle");
      },
    },
    {
      id: "brush" as const,
      icon: Brush,
      label: "Brush",
      onClick: () => {
        setShowOutpaintOptions(false);
        if (originalImageBounds) {
          dispatch(setCanvasBounds(originalImageBounds));
          setTimeout(() => {
            centerAndFitExtendedCanvas();
          }, 50);
        }
        onToolChange("brush");
      },
    },
    {
      id: "pencil" as const,
      icon: Pencil,
      label: "Pencil",
      onClick: () => {
        setShowOutpaintOptions(false);
        if (originalImageBounds) {
          dispatch(setCanvasBounds(originalImageBounds));
          setTimeout(() => {
            centerAndFitExtendedCanvas();
          }, 50);
        }
        onToolChange("pencil");
      },
    },
  ];

  // Bottom tools (action tools)
  const bottomToolButtons = [
    {
      id: "editByText" as const,
      icon: Edit3,
      label: "Edit By Text",
      onClick: () => {
        onToolChange("editByText");
        setShowOutpaintOptions(false);
      },
      disabled: false,
    },
    {
      id: "editByArea" as const,
      icon: Crop,
      label: "Edit By Area",
      onClick: () => {
        setShowOutpaintOptions(false);
        if (originalImageBounds) {
          dispatch(setCanvasBounds(originalImageBounds));
          setTimeout(() => {
            centerAndFitExtendedCanvas();
          }, 50);
        }
        // Switch to rectangle tool (default drawing tool)
        onToolChange("rectangle");
      },
      disabled: false,
      isActive: () => currentTool === "rectangle" || currentTool === "brush" || currentTool === "pencil",
    },
    {
      id: "select" as const,
      icon: Play,
      label: "Expand Border",
      onClick: () => {
        setShowOutpaintOptions(true);
        onToolChange("select");
      },
      disabled: false,
    },
    {
      id: "addStyleImage" as const,
      icon: ImagePlus,
      label: "Add Style Image",
      onClick: () => {
        // Temporarily disabled
      },
      disabled: true,
    },
  ];

  // Outpaint options dropdown
  const outpaintOptions: {
    value: OutpaintOption;
    label: string;
  }[] = [
    { value: "Zoom out 1.5x", label: "Zoom out 1.5x" },
    { value: "Zoom out 2x", label: "Zoom out 2x" },
    { value: "Make square", label: "Make square" },
  ];

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="border-gray-300 relative space-y-1 rounded-none border-[0.5px] bg-white p-3 pt-1.5 shadow-lg transition-shadow duration-200 ease-out has-[textarea:focus]:shadow-[0px_0px_0px_3px_rgb(235,235,235)] max-w-full w-[715px]">
          {/* Top tools (drawing tools) and their custom options */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {topToolButtons.map((button) => {
              const Icon = button.icon;
              const isActive = currentTool === button.id;

              return (
                <button
                  key={button.id}
                  onClick={button.onClick}
                  className={`px-2 py-2 border cursor-pointer shadow-none rounded-none transition-colors text-xs flex items-center gap-2 ${
                    isActive
                      ? "bg-black text-white border-black"
                      : "hover:border-gray-200 hover:bg-gray-50 bg-transparent border-transparent"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={button.label}
                >
                  <Icon size={16} />
                  <span className="whitespace-nowrap">{button.label}</span>
                </button>
              );
            })}

            {/* Outpaint options dropdown - shown only when Expand Border (select) tool is active */}
            {currentTool === "select" && showOutpaintOptions && operationType === "outpaint" && (
              <Dropdown
                options={outpaintOptions.map(opt => opt.label)}
                value={outpaintOptions.find(opt => opt.value === outpaintOption)?.label || outpaintOptions[0].label}
                defaultValue={outpaintOptions[0].label}
                onChange={(v) => {
                  const option = outpaintOptions.find(opt => opt.label === v);
                  if (option) {
                    onOutpaintOptionChange?.(option.value);
                    extendCanvasBounds(option.value);
                  }
                }}
                ariaLabel="Outpaint Option"
                tooltipText="Outpaint Option"
                tooltipDirection="bottom"
              />
            )}

            {/* Model selector dropdown - shown only when Edit By Text tool is active */}
            {currentTool === "editByText" && (
              <Dropdown
                options={editByTextModelOptions.map(opt => opt.label)}
                value={editByTextModelOptions.find(opt => opt.value === selectedModel)?.label || editByTextModelOptions[0].label}
                defaultValue={editByTextModelOptions[0].label}
                onChange={(v) => {
                  const option = editByTextModelOptions.find(opt => opt.label === v);
                  if (option && onModelChange) {
                    onModelChange(option.value);
                  }
                }}
                ariaLabel="Model"
                tooltipText="Select model for Edit By Text"
                tooltipDirection="bottom"
              />
            )}
          </div>

          {/* Textarea in middle */}
          <div className="w-full mb-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={
                currentTool === "editByText"
                  ? "Describe how you want to edit the image"
                  : "Draw a region on your image and describe what you want to see in this area."
              }
              className="prompt-textarea-scrollbar mb-0 w-full flex-1 resize-none border-none bg-transparent pl-3 pr-3 py-2 text-black outline-none placeholder:text-neutral-400 text-base leading-relaxed overflow-y-auto"
              style={{
                minHeight: '42px',
                maxHeight: '93px',
              }}
              rows={1}
            />
          </div>

          {/* Bottom row: Bottom tools, Variations, and Generate button */}
          <div className="flex items-end justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* Bottom tool buttons */}
              {bottomToolButtons.map((button) => {
                const Icon = button.icon;
                const isActive = button.isActive 
                  ? button.isActive() 
                  : currentTool === button.id;
                const isDisabled = button.disabled || false;

                return (
                  <button
                    key={button.id}
                    onClick={button.onClick}
                    disabled={isDisabled}
                    className={`px-2 py-2 border cursor-pointer shadow-none rounded-none transition-colors text-xs flex items-center gap-2 ${
                      isActive
                        ? "bg-black text-white border-black"
                        : "bg-transparent hover:border-gray-200 hover:bg-gray-50 border-transparent"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={button.label}
                  >
                    <Icon size={16} />
                    <span className="whitespace-nowrap">{button.label}</span>
                  </button>
                );
              })}

              {/* Variations dropdown */}
              <Dropdown
                options={[...VARIANT_OPTIONS]}
                value={variations.toString()}
                defaultValue={VARIANT_OPTIONS[0]}
                onChange={(v) => onVariationsChange?.(Number(v))}
                ariaLabel="Variations Count"
                tooltipText="Variations Count"
                tooltipDirection="bottom"
              />
            </div>

            {/* Generate button at the end */}
            <GenerateButton
              onClick={handleGenerateWithCreditCheck}
              isGenerating={loading || shouldShowGenerationLoading}
              disabled={disabled || loading || shouldShowGenerationLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default TweakToolbar;
export type { OutpaintOption };