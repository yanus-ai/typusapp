import React, { useEffect, useRef, useMemo, useState } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useUnifiedWebSocket } from "@/hooks/useUnifiedWebSocket";
import { useCreditCheck } from "@/hooks/useCreditCheck";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import MainLayout from "@/components/layout/MainLayout";
import TweakCanvas, { TweakCanvasRef } from "@/components/tweak/TweakCanvas";
import InputHistoryPanel from "@/components/create/InputHistoryPanel";
import HistoryPanel from "@/components/create/HistoryPanel";
import TweakToolbar, { OutpaintOption } from "@/components/tweak/TweakToolbar";
import FileUpload from "@/components/create/FileUpload";
import api from "@/lib/api";
import { runFluxKonect } from "@/features/tweak/tweakSlice";

// Redux actions
import {
  uploadInputImage,
  fetchInputImagesBySource,
  createInputImageFromExisting,
} from "@/features/images/inputImagesSlice";
import {
  fetchAllVariations,
  addProcessingTweakVariations,
} from "@/features/images/historyImagesSlice";
import { fetchCurrentUser, updateCredits } from "@/features/auth/authSlice";
import {
  setPrompt,
  setCurrentTool,
  setVariations,
  generateInpaint,
  generateOutpaint,
  addImageToCanvas,
  undo,
  redo,
  setSelectedBaseImageId,
} from "../../features/tweak/tweakSlice";
import {
  setSelectedImage,
  startGeneration,
  stopGeneration,
} from "../../features/tweak/tweakUISlice";
import { setIsModalOpen, setMode } from "@/features/gallery/gallerySlice";

const TweakPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const canvasRef = useRef<TweakCanvasRef | null>(null);
  const { checkCreditsBeforeAction } = useCreditCheck();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Track initial data loading state (same as CreatePage)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Download progress state (same as CreatePage and RefinePage)
  const [downloadingImageId, setDownloadingImageId] = useState<
    number | undefined
  >(undefined);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [imageObjectUrls, setImageObjectUrls] = useState<
    Record<number, string>
  >({});
  const [newImageGenerated, setNewImageGenerated] = useState("");

  const [operationType, setOperationType] = useState<"outpaint" | "inpaint">(
    "outpaint"
  );
  const [outpaintOption, setOutpaintOption] =
    useState<OutpaintOption>("Zoom out 1.5x");

  // Track recent auto-selection to prevent interference from URL parameter effect
  const [recentAutoSelection, setRecentAutoSelection] = useState(false);

  // Redux selectors - TWEAK_MODULE images and tweakUI state
  const inputImages = useAppSelector((state) => state.inputImages.images); // TWEAK_MODULE input images only
  const inputImagesLoading = useAppSelector(
    (state) => state.inputImages.loading
  );
  const inputImagesError = useAppSelector((state) => state.inputImages.error);

  const historyImages = useAppSelector((state) => state.historyImages.images);
  const historyImagesLoading = useAppSelector(
    (state) => state.historyImages.loading
  );

  // TweakUI state (same pattern as CreatePage)
  const selectedImageId = useAppSelector(
    (state) => state.tweakUI.selectedImageId
  );
  const selectedImageType = useAppSelector(
    (state) => state.tweakUI.selectedImageType
  );
  const isGenerating = useAppSelector((state) => state.tweakUI.isGenerating);
  const generatingInputImageId = useAppSelector(
    (state) => state.tweakUI.generatingInputImageId
  );
  const generatingInputImagePreviewUrl = useAppSelector(
    (state) => state.tweakUI.generatingInputImagePreviewUrl
  );

  // Filter history images by TWEAK module type only - same pattern as RefinePage
  const filteredHistoryImages = React.useMemo(() => {
    const filtered = historyImages.filter(
      (image) =>
        image.moduleType === "TWEAK" &&
        (image.status === "COMPLETED" ||
          image.status === "PROCESSING" ||
          !image.status)
    );
    return filtered;
  }, [historyImages]);

  // Tweak state (canvas and tool state)
  const {
    selectedBaseImageId,
    currentTool,
    prompt,
    variations,
    canvasBounds,
    originalImageBounds,
    rectangleObjects,
    brushObjects,
    selectedRegions,
    history,
    historyIndex,
    showCanvasSpinner,
  } = useAppSelector((state) => state.tweak);

  // Get current AI materials for prompt transfer (similar to other pages)
  const aiPromptMaterials = useAppSelector(
    (state) => state.masks.aiPromptMaterials
  );

  // selectedImageType now comes from tweakUI state (same as CreatePage)

  // generatingInputImageId now comes from tweakUI state (same as CreatePage)

  // Get current functional input image ID for WebSocket filtering (same as CreatePage)
  const currentInputImageId = useMemo(() => {
    if (!selectedImageId || !selectedImageType) return undefined;

    if (selectedImageType === "input") {
      return selectedImageId;
    } else if (selectedImageType === "generated") {
      const generatedImage = historyImages.find(
        (img) => img.id === selectedImageId
      );
      return generatedImage?.originalInputImageId;
    }
    return undefined;
  }, [selectedImageId, selectedImageType, historyImages]);

  // Unified WebSocket connection - handles all real-time updates (same as CreatePage)
  const { isConnected: isWebSocketConnected } = useUnifiedWebSocket({
    enabled: initialDataLoaded, // Only enable after initial data loads
    currentInputImageId,
  });

  // Download image with progress tracking (same as CreatePage and RefinePage)
  const downloadImageWithProgress = React.useCallback(
    async (imageUrl: string, imageId: number) => {
      // Check if we already have this image
      if (imageObjectUrls[imageId]) {
        return imageObjectUrls[imageId];
      }

      try {
        setDownloadingImageId(imageId);
        setDownloadProgress(0);

        const response = await axios.get(imageUrl, {
          responseType: "blob",
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress =
                (progressEvent.loaded / progressEvent.total) * 100;
              setDownloadProgress(progress);
            }
          },
        });

        // Create object URL from blob
        const objectUrl = URL.createObjectURL(response.data);

        // Store the object URL for future use
        setImageObjectUrls((prev) => ({
          ...prev,
          [imageId]: objectUrl,
        }));

        return objectUrl;
      } catch (error) {
        console.error("Failed to download image with progress:", error);
        // Fallback to original URL
        return imageUrl;
      } finally {
        setDownloadingImageId(undefined);
        setDownloadProgress(0);
      }
    },
    [imageObjectUrls]
  );

  // Simple image selection function (same as CreatePage)
  const handleSelectImage = (
    imageId: number,
    sourceType: "input" | "generated"
  ) => {
    setNewImageGenerated("");
    dispatch(setSelectedImage({ id: imageId, type: sourceType }));
    // Keep legacy selectedBaseImageId in sync for canvas operations
    dispatch(setSelectedBaseImageId(imageId));
  };

  // Enhanced image selection function for complex operations (following RefinePage pattern)
  const selectImage = React.useCallback(
    (imageId: number, imageType: "input" | "generated") => {
      console.log("🎯 Selecting image:", { imageId, imageType });
      console.log("🔍 Current selected state before selection:", {
        currentSelectedImageId: selectedBaseImageId,
      });

      let imageUrl: string | undefined;

      if (imageType === "input") {
        const inputImage = inputImages.find((img) => img.id === imageId);
        imageUrl = inputImage?.imageUrl;
        console.log("📄 Input image found:", inputImage ? "Yes" : "No", {
          imageUrl,
        });
      } else {
        const historyImage = filteredHistoryImages.find(
          (img) => img.id === imageId
        );
        imageUrl = historyImage?.imageUrl;
        console.log("📄 History image found:", historyImage ? "Yes" : "No", {
          imageUrl,
        });
      }

      if (imageUrl) {
        console.log("✅ Dispatching setSelectedImage with:", {
          id: imageId,
          type: imageType,
        });
        dispatch(setSelectedImage({ id: imageId, type: imageType }));
        // Keep legacy selectedBaseImageId in sync for canvas operations
        dispatch(setSelectedBaseImageId(imageId));
      } else {
        console.error("❌ No imageUrl found for selection");
      }
    },
    [inputImages, filteredHistoryImages, dispatch, selectedBaseImageId]
  );

  // Load initial data - only TWEAK_MODULE images (following CreatePage pattern)
  useEffect(() => {
    if (initialDataLoaded) return;

    const loadInitialData = async () => {
      await Promise.allSettled([
        dispatch(fetchInputImagesBySource({ uploadSource: "TWEAK_MODULE" })),
        dispatch(fetchAllVariations({ page: 1, limit: 100 })),
      ]);
      setInitialDataLoaded(true);
    };

    loadInitialData();
  }, [dispatch, initialDataLoaded]);

  // Auto-detect completed operations and update generating state (same as CreatePage)
  useEffect(() => {
    if (!isGenerating) return;

    const recentCompletedOperations = filteredHistoryImages.filter((img) => {
      if (img.status !== "COMPLETED") return false;
      const completedTime = new Date(img.createdAt).getTime();
      const thirtySecondsAgo = Date.now() - 30000; // 30 seconds ago
      return completedTime > thirtySecondsAgo;
    });

    const processingOperations = filteredHistoryImages.filter(
      (img) => img.status === "PROCESSING"
    );

    if (
      recentCompletedOperations.length > 0 &&
      processingOperations.length === 0
    ) {
      console.log(
        "🎉 Auto-detected completed tweak operations, stopping generation state"
      );
      dispatch(stopGeneration());

      // Set flag to prevent URL parameter effect from interfering with auto-selection
      setRecentAutoSelection(true);
      console.log("🚫 Setting recentAutoSelection=true to prevent interference");

      // Clear the flag after a delay to allow normal selection logic to resume
      setTimeout(() => {
        console.log("🟢 Clearing recentAutoSelection flag, normal selection logic can resume");
        setRecentAutoSelection(false);
      }, 3000); // 3 seconds to ensure WebSocket auto-selection completes
    }
  }, [filteredHistoryImages, isGenerating, dispatch]);

  // Auto-set generating state if there are processing images on page load/reload (same as RefinePage)
  useEffect(() => {
    if (!initialDataLoaded) return;

    const processingImages = filteredHistoryImages.filter(
      (img) => img.status === "PROCESSING"
    );

    if (processingImages.length > 0 && !isGenerating) {
      console.log(
        "🔄 Auto-detected processing tweak images on page load, setting generation state"
      );
      // For page load, we need to determine which input image is generating
      // Find the most recent processing image and its input image
      const mostRecentProcessing = processingImages.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      if (mostRecentProcessing && mostRecentProcessing.originalInputImageId) {
        const inputImage = inputImages.find(
          (img) => img.id === mostRecentProcessing.originalInputImageId
        );
        if (inputImage) {
          dispatch(
            startGeneration({
              batchId: mostRecentProcessing.batchId || 0,
              inputImageId: mostRecentProcessing.originalInputImageId,
              inputImagePreviewUrl: inputImage.imageUrl,
            })
          );
        }
      }
    }
  }, [filteredHistoryImages, isGenerating, dispatch, initialDataLoaded]);

  // Fallback polling mechanism when WebSocket fails (same as CreatePage/RefinePage)
  useEffect(() => {
    if (isGenerating && !isWebSocketConnected) {
      const timeoutId = setTimeout(() => {
        console.log(
          "🔄 WebSocket disconnected during generation, polling for updates"
        );
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      }, 10000); // Poll every 10 seconds
      return () => clearTimeout(timeoutId);
    }
  }, [isGenerating, isWebSocketConnected, dispatch]);

  // Handle image data loading with download progress for generated images
  useEffect(() => {
    if (selectedImageId && selectedImageType === "generated") {
      const historyImage = filteredHistoryImages.find(
        (img) => img.id === selectedImageId
      );
      const imageUrl = historyImage?.imageUrl;

      if (imageUrl) {
        // Check if we already have this image cached
        if (imageObjectUrls[selectedImageId]) {
          // Already cached, no need to download again
          return;
        } else {
          // Download with progress tracking for generated images
          downloadImageWithProgress(imageUrl, selectedImageId);
        }
      }
    }
  }, [
    selectedImageId,
    selectedImageType,
    filteredHistoryImages,
    imageObjectUrls,
    downloadImageWithProgress,
  ]);

  // Handle URL parameters for image selection and auto-select last input image (same as RefinePage)
  useEffect(() => {
    // Skip if data is still loading
    if (inputImagesLoading || historyImagesLoading) {
      return;
    }

    // Skip if there's a recent auto-selection from WebSocket to prevent interference
    if (recentAutoSelection) {
      console.log("⏭️ Skipping URL parameter effect due to recent auto-selection");
      return;
    }

    const imageIdParam = searchParams.get("imageId");
    const typeParam = searchParams.get("type");

    console.log("🔍 URL parameter effect running:", {
      imageIdParam,
      typeParam,
      selectedImageId: selectedImageId,
      inputImagesLength: inputImages.length,
      historyImagesLength: filteredHistoryImages.length,
    });

    if (imageIdParam && typeParam) {
      const targetImageId = parseInt(imageIdParam);

      // Safety check: if this image is already selected, don't reprocess
      if (targetImageId === selectedImageId) {
        console.log(
          "⚠️ Target image is already selected, clearing URL parameters without reprocessing"
        );
        const currentPath = window.location.pathname;
        navigate(currentPath, { replace: true });
        return;
      }

      if (!isNaN(targetImageId)) {
        console.log("🔗 URL parameters found:", {
          imageId: targetImageId,
          type: typeParam,
        });

        let imageFound = false;

        if (typeParam === "input") {
          // Find in input images
          const inputImage = inputImages.find(
            (img) => img.id === targetImageId
          );
          if (inputImage) {
            console.log("✅ Found input image, selecting:", inputImage.id);
            selectImage(targetImageId, "input");
            imageFound = true;
          } else {
            console.warn("❌ Input image not found with ID:", targetImageId);
          }
        } else if (typeParam === "generated") {
          // Find in history images
          const historyImage = filteredHistoryImages.find(
            (img) => img.id === targetImageId
          );
          if (historyImage) {
            console.log("✅ Found history image, selecting:", historyImage.id);
            selectImage(targetImageId, "generated");
            imageFound = true;
          } else {
            console.warn("❌ History image not found with ID:", targetImageId);
          }
        }

        // Remove URL parameters after successful selection to prevent continuous re-selection
        if (imageFound) {
          console.log(
            "🧹 Removing URL parameters after successful image selection"
          );
          console.log("🧹 Current URL before clearing:", window.location.href);

          // Use navigate to clear parameters instead of direct URL manipulation
          const currentPath = window.location.pathname;
          console.log("🧹 Navigating to clean path:", currentPath);

          // Use replace to avoid adding to history
          navigate(currentPath, { replace: true });

          console.log("🧹 URL after clearing:", window.location.href);
        }
      } else {
        console.warn("❌ Invalid imageId in URL:", imageIdParam);
      }
    } else {
      // No URL parameters - handle auto-selection for tweak page
      if (inputImages.length > 0) {
        // Always auto-select the last (most recent) input image when there are no URL parameters
        // This ensures fresh selection when navigating from other modules
        const lastInputImage = inputImages[0]; // inputImages are sorted by createdAt desc

        // Only auto-select if no image is selected OR if the currently selected image doesn't exist in tweak data
        const currentImageExistsInTweakData =
          selectedImageId &&
          (inputImages.some((img) => img.id === selectedImageId) ||
            filteredHistoryImages.some((img) => img.id === selectedImageId));

        // Don't auto-select any image if no URL params - let user choose manually
        if (!selectedImageId || !currentImageExistsInTweakData) {
          console.log(
            "🎯 No auto-selection for tweak page when no URL params - let user choose manually:",
            {
              lastInputImageId: lastInputImage.id,
              reason: !selectedImageId
                ? "No image selected"
                : "Current image not in tweak data",
              currentSelectedImageId: selectedImageId,
              currentImageExistsInTweakData,
            }
          );
          // selectImage(lastInputImage.id, 'input');
        } else {
          console.log(
            "🔄 Keeping current selection as it exists in tweak data:",
            {
              selectedImageId,
              currentImageExistsInTweakData,
            }
          );
        }
      }
    }
  }, [
    searchParams,
    inputImages,
    filteredHistoryImages,
    inputImagesLoading,
    historyImagesLoading,
    selectedImageId,
    selectImage,
    navigate,
    recentAutoSelection,
  ]);

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(
        uploadInputImage({ file, uploadSource: "TWEAK_MODULE" })
      );
      if (uploadInputImage.fulfilled.match(resultAction)) {
        dispatch(
          setSelectedImage({ id: resultAction.payload.id, type: "input" })
        );
        dispatch(setSelectedBaseImageId(resultAction.payload.id));
        // Refresh the input images list with TWEAK_MODULE filter
        dispatch(fetchInputImagesBySource({ uploadSource: "TWEAK_MODULE" }));
        toast.success("Image uploaded successfully");
      } else if (uploadInputImage.rejected.match(resultAction)) {
        const errorMessage = resultAction.payload as string;
        toast.error(errorMessage || "Failed to upload image");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("An unexpected error occurred during upload");
    }
  };

  const handleToolChange = (
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
  ) => {
    dispatch(setCurrentTool(tool));

    // Automatically switch operation type based on tool
    if (tool === "rectangle" || tool === "brush" || tool === "pencil") {
      setOperationType("inpaint"); // Drawing tools = inpaint mode
    } else {
      setOperationType("outpaint"); // Other tools = outpaint mode
    }
  };

  const handleGenerate = async () => {
    if (!selectedImageId) {
      toast.error("Please select an image first");
      console.warn("❌ No image selected");
      return;
    }

    // Log if we're starting a new generation while a previous one is running
    if (isGenerating && !showCanvasSpinner) {
      // Previous generation continues running, UI allows new generation
    }

    // 🔥 NEW: Determine API call based on user's tool selection and drawn objects
    const hasDrawnObjects =
      rectangleObjects.length > 0 ||
      brushObjects.length > 0 ||
      selectedRegions.length > 0;
    const isExpandBorderSelected = currentTool === "select";
    const isOutpaintNeeded =
      canvasBounds.width > originalImageBounds.width ||
      canvasBounds.height > originalImageBounds.height;

    // Calculate expansion amounts in pixels for validation
    const leftExpansion = Math.max(0, -canvasBounds.x);
    const rightExpansion = Math.max(
      0,
      canvasBounds.width - originalImageBounds.width + canvasBounds.x
    );
    const topExpansion = Math.max(0, -canvasBounds.y);
    const bottomExpansion = Math.max(
      0,
      canvasBounds.height - originalImageBounds.height + canvasBounds.y
    );
    const maxExpansion = Math.max(
      leftExpansion,
      rightExpansion,
      topExpansion,
      bottomExpansion
    );

    // Determine which API to call based on user interaction:
    // 1. If user has selected an outpaint option directly → OUTPAINT (highest priority)
    // 2. If "Expand Border" (select tool) is selected AND canvas bounds are expanded → OUTPAINT
    // 3. If user has drawn any objects (Add Objects tools) → INPAINT
    // 4. Fallback to existing logic for backward compatibility
    let shouldUseOutpaint = false;
    let shouldUseInpaint = false;

    if (outpaintOption && isExpandBorderSelected) {
      // User has explicitly selected an outpaint option via "Expand Border" - force outpaint
      shouldUseOutpaint = true;
    } else if (isExpandBorderSelected && isOutpaintNeeded) {
      shouldUseOutpaint = true;
    } else if (hasDrawnObjects) {
      shouldUseInpaint = true;
    } else if (isOutpaintNeeded) {
      // Fallback: if bounds are expanded but no clear tool selection, use outpaint
      shouldUseOutpaint = true;
    } else {
      // Fallback: use inpaint if no other conditions match
      shouldUseInpaint = true;
    }

    // 🔥 NEW: Enhanced validation with helpful toast messages
    // OUTPAINT VALIDATION: Skip expansion check when user has directly selected an outpaint option
    if (shouldUseOutpaint && !(outpaintOption && isExpandBorderSelected)) {
      // Only check expansion if user hasn't explicitly selected an outpaint option (legacy border-drag behavior)
      if (maxExpansion < 10) {
        toast.error(
          "Outpaint requires at least 10px expansion. Please drag the border handles further out to expand the image boundaries.",
          {
            duration: 4000,
          }
        );
        console.warn("❌ Outpaint validation failed: insufficient expansion", {
          maxExpansion,
          expansions: {
            left: leftExpansion,
            right: rightExpansion,
            top: topExpansion,
            bottom: bottomExpansion,
          },
        });
        return;
      }
    }

    // INPAINT VALIDATION: Only requires drawn objects (prompt is optional, backend will use default)
    if (shouldUseInpaint) {
      if (!hasDrawnObjects) {
        toast.error(
          'Please draw objects on the image first! Use "Add Objects" tools (Rectangle, Brush, or Pencil) to mark areas you want to modify.',
          {
            duration: 4000,
          }
        );
        console.warn("❌ Inpaint validation failed: no drawn objects");
        return;
      }
    }

    // Check credits after validation passes
    if (!checkCreditsBeforeAction(1)) {
      return; // Credit check handles the error display
    }

    // Compute generation tracking data from current selection (same as CreatePage)
    let generationInputImageId: number | undefined;
    let generationInputImagePreviewUrl: string | undefined;

    if (selectedImageType === "input") {
      generationInputImageId = selectedImageId;
      const inputImage = inputImages.find((img) => img.id === selectedImageId);
      generationInputImagePreviewUrl = inputImage?.imageUrl;
    } else if (selectedImageType === "generated") {
      const historyImage = filteredHistoryImages.find(
        (img) => img.id === selectedImageId
      );
      if (historyImage && historyImage.originalInputImageId) {
        // Try to find the original input image for tracking
        const originalInputImage = inputImages.find(
          (img) => img.id === historyImage.originalInputImageId
        );
        if (originalInputImage) {
          generationInputImageId = historyImage.originalInputImageId;
          generationInputImagePreviewUrl = originalInputImage.imageUrl;
        } else {
          // Fallback: Use the generated image itself for tracking when original input is not found
          console.warn(
            "⚠️ Original input image not found, using generated image for tracking"
          );
          generationInputImageId = selectedImageId;
          generationInputImagePreviewUrl = historyImage.imageUrl;
        }
      } else {
        // Fallback: Use the generated image itself when no originalInputImageId
        console.warn(
          "⚠️ No originalInputImageId found, using generated image for tracking"
        );
        generationInputImageId = selectedImageId;
        generationInputImagePreviewUrl = historyImage?.imageUrl;
      }
    }

    if (!generationInputImageId || !generationInputImagePreviewUrl) {
      toast.error("Please select a valid image before generating.");
      console.warn("❌ Missing generation tracking data", {
        selectedImageId,
        selectedImageType,
        generationInputImageId,
        generationInputImagePreviewUrl,
      });
      return;
    }

    // 🔥 NEW: Start generation loading state immediately before API calls
    dispatch(
      startGeneration({
        batchId: 0, // Temporary batchId - will be replaced with real one from API response
        inputImageId: generationInputImageId,
        inputImagePreviewUrl: generationInputImagePreviewUrl,
      })
    );

    try {
      // Execute the determined API call
      if (shouldUseOutpaint) {
        await handleOutpaintGeneration(
          generationInputImageId,
          generationInputImagePreviewUrl
        );
      } else {
        await handleInpaintGeneration(
          generationInputImageId,
          generationInputImagePreviewUrl
        );
      }
    } catch (error) {
      // If API call fails, stop the generation state
      dispatch(stopGeneration());
      throw error; // Re-throw to maintain existing error handling
    }
  };

  // Update handleInpaintGeneration and handleOutpaintGeneration to accept arguments
  const handleInpaintGeneration = async (
    generationInputImageId?: number,
    generationInputImagePreviewUrl?: string
  ) => {
    if (!generationInputImageId || !generationInputImagePreviewUrl) {
      console.error("❌ Missing generation tracking data");
      return;
    }

    try {
      if (canvasRef.current) {
        const maskDataUrl = canvasRef.current.generateMaskImage();

        if (maskDataUrl) {
          // Convert mask to blob for upload
          const response = await fetch(maskDataUrl);
          const maskBlob = await response.blob();

          // Upload mask to get URL
          const formData = new FormData();
          formData.append("file", maskBlob, "mask.png");

          const uploadResponse = await api.post(
            "/tweak/upload/mask",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          if (!uploadResponse.data || !uploadResponse.data.success) {
            throw new Error(
              uploadResponse.data?.message || "Failed to upload mask image"
            );
          }

          const maskImageUrl = uploadResponse.data.url;

          // Get server image URL for API calls (not blob URLs)
          const currentImageUrl = getServerImageUrl();
          if (!currentImageUrl) {
            throw new Error("Server image URL not available for processing");
          }

          // Validate that we have a valid originalBaseImageId
          // For generated images, we prefer to use their originalInputImageId, but fallback to the generated image ID
          let validOriginalBaseImageId = selectedImageId;

          // Check if selected image is a generated image with originalInputImageId
          const selectedGeneratedImage = filteredHistoryImages.find(
            (img) => img.id === selectedImageId
          );
          if (
            selectedGeneratedImage &&
            selectedGeneratedImage.originalInputImageId
          ) {
            // Try to find the original input image to verify it exists
            const originalInputImage = inputImages.find(
              (img) => img.id === selectedGeneratedImage.originalInputImageId
            );
            if (originalInputImage) {
              validOriginalBaseImageId =
                selectedGeneratedImage.originalInputImageId;
            } else {
              // Fallback: Use the generated image ID when original input is not found
              console.warn(
                "⚠️ Original input image not found for inpaint, using generated image ID"
              );
              validOriginalBaseImageId = selectedImageId;
            }
          }

          if (!validOriginalBaseImageId) {
            throw new Error(
              "No valid base image ID found. Please select an image before attempting to generate inpaint."
            );
          }

          // Determine which API to call based on selected model
          // nanobanana and seedream4 use runFluxKonect (text-based editing)
          // Other models use generateInpaint (mask-based editing)
          const isTextBasedModel = selectedModel === 'nanobanana' || selectedModel === 'seedream4';
          
          let resultAction: any;
          if (isTextBasedModel) {
            // Use runFluxKonect for text-based models (ignores mask, uses prompt only)
            resultAction = await dispatch(
              runFluxKonect({
                prompt: prompt,
                imageUrl: currentImageUrl,
                variations,
                model: selectedModel,
                selectedBaseImageId: selectedImageId,
                originalBaseImageId: selectedImageId,
              })
            );
          } else {
            // Call true inpaint API for models that support mask semantics
            resultAction = await dispatch(
              generateInpaint({
                baseImageUrl: currentImageUrl,
                maskImageUrl: maskImageUrl,
                prompt: prompt,
                negativePrompt:
                  "saturated full colors, neon lights,blurry  jagged edges, noise, and pixelation, oversaturated, unnatural colors or gradients  overly smooth or plastic-like surfaces, imperfections. deformed, watermark, (face asymmetry, eyes asymmetry, deformed eyes, open mouth), low quality, worst quality, blurry, soft, noisy extra digits, fewer digits, and bad anatomy. Poor Texture Quality: Avoid repeating patterns that are noticeable and break the illusion of realism. ,sketch, graphite, illustration, Unrealistic Proportions and Scale:  incorrect proportions. Out of scale",
                maskKeyword: prompt,
                variations: variations,
                originalBaseImageId: validOriginalBaseImageId,
                selectedBaseImageId: selectedImageId || undefined,
              })
            );
          }

          // Check for success from either action type
          const isFulfilled = isTextBasedModel
            ? runFluxKonect.fulfilled.match(resultAction)
            : generateInpaint.fulfilled.match(resultAction);

          if (isFulfilled) {
            // 🔥 NEW: Add processing placeholders to history panel immediately
            // Handle both runFluxKonect and generateInpaint response structures
            const responsePayload = resultAction.payload as any;
            const batchId = responsePayload?.batchId || responsePayload?.data?.batchId;
            const runpodJobs = responsePayload?.runpodJobs || responsePayload?.data?.runpodJobs;
            let imageIds: number[] = [];

            if (Array.isArray(runpodJobs) && runpodJobs.length > 0) {
              imageIds = runpodJobs.map((job: any, idx: number) => {
                return parseInt(job.imageId) || job.imageId || (batchId ? batchId * 1000 + idx + 1 : Date.now() + idx);
              });
            } else if (Array.isArray(responsePayload?.data?.imageIds) && responsePayload.data.imageIds.length > 0) {
              imageIds = responsePayload.data.imageIds;
            }

            if (imageIds.length > 0 && batchId) {
              dispatch(
                addProcessingTweakVariations({
                  batchId: batchId,
                  totalVariations: variations,
                  imageIds,
                })
              );

              // Auto-select the first generated image so it opens on the canvas immediately (will show once completed)
              try {
                const firstId = imageIds[0];
                dispatch(setSelectedImage({ id: firstId, type: "generated" }));
                setRecentAutoSelection(true);
                setTimeout(() => setRecentAutoSelection(false), 3000);
              } catch (e) {
                console.warn("Failed to auto-select generated image", e);
              }

              // For input images: Update generation tracking with real batchId
              // For generated images: Stop immediate loading since server responded successfully
              if (selectedImageType === "input") {
                dispatch(
                  startGeneration({
                    batchId: batchId,
                    inputImageId: generationInputImageId,
                    inputImagePreviewUrl: generationInputImagePreviewUrl,
                  })
                );
              } else {
                // For generated images: Stop the immediate loading, WebSocket will handle the rest
                dispatch(stopGeneration());
              }

              // 🔥 UPDATED: Keep loading state on canvas until WebSocket receives completion
              // Loading will be cleared by WebSocket in useRunPodWebSocket.ts when images are ready
            } else {
              // If server didn't return image ids/runpod jobs, stop generation to avoid stale spinners
              console.warn("⚠️ No image IDs returned from response; aborting placeholder creation", resultAction.payload);
              dispatch(stopGeneration());
            }

            // Update credits if provided in the response
            if (responsePayload?.data?.remainingCredits !== undefined) {
              dispatch(
                updateCredits(responsePayload.data.remainingCredits)
              );
            } else {
              // Fallback: refresh user data to get updated credits
              dispatch(fetchCurrentUser());
            }
          } else {
            // Enhanced error logging
            const actionName = isTextBasedModel ? 'runFluxKonect' : 'generateInpaint';
            console.error(`❌ ${actionName} rejected:`, {
              error: resultAction.error,
              payload: resultAction.payload,
              type: resultAction.type,
            });
            
            // Extract error message
            let errorMessage = "Unknown error occurred";
            if (resultAction.payload) {
              const errorPayload = resultAction.payload as any;
              if (typeof errorPayload === 'string') {
                errorMessage = errorPayload;
              } else if (errorPayload?.message) {
                errorMessage = errorPayload.message;
              } else if (errorPayload?.code) {
                errorMessage = errorPayload.message || errorPayload.code;
              }
            } else if (resultAction.error?.message) {
              errorMessage = resultAction.error.message;
            }
            
            throw new Error(
              `Failed to generate inpaint (${actionName}): ${errorMessage}`
            );
          }
        } else {
          dispatch(stopGeneration());
        }
      } else {
        dispatch(stopGeneration());
      }
    } catch (error: any) {
      console.error("❌ Error in handleInpaintGeneration:", error);
      dispatch(stopGeneration());

      // Handle specific error cases
      if (
        error.response?.status === 403 &&
        error.response?.data?.code === "SUBSCRIPTION_REQUIRED"
      ) {
        toast.error(
          error.response.data.message || "Active subscription required"
        );
      } else if (
        error.response?.status === 402 &&
        error.response?.data?.code === "INSUFFICIENT_CREDITS"
      ) {
        toast.error(error.response.data.message || "Insufficient credits");
      } else {
        toast.error(
          "Failed to generate inpaint: " +
            (error.response?.data?.message || error.message)
        );
      }
    }
  };

  const handleOutpaintGeneration = async (
    generationInputImageId?: number,
    generationInputImagePreviewUrl?: string
  ) => {
    if (!selectedImageId) {
      console.warn("Cannot trigger outpaint: no image selected");
      return;
    }

    // Check if outpaint is needed
    const isOutpaintNeeded =
      canvasBounds.width > originalImageBounds.width ||
      canvasBounds.height > originalImageBounds.height;

    if (!isOutpaintNeeded) {
      return;
    }

    // Get generation tracking data
    if (!generationInputImageId || !generationInputImagePreviewUrl) {
      console.error("❌ Missing generation tracking data");
      return;
    }

    try {
      // Get server image URL for API calls (not blob URLs)
      const currentImageUrl = getServerImageUrl();
      if (!currentImageUrl) {
        throw new Error("Server image URL not available for processing");
      }

      // Validate that we have a valid originalBaseImageId
      // For generated images, we prefer to use their originalInputImageId, but fallback to the generated image ID
      let validOriginalBaseImageId = selectedImageId;

      // Check if selected image is a generated image with originalInputImageId
      const selectedGeneratedImage = filteredHistoryImages.find(
        (img) => img.id === selectedImageId
      );
      if (
        selectedGeneratedImage &&
        selectedGeneratedImage.originalInputImageId
      ) {
        // Try to find the original input image to verify it exists
        const originalInputImage = inputImages.find(
          (img) => img.id === selectedGeneratedImage.originalInputImageId
        );
        if (originalInputImage) {
          validOriginalBaseImageId =
            selectedGeneratedImage.originalInputImageId;
        } else {
          // Fallback: Use the generated image ID when original input is not found
          console.warn(
            "⚠️ Original input image not found for outpaint, using generated image ID"
          );
          validOriginalBaseImageId = selectedImageId;
        }
      }

      if (!validOriginalBaseImageId) {
        throw new Error(
          "No valid base image ID found. Please select an image before attempting to generate outpaint."
        );
      }

      // Call outpaint API
      const resultAction = await dispatch(
        generateOutpaint({
          prompt: prompt,
          baseImageUrl: currentImageUrl,
          canvasBounds,
          originalImageBounds,
          variations: variations,
          originalBaseImageId: validOriginalBaseImageId,
          selectedBaseImageId: selectedImageId || undefined, // Include selectedBaseImageId for WebSocket dual notification
          outpaintOption: outpaintOption,
        })
      );

      if (generateOutpaint.fulfilled.match(resultAction)) {
        // 🔥 NEW: Add processing placeholders to history panel immediately
        if (
          resultAction.payload?.data?.imageIds &&
          resultAction.payload?.data?.batchId
        ) {
          dispatch(
            addProcessingTweakVariations({
              batchId: resultAction.payload.data.batchId,
              totalVariations: variations,
              imageIds: resultAction.payload.data.imageIds,
            })
          );

          // For input images: Update generation tracking with real batchId
          // For generated images: Stop immediate loading since server responded successfully
          if (selectedImageType === "input") {
            dispatch(
              startGeneration({
                batchId: resultAction.payload.data.batchId,
                inputImageId: generationInputImageId,
                inputImagePreviewUrl: generationInputImagePreviewUrl,
              })
            );
          } else {
            // For generated images: Stop the immediate loading, WebSocket will handle the rest
            dispatch(stopGeneration());
          }

          // 🔥 UPDATED: Keep loading state on canvas until WebSocket receives completion
          // Loading will be cleared by WebSocket in useRunPodWebSocket.ts when images are ready
        }

        // Update credits if provided in the response
        if (resultAction.payload?.data?.remainingCredits !== undefined) {
          dispatch(updateCredits(resultAction.payload.data.remainingCredits));
        } else {
          // Fallback: refresh user data to get updated credits
          dispatch(fetchCurrentUser());
        }
      } else {
        throw new Error(
          "Failed to generate outpaint: " + resultAction.error?.message
        );
      }
    } catch (error: any) {
      console.error("❌ Error in handleOutpaintGeneration:", error);
      dispatch(stopGeneration());

      // Handle specific error cases
      if (
        error.response?.status === 403 &&
        error.response?.data?.code === "SUBSCRIPTION_REQUIRED"
      ) {
        toast.error(
          error.response.data.message || "Active subscription required"
        );
      } else if (
        error.response?.status === 402 &&
        error.response?.data?.code === "INSUFFICIENT_CREDITS"
      ) {
        toast.error(error.response.data.message || "Insufficient credits");
      } else {
        toast.error(
          "Failed to generate outpaint: " +
            (error.response?.data?.message || error.message)
        );
      }
    }
  };

  const handleAddImageToCanvas = async (file: File) => {
    if (!selectedImageId) return;

    // Add image at center of canvas
    await dispatch(
      addImageToCanvas({
        baseImageId: selectedImageId,
        addedImage: file,
        position: { x: 400, y: 300 }, // Center position
        size: { width: 200, height: 200 }, // Default size
      })
    );
  };

  const handlePromptChange = (newPrompt: string) => {
    dispatch(setPrompt(newPrompt));
    // 🔥 REMOVED: Auto-save on typing - will save only on Generate
  };

  const handleVariationsChange = (newVariations: number) => {
    dispatch(setVariations(newVariations));
  };

  const handleUndo = () => {
    dispatch(undo());
    // Clear local canvas selections after undo
    canvasRef.current?.clearLocalSelections();
  };

  const handleRedo = () => {
    dispatch(redo());
    // Clear local canvas selections after redo
    canvasRef.current?.clearLocalSelections();
  };

  const handleDownload = () => {
    console.log("Download image:", selectedImageId);
    // Additional download logic can be added here if needed
  };

  const handleOpenGallery = () => {
    dispatch(setMode("edit"));
    dispatch(setIsModalOpen(true));
  };

  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (imageUrl: string) => {
    if (!selectedImageId) {
      toast.error("Please select an image to share");
      return;
    }

    if (isSharing) return; // Prevent multiple clicks

    setIsSharing(true);
    try {
      // Determine the API endpoint based on image type
      let apiUrl;
      if (selectedImageType === "input") {
        apiUrl = `/images/input-images/share/${selectedImageId}`;
      } else {
        apiUrl = `/images/share/${selectedImageId}`;
      }

      // Call API to toggle share status (make image public/private)
      const response = await api.post(apiUrl);

      if (response.data.success) {
        const action = response.data.action;
        const isPublic = response.data.isPublic;

        if (isPublic) {
          toast.success(
            "Image shared to community! Others can now see and like it in Explore.",
            {
              duration: 4000,
            }
          );
        } else {
          toast.success("Image removed from community sharing.", {
            duration: 3000,
          });
        }

        console.log(`✅ Image ${action}:`, {
          imageId: selectedImageId,
          isPublic,
          likesCount: response.data.likesCount,
        });
      }
    } catch (error) {
      console.error("❌ Error sharing image:", error);
      toast.error("Failed to share image. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCreate = async (imageId?: number) => {
    console.log("🟢 CREATE BUTTON CLICKED (TWEAK):", { imageId });

    if (imageId) {
      // Determine if it's an input or generated image (TWEAK module only)
      const isInputImage = inputImages.some((img) => img.id === imageId);
      const isTweakImage = filteredHistoryImages.some(
        (img) => img.id === imageId
      );

      console.log("🔍 Image type detection (Create from Tweak):", {
        imageId,
        isInputImage,
        isTweakImage,
        totalInputImages: inputImages.length,
        totalTweakImages: filteredHistoryImages.length,
      });

      if (isInputImage) {
        // For input images, check if already converted to CREATE
        const inputImage = inputImages.find((img) => img.id === imageId);

        if (inputImage && inputImage.createUploadId) {
          // Already converted - use existing CREATE input
          console.log(
            "✅ Using existing CREATE conversion:",
            inputImage.createUploadId
          );
          navigate(`/create?imageId=${inputImage.createUploadId}&type=input`);
        } else {
          // Convert: Create new CREATE input image with cross-module tracking
          const result = await dispatch(
            createInputImageFromExisting({
              imageUrl: inputImage!.imageUrl,
              thumbnailUrl: inputImage!.thumbnailUrl,
              fileName: `create-from-tweak-input-${inputImage!.id}.jpg`,
              originalImageId: inputImage!.id,
              uploadSource: "CREATE_MODULE",
              currentPrompt: prompt,
              currentAIMaterials: aiPromptMaterials,
            })
          );

          if (createInputImageFromExisting.fulfilled.match(result)) {
            const newInputImage = result.payload;
            // Refresh Tweak page data
            dispatch(
              fetchInputImagesBySource({ uploadSource: "TWEAK_MODULE" })
            );
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));
            toast.success("Image uploaded to Create module");
            navigate(`/create?imageId=${newInputImage.id}&type=input`);
          } else {
            throw new Error("Failed to convert input image for Create module");
          }
        }
      } else if (isTweakImage) {
        // For generated images, check if already converted or convert now
        const generatedImage = filteredHistoryImages.find(
          (img) => img.id === imageId
        );

        if (generatedImage) {
          try {
            if (generatedImage.createUploadId) {
              // Already converted - use existing
              console.log(
                "✅ Using existing CREATE conversion for generated image:",
                generatedImage.createUploadId
              );
              navigate(
                `/create?imageId=${generatedImage.createUploadId}&type=input`
              );
            } else {
              // Convert: Create new input image for Create module
              const result = await dispatch(
                createInputImageFromExisting({
                  imageUrl: generatedImage.imageUrl,
                  thumbnailUrl: generatedImage.thumbnailUrl,
                  fileName: `create-from-tweak-generated-${generatedImage.id}.jpg`,
                  originalImageId: generatedImage.id,
                  uploadSource: "CREATE_MODULE",
                  currentPrompt: prompt,
                  currentAIMaterials: aiPromptMaterials,
                })
              );

              if (createInputImageFromExisting.fulfilled.match(result)) {
                const newInputImage = result.payload;
                // Refresh Tweak page data
                dispatch(
                  fetchInputImagesBySource({ uploadSource: "TWEAK_MODULE" })
                );
                dispatch(fetchAllVariations({ page: 1, limit: 100 }));
                toast.success("Image uploaded to Create module");
                navigate(`/create?imageId=${newInputImage.id}&type=input`);
              } else {
                throw new Error(
                  "Failed to convert generated image for Create module"
                );
              }
            }
          } catch (error: any) {
            console.error("❌ CREATE button error (generated image):", error);
            toast.error(
              "Failed to convert image for Create module: " + error.message
            );
          }
        }
      } else {
        toast.error("Image not found");
      }

      // Close gallery modal if open
      dispatch(setIsModalOpen(false));
    } else {
      toast.error("No image selected for creating");
    }
  };

  const handleUpscale = async (imageId?: number) => {
    console.log("🟡 UPSCALE BUTTON CLICKED (TWEAK):", { imageId });

    if (imageId) {
      // Determine if it's an input or generated image (TWEAK module only)
      const isInputImage = inputImages.some((img) => img.id === imageId);
      const isTweakImage = filteredHistoryImages.some(
        (img) => img.id === imageId
      );

      if (isInputImage) {
        // For input images, check if already converted to REFINE
        const inputImage = inputImages.find((img) => img.id === imageId);

        if (inputImage && inputImage.refineUploadId) {
          // Already converted - use existing REFINE input
          navigate(`/upscale?imageId=${inputImage.refineUploadId}&type=input`);
        } else {
          try {
            const result = await dispatch(
              createInputImageFromExisting({
                imageUrl: inputImage!.imageUrl,
                thumbnailUrl: inputImage!.thumbnailUrl,
                fileName: `refine-from-tweak-input-${inputImage!.id}.jpg`,
                originalImageId: inputImage!.id,
                uploadSource: "REFINE_MODULE",
                currentPrompt: prompt,
                currentAIMaterials: aiPromptMaterials,
              })
            );

            if (createInputImageFromExisting.fulfilled.match(result)) {
              const newInputImage = result.payload;
              // Refresh Tweak page data
              dispatch(
                fetchInputImagesBySource({ uploadSource: "TWEAK_MODULE" })
              );
              dispatch(fetchAllVariations({ page: 1, limit: 100 }));
              setTimeout(() => {
                navigate(`/upscale?imageId=${newInputImage.id}&type=input`);
              }, 300);
            } else {
              throw new Error(
                "Failed to convert input image for Refine module"
              );
            }
          } catch (error: any) {
            toast.error(
              "Failed to convert image for Refine module: " + error.message
            );
          }
        }
      } else if (isTweakImage) {
        // For generated images, check if already converted or convert now
        const generatedImage = filteredHistoryImages.find(
          (img) => img.id === imageId
        );

        if (generatedImage) {
          try {
            if (generatedImage.refineUploadId) {
              // Already converted - use existing
              navigate(
                `/upscale?imageId=${generatedImage.refineUploadId}&type=input`
              );
            } else {
              const result = await dispatch(
                createInputImageFromExisting({
                  imageUrl: generatedImage.imageUrl,
                  thumbnailUrl: generatedImage.thumbnailUrl,
                  fileName: `refine-from-tweak-generated-${generatedImage.id}.jpg`,
                  originalImageId: generatedImage.id,
                  uploadSource: "REFINE_MODULE",
                  currentPrompt: prompt,
                  currentAIMaterials: aiPromptMaterials,
                })
              );

              if (createInputImageFromExisting.fulfilled.match(result)) {
                const newInputImage = result.payload;
                // Refresh Tweak page data
                dispatch(
                  fetchInputImagesBySource({ uploadSource: "TWEAK_MODULE" })
                );
                dispatch(fetchAllVariations({ page: 1, limit: 100 }));
                setTimeout(() => {
                  navigate(`/upscale?imageId=${newInputImage.id}&type=input`);
                }, 300);
              } else {
                throw new Error(
                  "Failed to convert generated image for Refine module"
                );
              }
            }
          } catch (error: any) {
            toast.error(
              "Failed to convert image for Refine module: " + error.message
            );
          }
        }
      } else {
        toast.error("Image not found");
      }

      // Close gallery modal if open
      dispatch(setIsModalOpen(false));
    } else {
      toast.error("No image selected for upscaling");
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (historyIndex > 0) {
          handleUndo();
        }
      } else if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Z") ||
        ((e.metaKey || e.ctrlKey) && e.key === "y")
      ) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          handleRedo();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history.length]);

  // Get current image URL for display (prefers blob URLs for performance)
  const getCurrentImageUrl = () => {
    if (!selectedImageId) {
      return undefined;
    }

    // Respect selectedImageType to determine which array to search
    if (selectedImageType === "input") {
      // Only look in input images when selectedImageType is 'input'
      const inputImage = inputImages.find((img) => img.id === selectedImageId);
      if (inputImage) {
        return inputImage.imageUrl;
      }
    } else if (selectedImageType === "generated") {
      // Only look in history images when selectedImageType is 'generated'
      // For generated images, use cached object URL if available
      if (imageObjectUrls[selectedImageId]) {
        return imageObjectUrls[selectedImageId];
      }
      const historyImage = filteredHistoryImages.find(
        (img) => img.id === selectedImageId
      );

      if (historyImage) {
        return historyImage.imageUrl;
      }
    } else {
      // Fallback: if selectedImageType is undefined, check both arrays (legacy behavior)
      // Check in input images first
      const inputImage = inputImages.find((img) => img.id === selectedImageId);
      if (inputImage) {
        return inputImage.imageUrl;
      }

      // Check in filtered history images
      if (imageObjectUrls[selectedImageId]) {
        return imageObjectUrls[selectedImageId];
      }
      const historyImage = filteredHistoryImages.find(
        (img) => img.id === selectedImageId
      );
      if (historyImage) {
        return historyImage.imageUrl;
      }
    }

    return undefined;
  };

  const runFluxKonectHandler = async (opts?: { referenceImageUrls?: string[] }) => {
    let generationInputImageId: number | undefined;
    let generationInputImagePreviewUrl: string | undefined;

    if (selectedImageType === "input") {
      generationInputImageId = selectedImageId;
      const inputImage = inputImages.find((img) => img.id === selectedImageId);
      generationInputImagePreviewUrl = inputImage?.imageUrl;
    } else if (selectedImageType === "generated") {
      const historyImage = filteredHistoryImages.find(
        (img) => img.id === selectedImageId
      );
      if (historyImage && historyImage.originalInputImageId) {
        // Try to find the original input image for tracking
        const originalInputImage = inputImages.find(
          (img) => img.id === historyImage.originalInputImageId
        );
        if (originalInputImage) {
          generationInputImageId = historyImage.originalInputImageId;
          generationInputImagePreviewUrl = originalInputImage.imageUrl;
        } else {
          // Fallback: Use the generated image itself for tracking when original input is not found
          console.warn(
            "⚠️ Original input image not found, using generated image for tracking"
          );
          generationInputImageId = selectedImageId;
          generationInputImagePreviewUrl = historyImage.imageUrl;
        }
      } else {
        // Fallback: Use the generated image itself when no originalInputImageId
        console.warn(
          "⚠️ No originalInputImageId found, using generated image for tracking"
        );
        generationInputImageId = selectedImageId;
        generationInputImagePreviewUrl = historyImage?.imageUrl;
      }
    }

    if (!generationInputImageId || !generationInputImagePreviewUrl) {
      toast.error("Please select a valid image before generating.");
      console.warn("❌ Missing generation tracking data", {
        selectedImageId,
        selectedImageType,
        generationInputImageId,
        generationInputImagePreviewUrl,
      });
      return;
    }

    dispatch(
      startGeneration({
        batchId: 0, // Temporary batchId - will be replaced with real one from API response
        inputImageId: generationInputImageId,
        inputImagePreviewUrl: generationInputImagePreviewUrl,
      })
    );

    const imageUrl = generationInputImagePreviewUrl;

    const textPrompt = prompt;

    if (!textPrompt) {
      toast.error("Please enter a text description for your edits");
      return;
    }

    if (!imageUrl) {
      toast.error("Please select an image first");
      return;
    }

    try {
      const resultResponse: any = await dispatch(
        runFluxKonect({
          prompt: textPrompt,
          imageUrl,
          variations,
          selectedBaseImageId: selectedImageId,
          originalBaseImageId: selectedImageId, // Pass the selected image as the base
          referenceImageUrls: opts?.referenceImageUrls,
        })
      );

      if (resultResponse?.payload?.success) {
        setNewImageGenerated(
          resultResponse?.payload?.data?.generatedImageUrl?.[0]?.value?.generatedImageUrl
        );
        handlePromptChange(""); // Clear the prompt
        dispatch(stopGeneration());
        toast.success(
          `Flux edit started! ${variations} variation${
            variations > 1 ? "s" : ""
          } being generated.`
        );
      } else {
        throw new Error(
          resultResponse?.payload?.message || "Failed to start Flux edit"
        );
      }
    } catch (error: any) {
      console.error("❌ Flux edit failed:", error, error?.message, error?.code);
      dispatch(stopGeneration());
      toast.error("Failed to generate due to: " + error.message);
    }
  };

  // Get server image URL for API calls (not blob URLs)
  const [selectedModel, setSelectedModel] = useState("nanobanana");

  const handleModelChange = (model: string) => {
    // Prevent selecting disabled Flux Konect option
    if (model === 'flux-konect') {
      console.warn('Flux Konect is disabled, defaulting to Google Nano Banana');
      setSelectedModel('nanobanana');
      try {
        dispatch({ type: 'tweak/setSelectedModel', payload: 'nanobanana' });
      } catch (e) {
        console.warn('Failed to dispatch selected model to store', e);
      }
      return;
    }
    setSelectedModel(model);
    // Persist selected model to global tweak slice so websocket notifications can filter by it
    try {
      dispatch({ type: 'tweak/setSelectedModel', payload: model });
    } catch (e) {
      console.warn('Failed to dispatch selected model to store', e);
    }
  };

  const getServerImageUrl = () => {
    if (!selectedImageId) return undefined;

    // For input images, get the original URL from the database
    const inputImage = inputImages.find((img) => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.originalUrl || inputImage.imageUrl;
    }

    // For history images, get the server URL from the database
    const historyImage = filteredHistoryImages.find(
      (img) => img.id === selectedImageId
    );
    if (historyImage) {
      return historyImage.imageUrl || historyImage.processedImageUrl;
    }

    return undefined;
  };

  // Check if we have input images to determine layout (same as RefinePage)
  const hasInputImages = inputImages && inputImages.length > 0;

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(imageObjectUrls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []); // Remove imageObjectUrls dependency to prevent premature cleanup

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden relative">
        {hasInputImages ? (
          <>
            {/* Left Panel - Image Selection */}
            <div className="absolute top-1/2 left-3 -translate-y-1/2 z-50">
              <InputHistoryPanel
                images={inputImages}
                selectedImageId={
                  selectedImageType === "input"
                    ? selectedImageId || undefined
                    : undefined
                }
                onSelectImage={(imageId) => handleSelectImage(imageId, "input")}
                onUploadImage={handleImageUpload}
                loading={inputImagesLoading}
                error={inputImagesError}
              />
            </div>

            {/* Center - Canvas Area (Full Screen) or FileUpload */}
            {!selectedImageId ? (
              <div className="flex-1 flex items-center justify-center">
                <FileUpload
                  onUploadImage={handleImageUpload}
                  loading={inputImagesLoading}
                />
              </div>
            ) : (
              <TweakCanvas
                ref={canvasRef}
                imageUrl={
                  newImageGenerated ? newImageGenerated : getCurrentImageUrl()
                }
                currentTool={currentTool}
                selectedBaseImageId={selectedBaseImageId}
                selectedImageId={selectedImageId}
                onDownload={handleDownload}
                loading={
                  historyImagesLoading ||
                  (selectedImageType === "generated" &&
                    downloadingImageId === selectedImageId)
                }
                isGenerating={isGenerating}
                selectedImageType={selectedImageType}
                generatingInputImageId={generatingInputImageId}
                onOpenGallery={handleOpenGallery}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onShare={handleShare}
                onCreate={handleCreate}
                onUpscale={handleUpscale}
                imageId={selectedImageId || undefined}
                downloadProgress={
                  downloadingImageId === selectedImageId
                    ? downloadProgress
                    : undefined
                }
                isSharing={isSharing}
              />
            )}

            {/* Right Panel - Tweak History */}
            <HistoryPanel
              images={filteredHistoryImages}
              selectedImageId={
                selectedImageType === "generated"
                  ? selectedImageId || undefined
                  : undefined
              }
              onSelectImage={(imageId, sourceType = "generated") =>
                handleSelectImage(imageId, sourceType)
              }
              loading={historyImagesLoading}
              showAllImages={true}
              downloadingImageId={downloadingImageId}
              downloadProgress={downloadProgress}
            />

            {/* Floating Toolbar - only show when image is selected */}
            {selectedImageId && (
              <TweakToolbar
                currentTool={currentTool}
                onToolChange={handleToolChange}
                onGenerate={handleGenerate}
                onAddImage={handleAddImageToCanvas}
                prompt={prompt}
                variations={variations}
                onVariationsChange={handleVariationsChange}
                disabled={!selectedImageId}
                loading={false}
                isGenerating={isGenerating}
                selectedImageType={selectedImageType}
                selectedImageId={selectedImageId}
                generatingInputImageId={generatingInputImageId}
                operationType={operationType}
                outpaintOption={outpaintOption}
                onOutpaintOptionChange={setOutpaintOption}
                selectedImageUrl={getCurrentImageUrl()}
                runFluxKonectHandler={runFluxKonectHandler}
                onPromptChange={handlePromptChange}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
              />
            )}
          </>
        ) : (
          /* Show file upload section when no images exist */
          <div className="flex-1 flex items-center justify-center">
            <FileUpload
              onUploadImage={handleImageUpload}
              loading={inputImagesLoading}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TweakPage;