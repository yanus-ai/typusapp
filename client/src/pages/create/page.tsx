import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useUnifiedWebSocket } from "@/hooks/useUnifiedWebSocket";
import { useSearchParams } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import OnboardingPopup from "@/components/onboarding/OnboardingPopup";
import { PromptInputContainer } from "@/components/creation-prompt";
import { setIsPromptModalOpen, setSelectedImage, stopGeneration } from "@/features/create/createUISlice";
import { fetchInputImagesBySource, uploadInputImage } from "@/features/images/inputImagesSlice";
import { fetchAllVariations } from "@/features/images/historyImagesSlice";
import { initializeCreateSettings, loadSettingsFromImage } from "@/features/customization/customizationSlice";
import { resetMaskState } from "@/features/masks/maskSlice";
import { GenerationLayout } from "./components/GenerationLayout";
import { useCreatePageData } from "./hooks/useCreatePageData";
import { useCreatePageHandlers } from "./hooks/useCreatePageHandlers";
import { HistoryImage } from "./components/GenerationGrid";
import InputHistoryPanel from "@/components/create/InputHistoryPanel";
import toast from "react-hot-toast";

const POLLING_INTERVAL = 15000;
const POLLING_DEBOUNCE = 10000;
const AUTO_SELECT_DELAY = 300;

const CreatePageSimplified: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [forceShowOnboarding, setForceShowOnboarding] = useState<boolean>(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const lastProcessedImageRef = useRef<{id: number; type: string} | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const historyImages = useAppSelector(state => state.historyImages.images);
  const selectedModel = useAppSelector(state => state.tweak.selectedModel);
  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);
  const isGenerating = useAppSelector(state => state.createUI.isGenerating);
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesError = useAppSelector(state => state.inputImages.error);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const generatingBatchId = useAppSelector(state => state.createUI.generatingBatchId);

  const {
    currentBatchImages,
    currentBatchPrompt,
    currentInputImageId,
    isGeneratingMode,
    selectedImageId,
    selectedImageType,
    filteredHistoryImages,
  } = useCreatePageData();
  
  const {
    handleSelectImage,
    handleCreateRegions,
    handleSubmit,
  } = useCreatePageHandlers();

  useUnifiedWebSocket({
    enabled: initialDataLoaded,
    currentInputImageId
  });

  const handleStartTour = useCallback(() => {
    setCurrentStep(0);
    setForceShowOnboarding(true);
  }, []);

  const handleImageClick = useCallback((image: HistoryImage) => {
    if (image.status === 'COMPLETED') {
      handleSelectImage(image.id, 'generated');
    }
  }, [handleSelectImage]);

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const result = await dispatch(uploadInputImage({ file, uploadSource: 'CREATE_MODULE' }));
      if (uploadInputImage.fulfilled.match(result)) {
        dispatch(setSelectedImage({ id: result.payload.id, type: 'input' }));
        toast.success('Image uploaded successfully');
      } else if (uploadInputImage.rejected.match(result)) {
        toast.error(result.payload as string || 'Failed to upload image');
      }
    } catch (error) {
      toast.error('An unexpected error occurred during upload');
    }
  }, [dispatch]);

  useEffect(() => {
    if (!isGenerating) return;

    const pollInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;
      
      if (timeSinceLastFetch < POLLING_DEBOUNCE) {
        return;
      }
      
      lastFetchTimeRef.current = now;
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));
    }, POLLING_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [isGenerating, dispatch]);

  useEffect(() => {
    if (!isGenerating || !generatingBatchId) return;

    const batchImages = filteredHistoryImages.filter(img => img.batchId === generatingBatchId);
    
    if (batchImages.length === 0) return;

    const allCompleted = batchImages.every(img => img.status === 'COMPLETED');
    const hasProcessing = batchImages.some(img => img.status === 'PROCESSING');
    const hasCompletedWithUrl = batchImages.some(
      img => (img.status === 'COMPLETED' || img.imageUrl || img.thumbnailUrl) && (img.imageUrl || img.thumbnailUrl)
    );

    if (allCompleted || (!hasProcessing && hasCompletedWithUrl)) {
      dispatch(stopGeneration());
      
      const firstCompleted = batchImages.find(
        img => (img.imageUrl || img.thumbnailUrl) && (img.status === 'COMPLETED' || img.imageUrl)
      );
      
      if (firstCompleted) {
        setTimeout(() => {
          dispatch(setSelectedImage({ id: firstCompleted.id, type: 'generated' }));
        }, AUTO_SELECT_DELAY);
      }
    }
  }, [isGenerating, generatingBatchId, filteredHistoryImages, dispatch]);

  useEffect(() => {
    dispatch(setIsPromptModalOpen(true));
  }, [dispatch]);

  useEffect(() => {
    if (initialDataLoaded) return;

    const loadInitialData = async () => {
      const [inputResult] = await Promise.allSettled([
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

  useEffect(() => {
    if (!selectedImageId || !selectedImageType) return;

    dispatch(initializeCreateSettings());
    
    const currentImageKey = `${selectedImageId}-${selectedImageType}`;
    const lastProcessedKey = lastProcessedImageRef.current
      ? `${lastProcessedImageRef.current.id}-${lastProcessedImageRef.current.type}`
      : null;
      
    if (currentImageKey === lastProcessedKey) {
      return;
    }
    
    lastProcessedImageRef.current = { id: selectedImageId, type: selectedImageType };

    let inputImageIdForCustomization: number | undefined = undefined;
    
    if (selectedImageType === 'input') {
      inputImageIdForCustomization = selectedImageId;
    } else if (selectedImageType === 'generated') {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      inputImageIdForCustomization = generatedImage?.originalInputImageId;
    }

    if (inputImageIdForCustomization) {
      dispatch(loadSettingsFromImage({
        inputImageId: inputImageIdForCustomization,
        imageId: selectedImageId,
        isGeneratedImage: selectedImageType === 'generated',
        settings: {}
      }));
    }

    if (selectedModel === 'sdxl') {
      dispatch(resetMaskState());
    }
  }, [selectedImageId, selectedImageType, dispatch, historyImages, selectedModel]);

  return (
    <MainLayout currentStep={currentStep} onStartTour={handleStartTour}>
      <OnboardingPopup
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        forceShow={forceShowOnboarding}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`absolute top-1/2 end-3 -translate-y-1/2 h-auto ${currentStep === 3 ? 'z-[1000]' : 'z-60'}`}>
          <InputHistoryPanel
            currentStep={currentStep}
            images={inputImages}
            selectedImageId={selectedImageType === 'input' ? selectedImageId : undefined}
            onSelectImage={(imageId) => handleSelectImage(imageId, 'input')}
            onUploadImage={handleImageUpload}
            loading={inputImagesLoading}
            error={inputImagesError}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isGeneratingMode ? (
            <GenerationLayout
              prompt={currentBatchPrompt}
              images={currentBatchImages}
              isGenerating={isGenerating}
              onImageClick={handleImageClick}
              onGenerate={handleSubmit}
              onCreateRegions={handleCreateRegions}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white p-4">
              {(isPromptModalOpen || currentStep === 4) && (
                <div className="w-full max-w-5xl">
                  <PromptInputContainer 
                    onGenerate={handleSubmit} 
                    onCreateRegions={handleCreateRegions}
                    isGenerating={isGenerating}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CreatePageSimplified;
