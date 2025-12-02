import React, { useState, useEffect } from "react";
import {
  Edit3,
  Brush,
  ImagePlus,
  Sparkles,
  Square,
  Play,
  Move,
  Pencil,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import loader from "@/assets/animations/loader.lottie";
import { useCreditCheck } from "@/hooks/useCreditCheck";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setCanvasBounds, setPan, setZoom } from "@/features/tweak/tweakSlice";
import { uploadInputImage } from "@/features/images/inputImagesSlice";
import { X } from "lucide-react";

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
  onAddImage,
  prompt = "",
  onPromptChange,
  variations = 1,
  onVariationsChange,
  disabled = false,
  loading = false,
  selectedModel = 'nanobananapro',
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

  // Initialize showTools to true if currentTool is a drawing tool

  const [showTools, setShowTools] = useState<boolean>(
    currentTool === "rectangle" ||
      currentTool === "brush" ||
      currentTool === "pencil"
  );
  const [showOutpaintOptions, setShowOutpaintOptions] =
    useState<boolean>(false);

  const { checkCreditsBeforeAction } = useCreditCheck();

  // Reference images state for Edit By Text
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);

  // Determine if we should show generation loading for current image
  const shouldShowGenerationLoading =
    isGenerating &&
    // For input images: show loading if this specific input image is generating
    ((selectedImageType === "input" &&
      selectedImageId === generatingInputImageId) ||
      // For generated images: show loading during immediate generation phase
      // (will be stopped by server response for generated images)
      selectedImageType === "generated");

  // Sync showTools state when currentTool changes
  useEffect(() => {
    const isDrawingTool =
      currentTool === "rectangle" ||
      currentTool === "brush" ||
      currentTool === "pencil";
    setShowTools(isDrawingTool);
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
      case "Zoom out 1.5x":
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

      case "Zoom out 2x":
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

      case "Make square":
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

  // Only show model selector for editByText tool
  const showModelSelector = currentTool === "editByText";

  // Handle file input change for adding images to canvas
  const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : undefined;
    if (file && onAddImage) {
      onAddImage(file);
    }
    // Clear input value so the same file can be selected again if needed
    if (e.target) {
      e.currentTarget.value = "";
    }
  };

  // Handle reference image upload
  const handleReferenceImageUpload = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).filter(f => f.type.startsWith("image/"));
    for (const file of selected) {
      try {
        const action = await dispatch(uploadInputImage({ file, uploadSource: "TWEAK_MODULE" }));
        if (uploadInputImage.fulfilled.match(action)) {
          const res: any = action.payload;
          setReferenceImageUrls(prev => [...prev, res.originalUrl]);
        }
      } catch (e) {
        console.error("Failed to upload reference image", e);
      }
    }
  };

  // Remove reference image
  const handleRemoveReferenceImage = (index: number) => {
    setReferenceImageUrls(prev => prev.filter((_, i) => i !== index));
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

  // Left side tool buttons (always visible)
  const leftToolButtons = [
    {
      id: "rectangle" as const,
      icon: Square,
      label: "Rectangle",
      onClick: () => onToolChange("rectangle"),
    },
    {
      id: "brush" as const,
      icon: Brush,
      label: "Brush",
      onClick: () => onToolChange("brush"),
    },
    {
      id: "pencil" as const,
      icon: Pencil,
      label: "Pencil",
      onClick: () => onToolChange("pencil"),
    },
  ];

  // Outpaint options for left panel (excluding "None")
  const outpaintOptions: {
    value: OutpaintOption;
    label: string;
    fullWidth?: boolean;
  }[] = [
    { value: "Zoom out 1.5x", label: "Zoom out 1.5x" },
    { value: "Zoom out 2x", label: "Zoom out 2x" },
    { value: "Make square", label: "Make square", fullWidth: true },
  ];

  // Bottom toolbar buttons
  const bottomToolButtons = [
    {
      id: "select" as const,
      icon: Play,
      label: "Expand Border",
      onClick: () => {
        // Always show outpaint options when Expand Border is clicked
        setShowOutpaintOptions(true);
        setShowTools(false);
        onToolChange("select");
      },
    },
    {
      id: "move" as const,
      icon: Move,
      label: "Move Objects",
      onClick: () => {
        setShowTools(false);
        setShowOutpaintOptions(false);
        onToolChange("move");
      },
    },
  ];

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex flex-col gap-2 bg-white rounded-none px-2 py-2 shadow-lg">
          <div className="flex gap-2 justify-between">
            <div className="flex gap-4 justify-between flex-1">
              {/* Left Panel - Tools or Outpaint Options */}
              {showTools && (
                <div className="flex gap-2 flex-col">
                  {leftToolButtons.map((button) => {
                    const Icon = button.icon;
                    const isActive = currentTool === button.id;

                    return (
                      <button
                        key={button.id}
                        onClick={button.onClick}
                        className={`flex items-center gap-2 py-1 rounded-none text-sm font-medium transition-colors cursor-pointer ${
                          isActive
                            ? "text-red-500"
                            : "text-gray-500 hover:text-black"
                        } disabled:opacity-50 disabled:cursor-not-allowed group px-3 py-2`}
                        title={button.label}
                      >
                        <div
                          className={`flex items-center justify-center rounded-none  transition-all`}
                        >
                          <Icon size={16} />
                        </div>
                        <span className="whitespace-nowrap">
                          {button.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {showOutpaintOptions && operationType === "outpaint" && (
                <div className="flex gap-2 flex-col">
                  <div className="grid grid-cols-1 gap-2">
                    {outpaintOptions
                      .map((option) => {
                        const isActive = outpaintOption === option.value;

                        return (
                          <button
                            key={option.value}
                            onClick={() => {
                              onOutpaintOptionChange?.(option.value);
                              // Automatically extend canvas boundaries based on selection
                              extendCanvasBounds(option.value);
                              // Keep panel open like "Add Objects" behavior
                            }}
                            className={`flex items-center justify-center py-2 rounded-none text-sm font-medium transition-all duration-200 ease-in-out cursor-pointer ${
                              isActive
                                ? "bg-black text-white border border-black"
                                : "text-gray-600 border border-transparent hover:border-black hover:bg-transparent hover:text-black"
                            } disabled:opacity-50 disabled:cursor-not-allowed px-3`}
                            title={option.label}
                          >
                            <span className="whitespace-nowrap text-xs">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
              <div className="flex-1 flex flex-col gap-2">
                {/* Reference Images Section for Edit By Text */}
                {currentTool === "editByText" && (
                  <div className="bg-white rounded-none border border-gray-200 p-2">
                    <label className="text-xs text-gray-600 mb-1 block">Reference Images</label>
                    <div className="flex flex-wrap gap-2">
                      {referenceImageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Reference ${index + 1}`}
                            className="w-16 h-16 object-cover rounded border border-gray-300"
                          />
                          <button
                            onClick={() => handleRemoveReferenceImage(index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-red-500 transition-colors">
                        <ImagePlus size={20} className="text-gray-400" />
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleReferenceImageUpload(e.target.files)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
                <div className="bg-white backdrop-blur-sm rounded-none shadow-lg h-full">
                  {currentTool === "editByText" ? (
                    <textarea
                      value={prompt}
                      onChange={(e) => onPromptChange(e.target.value)}
                      placeholder={
                        prompt ? "" : "Describe how you want to edit the image"
                      }
                      className="w-full h-full min-h-24 px-3 py-2 bg-transparent border-none text-black placeholder-gray-400 text-sm focus:outline-none resize-none custom-scrollbar"
                      rows={3}
                    />
                  ) : (
                    <textarea
                      value={prompt}
                      onChange={(e) => onPromptChange(e.target.value)}
                      placeholder={
                        prompt
                          ? ""
                          : "Draw a region on your image and describe what you want to see in this area."
                      }
                      className="w-full h-full min-h-24 px-3 py-2 bg-transparent border-none text-black placeholder-gray-400 text-sm focus:outline-none resize-none custom-scrollbar"
                      rows={3}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-none px-2 py-1">
                  <button
                    onClick={() => onVariationsChange?.(1)}
                    className={`rounded-none flex-1 bg-white flex items-center justify-center text-xs font-bold transition-all duration-200 ease-in-out py-2 ${
                      variations === 1
                        ? "bg-black text-white border border-black shadow-lg"
                        : "bg-gray-200 text-gray-600 border border-transparent hover:border-black hover:bg-transparent hover:text-black"
                    }`}
                  >
                    1
                  </button>
                  <button
                    onClick={() => onVariationsChange?.(2)}
                    className={`rounded-none flex-1 bg-white flex items-center justify-center text-xs font-bold transition-all duration-200 ease-in-out py-2 ${
                      variations === 2
                        ? "bg-black text-white border border-black shadow-lg"
                        : "bg-gray-200 text-gray-600 border border-transparent hover:border-black hover:bg-transparent hover:text-black"
                    }`}
                  >
                    2
                  </button>
                </div>

                {/* Show model selector only for Edit By Text tool */}
                {currentTool === 'editByText' && (
                  <select
                    value={selectedModel}
                    onChange={(e) => onModelChange?.(e.target.value)}
                    className="w-full px-2 py-1 rounded-none text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="nanobanana">Google Nano Banana</option>
                    <option value="seedream4">Seedream 4</option>
                    <option value="flux-konect" disabled>Flux Konect</option>
                  </select>
                )}
              </div>

              <button
                onClick={handleGenerateWithCreditCheck}
                disabled={disabled || loading || shouldShowGenerationLoading}
                className="flex h-full items-center gap-2 px-4 py-3 bg-white text-black rounded-none text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                title="Generate image"
              >
                {loading || shouldShowGenerationLoading ? (
                  <DotLottieReact
                    src={loader}
                    loop
                    autoplay
                    style={{ transform: 'scale(3)', height: 35, width: 50 }}
                  />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>Generate</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-between">
            <button
              key={"editByText"}
              onClick={() => {
                onToolChange("editByText");
                setShowTools(false);
                setShowOutpaintOptions(false);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-none text-sm font-medium transition-all duration-200 ease-in-out whitespace-nowrap ${
                currentTool === "editByText"
                  ? "bg-black text-white border border-black shadow-lg"
                  : "text-gray-600 border border-transparent hover:border-black hover:bg-transparent hover:text-black"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Edit3 size={16} />
              <span>Edit By Text</span>
            </button>

            <button
              key={"addObjects"}
              onClick={() => {
                setShowTools(true);
                setShowOutpaintOptions(false);
                // Reset canvas boundaries to original when switching to Add Objects
                if (originalImageBounds) {
                  dispatch(setCanvasBounds(originalImageBounds));
                  setTimeout(() => {
                    centerAndFitExtendedCanvas();
                  }, 50);
                }
                onToolChange(
                  currentTool === "rectangle" ||
                    currentTool === "brush" ||
                    currentTool === "pencil"
                    ? currentTool
                    : "rectangle"
                );
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-none text-sm font-medium transition-colors whitespace-nowrap ${
                currentTool === "rectangle" ||
                currentTool === "brush" ||
                currentTool === "pencil"
                  ? "text-red-500 border border-red-200 bg-red-50 shadow-lg"
                  : "text-gray-500"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ImagePlus size={16} />
              <span>Edit By Area</span>
            </button>

            {bottomToolButtons.map((button) => {
              const Icon = button.icon;
              const isActive = currentTool === button.id;

              return (
                <button
                  key={button.id}
                  onClick={button.onClick}
                  className={`flex items-center gap-2 px-3 py-2 rounded-none text-sm font-medium transition-all duration-200 ease-in-out whitespace-nowrap ${
                    isActive || (button.id === "select" && showOutpaintOptions)
                      ? "bg-black text-white border border-black shadow-lg"
                      : "text-gray-600 border border-transparent hover:border-black hover:bg-transparent hover:text-black"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Icon size={16} />
                  <span>{button.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default TweakToolbar;
export type { OutpaintOption };