import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useUnifiedWebSocket } from "@/hooks/useUnifiedWebSocket";
import { useSearchParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import OnboardingPopup from "@/components/onboarding/OnboardingPopup";
import { PromptInputContainer } from "@/components/creation-prompt";
import { setIsCatalogOpen, setIsPromptModalOpen, setSelectedImage, stopGeneration } from "@/features/create/createUISlice";
import { fetchInputImagesBySource } from "@/features/images/inputImagesSlice";
import { fetchAllVariations } from "@/features/images/historyImagesSlice";
import { loadSettingsFromImage } from "@/features/customization/customizationSlice";
import { setSavedPrompt, getMasks, getAIPromptMaterials, setMaskGenerationProcessing } from "@/features/masks/maskSlice";
import { setSelectedModel } from "@/features/tweak/tweakSlice";
import { GenerationLayout } from "./components/GenerationLayout";
import { useCreatePageData } from "./hooks/useCreatePageData";
import { useCreatePageHandlers } from "./hooks/useCreatePageHandlers";
import { HistoryImage } from "./components/GenerationGrid";
import SessionHistoryPanel from "@/components/creation-prompt/history/SessionHistoryPanel";
import { getSession, clearCurrentSession, getUserSessions } from "@/features/sessions/sessionSlice";

const POLLING_INTERVAL = 30000;
const POLLING_DEBOUNCE = 10000;
const AUTO_SELECT_DELAY = 300;

const CreatePageSimplified: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [forceShowOnboarding, setForceShowOnboarding] = useState<boolean>(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const lastProcessedImageRef = useRef<{id: number; type: string} | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const processedPluginSourceRef = useRef<string | null>(null);
  
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

  const { isConnected: websocketConnected } = useUnifiedWebSocket({
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

  // Refresh session data when generating - only poll when WebSocket is disconnected
  useEffect(() => {
    if (!currentSession || isGenerating || websocketConnected) return;

    // Only poll when WebSocket is disconnected (fallback mechanism)
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
  }, [isGenerating, currentSession, dispatch, websocketConnected]);

  useEffect(() => {
    if (!isGenerating || !generatingBatchId) return;

    const batchImages = filteredHistoryImages.filter(img => img.batchId === generatingBatchId);
    
    // Filter out placeholders for completion check - only check real images
    const realBatchImages = batchImages.filter(img => !img.isPlaceholder && img.id >= 0);
    
    // If no real images yet, wait (placeholders are still showing)
    if (realBatchImages.length === 0) return;

    // Check statuses - be more strict: require URLs for completed images
    const allCompleted = realBatchImages.every(img => 
      img.status === 'COMPLETED' && (img.processedImageUrl || img.imageUrl || img.thumbnailUrl)
    );
    const allFailed = realBatchImages.every(img => img.status === 'FAILED');
    const allFinished = realBatchImages.every(img => img.status === 'COMPLETED' || img.status === 'FAILED');
    const hasProcessing = realBatchImages.some(img => 
      img.status === 'PROCESSING' && !img.imageUrl && !img.thumbnailUrl
    );
    const hasCompletedWithUrl = realBatchImages.some(
      img => img.status === 'COMPLETED' && (img.imageUrl || img.thumbnailUrl)
    );
    
    // Check if we have any images that claim to be completed but don't have URLs yet
    const completedWithoutUrls = realBatchImages.some(
      img => img.status === 'COMPLETED' && !img.imageUrl && !img.thumbnailUrl
    );
    
    // Find first completed image for auto-selection
    const firstCompleted = realBatchImages.find(
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
      // Simplified completion detection - single check after WebSocket confirms
      // Refresh variations once to ensure we have latest status
      dispatch(fetchAllVariations({ page: 1, limit: 100 })).then(() => {
        dispatch(stopGeneration());
        
        // Refresh current session to update batch with completed images
        if (currentSession?.id) {
          dispatch(getSession(currentSession.id));
        }
        
        // Only auto-select if there's at least one completed image
        if (!allFailed && firstCompleted) {
          // Refresh sessions list to update thumbnails when batch completes
          dispatch(getUserSessions(50));
          // Small delay for UI smoothness
          setTimeout(() => {
            dispatch(setSelectedImage({ id: firstCompleted.id, type: 'generated' }));
          }, AUTO_SELECT_DELAY);
        }
      }).catch((error) => {
        // If fetch fails, still stop generation (WebSocket already confirmed completion)
        console.error('Failed to fetch variations on completion:', error);
        dispatch(stopGeneration());
        // Still refresh session even on error
        if (currentSession?.id) {
          dispatch(getSession(currentSession.id));
        }
      });
    }
  }, [sessionBatches, dispatch, currentSession]);

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

  // Handle authentication token from URL (e.g., from OAuth callback or email verification)
  useEffect(() => {
    if (searchParams.has('token')) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('token');
      const newSearch = newSearchParams.toString();
      navigate(
        { pathname: window.location.pathname, search: newSearch ? `?${newSearch}` : '' },
        { replace: true }
      );
    }
  }, [searchParams, dispatch, navigate]);

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
              // Load settings for plugin-generated images to ensure base image is set correctly
              dispatch(loadSettingsFromImage({
                inputImageId: targetImageId,
                imageId: targetImageId,
                isGeneratedImage: false,
                settings: {}
              }));
            }
          } else if (imageType === 'generated') {
            dispatch(setSelectedImage({ id: targetImageId, type: 'generated' }));
          }
        }
      }
    };
    
    loadInitialData();
  }, [dispatch, initialDataLoaded, searchParams]);

  // Handle plugin webhook sources - automatically fetch masks, open catalog, and select SDXL
  useEffect(() => {
    const sourceParam = searchParams.get('source');
    const imageIdParam = searchParams.get('imageId');
    const imageTypeParam = searchParams.get('type');
    
    // Check if this is a plugin source (webhook, revit, rhino, archicad, sketchup, etc.)
    const isPluginSource = sourceParam && (
      sourceParam === 'webhook' || 
      sourceParam === 'revit' || 
      sourceParam === 'rhino' || 
      sourceParam === 'archicad' || 
      sourceParam === 'sketchup'
    );

    console.log(JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2))
    
    // Create a unique key for this plugin source request
    const pluginSourceKey = isPluginSource && imageIdParam 
      ? `${sourceParam}-${imageIdParam}` 
      : null;
    
    // Only proceed if:
    // 1. It's a plugin source
    // 2. We have an imageId in URL
    // 3. The image type is 'input' (plugin webhooks create input images)
    // 4. Initial data is loaded (so we have the image selected)
    // 5. We have a selected input image
    // 6. We haven't already processed this plugin source
    if (
      isPluginSource && 
      imageIdParam && 
      imageTypeParam === 'input' && 
      initialDataLoaded && 
      selectedImageId && 
      selectedImageType === 'input' &&
      pluginSourceKey &&
      processedPluginSourceRef.current !== pluginSourceKey
    ) {
      const targetImageId = parseInt(imageIdParam);
      
      // Only proceed if the selected image matches the URL param
      if (targetImageId === selectedImageId) {
        console.log('🎭 Plugin source detected, fetching masks and opening catalog:', {
          source: sourceParam,
          imageId: targetImageId
        });
        
        // Mark this plugin source as processed to prevent duplicate processing
        processedPluginSourceRef.current = pluginSourceKey;
        
        // Check for keywords and generatedPrompt in URL (indicates hasInputImage=true)
        const keywordsParam = searchParams.get('keywords');
        const generatedPromptParam = searchParams.get('generatedPrompt');
        const hasInputImageParam = searchParams.get('hasInputImage'); // If keywords are present, hasInputImage is false
        const hasInputImage = hasInputImageParam === 'true';

        if (targetImageId) {
          dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
        }
        
        if (hasInputImage) {
          // When hasInputImage is true: set model to nano banana and apply generated prompt
          console.log('🎭 hasInputImage=true detected from URL, setting nano banana model');
          dispatch(setSelectedModel('nanobanana'));
          dispatch(setIsCatalogOpen(false));
          
          // Apply generated prompt from URL if available
          if (generatedPromptParam) {
            dispatch(setSavedPrompt(generatedPromptParam));
            console.log('✅ Generated prompt applied from URL:', generatedPromptParam.substring(0, 50) + '...');
          }
          
          // Keywords are already saved as AI materials in the backend, will be fetched below
          if (keywordsParam) {
            const keywords = keywordsParam.split(',').map(k => k.trim()).filter(k => k);
            console.log('📝 Keywords from URL:', keywords);
          }
        } else {
          // When hasInputImage is true: set SDXL model (required for mask regions)
          dispatch(setSelectedModel('sdxl'));
          
          // Open the catalog to show mask regions
          dispatch(setIsCatalogOpen(true));

          // Set mask generation processing
          dispatch(setMaskGenerationProcessing({ inputImageId: targetImageId }));
          
          // Fetch masks for this image
          dispatch(getMasks(targetImageId));
        }

        // Fetch AI prompt materials (created from plugin materials, includes keywords when hasInputImage=false)
        dispatch(getAIPromptMaterials(targetImageId));
      }
    }
    
    // Reset processed plugin source when URL changes (new plugin webhook)
    if (!isPluginSource && processedPluginSourceRef.current) {
      processedPluginSourceRef.current = null;
    }
  }, [searchParams, initialDataLoaded, selectedImageId, selectedImageType, dispatch]);

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
  }, [selectedImageId, selectedImageType, dispatch, historyImages, selectedModel]);

  // Update variations
  useEffect(() => {
    if (!currentSession) return;
    const interval = setInterval(() => dispatch(getSession(currentSession.id)), 5000);
    return () => clearInterval(interval);
  }, [currentSession, dispatch])

  return (
    <MainLayout currentStep={currentStep} onStartTour={handleStartTour}>
      <OnboardingPopup
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        forceShow={forceShowOnboarding}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`absolute top-1/2 end-3 -translate-y-1/2 h-auto ${currentStep === 5 ? 'z-[1000]' : 'z-60'}`}>
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
              {(isPromptModalOpen) && (
                <div className="w-full max-w-5xl">
                  <PromptInputContainer 
                    onGenerate={handleSubmit} 
                    onCreateRegions={handleCreateRegions}
                    isGenerating={isGenerating}
                    onNewSession={handleNewSession}
                    currentStep={currentStep}
                    setCurrentStep={setCurrentStep}
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
