import { useCallback } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useCreditCheck } from "@/hooks/useCreditCheck";
import { setSelectedImage, startGeneration, stopGeneration } from "@/features/create/createUISlice";
import { runFluxKonect } from "@/features/tweak/tweakSlice";
import { addProcessingCreateVariations, addPlaceholderProcessingVariations } from "@/features/images/historyImagesSlice";
import { loadSettingsFromImage } from "@/features/customization/customizationSlice";
import { setMaskGenerationProcessing, setMaskGenerationFailed } from "@/features/masks/maskSlice";
import { InputImage } from "@/features/images/inputImagesSlice";
import { HistoryImage } from "@/features/images/historyImagesSlice";
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
  }

  return null;
};

const buildPromptGuidance = (attachments?: AttachmentUrls): string => {
  const surroundingCount = attachments?.surroundingUrls?.length || 0;
  const wallsCount = attachments?.wallsUrls?.length || 0;

  if (surroundingCount > 0 && wallsCount > 0) {
    return ` Use the ${wallsCount} wall texture image${wallsCount === 1 ? '' : 's'} as wall materials, and the ${surroundingCount} surrounding image${surroundingCount === 1 ? '' : 's'} as environmental/context references.`;
  }

  if (wallsCount > 0) {
    return ` Use the ${wallsCount} wall texture image${wallsCount === 1 ? '' : 's'} as wall materials.`;
  }

  if (surroundingCount > 0) {
    return ` Use the ${surroundingCount} surrounding image${surroundingCount === 1 ? '' : 's'} as environmental/context references.`;
  }

  return '';
};

const getErrorMessage = (payload: any): string => {
  return payload?.message || payload?.error || 'Operation failed';
};

export const useCreatePageHandlers = () => {
  const dispatch = useAppDispatch();
  const { checkCreditsBeforeAction } = useCreditCheck();
  
  const inputImages = useAppSelector(state => state.inputImages.images);
  const historyImages = useAppSelector(state => state.historyImages.images);
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);
  const selectedModel = useAppSelector(state => state.tweak.selectedModel);
  const basePrompt = useAppSelector(state => state.masks.savedPrompt);
  const { variations: selectedVariations, aspectRatio, size } = useAppSelector(state => state.customization);

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

    try {
      dispatch(loadSettingsFromImage({
        inputImageId: baseInfo.inputImageId,
        imageId: selectedImageId || 0,
        isGeneratedImage: selectedImageType === 'generated',
        settings: {}
      }));

      dispatch(setMaskGenerationProcessing({ 
        inputImageId: baseInfo.inputImageId,
        type: 'region_extraction'
      }));

      const resultResponse = await dispatch(
        runFluxKonect({
          prompt: 'extract regions',
          imageUrl: baseInfo.url,
          variations: 1,
          model: 'sdxl',
          moduleType: 'CREATE',
          selectedBaseImageId: selectedImageId,
          originalBaseImageId: baseInfo.inputImageId,
          baseAttachmentUrl: baseInfo.url,
          referenceImageUrls: [],
          textureUrls: undefined,
          surroundingUrls: undefined,
          wallsUrls: undefined,
          size: '1K',
          aspectRatio: '16:9',
        })
      );

      if (resultResponse?.payload?.success) {
        toast.success('Region extraction started');
      } else {
        const errorMsg = getErrorMessage(resultResponse?.payload);
        toast.error(errorMsg);
        dispatch(setMaskGenerationFailed(errorMsg));
      }
    } catch (error: any) {
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

    const previewUrl = baseInfo?.url || '';
    
    // Create placeholder processing images immediately based on selected variations count
    dispatch(addPlaceholderProcessingVariations({
      batchId: tempBatchId,
      totalVariations: selectedVariations
    }));
    
    dispatch(startGeneration({
      batchId: tempBatchId,
      inputImageId: baseInfo?.inputImageId || selectedImageId || 0,
      inputImagePreviewUrl: previewUrl
    }));

    if (!checkCreditsBeforeAction(1)) {
      dispatch(stopGeneration());
      // Clean up placeholder images on failure
      dispatch(addProcessingCreateVariations({
        batchId: tempBatchId,
        totalVariations: selectedVariations,
        imageIds: [] // Empty array will remove placeholders
      }));
      return;
    }

    const finalPrompt = userPrompt || basePrompt;
    
    if (!finalPrompt || !finalPrompt.trim()) {
      toast.error('Please enter a prompt');
      dispatch(stopGeneration());
      // Clean up placeholder images on failure
      dispatch(addProcessingCreateVariations({
        batchId: tempBatchId,
        totalVariations: selectedVariations,
        imageIds: [] // Empty array will remove placeholders
      }));
      return;
    }

    if (!baseInfo) {
      baseInfo = getBaseImageInfo(
        selectedImageId,
        selectedImageType,
        inputImages,
        historyImages,
        attachments
      );
    }

    if (!baseInfo) {
      toast.error('Please select a base image first');
      dispatch(stopGeneration());
      // Clean up placeholder images on failure
      dispatch(addProcessingCreateVariations({
        batchId: tempBatchId,
        totalVariations: selectedVariations,
        imageIds: [] // Empty array will remove placeholders
      }));
      return;
    }

    const combinedTextureUrls = [
      ...(attachments?.surroundingUrls || []),
      ...(attachments?.wallsUrls || [])
    ];

    const promptGuidance = buildPromptGuidance(attachments);
    const promptToSend = `${finalPrompt.trim()}${promptGuidance}`.trim();
    
    try {
      const resultResponse = await dispatch(
        runFluxKonect({
          prompt: promptToSend,
          imageUrl: baseInfo.url,
          variations: selectedVariations,
          model: selectedModel,
          moduleType: 'CREATE',
          selectedBaseImageId: selectedImageId,
          originalBaseImageId: baseInfo.inputImageId,
          baseAttachmentUrl: attachments?.baseImageUrl,
          referenceImageUrls: attachments?.referenceImageUrls || [],
          textureUrls: combinedTextureUrls.length > 0 ? combinedTextureUrls : undefined,
          surroundingUrls: attachments?.surroundingUrls,
          wallsUrls: attachments?.wallsUrls,
          size: size,
          aspectRatio: aspectRatio,
        })
      );

      if (resultResponse.type === 'tweak/runFluxKonect/rejected') {
        const errorMsg = getErrorMessage(resultResponse.payload);
        toast.error(errorMsg);
        dispatch(stopGeneration());
        // Clean up placeholder images on failure
        dispatch(addProcessingCreateVariations({
          batchId: tempBatchId,
          totalVariations: selectedVariations,
          imageIds: [] // Empty array will remove placeholders
        }));
        return;
      }

      if (resultResponse?.payload?.success) {
        const realBatchId = resultResponse?.payload?.data?.batchId;
        const imageIds = resultResponse?.payload?.data?.imageIds || [];
        const variations = resultResponse?.payload?.data?.variations || selectedVariations;
        
        if (realBatchId) {
          // Remove placeholders with tempBatchId before adding real ones
          dispatch(addProcessingCreateVariations({
            batchId: tempBatchId,
            totalVariations: selectedVariations,
            imageIds: [] // Empty array removes placeholders
          }));
          
          if (imageIds.length > 0) {
            dispatch(addProcessingCreateVariations({
              batchId: realBatchId,
              totalVariations: variations,
              imageIds: imageIds
            }));
          }
          
          dispatch(startGeneration({
            batchId: realBatchId,
            inputImageId: baseInfo.inputImageId,
            inputImagePreviewUrl: previewUrl
          }));
        }
      } else {
        const errorMsg = getErrorMessage(resultResponse?.payload);
        toast.error(errorMsg);
        dispatch(stopGeneration());
        // Clean up placeholder images on failure
        dispatch(addProcessingCreateVariations({
          batchId: tempBatchId,
          totalVariations: selectedVariations,
          imageIds: [] // Empty array will remove placeholders
        }));
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to start generation');
      dispatch(stopGeneration());
      // Clean up placeholder images on failure
      dispatch(addProcessingCreateVariations({
        batchId: tempBatchId,
        totalVariations: selectedVariations,
        imageIds: [] // Empty array will remove placeholders
      }));
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
    dispatch
  ]);

  return {
    handleSelectImage,
    handleCreateRegions,
    handleSubmit,
  };
};
