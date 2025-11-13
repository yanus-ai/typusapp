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
import CanvasImageGrid from "@/components/creation-prompt/prompt-input/CanvasImageGrid";
import { setIsPromptModalOpen, setSelectedImage, startGeneration, stopGeneration } from "@/features/create/createUISlice";
import { fetchInputImagesBySource } from "@/features/images/inputImagesSlice";
import { fetchAllVariations } from "@/features/images/historyImagesSlice";
import { runFluxKonect } from "@/features/tweak/tweakSlice";
import { initializeCreateSettings, loadSettingsFromImage } from "@/features/customization/customizationSlice";
import { setMaskGenerationProcessing, setMaskGenerationFailed, resetMaskState } from "@/features/masks/maskSlice";
import { Images } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';

const CreatePageSimplified: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { checkCreditsBeforeAction } = useCreditCheck();
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [forceShowOnboarding, setForceShowOnboarding] = useState<boolean>(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [showImageGrid, setShowImageGrid] = useState(false);
  const lastProcessedImageRef = useRef<{id: number; type: string} | null>(null);

  // Redux selectors
  const inputImages = useAppSelector(state => state.inputImages.images);
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);
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

      // Set inputImageId in customization slice for RegionsWrapper
      // This ensures RegionsWrapper can properly identify which image the masks belong to
      let inputImageIdForCustomization: number | undefined = undefined;
      
      if (selectedImageType === 'input') {
        // For input images, the selectedImageId IS the inputImageId
        inputImageIdForCustomization = selectedImageId;
      } else if (selectedImageType === 'generated') {
        // For generated images, find the originalInputImageId
        const generatedImage = historyImages.find(img => img.id === selectedImageId);
        inputImageIdForCustomization = generatedImage?.originalInputImageId;
      }

      // Set inputImageId in customization slice if we have a valid value
      if (inputImageIdForCustomization) {
        dispatch(loadSettingsFromImage({
          inputImageId: inputImageIdForCustomization,
          imageId: selectedImageId,
          isGeneratedImage: selectedImageType === 'generated',
          settings: {}
        }));
      }

      // For SDXL model, reset mask state to prevent showing regions from previous image
      // Regions should only show after user explicitly clicks "Create Regions"
      if (selectedModel === 'sdxl') {
        dispatch(resetMaskState());
      }
    }
  }, [selectedImageId, selectedImageType, dispatch, historyImages, selectedModel]);

  // Handle image selection
  const handleSelectImage = (imageId: number, sourceType: 'input' | 'generated' = 'generated') => {
    dispatch(setSelectedImage({ id: imageId, type: sourceType }));
  };

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

      if (!inputImageIdForBase) {
        toast.error('Unable to determine input image ID');
        return;
      }

      // Ensure customization slice has the correct inputImageId for RegionsWrapper
      dispatch(loadSettingsFromImage({
        inputImageId: inputImageIdForBase,
        imageId: selectedImageId,
        isGeneratedImage: selectedImageType === 'generated',
        settings: {}
      }));

      console.log('🚀 Creating regions with:', {
        inputImageIdForBase,
        selectedImageId,
        selectedImageType,
        effectiveBaseUrl: effectiveBaseUrl?.substring(0, 50) + '...'
      });

      // Set mask status to 'processing' immediately to show regions panel
      dispatch(setMaskGenerationProcessing({ 
        inputImageId: inputImageIdForBase,
        type: 'region_extraction'
      }));

      console.log('✅ Mask status set to processing');

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
        // Reset mask status on failure
        dispatch(setMaskGenerationFailed(errorMsg));
      }
    } catch (error: any) {
      console.error('Create Regions error:', error);
      const errorMsg = error?.message || 'Failed to start region extraction';
      toast.error(errorMsg);
      // Reset mask status on error
      if (inputImageIdForBase) {
        dispatch(setMaskGenerationFailed(errorMsg));
      }
    }
  };

  // Generation handler - same logic as CreatePage
  const handleSubmit = async (
    userPrompt?: string,
    contextSelection?: string,
    attachments?: { baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] },
    options?: { size?: string; aspectRatio?: string }
  ) => {
    // Start generation state IMMEDIATELY to show loading spinner as soon as button is clicked
    const tempBatchId = Date.now();
    let effectiveBaseUrl: string | undefined = undefined;
    let inputImageIdForBase: number | undefined = selectedImageId && selectedImageType === 'input' ? selectedImageId : undefined;
    
    // Get base image URL for preview (quick check)
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
    console.log('🚀 Starting generation, dispatching startGeneration IMMEDIATELY...', { selectedModel, tempBatchId });
    dispatch(startGeneration({
      batchId: tempBatchId,
      inputImageId: inputImageIdForBase || selectedImageId || 0,
      inputImagePreviewUrl: previewUrl
    }));

    // Check credits after showing loading spinner
    if (!checkCreditsBeforeAction(1)) {
      dispatch(stopGeneration());
      return;
    }

    try {
      const finalPrompt = userPrompt || basePrompt;
      
      // Validate prompt
      if (!finalPrompt || !finalPrompt.trim()) {
        toast.error('Please enter a prompt');
        dispatch(stopGeneration());
        return;
      }

      // Get base image URL (if not already set)
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

        // Check if the thunk was rejected (error case)
        console.log('📦 Result response:', resultResponse);
        if (resultResponse.type === 'tweak/runFluxKonect/rejected') {
          const payload = resultResponse.payload;
          console.error('❌ Thunk rejected:', payload);
          const errorMsg = payload?.message || payload?.error || 'Generation failed';
          toast.error(errorMsg);
          // Stop generation on error
          dispatch(stopGeneration());
        } else if (resultResponse?.payload?.success) {
          console.log('✅ Generation started successfully, waiting for WebSocket...');
          // WebSocket handler will close modal and stop generation when image completes
        } else {
          const payload = resultResponse?.payload;
          console.warn('⚠️ Generation response without success flag:', payload);
          const errorMsg = payload?.message || payload?.error || 'Generation failed';
          toast.error(errorMsg);
          // Stop generation on error
          dispatch(stopGeneration());
        }
      } catch (err: any) {
        console.error(`❌ ${selectedModel === 'seedream4' ? 'Seed Dream' : 'Nano Banana'} generation error:`, err);
        toast.error(err?.message || `Failed to start generation`);
        // Stop generation on error
        dispatch(stopGeneration());
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error?.message || 'Failed to start generation');
      // Stop generation on error
      dispatch(stopGeneration());
    }
  };

  const handleStartTour = () => {
    setCurrentStep(0);
    setForceShowOnboarding(true);
  };

  // Check if we should show loading overlay when generating
  const shouldShowLoadingOverlay = isGenerating;
  
  // Debug logging
  useEffect(() => {
    console.log('🔄 isGenerating state changed:', isGenerating, 'shouldShowLoadingOverlay:', shouldShowLoadingOverlay);
  }, [isGenerating, shouldShowLoadingOverlay]);

  return (
    <MainLayout currentStep={currentStep} onStartTour={handleStartTour}>
      <OnboardingPopup
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        forceShow={forceShowOnboarding}
      />
      {/* Full-screen loading overlay for all models */}
      {shouldShowLoadingOverlay && (
        <div className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="flex flex-col items-center justify-center gap-4">
            <DotLottieReact
              src={loader}
              autoplay
              loop
              style={{
                width: 300,
                height: 300,
                filter: 'drop-shadow(0 0 10px rgba(0, 0, 0, 0.1))'
              }}
            />
            <p className="text-lg font-medium text-gray-700">Generating your image...</p>
            <p className="text-sm text-gray-500">Please wait while we create your visualization</p>
          </div>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden bg-white">
        {/* Central Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
          {/* Toggle Button for Image Grid (AI Prompt Feature) */}
          {!showImageGrid && filteredHistoryImages.length > 0 && (isPromptModalOpen || currentStep === 4) && (
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setShowImageGrid(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow text-sm font-medium text-gray-700"
              >
                <Images className="h-4 w-4" />
                View Images ({filteredHistoryImages.length})
              </button>
            </div>
          )}

          {/* Canvas Image Grid - Only show when toggled (AI Prompt Feature) */}
          {showImageGrid && (
            <div className="absolute inset-0 z-20 bg-white border-t border-gray-200">
              <CanvasImageGrid
                images={filteredHistoryImages}
                selectedImageId={selectedImageType === 'generated' ? selectedImageId : undefined}
                onSelectImage={(imageId, sourceType) => {
                  handleSelectImage(imageId, sourceType || 'generated');
                  setShowImageGrid(false);
                }}
                loading={historyImagesLoading}
                downloadingImageId={undefined}
                downloadProgress={0}
                onClose={() => setShowImageGrid(false)}
              />
            </div>
          )}

          {/* Prompt Input Container */}
          {(isPromptModalOpen || currentStep === 4) && (
            <div className="flex-1 flex items-center justify-center bg-white p-4">
              <div className="w-full max-w-5xl bg-white">
                <PromptInputContainer 
                  onGenerate={handleSubmit} 
                  onCreateRegions={handleCreateRegions}
                  isGenerating={isGenerating} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CreatePageSimplified;
