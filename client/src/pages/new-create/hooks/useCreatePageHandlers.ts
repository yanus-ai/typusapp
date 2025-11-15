import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useCreditCheck } from "@/hooks/useCreditCheck";
import { setSelectedImage, startGeneration, stopGeneration } from "@/features/create/createUISlice";
import { runFluxKonect } from "@/features/tweak/tweakSlice";
import { addProcessingCreateVariations } from "@/features/images/historyImagesSlice";
import { loadSettingsFromImage } from "@/features/customization/customizationSlice";
import { setMaskGenerationProcessing, setMaskGenerationFailed } from "@/features/masks/maskSlice";
import toast from "react-hot-toast";

export const useCreatePageHandlers = () => {
  const dispatch = useAppDispatch();
  const { checkCreditsBeforeAction } = useCreditCheck();
  
  const inputImages = useAppSelector(state => state.inputImages.images);
  const historyImages = useAppSelector(state => state.historyImages.images);
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);
  const selectedModel = useAppSelector(state => state.tweak.selectedModel);
  const basePrompt = useAppSelector(state => state.masks.savedPrompt);
  const { variations: selectedVariations } = useAppSelector(state => state.customization);

  const handleSelectImage = (imageId: number, sourceType: 'input' | 'generated' = 'generated') => {
    dispatch(setSelectedImage({ id: imageId, type: sourceType }));
  };

  const handleCreateRegions = async () => {
    if (!checkCreditsBeforeAction(1)) {
      return;
    }

    let effectiveBaseUrl: string | undefined = undefined;
    let inputImageIdForBase: number | undefined = selectedImageId && selectedImageType === 'input' ? selectedImageId : undefined;

    try {
      if (selectedImageId && selectedImageType === 'input') {
        const inputImage = inputImages.find(img => img.id === selectedImageId);
        effectiveBaseUrl = inputImage?.originalUrl || inputImage?.imageUrl || inputImage?.processedUrl;
        inputImageIdForBase = selectedImageId;
      } else if (selectedImageType === 'generated') {
        const generatedImage = historyImages.find(img => img.id === selectedImageId);
        if (generatedImage?.originalInputImageId) {
          const originalInputImage = inputImages.find(img => img.id === generatedImage.originalInputImageId);
          effectiveBaseUrl = originalInputImage?.originalUrl || originalInputImage?.imageUrl || originalInputImage?.processedUrl;
          inputImageIdForBase = generatedImage.originalInputImageId;
        }
      }

      if (!effectiveBaseUrl) {
        toast.error('Please select a base image first');
        return;
      }

      if (!inputImageIdForBase) {
        toast.error('Unable to determine input image ID');
        return;
      }

      dispatch(loadSettingsFromImage({
        inputImageId: inputImageIdForBase,
        imageId: selectedImageId,
        isGeneratedImage: selectedImageType === 'generated',
        settings: {}
      }));

      dispatch(setMaskGenerationProcessing({ 
        inputImageId: inputImageIdForBase,
        type: 'region_extraction'
      }));

      const resultResponse: any = await dispatch(
        runFluxKonect({
          prompt: 'extract regions',
          imageUrl: effectiveBaseUrl,
          variations: 1,
          model: 'sdxl',
          moduleType: 'CREATE',
          selectedBaseImageId: selectedImageId,
          originalBaseImageId: inputImageIdForBase || selectedImageId,
          baseAttachmentUrl: effectiveBaseUrl,
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
        const payload = resultResponse?.payload;
        const errorMsg = payload?.message || payload?.error || 'Region extraction failed';
        toast.error(errorMsg);
        dispatch(setMaskGenerationFailed(errorMsg));
      }
    } catch (error: any) {
      console.error('Create Regions error:', error);
      const errorMsg = error?.message || 'Failed to start region extraction';
      toast.error(errorMsg);
      if (inputImageIdForBase) {
        dispatch(setMaskGenerationFailed(errorMsg));
      }
    }
  };

  const handleSubmit = async (
    userPrompt: string | null,
    _contextSelection?: string,
    attachments?: { baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] },
    options?: { size?: string; aspectRatio?: string }
  ) => {
    const tempBatchId = Date.now();
    let effectiveBaseUrl: string | undefined = undefined;
    let inputImageIdForBase: number | undefined = selectedImageId && selectedImageType === 'input' ? selectedImageId : undefined;
    
    if (selectedImageId && selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      effectiveBaseUrl = inputImage?.originalUrl || inputImage?.imageUrl || inputImage?.processedUrl;
      inputImageIdForBase = selectedImageId;
    } else if (attachments?.baseImageUrl) {
      effectiveBaseUrl = attachments.baseImageUrl;
      const matchingInputImage = inputImages.find(img => 
        img.originalUrl === effectiveBaseUrl || 
        img.imageUrl === effectiveBaseUrl ||
        img.processedUrl === effectiveBaseUrl
      );
      if (matchingInputImage) {
        inputImageIdForBase = matchingInputImage.id;
      }
    }
    
    const previewUrl = effectiveBaseUrl || '';
    dispatch(startGeneration({
      batchId: tempBatchId,
      inputImageId: inputImageIdForBase || selectedImageId || 0,
      inputImagePreviewUrl: previewUrl
    }));

    if (!checkCreditsBeforeAction(1)) {
      dispatch(stopGeneration());
      return;
    }

    try {
      const finalPrompt = userPrompt || basePrompt;
      
      if (!finalPrompt || !finalPrompt.trim()) {
        toast.error('Please enter a prompt');
        dispatch(stopGeneration());
        return;
      }

      if (!effectiveBaseUrl) {
        if (selectedImageId && selectedImageType === 'input') {
          const inputImage = inputImages.find(img => img.id === selectedImageId);
          effectiveBaseUrl = inputImage?.originalUrl || inputImage?.imageUrl || inputImage?.processedUrl;
          inputImageIdForBase = selectedImageId;
        } else if (attachments?.baseImageUrl) {
          effectiveBaseUrl = attachments.baseImageUrl;
          const matchingInputImage = inputImages.find(img => 
            img.originalUrl === effectiveBaseUrl || 
            img.imageUrl === effectiveBaseUrl ||
            img.processedUrl === effectiveBaseUrl
          );
          if (matchingInputImage) {
            inputImageIdForBase = matchingInputImage.id;
          }
        }
      }

      const combinedTextureUrls = [
        ...(attachments?.surroundingUrls || []),
        ...(attachments?.wallsUrls || [])
      ];

      const surroundingCount = (attachments?.surroundingUrls || []).length;
      const wallsCount = (attachments?.wallsUrls || []).length;
      let promptGuidance = '';
      if (surroundingCount > 0 && wallsCount > 0) {
        promptGuidance = ` Use the ${wallsCount} wall texture image${wallsCount === 1 ? '' : 's'} as wall materials, and the ${surroundingCount} surrounding image${surroundingCount === 1 ? '' : 's'} as environmental/context references.`;
      } else if (wallsCount > 0) {
        promptGuidance = ` Use the ${wallsCount} wall texture image${wallsCount === 1 ? '' : 's'} as wall materials.`;
      } else if (surroundingCount > 0) {
        promptGuidance = ` Use the ${surroundingCount} surrounding image${surroundingCount === 1 ? '' : 's'} as environmental/context references.`;
      }

      const promptToSend = `${finalPrompt.trim()}${promptGuidance}`.trim();
      
      try {
        const resultResponse: any = await dispatch(
          runFluxKonect({
            prompt: promptToSend,
            imageUrl: effectiveBaseUrl || '',
            variations: selectedVariations,
            model: selectedModel,
            moduleType: 'CREATE',
            selectedBaseImageId: selectedImageId,
            originalBaseImageId: inputImageIdForBase || selectedImageId,
            baseAttachmentUrl: attachments?.baseImageUrl,
            referenceImageUrls: attachments?.referenceImageUrls || [],
            textureUrls: combinedTextureUrls.length > 0 ? combinedTextureUrls : undefined,
            surroundingUrls: attachments?.surroundingUrls,
            wallsUrls: attachments?.wallsUrls,
            size: options?.size,
            aspectRatio: options?.aspectRatio,
          })
        );

        if (resultResponse.type === 'tweak/runFluxKonect/rejected') {
          const payload = resultResponse.payload;
          const errorMsg = payload?.message || payload?.error || 'Generation failed';
          toast.error(errorMsg);
          dispatch(stopGeneration());
        } else if (resultResponse?.payload?.success) {
          // Get the real batchId and imageIds from the API response
          const realBatchId = resultResponse?.payload?.data?.batchId;
          const imageIds = resultResponse?.payload?.data?.imageIds || [];
          const variations = resultResponse?.payload?.data?.variations || selectedVariations;
          
          if (realBatchId) {
            console.log('✅ API returned batchId:', realBatchId, 'imageIds:', imageIds, 'Updating generatingBatchId');
            
            // Add placeholder images immediately so they show up as skeletons
            if (imageIds.length > 0) {
              dispatch(addProcessingCreateVariations({
                batchId: realBatchId,
                totalVariations: variations,
                imageIds: imageIds
              }));
              console.log('✅ Added placeholder images for batchId:', realBatchId, 'imageIds:', imageIds);
            }
            
            // Update generation state with the real batchId from database
            dispatch(startGeneration({
              batchId: realBatchId,
              inputImageId: inputImageIdForBase || selectedImageId || 0,
              inputImagePreviewUrl: previewUrl
            }));
            
            // Don't fetch immediately - placeholders are already added and WebSocket will update them
            // Only fetch if WebSocket fails (handled by polling fallback)
          } else {
            console.warn('⚠️ No batchId in API response');
          }
          // WebSocket handler will update images and stop generation when complete
        } else {
          const payload = resultResponse?.payload;
          const errorMsg = payload?.message || payload?.error || 'Generation failed';
          toast.error(errorMsg);
          dispatch(stopGeneration());
        }
      } catch (err: any) {
        console.error(`❌ Generation error:`, err);
        toast.error(err?.message || `Failed to start generation`);
        dispatch(stopGeneration());
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error?.message || 'Failed to start generation');
      dispatch(stopGeneration());
    }
  };

  return {
    handleSelectImage,
    handleCreateRegions,
    handleSubmit,
  };
};

