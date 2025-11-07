import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useUnifiedWebSocket } from "@/hooks/useUnifiedWebSocket";
import { useSearchParams } from "react-router-dom";
import { useCreditCheck } from "@/hooks/useCreditCheck";
import toast from "react-hot-toast";
import MainLayout from "@/components/layout/MainLayout";
import OnboardingPopup from "@/components/onboarding/OnboardingPopup";
import { PromptInputContainer } from "@/components/creation-prompt";
import { setIsPromptModalOpen, setSelectedImage } from "@/features/create/createUISlice";
import { fetchInputImagesBySource } from "@/features/images/inputImagesSlice";
import { fetchAllVariations } from "@/features/images/historyImagesSlice";
import { runFluxKonect } from "@/features/tweak/tweakSlice";
import { initializeCreateSettings } from "@/features/customization/customizationSlice";

const CreatePageSimplified: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { checkCreditsBeforeAction } = useCreditCheck();
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [forceShowOnboarding, setForceShowOnboarding] = useState<boolean>(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const lastProcessedImageRef = useRef<{id: number; type: string} | null>(null);

  // Redux selectors
  const inputImages = useAppSelector(state => state.inputImages.images);
  const historyImages = useAppSelector(state => state.historyImages.images);
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);
  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);
  const isGenerating = useAppSelector(state => state.createUI.isGenerating);
  const selectedModel = useAppSelector(state => state.tweak.selectedModel);
  const basePrompt = useAppSelector(state => state.masks.savedPrompt);
  const { variations: selectedVariations } = useAppSelector(state => state.customization);

  // Filter history images for CREATE module
  const filteredHistoryImages = useMemo(() => {
    return historyImages.filter((image) => 
      image.moduleType === 'CREATE' && (
        image.status === 'COMPLETED' || 
        image.status === 'PROCESSING' || 
        !image.status
      )
    );
  }, [historyImages]);

  // Get current functional input image ID for WebSocket filtering
  const currentInputImageId = useMemo(() => {
    if (!selectedImageId || !selectedImageType) return undefined;
    if (selectedImageType === 'input') {
      return selectedImageId;
    } else if (selectedImageType === 'generated') {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      return generatedImage?.originalInputImageId;
    }
    return undefined;
  }, [selectedImageId, selectedImageType, historyImages]);

  // Unified WebSocket connection
  const { isConnected: isWebSocketConnected } = useUnifiedWebSocket({
    enabled: initialDataLoaded,
    currentInputImageId
  });

  // Initialize prompt modal on mount
  useEffect(() => {
    dispatch(setIsPromptModalOpen(true));
  }, [dispatch]);

  // Load initial data
  useEffect(() => {
    if (initialDataLoaded) return;

    const loadInitialData = async () => {
      const [inputResult, variationsResult] = await Promise.allSettled([
        dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' })),
        dispatch(fetchAllVariations({ page: 1, limit: 100 }))
      ]);
      
      setInitialDataLoaded(true);
      
      if (inputResult.status === 'fulfilled' && fetchInputImagesBySource.fulfilled.match(inputResult.value)) {
        const loadedImages = inputResult.value.payload.inputImages;
        const imageIdParam = searchParams.get('imageId');
        const imageTypeParam = searchParams.get('type');
        
        if (imageIdParam) {
          const targetImageId = parseInt(imageIdParam);
          const imageType = imageTypeParam === 'generated' ? 'generated' : 'input';
          
          if (imageType === 'input') {
            const targetImage = loadedImages.find((img: any) => img.id === targetImageId);
            if (targetImage) {
              dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
            }
          } else if (imageType === 'generated') {
            dispatch(setSelectedImage({ id: targetImageId, type: 'generated' }));
          }
        }
      }
    };
    
    loadInitialData();
  }, [dispatch, initialDataLoaded, searchParams]);

  // Handle image selection changes
  useEffect(() => {
    if (selectedImageId && selectedImageType) {
      dispatch(initializeCreateSettings());
      const currentImageKey = `${selectedImageId}-${selectedImageType}`;
      const lastProcessedKey = lastProcessedImageRef.current ?
        `${lastProcessedImageRef.current.id}-${lastProcessedImageRef.current.type}` : null;
      if (currentImageKey === lastProcessedKey) {
        return;
      }
      lastProcessedImageRef.current = { id: selectedImageId, type: selectedImageType };
    }
  }, [selectedImageId, selectedImageType, dispatch]);

  // Handle Create Regions (SDXL regional_prompt task)
  const handleCreateRegions = async () => {
    // Check credits before proceeding
    if (!checkCreditsBeforeAction(1)) {
      return;
    }

    try {
      // Get base image URL
      let effectiveBaseUrl: string | undefined = undefined;
      let inputImageIdForBase: number | undefined = selectedImageId && selectedImageType === 'input' ? selectedImageId : undefined;
      
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

      // Call SDXL with "extract regions" prompt for regional_prompt task
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
      }
    } catch (error: any) {
      console.error('Create Regions error:', error);
      toast.error(error?.message || 'Failed to start region extraction');
    }
  };

  // Generation handler - same logic as CreatePage
  const handleSubmit = async (
    userPrompt?: string,
    contextSelection?: string,
    attachments?: { baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] },
    options?: { size?: string; aspectRatio?: string }
  ) => {
    // Check credits before proceeding
    if (!checkCreditsBeforeAction(1)) {
      return;
    }

    try {
      const finalPrompt = userPrompt || basePrompt;
      
      // Validate prompt
      if (!finalPrompt || !finalPrompt.trim()) {
        toast.error('Please enter a prompt');
        return;
      }

      // Get base image URL
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

      // Combine texture URLs
      const combinedTextureUrls = [
        ...(attachments?.surroundingUrls || []),
        ...(attachments?.wallsUrls || [])
      ];

      // Build prompt guidance
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

      // Send request to selected model
      // Note: WebSocket will handle generation state updates, no need to call startGeneration here
      try {
        const resultResponse: any = await dispatch(
          runFluxKonect({
            prompt: promptToSend,
            imageUrl: effectiveBaseUrl,
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

        if (resultResponse?.payload?.success) {
          // WebSocket handler will close modal when image completes
        } else {
          const payload = resultResponse?.payload;
          const errorMsg = payload?.message || payload?.error || 'Generation failed';
          toast.error(errorMsg);
        }
      } catch (err: any) {
        console.error(`❌ ${selectedModel === 'seedream4' ? 'Seed Dream' : 'Nano Banana'} generation error:`, err);
        toast.error(err?.message || `Failed to start generation`);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error?.message || 'Failed to start generation');
    }
  };

  const handleStartTour = () => {
    setCurrentStep(0);
    setForceShowOnboarding(true);
  };

  return (
    <MainLayout currentStep={currentStep} onStartTour={handleStartTour}>
      <OnboardingPopup
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        forceShow={forceShowOnboarding}
      />
      {(isPromptModalOpen || currentStep === 4) && (
        <div className="flex-1 flex overflow-hidden relative items-center justify-center">
          <PromptInputContainer 
            onGenerate={handleSubmit} 
            onCreateRegions={handleCreateRegions}
            isGenerating={isGenerating} 
          />
        </div>
      )}
    </MainLayout>
  );
};

export default CreatePageSimplified;
