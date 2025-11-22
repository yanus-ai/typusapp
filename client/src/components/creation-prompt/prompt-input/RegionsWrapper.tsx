import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import {
  setSelectedMaskId,
  setMaskInput,
  updateMaskStyle,
  updateMaskStyleLocal,
  getMasks,
} from "@/features/masks/maskSlice";
import { useRef, useMemo, useEffect, useState } from "react";
import { X } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import squareSpinner from "@/assets/animations/square-spinner.lottie";
import { useBaseImage } from "../hooks/useBaseImage";

export default function RegionsWrapper() {
  const dispatch = useAppDispatch();
  const { allMasks, maskInputs, selectedMaskId, maskStatus } = useAppSelector((state) => state.masks);
  const { selectedImageType, isGenerating, generatingInputImageId } = useAppSelector((state) => state.createUI);
  const inputImages = useAppSelector((state) => state.inputImages.images);
  const inputImageId = useAppSelector((state) => state.customization.inputImageId);
  const historyImages = useAppSelector((state) => state.historyImages.images);
  const selectedModel = useAppSelector((state) => state.tweak.selectedModel);
  const { baseImageUrl } = useBaseImage();
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [, setBaseImageLoaded] = useState(false);

  // Color mapping for regions (matching backend colors)
  const regionColors = [
    "#FFD700",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFA500",
    "#00FFFF",
    "#FF00FF",
    "#FFC0CB",
    "#800080",
    "#008000",
    "#000080",
    "#800000",
    "#808000",
    "#008080",
    "#000080",
  ];

  // Check if region extraction is in progress
  const isRegionExtractionProcessing = useMemo(() => {
    // Check mask status
    if (maskStatus === "processing") {
      return true;
    }

    // Check if there's a processing image for the current input image that's an SDXL region extraction
    if (inputImageId) {
      const processingRegionExtraction = historyImages.find((img) => {
        const metadata = img.metadata as any;
        return (
          img.status === "PROCESSING" &&
          img.moduleType === "CREATE" &&
          img.originalInputImageId === inputImageId &&
          metadata?.isRegionExtraction === true // Check if it's a region extraction
        );
      });

      if (processingRegionExtraction) {
        return true;
      }
    }

    // Check if generation is in progress for the current input image with SDXL model (region extraction uses SDXL)
    if (
      isGenerating &&
      generatingInputImageId === inputImageId &&
      selectedModel === "sdxl"
    ) {
      return true;
    }

    return false;
  }, [
    maskStatus,
    inputImageId,
    historyImages,
    isGenerating,
    generatingInputImageId,
    selectedModel,
  ]);

  const displayMasks = allMasks;

  const isUserUploadedImage = () => {
    if (selectedImageType !== "input" || !inputImageId) return false;
    const currentImage = inputImages.find((img) => img.id === inputImageId);
    return currentImage?.uploadSource === "CREATE_MODULE";
  };

  const handleMaskClick = (maskId: number) => {
    dispatch(setSelectedMaskId(maskId));
    // Focus input after a brief delay to ensure it's rendered
    setTimeout(() => {
      inputRefs.current[maskId]?.focus();
    }, 10);
  };

  const handleInputChange = (maskId: number, value: string) => {
    const currentInput = maskInputs[maskId];
    dispatch(
      setMaskInput({
        maskId,
        value: {
          displayName: value,
          imageUrl: currentInput?.imageUrl || null,
          category: currentInput?.category || "",
        },
      })
    );
  };

  const handleInputBlur = (maskId: number) => {
    // Save custom text if there's a value
    const input = maskInputs[maskId];
    if (input?.displayName && input.displayName.trim()) {
      if (isUserUploadedImage()) {
        dispatch(
          updateMaskStyle({
            maskId,
            customText: input.displayName.trim(),
          })
        );
      } else {
        dispatch(
          updateMaskStyleLocal({
            maskId,
            customText: input.displayName.trim(),
          })
        );
      }
    }
  };

  const handleDrop = (e: React.DragEvent, maskId: number) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Try to get material data from dataTransfer
      const materialDataStr = e.dataTransfer.getData("application/json");
      if (materialDataStr) {
        const materialData = JSON.parse(materialDataStr);

        // Check if it's a custom image (has imageUrl/url/src but no option)
        if (
          materialData.type === "custom_image" ||
          ((materialData.imageUrl || materialData.url || materialData.src) &&
            !materialData.option)
        ) {
          // Handle custom image drop
          const imageUrl =
            materialData.imageUrl || materialData.url || materialData.src;
          const fileName = materialData.fileName || "Custom Image";

          if (imageUrl) {
            dispatch(
              setMaskInput({
                maskId,
                value: {
                  displayName: fileName,
                  imageUrl: imageUrl,
                  category: "custom_image",
                },
              })
            );

            if (isUserUploadedImage()) {
              dispatch(
                updateMaskStyle({
                  maskId,
                  customText: fileName,
                  materialOptionId: undefined,
                  customizationOptionId: undefined,
                })
              );
            } else {
              dispatch(
                updateMaskStyleLocal({
                  maskId,
                  customText: fileName,
                  materialOptionId: undefined,
                  customizationOptionId: undefined,
                })
              );
            }

            dispatch(setSelectedMaskId(null));
          }
          return;
        }

        // Handle material catalog data
        if (materialData.option) {
          applyMaterialToMask(maskId, materialData);
          return;
        }
      }

      // Fallback: try to get URL
      const url =
        e.dataTransfer.getData("text/uri-list") ||
        e.dataTransfer.getData("text/plain");
      if (url && url.startsWith("http")) {
        // Handle direct URL drop (custom image)
        dispatch(
          setMaskInput({
            maskId,
            value: {
              displayName: "Custom Image",
              imageUrl: url,
              category: "custom_image",
            },
          })
        );

        if (isUserUploadedImage()) {
          dispatch(
            updateMaskStyle({
              maskId,
              customText: "Custom Image",
              materialOptionId: undefined,
              customizationOptionId: undefined,
            })
          );
        } else {
          dispatch(
            updateMaskStyleLocal({
              maskId,
              customText: "Custom Image",
              materialOptionId: undefined,
              customizationOptionId: undefined,
            })
          );
        }

        dispatch(setSelectedMaskId(null));
        return;
      }
    } catch (error) {
      console.error("Error handling drop:", error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const getSubCategoryInfo = (
    _type: string
  ): { id: number; name: string } | undefined => {
    // This would need access to availableOptions from Redux
    // For now, we'll skip subCategoryId as it's optional
    return undefined;
  };

  const applyMaterialToMask = (maskId: number, materialData: any) => {
    const { option, materialOption, type } = materialData;

    if (!option) return;

    const displayName = `${type} ${option.displayName || option.name}`;
    const imageUrl = option.thumbnailUrl || null;
    const category = type;

    let materialOptionId: number | undefined;
    let customizationOptionId: number | undefined;

    if (materialOption === "customization") {
      customizationOptionId = option.id;
    } else if (materialOption === "material") {
      materialOptionId = option.id;
    }

    const subCategoryInfo = getSubCategoryInfo(type);

    dispatch(
      setMaskInput({
        maskId,
        value: { displayName, imageUrl, category },
      })
    );

    if (isUserUploadedImage()) {
      dispatch(
        updateMaskStyle({
          maskId,
          materialOptionId,
          customizationOptionId,
          customText: displayName,
          subCategoryId: subCategoryInfo?.id,
        })
      );
    } else {
      dispatch(
        updateMaskStyleLocal({
          maskId,
          materialOptionId,
          customizationOptionId,
          customText: displayName,
          subCategoryId: subCategoryInfo?.id,
        })
      );
    }

    dispatch(setSelectedMaskId(null));
  };

  const clearMaterial = (maskId: number) => {
    dispatch(
      setMaskInput({
        maskId,
        value: { displayName: "", imageUrl: null, category: "" },
      })
    );

    if (isUserUploadedImage()) {
      dispatch(
        updateMaskStyle({
          maskId,
          customText: "",
          materialOptionId: undefined,
          customizationOptionId: undefined,
        })
      );
    } else {
      dispatch(
        updateMaskStyleLocal({
          maskId,
          customText: "",
          materialOptionId: undefined,
          customizationOptionId: undefined,
        })
      );
    }
  };

  // Load masks when status is completed but masks are empty
  // IMPORTANT: This hook must be called BEFORE any early returns to follow Rules of Hooks
  useEffect(() => {
    if (
      maskStatus === "completed" &&
      displayMasks.length === 0 &&
      inputImageId
    ) {
      console.log(
        "🔄 Loading masks for completed status, inputImageId:",
        inputImageId
      );
      dispatch(getMasks(inputImageId));
    }
  }, [maskStatus, displayMasks.length, inputImageId, dispatch]);

  // Draw regions preview canvas
  // IMPORTANT: This hook must be called BEFORE any early returns to follow Rules of Hooks
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || displayMasks.length === 0 || !baseImageUrl) {
      setBaseImageLoaded(false);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height) || 200;
        // Set display size (logical size)
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        // Set actual canvas resolution (for high DPI displays)
        const dpr = window.devicePixelRatio || 1;
        // Setting width/height resets the context, so we need to re-scale
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        // Scale context to match device pixel ratio
        ctx.scale(dpr, dpr);
        return size;
      }
      return 200; // fallback size
    };

    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";

    baseImg.onload = () => {
      const size = updateCanvasSize();

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Draw base image (scaled to fit)
      ctx.drawImage(baseImg, 0, 0, size, size);

      // Load all mask images and draw them
      const maskImages: { img: HTMLImageElement; color: string }[] = [];
      let loadedCount = 0;

      displayMasks.forEach((mask, index) => {
        if (!mask.maskUrl) {
          loadedCount++;
          if (loadedCount === displayMasks.length) {
            drawAllMasks();
          }
          return;
        }

        const maskImg = new Image();
        maskImg.crossOrigin = "anonymous";
        const color = mask.color || regionColors[index % regionColors.length];

        maskImg.onload = () => {
          maskImages.push({ img: maskImg, color });
          loadedCount++;

          if (loadedCount === displayMasks.length) {
            drawAllMasks();
          }
        };

        maskImg.onerror = () => {
          loadedCount++;
          if (loadedCount === displayMasks.length) {
            drawAllMasks();
          }
        };

        maskImg.src = mask.maskUrl;
      });

      function drawAllMasks() {
        // Draw each mask region with its color overlay
        maskImages.forEach(({ img, color }) => {
          // Create a temporary canvas for this mask
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = size;
          tempCanvas.height = size;
          const tempCtx = tempCanvas.getContext("2d");
          if (!tempCtx) return;

          // Draw mask image
          tempCtx.drawImage(img, 0, 0, size, size);

          // Apply color overlay using multiply blend mode
          tempCtx.globalCompositeOperation = "source-atop";
          tempCtx.fillStyle = color + "80"; // Add transparency
          tempCtx.fillRect(0, 0, size, size);

          if (ctx !== null) {
            // Draw the colored mask onto main canvas
            ctx.globalCompositeOperation = "source-over";
            ctx.drawImage(tempCanvas, 0, 0);
          }
        });

        setBaseImageLoaded(true);
      }
    };

    baseImg.onerror = () => {
      setBaseImageLoaded(false);
    };

    baseImg.src = baseImageUrl;

    // Note: Canvas will be redrawn automatically when displayMasks or baseImageUrl changes
    // For resize handling, we rely on the effect re-running when dependencies change
  }, [displayMasks, baseImageUrl, regionColors]);

  // Don't render if no masks exist and not processing/completed
  if (
    displayMasks.length === 0 &&
    maskStatus !== "processing" &&
    maskStatus !== "completed"
  ) {
    return null;
  }

  // Show placeholder regions when processing/completed but masks not loaded yet
  const isLoading =
    displayMasks.length === 0 &&
    (maskStatus === "processing" ||
      maskStatus === "completed" ||
      isRegionExtractionProcessing);
  const regionsToShow: (
    | (typeof displayMasks)[0]
    | { id: string; index: number }
  )[] = isLoading
    ? Array.from({ length: 4 }, (_, i) => ({
        id: `placeholder-${i}`,
        index: i,
      }))
    : displayMasks;

  return (
    <div className="flex flex-col gap-3 relative space-y-3 w-96">
      <div className="w-full">
        <p className="text-sm font-semibold">Picture Regions</p>
      </div>
      <div className="flex flex-col gap-3 h-full overflow-y-auto">
        {regionsToShow.map((region, index) => {
          const isPlaceholder =
            isLoading &&
            "index" in region &&
            typeof region.id === "string" &&
            region.id.startsWith("placeholder");
          const maskRegion = isPlaceholder
            ? null
            : (region as (typeof displayMasks)[0]);
          const maskInput = maskRegion ? maskInputs[maskRegion.id] : null;
          const materialImageUrl = maskRegion
            ? maskRegion.materialOption?.thumbnailUrl ||
              maskRegion.customizationOption?.thumbnailUrl ||
              maskInput?.imageUrl
            : null;
          const materialName = maskRegion
            ? maskInput?.displayName ||
              maskRegion.customText ||
              maskRegion.materialOption?.displayName ||
              maskRegion.customizationOption?.displayName ||
              ""
            : "";
          const isSelected = maskRegion
            ? selectedMaskId === maskRegion.id
            : false;
          const regionIndex = isPlaceholder
            ? (region as { id: string; index: number }).index
            : index;

          return (
            <div
              key={
                isPlaceholder ? `placeholder-${regionIndex}` : maskRegion!.id
              }
              className="flex flex-col gap-1.5 group"
              onDragOver={isPlaceholder ? undefined : handleDragOver}
              onDrop={
                isPlaceholder
                  ? undefined
                  : (e) => handleDrop(e, maskRegion!.id)
              }
            >
              {/* Region Label */}
              <label className="text-sm font-semibold text-gray-900">
                Region {regionIndex + 1}
              </label>

              {/* Image and Input Row */}
              <div className="flex items-center gap-2">
                {/* Mask Image Thumbnail */}
                <div
                  className={`relative flex-shrink-0 w-12 h-12 rounded border-2 transition-all ${
                    isPlaceholder
                      ? "border-gray-200 bg-white"
                      : isSelected
                      ? "border-primary-500 cursor-pointer"
                      : "border-gray-200 hover:border-gray-300 cursor-pointer"
                  }`}
                  onClick={
                    isPlaceholder
                      ? undefined
                      : () => handleMaskClick(maskRegion!.id)
                  }
                >
                  {isPlaceholder ? (
                    // Loading placeholder - show empty placeholder with spinner
                    <div className="absolute inset-0 flex items-center justify-center rounded bg-white border-2 border-gray-200 shadow-sm">
                      <DotLottieReact
                        src={squareSpinner}
                        autoplay
                        loop
                        style={{ width: 20, height: 20 }}
                      />
                    </div>
                  ) : (
                    <>
                      <img
                        src={maskRegion!.maskUrl}
                        alt={`Region ${regionIndex + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                      {/* Show loading spinner overlay when processing */}
                      {isRegionExtractionProcessing && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                          <DotLottieReact
                            src={squareSpinner}
                            autoplay
                            loop
                            style={{ width: 20, height: 20 }}
                          />
                        </div>
                      )}
                      {/* Clear button (X icon) */}
                      {maskRegion!.maskUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearMaterial(maskRegion!.id);
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Clear region"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Material Display / Input */}
                <div className="flex-1 min-w-0">
                  {isPlaceholder ? (
                    // Placeholder input (disabled during loading)
                    <input
                      type="text"
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-white cursor-not-allowed opacity-60 shadow-sm"
                      placeholder="Type or drag from catalog"
                    />
                  ) : materialImageUrl ? (
                    // Show material with image and name when material exists
                    <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded bg-white min-h-[40px] shadow-sm">
                      <img
                        src={materialImageUrl}
                        alt={materialName}
                        className="w-6 h-6 rounded object-cover flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700 flex-1 truncate capitalize">
                        {materialName.toLowerCase()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearMaterial(maskRegion!.id);
                        }}
                        className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                        aria-label="Clear material"
                      >
                        <X className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    // Always show input field when no material
                    <input
                      ref={(el) => {
                        if (maskRegion) {
                          inputRefs.current[maskRegion.id] = el;
                        }
                      }}
                      type="text"
                      value={maskInput?.displayName || ""}
                      onChange={(e) =>
                        handleInputChange(maskRegion!.id, e.target.value)
                      }
                      onFocus={() => {
                        dispatch(setSelectedMaskId(maskRegion!.id));
                      }}
                      onBlur={() => handleInputBlur(maskRegion!.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-full px-3 py-2 text-xs placeholder:text-xs border border-gray-200 rounded focus:outline-none focus:border-primary-500 bg-white shadow-sm"
                      placeholder="Type or drag from catalog"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
