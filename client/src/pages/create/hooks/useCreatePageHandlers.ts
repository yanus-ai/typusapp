import { useCallback } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useCreditCheck } from "@/hooks/useCreditCheck";
import { useSearchParams, useNavigate } from "react-router-dom";
import { setSelectedImage } from "@/features/create/createUISlice";
import { runFluxKonect } from "@/features/tweak/tweakSlice";
import { loadSettingsFromImage } from "@/features/customization/customizationSlice";
import { generateMasks, getMasks, setMaskGenerationFailed } from "@/features/masks/maskSlice";
import { createSession, setCurrentSession, getSession } from "@/features/sessions/sessionSlice";
import { InputImage } from "@/features/images/inputImagesSlice";
import { generateWithCurrentState, HistoryImage } from "@/features/images/historyImagesSlice";
import { useBatchManager } from "./useBatchManager";
import toast from "react-hot-toast";

interface AttachmentUrls {
  baseImageUrl?: string;
  referenceImageUrls?: string[];
  surroundingUrls?: string[];
  wallsUrls?: string[];
}

interface BaseImageInfo {
  url: string;
  inputImageId: number;
}

const getInputImageUrl = (image: InputImage): string | undefined => {
  return image.originalUrl || image.imageUrl || image.processedUrl;
};

const findMatchingInputImage = (
  inputImages: InputImage[],
  url: string
): InputImage | undefined => {
  return inputImages.find(
    img => img.originalUrl === url || img.imageUrl === url || img.processedUrl === url
  );
};

const getBaseImageInfo = (
  selectedImageId: number | undefined,
  selectedImageType: 'input' | 'generated' | undefined,
  inputImages: InputImage[],
  historyImages: HistoryImage[],
  attachments?: AttachmentUrls
): BaseImageInfo | null => {
  if (selectedImageId && selectedImageType === 'input') {
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    const url = inputImage ? getInputImageUrl(inputImage) : undefined;
    if (url) {
      return { url, inputImageId: selectedImageId };
    }
  }

  if (selectedImageType === 'generated' && selectedImageId) {
    const generatedImage = historyImages.find(img => img.id === selectedImageId);
    if (generatedImage?.originalInputImageId) {
      const originalInputImage = inputImages.find(
        img => img.id === generatedImage.originalInputImageId
      );
      const url = originalInputImage ? getInputImageUrl(originalInputImage) : undefined;
      if (url && generatedImage.originalInputImageId) {
        return { url, inputImageId: generatedImage.originalInputImageId };
      }
    }
  }

  if (attachments?.baseImageUrl) {
    const matchingInputImage = findMatchingInputImage(inputImages, attachments.baseImageUrl);
    if (matchingInputImage) {
      return { url: attachments.baseImageUrl, inputImageId: matchingInputImage.id };
    }
    // CRITICAL FIX: Even if we can't find a matching input image, use the URL from attachments
    // This prevents the base image from being ignored when the URL doesn't match exactly
    // Use 0 as a fallback inputImageId (backend will handle this)
    return { url: attachments.baseImageUrl, inputImageId: 0 };
  }

  return null;
};

const buildPromptGuidance = (attachments?: AttachmentUrls): string => {
  const guidanceParts: string[] = [];
  
  const surroundingCount = attachments?.surroundingUrls?.length || 0;
  const wallsCount = attachments?.wallsUrls?.length || 0;

  if (surroundingCount > 0 && wallsCount > 0) {
    guidanceParts.push(`Use the ${wallsCount} wall texture image${wallsCount === 1 ? '' : 's'} as wall materials, and the ${surroundingCount} surrounding image${surroundingCount === 1 ? '' : 's'} as environmental/context references.`);
  } else if (wallsCount > 0) {
    guidanceParts.push(`Use the ${wallsCount} wall texture image${wallsCount === 1 ? '' : 's'} as wall materials.`);
  } else if (surroundingCount > 0) {
    guidanceParts.push(`Use the ${surroundingCount} surrounding image${surroundingCount === 1 ? '' : 's'} as environmental/context references.`);
  }

  return guidanceParts.length > 0 ? ` ${guidanceParts.join(' ')}` : '';
};

const getErrorMessage = (payload: any): string => {
  return payload?.message || payload?.error || 'Operation failed';
};

export const useCreatePageHandlers = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { checkCreditsBeforeAction } = useCreditCheck();
  const batchManager = useBatchManager();
  
  const inputImages = useAppSelector(state => state.inputImages.images);
  const historyImages = useAppSelector(state => state.historyImages.images);
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);
  const selectedModel = useAppSelector(state => state.tweak.selectedModel);
  const basePrompt = useAppSelector(state => state.masks.savedPrompt);
  const currentSession = useAppSelector(state => state.sessions.currentSession);
  const { masks, maskInputs, aiPromptMaterials } = useAppSelector(state => state.masks);
  const { 
    variations: selectedVariations, 
    aspectRatio, 
    size, 
    selections, 
    creativity, 
    expressivity, 
    resemblance, 
    dynamics, 
    tilingWidth, 
    tilingHeight, 
    selectedStyle 
  } = useAppSelector(state => state.customization);

  const handleSelectImage = useCallback((imageId: number, sourceType: 'input' | 'generated' = 'generated') => {
    dispatch(setSelectedImage({ id: imageId, type: sourceType }));
  }, [dispatch]);

  const handleCreateRegions = useCallback(async () => {
    if (!checkCreditsBeforeAction(1)) {
      return;
    }

    const baseInfo = getBaseImageInfo(
      selectedImageId,
      selectedImageType,
      inputImages,
      historyImages
    );

    if (!baseInfo) {
      toast.error('Please select a base image first');
      return;
    }

    // Ensure we have a valid inputImageId (not 0)
    if (!baseInfo.inputImageId || baseInfo.inputImageId === 0) {
      toast.error('Please select or upload a base image first');
      return;
    }

    try {
      dispatch(loadSettingsFromImage({
        inputImageId: baseInfo.inputImageId,
        imageId: selectedImageId || 0,
        isGeneratedImage: selectedImageType === 'generated',
        settings: {}
      }));

      console.log('🚀 Calling FastAPI color filter for region extraction', {
        inputImageId: baseInfo.inputImageId,
        imageUrl: baseInfo.url?.substring(0, 50) + '...'
      });

      // Call FastAPI color filter service to generate multiple black & white mask regions
      const resultResponse: any = await dispatch(
        generateMasks({
          imageUrl: baseInfo.url,
          inputImageId: baseInfo.inputImageId
        })
      );

      console.log('📥 FastAPI mask generation response:', resultResponse);

      if (resultResponse?.payload?.success || resultResponse?.type?.endsWith('/fulfilled')) {
        const payload = resultResponse?.payload?.data;
        const message = resultResponse?.payload?.message || '';
        
        // If masks already exist or are returned synchronously, refresh to get full relations
        if (payload?.maskRegions && payload.maskRegions.length > 0) {
          dispatch(getMasks(baseInfo.inputImageId));
        } else if (message.includes('already exist')) {
          dispatch(getMasks(baseInfo.inputImageId));
        }
      } else {
        const payload = resultResponse?.payload;
        const errorMsg = payload?.message || payload?.error || 'Region extraction failed';
        console.error('❌ FastAPI mask generation failed:', errorMsg, payload);
        toast.error(errorMsg);
        dispatch(setMaskGenerationFailed(errorMsg));
      }
    } catch (error: any) {
      console.error('❌ Create Regions error:', error);
      const errorMsg = error?.message || 'Failed to start region extraction';
      toast.error(errorMsg);
      dispatch(setMaskGenerationFailed(errorMsg));
    }
  }, [
    checkCreditsBeforeAction,
    selectedImageId,
    selectedImageType,
    inputImages,
    historyImages,
    dispatch
  ]);

  const handleGenerateWithCurrentState = async (userPrompt?: string | null, contextSelection?: string) => {
    if (!selectedImageId || !selectedImageType) {
      toast.error('Please select an image first');
      return;
    }

    const tempBatchId = Date.now();
    // Get final prompt early for placeholder
    const finalPrompt = userPrompt || basePrompt;
    
    // Build settings snapshot for placeholders
    const settingsSnapshot = {
      variations: selectedVariations,
      aspectRatio,
      size,
      model: selectedModel
    };
    
    // Create placeholder images immediately for instant UI feedback
    batchManager.createPlaceholders(
      tempBatchId,
      selectedVariations,
      finalPrompt || undefined,
      settingsSnapshot,
      aspectRatio
    );

    // Helper to cleanup placeholders
    const cleanupPlaceholders = () => {
      batchManager.cleanupPlaceholders(tempBatchId);
    };

    // Determine the correct inputImageId based on selected image type
    let targetInputImageId: number;
    if (selectedImageType === 'input') {
      targetInputImageId = selectedImageId;
    } else {
      // For generated images, use the original input image ID
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      if (!generatedImage?.originalInputImageId) {
        toast.error('Cannot find original input image for this generated image');
        cleanupPlaceholders();
        return;
      }
      targetInputImageId = generatedImage.originalInputImageId;
    }

    // Check credits before proceeding with generation
    if (!checkCreditsBeforeAction(1)) {
      cleanupPlaceholders();
      return;
    }

    if (!finalPrompt || !finalPrompt.trim()) {
      toast.error('Please enter a prompt');
      cleanupPlaceholders();
      return;
    }

    try {
      // Create session only when generating (not on page load) - SAME AS handleSubmit
      let sessionId = currentSession?.id;
      if (!sessionId) {
        // Create new session with user's original prompt
        const sessionResult = await dispatch(createSession(finalPrompt));
        if (createSession.fulfilled.match(sessionResult)) {
          sessionId = sessionResult.payload.id;
          dispatch(setCurrentSession(sessionResult.payload));
          // Update URL with new sessionId
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.set('sessionId', sessionId?.toString() || '');
          setSearchParams(newSearchParams, { replace: true });
        } else {
          // If session creation failed, still try to generate (sessionId will be null)
          console.error('Failed to create session:', sessionResult);
        }
      }

      // Collect mask prompts
      const maskPrompts: Record<string, string> = {};
      masks.forEach(mask => {
        const userInput = maskInputs[mask.id]?.displayName?.trim();
        if (userInput || mask.customText) {
          maskPrompts[`mask_${mask.id}`] = userInput || mask.customText || '';
        }
      });

      // Collect mask material mappings from current frontend state
      const maskMaterialMappings: Record<string, any> = {};
      masks.forEach(mask => {
        const userInput = maskInputs[mask.id]?.displayName?.trim();
        if (userInput || mask.customText || mask.materialOption || mask.customizationOption) {
          maskMaterialMappings[`mask_${mask.id}`] = {
            customText: userInput || mask.customText || '',
            materialOptionId: mask.materialOption?.id,
            customizationOptionId: mask.customizationOption?.id,
            subCategoryId: mask.subCategory?.id,
            imageUrl: maskInputs[mask.id]?.imageUrl || null,
            category: maskInputs[mask.id]?.category || ''
          };
        }
      });


      // Generate request
      const generateRequest = {
        prompt: finalPrompt,
        inputImageId: targetInputImageId,
        variations: selectedVariations,
        sessionId: sessionId || null, // ✅ Add sessionId to request
        settings: {
          seed: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
          model: "realvisxlLightning.safetensors",
          upscale: "Yes" as const,
          style: "No" as const,
          cfgKsampler1: creativity,
          cannyStrength: resemblance / 10,
          loraStrength: [1, expressivity / 10],
          mode: 'photorealistic',
          creativity,
          expressivity,
          resemblance,
          context: contextSelection
        },
        maskPrompts,
        maskMaterialMappings,
        aiPromptMaterials,
        contextSelection,
        sliderSettings: { creativity, expressivity, resemblance }
      };

      // Get current input image preview URL to save for generated images
      const currentInputImage = inputImages.find(img => img.id === targetInputImageId);
      const inputImagePreviewUrl = currentInputImage?.originalUrl || currentInputImage?.imageUrl || '';

      const result = await dispatch(generateWithCurrentState(generateRequest));

      if (generateWithCurrentState.fulfilled.match(result)) {
        // Start generation tracking and add processing placeholders
        const batchId = result.payload?.batchId;

        // 🔥 NEW: Add processing placeholders to history panel immediately (SAME AS TWEAK PAGE)
        // Note: For CREATE, we may not have imageIds in response like TWEAK does, so we'll generate them
        const runpodJobs = result.payload?.runpodJobs;
        
        if (batchId && runpodJobs) {
          // Generate imageIds based on the number of runpod jobs (variations)
          const imageIds = runpodJobs.map((_, index) => batchId * 1000 + index + 1); // Generate unique IDs
          
          batchManager.replacePlaceholders(
            tempBatchId,
            batchId,
            selectedVariations,
            imageIds,
            finalPrompt,
            settingsSnapshot,
            aspectRatio,
            targetInputImageId,
            inputImagePreviewUrl
          );
          
          // CRITICAL: Refresh session to include the new batch (SAME AS handleSubmit)
          // This ensures the batch appears in the UI even if session wasn't refreshed yet
          if (sessionId) {
            // Use a small delay to ensure backend has saved the batch
            setTimeout(() => {
              dispatch(getSession(sessionId));
            }, 300);
          }
          
        } else {
          console.warn('⚠️ No batchId or runpodJobs in generation response:', result.payload);
          cleanupPlaceholders();
        }
        
        // toast.success(message);
      } else {
        console.error('❌ Generation failed:', result.payload);
        const errorPayload = result.payload as any;
        toast.error(errorPayload?.message || 'Generation failed');
        cleanupPlaceholders();
      }
    } catch (error) {
      console.error('Error starting generation:', error);
      toast.error('An unexpected error occurred');
      cleanupPlaceholders();
    }
  };

  const handleSubmit = useCallback(async (
    userPrompt: string | null,
    _contextSelection?: string,
    attachments?: AttachmentUrls
  ) => {
    const tempBatchId = Date.now();
    
    let baseInfo = getBaseImageInfo(
      selectedImageId,
      selectedImageType,
      inputImages,
      historyImages,
      attachments
    );

    // CRITICAL FIX: If baseInfo is null but we have attachments.baseImageUrl, create a fallback baseInfo
    if (!baseInfo && attachments?.baseImageUrl) {
      baseInfo = { url: attachments.baseImageUrl, inputImageId: 0 };
    }

    const previewUrl = baseInfo?.url || '';
    
    // Get final prompt early for placeholder
    const finalPrompt = userPrompt || basePrompt;
    
    // Build settings snapshot for placeholders
    const settingsSnapshot = {
      variations: selectedVariations,
      aspectRatio,
      size,
      model: selectedModel
    };
    
    // Create placeholder images immediately for instant UI feedback
    batchManager.createPlaceholders(
      tempBatchId,
      selectedVariations,
      finalPrompt || undefined,
      settingsSnapshot,
      aspectRatio
    );

    // Helper to cleanup placeholders
    const cleanupPlaceholders = () => {
      batchManager.cleanupPlaceholders(tempBatchId);
    };

    if (!checkCreditsBeforeAction(1)) {
      cleanupPlaceholders();
      return;
    }

    if (!finalPrompt || !finalPrompt.trim()) {
      toast.error('Please enter a prompt');
      cleanupPlaceholders();
      return;
    }

    // Try to get base info if not already available
    if (!baseInfo) {
      baseInfo = getBaseImageInfo(
        selectedImageId,
        selectedImageType,
        inputImages,
        historyImages,
        attachments
      );
    }

    const combinedTextureUrls = [
      ...(attachments?.surroundingUrls || []),
      ...(attachments?.wallsUrls || [])
    ];

    const baseImageUrl = baseInfo?.url || attachments?.baseImageUrl || undefined;
    const baseAttachmentUrl = attachments?.baseImageUrl || baseImageUrl || undefined;
    
    const promptGuidance = buildPromptGuidance(attachments);
    const promptToSend = `${finalPrompt.trim()}${promptGuidance}`.trim();
    
    // Log base image resolution for debugging
    console.log('🎯 Frontend base image resolution:', {
      baseInfoUrl: baseInfo?.url || 'none',
      attachmentsBaseImageUrl: attachments?.baseImageUrl || 'none',
      resolvedBaseImageUrl: baseImageUrl || 'none',
      resolvedBaseAttachmentUrl: baseAttachmentUrl || 'none',
    });
    
    try {
      // Create session only when generating (not on page load)
      let sessionId = currentSession?.id;
      if (!sessionId) {
        // Create new session with user's original prompt (not the enhanced one with guidance)
        // This ensures the session name is based on what the user actually typed
        const sessionResult = await dispatch(createSession(finalPrompt));
        if (createSession.fulfilled.match(sessionResult)) {
          sessionId = sessionResult.payload.id;
          dispatch(setCurrentSession(sessionResult.payload));
          // Update URL with new sessionId
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.set('sessionId', sessionId?.toString() || '');
          setSearchParams(newSearchParams, { replace: true });
        } else {
          // If session creation failed, still try to generate (sessionId will be null)
          console.error('Failed to create session:', sessionResult);
        }
      }

      const resultResponse = await dispatch(
        runFluxKonect({
          prompt: promptToSend, // Prompt with guidance for Flux Konect API call
          originalPrompt: finalPrompt, // Original prompt without guidance for database storage
          imageUrl: baseImageUrl, // Use prioritized base image URL
          variations: selectedVariations,
          model: selectedModel,
          moduleType: 'CREATE',
          sessionId: sessionId || null,
          selectedBaseImageId: selectedImageId,
          originalBaseImageId: baseInfo?.inputImageId || undefined,
          baseAttachmentUrl: baseAttachmentUrl, // Always send baseAttachmentUrl as fallback
          referenceImageUrls: attachments?.referenceImageUrls || [],
          textureUrls: combinedTextureUrls.length > 0 ? combinedTextureUrls : undefined,
          surroundingUrls: attachments?.surroundingUrls,
          wallsUrls: attachments?.wallsUrls,
          size: size,
          aspectRatio: aspectRatio,
        })
      );

      if (resultResponse.type === 'tweak/runFluxKonect/rejected') {
        toast.error(getErrorMessage(resultResponse.payload));
        cleanupPlaceholders();
        return;
      }

      if (resultResponse?.payload?.success) {
        const realBatchId = resultResponse?.payload?.data?.batchId;
        const imageIds = resultResponse?.payload?.data?.imageIds || [];
        const variations = resultResponse?.payload?.data?.variations || selectedVariations;
        
        if (realBatchId) {
          // Replace temp placeholders with real batch placeholders
          batchManager.replacePlaceholders(
            tempBatchId,
            realBatchId,
            variations,
            imageIds,
            finalPrompt,
            settingsSnapshot,
            aspectRatio,
            baseInfo?.inputImageId,
            previewUrl
          );

          // CRITICAL: Refresh session to include the new batch
          // This ensures the batch appears in the UI even if session wasn't refreshed yet
          if (sessionId) {
            // Use a small delay to ensure backend has saved the batch
            setTimeout(() => {
              dispatch(getSession(sessionId));
            }, 300);
          }
        } else {
          // No batch ID returned - generation failed
          toast.error('Failed to start generation - no batch ID returned');
          cleanupPlaceholders();
        }
      } else {
        toast.error(getErrorMessage(resultResponse?.payload));
        cleanupPlaceholders();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to start generation');
      cleanupPlaceholders();
    }
  }, [
    checkCreditsBeforeAction,
    selectedImageId,
    selectedImageType,
    inputImages,
    historyImages,
    basePrompt,
    selectedVariations,
    selectedModel,
    aspectRatio,
    size,
    selections,
    creativity,
    expressivity,
    resemblance,
    dynamics,
    tilingWidth,
    tilingHeight,
    selectedStyle,
    currentSession,
    searchParams,
    setSearchParams,
    dispatch
  ]);

  const handleNewSession = useCallback(() => {
    // Navigate to /create without sessionId (blank state)
    // Session will be created when user clicks Generate button
    navigate('/create');
  }, [navigate]);

  return {
    handleSelectImage,
    handleCreateRegions,
    handleSubmit,
    handleGenerateWithCurrentState,
    handleNewSession,
  };
};
