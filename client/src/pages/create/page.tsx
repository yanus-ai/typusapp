import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useUnifiedWebSocket } from "@/hooks/useUnifiedWebSocket";
import { useSearchParams } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import OnboardingPopup from "@/components/onboarding/OnboardingPopup";
import { PromptInputContainer } from "@/components/creation-prompt";
import { setIsPromptModalOpen, setSelectedImage, stopGeneration } from "@/features/create/createUISlice";
import { fetchInputImagesBySource } from "@/features/images/inputImagesSlice";
import { fetchAllVariations } from "@/features/images/historyImagesSlice";
import { loadSettingsFromImage } from "@/features/customization/customizationSlice";
import { resetMaskState, setSavedPrompt } from "@/features/masks/maskSlice";
import { setSelectedModel } from "@/features/tweak/tweakSlice";
import { GenerationLayout } from "./components/GenerationLayout";
import { useCreatePageData } from "./hooks/useCreatePageData";
import { useCreatePageHandlers } from "./hooks/useCreatePageHandlers";
import { HistoryImage } from "./components/GenerationGrid";
import SessionHistoryPanel from "@/components/creation-prompt/history/SessionHistoryPanel";
import { getSession, clearCurrentSession, getUserSessions } from "@/features/sessions/sessionSlice";

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
  
  // Session management
  const currentSession = useAppSelector(state => state.sessions.currentSession);
  const sessionsLoading = useAppSelector(state => state.sessions.loading);

  const historyImages = useAppSelector(state => state.historyImages.images);
  const selectedModel = useAppSelector(state => state.tweak.selectedModel);
  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);
  const isGenerating = useAppSelector(state => state.createUI.isGenerating);
  const generatingBatchId = useAppSelector(state => state.createUI.generatingBatchId);

  const {
    sessionBatches,
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
    handleNewSession,
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

  // Refresh session data when generating
  useEffect(() => {
    if (!isGenerating || !currentSession) return;

    const pollInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;
      
      if (timeSinceLastFetch < POLLING_DEBOUNCE) {
        return;
      }
      
      lastFetchTimeRef.current = now;
      // Refresh both variations and session
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      if (currentSession.id) {
        dispatch(getSession(currentSession.id));
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [isGenerating, currentSession, dispatch]);

  useEffect(() => {
    if (!isGenerating || !generatingBatchId) return;

    const batchImages = filteredHistoryImages.filter(img => img.batchId === generatingBatchId);
    
    if (batchImages.length === 0) return;

    // Check statuses - be more strict: require URLs for completed images
    const allCompleted = batchImages.every(img => 
      img.status === 'COMPLETED' && (img.imageUrl || img.thumbnailUrl)
    );
    const allFailed = batchImages.every(img => img.status === 'FAILED');
    const allFinished = batchImages.every(img => img.status === 'COMPLETED' || img.status === 'FAILED');
    const hasProcessing = batchImages.some(img => 
      img.status === 'PROCESSING' && !img.imageUrl && !img.thumbnailUrl
    );
    const hasCompletedWithUrl = batchImages.some(
      img => img.status === 'COMPLETED' && (img.imageUrl || img.thumbnailUrl)
    );
    
    // Check if we have any images that claim to be completed but don't have URLs yet
    const completedWithoutUrls = batchImages.some(
      img => img.status === 'COMPLETED' && !img.imageUrl && !img.thumbnailUrl
    );
    
    // Find first completed image for auto-selection
    const firstCompleted = batchImages.find(
      img => img.status === 'COMPLETED' && (img.imageUrl || img.thumbnailUrl)
    );

    // Stop generation ONLY if:
    // 1. All images are completed WITH URLs (strict check)
    // 2. All images are finished (completed or failed) AND none are processing AND all completed ones have URLs
    // 3. No processing images remain AND at least one has a URL (completed) AND no completed images are missing URLs
    const shouldStop = allCompleted || 
      (allFinished && !hasProcessing && !completedWithoutUrls) || 
      (!hasProcessing && hasCompletedWithUrl && !completedWithoutUrls);

    if (shouldStop) {
      // Refresh variations one more time to ensure we have latest status before stopping
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      
      // Wait a bit and verify again before stopping to ensure URLs are available
      setTimeout(() => {
        dispatch(fetchAllVariations({ page: 1, limit: 100 })).then(() => {
          // Get fresh state after fetch
          setTimeout(() => {
            dispatch(stopGeneration());
            
            // Only auto-select if there's at least one completed image
            if (!allFailed && firstCompleted) {
              // Refresh sessions list to update thumbnails when batch completes
              dispatch(getUserSessions(50));
              setTimeout(() => {
                dispatch(setSelectedImage({ id: firstCompleted.id, type: 'generated' }));
              }, AUTO_SELECT_DELAY);
            }
          }, 500);
        });
      }, 1500);
    }
  }, [isGenerating, generatingBatchId, filteredHistoryImages, dispatch, currentSession]);

  useEffect(() => {
    dispatch(setIsPromptModalOpen(true));
  }, [dispatch]);

  // Handle sessionId from URL - only load if sessionId exists in URL
  useEffect(() => {
    const sessionIdParam = searchParams.get('sessionId');
    
    if (sessionIdParam) {
      const sessionId = parseInt(sessionIdParam);
      // Load session if not already loaded or different session
      // Also check if we're not already loading to prevent duplicate requests
      if ((!currentSession || currentSession.id !== sessionId) && !sessionsLoading) {
        dispatch(getSession(sessionId));
      }
    } else {
      // No sessionId in URL - clear current session (blank state)
      if (currentSession) {
        dispatch(clearCurrentSession());
      }
    }
  }, [searchParams, currentSession, dispatch, clearCurrentSession, sessionsLoading]);

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
    
    const currentImageKey = `${selectedImageId}-${selectedImageType}`;
    const lastProcessedKey = lastProcessedImageRef.current
      ? `${lastProcessedImageRef.current.id}-${lastProcessedImageRef.current.type}`
      : null;
    
    // Only initialize settings if we're switching to a different image
    // Don't reset settings when auto-selecting after generation completes
    if (currentImageKey === lastProcessedKey) {
      // Same image, skip processing
      return;
    }
    
    // Update ref AFTER we've confirmed it's a different image
    lastProcessedImageRef.current = { id: selectedImageId, type: selectedImageType };

    let inputImageIdForCustomization: number | undefined = undefined;
    const settings: any = {};
    const generatedImage = historyImages.find(img => img.id === selectedImageId);
    
    if (selectedImageType === 'input') {
      inputImageIdForCustomization = selectedImageId;
    } else if (selectedImageType === 'generated') {
      if (!generatedImage) return; // Image not found, skip
      
      inputImageIdForCustomization = generatedImage.originalInputImageId;
      
      if (generatedImage.maskMaterialMappings) {
        settings.maskMaterialMappings = generatedImage.maskMaterialMappings;
      }
      if (generatedImage.contextSelection !== undefined) {
        settings.contextSelection = generatedImage.contextSelection;
      }
      if (generatedImage.aiPrompt) {
        settings.generatedPrompt = generatedImage.aiPrompt;
      }
      if (generatedImage.aiMaterials) {
        settings.aiMaterials = generatedImage.aiMaterials;
      }

      Object.assign(settings, generatedImage.settingsSnapshot);
    }

    // Always dispatch, even if settings is empty (for input images or images without settings)
    // The reducer will handle empty settings appropriately
    dispatch(loadSettingsFromImage({
      inputImageId: inputImageIdForCustomization,
      imageId: selectedImageId,
      isGeneratedImage: selectedImageType === 'generated',
      settings
    }));

    // Set the saved prompt if it's a generated image with aiPrompt
    if (selectedImageType === 'generated') {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      if (generatedImage?.aiPrompt) {
        dispatch(setSavedPrompt(generatedImage.aiPrompt));
      }
      
      // Restore model setting if available in settingsSnapshot
      if (generatedImage?.settingsSnapshot && (generatedImage.settingsSnapshot as any).model) {
        dispatch(setSelectedModel((generatedImage.settingsSnapshot as any).model));
      }
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
          <SessionHistoryPanel currentStep={currentStep} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isGeneratingMode && sessionBatches.length > 0 ? (
            <GenerationLayout
              batches={sessionBatches}
              isGenerating={isGenerating}
              onImageClick={handleImageClick}
              onGenerate={handleSubmit}
              onCreateRegions={handleCreateRegions}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              {(isPromptModalOpen || currentStep === 4) && (
                <div className="w-full max-w-5xl">
                  <PromptInputContainer 
                    onGenerate={handleSubmit} 
                    onCreateRegions={handleCreateRegions}
                    isGenerating={isGenerating}
                    onNewSession={handleNewSession}
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
